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
import { analyzeBillImage } from "./openai-bill-analyzer";
import { buildPayFastUrl, validatePayFastITN } from "./payfast";
import { db } from "./db";
import { users, estates, userEstates, bills, outages, providers, reviews, providerVisibleEstates } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

const uploadsDir = path.resolve("uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "application/pdf": ".pdf",
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
  limits: { fileSize: 10 * 1024 * 1024 },
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
    const allIds = await storage.getUserEstateIds(userId);
    const approvedIds: string[] = [];
    for (const id of allIds) {
      const estate = await storage.getEstate(id);
      if (estate && estate.approvalStatus === "approved") {
        approvedIds.push(id);
      }
    }
    return approvedIds;
  }

  async function verifyEstateMembership(userId: string, estateId: string): Promise<boolean> {
    const link = await storage.getUserEstateLink(userId, estateId);
    return !!link && link.approvalStatus === "approved";
  }

  async function requireApprovedEstate(estateId: string): Promise<{ approved: boolean; message?: string }> {
    const estate = await storage.getEstate(estateId);
    if (!estate) return { approved: false, message: "Estate not found" };
    if (estate.approvalStatus !== "approved") {
      return { approved: false, message: "This estate is pending approval and cannot be used yet" };
    }
    return { approved: true };
  }

  app.post("/api/auth/check-email", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ message: "Email required" });
      const existing = await storage.getUserByEmail(email);
      res.json({ exists: !!existing, fullName: existing ? (existing.fullName || "").split(" ")[0] + " ****" : null });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, fullName, registerAs, businessName, businessWebsite, services, phone, contactEmail, estateName, estateStreetName, estateSuburb, estateCity, estateProvince } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      if (!fullName && !(registerAs === "supplier" || registerAs === "estate_admin")) {
        return res.status(400).json({ message: "Full name is required" });
      }

      if (registerAs === "supplier") {
        if (!businessName || !services || services.length === 0) {
          return res.status(400).json({ message: "Business name and at least one service are required for suppliers" });
        }
        if (!phone) {
          return res.status(400).json({ message: "Phone number is required for suppliers" });
        }
      }

      if (registerAs === "estate_admin") {
        if (!estateName) {
          return res.status(400).json({ message: "Estate/Complex name is required" });
        }
      }

      const existing = await storage.getUserByEmail(email);

      if (existing && (registerAs === "supplier" || registerAs === "estate_admin")) {
        const valid = await comparePasswords(password, existing.password);
        if (!valid) {
          return res.status(401).json({ message: "Incorrect password. Please enter the password for your existing account." });
        }

        if (registerAs === "supplier") {
          const [updated] = await db.update(users).set({
            role: "supplier" as const,
            businessName,
            businessWebsite: businessWebsite || null,
            services,
            phone,
            approvalStatus: "pending",
            profileComplete: true,
          }).where(eq(users.id, existing.id)).returning();

          req.session.userId = updated.id;
          return res.json({ ...updated, password: undefined });
        }

        if (registerAs === "estate_admin") {
          const result = await db.transaction(async (tx) => {
            const [updated] = await tx.update(users).set({
              role: "estate_admin" as const,
              profileComplete: true,
            }).where(eq(users.id, existing.id)).returning();

            const inviteCode = (await import("crypto")).randomUUID().slice(0, 8).toUpperCase();
            const [estate] = await tx.insert(estates).values({
              name: estateName,
              streetName: estateStreetName || null,
              suburb: estateSuburb || null,
              city: estateCity || null,
              province: estateProvince || null,
              inviteCode,
            }).returning();

            await tx.insert(userEstates).values({
              userId: updated.id,
              estateId: estate.id,
              roleInEstate: "estate_admin" as const,
              approvalStatus: "approved",
            });

            return updated;
          });

          req.session.userId = result.id;
          return res.json({ ...result, password: undefined });
        }

      } else if (existing) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const hashedPassword = await hashPassword(password);

      if (registerAs === "supplier") {
        const [user] = await db.insert(users).values({
          email,
          password: hashedPassword,
          fullName: businessName,
          phone,
          businessName,
          businessWebsite: businessWebsite || null,
          services,
          role: "supplier" as const,
          approvalStatus: "pending",
          profileComplete: true,
        }).returning();

        req.session.userId = user.id;
        return res.json({ ...user, password: undefined });
      }

      if (registerAs === "estate_admin") {
        const result = await db.transaction(async (tx) => {
          const [user] = await tx.insert(users).values({
            email,
            password: hashedPassword,
            fullName,
            role: "estate_admin" as const,
            profileComplete: true,
          }).returning();

          const inviteCode = (await import("crypto")).randomUUID().slice(0, 8).toUpperCase();
          const [estate] = await tx.insert(estates).values({
            name: estateName,
            streetName: estateStreetName || null,
            suburb: estateSuburb || null,
            city: estateCity || null,
            province: estateProvince || null,
            inviteCode,
          }).returning();

          await tx.insert(userEstates).values({
            userId: user.id,
            estateId: estate.id,
            roleInEstate: "estate_admin" as const,
            approvalStatus: "approved",
          });

          return user;
        });

        req.session.userId = result.id;
        return res.json({ ...result, password: undefined });
      }

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

  app.get("/api/properties", requireAuth, async (req, res) => {
    try {
      const properties = await storage.getUserProperties(req.session.userId!);
      res.json(properties);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/properties", requireAuth, async (req, res) => {
    try {
      const { name, streetAddress, suburb, city, province, postalCode } = req.body;
      if (!name) return res.status(400).json({ message: "Property name is required" });
      const property = await storage.createUserProperty({
        userId: req.session.userId!,
        name,
        streetAddress: streetAddress || null,
        suburb: suburb || null,
        city: city || null,
        province: province || null,
        postalCode: postalCode || null,
      });
      res.json(property);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/properties/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteUserProperty(req.params.id, req.session.userId!);
      res.json({ success: true });
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
      if (estate.approvalStatus !== "approved") {
        return res.status(403).json({ message: "This estate is pending admin approval and cannot accept new members yet" });
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

  app.get("/api/estates/:id/pending-residents", requireAuth, async (req, res) => {
    try {
      const estateId = req.params.id;
      const link = await storage.getUserEstateLink(req.session.userId!, estateId);
      if (!link || link.roleInEstate !== "estate_admin" || link.approvalStatus !== "approved") {
        return res.status(403).json({ message: "Only estate admins can view pending residents" });
      }
      const allLinks = await db.select().from(userEstates).where(eq(userEstates.estateId, estateId));
      const pending = allLinks.filter((l) => l.approvalStatus === "pending");
      const result = [];
      for (const p of pending) {
        const u = await storage.getUser(p.userId);
        if (u) result.push({ userId: u.id, fullName: u.fullName, email: u.email, joinedAt: p.joinedAt });
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/estates/:id/residents", requireAuth, async (req, res) => {
    try {
      const estateId = req.params.id;
      const link = await storage.getUserEstateLink(req.session.userId!, estateId);
      if (!link || link.roleInEstate !== "estate_admin" || link.approvalStatus !== "approved") {
        return res.status(403).json({ message: "Only estate admins can view residents" });
      }
      const residents = await storage.getEstateResidents(estateId);
      const allLinks = await db.select().from(userEstates).where(eq(userEstates.estateId, estateId));
      const result = residents.map((r) => {
        const memberLink = allLinks.find((l) => l.userId === r.user.id);
        return { ...r, approvalStatus: memberLink?.approvalStatus || "approved" };
      });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/estates/:id/residents/:userId/approve", requireAuth, async (req, res) => {
    try {
      const { id: estateId, userId } = req.params;
      const link = await storage.getUserEstateLink(req.session.userId!, estateId);
      if (!link || link.roleInEstate !== "estate_admin" || link.approvalStatus !== "approved") {
        return res.status(403).json({ message: "Only estate admins can approve residents" });
      }
      await db.update(userEstates).set({ approvalStatus: "approved" })
        .where(sql`${userEstates.userId} = ${userId} AND ${userEstates.estateId} = ${estateId}`);
      res.json({ message: "Resident approved" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/estates/:id/residents/:userId/reject", requireAuth, async (req, res) => {
    try {
      const { id: estateId, userId } = req.params;
      const link = await storage.getUserEstateLink(req.session.userId!, estateId);
      if (!link || link.roleInEstate !== "estate_admin" || link.approvalStatus !== "approved") {
        return res.status(403).json({ message: "Only estate admins can reject residents" });
      }
      await db.delete(userEstates)
        .where(sql`${userEstates.userId} = ${userId} AND ${userEstates.estateId} = ${estateId}`);
      res.json({ message: "Resident rejected" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/bills", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const estateId = req.query.estateId as string | undefined;
      const propertyId = req.query.propertyId as string | undefined;
      const memberEstateIds = await getUserEstateIds(userId);

      if (estateId && !memberEstateIds.includes(estateId)) {
        return res.status(403).json({ message: "Not a member of this estate" });
      }

      const bills = await storage.getBillsScoped(userId, memberEstateIds, estateId, propertyId);
      res.json(bills);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/bills", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { estateId, propertyId } = req.body;

      if (estateId) {
        const isMember = await verifyEstateMembership(userId, estateId);
        if (!isMember) return res.status(403).json({ message: "Not a member of this estate" });
        const check = await requireApprovedEstate(estateId);
        if (!check.approved) return res.status(403).json({ message: check.message });
      }

      if (propertyId) {
        const prop = await storage.getUserProperty(propertyId);
        if (!prop || prop.userId !== userId) return res.status(403).json({ message: "Not your property" });
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
      const propertyId = req.query.propertyId as string | undefined;
      const memberEstateIds = await getUserEstateIds(userId);

      if (estateId && !memberEstateIds.includes(estateId)) {
        return res.status(403).json({ message: "Not a member of this estate" });
      }

      const outages = await storage.getOutagesScoped(userId, memberEstateIds, estateId, propertyId);
      res.json(outages);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/outages", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { estateId, propertyId } = req.body;

      if (estateId) {
        const isMember = await verifyEstateMembership(userId, estateId);
        if (!isMember) return res.status(403).json({ message: "Not a member of this estate" });
        const check = await requireApprovedEstate(estateId);
        if (!check.approved) return res.status(403).json({ message: check.message });
      }

      if (propertyId) {
        const prop = await storage.getUserProperty(propertyId);
        if (!prop || prop.userId !== userId) return res.status(403).json({ message: "Not your property" });
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
      const { estateId, propertyId } = req.body;

      if (estateId && estateId !== "null") {
        const isMember = await verifyEstateMembership(userId, estateId);
        if (!isMember) return res.status(403).json({ message: "Not a member of this estate" });
        const check = await requireApprovedEstate(estateId);
        if (!check.approved) return res.status(403).json({ message: check.message });
      }

      const validPropertyId = propertyId && propertyId !== "null" ? propertyId : null;
      if (validPropertyId) {
        const prop = await storage.getUserProperty(validPropertyId);
        if (!prop || prop.userId !== userId) return res.status(403).json({ message: "Not your property" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const fileUrl = `/uploads/${req.file.filename}`;
      const filePath = path.join(uploadsDir, req.file.filename);

      let analysis;
      try {
        analysis = await analyzeBillImage(filePath);
      } catch (aiErr: any) {
        console.error("[Bill Analyzer] AI error:", aiErr.message);
        return res.status(422).json({
          message: "Could not analyze this bill. Please upload a clearer image or PDF of your utility bill.",
        });
      }

      const bill = await storage.createBill({
        userId,
        estateId: estateId && estateId !== "null" ? estateId : null,
        propertyId: validPropertyId,
        title: `${analysis.extracted.provider} - ${analysis.extracted.billingPeriod}`,
        amount: Math.round(analysis.extracted.totalAmount * 100),
        category: analysis.extracted.category,
        fileUrl,
        analysisResult: JSON.stringify(analysis),
        status: "pending",
        provider: analysis.extracted.provider || null,
        billingPeriod: analysis.extracted.billingPeriod || null,
        accountNumber: analysis.extracted.accountNumber || null,
        usageKwh: analysis.extracted.usageKwh != null ? Math.round(analysis.extracted.usageKwh) : null,
        usageKl: analysis.extracted.usageKl != null ? Math.round(analysis.extracted.usageKl * 10) : null,
        tariffRate: analysis.extracted.tariffRate != null ? Math.round(analysis.extracted.tariffRate * 100) : null,
      });

      res.json({ bill, analysis });
    } catch (err: any) {
      console.error("[Bill Analyzer] Error:", err.message);
      res.status(500).json({ message: "Something went wrong analyzing your bill. Please try again." });
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

      let providerList;
      if (estateId) {
        providerList = await storage.getVisibleProviders(estateId);
      } else {
        providerList = await storage.getProvidersScoped(userId, memberEstateIds);
      }

      const tiers = await storage.getSubscriptionTiers();
      const enriched = await Promise.all(
        providerList.map(async (p) => {
          const sub = await storage.getProviderSubscription(p.id);
          const tier = sub ? tiers.find((t) => t.id === sub.tierId) : null;
          return { ...p, _tierName: tier?.name || null, _tierStatus: sub?.status || null };
        })
      );

      res.json(enriched);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/providers/:id", requireAuth, async (req, res) => {
    try {
      const provider = await storage.getProvider(req.params.id);
      if (!provider) return res.status(404).json({ message: "Provider not found" });
      if (provider.estateId) {
        const isMember = await verifyEstateMembership(req.session.userId!, provider.estateId);
        if (!isMember) return res.status(403).json({ message: "Not a member of this estate" });
      }
      const reviews = await storage.getReviews(provider.id);
      const reviewsWithUsers = await Promise.all(
        reviews.map(async (r) => {
          const user = await storage.getUser(r.userId);
          return { ...r, user: user ? { fullName: user.fullName } : null };
        })
      );
      res.json({ provider, reviews: reviewsWithUsers });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/providers", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      const { estateId } = req.body;

      if (estateId) {
        const link = await storage.getUserEstateLink(userId, estateId);
        if (!link || link.approvalStatus !== "approved") {
          return res.status(403).json({ message: "Not a member of this estate" });
        }
        if (link.roleInEstate !== "estate_admin" && user?.role !== "supplier") {
          return res.status(403).json({ message: "Only estate admins can add providers directly. Use the recommend option instead." });
        }
        const check = await requireApprovedEstate(estateId);
        if (!check.approved) return res.status(403).json({ message: check.message });
      }

      const { website, ...rest } = req.body;
      let safeWebsite = website || null;
      if (safeWebsite && !/^https?:\/\//i.test(safeWebsite)) {
        safeWebsite = `https://${safeWebsite}`;
      }
      const provider = await storage.createProvider({ ...rest, website: safeWebsite });
      res.json(provider);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/providers/recommend", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { estateId, providerId } = req.body;
      if (!estateId || !providerId) {
        return res.status(400).json({ message: "Estate and provider are required" });
      }
      const isMember = await verifyEstateMembership(userId, estateId);
      if (!isMember) return res.status(403).json({ message: "Not a member of this estate" });

      const existingProvider = await storage.getProvider(providerId);
      if (!existingProvider || existingProvider.providerApprovalStatus !== "approved") {
        return res.status(404).json({ message: "Provider not found" });
      }
      if (!existingProvider.createdBy) {
        return res.status(400).json({ message: "This provider cannot be recommended" });
      }

      const alreadyVisible = await storage.getVisibleProviders(estateId);
      if (alreadyVisible.some((p) => p.name.toLowerCase() === existingProvider.name.toLowerCase())) {
        return res.status(400).json({ message: "This provider is already available in your estate" });
      }

      const pendingInEstate = await storage.getPendingProviders(estateId);
      if (pendingInEstate.some((p) => p.name.toLowerCase() === existingProvider.name.toLowerCase())) {
        return res.status(400).json({ message: "This provider has already been recommended and is pending approval" });
      }

      const recommendation = await storage.createProvider({
        estateId,
        createdBy: existingProvider.createdBy,
        name: existingProvider.name,
        category: existingProvider.category,
        phone: existingProvider.phone || null,
        whatsapp: existingProvider.whatsapp || null,
        email: existingProvider.email || null,
        website: existingProvider.website || null,
        description: existingProvider.description || null,
        services: existingProvider.services || null,
        providerApprovalStatus: "pending",
        recommendedBy: userId,
      });
      res.json(recommendation);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/providers/invite", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { estateId, providerName, providerEmail, providerPhone, category } = req.body;
      if (!estateId || !providerName) {
        return res.status(400).json({ message: "Estate and provider name are required" });
      }
      const isMember = await verifyEstateMembership(userId, estateId);
      if (!isMember) return res.status(403).json({ message: "Not a member of this estate" });

      const invitation = await storage.createProviderInvitation({
        estateId,
        invitedByUserId: userId,
        providerName,
        providerEmail: providerEmail || null,
        providerPhone: providerPhone || null,
        category: category || null,
      });
      res.json(invitation);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/estates/:id/pending-providers", requireAuth, async (req, res) => {
    try {
      const estateId = req.params.id;
      const link = await storage.getUserEstateLink(req.session.userId!, estateId);
      if (!link || link.roleInEstate !== "estate_admin" || link.approvalStatus !== "approved") {
        return res.status(403).json({ message: "Only estate admins can view pending providers" });
      }
      const pending = await storage.getPendingProviders(estateId);
      const enriched = await Promise.all(pending.map(async (p) => {
        const recommender = p.recommendedBy ? await storage.getUser(p.recommendedBy) : null;
        return { ...p, _recommendedByName: recommender?.fullName || null };
      }));
      res.json(enriched);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/estates/:id/providers/:providerId/approve", requireAuth, async (req, res) => {
    try {
      const { id: estateId, providerId } = req.params;
      const link = await storage.getUserEstateLink(req.session.userId!, estateId);
      if (!link || link.roleInEstate !== "estate_admin" || link.approvalStatus !== "approved") {
        return res.status(403).json({ message: "Only estate admins can approve providers" });
      }
      const provider = await storage.getProvider(providerId);
      if (!provider || provider.estateId !== estateId || provider.providerApprovalStatus !== "pending") {
        return res.status(404).json({ message: "Pending provider not found in this estate" });
      }
      const updated = await storage.approveProvider(providerId);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/estates/:id/providers/:providerId/reject", requireAuth, async (req, res) => {
    try {
      const { id: estateId, providerId } = req.params;
      const link = await storage.getUserEstateLink(req.session.userId!, estateId);
      if (!link || link.roleInEstate !== "estate_admin" || link.approvalStatus !== "approved") {
        return res.status(403).json({ message: "Only estate admins can reject providers" });
      }
      const provider = await storage.getProvider(providerId);
      if (!provider || provider.estateId !== estateId || provider.providerApprovalStatus !== "pending") {
        return res.status(404).json({ message: "Pending provider not found in this estate" });
      }
      await storage.rejectProvider(providerId);
      res.json({ message: "Provider rejected" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/estates/:id/available-providers", requireAuth, async (req, res) => {
    try {
      const estateId = req.params.id;
      const isMember = await verifyEstateMembership(req.session.userId!, estateId);
      if (!isMember) return res.status(403).json({ message: "Not a member of this estate" });
      const allProviders = await storage.getAllRegisteredProviders();
      const alreadyVisible = await storage.getVisibleProviders(estateId);
      const alreadyNames = new Set(alreadyVisible.map((p) => p.name.toLowerCase()));
      const pendingInEstate = await storage.getPendingProviders(estateId);
      const pendingNames = new Set(pendingInEstate.map((p) => p.name.toLowerCase()));
      const filtered = allProviders.filter((p) => {
        const nameLower = p.name.toLowerCase();
        return !alreadyNames.has(nameLower) && !pendingNames.has(nameLower) && p.estateId !== estateId;
      });
      res.json(filtered);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/estates/:id/registered-providers", requireAuth, async (req, res) => {
    try {
      const estateId = req.params.id;
      const link = await storage.getUserEstateLink(req.session.userId!, estateId);
      if (!link || link.roleInEstate !== "estate_admin" || link.approvalStatus !== "approved") {
        return res.status(403).json({ message: "Only estate admins can browse registered providers" });
      }
      const allProviders = await storage.getAllRegisteredProviders();
      const alreadyVisible = await storage.getVisibleProviders(estateId);
      const alreadyIds = new Set(alreadyVisible.map((p) => p.id));
      const filtered = allProviders.filter((p) => !alreadyIds.has(p.id) && p.estateId !== estateId);
      res.json(filtered);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/estates/:id/providers/:providerId/add", requireAuth, async (req, res) => {
    try {
      const { id: estateId, providerId } = req.params;
      const link = await storage.getUserEstateLink(req.session.userId!, estateId);
      if (!link || link.roleInEstate !== "estate_admin" || link.approvalStatus !== "approved") {
        return res.status(403).json({ message: "Only estate admins can add providers" });
      }
      const provider = await storage.getProvider(providerId);
      if (!provider || provider.providerApprovalStatus !== "approved") {
        return res.status(404).json({ message: "Provider not found or not approved" });
      }
      await storage.addProviderToEstate(providerId, estateId);
      res.json({ message: "Provider added to estate" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/estates/:id/invitations", requireAuth, async (req, res) => {
    try {
      const estateId = req.params.id;
      const link = await storage.getUserEstateLink(req.session.userId!, estateId);
      if (!link || link.roleInEstate !== "estate_admin" || link.approvalStatus !== "approved") {
        return res.status(403).json({ message: "Only estate admins can view invitations" });
      }
      const invitations = await storage.getProviderInvitations(estateId);
      const enriched = await Promise.all(invitations.map(async (inv) => {
        const inviter = await storage.getUser(inv.invitedByUserId);
        return { ...inv, _invitedByName: inviter?.fullName || null };
      }));
      res.json(enriched);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/reviews", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const providerId = req.query.providerId as string | undefined;
      if (providerId) {
        const provider = await storage.getProvider(providerId);
        if (provider?.estateId) {
          const isMember = await verifyEstateMembership(userId, provider.estateId);
          if (!isMember) return res.status(403).json({ message: "Not a member of this estate" });
        }
        const reviews = await storage.getReviews(providerId);
        return res.json(reviews);
      }
      const memberEstateIds = await getUserEstateIds(userId);
      const providerSets = await Promise.all(
        memberEstateIds.map((eid) => storage.getVisibleProviders(eid))
      );
      const directProviders = await storage.getProvidersScoped(userId, memberEstateIds);
      const allVisible = [...directProviders, ...providerSets.flat()];
      const providerIdSet = new Set(allVisible.map((p) => p.id));
      const allReviews = await storage.getReviews();
      const scopedReviews = allReviews.filter((r) => providerIdSet.has(r.providerId));
      res.json(scopedReviews);
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

  async function requireSupplier(req: any, res: any, next: any) {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const user = await storage.getUser(req.session.userId);
    if (user?.role !== "supplier") {
      return res.status(403).json({ message: "Supplier access required" });
    }
    if (user.approvalStatus === "pending") {
      return res.status(403).json({ message: "Your supplier account is pending approval" });
    }
    if (user.approvalStatus === "rejected") {
      return res.status(403).json({ message: "Your supplier account has been rejected" });
    }
    next();
  }

  app.get("/api/supplier/profile", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role !== "supplier") {
        return res.status(403).json({ message: "Supplier access required" });
      }
      res.json({
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        businessName: user.businessName,
        businessWebsite: user.businessWebsite,
        services: user.services,
        approvalStatus: user.approvalStatus,
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/supplier/profile", requireSupplier, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { businessName, businessWebsite, services, phone } = req.body;

      if (businessName !== undefined && (typeof businessName !== "string" || businessName.trim().length < 2)) {
        return res.status(400).json({ message: "Business name must be at least 2 characters" });
      }
      if (services !== undefined) {
        if (!Array.isArray(services) || services.length === 0 || !services.every((s: any) => typeof s === "string" && s.trim().length > 0)) {
          return res.status(400).json({ message: "At least one valid service is required" });
        }
      }
      if (phone !== undefined && typeof phone !== "string") {
        return res.status(400).json({ message: "Invalid phone format" });
      }

      let normalizedWebsite: string | null = null;
      if (businessWebsite !== undefined && businessWebsite) {
        const ws = String(businessWebsite).trim();
        if (ws && !/^https?:\/\//i.test(ws)) {
          normalizedWebsite = `https://${ws}`;
        } else {
          normalizedWebsite = ws || null;
        }
        if (normalizedWebsite && !/^https?:\/\/.+/i.test(normalizedWebsite)) {
          return res.status(400).json({ message: "Website must be a valid URL" });
        }
      }

      const updates: any = {};
      if (businessName !== undefined) { updates.businessName = businessName.trim(); updates.fullName = businessName.trim(); }
      if (businessWebsite !== undefined) updates.businessWebsite = normalizedWebsite;
      if (services !== undefined) updates.services = services.map((s: string) => s.trim());
      if (phone !== undefined) updates.phone = phone.trim();

      await db.update(users).set(updates).where(eq(users.id, userId));
      const updated = await storage.getUser(userId);
      res.json({
        id: updated!.id,
        email: updated!.email,
        fullName: updated!.fullName,
        phone: updated!.phone,
        businessName: updated!.businessName,
        businessWebsite: updated!.businessWebsite,
        services: updated!.services,
        approvalStatus: updated!.approvalStatus,
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/supplier/dashboard", requireSupplier, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const myProviders = await storage.getProvidersByUserId(userId);
      const tiers = await storage.getSubscriptionTiers();

      const providersWithSubs = await Promise.all(
        myProviders.map(async (p) => {
          const sub = await storage.getProviderSubscription(p.id);
          const visibleEstates = await storage.getProviderVisibleEstates(p.id);
          const provReviews = await storage.getReviews(p.id);
          const tier = sub ? tiers.find((t) => t.id === sub.tierId) : null;
          return {
            ...p,
            subscription: sub || null,
            tier: tier || null,
            visibleEstateIds: visibleEstates.map((v) => v.estateId),
            reviewCount: provReviews.length,
            avgRating: provReviews.length > 0
              ? Math.round(provReviews.reduce((s, r) => s + r.rating, 0) / provReviews.length * 10) / 10
              : 0,
          };
        })
      );

      res.json({ providers: providersWithSubs, tiers });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/supplier/tiers", requireAuth, async (_req, res) => {
    try {
      const tiers = await storage.getSubscriptionTiers();
      res.json(tiers);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/supplier/estates", requireSupplier, async (_req, res) => {
    try {
      const allEstates = await storage.getAllEstates();
      res.json(allEstates);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/supplier/cities", requireSupplier, async (_req, res) => {
    try {
      const cities = await storage.getDistinctCities();
      res.json(cities);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/supplier/provinces", requireSupplier, async (_req, res) => {
    try {
      const provinces = await storage.getDistinctProvinces();
      res.json(provinces);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/supplier/provider", requireSupplier, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { name, category, phone, whatsapp, email, website, description } = req.body;
      if (!name || !category) return res.status(400).json({ message: "Name and category are required" });

      let safeWebsite = website || null;
      if (safeWebsite && !/^https?:\/\//i.test(safeWebsite)) {
        safeWebsite = `https://${safeWebsite}`;
      }

      const provider = await storage.createProvider({
        name,
        category,
        phone: phone || null,
        whatsapp: whatsapp || null,
        email: email || null,
        website: safeWebsite,
        description: description || null,
        createdBy: userId,
        estateId: null,
      });

      const freeTier = (await storage.getSubscriptionTiers()).find((t) => t.name === "Free");
      if (freeTier) {
        await storage.upsertProviderSubscription({
          providerId: provider.id,
          tierId: freeTier.id,
          status: "free",
        });
      }

      res.json(provider);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/supplier/subscribe", requireSupplier, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { providerId, tierId, selectedCity, selectedProvince, selectedEstateIds } = req.body;

      const provider = await storage.getProvider(providerId);
      if (!provider || provider.createdBy !== userId) {
        return res.status(403).json({ message: "Not your provider" });
      }

      const tiers = await storage.getSubscriptionTiers();
      const tier = tiers.find((t) => t.id === tierId);
      if (!tier) return res.status(400).json({ message: "Invalid tier" });

      if (tier.scopeType === "estate") {
        const maxEstates = tier.maxEstates || 1;
        const ids = selectedEstateIds || [];
        if (ids.length > maxEstates) {
          return res.status(400).json({ message: `Maximum ${maxEstates} estates for ${tier.name} tier` });
        }
        await storage.setProviderVisibleEstates(providerId, ids);
      } else if (tier.scopeType === "city" && !selectedCity) {
        return res.status(400).json({ message: "City selection required" });
      } else if (tier.scopeType === "province" && !selectedProvince) {
        return res.status(400).json({ message: "Province selection required" });
      }

      if (tier.scopeType !== "estate") {
        await storage.setProviderVisibleEstates(providerId, []);
      }

      const existingSub = await storage.getProviderSubscription(providerId);
      const isUpgrade = existingSub && existingSub.tierId !== tierId;
      const isDowngradeToFree = isUpgrade && tier.monthlyPrice === 0;

      if (isUpgrade && existingSub.payfastToken && existingSub.status === "active" && !isDowngradeToFree) {
        console.log(`[PayFast] Upgrade: canceling old token ${existingSub.payfastToken} for provider ${providerId}`);
      }

      const isFree = tier.monthlyPrice === 0;
      const sub = await storage.upsertProviderSubscription({
        providerId,
        tierId,
        status: isFree ? "free" : "pending",
        selectedCity: selectedCity || null,
        selectedProvince: selectedProvince || null,
      });

      if (isFree) {
        if (existingSub?.payfastToken) {
          await storage.updateProviderSubscription(sub.id, { payfastToken: null });
        }
        res.json({ subscription: sub, paymentRequired: false });
      } else {
        const host = req.headers.host || "localhost:5000";
        const protocol = req.headers["x-forwarded-proto"] || "https";
        const baseUrl = `${protocol}://${host}`;

        const user = await storage.getUser(userId);

        const paymentUrl = buildPayFastUrl({
          subscriptionId: sub.id,
          tierName: tier.name,
          amountInCents: tier.monthlyPrice,
          providerName: provider.name,
          returnUrl: `${baseUrl}/supplier?payment=success`,
          cancelUrl: `${baseUrl}/supplier?payment=cancelled`,
          notifyUrl: `${baseUrl}/api/payfast-webhook`,
          emailAddress: user?.email,
        });

        res.json({ subscription: sub, paymentRequired: true, paymentUrl });
      }
    } catch (err: any) {
      console.error("[Subscribe] Error:", err.message);
      res.status(500).json({ message: "Failed to process subscription. Please try again." });
    }
  });

  app.post("/api/payfast-webhook", express.urlencoded({ extended: false }), async (req, res) => {
    try {
      const body = req.body as Record<string, string>;
      console.log("[PayFast Webhook] Received ITN:", JSON.stringify({
        payment_status: body.payment_status,
        m_payment_id: body.m_payment_id,
        custom_str1: body.custom_str1,
        pf_payment_id: body.pf_payment_id,
        amount_gross: body.amount_gross,
      }));

      const subscriptionId = body.custom_str1 || body.m_payment_id;
      if (!subscriptionId) {
        return res.status(400).send("Missing subscription ID");
      }

      const sub = await storage.getProviderSubscriptionById(subscriptionId);
      let expectedAmount: number | undefined;
      if (sub) {
        const tiers = await storage.getSubscriptionTiers();
        const tier = tiers.find((t) => t.id === sub.tierId);
        if (tier) expectedAmount = tier.monthlyPrice;
      }

      const isValid = await validatePayFastITN(body, expectedAmount);
      if (!isValid) {
        console.error("[PayFast Webhook] Validation failed for subscription:", subscriptionId);
        return res.status(400).send("Invalid signature or amount mismatch");
      }

      const paymentStatus = body.payment_status;

      if (paymentStatus === "COMPLETE") {
        await storage.updateProviderSubscription(subscriptionId, {
          status: "active",
          payfastToken: body.token || null,
        });
        console.log(`[PayFast Webhook] Subscription ${subscriptionId} activated`);
      } else if (paymentStatus === "CANCELLED") {
        await storage.updateProviderSubscription(subscriptionId, {
          status: "canceled",
          payfastToken: null,
        });
        console.log(`[PayFast Webhook] Subscription ${subscriptionId} cancelled`);
      } else if (paymentStatus === "FAILED") {
        await storage.updateProviderSubscription(subscriptionId, {
          status: "failed",
        });
        console.log(`[PayFast Webhook] Subscription ${subscriptionId} payment failed`);
      }

      res.status(200).send("OK");
    } catch (err: any) {
      console.error("[PayFast Webhook] Error:", err.message);
      res.status(500).send("Server error");
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
      const { name, streetName, suburb, city, province } = req.body;
      if (!name || typeof name !== "string" || name.trim().length === 0) {
        return res.status(400).json({ message: "Estate name is required" });
      }
      const updated = await storage.updateEstate(req.params.id, { name: name.trim(), streetName, suburb, city, province });
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

  app.get("/api/admin/pending-suppliers", requireAdmin, async (_req, res) => {
    try {
      const allUsersData = await storage.getAllUsers();
      const pending = allUsersData
        .filter((u) => u.role === "supplier" && u.approvalStatus === "pending")
        .map((u) => ({ ...u, password: undefined }));
      res.json(pending);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/admin/suppliers", requireAdmin, async (_req, res) => {
    try {
      const allUsersData = await storage.getAllUsers();
      const suppliers = allUsersData
        .filter((u) => u.role === "supplier")
        .map((u) => ({ ...u, password: undefined }));
      res.json(suppliers);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/admin/suppliers/:id/approve", requireAdmin, async (req, res) => {
    try {
      const supplier = await storage.getUser(req.params.id);
      if (!supplier) return res.status(404).json({ message: "Supplier not found" });
      if (supplier.role !== "supplier") return res.status(400).json({ message: "User is not a supplier" });

      if (supplier.approvalStatus === "approved") {
        return res.status(409).json({ message: "Supplier is already approved" });
      }
      await db.update(users).set({ approvalStatus: "approved" }).where(eq(users.id, supplier.id));

      const existingProviders = await storage.getProvidersByUserId(supplier.id);
      if (existingProviders.length === 0) {
        await storage.createProvider({
          name: supplier.businessName || supplier.fullName,
          category: (supplier.services && supplier.services.length > 0) ? supplier.services[0].toLowerCase() : "other",
          phone: supplier.phone || null,
          email: supplier.email,
          createdBy: supplier.id,
          services: supplier.services || null,
          providerApprovalStatus: "approved",
        });
      }
      res.json({ message: "Supplier approved" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/admin/suppliers/:id/reject", requireAdmin, async (req, res) => {
    try {
      const supplier = await storage.getUser(req.params.id);
      if (!supplier) return res.status(404).json({ message: "Supplier not found" });
      if (supplier.role !== "supplier") return res.status(400).json({ message: "User is not a supplier" });

      if (supplier.approvalStatus === "rejected") {
        return res.status(409).json({ message: "Supplier is already rejected" });
      }
      await db.update(users).set({ approvalStatus: "rejected" }).where(eq(users.id, supplier.id));
      res.json({ message: "Supplier rejected" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/admin/estates/:id", requireAdmin, async (req, res) => {
    try {
      const estate = await storage.getEstate(req.params.id);
      if (!estate) return res.status(404).json({ message: "Estate not found" });

      await db.transaction(async (tx) => {
        const estateProviders = await tx.select({ id: providers.id }).from(providers).where(eq(providers.estateId, estate.id));
        const providerIds = estateProviders.map((p) => p.id);

        if (providerIds.length > 0) {
          await tx.delete(reviews).where(sql`${reviews.providerId} IN ${sql.raw(`('${providerIds.join("','")}')`)}`)
          await tx.delete(providerVisibleEstates).where(sql`${providerVisibleEstates.providerId} IN ${sql.raw(`('${providerIds.join("','")}')`)}`)
        }
        await tx.delete(providerVisibleEstates).where(eq(providerVisibleEstates.estateId, estate.id));
        await tx.delete(providers).where(eq(providers.estateId, estate.id));
        await tx.delete(bills).where(eq(bills.estateId, estate.id));
        await tx.delete(outages).where(eq(outages.estateId, estate.id));
        await tx.delete(userEstates).where(eq(userEstates.estateId, estate.id));
        await tx.delete(estates).where(eq(estates.id, estate.id));
      });

      res.json({ message: "Estate deleted" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/admin/pending-estates", requireAdmin, async (_req, res) => {
    try {
      const allEstates = await storage.getAllEstates();
      const pending = allEstates.filter((e) => e.approvalStatus === "pending");
      res.json(pending);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/admin/estates/:id/approve", requireAdmin, async (req, res) => {
    try {
      const estate = await storage.getEstate(req.params.id);
      if (!estate) return res.status(404).json({ message: "Estate not found" });
      if (estate.approvalStatus !== "pending") {
        return res.status(409).json({ message: `Estate is already ${estate.approvalStatus}` });
      }
      await db.update(estates).set({ approvalStatus: "approved" }).where(eq(estates.id, estate.id));
      res.json({ message: "Estate approved" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/admin/estates/:id/reject", requireAdmin, async (req, res) => {
    try {
      const estate = await storage.getEstate(req.params.id);
      if (!estate) return res.status(404).json({ message: "Estate not found" });
      if (estate.approvalStatus !== "pending") {
        return res.status(409).json({ message: `Estate is already ${estate.approvalStatus}` });
      }
      await db.update(estates).set({ approvalStatus: "rejected" }).where(eq(estates.id, estate.id));
      res.json({ message: "Estate rejected" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  return httpServer;
}
