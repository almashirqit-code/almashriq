-- =====================================================================
-- Al Mashriq ERP — performance, indexing, hardening and rate limiting.
-- Fixes the Supabase advisor warnings. Safe to re-run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Function permissions: only the website's public functions may be
--    called without signing in. Internal/trigger functions are not
--    callable through the API at all.
-- ---------------------------------------------------------------------
do $$
declare
  f record;
  public_fns text[] := array['public_bank','public_company','public_facets','public_makes','public_post','public_posts',
                             'public_reviews','public_sitemap','public_vehicle','public_vehicles','showcase_company',
                             'showcase_vehicles','submit_inquiry','rate_limit_hit'];
  internal_fns text[] := array['handle_new_user','rls_auto_enable','sync_shipping_status','sync_vehicle_status',
                               'trg_allocations_rollup','trg_invoice_status_sync','trg_items_sync','trg_payments_rollup',
                               'trg_reservations_sync','trg_shipping_sync','trg_shipments_touch','touch_updated_at',
                               'trg_remittance_guard','vehicles_costing','trg_reservations_touch','trg_inquiries_touch'];
begin
  for f in
    select p.oid::regprocedure as sig, p.proname
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')  -- skip extension functions
  loop
    if f.proname = any(public_fns) then
      continue;
    end if;
    execute format('revoke execute on function %s from public, anon', f.sig);
    if f.proname = any(internal_fns) then
      execute format('revoke execute on function %s from authenticated', f.sig);
    end if;
  end loop;
end $$;

-- Fixed search_path on trigger functions (advisor: function_search_path_mutable)
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('trg_shipments_touch','touch_updated_at','trg_remittance_guard','vehicles_costing','trg_reservations_touch','trg_inquiries_touch')
  loop
    execute format('alter function %s set search_path = public', f.sig);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 2. Indexes
-- ---------------------------------------------------------------------
-- Foreign keys without an index (advisor: unindexed_foreign_keys)
create index if not exists blog_posts_author_idx               on public.blog_posts (author_id);
create index if not exists freight_rates_port_idx              on public.freight_rates (port_id);
create index if not exists inquiries_customer_idx              on public.inquiries (customer_id);
create index if not exists inquiries_vehicle_idx               on public.inquiries (vehicle_id);
create index if not exists invoices_created_by_idx             on public.invoices (created_by);
create index if not exists payments_allocation_idx             on public.payments (allocation_id);
create index if not exists payments_created_by_idx             on public.payments (created_by);
create index if not exists remittance_allocations_created_by_idx on public.remittance_allocations (created_by);
create index if not exists remittance_documents_created_by_idx on public.remittance_documents (created_by);
create index if not exists remittances_created_by_idx          on public.remittances (created_by);
create index if not exists reservations_created_by_idx         on public.reservations (created_by);
create index if not exists reservations_freight_rate_idx       on public.reservations (freight_rate_id);
create index if not exists reservations_invoice_idx            on public.reservations (invoice_id);
create index if not exists vehicle_documents_created_by_idx    on public.vehicle_documents (created_by);
create index if not exists vehicle_shipments_updated_by_idx    on public.vehicle_shipments (updated_by);

-- Duplicate index (advisor: duplicate_index)
drop index if exists public.invoices_customer_idx2;

-- List pages: newest first, filtered by ownership / status
create index if not exists vehicles_ownership_created_idx on public.vehicles (ownership, created_at desc);
create index if not exists vehicles_created_idx           on public.vehicles (created_at desc);
create index if not exists invoices_created_idx           on public.invoices (created_at desc);
create index if not exists customers_created_idx          on public.customers (created_at desc);
create index if not exists inquiries_created_idx          on public.inquiries (created_at desc);
create index if not exists reservations_created_idx       on public.reservations (created_at desc);
create index if not exists remittances_created_idx        on public.remittances (created_at desc);
-- (vehicle_images already has an index on vehicle_id, sort_order)
drop index if exists public.vehicle_images_vehicle_sort_idx;

-- Fast "contains" search (ILIKE '%…%') on stock and customers
create extension if not exists pg_trgm with schema extensions;
create index if not exists vehicles_stock_trgm   on public.vehicles  using gin (stock_no   extensions.gin_trgm_ops);
create index if not exists vehicles_chassis_trgm on public.vehicles  using gin (chassis_no extensions.gin_trgm_ops);
create index if not exists vehicles_model_trgm   on public.vehicles  using gin (model      extensions.gin_trgm_ops);
create index if not exists customers_name_trgm   on public.customers using gin (name       extensions.gin_trgm_ops);
create index if not exists customers_company_trgm on public.customers using gin (company   extensions.gin_trgm_ops);

-- ---------------------------------------------------------------------
-- 3. RLS: evaluate auth.uid()/auth_role() once per query, not per row
--    (advisor: auth_rls_initplan)
-- ---------------------------------------------------------------------
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.auth_role()) is not null);

drop policy if exists customers_insert on public.customers;
create policy customers_insert on public.customers for insert to authenticated
  with check (
    (select public.auth_role()) is not null
    and ((select public.auth_role()) <> 'sales' or (created_by = (select auth.uid()) and coalesce(assigned_to, (select auth.uid())) = (select auth.uid())))
  );

drop policy if exists invoices_read on public.invoices;
create policy invoices_read on public.invoices for select to authenticated
  using ((select public.is_staff(array['admin']::public.user_role[])) or created_by = (select auth.uid()) or public.can_see_customer(customer_id));

