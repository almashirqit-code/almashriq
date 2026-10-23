-- =====================================================================
-- 0027: customer portal data (read-only)
--
-- Customers never read business tables directly (they stay staff-only).
-- Each portal_* function is SECURITY DEFINER, scoped to the customer linked
-- to the signed-in login (portal_customer_id(), active accounts only), and
-- returns an explicit list of customer-safe columns. Never returned:
-- buying cost / profit, freight & vanning charges, TT office/shift/remarks,
-- staff notes, drafts.
-- Also locks down a trigger function that was callable through the API.
-- Safe to re-run.
-- =====================================================================

-- Cars that belong to the customer's purchases: on a live invoice or
-- auction-deposit invoice, or on an active/invoiced reservation.
create or replace function public.portal_vehicle_ids()
returns setof uuid
language sql stable security definer set search_path = public
as $$
  select it.vehicle_id
    from public.invoice_items it
    join public.invoices i on i.id = it.invoice_id
   where i.customer_id = public.portal_customer_id()
     and it.vehicle_id is not null
     and i.status not in ('draft', 'cancelled')
     and i.doc_type in ('invoice', 'auction_deposit')
  union
  select r.vehicle_id
    from public.reservations r
   where r.customer_id = public.portal_customer_id()
     and r.vehicle_id is not null
     and r.status in ('active', 'invoiced')
$$;
revoke all on function public.portal_vehicle_ids() from public, anon, authenticated;

-- Document kinds a customer may download (shipping + export papers).
create or replace function public.portal_doc_kinds()
returns text[]
language sql immutable
as $$
  select array['bl', 'amend_bl', 'surrender', 'draft_bl', 'waybill', 'export_cert', 'export_cert_en',
               'inspection_cert', 'auction_sheet', 'courier_bl', 'dhl_docs']
$$;
revoke all on function public.portal_doc_kinds() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Who am I: account status, linked customer, assigned agent.
-- ---------------------------------------------------------------------
create or replace function public.portal_me()
returns jsonb
language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
    'status', pa.status,
    'full_name', pa.full_name,
    'email', pa.email,
    'customer', case when pa.status = 'active' then (
      select jsonb_build_object('customer_no', c.customer_no, 'name', c.name, 'company', c.company, 'country', c.country, 'port', c.port)
        from public.customers c where c.id = pa.customer_id) end,
    'agent', case when pa.status = 'active' then (
      select jsonb_build_object('name', coalesce(p.full_name, p.email), 'email', p.email)
        from public.customers c join public.profiles p on p.id = c.assigned_to
       where c.id = pa.customer_id) end
  )
  from public.portal_accounts pa
  where pa.user_id = auth.uid()
$$;

-- ---------------------------------------------------------------------
-- Invoices, quotations and auction-deposit invoices (no drafts).
-- ---------------------------------------------------------------------
create or replace function public.portal_invoices()
returns table (
  id uuid, invoice_no text, doc_type text, issue_date date, due_date date, valid_until date,
  currency text, total numeric, amount_paid numeric, status text, incoterm text, port_of_discharge text, units int
)
language sql stable security definer set search_path = public
as $$
  select i.id, i.invoice_no, i.doc_type, i.issue_date, i.due_date, i.valid_until,
         i.currency, i.total, i.amount_paid, i.status::text, i.incoterm, i.port_of_discharge,
         (select count(*)::int from public.invoice_items it where it.invoice_id = i.id and it.vehicle_id is not null)
    from public.invoices i
   where i.customer_id = public.portal_customer_id()
     and i.status <> 'draft'
   order by i.issue_date desc, i.created_at desc
$$;

