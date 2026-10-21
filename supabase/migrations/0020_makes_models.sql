-- =====================================================================
-- 0020 — Makes & models list (Configuration → Makes & models)
--   • catalog_makes  (vehicle = cars + parts, machinery)
--   • catalog_models (per make)
--   Used as suggestions in the vehicle, part and machinery forms; typing a
--   make/model that isn't listed still works. Seeded from the current stock.
-- Run after 0001–0019. Safe to re-run.
-- =====================================================================

create table if not exists public.catalog_makes (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null default 'vehicle' check (kind in ('vehicle', 'machinery')),
  name        text not null check (length(trim(name)) > 0),
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
create unique index if not exists catalog_makes_kind_name_idx on public.catalog_makes (kind, lower(name));

create table if not exists public.catalog_models (
  id          uuid primary key default gen_random_uuid(),
  make_id     uuid not null references public.catalog_makes (id) on delete cascade,
  name        text not null check (length(trim(name)) > 0),
  model_code  text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
create unique index if not exists catalog_models_make_name_idx on public.catalog_models (make_id, lower(name));

alter table public.catalog_makes enable row level security;
alter table public.catalog_models enable row level security;

drop policy if exists cmake_read on public.catalog_makes;
create policy cmake_read on public.catalog_makes for select to authenticated using ((select public.auth_role()) is not null);
drop policy if exists cmake_ins on public.catalog_makes;
create policy cmake_ins on public.catalog_makes for insert to authenticated
  with check ((select public.is_staff(array['admin','manager']::public.user_role[])));
drop policy if exists cmake_upd on public.catalog_makes;
create policy cmake_upd on public.catalog_makes for update to authenticated
  using ((select public.is_staff(array['admin','manager']::public.user_role[])))
  with check ((select public.is_staff(array['admin','manager']::public.user_role[])));
drop policy if exists cmake_del on public.catalog_makes;
create policy cmake_del on public.catalog_makes for delete to authenticated
  using ((select public.is_staff(array['admin','manager']::public.user_role[])));

drop policy if exists cmodel_read on public.catalog_models;
create policy cmodel_read on public.catalog_models for select to authenticated using ((select public.auth_role()) is not null);
drop policy if exists cmodel_ins on public.catalog_models;
create policy cmodel_ins on public.catalog_models for insert to authenticated
  with check ((select public.is_staff(array['admin','manager']::public.user_role[])));
drop policy if exists cmodel_upd on public.catalog_models;
create policy cmodel_upd on public.catalog_models for update to authenticated
  using ((select public.is_staff(array['admin','manager']::public.user_role[])))
  with check ((select public.is_staff(array['admin','manager']::public.user_role[])));
drop policy if exists cmodel_del on public.catalog_models;
create policy cmodel_del on public.catalog_models for delete to authenticated
  using ((select public.is_staff(array['admin','manager']::public.user_role[])));

-- ---------------------------------------------------------------------
-- Seed: common makes, then every make/model already in stock
-- (the most-used spelling of each wins)
-- ---------------------------------------------------------------------
insert into public.catalog_makes (kind, name)
select 'vehicle', n from unnest(array[
  'Toyota', 'Nissan', 'Honda', 'Mazda', 'Mitsubishi', 'Subaru', 'Suzuki', 'Daihatsu', 'Lexus', 'Isuzu', 'Hino',
  'Mercedes-Benz', 'BMW', 'Volkswagen', 'Audi'
]) n
on conflict do nothing;

insert into public.catalog_makes (kind, name)
select 'machinery', n from unnest(array[
  'Komatsu', 'Caterpillar', 'Hitachi', 'Kobelco', 'Kubota', 'Yanmar', 'Sumitomo', 'Takeuchi', 'Volvo', 'Toyota', 'Tadano',
  'Kato', 'Isuzu', 'Hino', 'Doosan', 'Hyundai'
]) n
on conflict do nothing;

insert into public.catalog_makes (kind, name)
select 'vehicle', s.make
  from (
    select distinct on (lower(make)) make
      from (select trim(make) as make, count(*) c from public.vehicles where coalesce(trim(make), '') <> '' group by trim(make)) t
     order by lower(make), c desc
  ) s
on conflict do nothing;

insert into public.catalog_makes (kind, name)
select 'machinery', s.make
  from (
    select distinct on (lower(make)) make
      from (select trim(make) as make, count(*) c from public.machinery where coalesce(trim(make), '') <> '' group by trim(make)) t
     order by lower(make), c desc
  ) s
on conflict do nothing;

insert into public.catalog_models (make_id, name)
select m.id, s.model
  from (
    select distinct on (lower(make), lower(model)) make, model
      from (
        select trim(make) as make, trim(model) as model, count(*) c
          from public.vehicles
         where coalesce(trim(make), '') <> '' and coalesce(trim(model), '') <> ''
         group by trim(make), trim(model)
      ) t
     order by lower(make), lower(model), c desc
  ) s
  join public.catalog_makes m on m.kind = 'vehicle' and lower(m.name) = lower(s.make)
on conflict do nothing;

insert into public.catalog_models (make_id, name)
select m.id, s.model
  from (
    select distinct on (lower(make), lower(model)) make, model
      from (
        select trim(make) as make, trim(model) as model, count(*) c
          from public.machinery
         where coalesce(trim(make), '') <> '' and coalesce(trim(model), '') <> ''
         group by trim(make), trim(model)
      ) t
     order by lower(make), lower(model), c desc
  ) s
  join public.catalog_makes m on m.kind = 'machinery' and lower(m.name) = lower(s.make)
on conflict do nothing;
