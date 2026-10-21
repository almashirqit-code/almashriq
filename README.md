# Al Mashriq ERP

Vehicle export ERP for a Japanese used-car dealer — built with **Next.js 15**, **Supabase** (Postgres, Auth, Storage) and deployed on **Vercel**.

English / 日本語 interface · invoices in JPY, USD, EUR, GBP · Admin / Manager / Sales roles.

## Features

| Module | What it does |
|---|---|
| **Dashboard** | Stock counts, stock value at cost, sales this month and receivables per currency, 12-month sales chart (JPY equivalent), stock by make, recent invoices and vehicles |
| **Stock** | Vehicles with full specs (chassis no., grade, mileage, cc, auction grade, …), purchase cost + expenses, asking price in any currency, status (in stock → reserved → sold → shipped), photo gallery with cover image, search/filter, CSV export |
| **Bulk import** | Upload a CSV/XLSX of vehicles **and/or** a ZIP of photos. Rows upsert on Stock no.; photos are matched to vehicles by folder name (`A1023/1.jpg`) or file prefix (`A1023_1.jpg`), by Stock no. or Chassis no. Photos are resized in the browser and uploaded directly to Supabase Storage, so large ZIPs aren't limited by Vercel's request size. English and Japanese column headers are recognised. |
| **Parts** | Spare-parts stock (part no., name, category, fits make/model/model code/years, OEM no., condition, qty, price, cost, photo, status, show on website). Add one at a time, or bulk import a CSV/XLSX or rows pasted from Excel — upserts on Part no. and only updates the columns in the file. Published parts appear on the public `/parts` page with search and category/make/condition filters. Run migration `0016_parts.sql`. |
| **Customers** | Contact details, destination port, invoice history and outstanding balance |
| **Invoices** | Multi-currency with exchange rate to JPY, FOB/CNF/CIF, ports, vehicle lines (price auto-converted) plus freight/inspection/insurance charges, discount, tax, draft → issued → partially paid → paid / cancelled, payment recording, printable A4 invoice in English or Japanese. Vehicle status updates automatically (draft → reserved, issued/paid → sold, cancelled → back in stock), and a vehicle can't be on two live invoices. |
| **Users** | Admin creates users, sets roles, resets passwords, disables accounts |
| **Configuration** | Company details (EN + JA name), logo, bank details, invoice prefix/numbering, default currency, tax rate, terms, exchange rates |

### Roles

| | Admin | Manager | Sales |
|---|:-:|:-:|:-:|
| View stock, customers, invoices | ✓ | ✓ | ✓ |
| See purchase cost / margin | ✓ | ✓ | — |
| Add / edit vehicles, bulk import, photos | ✓ | ✓ | — |
| Delete vehicles | ✓ | — | — |
| Create customers & invoices, record payments | ✓ | ✓ | ✓ |
| Cancel/delete invoices, delete customers & payments | ✓ | ✓ | — |
| Users & configuration | ✓ | — | — |

Permissions are enforced in the database with Row Level Security, not just in the UI.

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor**, paste the contents of [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) and run it. This creates the tables, triggers, RLS policies and the public `vehicle-images` storage bucket.
3. **Authentication → Sign In / Providers → Email**: turn **off** "Allow new users to sign up" (users are created by admins inside the app).
4. Create the first user: **Authentication → Users → Add user** (tick *Auto Confirm User*). **The first user created automatically becomes Admin.**
5. From **Project Settings → API** copy the Project URL, the `anon` public key and the `service_role` key.

### 2. Vercel

1. Import this GitHub repo in Vercel (framework preset: Next.js).
2. Add environment variables (Production + Preview):

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   ```
3. Deploy, then sign in with the admin user and fill in **Configuration**.

### Local development

```bash
cp .env.example .env.local   # fill in the values
npm install
npm run dev                  # http://localhost:3000
```

## Bulk import format

Download the template from **Bulk import → Download CSV template**. Columns (only `stock_no` *or* `chassis_no`, `make` and `model` are required):

```
stock_no, chassis_no, make, model, grade, year, month, mileage, color, engine_cc, fuel,
transmission, drive, steering, doors, seats, body_type, auction_grade, location,
purchase_date, purchase_price, expenses, price, price_currency, status, notes
```

- `purchase_price` and `expenses` are in JPY. `price_currency` is one of JPY/USD/EUR/GBP.
- `status`: `in_stock`, `reserved`, `sold`, `shipped` (Japanese labels also accepted).
- Common alternative headers work too: `VIN`, `Frame No`, `Maker`, `Odometer`, `Cost`, `FOB Price`, `車台番号`, `メーカー`, `年式`, `走行距離`, …

Photos ZIP layout — either:

```
photos.zip
├── A1023/            ← folder named by Stock no. or Chassis no.
│   ├── 01.jpg
│   └── 02.jpg
└── ZVW50-8012345/
    └── front.jpg
```

or flat files prefixed with the id: `A1023_01.jpg`, `A1023-02.jpg`. Photos are ordered by file name; the first becomes the cover. A ZIP can be imported on its own to add photos to vehicles already in stock.

## Project structure

```
src/
  app/
    (app)/            authenticated pages: dashboard, stock, customers, invoices, users, settings
    login/            sign-in
    print/invoices/   printable invoice (A4)
  components/         UI, sidebar, invoice document
  lib/                supabase clients, auth/roles, i18n (en/ja), formatting, vehicle parsing
supabase/migrations/  database schema, RLS, triggers, storage
```
