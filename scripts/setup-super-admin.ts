/**
 * Setup Super-Admin Script
 *
 * This script sets the isSuperAdmin flag for users specified in the
 * SUPER_ADMIN_EMAILS environment variable.
 *
 * Usage:
 *   npx tsx scripts/setup-super-admin.ts
 *
 * Environment Variables:
 *   SUPER_ADMIN_EMAILS - Comma-separated list of email addresses
 *                        Example: "admin@example.com,owner@example.com"
 *
 *   DATABASE_URL - Turso database URL
 *   DATABASE_AUTH_TOKEN - Turso auth token
 */

import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { eq } from "drizzle-orm";
import * as schema from "../src/lib/schema";

async function main() {
  // Check environment variables
  const superAdminEmails = process.env.SUPER_ADMIN_EMAILS;
  const databaseUrl = process.env.DATABASE_URL;
  const databaseAuthToken = process.env.DATABASE_AUTH_TOKEN;

  if (!superAdminEmails) {
    console.error("Error: SUPER_ADMIN_EMAILS environment variable is not set");
    console.log("\nUsage:");
    console.log(
      '  SUPER_ADMIN_EMAILS="admin@example.com" npx tsx scripts/setup-super-admin.ts'
    );
    process.exit(1);
  }

  if (!databaseUrl) {
    console.error("Error: DATABASE_URL environment variable is not set");
    process.exit(1);
  }

  // Parse email addresses
  const emails = superAdminEmails
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0);

  if (emails.length === 0) {
    console.error("Error: No valid email addresses provided");
    process.exit(1);
  }

  console.log("🔐 Super-Admin Setup Script");
  console.log("===========================\n");
  console.log(`Processing ${emails.length} email(s):`);
  emails.forEach((e) => console.log(`  - ${e}`));
  console.log("");

  // Connect to database
  const client = createClient({
    url: databaseUrl,
    authToken: databaseAuthToken,
  });

  const db = drizzle(client, { schema });

  // Process each email
  let updated = 0;
  let notFound = 0;
  let alreadyAdmin = 0;

  for (const email of emails) {
    const user = await db.query.users.findFirst({
      where: eq(schema.users.email, email),
    });

    if (!user) {
      console.log(`❌ User not found: ${email}`);
      notFound++;
      continue;
    }

    if (user.isSuperAdmin) {
      console.log(`✓ Already Super-Admin: ${email}`);
      alreadyAdmin++;
      continue;
    }

    // Update user to Super-Admin
    await db
      .update(schema.users)
      .set({ isSuperAdmin: true })
      .where(eq(schema.users.id, user.id));

    console.log(`✅ Set as Super-Admin: ${email}`);
    updated++;
  }

  // Summary
  console.log("\n===========================");
  console.log("Summary:");
  console.log(`  ✅ Updated: ${updated}`);
  console.log(`  ✓ Already admin: ${alreadyAdmin}`);
  console.log(`  ❌ Not found: ${notFound}`);
  console.log("");

  if (notFound > 0) {
    console.log(
      "Note: Users not found must register first before being set as Super-Admin."
    );
  }

  await client.close();
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
