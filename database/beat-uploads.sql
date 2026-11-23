create table jt_private.beats (
  id uuid primary key,
  title text not null check(length(title) between 1 and 100),
  genre text not null check(genre in ('R&B Beats','Afro Beats','Trap Beats')),
  bpm integer not null check(bpm between 1 and 400),
  musical_key text not null default '' check(length(musical_key)<=70),
  tags jsonb not null default '[]' check(jsonb_typeof(tags)='array' and jsonb_array_length(tags)<=16),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table jt_private.beat_assets (
  id uuid primary key,
  beat_id uuid not null references jt_private.beats(id),
  kind text not null check(kind in ('mp3','wav','stems','cover')),
  filename text not null check(length(filename) between 1 and 180),
  content_type text not null,
  byte_size bigint not null check(byte_size between 1 and 536870912),
  sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),
  staging_key text not null unique check(staging_key like 'staging/%'),
  final_key text unique,
  multipart_id text,
  status text not null default 'initializing' check(status in ('initializing','uploading','verifying','ready','failed','aborted')),
  is_current boolean not null default false,
  lease text,
  lease_until timestamptz,
  expires_at timestamptz not null default now()+interval '7 days',
  created_at timestamptz not null default now(),
  verified_at timestamptz,
  check(not is_current or (status='ready' and final_key is not null and verified_at is not null))
);
create unique index one_current_beat_asset on jt_private.beat_assets(beat_id,kind) where is_current;
create unique index one_pending_beat_asset on jt_private.beat_assets(beat_id,kind) where status in ('initializing','uploading','verifying');
create index on jt_private.beat_assets(beat_id);
alter table jt_private.beats enable row level security;
alter table jt_private.beat_assets enable row level security;
create policy deny_direct_clients on jt_private.beats as restrictive for all to anon,authenticated using(false) with check(false);
create policy deny_direct_clients on jt_private.beat_assets as restrictive for all to anon,authenticated using(false) with check(false);
revoke all on jt_private.beats,jt_private.beat_assets from public,anon,authenticated;
grant select,insert,update,delete on jt_private.beats,jt_private.beat_assets to service_role;

create function jt_private.require_seller(p_hash text)
returns void language plpgsql security invoker set search_path='' as $$
begin
  if not exists(select 1 from jt_private.seller_sessions s join jt_private.seller_identity i on i.user_id=s.user_id
    join auth.sessions a on a.user_id=s.user_id and a.id=s.auth_session_id
    join auth.users u on u.id=i.user_id
    where s.token_hash=p_hash and s.mfa and s.expires_at>now() and s.last_seen_at>now()-interval '30 minutes'
      and i.enabled and lower(u.email)=i.email and u.email_confirmed_at is not null) then
    raise exception 'SELLER_SESSION_REQUIRED' using errcode='42501';
  end if;
end $$;
revoke all on function jt_private.require_seller(text) from public,anon,authenticated;
grant execute on function jt_private.require_seller(text) to service_role;

create function public.jt_seller_beats(p_hash text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
  perform jt_private.require_seller(p_hash);
  select coalesce(jsonb_agg(b order by b.created desc),'[]'::jsonb) into result from (
    select id,title,genre,bpm,musical_key as key,tags,'Draft' as status,extract(epoch from created_at)*1000 as created,
      (select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'kind',a.kind,'filename',a.filename,'size',a.byte_size,'sha256',a.sha256,'status',a.status,'current',a.is_current,'expiresAt',a.expires_at) order by a.created_at desc),'[]'::jsonb)
        from jt_private.beat_assets a where a.beat_id=beats.id and (a.is_current or a.status in ('initializing','uploading','verifying'))) as assets,
      jsonb_build_object('mp3',exists(select 1 from jt_private.beat_assets where beat_id=beats.id and kind='mp3' and is_current),
        'wav',exists(select 1 from jt_private.beat_assets where beat_id=beats.id and kind='wav' and is_current),
        'stems',exists(select 1 from jt_private.beat_assets where beat_id=beats.id and kind='stems' and is_current)) as "fileAvailability"
    from jt_private.beats beats
  ) b;
  return result;
