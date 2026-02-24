import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

const prisma = new PrismaClient();

// ============================================
// CONFIG
// ============================================
const DEMO_EMAIL = "demo@budgetapp.ch";
const DEMO_PASSWORD = "demo1234";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ============================================
// HELPERS
// ============================================
function date(year: number, month: number, day: number) {
  return new Date(year, month - 1, day);
}

function monthStr(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

// ============================================
// MAIN
// ============================================
async function main() {
  console.log("🌱 Seeding demo account...\n");

  const supabase = getSupabaseAdmin();

  // -------------------------------------------
  // 1. Create or find Supabase Auth user
  // -------------------------------------------
  console.log("1️⃣  Creating Supabase Auth user...");

  // Check if user already exists
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find((u) => u.email === DEMO_EMAIL);

  let userId: string;

  if (existingUser) {
    userId = existingUser.id;
    console.log(`   ↳ User already exists: ${userId}`);
  } else {
    const { data: newUser, error } = await supabase.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
    });
    if (error) throw new Error(`Failed to create auth user: ${error.message}`);
    userId = newUser.user.id;
    console.log(`   ↳ Created new user: ${userId}`);
  }

  // -------------------------------------------
  // 2. Clean existing demo data
  // -------------------------------------------
  console.log("2️⃣  Cleaning existing data...");

  await prisma.spendingEntry.deleteMany({ where: { spendingItem: { userId } } });
  await prisma.spendingItem.deleteMany({ where: { userId } });
  await prisma.category.deleteMany({ where: { userId } });
  await prisma.incomeSource.deleteMany({ where: { userId } });
  await prisma.userSettings.deleteMany({ where: { userId } });
  await prisma.user.deleteMany({ where: { id: userId } });

  console.log("   ↳ Cleaned");

  // -------------------------------------------
  // 3. Create User record
  // -------------------------------------------
  console.log("3️⃣  Creating User record...");

  await prisma.user.create({
    data: {
      id: userId,
      email: DEMO_EMAIL,
      name: "Demo User",
    },
  });

  // -------------------------------------------
  // 4. Create UserSettings (CHF)
  // -------------------------------------------
  console.log("4️⃣  Creating settings (CHF)...");

  await prisma.userSettings.create({
    data: {
      userId,
      currency: "CHF",
      dateFormat: "DD/MM/YYYY",
      darkMode: false,
    },
  });

  // -------------------------------------------
  // 5. Create Categories
  // -------------------------------------------
  console.log("5️⃣  Creating categories...");

  const categoriesData = [
    { label: "Housing",        icon: "home",           color: "#007AFF" },
    { label: "Food & Dining",  icon: "utensils",       color: "#FF9500" },
    { label: "Transport",      icon: "car",            color: "#5856D6" },
    { label: "Entertainment",  icon: "gamepad-2",      color: "#FF2D55" },
    { label: "Health",         icon: "heart-pulse",    color: "#34C759" },
    { label: "Shopping",       icon: "shopping-bag",   color: "#AF52DE" },
    { label: "Subscriptions",  icon: "credit-card",    color: "#FF3B30" },
    { label: "Savings",        icon: "piggy-bank",     color: "#30B0C7" },
  ];

  const categories: Record<string, string> = {};
  for (const cat of categoriesData) {
    const created = await prisma.category.create({
      data: { ...cat, userId },
    });
    categories[cat.label] = created.id;
    console.log(`   ↳ ${cat.label}`);
  }

  // -------------------------------------------
  // 6. Seed 3 months of data
  // -------------------------------------------
  const months = [
    { year: 2025, month: 12 },
    { year: 2026, month: 1 },
    { year: 2026, month: 2 },
  ];

  for (const { year, month } of months) {
    const m = monthStr(year, month);
    console.log(`\n📅 Seeding ${m}...`);

    // -------------------------------------------
    // Income Sources
    // -------------------------------------------
    console.log("   💰 Income...");

    await prisma.incomeSource.createMany({
      data: [
        {
          name: "Software Engineer Salary",
          amount: 8500,
          icon: "briefcase",
          type: "active",
          month: m,
          startDate: date(year, month, 1),
          userId,
        },
        {
          name: "Freelance Projects",
          amount: month === 12 ? 1200 : month === 1 ? 800 : 1500,
          icon: "laptop",
          type: "active",
          month: m,
          startDate: date(year, month, 1),
          userId,
        },
        {
          name: "ETF Dividends",
          amount: month === 2 ? 320 : 280,
          icon: "trending-up",
          type: "passive",
          month: m,
          startDate: date(year, month, 1),
          userId,
        },
      ],
    });

    // -------------------------------------------
    // Spending Items + Entries
    // -------------------------------------------
    console.log("   🛒 Spending items & entries...");

    // --- Housing ---
    const rent = await prisma.spendingItem.create({
      data: {
        name: "Rent", icon: "home", budgeted: 1850, spent: 1850,
        month: m, startDate: date(year, month, 1), userId, categoryId: categories["Housing"],
      },
    });
    await prisma.spendingEntry.create({
      data: { name: "Monthly rent", amount: 1850, date: date(year, month, 1), spendingItemId: rent.id },
    });

    const utilities = await prisma.spendingItem.create({
      data: {
        name: "Utilities", icon: "zap", budgeted: 200, spent: month === 12 ? 220 : month === 1 ? 195 : 180,
        month: m, startDate: date(year, month, 1), userId, categoryId: categories["Housing"],
      },
    });
    await prisma.spendingEntry.createMany({
      data: [
        { name: "Electricity (EWZ)", amount: month === 12 ? 95 : month === 1 ? 85 : 78, date: date(year, month, 5), spendingItemId: utilities.id },
        { name: "Internet (Swisscom)", amount: 65, date: date(year, month, 8), spendingItemId: utilities.id },
        { name: "Water & heating", amount: month === 12 ? 60 : month === 1 ? 45 : 37, date: date(year, month, 12), spendingItemId: utilities.id },
      ],
    });

    // --- Food & Dining ---
    const groceries = await prisma.spendingItem.create({
      data: {
        name: "Groceries", icon: "shopping-cart", budgeted: 600, spent: month === 12 ? 680 : month === 1 ? 545 : 520,
        month: m, startDate: date(year, month, 1), userId, categoryId: categories["Food & Dining"],
      },
    });
    const groceryEntries = [
      { name: "Migros weekly shop", amount: month === 12 ? 145 : 125, date: date(year, month, 3) },
      { name: "Coop fresh produce", amount: 89, date: date(year, month, 7) },
      { name: "Aldi haul", amount: month === 12 ? 112 : 95, date: date(year, month, 14) },
      { name: "Migros midweek top-up", amount: 68, date: date(year, month, 18) },
      { name: "Coop weekend shop", amount: month === 12 ? 156 : month === 1 ? 98 : 78, date: date(year, month, 22) },
      ...(month === 12 ? [{ name: "Holiday groceries", amount: 110, date: date(year, month, 24) }] : []),
    ];
    await prisma.spendingEntry.createMany({
      data: groceryEntries.map((e) => ({ ...e, spendingItemId: groceries.id })),
    });

    const restaurants = await prisma.spendingItem.create({
      data: {
        name: "Restaurants & Takeout", icon: "utensils", budgeted: 300, spent: month === 12 ? 380 : month === 1 ? 260 : 245,
        month: m, startDate: date(year, month, 1), userId, categoryId: categories["Food & Dining"],
      },
    });
    await prisma.spendingEntry.createMany({
      data: [
        { name: "Lunch with colleagues", amount: 32, date: date(year, month, 4), spendingItemId: restaurants.id },
        { name: "Sushi takeout", amount: 45, date: date(year, month, 9), spendingItemId: restaurants.id },
        { name: "Pizza Friday", amount: 28, date: date(year, month, 13), spendingItemId: restaurants.id },
        { name: "Date night dinner", amount: month === 12 ? 125 : 85, date: date(year, month, 17), spendingItemId: restaurants.id },
        { name: "Sunday brunch", amount: month === 12 ? 95 : 55, date: date(year, month, 21), spendingItemId: restaurants.id },
        ...(month === 12 ? [{ name: "Christmas dinner out", amount: 55, date: date(year, month, 25), spendingItemId: restaurants.id }] : []),
      ],
    });

    const coffee = await prisma.spendingItem.create({
      data: {
        name: "Coffee", icon: "coffee", budgeted: 80, spent: month === 12 ? 92 : month === 1 ? 76 : 68,
        month: m, startDate: date(year, month, 1), userId, categoryId: categories["Food & Dining"],
      },
    });
    await prisma.spendingEntry.createMany({
      data: [
        { name: "Starbucks", amount: 6.5, date: date(year, month, 2), spendingItemId: coffee.id },
        { name: "Local café", amount: 5.2, date: date(year, month, 5), spendingItemId: coffee.id },
        { name: "Coffee beans (Migros)", amount: 18, date: date(year, month, 10), spendingItemId: coffee.id },
        { name: "Café meeting", amount: 12, date: date(year, month, 15), spendingItemId: coffee.id },
        { name: "Starbucks", amount: 6.5, date: date(year, month, 19), spendingItemId: coffee.id },
        { name: "Café Zürich", amount: month === 12 ? 24 : 14, date: date(year, month, 23), spendingItemId: coffee.id },
        ...(month === 12 ? [{ name: "Christmas market Glühwein", amount: 19.8, date: date(year, month, 20), spendingItemId: coffee.id }] : []),
      ],
    });

    // --- Transport ---
    const transport = await prisma.spendingItem.create({
      data: {
        name: "Public Transport", icon: "train", budgeted: 120, spent: month === 1 ? 100 : 120,
        month: m, startDate: date(year, month, 1), userId, categoryId: categories["Transport"],
        note: "GA Travelcard monthly installment",
      },
    });
    await prisma.spendingEntry.create({
      data: { name: "SBB GA monthly", amount: month === 1 ? 100 : 120, date: date(year, month, 1), spendingItemId: transport.id },
    });

    const fuel = await prisma.spendingItem.create({
      data: {
        name: "Car Expenses", icon: "fuel", budgeted: 250, spent: month === 12 ? 310 : month === 1 ? 230 : 195,
        month: m, startDate: date(year, month, 1), userId, categoryId: categories["Transport"],
      },
    });
    await prisma.spendingEntry.createMany({
      data: [
        { name: "Shell fuel", amount: month === 12 ? 95 : 78, date: date(year, month, 6), spendingItemId: fuel.id },
        { name: "Parking Zurich HB", amount: 25, date: date(year, month, 11), spendingItemId: fuel.id },
        { name: "Shell fuel", amount: 82, date: date(year, month, 20), spendingItemId: fuel.id },
        ...(month === 12 ? [
          { name: "Winter tires swap", amount: 80, date: date(year, month, 15), spendingItemId: fuel.id },
          { name: "Motorway vignette 2026", amount: 40, date: date(year, month, 28), spendingItemId: fuel.id },
        ] : [
          { name: "Car wash", amount: month === 1 ? 15 : 10, date: date(year, month, 16), spendingItemId: fuel.id },
        ]),
      ],
    });

    // --- Entertainment ---
    const entertainment = await prisma.spendingItem.create({
      data: {
        name: "Going Out", icon: "music", budgeted: 200, spent: month === 12 ? 280 : month === 1 ? 150 : 175,
        month: m, startDate: date(year, month, 1), userId, categoryId: categories["Entertainment"],
      },
    });
    await prisma.spendingEntry.createMany({
      data: [
        { name: "Cinema tickets", amount: 38, date: date(year, month, 8), spendingItemId: entertainment.id },
        { name: "Drinks with friends", amount: month === 12 ? 85 : 52, date: date(year, month, 14), spendingItemId: entertainment.id },
        { name: month === 12 ? "NYE party supplies" : "Weekend activity", amount: month === 12 ? 120 : month === 1 ? 35 : 55, date: date(year, month, month === 12 ? 30 : 22), spendingItemId: entertainment.id },
        ...(month !== 12 ? [{ name: "Board game night snacks", amount: 25, date: date(year, month, 26), spendingItemId: entertainment.id }] : []),
        ...(month === 2 ? [{ name: "Ski day pass Flumserberg", amount: 45, date: date(year, month, 15), spendingItemId: entertainment.id }] : []),
      ],
    });

    // --- Health ---
    const health = await prisma.spendingItem.create({
      data: {
        name: "Health Insurance", icon: "shield", budgeted: 380, spent: 380,
        month: m, startDate: date(year, month, 1), userId, categoryId: categories["Health"],
        note: "CSS Grundversicherung",
      },
    });
    await prisma.spendingEntry.create({
      data: { name: "CSS monthly premium", amount: 380, date: date(year, month, 1), spendingItemId: health.id },
    });

    const gym = await prisma.spendingItem.create({
      data: {
        name: "Gym & Fitness", icon: "dumbbell", budgeted: 100, spent: month === 1 ? 135 : 89,
        month: m, startDate: date(year, month, 1), userId, categoryId: categories["Health"],
      },
    });
    await prisma.spendingEntry.createMany({
      data: [
        { name: "Gym membership", amount: 79, date: date(year, month, 1), spendingItemId: gym.id },
        { name: "Protein powder", amount: month === 1 ? 56 : 0, date: date(year, month, 10), spendingItemId: gym.id },
        ...(month !== 1 ? [{ name: "Yoga mat", amount: 10, date: date(year, month, 15), spendingItemId: gym.id }] : []),
      ].filter((e) => e.amount > 0),
    });

    // --- Shopping ---
    const shopping = await prisma.spendingItem.create({
      data: {
        name: "Clothing & Personal", icon: "shirt", budgeted: 200, spent: month === 12 ? 350 : month === 1 ? 120 : 85,
        month: m, startDate: date(year, month, 1), userId, categoryId: categories["Shopping"],
      },
    });
    await prisma.spendingEntry.createMany({
      data: [
        ...(month === 12
          ? [
              { name: "Winter jacket (Zara)", amount: 180, date: date(year, month, 10), spendingItemId: shopping.id },
              { name: "Christmas gifts", amount: 120, date: date(year, month, 18), spendingItemId: shopping.id },
              { name: "Toiletries", amount: 50, date: date(year, month, 22), spendingItemId: shopping.id },
            ]
          : month === 1
          ? [
              { name: "Running shoes (sale)", amount: 85, date: date(year, month, 8), spendingItemId: shopping.id },
              { name: "Toiletries", amount: 35, date: date(year, month, 20), spendingItemId: shopping.id },
            ]
          : [
              { name: "New hoodie", amount: 45, date: date(year, month, 12), spendingItemId: shopping.id },
              { name: "Toiletries", amount: 40, date: date(year, month, 19), spendingItemId: shopping.id },
            ]),
      ],
    });

    // --- Subscriptions ---
    const subs = await prisma.spendingItem.create({
      data: {
        name: "Digital Subscriptions", icon: "monitor", budgeted: 80, spent: 72,
        month: m, startDate: date(year, month, 1), userId, categoryId: categories["Subscriptions"],
      },
    });
    await prisma.spendingEntry.createMany({
      data: [
        { name: "Spotify Premium", amount: 12.90, date: date(year, month, 1), spendingItemId: subs.id },
        { name: "Netflix", amount: 15.90, date: date(year, month, 1), spendingItemId: subs.id },
        { name: "iCloud 200GB", amount: 4, date: date(year, month, 1), spendingItemId: subs.id },
        { name: "ChatGPT Plus", amount: 22, date: date(year, month, 1), spendingItemId: subs.id },
        { name: "GitHub Pro", amount: 4, date: date(year, month, 1), spendingItemId: subs.id },
        { name: "Notion", amount: 13.20, date: date(year, month, 1), spendingItemId: subs.id },
      ],
    });

    const phone = await prisma.spendingItem.create({
      data: {
        name: "Phone Plan", icon: "smartphone", budgeted: 40, spent: 39,
        month: m, startDate: date(year, month, 1), userId, categoryId: categories["Subscriptions"],
      },
    });
    await prisma.spendingEntry.create({
      data: { name: "Swisscom mobile", amount: 39, date: date(year, month, 3), spendingItemId: phone.id },
    });

    // --- Savings ---
    const savings = await prisma.spendingItem.create({
      data: {
        name: "Emergency Fund", icon: "piggy-bank", budgeted: 500, spent: month === 12 ? 300 : 500,
        month: m, startDate: date(year, month, 1), userId, categoryId: categories["Savings"],
        note: "Target: 6 months expenses",
      },
    });
    await prisma.spendingEntry.create({
      data: { name: "Transfer to savings", amount: month === 12 ? 300 : 500, date: date(year, month, 1), spendingItemId: savings.id },
    });

    const investing = await prisma.spendingItem.create({
      data: {
        name: "ETF Investing", icon: "trending-up", budgeted: 400, spent: 400,
        month: m, startDate: date(year, month, 1), userId, categoryId: categories["Savings"],
        note: "VWRL + CHSPI monthly DCA",
      },
    });
    await prisma.spendingEntry.createMany({
      data: [
        { name: "VWRL (Vanguard All-World)", amount: 300, date: date(year, month, 5), spendingItemId: investing.id },
        { name: "CHSPI (Swiss equities)", amount: 100, date: date(year, month, 5), spendingItemId: investing.id },
      ],
    });
  }

  // -------------------------------------------
  // Summary
  // -------------------------------------------
  const totalCategories = await prisma.category.count({ where: { userId } });
  const totalItems = await prisma.spendingItem.count({ where: { userId } });
  const totalEntries = await prisma.spendingEntry.count({ where: { spendingItem: { userId } } });
  const totalIncome = await prisma.incomeSource.count({ where: { userId } });

  console.log("\n✅ Demo account seeded successfully!\n");
  console.log("📊 Summary:");
  console.log(`   Categories:     ${totalCategories}`);
  console.log(`   Spending Items: ${totalItems}`);
  console.log(`   Entries:        ${totalEntries}`);
  console.log(`   Income Sources: ${totalIncome}`);
  console.log(`\n🔑 Login credentials:`);
  console.log(`   Email:    ${DEMO_EMAIL}`);
  console.log(`   Password: ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });