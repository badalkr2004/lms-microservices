// src/repositories/file.repository.ts
// import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, and, desc, count } from 'drizzle-orm';
// import { Pool } from 'pg';
import { 
  files, 
  fileUploadSessions, 
  File, 
  NewFile, 
  FileUploadSession, 
  NewFileUploadSession, 
  db
} from "@lms/database"

export class FileRepository {
  private db;
//   private pool: Pool;

  constructor() {
    // this.pool = new Pool({
    //   connectionString: config.DATABASE_URL,
    //   max: 20,
    //   idleTimeoutMillis: 30000,
    //   connectionTimeoutMillis: 2000,
    // });
    // this.db = drizzle(this.pool);
    this.db = db
  }

  /**
   * Create a new file record
   */
  async createFile(fileData: NewFile): Promise<File> {
    const [file] = await this.db
      .insert(files)
      .values(fileData)
      .returning();
    
    return file;
  }

  /**
   * Get file by ID
   */
  async getFileById(id: string): Promise<File | undefined> {
    const [file] = await this.db
      .select()
      .from(files)
      .where(and(
        eq(files.id, id),
        eq(files.isActive, true)
      ));
    
    return file;
  }

  /**
   * Get file by S3 key
   */
  async getFileByS3Key(s3Key: string): Promise<File | undefined> {
    const [file] = await this.db
      .select()
      .from(files)
      .where(and(
        eq(files.s3Key, s3Key),
        eq(files.isActive, true)
      ));
    
    return file;
  }

  /**
   * Get files by user ID
   */
  async getFilesByUserId(
    userId: string, 
    category?: string, 
    limit: number = 50, 
    offset: number = 0
  ): Promise<File[]> {
    const conditions = [
      eq(files.userId, userId),
      eq(files.isActive, true)
    ];

    if (category) {
      conditions.push(eq(files.category, category));
    }

    return await this.db
      .select()
      .from(files)
      .where(and(...conditions))
      .orderBy(desc(files.uploadedAt))
      .limit(limit)
      .offset(offset);
  }

  /**
   * Update file record
   */
  async updateFile(id: string, updateData: Partial<NewFile>): Promise<File | undefined> {
    const [file] = await this.db
      .update(files)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(files.id, id))
      .returning();
    
    return file;
  }

  /**
   * Soft delete file
   */
  async deleteFile(id: string): Promise<boolean> {
    const [file] = await this.db
      .update(files)
      .set({ 
        isActive: false, 
        updatedAt: new Date(),
        status: 'deleted'
      })
      .where(eq(files.id, id))
      .returning();
    
    return !!file;
  }

  /**
   * Get file count by user
   */
  async getFileCountByUser(userId: string, category?: string): Promise<number> {
    const conditions = [
      eq(files.userId, userId),
      eq(files.isActive, true)
    ];

    if (category) {
      conditions.push(eq(files.category, category));
    }

    const [result] = await this.db
      .select({ count: count() })
      .from(files)
      .where(and(...conditions));
    
    return result.count;
  }

  /**
   * Create upload session
   */
  async createUploadSession(sessionData: NewFileUploadSession): Promise<FileUploadSession> {
    const [session] = await this.db
      .insert(fileUploadSessions)
      .values(sessionData)
      .returning();
    
    return session;
  }

  /**
   * Get upload session by ID
   */
  async getUploadSessionById(id: string): Promise<FileUploadSession | undefined> {
    const [session] = await this.db
      .select()
      .from(fileUploadSessions)
      .where(eq(fileUploadSessions.id, id));
    
    return session;
  }

  /**
   * Mark upload session as used
   */
  async markUploadSessionUsed(id: string): Promise<FileUploadSession | undefined> {
    const [session] = await this.db
      .update(fileUploadSessions)
      .set({ 
        isUsed: true,
        completedAt: new Date()
      })
      .where(eq(fileUploadSessions.id, id))
      .returning();
    
    return session;
  }

  /**
   * Clean up expired upload sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.db
      .delete(fileUploadSessions)
      .where(and(
        eq(fileUploadSessions.isUsed, false),
        // Sessions expired more than 1 hour ago
        eq(fileUploadSessions.expiresAt, new Date(Date.now() - 3600000))
      ));
    
    return result.rowCount || 0;
  }

  /**
   * Get user storage usage
   */
  async getUserStorageUsage(userId: string): Promise<{
    totalFiles: number;
    totalSize: number;
    categories: Record<string, { count: number; size: number }>;
  }> {
    const userFiles = await this.db
      .select()
      .from(files)
      .where(and(
        eq(files.userId, userId),
        eq(files.isActive, true)
      ));

    const totalFiles = userFiles.length;
    const totalSize = userFiles.reduce((sum, file) => sum + file.fileSize, 0);
    
    const categories: Record<string, { count: number; size: number }> = {};
    
    userFiles.forEach(file => {
      if (!categories[file.category]) {
        categories[file.category] = { count: 0, size: 0 };
      }
      categories[file.category].count++;
      categories[file.category].size += file.fileSize;
    });

    return {
      totalFiles,
      totalSize,
      categories,
    };
  }

  /**
   * Close database connection
   */
//   async close(): Promise<void> {

//     // await this.pool.end();
//   }
}