drop policy if exists invoices_update on public.invoices;
create policy invoices_update on public.invoices for update to authenticated
  using ((select public.is_staff(array['admin']::public.user_role[])) or created_by = (select auth.uid()) or public.can_see_customer(customer_id))
  with check ((select public.auth_role()) is not null and public.can_see_customer(customer_id));

drop policy if exists reservations_insert on public.reservations;
create policy reservations_insert on public.reservations for insert to authenticated
  with check (
    (select public.auth_role()) is not null and public.can_see_customer(customer_id)
    and ((select public.auth_role()) <> 'sales' or sales_agent_id = (select auth.uid()))
  );

drop policy if exists reservations_update on public.reservations;
create policy reservations_update on public.reservations for update to authenticated
  using (
    (select public.is_staff(array['admin']::public.user_role[]))
    or ((select public.is_staff(array['manager']::public.user_role[])) and public.can_see_reservation(sales_agent_id, created_by, customer_id))
    or sales_agent_id = (select auth.uid()) or created_by = (select auth.uid())
  )
  with check ((select public.auth_role()) is not null and ((select public.auth_role()) <> 'sales' or sales_agent_id = (select auth.uid())));

drop policy if exists inquiries_update on public.inquiries;
create policy inquiries_update on public.inquiries for update to authenticated
  using (public.can_see_inquiry(assigned_to))
  with check ((select public.auth_role()) <> 'sales' or assigned_to = (select auth.uid()));

-- ---------------------------------------------------------------------
-- 4. "write" policies were FOR ALL, so SELECT ran two policies.
--    Split them into INSERT / UPDATE / DELETE (advisor: multiple_permissive_policies).
-- ---------------------------------------------------------------------
do $$
declare
  r record;
  expr text;
begin
  for r in
    select * from (values
      ('auction_houses', 'auction_houses_write', 'admin,manager'),
      ('blog_posts', 'blog_write', 'admin,manager'),
      ('freight_rates', 'freight_rates_write', 'admin,manager'),
      ('make_logos', 'make_logos_write', 'admin,manager'),
      ('ports', 'ports_write', 'admin,manager'),
      ('remittance_allocations', 'remalloc_write', 'admin,manager'),
      ('remittance_documents', 'remdoc_write', 'admin,manager'),
      ('reviews', 'reviews_write', 'admin,manager'),
      ('vehicle_documents', 'vdoc_write', 'admin,manager'),
      ('vehicle_images', 'vimg_write', 'admin,manager'),
      ('vehicle_shipments', 'vship_write', 'admin,manager'),
      ('yards', 'yards_write', 'admin,manager')
    ) as t(tbl, pol, roles)
  loop
    if not exists (select 1 from pg_tables where schemaname = 'public' and tablename = r.tbl) then continue; end if;
    expr := format('(select public.is_staff(array[%s]::public.user_role[]))',
                   (select string_agg(quote_literal(x), ',') from unnest(string_to_array(r.roles, ',')) x));
    execute format('drop policy if exists %I on public.%I', r.pol, r.tbl);
    execute format('drop policy if exists %I on public.%I', r.pol || '_ins', r.tbl);
    execute format('drop policy if exists %I on public.%I', r.pol || '_upd', r.tbl);
    execute format('drop policy if exists %I on public.%I', r.pol || '_del', r.tbl);
    execute format('create policy %I on public.%I for insert to authenticated with check (%s)', r.pol || '_ins', r.tbl, expr);
    execute format('create policy %I on public.%I for update to authenticated using (%s) with check (%s)', r.pol || '_upd', r.tbl, expr, expr);
    execute format('create policy %I on public.%I for delete to authenticated using (%s)', r.pol || '_del', r.tbl, expr);
  end loop;
end $$;

-- invoice_items: write access follows the parent invoice
drop policy if exists items_write on public.invoice_items;
drop policy if exists items_ins on public.invoice_items;
drop policy if exists items_upd on public.invoice_items;
drop policy if exists items_del on public.invoice_items;
create policy items_ins on public.invoice_items for insert to authenticated
  with check (exists (select 1 from public.invoices i where i.id = invoice_items.invoice_id));
create policy items_upd on public.invoice_items for update to authenticated
  using (exists (select 1 from public.invoices i where i.id = invoice_items.invoice_id))
  with check (exists (select 1 from public.invoices i where i.id = invoice_items.invoice_id));
create policy items_del on public.invoice_items for delete to authenticated
  using (exists (select 1 from public.invoices i where i.id = invoice_items.invoice_id));

-- ---------------------------------------------------------------------
-- 5. Rate limiting (fixed window). Keys are hashed on the server.
-- ---------------------------------------------------------------------
create table if not exists public.rate_limits (
  key          text primary key,
  window_start timestamptz not null default now(),
  hits         int not null default 0
);
alter table public.rate_limits enable row level security;  -- no policies: only the function below touches it

create or replace function public.rate_limit_hit(p_key text, p_max int, p_window_seconds int)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  n int;
begin
  if p_key is null or length(p_key) > 128 or p_max < 1 or p_window_seconds < 1 or p_window_seconds > 86400 then
    return true;
  end if;
  insert into public.rate_limits as r (key, window_start, hits)
  values (p_key, now(), 1)
  on conflict (key) do update
    set hits = case when r.window_start < now() - make_interval(secs => p_window_seconds) then 1 else r.hits + 1 end,
        window_start = case when r.window_start < now() - make_interval(secs => p_window_seconds) then now() else r.window_start end
  returning hits into n;
  -- Housekeeping: drop stale keys now and then.
  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;
  return n <= p_max;
end $$;
revoke execute on function public.rate_limit_hit(text, int, int) from public;
grant execute on function public.rate_limit_hit(text, int, int) to anon, authenticated;