-- One invoice with its lines and the customer block, shaped for InvoiceDocument.
create or replace function public.portal_invoice(p_id uuid)
returns jsonb
language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
    'invoice', to_jsonb(i) - 'created_by' - 'converted_from',
    'items', coalesce((
      select jsonb_agg(
               to_jsonb(it) || jsonb_build_object('vehicles', (
                 select jsonb_build_object('stock_no', v.stock_no, 'make', v.make, 'model', v.model, 'grade', v.grade,
                                           'chassis_no', v.chassis_no, 'engine_cc', v.engine_cc, 'color', v.color, 'year', v.year)
                   from public.vehicles v where v.id = it.vehicle_id))
               order by it.sort_order)
        from public.invoice_items it where it.invoice_id = i.id), '[]'::jsonb),
    'customer', (select to_jsonb(c) - 'notes' - 'created_by' - 'assigned_to'
                   from public.customers c where c.id = i.customer_id)
  )
  from public.invoices i
  where i.id = p_id
    and i.customer_id = public.portal_customer_id()
    and i.status <> 'draft'
$$;

-- ---------------------------------------------------------------------
-- TTs (remittances) and which cars each one paid for.
-- ---------------------------------------------------------------------
create or replace function public.portal_remittances()
returns table (
  id bigint, remit_date date, received_date date, currency text, remitter text, bank text,
  instructed_amount numeric, remit_amount numeric, bank_charges numeric,
  allocated_amount numeric, remaining_amount numeric, status text, allocations jsonb
)
language sql stable security definer set search_path = public
as $$
  select r.id, r.remit_date, r.received_date, r.currency, r.remitter, r.bank,
         r.instructed_amount, r.remit_amount, r.bank_charges,
         r.allocated_amount, r.remaining_amount, r.status,
         coalesce((
           select jsonb_agg(jsonb_build_object('stock_no', v.stock_no, 'make', v.make, 'model', v.model, 'amount', a.amount)
                            order by a.created_at)
             from public.remittance_allocations a
             join public.vehicles v on v.id = a.vehicle_id
            where a.remittance_id = r.id), '[]'::jsonb)
    from public.remittances r
   where r.customer_id = public.portal_customer_id()
   order by coalesce(r.received_date, r.remit_date) desc nulls last, r.id desc
$$;

-- ---------------------------------------------------------------------
-- Reservations (never buying cost / profit / internal notes).
-- ---------------------------------------------------------------------
create or replace function public.portal_reservations()
returns table (
  id uuid, reservation_no bigint, status text, price_term text, shipment_type text,
  port_of_loading text, port_of_discharge text, currency text, sold_price numeric,
  freight numeric, insurance numeric, reserved_until date, created_at timestamptz,
  stock_no text, make text, model text, year int, cover text
)
language sql stable security definer set search_path = public
as $$
  select r.id, r.reservation_no, r.status, r.price_term, r.shipment_type,
         r.port_of_loading, r.port_of_discharge, r.currency, r.sold_price,
         r.freight, r.insurance, r.reserved_until, r.created_at,
         v.stock_no, v.make, v.model, v.year,
         (select im.path from public.vehicle_images im where im.vehicle_id = v.id order by im.sort_order, im.created_at limit 1)
    from public.reservations r
    left join public.vehicles v on v.id = r.vehicle_id
   where r.customer_id = public.portal_customer_id()
   order by r.created_at desc
$$;

-- ---------------------------------------------------------------------
-- The customer's cars: status and shipping/courier tracking (no charges).
-- ---------------------------------------------------------------------
create or replace function public.portal_vehicles()
returns table (
  id uuid, stock_no text, make text, model text, grade text, year int, chassis_no text, color text, engine_cc int,
  status text, shipping_status text, cover text,
  ship_company text, vessel_name text, voyage_no text, etd date, eta date, port_of_loading text, place_of_delivery text,
  bl_no text, bl_date date, track_url text, shipment_type text, container_no text,
  courier_company text, courier_tracking text, courier_date date, doc_count int
)
language sql stable security definer set search_path = public
as $$
  select v.id, v.stock_no, v.make, v.model, v.grade, v.year, v.chassis_no, v.color, v.engine_cc,
         v.status::text, v.shipping_status,
         (select im.path from public.vehicle_images im where im.vehicle_id = v.id order by im.sort_order, im.created_at limit 1),
         s.ship_company, s.vessel_name, s.voyage_no, s.etd, s.eta, s.port_of_loading, s.place_of_delivery,
         s.bl_no, s.bl_date, s.track_url, s.shipment_type, s.container_no,
         s.courier_company, s.courier_tracking, s.courier_date,
         (select count(*)::int from public.vehicle_documents d where d.vehicle_id = v.id and d.kind = any (public.portal_doc_kinds()))
    from public.vehicles v
    left join public.vehicle_shipments s on s.vehicle_id = v.id
   where v.id in (select public.portal_vehicle_ids())
   order by v.created_at desc
