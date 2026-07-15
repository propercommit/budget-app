/**
 * inject-demo-data.ts
 * ------------------------------------------------------------------
 * Inject realistic, randomized 6-month demo data for a given user
 * (identified by email), or roll back a previous injection.
 *
 * USAGE (run manually — not wired into package.json):
 *
 *   # Inject (prompts for email if omitted, prompts before touching
 *   # a user that already has data):
 *   pnpm dlx tsx prisma/inject-demo-data.ts user@example.com
 *
 *   # Non-interactive (skip confirmations — for CI/scripts):
 *   pnpm dlx tsx prisma/inject-demo-data.ts user@example.com --yes
 *
 *   # Custom password for a freshly-created auth user:
 *   pnpm dlx tsx prisma/inject-demo-data.ts user@example.com --password 'Secret123'
 *
 *   # Roll back exactly what a previous run created:
 *   pnpm dlx tsx prisma/inject-demo-data.ts --rollback prisma/.demo-injections/<manifest>.json
 *
 * Behaviour:
 *   - Creates the Supabase auth user if the email has none.
 *   - APPENDS data (never wipes). If the user already has data it asks
 *     for DOUBLE confirmation first (unless --yes).
 *   - Every run writes a manifest under prisma/.demo-injections/ listing
 *     every row it created, so --rollback removes only those rows (and the
 *     auth user, only if this run created it).
 *
 * Env required (read from process.env, else loaded from .env at repo root):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE  (falls back to SUPABASE_SERVICE_ROLE_KEY)
 *   DATABASE_URL  (used by Prisma)
 * ------------------------------------------------------------------
 */

import { PrismaClient, Prisma } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { createInterface } from "node:readline";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";

// ============================================================
// 0. Minimal .env loader (dependency-free)
// ============================================================
function loadEnv() {
  // Walk up from cwd looking for a .env file; populate only missing keys.
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    const candidate = join(dir, ".env");
    if (existsSync(candidate)) {
      const raw = readFileSync(candidate, "utf8");
      for (const line of raw.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eq = trimmed.indexOf("=");
        if (eq === -1) continue;
        const key = trimmed.slice(0, eq).trim();
        let val = trimmed.slice(eq + 1).trim();
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }
        if (!(key in process.env)) process.env[key] = val;
      }
      return candidate;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

const prisma = new PrismaClient();

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Code in the repo reads SUPABASE_SERVICE_ROLE, but .env ships
  // SUPABASE_SERVICE_ROLE_KEY — accept either so this never silently no-ops.
  const key =
    process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE / SUPABASE_SERVICE_ROLE_KEY in env/.env",
    );
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ============================================================
// 1. Randomization helpers
// ============================================================
const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
const randInt = (lo: number, hi: number) => Math.floor(rand(lo, hi + 1));
const money = (n: number) => Math.round(n * 100); // major units -> integer cents
const roundTo = (n: number, step: number) => Math.round(n / step) * step;
const chance = (p: number) => Math.random() < p;
const pick = <T>(arr: T[]): T => arr[randInt(0, arr.length - 1)];

function sample<T>(arr: T[], n: number, allowRepeat = false): T[] {
  if (allowRepeat) return Array.from({ length: n }, () => pick(arr));
  const pool = [...arr];
  const out: T[] = [];
  while (out.length < n && pool.length) {
    out.push(pool.splice(randInt(0, pool.length - 1), 1)[0]);
  }
  return out;
}

function date(year: number, month: number, day: number) {
  return new Date(year, month - 1, day);
}
function monthStr(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}
function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

// ============================================================
// 2. Data templates (CHF / Swiss flavor)
// ============================================================
type ItemTemplate = {
  name: string;
  icon: string;
  budget: [number, number];
  entryAmount: [number, number];
  entryCount: [number, number];
  vendors: string[];
  allowRepeat?: boolean;
  fixedDay1?: boolean; // recurring single payment near start of month
  note?: string;
};

type CategoryTemplate = {
  label: string;
  icon: string;
  color: string;
  items: ItemTemplate[];
};

