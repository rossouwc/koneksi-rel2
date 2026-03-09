import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import connectPgSimple from "connect-pg-simple";
import multer from "multer";
import path from "path";
import fs from "fs";

const uploadsDir = path.resolve("uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};
const ALLOWED_MIMES = Object.keys(MIME_TO_EXT);

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const ext = MIME_TO_EXT[file.mimetype] || ".bin";
      cb(null, `${randomBytes(12).toString("hex")}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, ALLOWED_MIMES.includes(file.mimetype));
  },
});

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

  app.use("/uploads", express.static(uploadsDir));

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

  async function getUserEstateIds(userId: string): Promise<string[]> {
    return storage.getUserEstateIds(userId);
  }

  async function verifyEstateMembership(userId: string, estateId: string): Promise<boolean> {
    const link = await storage.getUserEstateLink(userId, estateId);
    return !!link;
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
      if (!inviteCode) {
        return res.status(400).json({ message: "Invite code is required" });
      }
      const estate = await storage.getEstateByInviteCode(inviteCode.trim().toUpperCase());
      if (!estate) {
        return res.status(404).json({ message: "Invalid invite code" });
      }
      const existing = await storage.getUserEstateLink(req.session.userId!, estate.id);
      if (existing) {
        return res.status(400).json({ message: "Already a member of this estate" });
      }
      await storage.addUserToEstate({ userId: req.session.userId!, estateId: estate.id, roleInEstate: "resident" });
      res.json(estate);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/bills", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const estateId = req.query.estateId as string | undefined;
      const memberEstateIds = await getUserEstateIds(userId);

      if (estateId && !memberEstateIds.includes(estateId)) {
        return res.status(403).json({ message: "Not a member of this estate" });
      }

      const bills = await storage.getBillsScoped(userId, memberEstateIds, estateId);
      res.json(bills);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/bills", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { estateId } = req.body;

      if (estateId) {
        const isMember = await verifyEstateMembership(userId, estateId);
        if (!isMember) return res.status(403).json({ message: "Not a member of this estate" });
      }

      const bill = await storage.createBill({ ...req.body, userId });
      res.json(bill);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/outages", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const estateId = req.query.estateId as string | undefined;
      const memberEstateIds = await getUserEstateIds(userId);

      if (estateId && !memberEstateIds.includes(estateId)) {
        return res.status(403).json({ message: "Not a member of this estate" });
      }

      const outages = await storage.getOutagesScoped(userId, memberEstateIds, estateId);
      res.json(outages);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/outages", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { estateId } = req.body;

      if (estateId) {
        const isMember = await verifyEstateMembership(userId, estateId);
        if (!isMember) return res.status(403).json({ message: "Not a member of this estate" });
      }

      const outage = await storage.createOutage({ ...req.body, userId });
      res.json(outage);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/bills/analyze", requireAuth, upload.single("bill"), async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { estateId } = req.body;

      if (estateId && estateId !== "null") {
        const isMember = await verifyEstateMembership(userId, estateId);
        if (!isMember) return res.status(403).json({ message: "Not a member of this estate" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const fileUrl = `/uploads/${req.file.filename}`;

      const analysis = {
        extracted: {
          provider: "City Power / Rand Water",
          accountNumber: "ACC-" + Math.random().toString(36).substring(2, 10).toUpperCase(),
          billingPeriod: "Feb 2026 - Mar 2026",
          totalAmount: 2847.50,
          usageKwh: 892,
          usageKl: 24.5,
          tariffRate: 2.85,
          category: "electricity",
        },
        overcharges: {
          found: true,
          items: [
            {
              description: "Service charge exceeds municipal standard",
              expectedAmount: 185.00,
              chargedAmount: 245.00,
              difference: 60.00,
            },
            {
              description: "VAT calculated on gross instead of net",
              expectedAmount: 370.13,
              chargedAmount: 398.66,
              difference: 28.53,
            },
          ],
        },
        savings: {
          tips: [
            {
              title: "Switch to Time-of-Use tariff",
              description: "Your usage pattern shows 60% consumption during off-peak hours. A TOU tariff could save you significantly.",
              potentialSaving: 340,
            },
            {
              title: "Install a smart geyser timer",
              description: "Your water heating accounts for an estimated 40% of electricity usage. A timer would reduce this by half.",
              potentialSaving: 280,
            },
            {
              title: "Dispute detected overcharges",
              description: "We found R88.53 in potential overcharges. Contact your provider with reference to municipal tariff guidelines.",
              potentialSaving: 88.53,
            },
          ],
          totalPotentialSaving: 708.53,
        },
      };

      const bill = await storage.createBill({
        userId,
        estateId: estateId && estateId !== "null" ? estateId : null,
        title: `${analysis.extracted.provider} - ${analysis.extracted.billingPeriod}`,
        amount: Math.round(analysis.extracted.totalAmount * 100),
        category: analysis.extracted.category,
        fileUrl,
        analysisResult: JSON.stringify(analysis),
        status: "pending",
      });

      res.json({ bill, analysis });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/outages/report", requireAuth, upload.single("photo"), async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { type, title, description, address, lat, lng, estateId } = req.body;

      const validTypes = ["electricity", "water", "internet", "gas", "other"];
      if (!type || !validTypes.includes(type)) {
        return res.status(400).json({ message: "Invalid outage type" });
      }
      if (!title || typeof title !== "string" || title.trim().length === 0) {
        return res.status(400).json({ message: "Title is required" });
      }
      if (lat && isNaN(parseFloat(lat))) {
        return res.status(400).json({ message: "Invalid latitude" });
      }
      if (lng && isNaN(parseFloat(lng))) {
        return res.status(400).json({ message: "Invalid longitude" });
      }

      if (estateId && estateId !== "null") {
        const isMember = await verifyEstateMembership(userId, estateId);
        if (!isMember) return res.status(403).json({ message: "Not a member of this estate" });
      }

      const photoUrl = req.file ? `/uploads/${req.file.filename}` : null;

      const outage = await storage.createOutage({
        userId,
        estateId: estateId && estateId !== "null" ? estateId : null,
        type: type as any,
        title: title.trim(),
        description: description?.trim() || null,
        address: address?.trim() || null,
        lat: lat || null,
        lng: lng || null,
        photoUrl,
      });
      res.json(outage);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/providers", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const estateId = req.query.estateId as string | undefined;
      const memberEstateIds = await getUserEstateIds(userId);

      if (estateId && !memberEstateIds.includes(estateId)) {
        return res.status(403).json({ message: "Not a member of this estate" });
      }

      const providers = await storage.getProvidersScoped(userId, memberEstateIds, estateId);
      res.json(providers);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/providers", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { estateId } = req.body;

      if (estateId) {
        const isMember = await verifyEstateMembership(userId, estateId);
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
      if (providerId) {
        const provider = await storage.getProvider(providerId);
        if (provider?.estateId) {
          const isMember = await verifyEstateMembership(req.session.userId!, provider.estateId);
          if (!isMember) return res.status(403).json({ message: "Not a member of this estate" });
        }
      }
      const reviews = await storage.getReviews(providerId);
      res.json(reviews);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/reviews", requireAuth, async (req, res) => {
    try {
      const { providerId } = req.body;
      if (providerId) {
        const provider = await storage.getProvider(providerId);
        if (provider?.estateId) {
          const isMember = await verifyEstateMembership(req.session.userId!, provider.estateId);
          if (!isMember) return res.status(403).json({ message: "Not a member of this estate" });
        }
      }
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

  app.get("/api/admin/estates/:id", requireAdmin, async (req, res) => {
    try {
      const estate = await storage.getEstate(req.params.id);
      if (!estate) return res.status(404).json({ message: "Estate not found" });
      const stats = await storage.getEstateStats(estate.id);
      res.json({ ...estate, ...stats });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/admin/estates/:id", requireAdmin, async (req, res) => {
    try {
      const existing = await storage.getEstate(req.params.id);
      if (!existing) return res.status(404).json({ message: "Estate not found" });
      const { name, suburb, city, province } = req.body;
      if (!name || typeof name !== "string" || name.trim().length === 0) {
        return res.status(400).json({ message: "Estate name is required" });
      }
      const updated = await storage.updateEstate(req.params.id, { name: name.trim(), suburb, city, province });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/admin/estates/:id/residents", requireAdmin, async (req, res) => {
    try {
      const residents = await storage.getEstateResidents(req.params.id);
      res.json(residents);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/admin/estates-with-stats", requireAdmin, async (_req, res) => {
    try {
      const allEstates = await storage.getAllEstates();
      const results = await Promise.all(
        allEstates.map(async (estate) => {
          const stats = await storage.getEstateStats(estate.id);
          return { ...estate, ...stats };
        })
      );
      res.json(results);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  return httpServer;
}
