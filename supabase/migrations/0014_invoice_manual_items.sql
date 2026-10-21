-- =====================================================================
-- Al Mashriq ERP — invoices: vehicles not in our stock + consignee toggle.
-- Safe to re-run.
-- =====================================================================

-- A vehicle typed in by hand (not in stock): make, model, chassis… as JSON.
alter table public.invoice_items add column if not exists ext_vehicle jsonb;

-- Print the consignee box on the invoice? Off = Bill To only.
alter table public.invoices add column if not exists show_consignee boolean not null default false;
