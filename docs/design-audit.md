# Design audit and direction (Stages A–C)

Scope: public site (`src/app/(site)`), customer portal (`/account`), staff ERP (`src/app/admin`).
Size at audit time: 103 pages (60 ERP), 52 shared components, 44 migrations.

## Findings

| # | Current problem | Why it matters | Proposed solution | Affected | Expected improvement |
|---|---|---|---|---|---|
| 1 | Two unrelated brands: the site is navy/gold (DESIGN.md), the ERP is logo-red/cerulean with gradients. | Staff and customers see two companies; the portal sits between them. | One house palette: harbour navy primary, logo red as the accent (rules, highlights), matching the public site since commit 5aa9f76. | `tailwind.config.ts`, `globals.css`, `ui.tsx`, sidebar, topbar | One recognisable product. |
| 2 | ERP primary buttons are logo red. | In a finance tool, red reads as "destructive"; "Save invoice" and "Delete" looked alike in weight and hue. | `btn-primary` → navy; `btn-danger` keeps red. | Every ERP form | Fewer mis-clicks; clear semantic colour. |
| 3 | Gradient icon chips, gradient stat top-bars, blurred colour blobs, glowing nav dots, pulsing "ERP" dot. | Generic "AI dashboard" look; decoration competes with figures. | Flat tinted chips, plain stat cards, no glows; one 2px red rail marks the active nav item. | `TONES`, `IconChip`, `Stat`, `Section`, sidebar | Numbers become the loudest thing on screen. |
| 4 | All-caps 11px tracked labels on fields, table headers and stats. | Hard to read for second-language readers; shouty in dense tables. | Sentence-case 12px semibold labels. | `.label`, `.table th`, `Stat` | Faster scanning, better legibility. |
| 5 | Large radii (16–24px) on dense data surfaces. | Wastes space in tables/forms and reads as consumer app. | ERP radius scale: 6px chips, 8px controls, 12px cards/dialogs. Site keeps its softer scale. | `.card`, `.btn`, `.input`, `Modal` | Tighter, more "operating system". |
| 6 | Table rows 48px, numbers proportional. | Ledgers need comparable columns. | 40px rows, tabular numerals in all table cells. | `.table` | More rows per screen; columns align. |
| 7 | Empty state is an emoji folder. | Decorative, inconsistent with Lucide icons elsewhere. | Quiet rule + measured message. | `Empty` (25 call sites) | Calm, consistent. |
| 8 | Active nav/pagination not exposed to assistive tech. | Screen readers can't tell where you are. | `aria-current="page"` on sidebar and pagination; dialogs labelled. | sidebar, `NumberedPagination`, `Modal` | Accessibility. |
| 9 | No shared skeleton style; loading states vary per page. | Inconsistent perceived performance. | `.skeleton` utility (respects reduced motion) for `loading.tsx` files. | globals | Ready for Stage F loading states. |
| 10 | Invalid inputs had no shared style. | Validation errors only shown as text. | `.input[aria-invalid=true]` red border. | `.input` | Field-level validation is visible. |

## Direction: "Export House Ledger" across all three surfaces
- **Public site:** premium and photographic; navy bands, white stock cards, logo red as accent (DESIGN.md, palette note).
- **Portal:** same palette, fewer bands, money and status first.
- **ERP:** dense, flat, navy-led; colour only for status and module identity; logo red only for the active-location rail, section marks, progress and danger.

### ERP tokens (added to `tailwind.config.ts`)
- `harbour` `#10243a` (primary), `harbour-hi` `#1c3a5a` (hover), `harbour-deep` `#0b1a2b` (sidebar), `harbour-50/100` (row hover, chips).
- Accent: existing `brand` scale (logo red `#d71920`). Gold was tried in Stage C and dropped to match the site.
- Status colours unchanged (emerald paid/in stock, amber partial/reserved, red cancelled/error).
- Don't use logo red as a primary button fill in the ERP; `btn-primary` is navy, `btn-danger` is red-outlined.

## Stage D — public website (batch 1)
- Make and body-type labels are title-cased for display (`titleCase` moved to `src/lib/format.ts`): "MINI VAN" → "Mini Van", "Bmw" → "BMW". Filter values are unchanged, so URLs still work.
- Correct plurals ("1 car", not "1 cars") via `plural()` in `src/lib/format.ts`.
- Stock list leads with the same live "available" count as the header and hero, then states how many are reserved or sold.
- Car titles stay upper-case (`carTitle`): title-casing would break model names such as RAV4 and CX-5.
- Data issues seen (fix in the ERP, not in code): duplicate body types "MINI VAN" and "MINIVAN", the model spelled "FILEDER" (Fielder), some cars with no fuel type.

