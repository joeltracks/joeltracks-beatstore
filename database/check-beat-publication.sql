-- Verification only: creates isolated rows in a transaction and rolls back.
begin;
set local role service_role;
do $$
declare h text; b uuid:=gen_random_uuid(); a uuid:=gen_random_uuid(); c jsonb; result jsonb; v uuid; item jsonb;
begin
  select s.token_hash into h from jt_private.seller_sessions s join auth.sessions upstream on upstream.id=s.auth_session_id and upstream.user_id=s.user_id
    where s.mfa and s.expires_at>now() and s.last_seen_at>now()-interval '30 minutes' limit 1;
  if h is null then raise exception 'NO_ACTIVE_OWNER_FOR_TRANSACTIONAL_CHECK'; end if;
  perform public.jt_save_beat(h,b,'{"title":"Transactional publication check","genre":"R&B Beats","bpm":88,"key":"C min","tags":["test"]}'::jsonb);
  begin
    perform public.jt_publication_candidate(h,b);raise exception 'Expected missing MP3 rejection';
  exception when raise_exception then if sqlerrm<>'PUBLICATION_MP3_REQUIRED' then raise; end if; end;
  insert into jt_private.beat_assets(id,beat_id,kind,filename,content_type,byte_size,sha256,staging_key,final_key,status,is_current,verified_at)
    values(a,b,'mp3','transaction-test.mp3','audio/mpeg',100,repeat('0',64),'staging/transaction/'||a::text,'beats/'||b::text||'/'||a::text,'ready',true,now());
  c:=public.jt_publication_candidate(h,b);
  result:=public.jt_publish_beat(h,b,c->'snapshot',2,(c->>'previousVersion')::uuid);v:=(result->>'version')::uuid;
  select e into item from jsonb_array_elements(public.jt_public_catalog()) e where e->>'id'=b::text;
  assert item->>'title'='Transactional publication check';
  assert item->'fileAvailability'='{"mp3":true,"wav":false,"stems":false}'::jsonb;
  assert not(item ? 'assets') and not(item ? 'snapshot');
  assert public.jt_public_media(b,v,'preview') is not null;
  assert public.jt_public_media(b,v,'wav') is null;
  perform public.jt_save_beat(h,b,'{"title":"Private edited title","genre":"R&B Beats","bpm":88,"key":"C min","tags":["test"]}'::jsonb);
  select e into item from jsonb_array_elements(public.jt_public_catalog()) e where e->>'id'=b::text;
  assert item->>'title'='Transactional publication check';
  assert (public.jt_publication_states(h)->b::text->>'needsUpdate')::boolean;
  begin
    perform public.jt_publish_beat(h,b,c->'snapshot',2,v);raise exception 'Expected stale draft rejection';
  exception when raise_exception then if sqlerrm<>'PUBLICATION_CHANGED' then raise; end if; end;
  c:=public.jt_publication_candidate(h,b);
  result:=public.jt_publish_beat(h,b,c->'snapshot',2,(c->>'previousVersion')::uuid);
  assert public.jt_public_media(b,v,'preview') is null;
  c:=public.jt_publication_candidate(h,b);
  perform public.jt_unpublish_beat(h,b);
  assert not exists(select 1 from jsonb_array_elements(public.jt_public_catalog()) e where e->>'id'=b::text);
  assert public.jt_public_media(b,(result->>'version')::uuid,'preview') is null;
  begin
    perform public.jt_publish_beat(h,b,c->'snapshot',2,(c->>'previousVersion')::uuid);raise exception 'Expected unpublish race rejection';
  exception when raise_exception then if sqlerrm<>'PUBLICATION_CHANGED' then raise; end if; end;
  assert not has_function_privilege('anon','public.jt_public_catalog()','execute');
  assert not has_function_privilege('authenticated','public.jt_publish_beat(text,uuid,jsonb,double precision,uuid)','execute');
  assert not has_table_privilege('anon','jt_private.beat_publications','select');
end $$;
rollback;
select jsonb_build_object('transactionalChecks','passed','beats',(select count(*) from jt_private.beats),
  'assets',(select count(*) from jt_private.beat_assets),'publications',(select count(*) from jt_private.beat_publications)) as result;
