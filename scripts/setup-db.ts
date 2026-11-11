/**
 * Creates the tables and fills them with demo data.
 *   npm run db:setup            -> migrate, seed only if empty
 *   npm run db:setup -- --reset -> wipe everything and seed again
 * Both then give car plans without add-ons their default set (safe to repeat on live data).
 */
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import { migrate as migrateNeon } from "drizzle-orm/neon-http/migrator";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { DEMO_PASSWORD } from "@/constants/config";
import type { Localized } from "@/constants/i18n";
import { NATIONALITIES, OCCUPATIONS } from "@/constants/kyc";
import {
  DEPARTMENTS,
  PRODUCT_COVERS,
  PRODUCTS,
  departmentOf,
  type DepartmentKey,
  type Product,
} from "@/constants/products";
import { OPPORTUNITY_SOURCES, type LeadStage, type OpportunityStatus, type SourceOfFunds } from "@/constants/statuses";
import { screenCustomer } from "@/lib/kyc";
import { leadReference, quoteReference } from "@/lib/reference";
import { ALL_PERMISSIONS, type Permission } from "@/lib/rbac";
import { db, schema } from "@/server/db";
import { ensureCarAddOns } from "@/server/website/catalogue";

const ROLE_SEED: { name: string; description: string; isSystem?: boolean; permissions: Permission[] }[] = [
  {
    name: "Admin",
    description: "Full access, including users, roles and document settings",
    isSystem: true,
    permissions: ALL_PERMISSIONS,
  },
  {
    name: "Department Manager",
    description: "Runs one department: sees all its opportunities and leads, approves quotes, issues policies",
    permissions: [
      "dashboard:view",
      "opportunities:view_department",
      "opportunities:create",
      "opportunities:edit",
      "opportunities:assign",
      "opportunities:convert",
      "leads:view_department",
      "leads:edit",
      "leads:assign",
      "quotes:create",
      "quotes:approve",
      "documents:upload",
      "documents:download",
      "policies:view",
      "policies:issue",
      "policies:cancel",
      "policies:renew",
      "payments:record",
      "audit:view",
    ],
  },
  {
    name: "Coordinator",
    description: "Qualifies new opportunities in their department and hands them to advisors as leads",
    permissions: [
      "dashboard:view",
      "opportunities:view_department",
      "opportunities:create",
      "opportunities:edit",
      "opportunities:assign",
      "opportunities:convert",
      "leads:view_department",
      "leads:assign",
      "documents:upload",
      "documents:download",
    ],
  },
  {
    name: "Advisor",
    description: "Works only the leads assigned to them: quotes, KYC, documents, policy and renewal",
    permissions: [
      "dashboard:view",
      "leads:view_own",
      "leads:edit",
      "quotes:create",
      "quotes:approve",
      "kyc:submit",
      "documents:upload",
      "documents:download",
      "policies:view",
      "policies:issue",
      "policies:renew",
    ],
  },
  {
    name: "Compliance Officer",
    description: "Reviews KYC / AML screening results and approves or rejects customers",
    permissions: [
      "dashboard:view",
      "leads:view_all",
      "kyc:review",
      "documents:download",
      "policies:view",
      "audit:view",
    ],
  },
  {
    name: "Finance",
    description: "Records payments; a booked policy becomes active once it is paid",
    permissions: ["dashboard:view", "leads:view_all", "policies:view", "payments:record"],
  },
  {
    name: "Viewer",
    description: "Read-only access for reporting",
    permissions: ["dashboard:view", "opportunities:view_all", "leads:view_all", "policies:view"],
  },
];

