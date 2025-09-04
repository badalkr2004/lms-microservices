// src/routes/video.routes.ts
import { Router } from 'express';
import express from 'express';
import { videoController } from '../controllers/video.controller';
import { asyncHandler } from '../utils/async.utils';
import {
  // authMiddleware,
  // roleMiddleware,
  validateRequest,
} from '../middlewares';
import {
  videoUploadSchema,
  signedUrlSchema,
  thumbnailSchema,
  bulkProcessSchema,
  listVideosSchema,
} from '../validations/video.validation';

const router: Router = Router();

// All video routes require authentication
// router.use(authMiddleware);

/**
 * @route   POST /api/videos/upload
 * @desc    Initiate video upload to Mux
 * @access  Private
 */
router.post(
  '/upload',
  validateRequest(videoUploadSchema),
  asyncHandler(videoController.initiateUpload.bind(videoController))
);

/**
 * @route   GET /api/videos/:fileId/status
 * @desc    Get video processing status
 * @access  Private
 */
router.get('/:fileId/status', asyncHandler(videoController.getVideoStatus.bind(videoController)));

/**
 * @route   GET /api/videos/:fileId/metadata
 * @desc    Get video metadata and playback information
 * @access  Private
 */
router.get(
  '/:fileId/metadata',
  asyncHandler(videoController.getVideoMetadata.bind(videoController))
);

/**
 * @route   POST /api/videos/:fileId/signed-url
 * @desc    Generate signed playback URL for premium content
 * @access  Private
 */
router.post(
  '/:fileId/signed-url',
  validateRequest(signedUrlSchema),
  asyncHandler(videoController.getSignedPlaybackUrl.bind(videoController))
);

/**
 * @route   POST /api/videos/:fileId/thumbnail
 * @desc    Generate thumbnail URL for video
 * @access  Private
 */
router.post(
  '/:fileId/thumbnail',
  validateRequest(thumbnailSchema),
  asyncHandler(videoController.createThumbnail.bind(videoController))
);

/**
 * @route   GET /api/videos
 * @desc    List user videos with pagination and filters
 * @access  Private
 */
// router.get(
//   '/',
//   validateRequest(listVideosSchema, 'query'),
//   asyncHandler(videoController.listVideos.bind(videoController))
// );

/**
 * @route   DELETE /api/videos/:fileId
 * @desc    Delete video from Mux and database
 * @access  Private
 */
router.delete('/:fileId', asyncHandler(videoController.deleteVideo.bind(videoController)));

/**
 * @route   POST /api/videos/:fileId/analytics
 * @desc    Get video analytics data
 * @access  Private (Teachers only)
 */
router.get(
  '/:fileId/analytics',
  // roleMiddleware(['teacher', 'super_admin']),
  asyncHandler(videoController.getVideoAnalytics.bind(videoController))
);

/**
 * @route   POST /api/videos/bulk-process
 * @desc    Bulk process multiple videos
 * @access  Private (Teachers only)
 */
router.post(
  '/bulk-process',
  // roleMiddleware(['teacher', 'super_admin']),
  validateRequest(bulkProcessSchema),
  asyncHandler(videoController.bulkProcessVideos.bind(videoController))
);

/**
 * @route   POST /api/videos/webhook
 * @desc    Handle Mux webhooks (public endpoint)
 * @access  Public (with signature verification)
 */
// router.post('/webhook', asyncHandler(videoController.handleWebhook.bind(videoController)));

/**
 * @route   GET /api/videos/health
 * @desc    Video service health check
 * @access  Public
 */
router.get('/health', asyncHandler(videoController.healthCheck.bind(videoController)));

export default router;
