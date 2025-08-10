import dotenv from 'dotenv';
dotenv.config();
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schemas', // Folder with your schema files
  out: './src/migrations', // Output for generated migrations
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },

  strict: true,
  verbose: true,
});
