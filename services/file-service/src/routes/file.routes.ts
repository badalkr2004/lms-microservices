// src/routes/file.routes.ts
import { Router } from 'express';
import { FileController } from '../controllers/file.controller';
import { 
  serviceAuth, 
  userAuth, 
  validateRequest, 
  validateFileUpload,
  uploadRateLimit 
} from "../middlewares"
import { presignedUrlRequestSchema } from '../types';

const router:Router = Router();
const fileController = new FileController();

// Health check for file service
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'File service is healthy',
    timestamp: new Date().toISOString(),
  });
});

// Service-to-service routes (require API key)
// router.use('/internal', serviceAuth);

// Generate presigned URL for upload (internal service call)
router.post(
  '/internal/presigned-url',
  uploadRateLimit,
  validateRequest(presignedUrlRequestSchema),
  validateFileUpload,
  fileController.generatePresignedUrl
);

// Confirm file upload (internal service call)
router.post(
  '/internal/confirm/:fileId',
  fileController.confirmUpload
);

// Get file by ID (internal service call)
router.get(
  '/internal/:fileId',
  fileController.getFile
);

// Delete file (internal service call)
router.delete(
  '/internal/:fileId',
  fileController.deleteFile
);

// Get user files (internal service call)
router.get(
  '/internal/user/:userId',
  fileController.getUserFiles
);

// Get user storage usage (internal service call)
router.get(
  '/internal/user/:userId/usage',
  fileController.getUserStorageUsage
);

// Generate download URL (internal service call)
router.get(
  '/internal/:fileId/download-url',
  fileController.generateDownloadUrl
);

// User-facing routes (require user authentication)
router.use('/user', userAuth);

// User can get their own files
router.get(
  '/user/my-files',
  fileController.getUserFiles
);

// User can get specific file (if they own it)
router.get(
  '/user/:fileId',
  fileController.getFile
);

// User can delete their own file
router.delete(
  '/user/:fileId',
  fileController.deleteFile
);

// User can get their storage usage
router.get(
  '/user/storage-usage',
  fileController.getUserStorageUsage
);

// User can generate download URL for their files
router.get(
  '/user/:fileId/download-url',
  fileController.generateDownloadUrl
);

export default router;

