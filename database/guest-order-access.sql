-- Applied to the dedicated Joel Tracks project, never the Investment Project.
-- All application data is private. Only server credentials can execute these RPCs.
create schema if not exists jt_private;
revoke all on schema jt_private from public, anon, authenticated;
grant usage on schema jt_private to service_role;

create table jt_private.orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  buyer_email text not null,
  status text not null check (status in ('pending','paid','refunded','cancelled')),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  total_cents bigint not null check (total_cents >= 0),
  provider_capture_id text unique,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  check (status <> 'paid' or (provider_capture_id is not null and paid_at is not null))
);
create table jt_private.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references jt_private.orders(id),
  beat_title text not null,
  license_name text not null
);
create index on jt_private.order_items(order_id);
create table jt_private.order_files (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references jt_private.orders(id),
  filename text not null,
  content_type text not null,
  object_key text not null,
  revoked_at timestamptz
);
create index on jt_private.order_files(order_id);
create table jt_private.access_tokens (
  token_hash text primary key check (token_hash ~ '^[a-f0-9]{64}$'),
  order_id uuid not null references jt_private.orders(id),
  expires_at timestamptz not null,
  consumed_at timestamptz
);
create index on jt_private.access_tokens(order_id);
create table jt_private.access_sessions (
  session_hash text primary key check (session_hash ~ '^[a-f0-9]{64}$'),
  order_id uuid not null references jt_private.orders(id),
  expires_at timestamptz not null,
  revoked_at timestamptz
);
create index on jt_private.access_sessions(order_id);
create table jt_private.access_rate_limits (
  bucket text primary key,
  window_start timestamptz not null,
  requests integer not null
);
create table jt_private.access_email_jobs (
  id uuid primary key default gen_random_uuid(),
  payload text not null, -- AES-GCM ciphertext; contains the email and one-use URL.
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  lease_until timestamptz,
  sent_at timestamptz,
  expires_at timestamptz not null default now() + interval '15 minutes'
);
create index on jt_private.access_email_jobs(available_at) where sent_at is null;

alter table jt_private.orders enable row level security;
alter table jt_private.order_items enable row level security;
alter table jt_private.order_files enable row level security;
alter table jt_private.access_tokens enable row level security;
alter table jt_private.access_sessions enable row level security;
alter table jt_private.access_rate_limits enable row level security;
alter table jt_private.access_email_jobs enable row level security;
create policy deny_direct_clients on jt_private.orders as restrictive for all to anon, authenticated using (false) with check (false);
create policy deny_direct_clients on jt_private.order_items as restrictive for all to anon, authenticated using (false) with check (false);
create policy deny_direct_clients on jt_private.order_files as restrictive for all to anon, authenticated using (false) with check (false);
create policy deny_direct_clients on jt_private.access_tokens as restrictive for all to anon, authenticated using (false) with check (false);
create policy deny_direct_clients on jt_private.access_sessions as restrictive for all to anon, authenticated using (false) with check (false);
create policy deny_direct_clients on jt_private.access_rate_limits as restrictive for all to anon, authenticated using (false) with check (false);
create policy deny_direct_clients on jt_private.access_email_jobs as restrictive for all to anon, authenticated using (false) with check (false);
revoke all on all tables in schema jt_private from public, anon, authenticated;
grant select, insert, update, delete on all tables in schema jt_private to service_role;

create function jt_private.allow_access_request(p_bucket text, p_max integer)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare v_count integer;
begin
  insert into jt_private.access_rate_limits as limits(bucket, window_start, requests)
  values(p_bucket, now(), 1)
  on conflict (bucket) do update set
    requests = case when limits.window_start < now() - interval '10 minutes' then 1 else limits.requests + 1 end,
    window_start = case when limits.window_start < now() - interval '10 minutes' then now() else limits.window_start end
  returning requests into v_count;
  return v_count <= p_max;
end $$;
revoke all on function jt_private.allow_access_request(text, integer) from public, anon, authenticated;
grant execute on function jt_private.allow_access_request(text, integer) to service_role;

create function public.jt_request_order_access(p_reference text, p_email text, p_token_hash text, p_payload text, p_ip_hash text, p_email_hash text)
returns void language plpgsql security invoker set search_path = '' as $$
declare v_order uuid; v_ip_ok boolean; v_email_ok boolean;
begin
  v_ip_ok := jt_private.allow_access_request('ip:' || p_ip_hash, 20);
  v_email_ok := jt_private.allow_access_request('email:' || p_email_hash, 3);
  if not v_ip_ok or not v_email_ok then return; end if;
  select id into v_order from jt_private.orders
    where reference = p_reference and lower(buyer_email) = lower(p_email) and status = 'paid';
  if v_order is null then return; end if;
  insert into jt_private.access_tokens(token_hash, order_id, expires_at)
    values(p_token_hash, v_order, now() + interval '15 minutes');
  insert into jt_private.access_email_jobs(payload) values(p_payload);
