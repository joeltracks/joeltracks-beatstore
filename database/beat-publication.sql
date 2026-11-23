-- Additive publication snapshots. Browser roles cannot read tables or call RPCs.
create table jt_private.beat_publications (
  beat_id uuid primary key references jt_private.beats(id),
  version uuid not null unique,
  snapshot jsonb not null check(jsonb_typeof(snapshot)='object'),
  duration double precision not null check(duration>0 and duration<=86400),
  is_published boolean not null default true,
  published_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table jt_private.beat_publications enable row level security;
create policy deny_direct_clients on jt_private.beat_publications as restrictive for all to anon,authenticated using(false) with check(false);
revoke all on jt_private.beat_publications from public,anon,authenticated;
grant select,insert,update,delete on jt_private.beat_publications to service_role;

create function jt_private.beat_snapshot(p_id uuid)
returns jsonb language sql stable security invoker set search_path='' as $$
  select jsonb_build_object('title',b.title,'genre',b.genre,'bpm',b.bpm,'key',b.musical_key,'tags',b.tags,
    'assets',(select coalesce(jsonb_object_agg(a.kind,a.id),'{}'::jsonb) from jt_private.beat_assets a
      where a.beat_id=b.id and a.status='ready' and a.is_current))
  from jt_private.beats b where b.id=p_id
$$;
create function jt_private.publication_asset(p_beat uuid,p_asset text,p_kind text)
returns jsonb language sql stable security invoker set search_path='' as $$
  select jsonb_build_object('key',a.final_key,'contentType',a.content_type,'size',a.byte_size)
    from jt_private.beat_assets a where a.id=p_asset::uuid and a.beat_id=p_beat and a.kind=p_kind
      and a.status='ready' and a.verified_at is not null and a.final_key=('beats/'||p_beat::text||'/'||a.id::text)
$$;

create function public.jt_publication_states(p_hash text)
returns jsonb language plpgsql security invoker set search_path='' as $$
begin
  perform jt_private.require_seller(p_hash);
  return (select coalesce(jsonb_object_agg(p.beat_id,jsonb_build_object('isPublished',p.is_published,'version',p.version,
    'publishedAt',p.published_at,'needsUpdate',p.snapshot is distinct from jt_private.beat_snapshot(p.beat_id))),'{}'::jsonb)
    from jt_private.beat_publications p);
end $$;

create function public.jt_publication_candidate(p_hash text,p_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare snap jsonb; mp3 jt_private.beat_assets; artwork jt_private.beat_assets;
begin
  perform jt_private.require_seller(p_hash);
  snap:=jt_private.beat_snapshot(p_id);
  if snap is null then raise exception 'BEAT_NOT_FOUND'; end if;
  if exists(select 1 from jt_private.beat_assets where beat_id=p_id and status in ('initializing','uploading','verifying')) then raise exception 'PUBLICATION_PENDING'; end if;
  select * into mp3 from jt_private.beat_assets where id=(snap->'assets'->>'mp3')::uuid and status='ready' and is_current;
  if not found then raise exception 'PUBLICATION_MP3_REQUIRED'; end if;
  select * into artwork from jt_private.beat_assets where id=(snap->'assets'->>'cover')::uuid and status='ready' and is_current;
  return jsonb_build_object('snapshot',snap,'mp3',to_jsonb(mp3),'cover',case when artwork.id is null then null else to_jsonb(artwork) end,
    'previousVersion',(select version from jt_private.beat_publications where beat_id=p_id),
    'files',(select jsonb_agg(to_jsonb(a)) from jt_private.beat_assets a where a.beat_id=p_id and a.status='ready' and a.is_current));
end $$;

create function public.jt_publish_beat(p_hash text,p_id uuid,p_snapshot jsonb,p_duration double precision,p_previous uuid default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare snap jsonb; published jt_private.beat_publications;
begin
  perform jt_private.require_seller(p_hash);
  -- Upload finalization/removal use the same beat-first lock order.
  perform 1 from jt_private.beats where id=p_id for update;
  if not found then raise exception 'BEAT_NOT_FOUND'; end if;
  snap:=jt_private.beat_snapshot(p_id);
  if snap is distinct from p_snapshot then raise exception 'PUBLICATION_CHANGED'; end if;
  if (select version from jt_private.beat_publications where beat_id=p_id) is distinct from p_previous then raise exception 'PUBLICATION_CHANGED'; end if;
  if exists(select 1 from jt_private.beat_assets where beat_id=p_id and status in ('initializing','uploading','verifying')) then raise exception 'PUBLICATION_PENDING'; end if;
  if jt_private.publication_asset(p_id,snap->'assets'->>'mp3','mp3') is null then raise exception 'PUBLICATION_MP3_REQUIRED'; end if;
  if p_duration is null or p_duration<=0 or p_duration>86400 or p_duration='NaN'::double precision then raise exception 'PUBLICATION_INVALID_DURATION'; end if;
  insert into jt_private.beat_publications(beat_id,version,snapshot,duration)
    values(p_id,gen_random_uuid(),snap,p_duration)
    on conflict(beat_id) do update set version=excluded.version,snapshot=excluded.snapshot,duration=excluded.duration,is_published=true,updated_at=now()
    returning * into published;
  return jsonb_build_object('version',published.version,'publishedAt',published.published_at,'isPublished',true);
end $$;

create function public.jt_unpublish_beat(p_hash text,p_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
begin
  perform jt_private.require_seller(p_hash);
  perform 1 from jt_private.beats where id=p_id for update;
  if not found then raise exception 'BEAT_NOT_FOUND'; end if;
  update jt_private.beat_publications set is_published=false,version=gen_random_uuid(),updated_at=now() where beat_id=p_id;
  return jsonb_build_object('isPublished',false);
end $$;

create function public.jt_public_media(p_id uuid,p_version uuid,p_kind text)
returns jsonb language sql stable security invoker set search_path='' as $$
  select jt_private.publication_asset(p.beat_id,p.snapshot->'assets'->>case p_kind when 'preview' then 'mp3' when 'artwork' then 'cover' end,
    case p_kind when 'preview' then 'mp3' when 'artwork' then 'cover' end)
  from jt_private.beat_publications p where p.beat_id=p_id and p.version=p_version and p.is_published
    and p_kind in ('preview','artwork')
    and jt_private.publication_asset(p.beat_id,p.snapshot->'assets'->>'mp3','mp3') is not null
$$;

create function public.jt_public_catalog()
returns jsonb language sql stable security invoker set search_path='' as $$
  select coalesce(jsonb_agg(item order by created desc),'[]'::jsonb) from (
    select extract(epoch from p.published_at)*1000 as created,jsonb_build_object(
      'id',p.beat_id,'publicationVersion',p.version,'title',p.snapshot->>'title','genre',p.snapshot->>'genre',
      'bpm',(p.snapshot->>'bpm')::integer,'key',p.snapshot->>'key','tags',p.snapshot->'tags','status','Published',
      'created',extract(epoch from p.published_at)*1000,'seq',extract(epoch from p.published_at)*1000,'duration',p.duration,
      'previewUrl','/api/media/'||p.beat_id::text||'/'||p.version::text||'/preview',
      'artworkUrl',case when jt_private.publication_asset(p.beat_id,p.snapshot->'assets'->>'cover','cover') is not null
        then '/api/media/'||p.beat_id::text||'/'||p.version::text||'/artwork' else null end,
      'fileAvailability',jsonb_build_object('mp3',true,
        'wav',jt_private.publication_asset(p.beat_id,p.snapshot->'assets'->>'wav','wav') is not null,
        'stems',jt_private.publication_asset(p.beat_id,p.snapshot->'assets'->>'stems','stems') is not null)) as item
    from jt_private.beat_publications p where p.is_published
      and jt_private.publication_asset(p.beat_id,p.snapshot->'assets'->>'mp3','mp3') is not null
  ) published
$$;

revoke all on function jt_private.beat_snapshot(uuid),jt_private.publication_asset(uuid,text,text),
  public.jt_publication_states(text),public.jt_publication_candidate(text,uuid),public.jt_publish_beat(text,uuid,jsonb,double precision,uuid),
  public.jt_unpublish_beat(text,uuid),public.jt_public_media(uuid,uuid,text),public.jt_public_catalog() from public,anon,authenticated;
grant execute on function jt_private.beat_snapshot(uuid),jt_private.publication_asset(uuid,text,text),
  public.jt_publication_states(text),public.jt_publication_candidate(text,uuid),public.jt_publish_beat(text,uuid,jsonb,double precision,uuid),
  public.jt_unpublish_beat(text,uuid),public.jt_public_media(uuid,uuid,text),public.jt_public_catalog() to service_role;
