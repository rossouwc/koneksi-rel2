import { storage } from "./storage";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function seedDatabase() {
  await storage.setSystemSetting("notification_mode", (await storage.getSystemSetting("notification_mode")) ?? "test");
  await storage.setSystemSetting("test_email", (await storage.getSystemSetting("test_email")) ?? "rossouw@hoolio.co.za");
  await storage.setSystemSetting("test_phone", (await storage.getSystemSetting("test_phone")) ?? "0828224487");

  const existingAdmin =
    await storage.getUserByEmail("koneksi@hoolio.co.za") ||
    await storage.getUserByEmail("admin@koneksi.app");
  if (existingAdmin) {
    if (existingAdmin.email === "admin@koneksi.app") {
      const { db } = await import("./db");
      const { users } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      await db.update(users).set({ email: "koneksi@hoolio.co.za" }).where(eq(users.id, existingAdmin.id));
    }
    return;
  }

  const adminPassword = await hashPassword("admin123");
  const admin = await storage.createUser({
    email: "koneksi@hoolio.co.za",
    password: adminPassword,
    fullName: "Koneksi Admin",
  });

  const { db } = await import("./db");
  const { users } = await import("@shared/schema");
  const { eq } = await import("drizzle-orm");
  await db.update(users).set({ isSuperAdmin: true, role: "super_admin", profileComplete: true, phone: "011 000 0000", suburb: "Sandton" }).where(eq(users.id, admin.id));

  const demoPassword = await hashPassword("demo123");
  const demo = await storage.createUser({
    email: "demo@koneksi.app",
    password: demoPassword,
    fullName: "Sarah Johnson",
  });
  await db.update(users).set({ profileComplete: true, phone: "082 555 1234", suburb: "Sandton" }).where(eq(users.id, demo.id));

  const estate1 = await storage.createEstate({
    name: "Greenwood Estate",
    suburb: "Sandton",
    city: "Johannesburg",
    province: "Gauteng",
  });

  const estate2 = await storage.createEstate({
    name: "Riverside Park",
    suburb: "Waterfall",
    city: "Midrand",
    province: "Gauteng",
  });

  await storage.addUserToEstate({ userId: admin.id, estateId: estate1.id, roleInEstate: "estate_admin" });
  await storage.addUserToEstate({ userId: admin.id, estateId: estate2.id, roleInEstate: "estate_admin" });
  await storage.addUserToEstate({ userId: demo.id, estateId: estate1.id, roleInEstate: "resident" });

  await storage.createBill({ userId: demo.id, estateId: estate1.id, title: "March Electricity", amount: 185000, dueDate: "2026-03-28", category: "electricity", status: "pending" });
  await storage.createBill({ userId: demo.id, estateId: estate1.id, title: "Water & Sewage", amount: 67500, dueDate: "2026-03-25", category: "water", status: "paid" });
  await storage.createBill({ userId: demo.id, estateId: estate1.id, title: "Fibre Internet", amount: 89900, dueDate: "2026-04-01", category: "internet", status: "pending" });
  await storage.createBill({ userId: demo.id, estateId: estate1.id, title: "Monthly Levy", amount: 350000, dueDate: "2026-03-15", category: "levy", status: "paid" });
  await storage.createBill({ userId: demo.id, estateId: estate1.id, title: "Municipal Rates", amount: 125000, dueDate: "2026-03-30", category: "rates", status: "pending" });

  await storage.createOutage({ userId: demo.id, estateId: estate1.id, type: "electricity", title: "Load shedding Stage 4", description: "Scheduled load shedding affecting Blocks A-D from 18:00 to 20:30", status: "confirmed", address: "Greenwood Estate, Block A-D" });
  await storage.createOutage({ userId: demo.id, estateId: estate1.id, type: "water", title: "Low water pressure", description: "Reduced water pressure due to municipal maintenance", status: "reported", address: "Greenwood Estate, all blocks" });

  const plumber = await storage.createProvider({ estateId: estate1.id, name: "QuickFix Plumbing", category: "plumber", phone: "011 234 5678", email: "info@quickfix.co.za", website: "https://quickfix.co.za", description: "24/7 emergency plumbing services. Licensed and insured." });
  const electrician = await storage.createProvider({ estateId: estate1.id, name: "Spark Electrical", category: "electrician", phone: "011 345 6789", email: "bookings@spark.co.za", description: "Certified electricians specializing in residential estates." });
  const gardener = await storage.createProvider({ estateId: estate1.id, name: "Green Thumb Gardens", category: "gardener", phone: "082 123 4567", description: "Professional landscaping and garden maintenance." });
  const security = await storage.createProvider({ estateId: estate1.id, name: "SecureGuard SA", category: "security", phone: "011 456 7890", email: "ops@secureguard.co.za", website: "https://secureguard.co.za", description: "Armed response and 24-hour monitoring." });

  await storage.createReview({ providerId: plumber.id, userId: demo.id, rating: 5, comment: "Excellent service! Fixed our burst pipe within an hour." });
  await storage.createReview({ providerId: electrician.id, userId: demo.id, rating: 4, comment: "Very professional. Installed new DB board efficiently." });
  await storage.createReview({ providerId: gardener.id, userId: demo.id, rating: 5, comment: "Our garden has never looked better. Highly recommend!" });
  await storage.createReview({ providerId: security.id, userId: demo.id, rating: 4, comment: "Quick response times and professional guards." });

  const existingSupplier = await storage.getUserByEmail("supplier@koneksi.app");
  if (!existingSupplier) {
    const supplierPassword = await hashPassword("supplier123");
    const supplier = await storage.createUser({
      email: "supplier@koneksi.app",
      password: supplierPassword,
      fullName: "Mike's Plumbing",
    });
    await db.update(users).set({ role: "supplier", profileComplete: true, phone: "011 987 6543", suburb: "Randburg" }).where(eq(users.id, supplier.id));

    const supplierProvider = await storage.createProvider({
      name: "Mike's Premium Plumbing",
      category: "plumber",
      phone: "011 987 6543",
      whatsapp: "+27119876543",
      email: "mike@plumbing.co.za",
      website: "https://mikesplumbing.co.za",
      description: "Expert plumbing services for estates across Gauteng. 15 years experience.",
      createdBy: supplier.id,
      estateId: null,
    });

    const { subscriptionTiers: subTiersTable } = await import("@shared/schema");
    const freeTiers = await db.select().from(subTiersTable).where(eq(subTiersTable.name, "Free"));
    if (freeTiers.length > 0) {
      const { providerSubscriptions: provSubTable } = await import("@shared/schema");
      await db.insert(provSubTable).values({
        providerId: supplierProvider.id,
        tierId: freeTiers[0].id,
        status: "free",
      });

      const { providerVisibleEstates: pveTable } = await import("@shared/schema");
      await db.insert(pveTable).values({
        providerId: supplierProvider.id,
        estateId: estate1.id,
      });
    }

    await storage.createReview({ providerId: supplierProvider.id, userId: demo.id, rating: 5, comment: "Mike's team is incredible. Fast, professional, and affordable!" });
  }

  console.log("Database seeded successfully");
}
