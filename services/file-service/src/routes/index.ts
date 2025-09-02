// src/routes/index.ts
import { Router } from 'express';
import fileRoutes from './file.routes'
import videoRoutes from './video.routes';

const router:Router = Router();

// Mount file routes
router.use('/files', fileRoutes);
// Mount video routes
router.use('/videos', videoRoutes);

// Root endpoint
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'LMS File Service API',
    version: '1.0.0',
    endpoints: {
      health: '/api/files/health',
      internal: {
        presignedUrl: 'POST /api/files/internal/presigned-url',
        confirmUpload: 'POST /api/files/internal/confirm/:fileId',
        getFile: 'GET /api/files/internal/:fileId',
        deleteFile: 'DELETE /api/files/internal/:fileId',
        getUserFiles: 'GET /api/files/internal/user/:userId',
        getUserUsage: 'GET /api/files/internal/user/:userId/usage',
        downloadUrl: 'GET /api/files/internal/:fileId/download-url',
      },
      user: {
        getMyFiles: 'GET /api/files/user/my-files',
        getFile: 'GET /api/files/user/:fileId',
        deleteFile: 'DELETE /api/files/user/:fileId',
        getUsage: 'GET /api/files/user/storage-usage',
        downloadUrl: 'GET /api/files/user/:fileId/download-url',
      },
    },
  });
});

export default router;