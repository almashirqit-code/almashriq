-- Public car pages: show only the first half of the chassis number, the rest as * (was: all but the last 4).
-- Same signature as 0017, so create or replace is enough and the migration is re-runnable.
create or replace function public.public_vehicle(p_key text)
returns table (
  id uuid, stock_no text, make text, model text, grade text, model_code text, year int, month int, mileage int, engine_cc int,
  fuel text, transmission text, drive text, steering text, doors int, seats int, body_type text, color text, chassis_no text,
  location text, price numeric, price_currency text, status public.vehicle_status, for_parts boolean, features text[], images text[],
  created_at timestamptz, branch text
)
language sql stable security definer set search_path = public
as $$
  select v.id, v.stock_no, v.make, v.model, v.grade, v.model_code, v.year, v.month, v.mileage, v.engine_cc, v.fuel,
         v.transmission, v.drive, v.steering, v.doors, v.seats, v.body_type, v.color,
         -- never show the full chassis number publicly: first half, then one * per hidden character
         case when v.chassis_no is null or v.chassis_no = '' then null
              else left(v.chassis_no, ceil(length(v.chassis_no) / 2.0)::int)
                   || repeat('*', length(v.chassis_no) - ceil(length(v.chassis_no) / 2.0)::int) end,
         v.location, v.price, v.price_currency, v.status, v.for_parts, v.features,
         coalesce((select array_agg(i.path order by i.sort_order, i.created_at) from public.vehicle_images i where i.vehicle_id = v.id), '{}'),
         v.created_at, v.branch
    from public.vehicles v
   where v.show_on_website
     and v.status in ('in_stock', 'reserved', 'sold')
     and (upper(v.stock_no) = upper(p_key) or v.source_ref = p_key)
   limit 1
$$;
grant execute on function public.public_vehicle(text) to anon, authenticated;
