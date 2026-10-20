-- =====================================================================
-- Al Mashriq ERP — Ports, auction houses and yards (master data)
-- Seeded from "Japan Vehicle Export: Port & Auction House Directory".
-- Run after 0005. Safe to re-run (seed rows are inserted only if missing).
-- =====================================================================

create table if not exists public.ports (
  id              uuid primary key default gen_random_uuid(),
  name            text not null unique,
  shipment_modes  text[] not null default array['roro', 'container'],
  region          text,
  notes           text,
  active          boolean not null default true,
  created_at      timestamptz not null default now(),
  constraint ports_modes_chk check (shipment_modes <@ array['roro', 'container'] and cardinality(shipment_modes) > 0)
);

create table if not exists public.auction_houses (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  port_id     uuid references public.ports (id) on delete restrict,
  notes       text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists auction_houses_port_idx on public.auction_houses (port_id);

create table if not exists public.yards (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  port_id     uuid references public.ports (id) on delete restrict,
  address     text,
  contact     text,
  phone       text,
  notes       text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists yards_port_idx on public.yards (port_id);

alter table public.vehicles
  add column if not exists auction_house_id uuid references public.auction_houses (id) on delete set null,
  add column if not exists yard_id          uuid references public.yards (id) on delete set null;
create index if not exists vehicles_auction_house_idx on public.vehicles (auction_house_id);
create index if not exists vehicles_yard_idx on public.vehicles (yard_id);

-- RLS: everyone signed in reads; admin & manager maintain the lists
alter table public.ports          enable row level security;
alter table public.auction_houses enable row level security;
alter table public.yards          enable row level security;

do $$
declare t text;
begin
  foreach t in array array['ports', 'auction_houses', 'yards'] loop
    execute format('drop policy if exists %I on public.%I', t || '_read', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.auth_role() is not null)', t || '_read', t);
    execute format('drop policy if exists %I on public.%I', t || '_write', t);
    execute format($p$create policy %I on public.%I for all to authenticated
                     using (public.is_staff(array['admin','manager']::public.user_role[]))
                     with check (public.is_staff(array['admin','manager']::public.user_role[]))$p$, t || '_write', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Seed: ports
-- ---------------------------------------------------------------------
insert into public.ports (name, shipment_modes, region, notes) values
  ('Yokohama Port', '{roro,container}', 'Kanto, Tohoku, Hokkaido, Eastern Japan', 'RoRo or container. RoRo needs a fully driveable vehicle (brakes, engine, steering).'),
  ('Nagoya Port', '{roro,container}', 'Chubu, Hokuriku, Central Kansai', 'RoRo or container. RoRo needs a fully driveable vehicle (brakes, engine, steering).'),
  ('Kobe Port', '{roro,container}', 'Kansai, Chugoku, Shikoku, West Japan', 'RoRo or container. RoRo needs a fully driveable vehicle (brakes, engine, steering).'),
  ('NS Kyushu', '{container}', 'Kyushu, Okinawa, Moji region', 'Container shipment only — RoRo is not available at this port.')
on conflict (name) do nothing;

-- ---------------------------------------------------------------------
-- Seed: auction houses by port
-- ---------------------------------------------------------------------
insert into public.auction_houses (name, port_id)
select v.name, p.id from (values
  ('ARAI Bayside'),
  ('ARAI Oyama'),
  ('ARAI Oyama VT'),
  ('ARAI Sendai'),
  ('Aucnet'),
  ('CAA Tohoku'),
  ('CAA Tokyo'),
  ('Hero'),
  ('Honda Hokkaido'),
  ('Honda Sendai'),
  ('Honda Tokyo'),
  ('Ima Tokyo'),
  ('JU Akita'),
  ('JU Aomori'),
  ('JU Chiba'),
  ('JU Fukushima'),
  ('JU Gunma'),
  ('JU Hokkaido'),
  ('JU Ibaraki'),
  ('JU Kanagawa'),
  ('JU Miyagi'),
  ('JU Niigata'),
  ('JU Okinawa'),
  ('JU Saitama'),
  ('JU Tochigi'),
  ('JU Tokyo'),
  ('JU Yamanashi'),
  ('Lum Hokkaido'),
  ('Lum Tokyo'),
  ('Mirive Saitama'),
  ('NAA Tokyo'),
  ('NPA Tokyo'),
  ('NPS Sendai'),
  ('NPS Tomakomai'),
  ('NPS Tochigi'),
  ('NPS Tokyo'),
  ('Orix Atsugi'),
  ('Orix Sendai'),
  ('SAA Sapporo'),
  ('TAA Hokkaido'),
  ('TAA Kanto'),
  ('TAA Tohoku'),
  ('TAA Yokohama'),
  ('USS Gunma'),
  ('USS JAA'),
  ('USS Niigata'),
  ('USS Saitama'),
  ('USS Sapporo'),
  ('USS Tohoku'),
  ('USS Tokyo'),
  ('USS Yokohama'),
  ('Yanase Aucnet'),
  ('Zero Chiba'),
  ('Zero Hokkaido'),
  ('Zero Sendai')
) as v(name) cross join public.ports p where p.name = 'Yokohama Port'
on conflict (name) do nothing;

insert into public.auction_houses (name, port_id)
select v.name, p.id from (values
  ('CAA Chubu'),
  ('CAA Gifu'),
  ('Honda Kansai'),
  ('Honda Nagoya'),
  ('IAA Osaka'),
  ('JU Aichi'),
  ('JU Fukui'),
  ('JU Gifu'),
  ('JU Ishikawa'),
  ('JU Mie'),
  ('JU Nagoya'),
  ('JU Shizuoka'),
  ('JU Toyama'),
  ('LAA Okayama'),
  ('Lum Nagoya'),
  ('Mirive Aichi'),
  ('Mirive Osaka'),
  ('NAA Nagoya'),
  ('NAA Osaka'),
  ('NPS Gifu'),
  ('NPS Osaka'),
  ('SAA Hamamatsu'),
  ('TAA Chubu'),
  ('USS Nagoya')
) as v(name) cross join public.ports p where p.name = 'Nagoya Port'
on conflict (name) do nothing;

insert into public.auction_houses (name, port_id)
select v.name, p.id from (values
  ('Bayauc'),
  ('Ima Kobe'),
  ('JU Hiroshima'),
  ('JU Kumamoto'),
  ('JU Nara'),
  ('JU Oita'),
  ('JU Yamaguchi'),
  ('JU Yamagata'),
  ('KCAA Kyoto'),
  ('KCAA Yamaguchi'),
  ('LAA Shikoku'),
  ('Lum Kobe'),
  ('Orix Kobe'),
  ('TAA Hiroshima'),
  ('TAA Hyogo'),
  ('TAA Kinki'),
  ('TAA Shikoku'),
  ('USS HAA Kobe'),
  ('USS Hokuriku'),
  ('USS Kobe'),
  ('Zero Shonan')
) as v(name) cross join public.ports p where p.name = 'Kobe Port'
on conflict (name) do nothing;

insert into public.auction_houses (name, port_id)
select v.name, p.id from (values
  ('Honda Kyushu'),
  ('IMA Kyushu'),
  ('JU Fukuoka'),
  ('JU Miyazaki'),
  ('JU Nagasaki'),
  ('KCAA Fukuoka'),
  ('KCAA Minami Kyushu'),
  ('Lum Fukuoka'),
  ('NAA Fukuoka'),
  ('NPS Fukuoka'),
  ('Orix Fukuoka'),
  ('TAA Kyushu'),
  ('TAA Minami Kyushu'),
  ('USS Fukuoka'),
  ('USS Kyushu'),
  ('Zero Hakata')
) as v(name) cross join public.ports p where p.name = 'NS Kyushu'
on conflict (name) do nothing;

