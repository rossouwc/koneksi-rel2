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
  type UserProperty, type InsertUserProperty,
  type ProviderInvitation, type InsertProviderInvitation,
  type MaintAnalysis, type InsertMaintAnalysis,
  type SystemSetting,
  type MarketplaceListing, type InsertMarketplaceListing,
  users, estates, userEstates, bills, outages, providers, reviews,
  subscriptionTiers, providerSubscriptions, providerVisibleEstates,
  userProperties, providerInvitations, maintAnalyses, systemSettings,
  marketplaceListings,
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
  getUserEstates(userId: string): Promise<(Estate & { roleInEstate: string; memberApprovalStatus: string | null })[]>;
  getUserEstateIds(userId: string): Promise<string[]>;
  getAllEstates(): Promise<Estate[]>;
  createEstate(estate: InsertEstate): Promise<Estate>;

  getUserEstateLink(userId: string, estateId: string): Promise<UserEstate | undefined>;
  addUserToEstate(data: InsertUserEstate): Promise<UserEstate>;

  getBillsScoped(userId: string, estateIds: string[], estateId?: string, propertyId?: string): Promise<Bill[]>;
  createBill(bill: InsertBill): Promise<Bill>;

  getOutagesScoped(userId: string, estateIds: string[], estateId?: string, propertyId?: string): Promise<Outage[]>;
  createOutage(outage: InsertOutage): Promise<Outage>;

  getProvidersScoped(userId: string, estateIds: string[], estateId?: string): Promise<Provider[]>;
  createProvider(provider: InsertProvider): Promise<Provider>;

  updateEstate(id: string, data: { name?: string; suburb?: string | null; city?: string | null; province?: string | null; espAreaId?: string | null; espAreaName?: string | null }): Promise<Estate>;
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

  getUserProperties(userId: string): Promise<UserProperty[]>;
  createUserProperty(data: InsertUserProperty): Promise<UserProperty>;
  deleteUserProperty(id: string, userId: string): Promise<void>;
  getUserProperty(id: string): Promise<UserProperty | undefined>;
  updateUserProperty(id: string, data: { espAreaId?: string | null; espAreaName?: string | null }): Promise<UserProperty>;

  getPendingProviders(estateId: string): Promise<Provider[]>;
  approveProvider(id: string): Promise<Provider>;
  rejectProvider(id: string): Promise<void>;
  getAllRegisteredProviders(): Promise<Provider[]>;
  getProviderEstateCount(providerId: string): Promise<number>;
  canProviderBeAddedToEstate(providerId: string, estateId: string): Promise<{ allowed: boolean; reason?: string; tierName?: string }>;
  addProviderToEstate(providerId: string, estateId: string): Promise<void>;

  getProviderInvitations(estateId: string): Promise<ProviderInvitation[]>;
  createProviderInvitation(data: InsertProviderInvitation): Promise<ProviderInvitation>;
  updateProviderInvitationStatus(id: string, status: string): Promise<ProviderInvitation>;
  getProviderInvitationByToken(token: string): Promise<ProviderInvitation | undefined>;
  updateProviderInvitation(id: string, data: { status?: string; claimedByUserId?: string | null; token?: string | null }): Promise<ProviderInvitation>;
  getProviderInvitationByClaimant(userId: string, estateId: string): Promise<ProviderInvitation | undefined>;

  getSystemSettings(): Promise<SystemSetting[]>;
  getSystemSetting(key: string): Promise<string | null>;
  setSystemSetting(key: string, value: string): Promise<void>;

  getMaintAnalyses(userId: string): Promise<MaintAnalysis[]>;
  createMaintAnalysis(data: InsertMaintAnalysis): Promise<MaintAnalysis>;
  deleteMaintAnalysis(id: string, userId: string): Promise<void>;

  createMarketplaceListing(data: InsertMarketplaceListing): Promise<MarketplaceListing>;
  getMyMarketplaceListings(providerId: string): Promise<MarketplaceListing[]>;
  updateMarketplaceListing(id: string, providerId: string, data: Partial<InsertMarketplaceListing>): Promise<MarketplaceListing>;
  deleteMarketplaceListing(id: string, providerId: string): Promise<boolean>;
  getEstateMarketplaceListings(estateIds: string[]): Promise<(MarketplaceListing & { providerName: string; providerCategory: string; providerPhone: string | null; providerWhatsapp: string | null; providerEmail: string | null; providerWebsite: string | null; providerLogoUrl: string | null })[]>;
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

  async getUserEstates(userId: string): Promise<(Estate & { roleInEstate: string; memberApprovalStatus: string | null })[]> {
    const links = await db.select().from(userEstates).where(eq(userEstates.userId, userId));
    if (links.length === 0) return [];
    const result: (Estate & { roleInEstate: string; memberApprovalStatus: string | null })[] = [];
    for (const link of links) {
      const [estate] = await db.select().from(estates).where(eq(estates.id, link.estateId));
      if (estate) result.push({ ...estate, roleInEstate: link.roleInEstate, memberApprovalStatus: link.approvalStatus });
    }
    return result;
  }

  async getUserEstateIds(userId: string): Promise<string[]> {
    const links = await db.select({ estateId: userEstates.estateId, approvalStatus: userEstates.approvalStatus }).from(userEstates).where(eq(userEstates.userId, userId));
    return links.filter((l) => l.approvalStatus === "approved").map((l) => l.estateId);
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

  async getBillsScoped(userId: string, estateIds: string[], estateId?: string, propertyId?: string): Promise<Bill[]> {
    if (propertyId) {
      return db.select().from(bills).where(and(eq(bills.userId, userId), eq(bills.propertyId, propertyId))).orderBy(desc(bills.createdAt));
    }
    if (estateId) {
      return db.select().from(bills).where(eq(bills.estateId, estateId)).orderBy(desc(bills.createdAt));
    }
    const conditions = [
      and(eq(bills.userId, userId), isNull(bills.estateId), isNull(bills.propertyId)),
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

  async getOutagesScoped(userId: string, estateIds: string[], estateId?: string, propertyId?: string): Promise<Outage[]> {
    if (propertyId) {
      return db.select().from(outages).where(and(eq(outages.userId, userId), eq(outages.propertyId, propertyId))).orderBy(desc(outages.createdAt));
    }
    if (estateId) {
      return db.select().from(outages).where(eq(outages.estateId, estateId)).orderBy(desc(outages.createdAt));
    }
    if (estateIds.length > 0) {
      return db.select().from(outages).where(
        or(
          inArray(outages.estateId, estateIds),
          and(eq(outages.userId, userId), isNull(outages.estateId), isNull(outages.propertyId))
        )
      ).orderBy(desc(outages.createdAt));
    }
    return db.select().from(outages).where(
      and(eq(outages.userId, userId), isNull(outages.estateId), isNull(outages.propertyId))
    ).orderBy(desc(outages.createdAt));
  }

  async createOutage(outage: InsertOutage): Promise<Outage> {
    const [created] = await db.insert(outages).values(outage).returning();
    return created;
  }

  async getProvidersScoped(userId: string, estateIds: string[], estateId?: string): Promise<Provider[]> {
    if (estateId) {
      return db.select().from(providers).where(and(eq(providers.estateId, estateId), eq(providers.providerApprovalStatus, "approved"))).orderBy(desc(providers.createdAt));
    }
    if (estateIds.length > 0) {
      return db.select().from(providers).where(and(inArray(providers.estateId, estateIds), eq(providers.providerApprovalStatus, "approved"))).orderBy(desc(providers.createdAt));
    }
    return [];
  }

  async createProvider(provider: InsertProvider): Promise<Provider> {
    const [created] = await db.insert(providers).values(provider).returning();
    return created;
  }

  async updateEstate(id: string, data: { name?: string; suburb?: string | null; city?: string | null; province?: string | null; espAreaId?: string | null; espAreaName?: string | null }): Promise<Estate> {
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

    const directProviders = await db.select().from(providers).where(and(eq(providers.estateId, estateId), eq(providers.providerApprovalStatus, "approved")));

    const visibleLinks = await db.select().from(providerVisibleEstates).where(eq(providerVisibleEstates.estateId, estateId));
    const visibleProviderIds = visibleLinks.map((v) => v.providerId);

    let linkedProviders: Provider[] = [];
    if (visibleProviderIds.length > 0) {
      linkedProviders = await db.select().from(providers).where(and(inArray(providers.id, visibleProviderIds), eq(providers.providerApprovalStatus, "approved")));
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
      scopedProviders = await db.select().from(providers).where(and(inArray(providers.id, scopedIds), eq(providers.providerApprovalStatus, "approved")));
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

  async getUserProperties(userId: string): Promise<UserProperty[]> {
    return db.select().from(userProperties).where(eq(userProperties.userId, userId)).orderBy(desc(userProperties.createdAt));
  }

  async createUserProperty(data: InsertUserProperty): Promise<UserProperty> {
    const [created] = await db.insert(userProperties).values(data).returning();
    return created;
  }

  async deleteUserProperty(id: string, userId: string): Promise<void> {
    await db.delete(userProperties).where(and(eq(userProperties.id, id), eq(userProperties.userId, userId)));
  }

  async getUserProperty(id: string): Promise<UserProperty | undefined> {
    const [prop] = await db.select().from(userProperties).where(eq(userProperties.id, id));
    return prop;
  }

  async updateUserProperty(id: string, data: { espAreaId?: string | null; espAreaName?: string | null }): Promise<UserProperty> {
    const [updated] = await db.update(userProperties).set(data).where(eq(userProperties.id, id)).returning();
    return updated;
  }

  async getPendingProviders(estateId: string): Promise<Provider[]> {
    return db.select().from(providers).where(and(eq(providers.estateId, estateId), eq(providers.providerApprovalStatus, "pending"))).orderBy(desc(providers.createdAt));
  }

  async approveProvider(id: string): Promise<Provider> {
    const [updated] = await db.update(providers).set({ providerApprovalStatus: "approved" }).where(eq(providers.id, id)).returning();
    return updated;
  }

  async rejectProvider(id: string): Promise<void> {
    await db.delete(providers).where(eq(providers.id, id));
  }

  async getProviderEstateCount(providerId: string): Promise<number> {
    const linkedEstates = await db.select().from(providerVisibleEstates).where(eq(providerVisibleEstates.providerId, providerId));
    const estateIds = new Set(linkedEstates.map(l => l.estateId));
    return estateIds.size;
  }

  async getCanonicalProviderId(providerId: string): Promise<string> {
    const provider = await this.getProvider(providerId);
    if (!provider || !provider.createdBy) return providerId;
    const [canonical] = await db.select().from(providers).where(and(
      eq(providers.createdBy, provider.createdBy),
      eq(providers.providerApprovalStatus, "approved"),
      sql`${providers.estateId} IS NULL`
    )).limit(1);
    return canonical ? canonical.id : providerId;
  }

  async canProviderBeAddedToEstate(providerId: string, estateId: string): Promise<{ allowed: boolean; reason?: string; tierName?: string }> {
    const canonicalId = await this.getCanonicalProviderId(providerId);
    const sub = await this.getProviderSubscription(canonicalId);
    if (!sub) {
      return { allowed: false, reason: "Provider has no active subscription", tierName: "None" };
    }
    const tiers = await this.getSubscriptionTiers();
    const tier = tiers.find(t => t.id === sub.tierId);
    if (!tier) {
      return { allowed: false, reason: "Invalid subscription tier" };
    }

    const estate = await this.getEstate(estateId);

    if (tier.scopeType === "national") {
      return { allowed: true, tierName: tier.name };
    }

    if (tier.scopeType === "province") {
      if (!sub.selectedProvince || !estate?.province) {
        return { allowed: false, reason: "Province scope requires a selected province", tierName: tier.name };
      }
      if (sub.selectedProvince.toLowerCase() !== estate.province.toLowerCase()) {
        return { allowed: false, reason: `Provider covers ${sub.selectedProvince} only, not ${estate.province}`, tierName: tier.name };
      }
      return { allowed: true, tierName: tier.name };
    }

    if (tier.scopeType === "city") {
      if (!sub.selectedCity || !estate?.city) {
        return { allowed: false, reason: "City scope requires a selected city", tierName: tier.name };
      }
      if (sub.selectedCity.toLowerCase() !== estate.city.toLowerCase()) {
        return { allowed: false, reason: `Provider covers ${sub.selectedCity} only, not ${estate.city}`, tierName: tier.name };
      }
      return { allowed: true, tierName: tier.name };
    }

    if (tier.scopeType === "estate" && tier.maxEstates) {
      const currentCount = await this.getProviderEstateCount(canonicalId);
      if (currentCount >= tier.maxEstates) {
        return { allowed: false, reason: `Provider is on the ${tier.name} plan (max ${tier.maxEstates} estate${tier.maxEstates > 1 ? 's' : ''}). They need to upgrade to be added to more estates.`, tierName: tier.name };
      }
      return { allowed: true, tierName: tier.name };
    }

    return { allowed: false, reason: "Provider subscription doesn't support estate visibility" };
  }

  async getAllRegisteredProviders(): Promise<Provider[]> {
    return db.select().from(providers).where(and(
      sql`${providers.createdBy} IS NOT NULL`,
      eq(providers.providerApprovalStatus, "approved")
    )).orderBy(desc(providers.createdAt));
  }

  async addProviderToEstate(providerId: string, estateId: string): Promise<void> {
    const existing = await db.select().from(providerVisibleEstates).where(and(
      eq(providerVisibleEstates.providerId, providerId),
      eq(providerVisibleEstates.estateId, estateId)
    ));
    if (existing.length === 0) {
      await db.insert(providerVisibleEstates).values({ providerId, estateId });
    }
  }

  async getProviderInvitations(estateId: string): Promise<ProviderInvitation[]> {
    return db.select().from(providerInvitations).where(eq(providerInvitations.estateId, estateId)).orderBy(desc(providerInvitations.createdAt));
  }

  async createProviderInvitation(data: InsertProviderInvitation): Promise<ProviderInvitation> {
    const [created] = await db.insert(providerInvitations).values({ ...data, statusUpdatedAt: new Date() }).returning();
    return created;
  }

  async updateProviderInvitationStatus(id: string, status: string): Promise<ProviderInvitation> {
    const [updated] = await db.update(providerInvitations).set({ status, statusUpdatedAt: new Date() }).where(eq(providerInvitations.id, id)).returning();
    return updated;
  }

  async getProviderInvitationByToken(token: string): Promise<ProviderInvitation | undefined> {
    const [inv] = await db.select().from(providerInvitations).where(eq(providerInvitations.token, token));
    return inv;
  }

  async updateProviderInvitation(id: string, data: { status?: string; claimedByUserId?: string | null; token?: string | null }): Promise<ProviderInvitation> {
    const [updated] = await db.update(providerInvitations).set({ ...data, statusUpdatedAt: new Date() }).where(eq(providerInvitations.id, id)).returning();
    return updated;
  }

  async getProviderInvitationByClaimant(userId: string, estateId: string): Promise<ProviderInvitation | undefined> {
    const [inv] = await db.select().from(providerInvitations).where(
      and(eq(providerInvitations.claimedByUserId, userId), eq(providerInvitations.estateId, estateId))
    );
    return inv;
  }

  async getSystemSettings(): Promise<SystemSetting[]> {
    return db.select().from(systemSettings);
  }

  async getSystemSetting(key: string): Promise<string | null> {
    const [row] = await db.select().from(systemSettings).where(eq(systemSettings.key, key));
    return row?.value ?? null;
  }

  async setSystemSetting(key: string, value: string): Promise<void> {
    await db.insert(systemSettings).values({ key, value }).onConflictDoUpdate({ target: systemSettings.key, set: { value } });
  }

  async getMaintAnalyses(userId: string): Promise<MaintAnalysis[]> {
    return db
      .select()
      .from(maintAnalyses)
      .where(eq(maintAnalyses.userId, userId))
      .orderBy(desc(maintAnalyses.createdAt));
  }

  async createMaintAnalysis(data: InsertMaintAnalysis): Promise<MaintAnalysis> {
    const [created] = await db.insert(maintAnalyses).values(data).returning();
    return created;
  }

  async deleteMaintAnalysis(id: string, userId: string): Promise<void> {
    await db
      .delete(maintAnalyses)
      .where(and(eq(maintAnalyses.id, id), eq(maintAnalyses.userId, userId)));
  }

  async createMarketplaceListing(data: InsertMarketplaceListing): Promise<MarketplaceListing> {
    const [created] = await db.insert(marketplaceListings).values(data).returning();
    return created;
  }

  async getMyMarketplaceListings(providerId: string): Promise<MarketplaceListing[]> {
    return db.select().from(marketplaceListings)
      .where(eq(marketplaceListings.providerId, providerId))
      .orderBy(desc(marketplaceListings.createdAt));
  }

  async updateMarketplaceListing(id: string, providerId: string, data: Partial<InsertMarketplaceListing>): Promise<MarketplaceListing> {
    const [updated] = await db.update(marketplaceListings)
      .set(data)
      .where(and(eq(marketplaceListings.id, id), eq(marketplaceListings.providerId, providerId)))
      .returning();
    return updated;
  }

  async deleteMarketplaceListing(id: string, providerId: string): Promise<boolean> {
    const rows = await db.delete(marketplaceListings)
      .where(and(eq(marketplaceListings.id, id), eq(marketplaceListings.providerId, providerId)))
      .returning({ id: marketplaceListings.id });
    return rows.length > 0;
  }

  async getEstateMarketplaceListings(estateIds: string[]): Promise<(MarketplaceListing & { providerName: string; providerCategory: string; providerPhone: string | null; providerWhatsapp: string | null; providerEmail: string | null; providerWebsite: string | null; providerLogoUrl: string | null })[]> {
    if (estateIds.length === 0) return [];

    const visibleLinks = await db.select().from(providerVisibleEstates)
      .where(inArray(providerVisibleEstates.estateId, estateIds));
    const linkedProviderIdsUnfiltered = visibleLinks.map((v) => v.providerId);

    let linkedProviderIds: string[] = [];
    if (linkedProviderIdsUnfiltered.length > 0) {
      const approvedLinked = await db.select({ id: providers.id }).from(providers)
        .where(and(inArray(providers.id, linkedProviderIdsUnfiltered), eq(providers.providerApprovalStatus, "approved")));
      linkedProviderIds = approvedLinked.map((p) => p.id);
    }

    const directProviders = await db.select().from(providers)
      .where(and(inArray(providers.estateId, estateIds), eq(providers.providerApprovalStatus, "approved")));
    const directProviderIds = directProviders.map((p) => p.id);

    const combined = [...linkedProviderIds, ...directProviderIds];
    const allProviderIds = combined.filter((id, idx) => combined.indexOf(id) === idx);
    if (allProviderIds.length === 0) return [];

    const listings = await db.select().from(marketplaceListings)
      .where(and(
        inArray(marketplaceListings.providerId, allProviderIds),
        eq(marketplaceListings.isActive, true)
      ))
      .orderBy(desc(marketplaceListings.createdAt));

    const providerMap = new Map<string, Provider>();
    const allProviderRows = await db.select().from(providers).where(inArray(providers.id, allProviderIds));
    for (const p of allProviderRows) providerMap.set(p.id, p);

    const creatorIds = [...new Set(allProviderRows.map((p) => p.createdBy).filter(Boolean))] as string[];
    const creatorUsers = creatorIds.length > 0
      ? await db.select({ id: users.id, avatarUrl: users.avatarUrl }).from(users).where(inArray(users.id, creatorIds))
      : [];
    const creatorMap = new Map(creatorUsers.map((u) => [u.id, u.avatarUrl]));

    return listings.map((listing) => {
      const provider = providerMap.get(listing.providerId);
      return {
        ...listing,
        providerName: provider?.name ?? "Unknown",
        providerCategory: provider?.category ?? "",
        providerPhone: provider?.phone ?? null,
        providerWhatsapp: provider?.whatsapp ?? null,
        providerEmail: provider?.email ?? null,
        providerWebsite: provider?.website ?? null,
        providerLogoUrl: provider?.createdBy ? (creatorMap.get(provider.createdBy) ?? null) : null,
      };
    });
  }
}

export const storage = new DatabaseStorage();
