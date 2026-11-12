/**
 * Tidies the live demo data. Dry run by default: prints what would change and changes nothing.
 *   npm run db:clean-demo              -> dry run
 *   npm run db:clean-demo -- --apply   -> makes the changes
 * Uses DATABASE_URL when it is set, otherwise the local PGlite folder (PGLITE_DIR). Safe to repeat.
 *
 * 1. Deletes test opportunities and everything under them: customer name starting with "Test ", or the
 *    "Sara Demo" opportunity from the UX audit (matched by name and email).
 * 2. Renames the car coordinators seeded before they had real surnames.
 */
import { and, count, eq, getTableName, inArray, like, or, sql, type SQL } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { PGLITE_DIR, db, schema } from "@/server/db";

const { opportunities, leads, quotes, kycRecords, policies, documents, orders, paymentLinks, auditLogs, users } =
  schema;

const TEST_PREFIX = "Test ";
const AUDIT_CUSTOMER = { name: "Sara Demo", email: "sara.uxaudit@yopmail.com" };
const RENAMES = [
  { from: "Hina Coordinator", to: "Hina Malik" },
  { from: "Saad Coordinator", to: "Saad Raza" },
];

const apply = process.argv.includes("--apply");

async function countWhere(table: PgTable, where: SQL | undefined) {
  const [{ n }] = await db.select({ n: count() }).from(table).where(where);
  return n;
}

async function main() {
  const target = process.env.DATABASE_URL ? `Postgres at ${new URL(process.env.DATABASE_URL).host}` : PGLITE_DIR;
  console.log(`${apply ? "APPLY" : "DRY RUN"} on ${target}\n`);

  const opps = await db
    .select({
      id: opportunities.id,
      customerName: opportunities.customerName,
      email: opportunities.email,
      product: opportunities.product,
    })
    .from(opportunities)
    .where(
      or(
        like(opportunities.customerName, `${TEST_PREFIX}%`),
        and(
          eq(opportunities.customerName, AUDIT_CUSTOMER.name),
          eq(sql`lower(${opportunities.email})`, AUDIT_CUSTOMER.email),
        ),
      ),
    )
    .orderBy(opportunities.id);
  const oppIds = opps.map((o) => o.id);
  const leadRows = oppIds.length
    ? await db
        .select({ id: leads.id, opportunityId: leads.opportunityId, reference: leads.reference })
        .from(leads)
        .where(inArray(leads.opportunityId, oppIds))
    : [];
  const leadIds = leadRows.map((l) => l.id);

  // Children before parents: policies and orders point at quotes without a cascade
  const byLead = [orders, paymentLinks, policies, documents, kycRecords, quotes] as const;
  const auditWhere = or(
    leadIds.length ? inArray(auditLogs.leadId, leadIds) : undefined,
    leadIds.length ? and(eq(auditLogs.entity, "lead"), inArray(auditLogs.entityId, leadIds)) : undefined,
    oppIds.length ? and(eq(auditLogs.entity, "opportunity"), inArray(auditLogs.entityId, oppIds)) : undefined,
  );

  console.log(`Test opportunities to delete: ${opps.length}`);
  for (const o of opps) {
    const refs = leadRows.filter((l) => l.opportunityId === o.id).map((l) => l.reference);
    console.log(`  #${o.id} ${o.customerName} <${o.email}> ${o.product}, leads: ${refs.join(", ") || "none"}`);
  }
  if (opps.length) {
    const counts = await Promise.all(byLead.map((table) => countWhere(table, inArray(table.leadId, leadIds))));
    const audits = await countWhere(auditLogs, auditWhere);
    console.log(`  with ${leadIds.length} leads, ${audits} audit entries and:`);
    byLead.forEach((table, i) => console.log(`    ${counts[i]} ${getTableName(table)}`));
  }

  const toRename = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(
      inArray(
        users.name,
        RENAMES.map((r) => r.from),
      ),
    );
  console.log(`\nUsers to rename: ${toRename.length}`);
  for (const u of toRename) {
    console.log(`  #${u.id} ${u.name} -> ${RENAMES.find((r) => r.from === u.name)?.to} (${u.email}, unchanged)`);
  }

  if (!apply) {
    console.log("\nDry run: nothing changed. Run again with --apply to make these changes.");
    process.exit(0);
  }

  // No transaction (the Neon HTTP driver has none). The opportunities go last, so a run that stops halfway
  // still finds them next time and finishes the job.
  if (opps.length) {
    if (leadIds.length) {
      for (const table of byLead) await db.delete(table).where(inArray(table.leadId, leadIds));
    }
    await db.delete(auditLogs).where(auditWhere);
    if (leadIds.length) await db.delete(leads).where(inArray(leads.id, leadIds));
    await db.delete(opportunities).where(inArray(opportunities.id, oppIds));
  }
  for (const { from, to } of RENAMES) await db.update(users).set({ name: to }).where(eq(users.name, from));
  console.log("\nDone.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
