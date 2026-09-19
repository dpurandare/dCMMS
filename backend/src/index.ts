// Must stay first: loads .env and fails the process if a required secret is
// missing, before any other module runs its import-time side effects (REV-001).
import "./config/boot";
import { buildServer } from "./server";
import { autoSeedIfNeeded } from "./db/auto-seed";

const PORT = parseInt(process.env.APP_PORT || process.env.PORT || "3100", 10);
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
