import { db } from "./index";
import { tenants } from "./schema";

/**
 * Automatically seed the database if it's empty and auto-seed is enabled
 * Only runs in development/test environments
 */
export async function autoSeedIfNeeded() {
    const environment = process.env.NODE_ENV || "development";
    const autoSeed = process.env.AUTO_SEED === "true";
    const allowedEnvironments = ["development", "test", "local"];

    // Skip if not enabled or not in allowed environment
    if (!allowedEnvironments.includes(environment) || !autoSeed) {
        return;
    }

    console.log("🔍 Checking if database needs seeding...");

    try {
        // Check if database already has data
        const existingTenants = await db.select().from(tenants).limit(1);

        if (existingTenants.length === 0) {
            console.log("📥 No data found. Running automatic seed...");
            const { seed } = await import("./seed");
            await seed();
        } else {
            console.log("✓ Database already contains data. Skipping auto-seed.");
        }
    } catch (error) {
        console.warn("⚠️ Could not check/seed database:", error);
        // Don't throw - allow app to start even if seeding fails
    }
}
