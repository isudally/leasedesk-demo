import type { Express, NextFunction, Request, Response } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import createMemoryStore from "memorystore";
import { getRuntimeConfig, type RuntimeConfig } from "./config";
import { getPool } from "./db";
import { hashPassword, isPasswordHash, verifyPassword } from "./passwords";
import type { IStorage } from "./storage";

declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

export function createSessionStore(config: RuntimeConfig) {
  if (config.isProductionMode) {
    const PgSession = connectPgSimple(session);
    return new PgSession({
      pool: getPool(),
      tableName: "leasedesk_sessions",
      createTableIfMissing: true,
    });
  }

  const MemoryStore = createMemoryStore(session);
  return new MemoryStore({ checkPeriod: 86400000 });
}

export function setupAuth(app: Express, storage: IStorage) {
  const config = getRuntimeConfig();

  app.use(
    session({
      name: "leasedesk.sid",
      secret: config.sessionSecret ?? "leasedesk-demo-session-secret",
      resave: false,
      saveUninitialized: false,
      store: createSessionStore(config),
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: config.isProductionMode,
        maxAge: 1000 * 60 * 60 * 8,
      },
    }),
  );

  app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body ?? {};
    if (typeof username !== "string" || typeof password !== "string") {
      return res.status(400).json({ error: "Username and password are required." });
    }

    const user = await storage.getUserByUsername(username);
    const allowed = user ? isPasswordAllowed(password, user.password, config.isProductionMode) : false;

    if (!user || !allowed) {
      return res.status(401).json({ error: "Invalid username or password." });
    }

    req.session.userId = user.id;
    res.json({ user: publicUser(user) });
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((error) => {
      if (error) {
        return res.status(500).json({ error: "Logout failed." });
      }
      res.clearCookie("leasedesk.sid");
      res.status(204).end();
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Authentication required." });
    }

    const user = await storage.getUser(req.session.userId);
    if (!user) {
      req.session.destroy(() => undefined);
      return res.status(401).json({ error: "Authentication required." });
    }

    res.json({ user: publicUser(user) });
  });
}

export async function ensureProductionAdminUser(storage: IStorage) {
  const config = getRuntimeConfig();
  if (!config.isProductionMode || !config.adminUsername) {
    return;
  }

  const existing = await storage.getUserByUsername(config.adminUsername);
  if (existing) {
    return;
  }

  const passwordHash = config.adminPasswordHash ?? hashPassword(config.adminPassword ?? "");
  await storage.createUser({
    username: config.adminUsername,
    password: passwordHash,
  });
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Authentication required." });
  }
  next();
}

function isPasswordAllowed(password: string, storedPassword: string, productionMode: boolean) {
  if (isPasswordHash(storedPassword)) {
    return verifyPassword(password, storedPassword);
  }

  return !productionMode && storedPassword === password;
}

function publicUser(user: { id: string; username: string }) {
  return { id: user.id, username: user.username };
}
