-- =====================================================================
-- Al Mashriq ERP — vehicle buying-cost formula
--   Total cost (JPY) = buying price + buying price × tax%  + expenses
--   Expenses = sum of expense lines; "auction_fee" lines also carry tax%
--   FOB (USD)       = total cost ÷ FX rate (1 USD = N JPY)
-- Run after 0004. Safe to re-run.
-- =====================================================================

alter table public.vehicles
  add column if not exists purchase_tax_rate numeric(5, 2)  not null default 10,
  add column if not exists purchase_tax      numeric(14, 2) not null default 0,
  add column if not exists expense_items     jsonb          not null default '[]'::jsonb,
  add column if not exists fob_fx_rate       numeric(14, 6);

-- Computed in the database so the form, bulk import and API all agree.
create or replace function public.vehicles_costing()
returns trigger language plpgsql as $$
declare
  rate numeric := coalesce(new.purchase_tax_rate, 0);
begin
  new.purchase_tax := round(coalesce(new.purchase_price, 0) * rate / 100, 0);
  if jsonb_typeof(new.expense_items) = 'array' and jsonb_array_length(new.expense_items) > 0 then
    select round(coalesce(sum(
             coalesce((e ->> 'amount')::numeric, 0)
             * case when e ->> 'type' = 'auction_fee' then 1 + rate / 100 else 1 end
           ), 0), 0)
      into new.expenses
      from jsonb_array_elements(new.expense_items) e;
  end if;
  return new;
end $$;

drop trigger if exists vehicles_costing on public.vehicles;
create trigger vehicles_costing before insert or update on public.vehicles
  for each row execute function public.vehicles_costing();

-- FOB in USD from the total cost (generated after the trigger has run)
alter table public.vehicles
  add column if not exists fob_usd numeric(14, 2) generated always as (
    case when fob_fx_rate > 0
         then round((coalesce(purchase_price, 0) + coalesce(purchase_tax, 0) + coalesce(expenses, 0)) / fob_fx_rate, 2)
    end
  ) stored;

-- Apply the formula to vehicles already in stock (adds the 10% buying tax).
update public.vehicles set purchase_tax_rate = purchase_tax_rate;
