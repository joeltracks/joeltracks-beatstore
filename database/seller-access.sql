-- Seller BFF sessions: service-role RPCs only; no browser access or signup API.
create table jt_private.seller_identity (
  singleton boolean primary key default true check(singleton),
  email text not null unique check(email='joeltracks2000@gmail.com'),
  user_id uuid unique references auth.users(id),
  enabled boolean not null default true
);
insert into jt_private.seller_identity(email) values ('joeltracks2000@gmail.com');
create table jt_private.seller_sessions (
  token_hash text primary key check(token_hash ~ '^[a-f0-9]{64}$'),
  user_id uuid not null references auth.users(id) on delete cascade,
  auth_session_id uuid not null,
  payload text not null,
  mfa boolean not null default false,
  expires_at timestamptz not null,
  last_seen_at timestamptz not null default now(),
  lease_id text,
  lease_until timestamptz
);
create index on jt_private.seller_sessions(expires_at);
create table jt_private.seller_rate_limits (
  key text primary key,
  hits integer not null default 1,
  window_start timestamptz not null default now()
);
alter table jt_private.seller_identity enable row level security;
alter table jt_private.seller_sessions enable row level security;
alter table jt_private.seller_rate_limits enable row level security;
create policy deny_direct_clients on jt_private.seller_identity as restrictive for all to anon,authenticated using(false) with check(false);
create policy deny_direct_clients on jt_private.seller_sessions as restrictive for all to anon,authenticated using(false) with check(false);
create policy deny_direct_clients on jt_private.seller_rate_limits as restrictive for all to anon,authenticated using(false) with check(false);
revoke all on jt_private.seller_identity,jt_private.seller_sessions,jt_private.seller_rate_limits from public,anon,authenticated;
grant select,insert,update,delete on jt_private.seller_identity,jt_private.seller_sessions,jt_private.seller_rate_limits to service_role;
-- Minimal column access is required by invoker RPCs to check identity and immediate
-- upstream revocation. This avoids a SECURITY DEFINER function and broad auth grants.
grant usage on schema auth to service_role;
grant select(id,email,email_confirmed_at) on auth.users to service_role;
grant select(id,user_id) on auth.sessions to service_role;

create function public.jt_seller_rate_limit(p_key text,p_limit integer,p_seconds integer)
returns boolean language plpgsql security invoker set search_path='' as $$
declare n integer;
begin
  delete from jt_private.seller_rate_limits where window_start < now()-interval '1 day';
  insert into jt_private.seller_rate_limits as r(key) values(p_key)
  on conflict(key) do update set
    hits=case when r.window_start < now()-make_interval(secs=>p_seconds) then 1 else r.hits+1 end,
    window_start=case when r.window_start < now()-make_interval(secs=>p_seconds) then now() else r.window_start end
  returning hits into n;
  return n<=p_limit;
end $$;
create function public.jt_create_seller_session(p_user_id uuid,p_auth_session_id uuid,p_hash text,p_payload text,p_mfa boolean,p_previous text default null)
returns boolean language plpgsql security invoker set search_path='' as $$
declare owner jt_private.seller_identity;
begin
  select * into owner from jt_private.seller_identity where singleton for update;
  if not owner.enabled or not exists(select 1 from auth.users u join auth.sessions s on s.user_id=u.id
    where u.id=p_user_id and lower(u.email)=owner.email and u.email_confirmed_at is not null and s.id=p_auth_session_id)
    or (owner.user_id is not null and owner.user_id<>p_user_id) then return false; end if;
  -- Pin the manually provisioned, confirmed owner on their first verified login.
  update jt_private.seller_identity set user_id=p_user_id where singleton and user_id is null;
  delete from jt_private.seller_sessions where expires_at<now() or last_seen_at<now()-interval '30 minutes';
  insert into jt_private.seller_sessions(token_hash,user_id,auth_session_id,payload,mfa,expires_at)
    values(p_hash,p_user_id,p_auth_session_id,p_payload,p_mfa,now()+case when p_mfa then interval '8 hours' else interval '10 minutes' end);
  if p_previous is not null then delete from jt_private.seller_sessions where token_hash=p_previous and user_id=p_user_id; end if;
  return true;
end $$;
create function public.jt_acquire_seller_session(p_hash text,p_lease text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare s jt_private.seller_sessions;
begin
  update jt_private.seller_sessions ss set lease_id=p_lease,lease_until=now()+interval '30 seconds'
  where ss.token_hash=p_hash and ss.expires_at>now() and ss.last_seen_at>now()-interval '30 minutes'
    and (ss.lease_until is null or ss.lease_until<now())
    and exists(select 1 from jt_private.seller_identity i join auth.users u on u.id=i.user_id
      join auth.sessions a on a.user_id=u.id
      where i.enabled and i.user_id=ss.user_id and lower(u.email)=i.email and u.email_confirmed_at is not null and a.id=ss.auth_session_id)
  returning ss.* into s;
  if not found then return null; end if;
  return jsonb_build_object('payload',s.payload,'userId',s.user_id,'authSessionId',s.auth_session_id,'mfa',s.mfa);
end $$;
create function public.jt_save_seller_session(p_hash text,p_lease text,p_payload text)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
  update jt_private.seller_sessions set payload=p_payload,last_seen_at=now(),lease_id=null,lease_until=null
    where token_hash=p_hash and lease_id=p_lease and lease_until>now() and expires_at>now();
  return found;
end $$;
create function public.jt_revoke_seller_session(p_hash text)
returns void language sql security invoker set search_path='' as $$
  delete from jt_private.seller_sessions where token_hash=p_hash;
$$;
create function public.jt_seller_overview()
returns jsonb language sql security invoker set search_path='' as $$
  select jsonb_build_object(
    'paidOrders',(select count(*) from jt_private.orders where status='paid'),
    'revenueCents',(select coalesce(sum(total_cents),0) from jt_private.orders where status='paid' and currency='USD'),
    'pendingOrders',(select count(*) from jt_private.orders where status='pending'),
    'recentOrders',coalesce((select jsonb_agg(t) from (select reference,status,currency,total_cents as "totalCents",created_at as "createdAt" from jt_private.orders order by created_at desc limit 10) t),'[]'::jsonb)
  );
$$;
revoke all on function public.jt_seller_rate_limit(text,integer,integer),public.jt_create_seller_session(uuid,uuid,text,text,boolean,text),public.jt_acquire_seller_session(text,text),public.jt_save_seller_session(text,text,text),public.jt_revoke_seller_session(text),public.jt_seller_overview() from public,anon,authenticated;
grant execute on function public.jt_seller_rate_limit(text,integer,integer),public.jt_create_seller_session(uuid,uuid,text,text,boolean,text),public.jt_acquire_seller_session(text,text),public.jt_save_seller_session(text,text,text),public.jt_revoke_seller_session(text),public.jt_seller_overview() to service_role;
