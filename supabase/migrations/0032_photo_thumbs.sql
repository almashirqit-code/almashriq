-- =====================================================================
-- 0032: card thumbnails for listing photos
--
-- Every car, part and machine photo in the vehicle-images bucket gets a small WebP copy at
-- thumbs/<path without extension>.webp (made by the ERP on upload, see src/lib/images.ts).
-- These admin-only helpers drive Admin → System → "Create missing thumbnails" for older photos.
-- The thumbnail path must match thumbPath() in src/lib/format.ts.
-- Safe to re-run.
-- =====================================================================

create or replace function public.photo_thumb_path(p_path text)
returns text
language sql immutable
as $$ select 'thumbs/' || regexp_replace(p_path, '\.[^./]+$', '') || '.webp' $$;

-- Listing photos shown on cards (yard photos only appear in the car page gallery).
create or replace function public.listing_photo_paths()
returns table (path text)
language sql stable security definer set search_path = public
as $$
  select path from public.vehicle_images where path not like 'site-assets:%'
  union all select path from public.part_images where path not like 'site-assets:%'
  union all select path from public.machinery_images where path not like 'site-assets:%'
$$;
revoke all on function public.listing_photo_paths() from public, anon, authenticated;

-- How many listing photos there are and how many still lack a thumbnail.
create or replace function public.staff_photo_thumbs_status()
returns table (total bigint, missing bigint)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_staff(array['admin']::public.user_role[]) then raise exception 'not authorized'; end if;
  return query
    select count(*),
           count(*) filter (where not exists (
             select 1 from storage.objects o where o.bucket_id = 'vehicle-images' and o.name = public.photo_thumb_path(p.path)))
      from public.listing_photo_paths() p;
end $$;
revoke all on function public.staff_photo_thumbs_status() from public, anon;
grant execute on function public.staff_photo_thumbs_status() to authenticated;

-- The next batch of photos without a thumbnail, in path order after p_after (a cursor, so a photo
-- that fails is not offered again in the same run).
create or replace function public.staff_photo_thumbs_missing(p_after text default '', p_limit int default 50)
returns table (path text)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_staff(array['admin']::public.user_role[]) then raise exception 'not authorized'; end if;
  return query
    select p.path from public.listing_photo_paths() p
     where p.path > coalesce(p_after, '')
       and not exists (select 1 from storage.objects o where o.bucket_id = 'vehicle-images' and o.name = public.photo_thumb_path(p.path))
     order by p.path
     limit greatest(1, least(coalesce(p_limit, 50), 200));
end $$;
revoke all on function public.staff_photo_thumbs_missing(text, int) from public, anon;
grant execute on function public.staff_photo_thumbs_missing(text, int) to authenticated;