const CATEGORY_TEMPLATES: CategoryTemplate[] = [
  {
    label: "Housing",
    icon: "home",
    color: "#007AFF",
    items: [
      {
        name: "Rent",
        icon: "home",
        budget: [1850, 1850],
        entryAmount: [1850, 1850],
        entryCount: [1, 1],
        vendors: ["Monthly rent"],
        fixedDay1: true,
      },
      {
        name: "Utilities",
        icon: "zap",
        budget: [180, 230],
        entryAmount: [35, 95],
        entryCount: [2, 3],
        vendors: [
          "Electricity (EWZ)",
          "Internet (Swisscom)",
          "Water & heating",
          "Gas",
        ],
      },
    ],
  },
  {
    label: "Food & Dining",
    icon: "utensils",
    color: "#FF9500",
    items: [
      {
        name: "Groceries",
        icon: "shopping-cart",
        budget: [550, 650],
        entryAmount: [55, 160],
        entryCount: [4, 6],
        vendors: [
          "Migros weekly shop",
          "Coop fresh produce",
          "Aldi haul",
          "Lidl run",
          "Migros midweek top-up",
          "Coop weekend shop",
          "Denner wine & basics",
        ],
        allowRepeat: true,
      },
      {
        name: "Restaurants & Takeout",
        icon: "utensils",
        budget: [250, 350],
        entryAmount: [22, 95],
        entryCount: [3, 6],
        vendors: [
          "Lunch with colleagues",
          "Sushi takeout",
          "Pizza Friday",
          "Date night dinner",
          "Sunday brunch",
          "Thai takeaway",
          "Kebab",
        ],
        allowRepeat: true,
      },
      {
        name: "Coffee",
        icon: "coffee",
        budget: [70, 95],
        entryAmount: [4.5, 19],
        entryCount: [4, 7],
        vendors: [
          "Starbucks",
          "Local café",
          "Coffee beans (Migros)",
          "Café meeting",
          "Café Zürich",
          "Kiosk coffee",
        ],
        allowRepeat: true,
      },
    ],
  },
  {
    label: "Transport",
    icon: "car",
    color: "#5856D6",
    items: [
      {
        name: "Public Transport",
        icon: "train",
        budget: [100, 120],
        entryAmount: [100, 120],
        entryCount: [1, 1],
        vendors: ["SBB GA monthly"],
        fixedDay1: true,
        note: "GA Travelcard monthly installment",
      },
      {
        name: "Car Expenses",
        icon: "fuel",
        budget: [200, 300],
        entryAmount: [15, 95],
        entryCount: [2, 4],
        vendors: [
          "Shell fuel",
          "Parking Zurich HB",
          "Car wash",
          "BP fuel",
          "Garage service",
        ],
      },
    ],
  },
  {
    label: "Entertainment",
    icon: "gamepad-2",
    color: "#FF2D55",
    items: [
      {
        name: "Going Out",
        icon: "music",
        budget: [150, 280],
        entryAmount: [25, 120],
        entryCount: [2, 4],
        vendors: [
          "Cinema tickets",
          "Drinks with friends",
          "Weekend activity",
          "Concert",
          "Board game night snacks",
          "Ski day pass Flumserberg",
        ],
      },
    ],
  },
  {
    label: "Health",
    icon: "heart-pulse",
    color: "#34C759",
    items: [
      {
        name: "Health Insurance",
        icon: "shield",
        budget: [380, 380],
        entryAmount: [380, 380],
        entryCount: [1, 1],
        vendors: ["CSS monthly premium"],
        fixedDay1: true,
        note: "CSS Grundversicherung",
      },
      {
        name: "Gym & Fitness",
        icon: "dumbbell",
        budget: [79, 140],
        entryAmount: [10, 79],
        entryCount: [1, 3],
        vendors: ["Gym membership", "Protein powder", "Yoga mat", "Climbing day pass"],
      },
    ],
  },
  {
    label: "Shopping",
    icon: "shopping-bag",
    color: "#AF52DE",
    items: [
      {
        name: "Clothing & Personal",
        icon: "shirt",
        budget: [120, 350],
        entryAmount: [35, 180],
        entryCount: [1, 3],
        vendors: [
          "Winter jacket (Zara)",
          "Running shoes (sale)",
          "Toiletries",
          "New hoodie",
          "H&M basics",
          "Gifts",
        ],
      },
    ],
  },
  {
    label: "Subscriptions",
    icon: "credit-card",
    color: "#FF3B30",
    items: [
      {
        name: "Digital Subscriptions",
        icon: "monitor",
        budget: [70, 80],
        entryAmount: [4, 22],
        entryCount: [5, 6],
        vendors: [
          "Spotify Premium",
          "Netflix",
          "iCloud 200GB",
          "ChatGPT Plus",
          "GitHub Pro",
          "Notion",
        ],
        fixedDay1: true,
      },
      {
        name: "Phone Plan",
        icon: "smartphone",
        budget: [39, 45],
        entryAmount: [39, 45],
        entryCount: [1, 1],
        vendors: ["Swisscom mobile"],
        fixedDay1: true,
      },
    ],
  },
  {
    label: "Savings",
    icon: "piggy-bank",
    color: "#30B0C7",
    items: [
      {
        name: "Emergency Fund",
        icon: "piggy-bank",
        budget: [300, 500],
        entryAmount: [300, 500],
        entryCount: [1, 1],
        vendors: ["Transfer to savings"],
        fixedDay1: true,
        note: "Target: 6 months expenses",
      },
      {
        name: "ETF Investing",
        icon: "trending-up",
        budget: [400, 400],
        entryAmount: [100, 300],
        entryCount: [2, 2],
        vendors: ["VWRL (Vanguard All-World)", "CHSPI (Swiss equities)"],
        note: "VWRL + CHSPI monthly DCA",
      },
    ],
  },
];