// Motor users have made-up phones because the website shows them on its coordinator card
const USER_SEED: { name: string; email: string; role: string; department?: DepartmentKey; phone?: string }[] = [
  { name: "Sara Admin", email: "admin@policydesk.dev", role: "Admin" },
  {
    name: "Omar Siddiqui",
    email: "manager@policydesk.dev",
    role: "Department Manager",
    department: "motor_marine",
    phone: "+923001110004",
  },
  {
    name: "Hina Coordinator",
    email: "coordinator@policydesk.dev",
    role: "Coordinator",
    department: "motor_marine",
    phone: "+923001110001",
  },
  {
    name: "Saad Coordinator",
    email: "saad@policydesk.dev",
    role: "Coordinator",
    department: "motor_marine",
    phone: "+923001110005",
  },
  {
    name: "Aisha Khan",
    email: "advisor@policydesk.dev",
    role: "Advisor",
    department: "motor_marine",
    phone: "+923001110002",
  },
  {
    name: "Bilal Ahmed",
    email: "bilal@policydesk.dev",
    role: "Advisor",
    department: "motor_marine",
    phone: "+923001110003",
  },
  { name: "Sana Malik", email: "sana@policydesk.dev", role: "Department Manager", department: "health" },
  { name: "Kamran Ali", email: "kamran@policydesk.dev", role: "Coordinator", department: "health" },
  { name: "Zain Raza", email: "zain@policydesk.dev", role: "Advisor", department: "health" },
  { name: "Rehan Shah", email: "rehan@policydesk.dev", role: "Coordinator", department: "life_savings" },
  { name: "Noor Fatima", email: "noor@policydesk.dev", role: "Advisor", department: "life_savings" },
  { name: "Mehwish Iqbal", email: "mehwish@policydesk.dev", role: "Coordinator", department: "home_travel" },
  { name: "Tariq Hussain", email: "tariq@policydesk.dev", role: "Advisor", department: "home_travel" },
  { name: "Ayesha Nadeem", email: "ayesha@policydesk.dev", role: "Coordinator", department: "business" },
  { name: "Yasir Qureshi", email: "yasir@policydesk.dev", role: "Advisor", department: "business" },
  { name: "Fatima Compliance", email: "compliance@policydesk.dev", role: "Compliance Officer" },
  { name: "Hamza Finance", email: "finance@policydesk.dev", role: "Finance" },
  { name: "Victor Viewer", email: "viewer@policydesk.dev", role: "Viewer" },
];

const FIRST = [
  "Ahmed",
  "Fatima",
  "John",
  "Maria",
  "Ali",
  "Priya",
  "David",
  "Layla",
  "Hassan",
  "Emma",
  "Yusuf",
  "Chen",
  "Noor",
  "Lucas",
  "Zara",
];
const LAST = [
  "Khan",
  "Smith",
  "Rahman",
  "Garcia",
  "Ali",
  "Patel",
  "Brown",
  "Haddad",
  "Iqbal",
  "Wilson",
  "Lee",
  "Malik",
];
const INSURERS = ["Northwind Assurance", "Bluepeak Insurance", "Harbor Mutual", "Summit General", "Crescent Cover"];
// Rough yearly base premium per product, scaled per cover level and insurer
const BASE_PREMIUM: Record<Product, number> = {
  car: 900,
  bike: 350,
  yacht: 4200,
  health: 1800,
  life: 1200,
  savings: 3000,
  home: 450,
  travel: 120,
  business: 2600,
  cyber: 1900,
  trade_licence: 700,
};
const PLAN_TIERS: Localized[] = [
  { en: "Essential", ar: "الأساسية" },
  { en: "Plus", ar: "بلس" },
  { en: "Elite", ar: "النخبة" },
  { en: "Max", ar: "ماكس" },
  { en: "Pro", ar: "برو" },
];
const BENEFITS = [
  "24/7 claims helpline",
  "Cashless network",
  "Free cancellation in 14 days",
  "Worldwide cover",
  "Personal accident cover",
  "Roadside assistance",
  "Legal expenses",
  "Emergency evacuation",
];
const OPP_STATUSES: OpportunityStatus[] = [
  "new",
  "new",
  "contacted",
  "contacted",
  "qualified",
  "disqualified",
  "converted",
  "converted",
  "converted",
  "converted",
  "converted",
];
const LEAD_STAGES: LeadStage[] = ["needs_analysis", "quoted", "quoted", "kyc", "kyc", "won", "won", "won", "lost"];
const FUNDS: SourceOfFunds[] = ["salary", "salary", "business", "savings", "investments"];

