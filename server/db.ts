import pg, { type Pool as PgPool } from "pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

const { Pool } = pg;

let cachedPool: PgPool | undefined;
let cachedDb: NodePgDatabase<typeof schema> | undefined;

export function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set for LeaseDesk production storage.");
  }

  cachedPool ??= new Pool({ connectionString: process.env.DATABASE_URL });
  return cachedPool;
}

export function getDb() {
  cachedDb ??= drizzle(getPool(), { schema });
  return cachedDb;
}

export async function resetDatabaseConnectionForTests() {
  await cachedPool?.end();
  cachedPool = undefined;
  cachedDb = undefined;
}
