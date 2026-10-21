-- =====================================================================
-- Al Mashriq ERP — bank details on the public website (Payment page)
-- Shows the same bank / intermediary bank text printed on invoices.
-- Can be switched off in Configuration → General. Safe to re-run.
-- =====================================================================

alter table public.settings add column if not exists show_bank_on_website boolean not null default true;

create or replace function public.public_bank()
returns table (bank_details text, intermediary_bank text)
language sql stable security definer set search_path = public
as $$
  select bank_details, intermediary_bank from public.settings where id = 1 and show_bank_on_website
$$;
grant execute on function public.public_bank() to anon, authenticated;
