/**
 * Update existing free plan teams to new limits (50 MB storage)
 * Run with: npx tsx scripts/update-free-plan-limits.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  console.log("DATABASE_URL:", process.env.DATABASE_URL ? "SET" : "NOT SET");

  // Dynamic import after env vars are loaded
  const { db } = await import("../src/lib/db");
  const { teams } = await import("../src/lib/schema");
  const { eq } = await import("drizzle-orm");

  console.log("Updating free plan teams to 50 MB storage limit...");

  // Get all free plan teams
  const freeTeams = await db.query.teams.findMany({
    where: eq(teams.plan, "free"),
  });

  console.log(`Found ${freeTeams.length} free plan team(s)`);

  for (const team of freeTeams) {
    console.log(`- Updating team "${team.name}" (${team.id})`);
    console.log(`  Current: maxStorageMb=${team.maxStorageMb}`);

    await db
      .update(teams)
      .set({
        maxStorageMb: 50,
      })
      .where(eq(teams.id, team.id));

    console.log(`  Updated: maxStorageMb=50`);
  }

  console.log("\nDone!");
  process.exit(0);
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