// Deterministic pseudo-random so every reset gives the same demo data
let seedState = 42;
function rand() {
  seedState = (seedState * 1103515245 + 12345) % 2147483648;
  return seedState / 2147483648;
}
const pick = <T>(items: readonly T[]) => items[Math.floor(rand() * items.length)];
const DAY = 86_400_000;
const daysAgo = (days: number) => new Date(Date.now() - days * DAY);
const isoDate = (d: Date) => d.toISOString().slice(0, 10);

async function migrate() {
  if (process.env.DATABASE_URL) {
    await migrateNeon(db as never, { migrationsFolder: "./drizzle" });
  } else {
    await migratePglite(db, { migrationsFolder: "./drizzle" });
  }
}

async function wipe() {
  await db.execute(
    sql`TRUNCATE audit_logs, plan_add_ons, plans, insurers, documents, product_documents, document_types, policies, kyc_records, quotes, leads, opportunities, users, role_permissions, roles, departments RESTART IDENTITY CASCADE`,
  );
}

// [document, required] per product; anything not listed can still be uploaded as "Other"
const DOCUMENT_SEED: { name: Localized; description: Localized }[] = [
  {
    name: { en: "National ID", ar: "الهوية الوطنية" },
    description: {
      en: "Front and back of the customer's national ID card",
      ar: "وجه وظهر بطاقة الهوية الوطنية للعميل",
    },
  },
  {
    name: { en: "Passport", ar: "جواز السفر" },
    description: { en: "Photo page of a valid passport", ar: "صفحة الصورة من جواز سفر ساري" },
  },
  {
    name: { en: "Driving licence", ar: "رخصة القيادة" },
    description: { en: "Valid driving or riding licence", ar: "رخصة قيادة سارية" },
  },
  {
    name: { en: "Vehicle registration", ar: "ملكية المركبة" },
    description: { en: "Registration card of the car or bike", ar: "بطاقة تسجيل السيارة أو الدراجة" },
  },
  {
    name: { en: "Boat registration", ar: "تسجيل القارب" },
    description: { en: "Vessel registration and survey report", ar: "تسجيل السفينة وتقرير المعاينة" },
  },
  {
    name: { en: "Medical declaration", ar: "الإقرار الطبي" },
    description: { en: "Signed health questionnaire", ar: "استبيان صحي موقّع" },
  },
  {
    name: { en: "Proof of income", ar: "إثبات الدخل" },
    description: { en: "Salary certificate or bank statement", ar: "شهادة راتب أو كشف حساب بنكي" },
  },
  {
    name: { en: "Title deed or tenancy contract", ar: "سند الملكية أو عقد الإيجار" },
    description: { en: "Proof of ownership or tenancy of the property", ar: "إثبات ملكية العقار أو استئجاره" },
  },
  {
    name: { en: "Trade licence", ar: "الرخصة التجارية" },
    description: { en: "Valid company trade licence", ar: "رخصة تجارية سارية للشركة" },
  },
  {
    name: { en: "Company financials", ar: "البيانات المالية للشركة" },
    description: { en: "Latest audited financial statements", ar: "أحدث بيانات مالية مدققة" },
  },
  {
    name: { en: "Travel itinerary", ar: "خط سير الرحلة" },
    description: { en: "Flight bookings or itinerary", ar: "حجوزات الطيران أو خط السير" },
  },
  {
    name: { en: "Signed proposal form", ar: "نموذج الطلب الموقّع" },
    description: { en: "Proposal form signed by the customer", ar: "نموذج طلب موقّع من العميل" },
  },
  { name: { en: "Other", ar: "أخرى" }, description: { en: "Any other supporting document", ar: "أي مستند داعم آخر" } },
];

