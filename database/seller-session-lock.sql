create or replace function public.jt_acquire_seller_session(p_hash text,p_lease text)
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
  if not found then
    if exists(select 1 from jt_private.seller_sessions ss where ss.token_hash=p_hash and ss.expires_at>now() and ss.last_seen_at>now()-interval '30 minutes' and ss.lease_until>now()) then return jsonb_build_object('busy',true); end if;
    return null;
  end if;
  return jsonb_build_object('payload',s.payload,'userId',s.user_id,'authSessionId',s.auth_session_id,'mfa',s.mfa);
end $$;
