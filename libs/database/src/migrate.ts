import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db, connection } from './index';
import { logger } from '@lms/logger';

async function runMigration() {
  try {
    logger.info('Starting database migration...');
    
    await migrate(db, { migrationsFolder: './migrations' });
    
    logger.info('Database migration completed successfully');
  } catch (error) {
    logger.error('Error running database migration:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

runMigration();
