-- Add member-facing identity fields used by wallet onboarding and authenticated profiles.
alter table public.app_users
  add column if not exists username text,
  add column if not exists email text;

update public.app_users
set username = coalesce(nullif(username,''), 'zenit_' || lower(substr(replace(id::text,'-',''),1,8)))
where username is null or trim(username) = '';

alter table public.app_users
  alter column username set not null;

alter table public.app_users
  drop constraint if exists app_users_username_format;
alter table public.app_users
  add constraint app_users_username_format check (username ~ '^[a-z0-9_]{3,24}$');

create unique index if not exists idx_app_users_username_lower
  on public.app_users(lower(username));

create index if not exists idx_app_users_email_lower
  on public.app_users(lower(email))
  where email is not null;

create unique index if not exists idx_app_users_email_lower_unique
  on public.app_users(lower(email))
  where email is not null;

create unique index if not exists idx_app_users_display_name_lower_unique
  on public.app_users(lower(display_name))
  where display_name is not null and trim(display_name) <> '';