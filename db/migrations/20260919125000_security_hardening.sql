-- Security hardening applied to production Supabase.
-- Keep the SECURITY DEFINER event trigger internal-only.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

-- Prevent search_path hijacking for the package quote helper.
alter function public.package_economics_quote(uuid) set search_path = public, pg_temp;
