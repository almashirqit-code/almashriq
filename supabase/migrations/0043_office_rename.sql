-- =====================================================================
-- Configuration → Offices: rename an office or shift everywhere at once
-- (the settings list, staff, remittances and expenses), in one transaction.
-- Admin only. Re-runnable.
-- =====================================================================

create or replace function public.rename_place(p_kind text, p_from text, p_to text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  f text := nullif(trim(coalesce(p_from, '')), '');
  t text := nullif(trim(coalesce(p_to, '')), '');
begin
  if not public.is_staff(array['admin']::public.user_role[]) then raise exception 'not authorized'; end if;
  if p_kind not in ('office', 'shift') then raise exception 'Unknown kind'; end if;
  if f is null or t is null then raise exception 'Enter a name'; end if;
  if char_length(t) > 60 then raise exception 'Name is too long (60 characters max)'; end if;
  if f = t then return; end if;

  if p_kind = 'office' then
    if exists (select 1 from public.settings where t = any (offices) and lower(t) <> lower(f)) then
      raise exception 'That office already exists';
    end if;
    update public.settings set offices = array_replace(offices, f, t), updated_at = now() where id = 1;
    update public.profiles set office = t where office = f;
    update public.remittances set office = t where office = f;
    update public.company_expenses set office = t where office = f;
  else
    if exists (select 1 from public.settings where t = any (shifts) and lower(t) <> lower(f)) then
      raise exception 'That shift already exists';
    end if;
    update public.settings set shifts = array_replace(shifts, f, t), updated_at = now() where id = 1;
    update public.profiles set shift = t where shift = f;
    update public.remittances set shift = t where shift = f;
  end if;
end $$;

revoke all on function public.rename_place(text, text, text) from public, anon;
grant execute on function public.rename_place(text, text, text) to authenticated;
