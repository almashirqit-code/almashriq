-- =====================================================================
-- 0024: manual vehicle status (admins, logged) + in-yard photos
--
--  * vehicles.status_manual: an admin set the status by hand (e.g. settling old data);
--    sync_vehicle_status then leaves the car alone until it is released back to automatic.
--  * vehicle_status_changes: every manual change / release — who, when, old → new, reason.
--  * set_vehicle_status(id, status, note) / release_vehicle_status(id, note): admin only.
--  * vehicle_yard_images: photos taken at the yard, shown on the public car page
--    (public_vehicle_yard_photos).
-- =====================================================================

alter table public.vehicles add column if not exists status_manual boolean not null default false;

create table if not exists public.vehicle_status_changes (
  id          bigint generated always as identity primary key,
  vehicle_id  uuid not null references public.vehicles (id) on delete cascade,
  old_status  public.vehicle_status,
  new_status  public.vehicle_status not null,
  manual      boolean not null default true,
  note        text not null,
  changed_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists vehicle_status_changes_vehicle_idx on public.vehicle_status_changes (vehicle_id, created_at desc);
create index if not exists vehicle_status_changes_by_idx on public.vehicle_status_changes (changed_by);

alter table public.vehicle_status_changes enable row level security;
drop policy if exists vsc_read on public.vehicle_status_changes;
create policy vsc_read on public.vehicle_status_changes for select to authenticated using ((select public.auth_role()) is not null);
-- Rows are written only by the security-definer functions below.

-- ---------------------------------------------------------------------
-- Vehicle status sync (same as 0021) — skips cars whose status an admin set by hand
-- ---------------------------------------------------------------------
create or replace function public.sync_vehicle_status(v_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  best public.invoice_status;
  cur  public.vehicle_status;
  man  boolean;
  has_res boolean;
begin
  if v_id is null then return; end if;
  select status, status_manual into cur, man from public.vehicles where id = v_id;
  if cur = 'shipped' or man then return; end if;

  select i.status into best
    from public.invoice_items it
    join public.invoices i on i.id = it.invoice_id
   where it.vehicle_id = v_id and i.status <> 'cancelled' and i.doc_type = 'invoice'
   order by case i.status when 'paid' then 1 when 'partially_paid' then 2 when 'issued' then 3 else 4 end
   limit 1;

  select exists (select 1 from public.reservations r where r.vehicle_id = v_id and r.status = 'active') into has_res;

  update public.vehicles
     set status = case
                    when best is null and has_res then 'reserved'::public.vehicle_status
                    when best is null then 'in_stock'::public.vehicle_status
                    when best = 'draft' then 'reserved'::public.vehicle_status
                    else 'sold'::public.vehicle_status
                  end
   where id = v_id;
end $$;

-- ---------------------------------------------------------------------
-- Manual status (admins only, reason required, logged)
-- ---------------------------------------------------------------------
create or replace function public.set_vehicle_status(p_vehicle uuid, p_status public.vehicle_status, p_note text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  old public.vehicle_status;
begin
  if public.auth_role() is distinct from 'admin'::public.user_role then
    raise exception 'Only admins can change a vehicle status by hand.';
  end if;
  if coalesce(trim(p_note), '') = '' then
    raise exception 'Give a reason for the change.';
  end if;
  select status into old from public.vehicles where id = p_vehicle for update;
  if not found then raise exception 'Vehicle not found.'; end if;
  update public.vehicles set status = p_status, status_manual = true where id = p_vehicle;
  insert into public.vehicle_status_changes (vehicle_id, old_status, new_status, manual, note, changed_by)
  values (p_vehicle, old, p_status, true, trim(p_note), auth.uid());
end $$;

create or replace function public.release_vehicle_status(p_vehicle uuid, p_note text default null)
returns public.vehicle_status
language plpgsql security definer set search_path = public
as $$
declare
  old public.vehicle_status;
  now_status public.vehicle_status;
begin
  if public.auth_role() is distinct from 'admin'::public.user_role then
    raise exception 'Only admins can change a vehicle status by hand.';
  end if;
  select status into old from public.vehicles where id = p_vehicle for update;
  if not found then raise exception 'Vehicle not found.'; end if;
  update public.vehicles set status_manual = false where id = p_vehicle;
  -- shipped stays shipped (as before); otherwise recalculate from invoices / reservations
  if old <> 'shipped' then perform public.sync_vehicle_status(p_vehicle); end if;
  select status into now_status from public.vehicles where id = p_vehicle;
  insert into public.vehicle_status_changes (vehicle_id, old_status, new_status, manual, note, changed_by)
  values (p_vehicle, old, now_status, false, coalesce(nullif(trim(p_note), ''), 'Back to automatic'), auth.uid());
  return now_status;
end $$;

revoke all on function public.set_vehicle_status(uuid, public.vehicle_status, text) from public, anon;
revoke all on function public.release_vehicle_status(uuid, text) from public, anon;
grant execute on function public.set_vehicle_status(uuid, public.vehicle_status, text) to authenticated;
grant execute on function public.release_vehicle_status(uuid, text) to authenticated;

-- ---------------------------------------------------------------------
-- In-yard photos (vehicle-images bucket, yard/<vehicle id>/…)
-- ---------------------------------------------------------------------
create table if not exists public.vehicle_yard_images (
  id          uuid primary key default gen_random_uuid(),
  vehicle_id  uuid not null references public.vehicles (id) on delete cascade,
  path        text not null,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists vehicle_yard_images_idx on public.vehicle_yard_images (vehicle_id, sort_order);

alter table public.vehicle_yard_images enable row level security;
drop policy if exists vyimg_read on public.vehicle_yard_images;
create policy vyimg_read on public.vehicle_yard_images for select to authenticated using ((select public.auth_role()) is not null);
drop policy if exists vyimg_ins on public.vehicle_yard_images;
create policy vyimg_ins on public.vehicle_yard_images for insert to authenticated
  with check ((select public.is_staff(array['admin','manager']::public.user_role[])));
drop policy if exists vyimg_upd on public.vehicle_yard_images;
create policy vyimg_upd on public.vehicle_yard_images for update to authenticated
  using ((select public.is_staff(array['admin','manager']::public.user_role[])))
  with check ((select public.is_staff(array['admin','manager']::public.user_role[])));
drop policy if exists vyimg_del on public.vehicle_yard_images;
create policy vyimg_del on public.vehicle_yard_images for delete to authenticated
  using ((select public.is_staff(array['admin','manager']::public.user_role[])));

-- Public: yard photos of a car shown on the website
create or replace function public.public_vehicle_yard_photos(p_key text)
returns text[]
language sql stable security definer set search_path = public
as $$
  select coalesce(array_agg(y.path order by y.sort_order, y.created_at), '{}')
    from public.vehicles v
    join public.vehicle_yard_images y on y.vehicle_id = v.id
   where v.show_on_website
     and v.status in ('in_stock', 'reserved', 'sold')
     and upper(v.stock_no) = upper(p_key)
$$;
grant execute on function public.public_vehicle_yard_photos(text) to anon, authenticated;
