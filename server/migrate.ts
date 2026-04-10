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
      price integer,
      original_price integer,
      valid_from timestamp,
      valid_until timestamp,
      cta_type text NOT NULL DEFAULT 'call',
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamp NOT NULL DEFAULT now()
    )
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
