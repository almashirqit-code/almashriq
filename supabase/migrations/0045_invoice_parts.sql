-- =====================================================================
-- 0045: invoice lines can point at a part from Parts stock
--
-- A container invoice lists up to 6 vehicles and up to 31 parts. The part
-- link tells a part line from an ordinary charge line (the limits are
-- checked when the invoice is saved). It does not change the part's stock
-- quantity or status.
-- Run after 0044. Safe to re-run.
-- =====================================================================

alter table public.invoice_items
  add column if not exists part_id uuid references public.parts (id) on delete set null;
create index if not exists invoice_items_part_idx on public.invoice_items (part_id);
