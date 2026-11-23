-- Pin the explicitly provisioned and confirmed owner; never seed a generated UUID.
update jt_private.seller_identity
set user_id=(select id from auth.users where lower(email)='joeltracks2000@gmail.com' and email_confirmed_at is not null)
where singleton and user_id is null
  and exists(select 1 from auth.users where lower(email)='joeltracks2000@gmail.com' and email_confirmed_at is not null);
