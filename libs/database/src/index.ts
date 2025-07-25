import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Database connection
const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/lms_db';

// For migrations and queries
export const connection = postgres(connectionString);

// For drizzle
export const db = drizzle(connection);

// Export schemas
export * from './schemas';
