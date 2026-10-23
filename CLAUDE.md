# CLAUDE.md

Guidance for AI coding agents working in this repository.

## What this is

Al Mashriq ERP — a vehicle-export ERP and public car/parts/machinery website for a
Japanese used-car dealer. **Next.js 15** (App Router) · **Supabase** (Postgres, Auth,
Storage) · **Tailwind** · deployed on **Vercel**. English / 日本語 UI. Node ≥ 20.

- `src/app/(site)/` — public website (no login)
- `src/app/admin/(app)/` — the ERP (staff only, Admin / Manager / Sales roles)
- `src/lib/` — shared helpers; `supabase/migrations/` — the database schema

## Write less code

Prefer reuse over addition. The best change is the smallest one that does the job.

- **Reuse what exists** before writing something new — check `src/lib/` and nearby
  components first. This codebase already hand-rolls small utilities (markdown, rate
  limiting, image watermarking) instead of pulling in libraries; match that.
- **Lean on the platform** — Postgres/RLS, Next.js App Router, server actions, and
  `unstable_cache`/`cache` — before reaching for a dependency. Adding an npm package
  needs a real reason.
- **Never cut** input validation, error handling, security (auth checks, RLS), or
  accessibility to make a change smaller. Those are the job, not the overhead.
- Match the surrounding code's style, naming, comment density and idiom. Don't
  reformat or refactor code the task didn't ask you to touch.

## Security is enforced in the database, not just the UI

- Permissions live in **Row Level Security** and `security definer` RPCs. Every admin
  server action must re-check the role with `assertRole(...)` from `src/lib/auth.ts` —
  never trust the middleware or the client alone.
- The **service-role key** (`createAdminClient`) bypasses RLS: server-only, and only in
  user-management actions. Never import it into client code or widen its use.
- Anon-reachable data goes through `public_*` RPCs that select an explicit column list —
  never expose cost, margin, chassis numbers or customer PII to the public surface.
- Schema changes are SQL migrations in `supabase/migrations/` (numbered, re-runnable).
  Don't edit a table from application code paths that should be a migration.

## Commands

- `npm run dev` — dev server (the app's preview runs it on port 3001; never run
  `next build` while dev is running)
- `npm run typecheck` — `tsc --noEmit` (there is **no** ESLint config; `next lint` is a no-op)
- `npm run build` — production build; run it before opening a PR

## Workflow

- Branch per task (`claude/<short-name>`), commit, open a PR, and deploy only on the
  user's go-ahead. `main` auto-deploys to production on Vercel.
- After a code change that renders in the browser, verify it in the preview rather than
  asking the user to check by hand. Admin pages behind the login can't be clicked through
  without credentials — say so instead of claiming they were tested.

## Windows / PowerShell notes (this is a Windows checkout)

- Write commit messages and files as **UTF-8 without BOM** (`[IO.File]::WriteAllText` with
  `UTF8Encoding $false`, or a here-string via `git commit -F`) — `Get-Content -Raw` mangles UTF-8.
- `Invoke-WebRequest` doesn't follow 308 redirects; use `curl.exe` to check the live site.
- Paths containing `[id]` need `-LiteralPath`.
