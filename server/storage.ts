import {
  type User, type InsertUser,
  type Estate, type InsertEstate,
  type UserEstate, type InsertUserEstate,
  type Bill, type InsertBill,
  type Outage, type InsertOutage,
  type Provider, type InsertProvider,
  type Review, type InsertReview,
  type SubscriptionTier,
  type ProviderSubscription, type InsertProviderSubscription,
  type ProviderVisibleEstate,
  users, estates, userEstates, bills, outages, providers, reviews,
  subscriptionTiers, providerSubscriptions, providerVisibleEstates,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, isNull, or, inArray, sql } from "drizzle-orm";
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

  getSubscriptionTiers(): Promise<SubscriptionTier[]>;
  getProviderSubscription(providerId: string): Promise<ProviderSubscription | undefined>;
  getProviderSubscriptionById(id: string): Promise<ProviderSubscription | undefined>;
  upsertProviderSubscription(sub: InsertProviderSubscription): Promise<ProviderSubscription>;
  updateProviderSubscription(id: string, data: Partial<ProviderSubscription>): Promise<ProviderSubscription>;
  getProviderVisibleEstates(providerId: string): Promise<ProviderVisibleEstate[]>;
  setProviderVisibleEstates(providerId: string, estateIds: string[]): Promise<void>;
  getProvidersByUserId(userId: string): Promise<Provider[]>;
  getVisibleProviders(estateId: string): Promise<Provider[]>;
  getDistinctCities(): Promise<string[]>;
  getDistinctProvinces(): Promise<string[]>;
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

  async getSubscriptionTiers(): Promise<SubscriptionTier[]> {
    return db.select().from(subscriptionTiers).orderBy(subscriptionTiers.sortOrder);
  }

  async getProviderSubscription(providerId: string): Promise<ProviderSubscription | undefined> {
    const [sub] = await db.select().from(providerSubscriptions).where(eq(providerSubscriptions.providerId, providerId));
    return sub;
  }

  async getProviderSubscriptionById(id: string): Promise<ProviderSubscription | undefined> {
    const [sub] = await db.select().from(providerSubscriptions).where(eq(providerSubscriptions.id, id));
    return sub;
  }

  async upsertProviderSubscription(sub: InsertProviderSubscription): Promise<ProviderSubscription> {
    const existing = await this.getProviderSubscription(sub.providerId);
    if (existing) {
      const [updated] = await db.update(providerSubscriptions)
        .set(sub)
        .where(eq(providerSubscriptions.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(providerSubscriptions).values(sub).returning();
    return created;
  }

  async updateProviderSubscription(id: string, data: Partial<ProviderSubscription>): Promise<ProviderSubscription> {
    const [updated] = await db.update(providerSubscriptions).set(data).where(eq(providerSubscriptions.id, id)).returning();
    return updated;
  }

  async getProviderVisibleEstates(providerId: string): Promise<ProviderVisibleEstate[]> {
    return db.select().from(providerVisibleEstates).where(eq(providerVisibleEstates.providerId, providerId));
  }

  async setProviderVisibleEstates(providerId: string, estateIds: string[]): Promise<void> {
    await db.delete(providerVisibleEstates).where(eq(providerVisibleEstates.providerId, providerId));
    if (estateIds.length > 0) {
      await db.insert(providerVisibleEstates).values(
        estateIds.map((estateId) => ({ providerId, estateId }))
      );
    }
  }

  async getProvidersByUserId(userId: string): Promise<Provider[]> {
    return db.select().from(providers).where(eq(providers.createdBy, userId)).orderBy(desc(providers.createdAt));
  }

  async getVisibleProviders(estateId: string): Promise<Provider[]> {
    const estate = await this.getEstate(estateId);
    if (!estate) return [];

    const directProviders = await db.select().from(providers).where(eq(providers.estateId, estateId));

    const visibleLinks = await db.select().from(providerVisibleEstates).where(eq(providerVisibleEstates.estateId, estateId));
    const visibleProviderIds = visibleLinks.map((v) => v.providerId);

    let linkedProviders: Provider[] = [];
    if (visibleProviderIds.length > 0) {
      linkedProviders = await db.select().from(providers).where(inArray(providers.id, visibleProviderIds));
    }

    const allSubs = await db.select().from(providerSubscriptions).where(eq(providerSubscriptions.status, "active"));

    const nationalProviderIds: string[] = [];
    const cityProviderIds: string[] = [];
    const provinceProviderIds: string[] = [];

    for (const sub of allSubs) {
      const tier = await db.select().from(subscriptionTiers).where(eq(subscriptionTiers.id, sub.tierId));
      if (!tier[0]) continue;
      const scopeType = tier[0].scopeType;

      if (scopeType === "national") {
        nationalProviderIds.push(sub.providerId);
      } else if (scopeType === "city" && sub.selectedCity && estate.city &&
        sub.selectedCity.toLowerCase() === estate.city.toLowerCase()) {
        cityProviderIds.push(sub.providerId);
      } else if (scopeType === "province" && sub.selectedProvince && estate.province &&
        sub.selectedProvince.toLowerCase() === estate.province.toLowerCase()) {
        provinceProviderIds.push(sub.providerId);
      }
    }

    const scopedIds = [...nationalProviderIds, ...provinceProviderIds, ...cityProviderIds];
    let scopedProviders: Provider[] = [];
    if (scopedIds.length > 0) {
      scopedProviders = await db.select().from(providers).where(inArray(providers.id, scopedIds));
    }

    const allProviders = [...directProviders, ...linkedProviders, ...scopedProviders];
    const seen = new Set<string>();
    return allProviders.filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  }

  async getDistinctCities(): Promise<string[]> {
    const result = await db.selectDistinct({ city: estates.city }).from(estates);
    return result.map((r) => r.city).filter(Boolean) as string[];
  }

  async getDistinctProvinces(): Promise<string[]> {
    const result = await db.selectDistinct({ province: estates.province }).from(estates);
    return result.map((r) => r.province).filter(Boolean) as string[];
  }
}

export const storage = new DatabaseStorage();
