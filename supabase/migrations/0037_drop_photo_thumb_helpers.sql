-- =====================================================================
-- 0037: drop the photo-thumbnail helpers from 0032
--
-- Photos and their thumbnails now live in Cloudflare R2 (src/lib/photo-store.ts), not in
-- Supabase Storage, and the Admin → System backfill tool that used these is gone.
-- Safe to re-run.
-- =====================================================================

drop function if exists public.staff_photo_thumbs_missing(text, int);
drop function if exists public.staff_photo_thumbs_status();
drop function if exists public.listing_photo_paths();
drop function if exists public.photo_thumb_path(text);
