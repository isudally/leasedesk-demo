import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle, type NeonDatabase } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

let cachedPool: Pool | undefined;
let cachedDb: NeonDatabase<typeof schema> | undefined;

export function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set for LeaseDesk production storage.");
  }

  cachedPool ??= new Pool({ connectionString: process.env.DATABASE_URL });
  return cachedPool;
}

export function getDb() {
  cachedDb ??= drizzle({ client: getPool(), schema });
  return cachedDb;
}
