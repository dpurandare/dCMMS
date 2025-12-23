import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { documentEmbeddings } from "../db/schema";
import { sql } from "drizzle-orm";

async function main() {
  // Use local connection string for script execution
  const connectionString =
    "postgresql://dcmms_user:dcmms_password_dev@localhost:5434/dcmms";
  const client = new Client({ connectionString });

  try {
    await client.connect();
    const db = drizzle(client);
    console.log("Connected to DB.");

    // 1. Generate Mock Vector (1536 dimensions)
    const mockVector = Array(1536)
      .fill(0)
      .map(() => Math.random());
    console.log("Generated mock vector.");

    // 2. Insert Document
    // Note: Drizzle might strictly require proper mapping, but let's try direct array
    // If this fails, we might need to stringify it: JSON.stringify(mockVector) or similar
    // Postgres vector format is '[1,2,3]'
    const formattedVector = `[${mockVector.join(",")}]`;

    // We cast to any to bypass strict type checking if customType isn't perfectly inferred
    // Use a test tenant ID for spike script
    await db.insert(documentEmbeddings).values({
      content: "Spike Test Document: Solar Inverter Manual",
      tenantId: "00000000-0000-0000-0000-000000000001", // Test tenant ID
      metadata: { source: "spike_script", type: "manual" },
      embedding: formattedVector as any,
    });
    console.log("Inserted document with embedding.");

    // 3. Search (Nearest Neighbor)
    // Using Cosine Distance operator <=>
    // We search for the SAME vector, so distance should be 0
    const results = await db
      .select({
        id: documentEmbeddings.id,
        content: documentEmbeddings.content,
        distance: sql<number>`${documentEmbeddings.embedding} <=> ${formattedVector}::vector`,
      })
      .from(documentEmbeddings)
      .orderBy(
        sql`${documentEmbeddings.embedding} <=> ${formattedVector}::vector`,
      )
      .limit(1);

    console.log("Search Results:", results);

    if (results.length > 0 && Math.abs(results[0].distance) < 0.0001) {
      console.log("SUCCESS: Retrieved document with near-zero distance.");
    } else {
      console.error("FAILURE: Search did not return expected result.");
    }
  } catch (e) {
    console.error("Error:", e);
  } finally {
    await client.end();
  }
}

main();
