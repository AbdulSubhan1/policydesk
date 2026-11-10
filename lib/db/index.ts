import { PGlite } from "@electric-sql/pglite";
import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import * as schema from "./schema";

export const PGLITE_DIR = "./.pglite";

type Db = ReturnType<typeof drizzlePglite<typeof schema>>;

// Production uses Neon Postgres; local dev uses an embedded Postgres (PGlite) so no install is needed
function createDb(): Db {
  if (process.env.DATABASE_URL) {
    return drizzleNeon(neon(process.env.DATABASE_URL), { schema }) as unknown as Db;
  }
  const g = globalThis as unknown as { pglite?: PGlite };
  g.pglite ??= new PGlite(PGLITE_DIR);
  return drizzlePglite(g.pglite, { schema });
}

export const db = createDb();
export { schema };
