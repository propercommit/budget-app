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

## Design Principles

- **Mobile-first** — built for thumb-friendly interaction, adapted for desktop
- **Every component lives in a card** — consistent visual hierarchy throughout
- **Apple HIG-inspired** — rounded corners, subtle shadows, system-style colors (`#007AFF`, `#34C759`, `#FF3B30`)
- **No page reloads** — all data mutations update local state optimistically after API confirmation
- **React portals for modals** — avoids CSS `transform` conflicts with `position: fixed`

---

## License

This project is licensed under the [Elastic License 2.0](https://www.elastic.co/licensing/elastic-license).

Source code is available for personal use and review. Commercial use, resale,
and hosting as a service are not permitted without explicit written permission.


