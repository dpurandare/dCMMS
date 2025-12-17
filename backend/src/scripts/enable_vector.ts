import { Client } from "pg";

async function main() {
    const connectionString = "postgresql://dcmms_user:dcmms_password_dev@localhost:5434/dcmms";
    const client = new Client({ connectionString });
    try {
        await client.connect();
        console.log("Connected. Checking extensions...");
        const res = await client.query("SELECT * FROM pg_extension;");
        console.log("Extensions:", res.rows.map(r => r.extname));

        // Attempt to create if missing (redundant but safe)
        if (!res.rows.find(r => r.extname === 'vector')) {
            console.log("Vector not found. Creating...");
            await client.query("CREATE EXTENSION IF NOT EXISTS vector;");
        }
    } catch (e) {
        console.error("Error:", e);
        process.exit(1);
    } finally {
        await client.end();
    }
}
main();