end $$;

create function public.jt_exchange_order_access(p_token_hash text, p_session_hash text)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare v_token jt_private.access_tokens%rowtype;
begin
  select * into v_token from jt_private.access_tokens where token_hash = p_token_hash for update;
  if not found or v_token.consumed_at is not null or v_token.expires_at <= now() then return false; end if;
  if not exists(select 1 from jt_private.orders where id = v_token.order_id and status = 'paid') then return false; end if;
  update jt_private.access_tokens set consumed_at = now() where token_hash = p_token_hash;
  insert into jt_private.access_sessions(session_hash, order_id, expires_at)
    values(p_session_hash, v_token.order_id, now() + interval '30 minutes');
  return true;
end $$;

create function public.jt_get_access_order(p_session_hash text)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'id', o.id, 'reference', o.reference, 'currency', o.currency,
    'totalCents', o.total_cents, 'paidAt', o.paid_at,
    'items', coalesce((select jsonb_agg(jsonb_build_object('title', i.beat_title, 'license', i.license_name) order by i.id)
      from jt_private.order_items i where i.order_id = o.id), '[]'::jsonb),
    'files', coalesce((select jsonb_agg(jsonb_build_object('id', f.id, 'name', f.filename, 'type', f.content_type, 'key', f.object_key) order by f.id)
      from jt_private.order_files f where f.order_id = o.id and f.revoked_at is null), '[]'::jsonb)
  )
  from jt_private.access_sessions s join jt_private.orders o on o.id = s.order_id
  where s.session_hash = p_session_hash and s.revoked_at is null and s.expires_at > now() and o.status = 'paid';
$$;

create function public.jt_revoke_access_session(p_session_hash text)
returns void language sql security invoker set search_path = '' as $$
  update jt_private.access_sessions set revoked_at = now() where session_hash = p_session_hash;
$$;

create function public.jt_claim_access_email()
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_job jt_private.access_email_jobs%rowtype;
begin
  select * into v_job from jt_private.access_email_jobs
  where sent_at is null and attempts < 5 and available_at <= now() and expires_at > now()
    and (lease_until is null or lease_until < now())
  order by available_at for update skip locked limit 1;
  if not found then return null; end if;
  update jt_private.access_email_jobs set attempts = attempts + 1, lease_until = now() + interval '1 minute' where id = v_job.id;
  return jsonb_build_object('id', v_job.id, 'payload', v_job.payload, 'attempts', v_job.attempts + 1);
end $$;

create function public.jt_complete_access_email(p_id uuid)
returns void language sql security invoker set search_path = '' as $$
  update jt_private.access_email_jobs set sent_at = now(), payload = '', lease_until = null where id = p_id;
$$;

create function public.jt_fail_access_email(p_id uuid)
returns void language sql security invoker set search_path = '' as $$
  update jt_private.access_email_jobs set lease_until = null,
    available_at = now() + (least(300, 15 * power(2, attempts)) * interval '1 second') where id = p_id and sent_at is null;
$$;

-- No public/authenticated role may call any of the application RPCs.
revoke all on function public.jt_request_order_access(text,text,text,text,text,text) from public, anon, authenticated;
revoke all on function public.jt_exchange_order_access(text,text) from public, anon, authenticated;
revoke all on function public.jt_get_access_order(text) from public, anon, authenticated;
revoke all on function public.jt_revoke_access_session(text) from public, anon, authenticated;
revoke all on function public.jt_claim_access_email() from public, anon, authenticated;
revoke all on function public.jt_complete_access_email(uuid) from public, anon, authenticated;
revoke all on function public.jt_fail_access_email(uuid) from public, anon, authenticated;
grant execute on function public.jt_request_order_access(text,text,text,text,text,text) to service_role;
grant execute on function public.jt_exchange_order_access(text,text) to service_role;
grant execute on function public.jt_get_access_order(text) to service_role;
grant execute on function public.jt_revoke_access_session(text) to service_role;
grant execute on function public.jt_claim_access_email() to service_role;
grant execute on function public.jt_complete_access_email(uuid) to service_role;
grant execute on function public.jt_fail_access_email(uuid) to service_role;
