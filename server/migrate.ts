import { db } from "./db";
import { sql, eq } from "drizzle-orm";
import { users } from "@shared/schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function runMigrations(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS marketplace_listings (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      provider_id varchar NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
      title text NOT NULL,
      description text NOT NULL,
      listing_type text NOT NULL DEFAULT 'promotion',
      image_url text,
      additional_photos text[] DEFAULT '{}',
      price integer,
      original_price integer,
      valid_from timestamp,
      valid_until timestamp,
      cta_type text NOT NULL DEFAULT 'call',
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamp NOT NULL DEFAULT now()
    )
  `);

  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE resident_invite_status AS ENUM ('pending', 'joined');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS resident_invites (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      estate_id varchar NOT NULL REFERENCES estates(id) ON DELETE CASCADE,
      invited_by_user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name text NOT NULL,
      email text NOT NULL,
      phone text,
      status resident_invite_status NOT NULL DEFAULT 'pending',
      created_at timestamp NOT NULL DEFAULT now()
    )
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_resident_invites_estate ON resident_invites(estate_id)
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_resident_invites_email ON resident_invites(email)
  `);

  if (process.env.NODE_ENV === "production") {
    await upsertProductionSuperAdmin();
  }
}

async function upsertProductionSuperAdmin(): Promise<void> {
  const email = "koneksi@hoolio.co.za";
  const password = await hashPassword("p@ssw0rd2026");

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email));

  if (existing.length > 0) {
    await db.update(users)
      .set({ password, isSuperAdmin: true, role: "super_admin", fullName: "Koneksi Admin", profileComplete: true })
      .where(eq(users.email, email));
    console.log("[migrate] Production super admin password refreshed");
  } else {
    await db.insert(users).values({
      email,
      password,
      fullName: "Koneksi Admin",
      role: "super_admin",
      isSuperAdmin: true,
      profileComplete: true,
    });
    console.log("[migrate] Production super admin created");
  }
}
