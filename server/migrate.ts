import { db } from "./db";
import { sql } from "drizzle-orm";
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

  const existing = await db.execute(
    sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`
  );

  if (existing.rows.length > 0) {
    const id = (existing.rows[0] as any).id;
    await db.execute(sql`
      UPDATE users SET
        password = ${password},
        is_super_admin = true,
        role = 'super_admin',
        full_name = 'Koneksi Admin',
        profile_complete = true
      WHERE id = ${id}
    `);
    console.log("[migrate] Production super admin password updated");
  } else {
    const id = (await db.execute(sql`SELECT gen_random_uuid() as id`)).rows[0] as any;
    await db.execute(sql`
      INSERT INTO users (id, email, password, full_name, role, is_super_admin, profile_complete, created_at)
      VALUES (${id.id}, ${email}, ${password}, 'Koneksi Admin', 'super_admin', true, true, now())
    `);
    console.log("[migrate] Production super admin created");
  }
}
