-- =====================================================================
-- 0025: self sign-ups no longer become staff
--
-- Public sign-up is enabled in Supabase Auth (needed for the customer
-- portal). Until now handle_new_user gave every new auth user an active
-- 'sales' staff profile, so anyone could register with the public anon
-- key and sign in to the ERP as Sales.
--
-- Now a staff profile is created only for:
--   * the very first user (bootstrap admin), or
--   * users created by an admin in the ERP (Users -> Add user), which sets
--     app_metadata.staff = true through the service-role API. app_metadata
--     cannot be set by a public sign-up, so it can't be forged.
-- Everyone else gets no profile: auth_role() is null, so RLS denies them
-- and the ERP signs them out. Safe to re-run.
-- =====================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  is_first boolean;
  is_staff boolean;
begin
  select not exists (select 1 from public.profiles) into is_first;
  is_staff := coalesce(new.raw_app_meta_data ->> 'staff', '') = 'true';
  if not (is_first or is_staff) then
    return new;
  end if;
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    case when is_first then 'admin'::public.user_role else 'sales'::public.user_role end
  )
  on conflict (id) do nothing;
  return new;
end $$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