type IncomeTemplate = {
  name: string;
  icon: string;
  type: "active" | "passive";
  amount: [number, number];
  probability: number; // chance this source appears in a given month
  day: number;
};

const INCOME_TEMPLATES: IncomeTemplate[] = [
  {
    name: "Software Engineer Salary",
    icon: "briefcase",
    type: "active",
    amount: [8400, 8600],
    probability: 1,
    day: 25,
  },
  {
    name: "Freelance Projects",
    icon: "laptop",
    type: "active",
    amount: [600, 1800],
    probability: 0.6,
    day: 15,
  },
  {
    name: "ETF Dividends",
    icon: "trending-up",
    type: "passive",
    amount: [250, 340],
    probability: 0.5,
    day: 10,
  },
];

// ============================================================
// 3. Manifest types
// ============================================================
type Manifest = {
  version: 1;
  createdAtIso: string;
  email: string;
  userId: string;
  authUserCreated: boolean; // this run created the Supabase auth user
  userRowCreated: boolean; // this run created the Prisma User row
  settingsId: string | null; // non-null only if this run created settings
  categoryIds: string[]; // only categories this run created (not reused)
  budgetSeriesIds?: string[]; // only series this run created (absent in pre-series manifests)
  spendingItemIds: string[];
  spendingEntryIds: string[];
  incomeSourceIds: string[];
};

// ============================================================
// 4. CLI parsing
// ============================================================
function parseArgs(argv: string[]) {
  const out: {
    email?: string;
    rollback?: string;
    yes: boolean;
    password?: string;
  } = { yes: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--rollback") out.rollback = argv[++i];
    else if (a === "--yes" || a === "-y") out.yes = true;
    else if (a === "--password") out.password = argv[++i];
    else if (a === "--email") out.email = argv[++i];
    else if (!a.startsWith("-") && !out.email) out.email = a;
  }
  return out;
}

function ask(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((res) =>
    rl.question(question, (answer) => {
      rl.close();
      res(answer.trim());
    }),
  );
}

