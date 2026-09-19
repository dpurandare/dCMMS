import { db } from "./index";
import { tenants } from "./schema";

/**
 * Automatically seed the database if it's empty and auto-seed is enabled
 * Only runs in development/test environments
 */
/** Seeding writes known credentials, so it may only ever run here. */
const SEEDABLE_ENVIRONMENTS = ["development", "test", "local"];

export async function autoSeedIfNeeded() {
    const environment = process.env.NODE_ENV;
    const autoSeed = process.env.AUTO_SEED === "true";

    // Fail closed. This used to default an unset NODE_ENV to "development",
    // which meant a deployment that simply forgot to set it — and had
    // AUTO_SEED=true, as .env.example ships — would seed itself with the
    // documented test credentials (REV-016).
    if (environment === undefined) {
        if (autoSeed) {
            console.warn(
                "⚠️ AUTO_SEED=true but NODE_ENV is not set — refusing to seed. " +
                    `Set NODE_ENV to one of: ${SEEDABLE_ENVIRONMENTS.join(", ")}.`,
            );
        }
        return;
    }

    if (!SEEDABLE_ENVIRONMENTS.includes(environment) || !autoSeed) {
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
