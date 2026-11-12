/**
 * Applies pending migrations and adds missing app settings at their defaults. Never seeds or wipes data, so it is safe
 * on the live database. Runs on every production deploy (vercel.json); `npm run db:migrate` runs it by hand.
 */
import { migrate as migrateNeon } from "drizzle-orm/neon-http/migrator";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { defaultSettingRows } from "@/lib/settings";
import { db, schema } from "@/server/db";

async function main() {
  if (process.env.DATABASE_URL) {
    await migrateNeon(db as never, { migrationsFolder: "./drizzle" });
  } else {
    await migratePglite(db, { migrationsFolder: "./drizzle" });
  }
  await db.insert(schema.appSettings).values(defaultSettingRows()).onConflictDoNothing();
  console.log("Migrations applied; app settings present.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
