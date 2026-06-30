# Budget App

A personal budget tracking application built with a mobile-first, Apple-inspired design. Track your income, plan spending across categories, and stay on top of your finances — month by month.

---

## Features

- **Monthly budget planning** — track income and spending per month with a filterable month picker
- **Income tracking** — log active and passive income sources with date ranges and notes
- **Spending categories** — create custom categories with icons and colors
- **Spending items** — budget vs. actual tracking per item, with individual spending entries (receipts, links, dates)
- **Budget overview** — collapsible card with donut chart, progress bars, and per-category breakdowns
- **Trends** — visualize spending patterns over time with Recharts
- **Sticky budget bar** — always-visible income / budgeted / spent summary while scrolling
- **Secure authentication** — email/password and Google OAuth via Supabase, with protected routes and session middleware

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org/) (App Router) |
| Language | TypeScript 5 |
| UI | React 19, Tailwind CSS 4, Radix UI |
| Database ORM | [Prisma 6](https://www.prisma.io/) |
| Backend / Auth | [Supabase](https://supabase.com/) (PostgreSQL + Auth) |
| Charts | [Recharts](https://recharts.org/) |
| Font | Geist (via `next/font`) |
| Analytics | Vercel Analytics |
| Deployment | [Vercel](https://vercel.com/) |
| Package manager | pnpm 10 |

---

## Project Structure

```
├── app/
│   ├── api/                  # Route handlers (categories, spending, income, entries)
│   ├── auth/                 # Supabase auth callback + email confirmation
│   ├── login/                # Login / signup page
│   └── page.tsx              # Main app shell
├── components/
│   ├── budget-overview/      # Collapsed + expanded budget summary cards
│   ├── category/             # Category ribbon + create/edit popin
│   ├── income/               # Income card + add/edit/detail popins
│   ├── spending/             # Spending cards, carousel, entry list, popins
│   └── trends/               # Trends card with charts
├── lib/
│   ├── api.ts                # Client-side API helpers
│   ├── prisma.ts             # Prisma client singleton
│   ├── supabase-server.ts    # Server-side Supabase client + auth helpers
│   └── types.ts              # Shared TypeScript types
├── prisma/
│   ├── schema.prisma         # Data models
│   └── migrations/           # Migration history
└── middleware.ts             # Auth-based route protection
```

---

## Data Model

```
User
 ├── Category[]       (label, icon, hex color)
 ├── SpendingItem[]   (name, icon, budgeted, spent, month, date range, note)
 │    └── SpendingEntry[]  (name, amount, date, receipt URL, link)
 └── IncomeSource[]   (name, amount, icon, active|passive, month, date range, note)
```

All records cascade-delete on user removal.

---

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (`npm install -g pnpm`)
- A [Supabase](https://supabase.com/) project
- A PostgreSQL database (Supabase provides one)

### 1. Clone and install

```bash
git clone https://github.com/your-username/budget-app.git
cd budget-app
pnpm install
```

### 2. Configure environment variables

Create a `.env.local` file at the root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Database (direct connection for Prisma migrations)
DIRECT_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres
```

> **Note:** Use the **direct connection** string (not the connection pooler) for `DIRECT_URL` so Prisma migrations work correctly.

### 3. Run database migrations

```bash
pnpm prisma migrate deploy
```

### 4. Start the development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Authentication Setup (Supabase)

1. In your Supabase dashboard, go to **Authentication → Providers**
2. Enable **Email** and (optionally) **Google**
3. For Google OAuth, add your OAuth credentials from [Google Cloud Console](https://console.cloud.google.com/)
4. Add the following to your Supabase **Redirect URLs**:
   - `http://localhost:3000/auth/callback` (development)
   - `https://your-domain.com/auth/callback` (production)

---

## Deployment (Vercel)

1. Push the repository to GitHub
2. Import the project in [Vercel](https://vercel.com/)
3. Add the environment variables from your `.env.local`
4. Vercel will automatically run `prisma generate && next build` on each deploy (configured in `package.json`)

---

## Scripts

```bash
pnpm dev          # Start dev server
pnpm build        # Generate Prisma client + build for production
pnpm start        # Start production server
pnpm lint         # Run ESLint
```

---

## Seeding Demo Data

`prisma/inject-demo-data.ts` populates an account with realistic, randomized data so you can demo or test the app with a full dashboard. It is **not** wired into `package.json` — run it manually with `tsx`.

It generates, for the **last 6 months** (ending the current month):

- 8 spending **categories** (Housing, Food & Dining, Transport, Entertainment, Health, Shopping, Subscriptions, Savings)
- ~15 **spending items** per month, each with 1–7 **spending entries** at randomized amounts and dates
- 1–3 **income sources** per month (salary, occasional freelance, occasional dividends)
- a **CHF** settings row (`DD/MM/YYYY`, light mode)

Amounts, entry counts, and dates are randomized on every run, so each account looks organic.

### Prerequisites

The script reads from `.env` (auto-loaded from the repo root) and needs:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE` | Service-role key (also accepts `SUPABASE_SERVICE_ROLE_KEY`) — used to create/look up the auth user |
| `DATABASE_URL` | Prisma connection (pooled) |

### Inject data

```bash
# Prompts for the email if omitted; prompts before touching a user that already has data
pnpm dlx tsx prisma/inject-demo-data.ts user@example.com

# Skip all confirmations (non-interactive / CI)
pnpm dlx tsx prisma/inject-demo-data.ts user@example.com --yes

# Set the password for a freshly created auth user (otherwise a random one is generated and printed)
pnpm dlx tsx prisma/inject-demo-data.ts user@example.com --password 'Secret123'
```

Behaviour:

- **Identifies the user by email.** If no Supabase auth user exists for that email, one is **created** (email pre-confirmed).
- **Appends — never wipes.** Existing data is left untouched. Categories are reused by label if they already exist, and spending-item names get a `#2`, `#3`… suffix when they would collide with an existing item in the same month.
- **Double confirmation when data already exists.** The script lists the current row counts, then asks you to confirm (`yes`) and to retype the email before writing. Use `--yes` to bypass.

### Roll back a run

Every injection writes a manifest to `prisma/.demo-injections/` listing exactly the rows it created. To undo a run, pass that manifest:

```bash
pnpm dlx tsx prisma/inject-demo-data.ts --rollback prisma/.demo-injections/inject-user-example-com-<timestamp>.json
```

Rollback deletes **only** the records from that manifest (in FK-safe order), and removes the settings row, the `User` row, and the Supabase auth user **only if that same run created them**. Pre-existing data is never deleted. The `prisma/.demo-injections/` directory is git-ignored.

> The script is destructive against your live Supabase project (it writes real rows and can create/delete auth users). Run it against a development or staging project, not production.

---

## Design Principles

- **Mobile-first** — built for thumb-friendly interaction, adapted for desktop
- **Every component lives in a card** — consistent visual hierarchy throughout
- **Apple HIG-inspired** — rounded corners, subtle shadows, system-style colors (`#007AFF`, `#34C759`, `#FF3B30`)
- **No page reloads** — all data mutations update local state optimistically after API confirmation
- **React portals for modals** — avoids CSS `transform` conflicts with `position: fixed`