## Stage D — public website (batch 2: page sweep)
Checked at 375px phone width (no horizontal scroll, tap targets under 32px, unlabelled fields) and by HTTP fetch (status, one `h1`, images without `alt`):
/blog, /contact, /export, /favourites, /how-to-buy, /machinery, /offers, /parts, /parts/units, /payment, /reviews, /verify-agent, /account/login, /account/signup, /account/forgot, /makes/toyota.
- All return 200, each has exactly one `h1`, no image lacks `alt`, no page scrolls sideways, every form field has a label.
- Fixed: /contact phone and email links were 20px tall on phones; now 44px.
- Accepted: inline text links inside sentences (Terms, Privacy, "Sign in") and part/machinery card titles (24–31px; the card has its own full-size action).
- Not reviewed by eye: the browser pane was covered, so screenshots failed for this batch. Dynamic pages (/blog/[slug], /parts/[id], /machinery/[stock], /export/[country]) were not checked.

## Stage E — customer portal
Reviewed in code: dashboard, cars, reservations, invoices, payments, statement, inquiries, support, profile, layout and nav. The previous commit ("four sections, what's next card, car journey timeline") already covers most of the brief: one "what's next" card, money shown per currency, data only through `portal_*` RPCs, plain-language empty states.
- Fixed: overdue invoices weren't marked. New `isOverdue()` in `src/lib/portal.ts` (due date before today in Japan time, invoice issued or part-paid, balance owing; quotations never count). The invoice list shows a red "Overdue" pill and "was due"; the dashboard card says "Overdue since"; the balance line counts overdue invoices. Display only: no amounts, statuses or rules changed.
- Checked: signed-out visits to /account, /account/invoices and /account/statement redirect to sign-in with `next=`.
- Not tested: every signed-in page. There is no customer test login, so none of it was seen rendered.

## Stage F — ERP (batch 1: visual system)
- Every hand-rolled gradient, colour blob and dot grid is gone from `src/app/admin` (0 left):
  - dashboard: gradient hero → plain page header with `btn-primary` / `btn-secondary`
  - stock detail and inquiry: amber "Reserve" button → amber-outlined; shipping button → solid slate
  - stock list: payment-status side bar → 4px solid status colour; thumbnail and "Ship" button are flat
  - shipping editor: step discs → solid status colours
  - reservation form: profit panel → solid emerald-700 (profit) / red-700 (loss)
  - settings and catalog tabs: navy active tab
  - site importer: navy progress bar
  - staff login: no glows; plain red hairline
- Dashboard data check: every figure comes from a live query, and cost and stock value are only shown where `can.seeCost(role)` allows. The sales chart uses real invoice totals for 12 months. No fake data.

### Dashboard finance fixes (approved)
1. **Months follow Japan time.** `monthStart`, the 12-month window, chart month keys and "today" passed to the finance panel now use the JST calendar date instead of the Worker's UTC clock. Invoices issued 00:00–09:00 JST on the 1st now count in the new month. Checked against 2026-10-31T20:00Z (→ November) and 14:59Z (→ October).
2. **Totals read every row.** Supabase returns at most 1,000 rows per request, so `.limit(20000)` was in fact capped at 1,000: "Outstanding", the 12-month sales chart / "Sales this month" and "Sold this month" stopped counting past 1,000 rows. All three now page with `fetchAll` (ordered by `id`), like stock value already did.
3. The dashboard's monthly expense total (`FinanceMonth`, `company_expenses`) was capped the same way; it now pages too.

### Same 1,000-row cap elsewhere (fixed)
All now page with `fetchAll`, using a stable `id` tiebreak in the sort:
- `remittances/[id]/allocate/page.tsx`: vehicles, sold prices (invoice items) and existing allocations, so "already allocated" amounts count every allocation.
- `reservations/page.tsx`: active-reservation profit total. Its "invoiced this month" count also starts at 00:00 Japan time now.
- Customer pickers in `invoices/data.ts`, `remittances/data.ts` and `reservations/data.ts`, plus the invoice vehicle picker and freight rates.

