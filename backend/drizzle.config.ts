import { defineConfig } from 'drizzle-kit';
import { config } from 'dotenv';

config();

// drizzle-kit 0.31 replaced `driver: 'pg'` + `connectionString` with
// `dialect: 'postgresql'` + `url` (REV-023).
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
