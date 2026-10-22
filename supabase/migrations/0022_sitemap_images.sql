-- =====================================================================
-- 0022: photos for the XML sitemap (Google Images indexing)
-- First 3 photos of every listing that is in the sitemap (public_sitemap).
-- =====================================================================
create or replace function public.public_sitemap_images()
returns table (kind text, key text, path text)
language sql stable security definer set search_path = public
as $$
  select 'car', v.stock_no, i.path
    from public.vehicles v
    cross join lateral (
      select vi.path from public.vehicle_images vi where vi.vehicle_id = v.id order by vi.sort_order limit 3
    ) i
   where v.show_on_website and v.status in ('in_stock', 'reserved')
  union all
  select 'part', p.part_no, i.path
    from public.parts p
    cross join lateral (
      select pi.path from public.part_images pi where pi.part_id = p.id order by pi.sort_order limit 3
    ) i
   where p.show_on_website and p.status in ('available', 'reserved')
  union all
  select 'machine', m.stock_no, i.path
    from public.machinery m
    cross join lateral (
      select mi.path from public.machinery_images mi where mi.machinery_id = m.id order by mi.sort_order limit 3
    ) i
   where m.show_on_website and m.status in ('in_stock', 'reserved');
$$;
revoke all on function public.public_sitemap_images() from public;
grant execute on function public.public_sitemap_images() to anon, authenticated;
