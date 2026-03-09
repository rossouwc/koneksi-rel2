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
  createdAt: timestamp("created_at").defaultNow(),
});

export const estates = pgTable("estates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  suburb: text("suburb"),
  city: text("city"),
  province: text("province"),
  inviteCode: text("invite_code").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userEstates = pgTable("user_estates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  estateId: varchar("estate_id").notNull(),
  roleInEstate: estateRoleEnum("role_in_estate").notNull().default("resident"),
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
  createdAt: timestamp("created_at").defaultNow(),
});

export const providers = pgTable("providers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  estateId: varchar("estate_id"),
  name: text("name").notNull(),
  category: text("category").notNull(),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const reviews = pgTable("reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  providerId: varchar("provider_id").notNull(),
  userId: varchar("user_id").notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, isSuperAdmin: true, profileComplete: true, role: true });
export const insertEstateSchema = createInsertSchema(estates).omit({ id: true, createdAt: true, inviteCode: true });
export const insertUserEstateSchema = createInsertSchema(userEstates).omit({ id: true, joinedAt: true });
export const insertBillSchema = createInsertSchema(bills).omit({ id: true, createdAt: true });
export const insertOutageSchema = createInsertSchema(outages).omit({ id: true, createdAt: true });
export const insertProviderSchema = createInsertSchema(providers).omit({ id: true, createdAt: true });
export const insertReviewSchema = createInsertSchema(reviews).omit({ id: true, createdAt: true });

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(2),
});

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