// ============================================================
// 5. INJECT
// ============================================================
async function inject(opts: ReturnType<typeof parseArgs>) {
  let email = opts.email;
  if (!email) {
    email = await ask("Enter the user's email: ");
  }
  email = (email || "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    throw new Error("A valid email is required.");
  }

  console.log(`\n🌱 Injecting 6-month demo data for: ${email}\n`);

  const supabase = getSupabaseAdmin();

  // --- 5.1 Find or create the Supabase auth user ---
  let userId: string;
  let authUserCreated = false;
  const { data: list, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) throw new Error(`listUsers failed: ${listErr.message}`);
  const existing = list?.users?.find(
    (u) => u.email?.toLowerCase() === email,
  );

  if (existing) {
    userId = existing.id;
    console.log(`👤 Found existing auth user: ${userId}`);
  } else {
    const password = opts.password || `Demo-${randomUUID().slice(0, 8)}`;
    const { data: created, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) throw new Error(`Failed to create auth user: ${error.message}`);
    userId = created.user.id;
    authUserCreated = true;
    console.log(`👤 Created new auth user: ${userId}`);
    console.log(`   🔑 Password: ${password}`);
  }

  // --- 5.2 Ensure a Prisma User row exists ---
  const existingUserRow = await prisma.user.findUnique({ where: { id: userId } });
  let userRowCreated = false;
  if (!existingUserRow) {
    await prisma.user.create({
      data: { id: userId, email, name: email.split("@")[0] },
    });
    userRowCreated = true;
  }

  // --- 5.3 Detect existing data → double confirmation ---
  const [catCount, itemCount, incomeCount, entryCount] = await Promise.all([
    prisma.category.count({ where: { userId } }),
    prisma.spendingItem.count({ where: { series: { userId } } }),
    prisma.incomeSource.count({ where: { userId } }),
    prisma.spendingEntry.count({ where: { spendingItem: { series: { userId } } } }),
  ]);
  const hasData = catCount + itemCount + incomeCount + entryCount > 0;

  if (hasData && !opts.yes) {
    console.log(
      `\n⚠️  This user ALREADY has data:` +
        `\n     categories: ${catCount}` +
        `\n     spending items: ${itemCount}` +
        `\n     spending entries: ${entryCount}` +
        `\n     income sources: ${incomeCount}` +
        `\n   New data will be APPENDED (existing rows are left untouched).` +
        `\n   You can undo this run later with --rollback.\n`,
    );
    const a1 = await ask(`Append 6 months of demo data to ${email}? (yes/no): `);
    if (a1.toLowerCase() !== "yes" && a1.toLowerCase() !== "y") {
      console.log("Aborted.");
      return;
    }
    const a2 = await ask(`Are you sure? Type the email to confirm: `);
    if (a2.trim().toLowerCase() !== email) {
      console.log("Email did not match. Aborted.");
      return;
    }
  }

  const manifest: Manifest = {
    version: 1,
    createdAtIso: new Date().toISOString(),
    email,
    userId,
    authUserCreated,
    userRowCreated,
    settingsId: null,
    categoryIds: [],
    budgetSeriesIds: [],
    spendingItemIds: [],
    spendingEntryIds: [],
    incomeSourceIds: [],
  };

  // --- 5.4 Settings (create only if missing) ---
  const existingSettings = await prisma.userSettings.findUnique({
    where: { userId },
  });
  if (!existingSettings) {
    const settingsId = randomUUID();
    await prisma.userSettings.create({
      data: {
        id: settingsId,
        userId,
        currency: "CHF",
        dateFormat: "DD/MM/YYYY",
        darkMode: false,
      },
    });
    manifest.settingsId = settingsId;
    console.log("⚙️  Created settings (CHF).");
  } else {
    console.log("⚙️  Settings already exist — left unchanged.");
  }

  // --- 5.5 Categories (reuse by label, else create) ---
  const existingCats = await prisma.category.findMany({ where: { userId } });
  const catByLabel = new Map(existingCats.map((c) => [c.label, c.id]));
  for (const tmpl of CATEGORY_TEMPLATES) {
    if (catByLabel.has(tmpl.label)) continue;
    const id = randomUUID();
    await prisma.category.create({
      data: {
        id,
        label: tmpl.label,
        icon: tmpl.icon,
        color: tmpl.color,
        userId,
      },
    });
    catByLabel.set(tmpl.label, id);
    manifest.categoryIds.push(id);
  }
  console.log(`📂 Categories ready (${manifest.categoryIds.length} new).`);

  // --- 5.6 Resolve target months: last 6 months ending current month ---
  const now = new Date();
  const months: { year: number; month: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }

  // Guard the (seriesId, month) unique constraint across re-runs: a series
  // name that already has an incarnation in a month gets a suffixed name
  // (which becomes its own new series), mirroring the pre-series behavior.
  const takenItemKeys = new Set(
    (
      await prisma.spendingItem.findMany({
        where: { series: { userId } },
        select: { month: true, series: { select: { name: true } } },
      })
    ).map((r) => `${r.series.name}__${r.month}`),
  );
  const uniqueItemName = (name: string, month: string) => {
    let candidate = name;
    let n = 2;
    while (takenItemKeys.has(`${candidate}__${month}`)) {
      candidate = `${name} #${n++}`;
    }
    takenItemKeys.add(`${candidate}__${month}`);
    return candidate;
  };

  // Reuse the user's existing series by name; create the rest this run.
  const seriesByName = new Map(
    (
      await prisma.budgetSeries.findMany({
        where: { userId },
        select: { id: true, name: true },
      })
    ).map((s) => [s.name, s.id]),
  );
  const seriesRows: Prisma.BudgetSeriesCreateManyInput[] = [];
  const seriesIdFor = (name: string, icon: string, categoryId: string) => {
    const existingId = seriesByName.get(name);
    if (existingId !== undefined) return existingId;

    const id = randomUUID();
    seriesRows.push({ id, name, icon, userId, categoryId });
    seriesByName.set(name, id);
    manifest.budgetSeriesIds?.push(id);

    return id;
  };

  // --- 5.7 Per-month generation ---
  const itemRows: Prisma.SpendingItemCreateManyInput[] = [];
  const entryRows: Prisma.SpendingEntryCreateManyInput[] = [];
  const incomeRows: Prisma.IncomeSourceCreateManyInput[] = [];

  for (const { year, month } of months) {
    const m = monthStr(year, month);
    const maxDay = daysInMonth(year, month);

    // Income
    for (const inc of INCOME_TEMPLATES) {
      if (inc.probability < 1 && !chance(inc.probability)) continue;
      const id = randomUUID();
      incomeRows.push({
        id,
        name: inc.name,
        amount: money(rand(inc.amount[0], inc.amount[1])),
        icon: inc.icon,
        type: inc.type,
        month: m,
        startDate: date(year, month, Math.min(inc.day, maxDay)),
        userId,
      });
      manifest.incomeSourceIds.push(id);
    }

    // Spending items + entries
    for (const cat of CATEGORY_TEMPLATES) {
      const categoryId = catByLabel.get(cat.label)!;
      for (const tmpl of cat.items) {
        const itemId = randomUUID();
        const name = uniqueItemName(tmpl.name, m);

        const nEntries = randInt(tmpl.entryCount[0], tmpl.entryCount[1]);
        const vendors = sample(tmpl.vendors, nEntries, tmpl.allowRepeat);

        let spent = 0;
        for (let i = 0; i < vendors.length; i++) {
          const amount = money(rand(tmpl.entryAmount[0], tmpl.entryAmount[1]));
          spent += amount;
          const day = tmpl.fixedDay1
            ? Math.min(1 + i, maxDay) // recurring charges cluster at month start
            : randInt(1, maxDay);
          const entryId = randomUUID();
          entryRows.push({
            id: entryId,
            name: vendors[i],
            amount,
            date: date(year, month, day),
            spendingItemId: itemId,
          });
          manifest.spendingEntryIds.push(entryId);
        }
        // spent is already an exact integer-cent sum of the entry amounts above.

        const budgeted = money(roundTo(rand(tmpl.budget[0], tmpl.budget[1]), 10));
        itemRows.push({
          id: itemId,
          seriesId: seriesIdFor(name, tmpl.icon, categoryId),
          budgeted,
          spent, // denormalized; kept in sync with the entries we just built
          month: m,
          note: tmpl.note ?? null,
        });
        manifest.spendingItemIds.push(itemId);
      }
    }
  }

  // --- 5.8 Bulk insert (series before items before entries for FK) ---
  await prisma.budgetSeries.createMany({ data: seriesRows });
  await prisma.spendingItem.createMany({ data: itemRows });
  await prisma.spendingEntry.createMany({ data: entryRows });
  await prisma.incomeSource.createMany({ data: incomeRows });

  // --- 5.9 Write manifest ---
  const dir = resolve(process.cwd(), "prisma", ".demo-injections");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const safeEmail = email.replace(/[^a-z0-9]+/gi, "-");
  const manifestPath = join(
    dir,
    `inject-${safeEmail}-${manifest.createdAtIso.replace(/[:.]/g, "-")}.json`,
  );
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  // --- 5.10 Summary ---
  console.log("\n✅ Injection complete!\n");
  console.log("📊 Created this run:");
  console.log(`   Months:          ${months.map(monthStr2).join(", ")}`);
  console.log(`   Categories:      ${manifest.categoryIds.length}`);
  console.log(`   Budget Series:   ${manifest.budgetSeriesIds?.length ?? 0}`);
  console.log(`   Spending Items:  ${manifest.spendingItemIds.length}`);
  console.log(`   Spending Entries:${manifest.spendingEntryIds.length}`);
  console.log(`   Income Sources:  ${manifest.incomeSourceIds.length}`);
  console.log(`\n📝 Manifest: ${manifestPath}`);
  console.log(`   Roll back with:`);
  console.log(`     pnpm dlx tsx prisma/inject-demo-data.ts --rollback "${manifestPath}"\n`);
}

