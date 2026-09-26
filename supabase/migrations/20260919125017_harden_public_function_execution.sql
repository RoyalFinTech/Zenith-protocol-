-- Keep backend-owned database functions out of the public Data API execution surface.
-- The application connects directly with its database role.
do $$
begin
  if to_regprocedure('public.package_economics_quote(uuid)') is not null then
    execute 'revoke all on function public.package_economics_quote(uuid) from public, anon, authenticated';
  end if;
end $$;