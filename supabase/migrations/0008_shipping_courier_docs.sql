-- =====================================================================
-- 0008 — Shipping info, courier info, vehicle documents, shipping status
-- Run after 0001–0007. Safe to re-run.
--
-- Shipping status (automatic):
--   not_booked → booked     when booking no. + ETD + ETA are filled in
--   booked     → shipped    when a Bill of Lading document is uploaded
--   shipped    → delivered  when a Waybill or Surrender document is uploaded
-- =====================================================================

alter table public.vehicles
  add column if not exists shipping_status text not null default 'not_booked';
do $$ begin
  alter table public.vehicles add constraint vehicles_shipping_status_chk
    check (shipping_status in ('not_booked', 'booked', 'shipped', 'delivered'));
exception when duplicate_object then null; end $$;
create index if not exists vehicles_shipping_status_idx on public.vehicles (shipping_status);

-- One row per vehicle: shipping + courier details
create table if not exists public.vehicle_shipments (
  vehicle_id            uuid primary key references public.vehicles (id) on delete cascade,
  -- shipping
  ship_company          text,
  vessel_name           text,
  voyage_no             text,
  etd                   date,
  eta                   date,
  port_of_loading       text,
  place_of_delivery     text,
  forwarding_agent      text,
  cut_off_date          date,
  bl_no                 text,
  bl_date               date,
  booking_no            text,
  track_url             text,
  shipment_type         text check (shipment_type in ('roro', 'container_20', 'container_40')),
  container_no          text,
  freight_charges       numeric(14, 2),
  freight_currency      text not null default 'USD' check (freight_currency in ('JPY', 'USD', 'EUR', 'GBP')),
  vanning_charges       numeric(14, 2),
  ship_invoice_details  text,
  -- courier (original documents sent to the customer)
  courier_service       text,      -- DHL, FedEx, EMS, UPS, …
  courier_company       text,
  courier_tracking      text,
  courier_date          date,
  courier_details       text,
  courier_charges       numeric(14, 2),
  updated_by            uuid references public.profiles (id) on delete set null,
  updated_at            timestamptz not null default now()
);
create index if not exists vehicle_shipments_booking_idx on public.vehicle_shipments (booking_no);
create index if not exists vehicle_shipments_container_idx on public.vehicle_shipments (container_no);

-- Documents (private bucket "vehicle-docs")
create table if not exists public.vehicle_documents (
  id          uuid primary key default gen_random_uuid(),
  vehicle_id  uuid not null references public.vehicles (id) on delete cascade,
  kind        text not null check (kind in (
                'bl', 'amend_bl', 'surrender', 'draft_bl', 'waybill', 'shipping_invoice', 'shipping_other',
                'export_cert', 'export_cert_en', 'inspection_cert', 'auction_sheet', 'courier_bl',
                'spare_key', 'dhl_docs', 'courier_other')),
  path        text not null,
  file_name   text not null,
  mime_type   text,
  size_bytes  bigint,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists vehicle_documents_vehicle_idx on public.vehicle_documents (vehicle_id, kind);

-- ---------------------------------------------------------------------
-- Automatic shipping status
-- ---------------------------------------------------------------------
create or replace function public.sync_shipping_status(v_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  s public.vehicle_shipments%rowtype;
  next_status text := 'not_booked';
begin
  if v_id is null then return; end if;
  select * into s from public.vehicle_shipments where vehicle_id = v_id;

  if exists (select 1 from public.vehicle_documents d where d.vehicle_id = v_id and d.kind in ('waybill', 'surrender')) then
    next_status := 'delivered';
  elsif exists (select 1 from public.vehicle_documents d where d.vehicle_id = v_id and d.kind = 'bl') then
    next_status := 'shipped';
  elsif s.vehicle_id is not null and nullif(trim(s.booking_no), '') is not null and s.etd is not null and s.eta is not null then
    next_status := 'booked';
  end if;

  update public.vehicles set shipping_status = next_status
   where id = v_id and shipping_status is distinct from next_status;
end $$;

create or replace function public.trg_shipping_sync()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.sync_shipping_status(new.vehicle_id);
  end if;
  if tg_op = 'DELETE' or (tg_op = 'UPDATE' and old.vehicle_id is distinct from new.vehicle_id) then
    perform public.sync_shipping_status(old.vehicle_id);
  end if;
  return null;
end $$;

drop trigger if exists vehicle_shipments_sync on public.vehicle_shipments;
create trigger vehicle_shipments_sync after insert or update or delete on public.vehicle_shipments
  for each row execute function public.trg_shipping_sync();
drop trigger if exists vehicle_documents_sync on public.vehicle_documents;
create trigger vehicle_documents_sync after insert or update or delete on public.vehicle_documents
  for each row execute function public.trg_shipping_sync();

create or replace function public.trg_shipments_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists vehicle_shipments_touch on public.vehicle_shipments;
create trigger vehicle_shipments_touch before update on public.vehicle_shipments
  for each row execute function public.trg_shipments_touch();

-- ---------------------------------------------------------------------
-- RLS: everyone signed in can view; admin/manager edit and upload
-- ---------------------------------------------------------------------
alter table public.vehicle_shipments enable row level security;
alter table public.vehicle_documents enable row level security;

drop policy if exists vship_read on public.vehicle_shipments;
create policy vship_read on public.vehicle_shipments for select to authenticated using (public.auth_role() is not null);
drop policy if exists vship_write on public.vehicle_shipments;
create policy vship_write on public.vehicle_shipments for all to authenticated
  using (public.is_staff(array['admin','manager']::public.user_role[]))
  with check (public.is_staff(array['admin','manager']::public.user_role[]));

drop policy if exists vdoc_read on public.vehicle_documents;
create policy vdoc_read on public.vehicle_documents for select to authenticated using (public.auth_role() is not null);
drop policy if exists vdoc_write on public.vehicle_documents;
create policy vdoc_write on public.vehicle_documents for all to authenticated
  using (public.is_staff(array['admin','manager']::public.user_role[]))
  with check (public.is_staff(array['admin','manager']::public.user_role[]));

insert into storage.buckets (id, name, public)
values ('vehicle-docs', 'vehicle-docs', false)
on conflict (id) do update set public = false;

drop policy if exists "vehicle docs read" on storage.objects;
create policy "vehicle docs read" on storage.objects for select to authenticated
  using (bucket_id = 'vehicle-docs' and public.auth_role() is not null);
drop policy if exists "vehicle docs insert" on storage.objects;
create policy "vehicle docs insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'vehicle-docs' and public.is_staff(array['admin','manager']::public.user_role[]));
drop policy if exists "vehicle docs delete" on storage.objects;
create policy "vehicle docs delete" on storage.objects for delete to authenticated
  using (bucket_id = 'vehicle-docs' and public.is_staff(array['admin','manager']::public.user_role[]));
