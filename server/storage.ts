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
import { eq, and, desc } from "drizzle-orm";
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
  getAllEstates(): Promise<Estate[]>;
  createEstate(estate: InsertEstate): Promise<Estate>;

  getUserEstateLink(userId: string, estateId: string): Promise<UserEstate | undefined>;
  addUserToEstate(data: InsertUserEstate): Promise<UserEstate>;

  getBills(userId: string, estateId?: string): Promise<Bill[]>;
  createBill(bill: InsertBill): Promise<Bill>;

  getOutages(estateId?: string): Promise<Outage[]>;
  createOutage(outage: InsertOutage): Promise<Outage>;

  getProviders(estateId?: string): Promise<Provider[]>;
  createProvider(provider: InsertProvider): Promise<Provider>;

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

  async getBills(userId: string, estateId?: string): Promise<Bill[]> {
    if (estateId) {
      return db.select().from(bills).where(
        and(eq(bills.userId, userId), eq(bills.estateId, estateId))
      ).orderBy(desc(bills.createdAt));
    }
    return db.select().from(bills).where(eq(bills.userId, userId)).orderBy(desc(bills.createdAt));
  }

  async createBill(bill: InsertBill): Promise<Bill> {
    const [created] = await db.insert(bills).values(bill).returning();
    return created;
  }

  async getOutages(estateId?: string): Promise<Outage[]> {
    if (estateId) {
      return db.select().from(outages).where(eq(outages.estateId, estateId)).orderBy(desc(outages.createdAt));
    }
    return db.select().from(outages).orderBy(desc(outages.createdAt));
  }

  async createOutage(outage: InsertOutage): Promise<Outage> {
    const [created] = await db.insert(outages).values(outage).returning();
    return created;
  }

  async getProviders(estateId?: string): Promise<Provider[]> {
    if (estateId) {
      return db.select().from(providers).where(eq(providers.estateId, estateId)).orderBy(desc(providers.createdAt));
    }
    return db.select().from(providers).orderBy(desc(providers.createdAt));
  }

  async createProvider(provider: InsertProvider): Promise<Provider> {
    const [created] = await db.insert(providers).values(provider).returning();
    return created;
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
