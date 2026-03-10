import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const userRoleEnum = pgEnum("user_role", ["resident", "estate_admin", "super_admin", "supplier"]);
export const estateRoleEnum = pgEnum("estate_role", ["resident", "estate_admin"]);
export const outageTypeEnum = pgEnum("outage_type", ["electricity", "water", "internet", "gas", "other"]);
export const outageStatusEnum = pgEnum("outage_status", ["reported", "confirmed", "resolved"]);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  phone: text("phone"),
  suburb: text("suburb"),
  avatarUrl: text("avatar_url"),
  role: userRoleEnum("role").default("resident"),
  profileComplete: boolean("profile_complete").default(false),
  isSuperAdmin: boolean("is_super_admin").default(false),
  businessName: text("business_name"),
  businessWebsite: text("business_website"),
  services: text("services").array(),
  approvalStatus: text("approval_status"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const estates = pgTable("estates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  streetName: text("street_name"),
  suburb: text("suburb"),
  city: text("city"),
  province: text("province"),
  inviteCode: text("invite_code").notNull().unique(),
  approvalStatus: text("approval_status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userEstates = pgTable("user_estates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  estateId: varchar("estate_id").notNull(),
  roleInEstate: estateRoleEnum("role_in_estate").notNull().default("resident"),
  approvalStatus: text("approval_status").default("pending"),
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const bills = pgTable("bills", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  estateId: varchar("estate_id"),
  title: text("title").notNull(),
  amount: integer("amount"),
  dueDate: text("due_date"),
  category: text("category"),
  status: text("status").default("pending"),
  fileUrl: text("file_url"),
  analysisResult: text("analysis_result"),
  provider: text("provider"),
  billingPeriod: text("billing_period"),
  accountNumber: text("account_number"),
  usageKwh: integer("usage_kwh"),
  usageKl: integer("usage_kl"),
  tariffRate: integer("tariff_rate"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const outages = pgTable("outages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  estateId: varchar("estate_id"),
  type: outageTypeEnum("type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: outageStatusEnum("status").default("reported"),
  lat: text("lat"),
  lng: text("lng"),
  address: text("address"),
  photoUrl: text("photo_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const providers = pgTable("providers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  estateId: varchar("estate_id"),
  createdBy: varchar("created_by"),
  name: text("name").notNull(),
  category: text("category").notNull(),
  phone: text("phone"),
  whatsapp: text("whatsapp"),
  email: text("email"),
  website: text("website"),
  description: text("description"),
  services: text("services").array(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const SERVICE_OPTIONS = [
  "Plumbing",
  "Electrical",
  "Pool Maintenance",
  "Solar Installation",
  "Gardening",
  "Pest Control",
  "Painting",
  "General Maintenance",
  "Leak Detection",
  "Water Purification",
] as const;

export const reviews = pgTable("reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  providerId: varchar("provider_id").notNull(),
  userId: varchar("user_id").notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const subscriptionTiers = pgTable("subscription_tiers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  monthlyPrice: integer("monthly_price").notNull(),
  maxEstates: integer("max_estates"),
  scopeType: text("scope_type").notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").default(0),
});

export const providerSubscriptions = pgTable("provider_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  providerId: varchar("provider_id").notNull(),
  tierId: varchar("tier_id").notNull(),
  status: text("status").default("free"),
  selectedCity: text("selected_city"),
  selectedProvince: text("selected_province"),
  payfastToken: text("payfast_token"),
  startedAt: timestamp("started_at").defaultNow(),
  nextBillingDate: text("next_billing_date"),
});

export const providerVisibleEstates = pgTable("provider_visible_estates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  providerId: varchar("provider_id").notNull(),
  estateId: varchar("estate_id").notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, isSuperAdmin: true, profileComplete: true, role: true, approvalStatus: true });
export const insertEstateSchema = createInsertSchema(estates).omit({ id: true, createdAt: true, inviteCode: true });
export const insertUserEstateSchema = createInsertSchema(userEstates).omit({ id: true, joinedAt: true });
export const insertBillSchema = createInsertSchema(bills).omit({ id: true, createdAt: true });
export const insertOutageSchema = createInsertSchema(outages).omit({ id: true, createdAt: true });
export const insertProviderSchema = createInsertSchema(providers).omit({ id: true, createdAt: true });
export const insertReviewSchema = createInsertSchema(reviews).omit({ id: true, createdAt: true });
export const insertSubscriptionTierSchema = createInsertSchema(subscriptionTiers).omit({ id: true });
export const insertProviderSubscriptionSchema = createInsertSchema(providerSubscriptions).omit({ id: true, startedAt: true });
export const insertProviderVisibleEstateSchema = createInsertSchema(providerVisibleEstates).omit({ id: true });

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(2),
  registerAs: z.enum(["resident", "supplier", "estate_admin"]).default("resident"),
  businessName: z.string().min(2).optional(),
  businessWebsite: z.string().url().optional().or(z.literal("")),
  services: z.array(z.string()).optional(),
  phone: z.string().min(6).optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  estateName: z.string().min(2).optional(),
  estateSuburb: z.string().optional(),
  estateCity: z.string().optional(),
  estateProvince: z.string().optional(),
}).refine(
  (data) => {
    if (data.registerAs === "supplier") {
      return !!data.businessName && data.services && data.services.length > 0;
    }
    if (data.registerAs === "estate_admin") {
      return !!data.estateName;
    }
    return true;
  },
  { message: "Required fields missing for selected registration type" }
);

export const profileSetupSchema = z.object({
  phone: z.string().optional(),
  suburb: z.string().optional(),
  fullName: z.string().min(2).optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Estate = typeof estates.$inferSelect;
export type InsertEstate = z.infer<typeof insertEstateSchema>;
export type UserEstate = typeof userEstates.$inferSelect;
export type InsertUserEstate = z.infer<typeof insertUserEstateSchema>;
export type Bill = typeof bills.$inferSelect;
export type InsertBill = z.infer<typeof insertBillSchema>;
export type Outage = typeof outages.$inferSelect;
export type InsertOutage = z.infer<typeof insertOutageSchema>;
export type Provider = typeof providers.$inferSelect;
export type InsertProvider = z.infer<typeof insertProviderSchema>;
export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type SubscriptionTier = typeof subscriptionTiers.$inferSelect;
export type InsertSubscriptionTier = z.infer<typeof insertSubscriptionTierSchema>;
export type ProviderSubscription = typeof providerSubscriptions.$inferSelect;
export type InsertProviderSubscription = z.infer<typeof insertProviderSubscriptionSchema>;
export type ProviderVisibleEstate = typeof providerVisibleEstates.$inferSelect;
export type InsertProviderVisibleEstate = z.infer<typeof insertProviderVisibleEstateSchema>;
