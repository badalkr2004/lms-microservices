// src/utils/file.utils.ts
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

/**
 * Sanitize filename to remove potentially dangerous characters
 */
export const sanitizeFilename = (filename: string): string => {
  // Remove path traversal attempts and dangerous characters
  return filename
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .replace(/^\.+/, '') // Remove leading dots
    .substring(0, 255); // Limit length
};

/**
 * Generate unique filename with timestamp and UUID
 */
export const generateUniqueFilename = (originalFilename: string): string => {
  const ext = path.extname(originalFilename);
  const basename = path.basename(originalFilename, ext);
  const sanitizedBasename = sanitizeFilename(basename);
  const timestamp = Date.now();
  const uuid = uuidv4().split('-')[0]; // Use first part of UUID for brevity
  
  return `${sanitizedBasename}_${timestamp}_${uuid}${ext}`;
};

/**
 * Get file extension from filename or mimetype
 */
export const getFileExtension = (filename: string, mimeType?: string): string => {
  const ext = path.extname(filename);
  if (ext) return ext;
  
  // Fallback to mimetype mapping
  const mimeToExt: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
  };
  
  return mimeType ? mimeToExt[mimeType] || '' : '';
};

/**
 * Format file size to human readable format
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Validate image file type
 */
export const isValidImageType = (mimeType: string): boolean => {
  const validTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp'
  ];
  return validTypes.includes(mimeType.toLowerCase());
};

/**
 * Generate S3 folder structure
 */
export const generateS3FolderPath = (
  userId: string, 
  category: string, 
  date: Date = new Date()
): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  
  return `uploads/${category}/${userId}/${year}/${month}`;
};
