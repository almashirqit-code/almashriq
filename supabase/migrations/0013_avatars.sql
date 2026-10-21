-- =====================================================================
-- Al Mashriq ERP — staff avatars. Safe to re-run.
-- Each staff member can set their own picture (uploaded photo or a
-- generated avatar). Photos go to site-assets/avatars/<user id>/...
-- =====================================================================

alter table public.profiles add column if not exists avatar_url text;

-- Any active staff member may upload into their own avatars folder.
drop policy if exists "own avatar upload" on storage.objects;
create policy "own avatar upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'site-assets' and name like 'avatars/' || auth.uid()::text || '/%'
              and public.is_staff(array['admin','manager','sales']::public.user_role[]));

-- Change only your own picture (other profile fields stay admin-only).
create or replace function public.set_my_avatar(p_url text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if p_url is not null and p_url !~ '^(https://api\.dicebear\.com/|avatars/)' then
    raise exception 'invalid avatar';
  end if;
  update public.profiles set avatar_url = p_url where id = auth.uid();
end $$;
grant execute on function public.set_my_avatar(text) to authenticated;
