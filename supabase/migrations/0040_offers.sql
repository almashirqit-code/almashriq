-- 0039 — Website offers / deals (staff publish promotions; shown on /offers and the home page)
-- Run after 0001–0038. Safe to re-run.
-- =====================================================================

create table if not exists public.offers (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  summary       text,
  discount_pct  numeric(5, 2) check (discount_pct is null or (discount_pct > 0 and discount_pct < 100)),
  special_price numeric(12, 2) check (special_price is null or special_price > 0),  -- special FOB price
  price_currency text not null default 'USD',
  starts_on     date not null default current_date,
  ends_on       date,                          -- null = no end date
  stock_nos     text[] not null default '{}',  -- linked cars
  banner_path   text,                          -- in site-assets
  active        boolean not null default true,
  created_by    uuid references auth.users (id) on delete set null default auth.uid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (ends_on is null or ends_on >= starts_on)
);
alter table public.offers enable row level security;
drop policy if exists offers_read on public.offers;
create policy offers_read on public.offers for select to authenticated using (public.auth_role() is not null);
drop policy if exists offers_write on public.offers;
create policy offers_write on public.offers for all to authenticated
  using (public.is_staff(array['admin','manager']::public.user_role[]))
  with check (public.is_staff(array['admin','manager']::public.user_role[]));

-- Live offers only (switched on, started, not expired — Japan date). Linked cars are limited to
-- those listed on the website, with public fields only.
drop function if exists public.public_offers(int);
create or replace function public.public_offers(p_limit int default 20)
returns table (id uuid, title text, summary text, discount_pct numeric, special_price numeric, price_currency text,
               starts_on date, ends_on date, banner_path text, cars jsonb)
language sql stable security definer set search_path = public
as $$
  select o.id, o.title, o.summary, o.discount_pct, o.special_price, o.price_currency, o.starts_on, o.ends_on, o.banner_path,
         coalesce((
           select jsonb_agg(jsonb_build_object('stock_no', v.stock_no, 'make', v.make, 'model', v.model, 'year', v.year) order by v.stock_no)
             from public.vehicles v
            where v.stock_no = any (o.stock_nos) and v.show_on_website and v.status in ('in_stock', 'reserved')
         ), '[]'::jsonb)
    from public.offers o
   where o.active
     and o.starts_on <= (now() at time zone 'Asia/Tokyo')::date
     and (o.ends_on is null or o.ends_on >= (now() at time zone 'Asia/Tokyo')::date)
   order by o.ends_on nulls last, o.created_at desc
   limit least(greatest(coalesce(p_limit, 20), 1), 100)
$$;
grant execute on function public.public_offers(int) to anon, authenticated;
