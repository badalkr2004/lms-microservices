// src/controllers/file.controller.ts
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { S3Service } from '../services/s3.service';
import { FileRepository } from '../repositories/file.repository';
import { 
  presignedUrlRequestSchema, 
  uploadRequestSchema,
  AuthenticatedRequest,
  FileErrorCode,
  FileCategory 
} from '../types';
import { fileConfig } from '../config';

export class FileController {
  private s3Service: S3Service;
  private fileRepository: FileRepository;

  constructor() {
    this.s3Service = new S3Service();
    this.fileRepository = new FileRepository();
  }

  /**
   * Generate presigned URL for file upload
   */
  generatePresignedUrl = async (
    req: AuthenticatedRequest, 
    res: Response, 
    next: NextFunction
  ): Promise<void> => {
    try {
      const validation = presignedUrlRequestSchema.safeParse(req.body);
      
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: {
            code: FileErrorCode.INVALID_REQUEST,
            message: 'Invalid request data',
            details: validation.error.issues,
          },
        });
        return;
      }

      const { fileName, fileType, fileSize, userId, category } = validation.data;

      // Validate file type
      if (!this.s3Service.validateFileType(fileType)) {
        res.status(400).json({
          success: false,
          error: {
            code: FileErrorCode.INVALID_FILE_TYPE,
            message: `File type ${fileType} is not allowed`,
            details: { allowedTypes: fileConfig.allowedImageTypes },
          },
        });
        return;
      }

      // Validate file size
      if (!this.s3Service.validateFileSize(fileSize)) {
        res.status(400).json({
          success: false,
          error: {
            code: FileErrorCode.FILE_TOO_LARGE,
            message: `File size ${fileSize} exceeds maximum allowed size`,
            details: { maxSize: fileConfig.maxFileSize },
          },
        });
        return;
      }

      // Generate S3 key and file ID
      const fileId = uuidv4();
      const s3Key = this.s3Service.generateS3Key(userId, category, fileName);

      // Generate presigned URL
      const presignedUrl = await this.s3Service.generatePresignedUploadUrl(
        s3Key,
        fileType,
        fileSize
      );

      // Create file record with pending status
      const fileRecord = await this.fileRepository.createFile({
        id: fileId,
        originalName: fileName,
        fileName: fileName,
        fileType,
        fileSize,
        s3Key,
        s3Url: this.s3Service.generatePublicUrl(s3Key),
        userId,
        category,
        status: 'pending',
      });

      // Create upload session
      const uploadSession = await this.fileRepository.createUploadSession({
        fileId,
        s3Key,
        presignedUrl,
        userId,
        expiresAt: new Date(Date.now() + fileConfig.presignedUrlExpiry * 1000),
      });

      res.status(200).json({
        success: true,
        data: {
          uploadUrl: presignedUrl,
          fileId,
          s3Key,
          expiresIn: fileConfig.presignedUrlExpiry,
        },
        message: 'Presigned URL generated successfully',
      });

    } catch (error) {
      console.error('Error generating presigned URL:', error);
      next(error);
    }
  };

  /**
   * Confirm file upload completion
   */
  confirmUpload = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { fileId } = req.params;
      const { userId } = req.body;

      if (!fileId || !userId) {
        res.status(400).json({
          success: false,
          error: {
            code: FileErrorCode.INVALID_REQUEST,
            message: 'File ID and User ID are required',
          },
        });
        return;
      }

      // Get file record
      const file = await this.fileRepository.getFileById(fileId);
      if (!file) {
        res.status(404).json({
          success: false,
          error: {
            code: FileErrorCode.FILE_NOT_FOUND,
            message: 'File not found',
          },
        });
        return;
      }

      // Verify ownership
      if (file.userId !== userId) {
        res.status(403).json({
          success: false,
          error: {
            code: FileErrorCode.UNAUTHORIZED,
            message: 'Unauthorized access to file',
          },
        });
        return;
      }

      // Check if file exists in S3
      const fileExists = await this.s3Service.fileExists(file.s3Key);
      if (!fileExists) {
        res.status(400).json({
          success: false,
          error: {
            code: FileErrorCode.UPLOAD_FAILED,
            message: 'File not found in storage',
          },
        });
        return;
      }

      // Update file status to uploaded
      const updatedFile = await this.fileRepository.updateFile(fileId, {
        status: 'uploaded',
      });

      res.status(200).json({
        success: true,
        data: {
          fileId: updatedFile!.id,
          fileName: updatedFile!.fileName,
          fileUrl: updatedFile!.s3Url,
          s3Key: updatedFile!.s3Key,
          uploadedAt: updatedFile!.uploadedAt.toISOString(),
        },
        message: 'File upload confirmed successfully',
      });

    } catch (error) {
      console.error('Error confirming upload:', error);
      next(error);
    }
  };

  /**
   * Get file by ID
   */
  getFile = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { fileId } = req.params;
      const { userId } = req.query;

      const file = await this.fileRepository.getFileById(fileId);
      if (!file) {
        res.status(404).json({
          success: false,
          error: {
            code: FileErrorCode.FILE_NOT_FOUND,
            message: 'File not found',
          },
        });
        return;
      }

      // Verify ownership (optional for service-to-service calls)
      if (userId && file.userId !== userId) {
        res.status(403).json({
          success: false,
          error: {
            code: FileErrorCode.UNAUTHORIZED,
            message: 'Unauthorized access to file',
          },
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          id: file.id,
          originalName: file.originalName,
          fileName: file.fileName,
          fileType: file.fileType,
          fileSize: file.fileSize,
          fileUrl: file.s3Url,
          category: file.category,
          uploadedAt: file.uploadedAt.toISOString(),
        },
        message: 'File retrieved successfully',
      });

    } catch (error) {
      console.error('Error getting file:', error);
      next(error);
    }
  };

  /**
   * Get user files
   */
  getUserFiles = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { userId } = req.params;
      const { category, limit = '50', offset = '0' } = req.query;

      const files = await this.fileRepository.getFilesByUserId(
        userId,
        category as string,
        parseInt(limit as string, 10),
        parseInt(offset as string, 10)
      );

      const totalCount = await this.fileRepository.getFileCountByUser(
        userId,
        category as string
      );

      res.status(200).json({
        success: true,
        data: {
          files: files.map(file => ({
            id: file.id,
            originalName: file.originalName,
            fileName: file.fileName,
            fileType: file.fileType,
            fileSize: file.fileSize,
            fileUrl: file.s3Url,
            category: file.category,
            uploadedAt: file.uploadedAt.toISOString(),
          })),
          pagination: {
            total: totalCount,
            limit: parseInt(limit as string, 10),
            offset: parseInt(offset as string, 10),
            hasMore: parseInt(offset as string, 10) + files.length < totalCount,
          },
        },
        message: 'Files retrieved successfully',
      });

    } catch (error) {
      console.error('Error getting user files:', error);
      next(error);
    }
  };

  /**
   * Delete file
   */
  deleteFile = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { fileId } = req.params;
      const { userId } = req.body;

      const file = await this.fileRepository.getFileById(fileId);
      if (!file) {
        res.status(404).json({
          success: false,
          error: {
            code: FileErrorCode.FILE_NOT_FOUND,
            message: 'File not found',
          },
        });
        return;
      }

      // Verify ownership
      if (file.userId !== userId) {
        res.status(403).json({
          success: false,
          error: {
            code: FileErrorCode.UNAUTHORIZED,
            message: 'Unauthorized access to file',
          },
        });
        return;
      }

      // Delete from S3
      await this.s3Service.deleteFile(file.s3Key);

      // Soft delete from database
      await this.fileRepository.deleteFile(fileId);

      res.status(200).json({
        success: true,
        message: 'File deleted successfully',
      });

    } catch (error) {
      console.error('Error deleting file:', error);
      next(error);
    }
  };

  /**
   * Get user storage usage
   */
  getUserStorageUsage = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { userId } = req.params;

      const usage = await this.fileRepository.getUserStorageUsage(userId);

      res.status(200).json({
        success: true,
        data: {
          totalFiles: usage.totalFiles,
          totalSizeBytes: usage.totalSize,
          totalSizeMB: Math.round(usage.totalSize / (1024 * 1024) * 100) / 100,
          categories: usage.categories,
        },
        message: 'Storage usage retrieved successfully',
      });

    } catch (error) {
      console.error('Error getting storage usage:', error);
      next(error);
    }
  };

  /**
   * Generate download URL
   */
  generateDownloadUrl = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { fileId } = req.params;
      const { expiresIn = '3600' } = req.query;

      const file = await this.fileRepository.getFileById(fileId);
      if (!file) {
        res.status(404).json({
          success: false,
          error: {
            code: FileErrorCode.FILE_NOT_FOUND,
            message: 'File not found',
          },
        });
        return;
      }

      const downloadUrl = await this.s3Service.generatePresignedDownloadUrl(
        file.s3Key,
        parseInt(expiresIn as string, 10)
      );

      res.status(200).json({
        success: true,
        data: {
          downloadUrl,
          expiresIn: parseInt(expiresIn as string, 10),
        },
        message: 'Download URL generated successfully',
      });

    } catch (error) {
      console.error('Error generating download URL:', error);
      next(error);
    }
  };
}