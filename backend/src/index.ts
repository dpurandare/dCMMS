import { config } from "dotenv";
import { buildServer } from "./server";
import { autoSeedIfNeeded } from "./db/auto-seed";

// Load environment variables
config();

const PORT = parseInt(process.env.PORT || "3000", 10);
const HOST = process.env.HOST || "0.0.0.0";

async function start() {
  const server = await buildServer();

  // Auto-seed database if needed (dev/test only)
  await autoSeedIfNeeded();

  try {
    await server.listen({ port: PORT, host: HOST });
    console.log(`🚀 Server running at http://${HOST}:${PORT}`);
    console.log(`📚 API Documentation: http://${HOST}:${PORT}/docs`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

start();
