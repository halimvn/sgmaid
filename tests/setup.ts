// Loads .env into process.env for every test file — needed by
// tests/maids-integration.test.ts, which runs real Prisma queries
// against the development database (DATABASE_URL). Vitest does not load
// dotenv automatically.
import "dotenv/config";
