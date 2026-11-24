-- Appended to session-local test copies of reporting/settings routines. All fixture data rolls back.
do $$declare b uuid:=gen_random_uuid();paid uuid:=gen_random_uuid();pending uuid:=gen_random_uuid();refunded uuid:=gen_random_uuid();event_id uuid:=gen_random_uuid();settings jsonb;report jsonb;offer jsonb;v_offer_id uuid;next_version integer;
begin
 insert into jt_private.beats(id,title,genre,bpm) values(b,'Transactional reporting fixture','R&B Beats',88);
 insert into jt_private.beat_publications(beat_id,version,snapshot,duration) values(b,gen_random_uuid(),'{"assets":{}}',2);
 settings:=public.jt_store_settings();
 assert settings->'licenses'->'basic'->>'price'='50';
 next_version:=(settings->'feature'->>'version')::integer;
 perform pg_temp.jt_save_store_setting('test-only','feature',jsonb_build_object('beatId',b,'label','Beat of the month'),next_version);
 assert public.jt_store_settings()->'feature'->>'beatId'=b::text;
 begin
  perform pg_temp.jt_save_store_setting('test-only','feature','{}',next_version);raise exception 'Expected stale settings failure';
 exception when raise_exception then if sqlerrm<>'VERSION_CHANGED' then raise;end if;end;
 perform public.jt_record_beat_activity(event_id,b,'play');perform public.jt_record_beat_activity(event_id,b,'play');
 assert (select plays from jt_private.beat_activity_daily where beat_id=b)=1;
 offer:=public.jt_submit_custom_offer(jsonb_build_object('beatId',b,'artist','Transaction fixture','email','test@example.test','price',123,'publishing',null,'master',null,'terms','Database-only fixture'),repeat('0',64));
 select id into v_offer_id from jt_private.custom_offers where reference=offer->>'reference';
 assert (select unread from jt_private.custom_offers where id=v_offer_id);
 perform pg_temp.jt_update_custom_offer('test-only',v_offer_id,'{"price":150,"publishing":50,"master":70,"terms":"Test counter","status":"Counter offered"}',1);
 assert (select count(*) from jt_private.offer_revisions where offer_revisions.offer_id=v_offer_id)=2;
 insert into jt_private.orders(id,reference,buyer_email,status,currency,total_cents,provider_capture_id,paid_at) values(paid,'TEST-'||paid::text,'test@example.test','paid','USD',10000,'transaction-fixture-not-a-real-payment-'||paid::text,now());
 insert into jt_private.orders(id,reference,buyer_email,status,currency,total_cents) values(pending,'TEST-'||pending::text,'test@example.test','pending','USD',2000),(refunded,'TEST-'||refunded::text,'test@example.test','refunded','USD',5000);
 insert into jt_private.order_items(order_id,beat_id,beat_title,license_name) values(paid,b,'Original title','Basic License'),(paid,b,'Renamed title','Basic License'),(pending,b,'Pending item','Basic License'),(refunded,b,'Refunded item','Basic License');
 report:=pg_temp.jt_seller_dashboard('test-only');
 assert (select (e->>'count')::integer from jsonb_array_elements(report->'salesByBeat') e where e->>'id'=b::text)=1;
 assert jsonb_array_length(report->'activity')=30;
 assert (select (e->>'plays')::integer from jsonb_array_elements(report->'perBeat') e where e->>'id'=b::text)=1;
 assert not public.jt_store_settings()::text like '%test@example.test%';
 assert not has_function_privilege('anon','public.jt_seller_dashboard(text)','execute');
 assert not has_table_privilege('authenticated','jt_private.custom_offers','select');
end $$;
rollback;
select jsonb_build_object('reportingChecks','passed','offers',(select count(*) from jt_private.custom_offers),'orders',(select count(*) from jt_private.orders),'events',(select count(*) from jt_private.beat_event_ids),'feature',public.jt_store_settings()->'feature') as result;