const PRODUCT_DOCUMENT_SEED: Record<Product, [string, boolean][]> = {
  car: [
    ["National ID", true],
    ["Driving licence", true],
    ["Vehicle registration", true],
    ["Signed proposal form", false],
  ],
  bike: [
    ["National ID", true],
    ["Driving licence", true],
    ["Vehicle registration", true],
  ],
  yacht: [
    ["Passport", true],
    ["Boat registration", true],
    ["Signed proposal form", true],
  ],
  health: [
    ["National ID", true],
    ["Passport", false],
    ["Medical declaration", true],
  ],
  life: [
    ["National ID", true],
    ["Medical declaration", true],
    ["Proof of income", true],
    ["Signed proposal form", true],
  ],
  savings: [
    ["National ID", true],
    ["Proof of income", true],
    ["Signed proposal form", true],
  ],
  home: [
    ["National ID", true],
    ["Title deed or tenancy contract", true],
  ],
  travel: [
    ["Passport", true],
    ["Travel itinerary", false],
  ],
  business: [
    ["Trade licence", true],
    ["Company financials", false],
    ["Signed proposal form", true],
  ],
  cyber: [
    ["Trade licence", true],
    ["Signed proposal form", true],
  ],
  trade_licence: [
    ["Trade licence", true],
    ["National ID", true],
  ],
};

