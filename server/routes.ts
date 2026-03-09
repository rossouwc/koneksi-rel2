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
      const filePath = path.join(uploadsDir, req.file.filename);

      let analysis;
      try {
        analysis = await analyzeBillImage(filePath);
      } catch (aiErr: any) {
        console.error("[Bill Analyzer] AI error:", aiErr.message);
        return res.status(422).json({
          message: "Could not analyze this bill image. Please upload a clearer photo of your utility bill.",
        });
      }

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
      const { estateId } = req.body;

      if (estateId) {
        const isMember = await verifyEstateMembership(userId, estateId);
        if (!isMember) return res.status(403).json({ message: "Not a member of this estate" });
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
      const providers = await storage.getProvidersScoped(userId, memberEstateIds);
      const providerIds = providers.map((p) => p.id);
      const allReviews = await storage.getReviews();
      const scopedReviews = allReviews.filter((r) => providerIds.includes(r.providerId));
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
    next();
  }

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