$$;

-- ---------------------------------------------------------------------
-- Documents for the customer's cars (customer-facing kinds only).
-- ---------------------------------------------------------------------
create or replace function public.portal_documents()
returns table (id uuid, vehicle_id uuid, stock_no text, kind text, file_name text, mime_type text, size_bytes bigint, created_at timestamptz)
language sql stable security definer set search_path = public
as $$
  select d.id, d.vehicle_id, v.stock_no, d.kind, d.file_name, d.mime_type, d.size_bytes, d.created_at
    from public.vehicle_documents d
    join public.vehicles v on v.id = d.vehicle_id
   where d.vehicle_id in (select public.portal_vehicle_ids())
     and d.kind = any (public.portal_doc_kinds())
   order by v.stock_no, d.created_at desc
$$;

-- Storage path of one of the customer's documents (the download route signs it).
create or replace function public.portal_document_file(p_id uuid)
returns table (path text, file_name text, mime_type text)
language sql stable security definer set search_path = public
as $$
  select d.path, d.file_name, d.mime_type
    from public.vehicle_documents d
   where d.id = p_id
     and d.vehicle_id in (select public.portal_vehicle_ids())
     and d.kind = any (public.portal_doc_kinds())
$$;

-- ---------------------------------------------------------------------
-- Statement of account: invoices (debit) and payments (credit) with a
-- running balance per currency. Quotations, drafts and cancelled invoices
-- are not debts. TTs are listed separately (their allocations become
-- payments), so nothing is counted twice.
-- ---------------------------------------------------------------------
create or replace function public.portal_statement()
returns table (currency text, entry_date date, kind text, ref text, detail text, debit numeric, credit numeric, balance numeric)
language sql stable security definer set search_path = public
as $$
  with inv as (
    select i.id, i.invoice_no, i.issue_date, i.currency, i.total, i.doc_type, i.created_at
      from public.invoices i
     where i.customer_id = public.portal_customer_id()
       and i.status not in ('draft', 'cancelled')
       and i.doc_type in ('invoice', 'auction_deposit')
  ), e as (
    select inv.currency, inv.issue_date as d, 0 as ord, inv.created_at as ts, 'invoice'::text as kind, inv.invoice_no as ref,
           case inv.doc_type when 'auction_deposit' then 'Auction deposit' else 'Invoice' end as detail,
           inv.total as debit, 0::numeric as credit
      from inv
    union all
    select inv.currency, p.paid_on, 1, p.created_at, 'payment', inv.invoice_no,
           coalesce(nullif(p.method, ''), 'Payment') || coalesce(' · ' || nullif(p.reference, ''), ''),
           0::numeric, p.amount
      from public.payments p
      join inv on inv.id = p.invoice_id
  )
  select e.currency, e.d, e.kind, e.ref, e.detail, e.debit, e.credit,
         sum(e.debit - e.credit) over (partition by e.currency order by e.d, e.ord, e.ts rows unbounded preceding)
    from e
   order by e.currency, e.d, e.ord, e.ts
$$;

-- Signed-in users only; each function returns nothing unless the login is an active portal account.
do $$
declare f text;
begin
  foreach f in array array[
    'public.portal_me()', 'public.portal_invoices()', 'public.portal_invoice(uuid)', 'public.portal_remittances()',
    'public.portal_reservations()', 'public.portal_vehicles()', 'public.portal_documents()',
    'public.portal_document_file(uuid)', 'public.portal_statement()'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;

-- Trigger function from 0021 was callable through the API (advisor). Triggers don't need EXECUTE grants.
revoke execute on function public.trg_payments_doc_guard() from public, anon, authenticated;
