-- =====================================================================
-- 0046: TT bank fee in yen
--
-- Our bank's own fee on a received TT, charged in yen whatever the TT's
-- currency (the existing bank_charges is the difference between the
-- instructed and the received amount, in the TT's currency). Optional.
-- Run after 0045. Safe to re-run.
-- =====================================================================

alter table public.remittances
  add column if not exists bank_fee_jpy numeric(14, 0);
do $$ begin
  alter table public.remittances add constraint remittances_bank_fee_jpy_chk check (bank_fee_jpy is null or bank_fee_jpy >= 0);
exception when duplicate_object then null; end $$;
