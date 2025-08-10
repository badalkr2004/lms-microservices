import dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/node-postgres';

// Load environment variables
dotenv.config();

// Database connection
const connectionString =
  process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/lms_db';

// For migrations and queries
// export const connection = postgres(connectionString);

// For drizzle
export const db = drizzle(connectionString);

// Export schemas
export * from './schemas/users';