async function seed() {
  const docTypeRows = await db.insert(schema.documentTypes).values(DOCUMENT_SEED).returning();
  const docTypeId = new Map(docTypeRows.map((d) => [d.name.en, d.id]));
  await db.insert(schema.productDocuments).values(
    Object.entries(PRODUCT_DOCUMENT_SEED).flatMap(([product, docs]) => [
      ...docs.map(([name, required]) => ({
        product: product as Product,
        documentTypeId: docTypeId.get(name)!,
        required,
      })),
      { product: product as Product, documentTypeId: docTypeId.get("Other")!, required: false },
    ]),
  );

  const insurerRows = await db
    .insert(schema.insurers)
    .values(INSURERS.map((name) => ({ name, contactEmail: `partners@${name.split(" ")[0].toLowerCase()}.example` })))
    .returning();
  const planValues: (typeof schema.plans.$inferInsert)[] = [];
  PRODUCTS.forEach((product, p) => {
    insurerRows.forEach((insurer, n) => {
      // Not every insurer sells every product
      if ((p + n) % 5 >= 3) return;
      PRODUCT_COVERS[product].forEach((cover, c) => {
        const premium = Math.round((BASE_PREMIUM[product] * (1 + c * 0.45) * (0.85 + n * 0.08)) / 5) * 5;
        const brand = insurer.name.split(" ")[0];
        const tier = PLAN_TIERS[c];
        planValues.push({
          insurerId: insurer.id,
          product,
          name: { en: `${brand} ${tier.en}`, ar: `${brand} ${tier.ar}` },
          cover,
          basePremium: premium,
          excess: product === "life" || product === "savings" || product === "travel" ? 0 : Math.round(premium * 0.1),
          benefits: BENEFITS.filter((_, b) => (b + p + n + c) % 3 === 0).slice(0, 2 + c),
        });
      });
    });
  });
  const planRows = await db.insert(schema.plans).values(planValues).returning();
  const insurerName = new Map(insurerRows.map((r) => [r.id, r.name]));

  const deptIds = new Map<DepartmentKey, number>();
  for (const d of DEPARTMENTS) {
    const [row] = await db.insert(schema.departments).values({ key: d.key }).returning();
    deptIds.set(d.key, row.id);
  }

  const roleIds = new Map<string, number>();
  for (const r of ROLE_SEED) {
    const [row] = await db
      .insert(schema.roles)
      .values({ name: r.name, description: r.description, isSystem: r.isSystem ?? false })
      .returning();
    roleIds.set(r.name, row.id);
    await db.insert(schema.rolePermissions).values(r.permissions.map((permission) => ({ roleId: row.id, permission })));
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const userRows = await db
    .insert(schema.users)
    .values(
      USER_SEED.map((u) => ({
        name: u.name,
        email: u.email,
        roleId: roleIds.get(u.role)!,
        departmentId: u.department ? deptIds.get(u.department)! : null,
        phone: u.phone ?? "",
        passwordHash,
      })),
    )
    .returning();
  const byRole = (role: string, dept: DepartmentKey) =>
    userRows.filter((u, i) => USER_SEED[i].role === role && USER_SEED[i].department === dept);
  const compliance = userRows.find((u) => u.email.startsWith("compliance"))!;
  const finance = userRows.find((u) => u.email.startsWith("finance"))!;

  const audit: (typeof schema.auditLogs.$inferInsert)[] = [];

  for (let i = 0; i < 70; i++) {
    // A couple of fixed customers so the compliance and renewal demos always have something to show
    const special = i === 0 ? "watchlist" : i === 1 ? "renewal" : null;
    const product: Product = special === "watchlist" ? "yacht" : special === "renewal" ? "car" : pick(PRODUCTS);
    const deptName = departmentOf(product);
    const deptId = deptIds.get(deptName)!;
    const coordinator = pick(byRole("Coordinator", deptName));
    const advisors = byRole("Advisor", deptName);
    const name =
      special === "watchlist"
        ? "Ivan Fakeman"
        : special === "renewal"
          ? "Ahmed Rahman"
          : `${pick(FIRST)} ${pick(LAST)}`;
    const status: OpportunityStatus = special ? "converted" : pick(OPP_STATUSES);
    const created = special === "renewal" ? daysAgo(350) : daysAgo(5 + Math.floor(rand() * 120));

    const [opp] = await db
      .insert(schema.opportunities)
      .values({
        customerName: name,
        email: `${name.toLowerCase().replace(" ", ".")}${i}@example.com`,
        phone: `+97150${String(1000000 + Math.floor(rand() * 8999999))}`,
        product,
        departmentId: deptId,
        status,
        source: pick(OPPORTUNITY_SOURCES),
        coordinatorId: status === "new" && rand() < 0.3 ? null : coordinator.id,
        createdAt: created,
        updatedAt: created,
      })
      .returning();

    if (status !== "converted") continue;

    const stage: LeadStage = special === "watchlist" ? "kyc" : special === "renewal" ? "won" : pick(LEAD_STAGES);
    const advisor = pick(advisors);
    const convertedAt = new Date(created.getTime() + DAY);
    const [lead] = await db
      .insert(schema.leads)
      .values({
        opportunityId: opp.id,
        reference: leadReference(product),
        departmentId: deptId,
        advisorId: advisor.id,
        stage,
        createdAt: convertedAt,
        updatedAt: convertedAt,
      })
      .returning();
    audit.push({
      userId: coordinator.id,
      action: "convert",
      entity: "opportunity",
      entityId: opp.id,
      leadId: lead.id,
      details: `Assigned to ${advisor.name}`,
      createdAt: convertedAt,
    });

    if (stage === "needs_analysis") {
      await db.insert(schema.kycRecords).values({ leadId: lead.id });
      continue;
    }

    const productPlans = planRows.filter((pl) => pl.product === product);
    const quoteRows = await db
      .insert(schema.quotes)
      .values(
        Array.from({ length: 1 + Math.floor(rand() * 3) }, (_, q) => {
          const plan = productPlans[(i + q * 2) % productPlans.length];
          return {
            leadId: lead.id,
            reference: quoteReference(lead.reference, q + 1),
            planId: plan.id,
            insurer: insurerName.get(plan.insurerId)!,
            premium: special === "watchlist" ? 9800 : plan.basePremium,
            planName: plan.name,
            cover: plan.cover,
            status:
              stage === "won" && q === 0
                ? ("accepted" as const)
                : stage === "lost"
                  ? ("rejected" as const)
                  : ("sent" as const),
            createdBy: advisor.id,
            createdAt: convertedAt,
          };
        }),
      )
      .returning();
    for (const q of quoteRows) {
      audit.push({
        userId: advisor.id,
        action: "create",
        entity: "quote",
        entityId: q.id,
        leadId: lead.id,
        details: `${q.insurer}, ${q.planName.en}`,
        createdAt: convertedAt,
      });
    }

    if (stage === "quoted" || stage === "lost") {
      await db.insert(schema.kycRecords).values({ leadId: lead.id });
      continue;
    }

    // stage kyc or won: KYC has been collected
    const kycData = {
      idNumber: `ID-${100000 + Math.floor(rand() * 899999)}`,
      nationality: special === "watchlist" ? "Sokovia" : pick(NATIONALITIES.slice(0, 7)),
      dateOfBirth: isoDate(daysAgo(365 * (22 + Math.floor(rand() * 40)))),
      idExpiry: isoDate(new Date(Date.now() + (200 + Math.floor(rand() * 1500)) * DAY)),
      occupation: special === "watchlist" ? "Business owner" : pick(OCCUPATIONS.slice(0, 5)),
      sourceOfFunds: special === "watchlist" ? ("cash" as const) : pick(FUNDS),
    };
    const screening = screenCustomer({
      customerName: name,
      ...kycData,
      highestPremium: Math.max(...quoteRows.map((q) => q.premium)),
    });
    const submittedAt = new Date(convertedAt.getTime() + DAY);
    const approved = stage === "won";
    const [kyc] = await db
      .insert(schema.kycRecords)
      .values({
        leadId: lead.id,
        ...kycData,
        ...screening,
        status: approved ? "approved" : "submitted",
        submittedBy: advisor.id,
        submittedAt,
        reviewedBy: approved ? compliance.id : null,
        reviewedAt: approved ? new Date(submittedAt.getTime() + DAY) : null,
        reviewNote: approved ? "Documents verified" : null,
      })
      .returning();
    audit.push({
      userId: advisor.id,
      action: "submit",
      entity: "kyc",
      entityId: kyc.id,
      leadId: lead.id,
      details: `Risk ${screening.riskRating}`,
      createdAt: submittedAt,
    });
    if (!approved) continue;
    audit.push({
      userId: compliance.id,
      action: "approve",
      entity: "kyc",
      entityId: kyc.id,
      leadId: lead.id,
      details: "Documents verified",
      createdAt: new Date(submittedAt.getTime() + DAY),
    });

    const accepted = quoteRows[0];
    // The renewal demo policy expires in two weeks; the rest are spread over the past year
    const start = special === "renewal" ? new Date(Date.now() - 351 * DAY) : daysAgo(Math.floor(rand() * 330));
    const end = new Date(start.getTime() + 365 * DAY);
    const paid = special === "renewal" || rand() < 0.8;
    const [policy] = await db
      .insert(schema.policies)
      .values({
        policyNumber: `PD-${start.getFullYear()}-${String(lead.id).padStart(5, "0")}`,
        leadId: lead.id,
        quoteId: accepted.id,
        premium: accepted.premium,
        startDate: isoDate(start),
        endDate: isoDate(end),
        status: paid ? "active" : "booked",
        paymentStatus: paid ? "paid" : "pending",
        paymentMethod: paid ? pick(["card", "bank_transfer"] as const) : null,
        paymentReference: paid ? `TXN-${200000 + lead.id}` : null,
        paidAt: paid ? start : null,
        createdAt: start,
      })
      .returning();
    audit.push({
      userId: advisor.id,
      action: "book",
      entity: "policy",
      entityId: policy.id,
      leadId: lead.id,
      details: policy.policyNumber,
      createdAt: start,
    });
    if (paid) {
      audit.push({
        userId: finance.id,
        action: "paid",
        entity: "payment",
        entityId: policy.id,
        leadId: lead.id,
        details: `${policy.paymentReference}`,
        createdAt: start,
      });
    }
  }

  await db
    .insert(schema.auditLogs)
    .values([{ userId: null, action: "seed", entity: "system", details: "Demo data created" }, ...audit]);
}

async function main() {
  const reset = process.argv.includes("--reset");
  await migrate();
  if (reset) await wipe();
  const existing = await db.select({ id: schema.roles.id }).from(schema.roles).limit(1);
  if (existing.length === 0) {
    await seed();
    console.log(`Seeded demo data. Demo password for every user: ${DEMO_PASSWORD}`);
  } else {
    console.log("Database already has data. Use --reset to wipe and reseed.");
  }
  // Runs on existing databases too: this is how the live plans get their add-ons
  console.log(`Car add-ons added: ${await ensureCarAddOns()}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
