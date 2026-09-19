alter table app_users add column if not exists username text;
alter table app_users add column if not exists email text;

update app_users
set username = 'zenit_' || replace(left(id::text,12),'-','')
where username is null or btrim(username) = '';

create unique index if not exists idx_app_users_username_lower on app_users(lower(username));

alter table app_users drop constraint if exists app_users_username_format;
alter table app_users add constraint app_users_username_format
  check (username ~ '^[a-z0-9_]{3,24}$');

alter table app_users alter column username set not null;
create index if not exists idx_app_users_email_lower on app_users(lower(email)) where email is not null;
