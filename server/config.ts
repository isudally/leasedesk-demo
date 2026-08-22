export type LeaseDeskMode = "demo" | "production";

export interface RuntimeConfig {
  mode: LeaseDeskMode;
  isProductionMode: boolean;
  sessionSecret?: string;
  adminUsername?: string;
  adminPassword?: string;
  adminPasswordHash?: string;
}

const VALID_MODES = new Set(["demo", "production"]);

export function resolveMode(env: NodeJS.ProcessEnv = process.env): LeaseDeskMode {
  const configured = env.LEASEDESK_MODE ?? (env.NODE_ENV === "production" ? "production" : "demo");

  if (!VALID_MODES.has(configured)) {
    throw new Error("LEASEDESK_MODE must be either 'demo' or 'production'.");
  }

  return configured as LeaseDeskMode;
}

export function getRuntimeConfig(env: NodeJS.ProcessEnv = process.env): RuntimeConfig {
  const mode = resolveMode(env);

  return {
    mode,
    isProductionMode: mode === "production",
    sessionSecret: env.SESSION_SECRET,
    adminUsername: env.LEASEDESK_ADMIN_USERNAME,
    adminPassword: env.LEASEDESK_ADMIN_PASSWORD,
    adminPasswordHash: env.LEASEDESK_ADMIN_PASSWORD_HASH,
  };
}

export function validateRuntimeConfig(env: NodeJS.ProcessEnv = process.env) {
  const config = getRuntimeConfig(env);

  if (!config.isProductionMode) {
    return config;
  }

  const missing: string[] = [];
  if (!env.DATABASE_URL) missing.push("DATABASE_URL");
  if (!config.sessionSecret) missing.push("SESSION_SECRET");
  if (!config.adminUsername) missing.push("LEASEDESK_ADMIN_USERNAME");
  if (!config.adminPassword && !config.adminPasswordHash) {
    missing.push("LEASEDESK_ADMIN_PASSWORD or LEASEDESK_ADMIN_PASSWORD_HASH");
  }

  if (missing.length > 0) {
    throw new Error(`Missing required LeaseDesk production configuration: ${missing.join(", ")}.`);
  }

  return config;
}
