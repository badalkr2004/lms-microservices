// src/services/s3.service.ts
import { 
  S3Client, 
  PutObjectCommand, 
  GetObjectCommand, 
  DeleteObjectCommand,
  HeadObjectCommand 
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { awsConfig, fileConfig } from '../config';
import { FileErrorCode } from '../types';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

export class S3Service {
  private s3Client: S3Client;
  private bucket: string;

  constructor() {
    this.s3Client = new S3Client({
      region: awsConfig.region,
      credentials: awsConfig.credentials,
    });
    this.bucket = awsConfig.bucket;
  }

  /**
   * Generate S3 key for file
   */
  generateS3Key(userId: string, category: string, fileName: string): string {
    const timestamp = Date.now();
    const uuid = uuidv4();
    const extension = path.extname(fileName);
    const baseName = path.basename(fileName, extension);
    
    // Clean filename
    const cleanBaseName = baseName.replace(/[^a-zA-Z0-9.-]/g, '_');
    
    return `uploads/${category}/${userId}/${timestamp}_${uuid}_${cleanBaseName}${extension}`;
  }

  /**
   * Generate presigned URL for file upload
   */
  async generatePresignedUploadUrl(
    s3Key: string,
    fileType: string,
    fileSize: number
  ): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: s3Key,
        ContentType: fileType,
        ContentLength: fileSize,
        Metadata: {
          'uploaded-by': 'lms-file-service',
          'upload-timestamp': Date.now().toString(),
        },
      });

      const presignedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: fileConfig.presignedUrlExpiry,
      });

      return presignedUrl;
    } catch (error) {
      console.error('Error generating presigned URL:', error);
      throw new Error(FileErrorCode.S3_ERROR);
    }
  }

  /**
   * Generate presigned URL for file download
   */
  async generatePresignedDownloadUrl(s3Key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: s3Key,
      });

      const presignedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn,
      });

      return presignedUrl;
    } catch (error) {
      console.error('Error generating download URL:', error);
      throw new Error(FileErrorCode.S3_ERROR);
    }
  }

  /**
   * Check if file exists in S3
   */
  async fileExists(s3Key: string): Promise<boolean> {
    try {
      await this.s3Client.send(new HeadObjectCommand({
        Bucket: this.bucket,
        Key: s3Key,
      }));
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Delete file from S3
   */
  async deleteFile(s3Key: string): Promise<void> {
    try {
      await this.s3Client.send(new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: s3Key,
      }));
    } catch (error) {
      console.error('Error deleting file from S3:', error);
      throw new Error(FileErrorCode.S3_ERROR);
    }
  }

  /**
   * Get file metadata from S3
   */
  async getFileMetadata(s3Key: string) {
    try {
      const response = await this.s3Client.send(new HeadObjectCommand({
        Bucket: this.bucket,
        Key: s3Key,
      }));

      return {
        contentType: response.ContentType,
        contentLength: response.ContentLength,
        lastModified: response.LastModified,
        metadata: response.Metadata,
      };
    } catch (error) {
      console.error('Error getting file metadata:', error);
      throw new Error(FileErrorCode.S3_ERROR);
    }
  }

  /**
   * Generate public URL for file (if bucket is public)
   */
  generatePublicUrl(s3Key: string): string {
    return `${awsConfig.bucketUrl}/${s3Key}`;
  }

  /**
   * Validate file type against allowed types
   */
  validateFileType(fileType: string): boolean {
    return fileConfig.allowedImageTypes.includes(fileType);
  }

  /**
   * Validate file size
   */
  validateFileSize(fileSize: number): boolean {
    return fileSize > 0 && fileSize <= fileConfig.maxFileSize;
  }

  /**
   * Get file size from S3
   */
  async getFileSize(s3Key: string): Promise<number> {
    try {
      const metadata = await this.getFileMetadata(s3Key);
      return metadata.contentLength || 0;
    } catch (error) {
      console.error('Error getting file size:', error);
      throw new Error(FileErrorCode.S3_ERROR);
    }
  }
}