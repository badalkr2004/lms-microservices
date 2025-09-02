export interface VideoUploadMetadata {
  courseId: string;
  lectureId: string;
  userId: string;
  fileName: string;
  originalName: string;
  fileId: string;
}

export interface MuxUploadResponse {
  uploadId: string;
  uploadUrl: string;
  timeout: number;
  status: string;
}

export interface MuxAssetResponse {
  id: string;
  status: string;
  duration?: number;
  maxStoredResolution: string;
  maxStoredFrameRate: number;
  aspectRatio: string;
  playbackIds: Array<{
    id: string;
    policy: string;
  }>;
  mp4Support?: string;
  masterAccess: string;
  createdAt: string;
  tracks: any[];
  passthrough: any;
}

export interface MuxWebhookPayload {
  type: string;
  data?: {
    id?: string;
    asset_id?: string;
    errors?: any[];
    error?: string;
  };
}
