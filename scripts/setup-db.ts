/**
 * Creates the tables and fills them with demo data.
 *   npm run db:setup           -> migrate, seed only if empty
 *   npm run db:setup -- --reset -> wipe everything and seed again
 */
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import { migrate as migrateNeon } from "drizzle-orm/neon-http/migrator";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { db, schema } from "../lib/db";
import { ALL_PERMISSIONS, type Permission } from "../lib/rbac";
import type { LeadStatus, Product } from "../lib/db/schema";

export const DEMO_PASSWORD = "demo1234";

const ROLE_SEED: { name: string; description: string; isSystem?: boolean; permissions: Permission[] }[] = [
  { name: "Admin", description: "Full access, including users and roles", isSystem: true, permissions: ALL_PERMISSIONS },
  {
    name: "Manager",
    description: "Runs the sales team: sees every lead, assigns work, approves quotes",
    permissions: ALL_PERMISSIONS.filter((p) => !["users:manage", "roles:manage"].includes(p)),
  },
  {
    name: "Agent",
    description: "Works only on the leads assigned to them",
    permissions: ["dashboard:view", "leads:view_own", "leads:create", "leads:edit", "quotes:create", "policies:view"],
  },
  {
    name: "Viewer",
    description: "Read-only access for reporting",
    permissions: ["dashboard:view", "leads:view_all", "policies:view"],
  },
];

const USER_SEED = [
  { name: "Sara Admin", email: "admin@policydesk.dev", role: "Admin" },
  { name: "Omar Manager", email: "manager@policydesk.dev", role: "Manager" },
  { name: "Aisha Agent", email: "agent@policydesk.dev", role: "Agent" },
  { name: "Bilal Agent", email: "agent2@policydesk.dev", role: "Agent" },
  { name: "Victor Viewer", email: "viewer@policydesk.dev", role: "Viewer" },
];

const FIRST = ["Ahmed", "Fatima", "John", "Maria", "Ali", "Priya", "David", "Layla", "Hassan", "Emma", "Yusuf", "Chen", "Noor", "Lucas", "Zara"];
const LAST = ["Khan", "Smith", "Rahman", "Garcia", "Ali", "Patel", "Brown", "Haddad", "Iqbal", "Wilson", "Lee", "Malik"];
const PRODUCTS: Product[] = ["motor", "health", "travel", "home", "life"];
const INSURERS = ["Northwind Assurance", "Bluepeak Insurance", "Harbor Mutual", "Summit General", "Crescent Cover"];
const SOURCES = ["website", "referral", "phone", "partner", "social"];
const STATUSES: LeadStatus[] = ["new", "new", "contacted", "contacted", "quoted", "quoted", "won", "won", "lost"];

// Deterministic pseudo-random so every reset gives the same demo data
let seedState = 42;
function rand() {
  seedState = (seedState * 1103515245 + 12345) % 2147483648;
  return seedState / 2147483648;
}
const pick = <T,>(items: readonly T[]) => items[Math.floor(rand() * items.length)];

function daysAgo(days: number) {
  return new Date(Date.now() - days * 86_400_000);
}
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
    sql`TRUNCATE audit_logs, policies, quotes, leads, users, role_permissions, roles RESTART IDENTITY CASCADE`,
  );
}

async function seed() {
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
    .values(USER_SEED.map((u) => ({ name: u.name, email: u.email, roleId: roleIds.get(u.role)!, passwordHash })))
    .returning();
  const agents = userRows.filter((u) => u.email.startsWith("agent"));
  const manager = userRows.find((u) => u.email.startsWith("manager"))!;

  for (let i = 0; i < 40; i++) {
    const name = `${pick(FIRST)} ${pick(LAST)}`;
    const status = pick(STATUSES);
    const created = daysAgo(Math.floor(rand() * 60));
    const [lead] = await db
      .insert(schema.leads)
      .values({
        customerName: name,
        email: `${name.toLowerCase().replace(" ", ".")}${i}@example.com`,
        phone: `+1 555 ${String(1000 + Math.floor(rand() * 9000))}`,
        product: pick(PRODUCTS),
        status,
        source: pick(SOURCES),
        assignedTo: status === "new" && rand() < 0.4 ? null : pick(agents).id,
        createdAt: created,
        updatedAt: created,
      })
      .returning();

    if (status === "quoted" || status === "won" || status === "lost") {
      const quoteCount = 1 + Math.floor(rand() * 3);
      const quoteRows = await db
        .insert(schema.quotes)
        .values(
          Array.from({ length: quoteCount }, (_, q) => ({
            leadId: lead.id,
            insurer: INSURERS[(i + q) % INSURERS.length],
            premium: 300 + Math.floor(rand() * 4700),
            coverage: pick(["Basic", "Standard", "Comprehensive"]),
            status: status === "won" && q === 0 ? ("accepted" as const) : status === "lost" ? ("rejected" as const) : ("sent" as const),
            createdBy: lead.assignedTo ?? manager.id,
            createdAt: created,
          })),
        )
        .returning();

      if (status === "won") {
        const accepted = quoteRows[0];
        // Spread start dates so some policies come up for renewal soon
        const start = daysAgo(Math.floor(rand() * 360));
        const end = new Date(start.getTime() + 365 * 86_400_000);
        await db.insert(schema.policies).values({
          policyNumber: `PD-${new Date().getFullYear()}-${String(lead.id).padStart(5, "0")}`,
          leadId: lead.id,
          quoteId: accepted.id,
          premium: accepted.premium,
          startDate: isoDate(start),
          endDate: isoDate(end),
          status: "active",
        });
      }
    }
  }

  await db.insert(schema.auditLogs).values({ userId: null, action: "seed", entity: "system", details: "Demo data created" });
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
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
