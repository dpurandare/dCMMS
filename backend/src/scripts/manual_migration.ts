import { Client } from "pg";

async function main() {
    const connectionString = "postgresql://dcmms_user:dcmms_password_dev@localhost:5434/dcmms";
    const client = new Client({ connectionString });
    try {
        await client.connect();
        console.log("Connected. Creating table...");
        await client.query(`
      CREATE TABLE IF NOT EXISTS document_embeddings (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        content text NOT NULL,
        metadata jsonb,
        embedding vector(1536),
        created_at timestamp DEFAULT now() NOT NULL
      );
    `);
        console.log("Table created.");
    } catch (e) {
        console.error("Error:", e);
        process.exit(1);
    } finally {
        await client.end();
    }
}
main();