## Palette change: Paper, Night and Lacquer (whole platform)
Supplied by the owner and applied at the token level, so no page markup changed:
- `tailwind.config.ts`: `slate` → warm ramp (50 Paper … 200 Line, 300 Chrome, 600 Mute, 900 Ink, 950 Night); `brand` and `rose` → Lacquer ramp (600 = #9E1B16); `jet`, `harbour` and the dark end of `navy` → Night. New names: `paper`, `card`, `ink`, `night`, `mute`, `line`, `chrome`, `lacquer`.
- `site.css`: page, surface, ink and accent variables moved to the palette; the background glows are removed (plain Paper); a new rule shows Lacquer text and icons on dark areas as #E58B83.
- `globals.css` (ERP): Paper background, Card cards, inputs and secondary buttons; Night primary buttons.
- Hard-coded colours in site/ERP `.tsx` arbitrary classes were remapped; printed invoices (`invoice-document`, `(print)`) keep the logo red.
- Contrast (WCAG): Ink on Paper 15.7, Mute on Card 5.6, Mute on Paper 5.05, Lacquer on Paper 7.05, Card on Lacquer 7.8, Card on Night 18.3, light lacquer on Night 7.4, Chrome on Night 12.4. Lacquer on Night fails at 2.3, hence the override. `slate-400` (#A39A90, 2.7:1) is for placeholders and icons only, as before.
- Blue (`cerulean`/`sky`) is left for informational statuses (e.g. "Booked", "Partly paid").

## Stage G — logic and consistency (batch 1: row caps)
More queries stopped silently at 1,000 rows. These now page with `fetchAll`:
- **Settings → Catalog "N in stock" per make**: it read the first 1,000 of 1,518 vehicles, so the counts were too low.
- **Stock list agent / customer filters**: an agent or customer with more than 1,000 reservations or invoiced cars lost the rest from the filter.
- **Stock import**: auction-house and yard name → id lookups. Past 1,000 entries, an imported row would come in without its auction house or yard.
- **Auction houses, yards and freight rates** in Settings and the stock form; shipping company / forwarder / courier suggestions on the shipping page.

Left as they are (bounded by design): the 500-row shipment search, remittance search (`limit(1000)` on the matched vehicles), catalog makes, and the model duplicate check (at most 500 models are added at a time; no make has close to 1,000 models).

## Stage G — batch 2: server-action permissions
I scanned every exported function in a `"use server"` file for a role or sign-in check (`assertRole`, `requireRole`, `getProfile`, portal sign-in helpers), then read each one that had none.
- **ERP:** every data-changing action re-checks the role. Two cache-refresh actions (`refreshVehicle`, `refreshRemittance`) had no check. They only revalidate pages, but anyone holding the action id could call them, so both now `assertRole(["admin", "manager", "sales"])`. `convertQuotationAndOpen` relies on `convertQuotation`, which checks.
- **Portal / public:** sign-in, sign-up, password reset, favourites, agent verification and push actions are public by design; they are rate-limited and go through `security definer` RPCs. `portal_mark_read` and `portal_send_message` scope to `auth.uid()`. `delete_push_subscription` deletes by endpoint alone, which is intended (the migration treats the endpoint as the secret, and visitors who aren't signed in must be able to unsubscribe).
- **Not done:** RLS policies and the `security definer` RPCs themselves weren't re-audited line by line in this batch.

## Stage G — batch 3: database permissions (live project)
- **RLS:** enabled on every table in `public` (live check of `pg_class.relrowsecurity`: none without). Three tables have RLS and no policies on purpose (`mail_accounts`, `push_subscriptions`, `rate_limits`); only `security definer` functions and the service key touch them.
- **Functions anyone can call without signing in** (33): the `public_*` read functions plus `submit_inquiry`, `record_favorite`, `log_whatsapp_click`, push subscribe/unsubscribe, `rate_limit_hit` and `showcase_*`. `showcase_vehicles` returns listing columns only (sale price, specs, photos), with no cost, chassis number or customer data.
- **Functions signed-in users can call** (86): portal customers are also `authenticated`, so I checked every one without a visible role or `auth.uid()` check. All are safe: the portal functions filter through `portal_vehicle_ids` / `portal_thread_for_me`; `can_see_customer_row` returns false for anyone who isn't staff; `staff_office` only returns an office name.
- **For you to decide:**
  - Supabase "leaked password protection" is off. Turn it on in the dashboard (Auth → Passwords).
  - `rate_limit_hit` takes the key from the caller, so someone could fill another visitor's rate-limit bucket and briefly block their sign-in or inquiry. Fix: take the key from the server only (it already is from server actions) and revoke `execute` from `anon` / `authenticated`. That needs a migration and a check of every caller, so it isn't in this PR.
