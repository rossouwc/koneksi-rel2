import {
  type User, type InsertUser,
  type Estate, type InsertEstate,
  type UserEstate, type InsertUserEstate,
  type Bill, type InsertBill,
  type Outage, type InsertOutage,
  type Provider, type InsertProvider,
  type Review, type InsertReview,
  users, estates, userEstates, bills, outages, providers, reviews,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, isNull, or, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserProfile(id: string, data: { fullName?: string; phone?: string; suburb?: string; profileComplete?: boolean }): Promise<User>;
  getAllUsers(): Promise<User[]>;

  getEstate(id: string): Promise<Estate | undefined>;
  getEstateByInviteCode(code: string): Promise<Estate | undefined>;
  getUserEstates(userId: string): Promise<Estate[]>;
  getUserEstateIds(userId: string): Promise<string[]>;
  getAllEstates(): Promise<Estate[]>;
  createEstate(estate: InsertEstate): Promise<Estate>;

  getUserEstateLink(userId: string, estateId: string): Promise<UserEstate | undefined>;
  addUserToEstate(data: InsertUserEstate): Promise<UserEstate>;

  getBillsScoped(userId: string, estateIds: string[], estateId?: string): Promise<Bill[]>;
  createBill(bill: InsertBill): Promise<Bill>;

  getOutagesScoped(userId: string, estateIds: string[], estateId?: string): Promise<Outage[]>;
  createOutage(outage: InsertOutage): Promise<Outage>;

  getProvidersScoped(userId: string, estateIds: string[], estateId?: string): Promise<Provider[]>;
  createProvider(provider: InsertProvider): Promise<Provider>;

  updateEstate(id: string, data: { name?: string; suburb?: string | null; city?: string | null; province?: string | null }): Promise<Estate>;
  getEstateResidents(estateId: string): Promise<{ user: User; role: string; joinedAt: Date | null }[]>;
  getEstateStats(estateId: string): Promise<{ residentCount: number; billCount: number; outageCount: number; providerCount: number }>;

  getProvider(id: string): Promise<Provider | undefined>;
  getReviews(providerId?: string): Promise<Review[]>;
  createReview(review: InsertReview): Promise<Review>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUserProfile(id: string, data: { fullName?: string; phone?: string; suburb?: string; profileComplete?: boolean }): Promise<User> {
    const [updated] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return updated;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getEstate(id: string): Promise<Estate | undefined> {
    const [estate] = await db.select().from(estates).where(eq(estates.id, id));
    return estate;
  }

  async getEstateByInviteCode(code: string): Promise<Estate | undefined> {
    const [estate] = await db.select().from(estates).where(eq(estates.inviteCode, code));
    return estate;
  }

  async getUserEstates(userId: string): Promise<Estate[]> {
    const links = await db.select().from(userEstates).where(eq(userEstates.userId, userId));
    if (links.length === 0) return [];
    const estateIds = links.map((l) => l.estateId);
    const result: Estate[] = [];
    for (const id of estateIds) {
      const [estate] = await db.select().from(estates).where(eq(estates.id, id));
      if (estate) result.push(estate);
    }
    return result;
  }

  async getUserEstateIds(userId: string): Promise<string[]> {
    const links = await db.select({ estateId: userEstates.estateId }).from(userEstates).where(eq(userEstates.userId, userId));
    return links.map((l) => l.estateId);
  }

  async getAllEstates(): Promise<Estate[]> {
    return db.select().from(estates).orderBy(desc(estates.createdAt));
  }

  async createEstate(insertEstate: InsertEstate): Promise<Estate> {
    const inviteCode = randomUUID().slice(0, 8).toUpperCase();
    const [estate] = await db.insert(estates).values({ ...insertEstate, inviteCode }).returning();
    return estate;
  }

  async getUserEstateLink(userId: string, estateId: string): Promise<UserEstate | undefined> {
    const [link] = await db
      .select()
      .from(userEstates)
      .where(and(eq(userEstates.userId, userId), eq(userEstates.estateId, estateId)));
    return link;
  }

  async addUserToEstate(data: InsertUserEstate): Promise<UserEstate> {
    const [link] = await db.insert(userEstates).values(data).returning();
    return link;
  }

  async getBillsScoped(userId: string, estateIds: string[], estateId?: string): Promise<Bill[]> {
    if (estateId) {
      return db.select().from(bills).where(eq(bills.estateId, estateId)).orderBy(desc(bills.createdAt));
    }
    const conditions = [
      and(eq(bills.userId, userId), isNull(bills.estateId)),
    ];
    if (estateIds.length > 0) {
      conditions.push(inArray(bills.estateId, estateIds));
    }
    return db.select().from(bills).where(or(...conditions)).orderBy(desc(bills.createdAt));
  }

  async createBill(bill: InsertBill): Promise<Bill> {
    const [created] = await db.insert(bills).values(bill).returning();
    return created;
  }

  async getOutagesScoped(userId: string, estateIds: string[], estateId?: string): Promise<Outage[]> {
    if (estateId) {
      return db.select().from(outages).where(eq(outages.estateId, estateId)).orderBy(desc(outages.createdAt));
    }
    if (estateIds.length > 0) {
      return db.select().from(outages).where(
        or(
          inArray(outages.estateId, estateIds),
          and(eq(outages.userId, userId), isNull(outages.estateId))
        )
      ).orderBy(desc(outages.createdAt));
    }
    return db.select().from(outages).where(
      and(eq(outages.userId, userId), isNull(outages.estateId))
    ).orderBy(desc(outages.createdAt));
  }

  async createOutage(outage: InsertOutage): Promise<Outage> {
    const [created] = await db.insert(outages).values(outage).returning();
    return created;
  }

  async getProvidersScoped(userId: string, estateIds: string[], estateId?: string): Promise<Provider[]> {
    if (estateId) {
      return db.select().from(providers).where(eq(providers.estateId, estateId)).orderBy(desc(providers.createdAt));
    }
    if (estateIds.length > 0) {
      return db.select().from(providers).where(inArray(providers.estateId, estateIds)).orderBy(desc(providers.createdAt));
    }
    return [];
  }

  async createProvider(provider: InsertProvider): Promise<Provider> {
    const [created] = await db.insert(providers).values(provider).returning();
    return created;
  }

  async updateEstate(id: string, data: { name?: string; suburb?: string | null; city?: string | null; province?: string | null }): Promise<Estate> {
    const [updated] = await db.update(estates).set(data).where(eq(estates.id, id)).returning();
    return updated;
  }

  async getEstateResidents(estateId: string): Promise<{ user: User; role: string; joinedAt: Date | null }[]> {
    const links = await db.select().from(userEstates).where(eq(userEstates.estateId, estateId));
    const results: { user: User; role: string; joinedAt: Date | null }[] = [];
    for (const link of links) {
      const [user] = await db.select().from(users).where(eq(users.id, link.userId));
      if (user) {
        results.push({ user: { ...user, password: "" }, role: link.roleInEstate, joinedAt: link.joinedAt });
      }
    }
    return results;
  }

  async getEstateStats(estateId: string): Promise<{ residentCount: number; billCount: number; outageCount: number; providerCount: number }> {
    const links = await db.select().from(userEstates).where(eq(userEstates.estateId, estateId));
    const estateBills = await db.select().from(bills).where(eq(bills.estateId, estateId));
    const estateOutages = await db.select().from(outages).where(eq(outages.estateId, estateId));
    const estateProviders = await db.select().from(providers).where(eq(providers.estateId, estateId));
    return {
      residentCount: links.length,
      billCount: estateBills.length,
      outageCount: estateOutages.length,
      providerCount: estateProviders.length,
    };
  }

  async getProvider(id: string): Promise<Provider | undefined> {
    const [provider] = await db.select().from(providers).where(eq(providers.id, id));
    return provider;
  }

  async getReviews(providerId?: string): Promise<Review[]> {
    if (providerId) {
      return db.select().from(reviews).where(eq(reviews.providerId, providerId)).orderBy(desc(reviews.createdAt));
    }
    return db.select().from(reviews).orderBy(desc(reviews.createdAt));
  }

  async createReview(review: InsertReview): Promise<Review> {
    const [created] = await db.insert(reviews).values(review).returning();
    return created;
  }
}

export const storage = new DatabaseStorage();