end $$;
create function public.jt_save_beat(p_hash text,p_id uuid,p_data jsonb)
returns uuid language plpgsql security invoker set search_path='' as $$
begin
  perform jt_private.require_seller(p_hash);
  insert into jt_private.beats(id,title,genre,bpm,musical_key,tags)
    values(p_id,p_data->>'title',p_data->>'genre',(p_data->>'bpm')::integer,p_data->>'key',p_data->'tags')
  on conflict(id) do update set title=excluded.title,genre=excluded.genre,bpm=excluded.bpm,musical_key=excluded.musical_key,tags=excluded.tags,updated_at=now();
  return p_id;
end $$;
create function public.jt_begin_beat_asset(p_hash text,p_data jsonb)
returns void language plpgsql security invoker set search_path='' as $$
begin
  perform jt_private.require_seller(p_hash);
  perform 1 from jt_private.beats where id=(p_data->>'beatId')::uuid for update;
  if not found then raise exception 'BEAT_NOT_FOUND'; end if;
  insert into jt_private.beat_assets(id,beat_id,kind,filename,content_type,byte_size,sha256,staging_key)
    values((p_data->>'id')::uuid,(p_data->>'beatId')::uuid,p_data->>'kind',p_data->>'filename',p_data->>'contentType',(p_data->>'size')::bigint,p_data->>'sha256',p_data->>'stagingKey');
end $$;
create function public.jt_get_beat_asset(p_hash text,p_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
begin
  perform jt_private.require_seller(p_hash);
  return (select to_jsonb(a) from jt_private.beat_assets a where id=p_id);
end $$;
create function public.jt_transition_beat_asset(p_hash text,p_id uuid,p_action text,p_data jsonb default '{}')
returns boolean language plpgsql security invoker set search_path='' as $$
declare a jt_private.beat_assets;
begin
  perform jt_private.require_seller(p_hash);
  -- Lock order is always beat then asset to serialize competing replacements.
  perform 1 from jt_private.beats where id=(select beat_id from jt_private.beat_assets where id=p_id) for update;
  select * into a from jt_private.beat_assets where id=p_id for update;
  if not found then return false; end if;
  if p_action='start' and a.status='initializing' then
    update jt_private.beat_assets set multipart_id=p_data->>'uploadId',status='uploading' where id=p_id;return true;
  elsif p_action='claim' and a.expires_at>now() and (a.status='uploading' or a.status='verifying' and a.lease_until<now()) then
    update jt_private.beat_assets set status='verifying',lease=p_data->>'lease',lease_until=now()+interval '5 minutes' where id=p_id;return true;
  elsif p_action='finish' and a.status='verifying' and a.lease=p_data->>'lease' and a.lease_until>now() then
    if (p_data->>'finalKey') is distinct from ('beats/'||a.beat_id::text||'/'||a.id::text) then return false; end if;
    update jt_private.beat_assets set is_current=false where beat_id=a.beat_id and kind=a.kind and is_current;
    update jt_private.beat_assets set status='ready',final_key=p_data->>'finalKey',is_current=true,verified_at=now(),lease=null,lease_until=null where id=p_id;return true;
  elsif p_action in ('retry','fail') and a.status='verifying' and a.lease=p_data->>'lease' then
    update jt_private.beat_assets set status=case when p_action='retry' then 'uploading' else 'failed' end,lease=null,lease_until=null where id=p_id;return true;
  elsif p_action='abort' and (a.status in ('initializing','uploading','failed') or a.status='verifying' and a.lease_until<now()) then
    update jt_private.beat_assets set status='aborted' where id=p_id;return true;
  elsif p_action='remove' and a.status='ready' then
    update jt_private.beat_assets set is_current=false where id=p_id;return true;
  end if;
  return false;
end $$;
revoke all on function public.jt_seller_beats(text),public.jt_save_beat(text,uuid,jsonb),public.jt_begin_beat_asset(text,jsonb),public.jt_get_beat_asset(text,uuid),public.jt_transition_beat_asset(text,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.jt_seller_beats(text),public.jt_save_beat(text,uuid,jsonb),public.jt_begin_beat_asset(text,jsonb),public.jt_get_beat_asset(text,uuid),public.jt_transition_beat_asset(text,uuid,text,jsonb) to service_role;
