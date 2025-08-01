import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schemas/*.ts',
  out: './src/migrations',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
