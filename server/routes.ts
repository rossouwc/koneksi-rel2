import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import connectPgSimple from "connect-pg-simple";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  const [hashed, salt] = stored.split(".");
  const buf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(Buffer.from(hashed, "hex"), buf);
}

declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const PgStore = connectPgSimple(session);

  const isProduction = process.env.NODE_ENV === "production";

  app.use(
    session({
      store: new PgStore({
        conString: process.env.DATABASE_URL,
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET || (isProduction ? (() => { throw new Error("SESSION_SECRET required in production"); })() : "koneksi-dev-secret"),
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: isProduction,
        httpOnly: true,
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000,
      },
    })
  );

  function requireAuth(req: any, res: any, next: any) {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  }

  async function requireAdmin(req: any, res: any, next: any) {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user?.isSuperAdmin && user?.role !== "super_admin") {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  }

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, fullName } = req.body;
      if (!email || !password || !fullName) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const existing = await storage.getUserByEmail(email);
      if (existing) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({ email, password: hashedPassword, fullName });
      req.session.userId = user.id;
      res.json({ ...user, password: undefined });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "Missing email or password" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const valid = await comparePasswords(password, user.password);
      if (!valid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      req.session.userId = user.id;
      res.json({ ...user, password: undefined });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ ok: true });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    res.json({ ...user, password: undefined });
  });

  app.patch("/api/auth/profile", requireAuth, async (req, res) => {
    try {
      const { fullName, phone, suburb } = req.body;
      const updateData: any = {};
      if (fullName) updateData.fullName = fullName;
      if (phone !== undefined) updateData.phone = phone;
      if (suburb !== undefined) updateData.suburb = suburb;
      updateData.profileComplete = true;
      const updated = await storage.updateUserProfile(req.session.userId!, updateData);
      res.json({ ...updated, password: undefined });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  async function verifyEstateMembership(userId: string, estateId: string): Promise<boolean> {
    const link = await storage.getUserEstateLink(userId, estateId);
    return !!link;
  }

  app.get("/api/estates", requireAuth, async (req, res) => {
    try {
      const estates = await storage.getUserEstates(req.session.userId!);
      res.json(estates);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/estates/join", requireAuth, async (req, res) => {
    try {
      const { inviteCode } = req.body;
      const estate = await storage.getEstateByInviteCode(inviteCode);
      if (!estate) {
        return res.status(404).json({ message: "Invalid invite code" });
      }
      const existing = await storage.getUserEstateLink(req.session.userId!, estate.id);
      if (existing) {
        return res.status(400).json({ message: "Already a member" });
      }
      await storage.addUserToEstate({ userId: req.session.userId!, estateId: estate.id, roleInEstate: "resident" });
      res.json(estate);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/bills", requireAuth, async (req, res) => {
    try {
      const estateId = req.query.estateId as string | undefined;
      if (estateId) {
        const isMember = await verifyEstateMembership(req.session.userId!, estateId);
        if (!isMember) return res.status(403).json({ message: "Not a member of this estate" });
      }
      const bills = await storage.getBills(req.session.userId!, estateId);
      res.json(bills);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/bills", requireAuth, async (req, res) => {
    try {
      const { estateId } = req.body;
      if (estateId) {
        const isMember = await verifyEstateMembership(req.session.userId!, estateId);
        if (!isMember) return res.status(403).json({ message: "Not a member of this estate" });
      }
      const bill = await storage.createBill({ ...req.body, userId: req.session.userId! });
      res.json(bill);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/outages", requireAuth, async (req, res) => {
    try {
      const estateId = req.query.estateId as string | undefined;
      if (estateId) {
        const isMember = await verifyEstateMembership(req.session.userId!, estateId);
        if (!isMember) return res.status(403).json({ message: "Not a member of this estate" });
      }
      const userEstates = await storage.getUserEstates(req.session.userId!);
      if (!estateId && userEstates.length > 0) {
        const allOutages = [];
        for (const e of userEstates) {
          const outs = await storage.getOutages(e.id);
          allOutages.push(...outs);
        }
        return res.json(allOutages);
      }
      const outages = await storage.getOutages(estateId);
      res.json(outages);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/outages", requireAuth, async (req, res) => {
    try {
      const { estateId } = req.body;
      if (estateId) {
        const isMember = await verifyEstateMembership(req.session.userId!, estateId);
        if (!isMember) return res.status(403).json({ message: "Not a member of this estate" });
      }
      const outage = await storage.createOutage({ ...req.body, userId: req.session.userId! });
      res.json(outage);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/providers", requireAuth, async (req, res) => {
    try {
      const estateId = req.query.estateId as string | undefined;
      if (estateId) {
        const isMember = await verifyEstateMembership(req.session.userId!, estateId);
        if (!isMember) return res.status(403).json({ message: "Not a member of this estate" });
      }
      const userEstates = await storage.getUserEstates(req.session.userId!);
      if (!estateId && userEstates.length > 0) {
        const allProviders = [];
        for (const e of userEstates) {
          const provs = await storage.getProviders(e.id);
          allProviders.push(...provs);
        }
        return res.json(allProviders);
      }
      const providers = await storage.getProviders(estateId);
      res.json(providers);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/providers", requireAuth, async (req, res) => {
    try {
      const { estateId } = req.body;
      if (estateId) {
        const isMember = await verifyEstateMembership(req.session.userId!, estateId);
        if (!isMember) return res.status(403).json({ message: "Not a member of this estate" });
      }
      const provider = await storage.createProvider(req.body);
      res.json(provider);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/reviews", requireAuth, async (req, res) => {
    try {
      const providerId = req.query.providerId as string | undefined;
      const reviews = await storage.getReviews(providerId);
      res.json(reviews);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/reviews", requireAuth, async (req, res) => {
    try {
      const review = await storage.createReview({ ...req.body, userId: req.session.userId! });
      res.json(review);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/admin/users", requireAdmin, async (_req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users.map((u) => ({ ...u, password: undefined })));
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/admin/estates", requireAdmin, async (_req, res) => {
    try {
      const estates = await storage.getAllEstates();
      res.json(estates);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/admin/estates", requireAdmin, async (req, res) => {
    try {
      const estate = await storage.createEstate(req.body);
      res.json(estate);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  return httpServer;
}