function monthStr2({ year, month }: { year: number; month: number }) {
  return monthStr(year, month);
}

// ============================================================
// 6. ROLLBACK
// ============================================================
async function rollback(manifestPath: string, opts: ReturnType<typeof parseArgs>) {
  if (!existsSync(manifestPath)) {
    throw new Error(`Manifest not found: ${manifestPath}`);
  }
  const manifest: Manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (manifest.version !== 1) {
    throw new Error(`Unsupported manifest version: ${manifest.version}`);
  }

  console.log(`\n↩️  Rolling back injection for ${manifest.email}`);
  console.log(`   from ${manifest.createdAtIso}`);
  console.log(
    `   entries=${manifest.spendingEntryIds.length}` +
      ` items=${manifest.spendingItemIds.length}` +
      ` categories=${manifest.categoryIds.length}` +
      ` income=${manifest.incomeSourceIds.length}` +
      ` settings=${manifest.settingsId ? 1 : 0}` +
      ` userRow=${manifest.userRowCreated ? 1 : 0}` +
      ` authUser=${manifest.authUserCreated ? 1 : 0}\n`,
  );

  if (!opts.yes) {
    const a = await ask("Delete exactly these records? (yes/no): ");
    if (a.toLowerCase() !== "yes" && a.toLowerCase() !== "y") {
      console.log("Aborted.");
      return;
    }
  }

  // Delete in FK-safe order, scoped to the IDs we created. Storage-unaware:
  // entries deleted here may leave inert receipt objects in the `receipts`
  // bucket (this script never writes receipts, so nothing orphans today).
  const delEntries = await prisma.spendingEntry.deleteMany({
    where: { id: { in: manifest.spendingEntryIds } },
  });
  const delItems = await prisma.spendingItem.deleteMany({
    where: { id: { in: manifest.spendingItemIds } },
  });
  // Series this run created (pre-series manifests have none). Cascades to any
  // incarnations still under them, but those were in spendingItemIds above.
  const delSeries = await prisma.budgetSeries.deleteMany({
    where: { id: { in: manifest.budgetSeriesIds ?? [] } },
  });
  const delIncome = await prisma.incomeSource.deleteMany({
    where: { id: { in: manifest.incomeSourceIds } },
  });
  // Deleting categories cascades to any spending items still under them —
  // but we only delete categories THIS run created, and their items were in
  // spendingItemIds (already removed), so this only removes the empty shells.
  const delCats = await prisma.category.deleteMany({
    where: { id: { in: manifest.categoryIds } },
  });
  let delSettings = { count: 0 };
  if (manifest.settingsId) {
    delSettings = await prisma.userSettings.deleteMany({
      where: { id: manifest.settingsId },
    });
  }
  let delUser = { count: 0 };
  if (manifest.userRowCreated) {
    delUser = await prisma.user.deleteMany({ where: { id: manifest.userId } });
  }

  let authDeleted = false;
  if (manifest.authUserCreated) {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.auth.admin.deleteUser(manifest.userId);
    if (error) {
      console.warn(`⚠️  Failed to delete auth user: ${error.message}`);
    } else {
      authDeleted = true;
    }
  }

  console.log("\n✅ Rollback complete.");
  console.log(`   Entries removed:   ${delEntries.count}`);
  console.log(`   Items removed:     ${delItems.count}`);
  console.log(`   Series removed:    ${delSeries.count}`);
  console.log(`   Income removed:    ${delIncome.count}`);
  console.log(`   Categories removed:${delCats.count}`);
  console.log(`   Settings removed:  ${delSettings.count}`);
  console.log(`   User row removed:  ${delUser.count}`);
  console.log(`   Auth user removed: ${authDeleted ? "yes" : "no"}`);
  console.log(
    `\nℹ️  Manifest left in place (${manifestPath}); delete it manually if you wish.\n`,
  );
}

// ============================================================
// 7. Entry point
// ============================================================
async function main() {
  loadEnv();
  const opts = parseArgs(process.argv.slice(2));
  if (opts.rollback) {
    await rollback(opts.rollback, opts);
  } else {
    await inject(opts);
  }
}

main()
  .catch((e) => {
    console.error("\n❌ Failed:", e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
