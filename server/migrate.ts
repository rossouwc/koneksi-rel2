import { db } from "./db";
import { sql } from "drizzle-orm";

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
}
