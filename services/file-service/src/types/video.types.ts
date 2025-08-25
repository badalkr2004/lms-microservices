// src/types/video.types.ts
export interface VideoUploadRequest {
  courseId: string;
  lectureId?: string;
  fileName: string;
  fileSize: number;
  contentType: string;
}

export interface VideoUploadResponse {
  fileId: string;
  uploadUrl: string;
  uploadId: string;
  expiresAt: Date;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed';
}

export interface VideoProcessingStatus {
  fileId: string;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed';
  fileName: string;
  fileSize: number;
  uploadedAt: Date;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  duration: number | null;
  muxAssetId: string | null;
  processingProgress: number;
  error: string | null;
}

export interface VideoMetadata {
  fileId: string;
  assetId: string;
  playbackUrl: string;
  thumbnailUrl: string | null;
  duration: number | null;
  aspectRatio: string | null;
  maxResolution: string | null;
  tracks: any[];
  createdAt: Date;
}

export interface VideoUploadMetadata {
  courseId: string;
  lectureId?: string;
  userId: string;
  fileName: string;
  originalName: string;
  fileId: string;
}

// src/types/mux.types.ts
export interface MuxUploadResponse {
  uploadId: string;
  uploadUrl: string;
  timeout: number;
  status: string;
}

export interface MuxAssetResponse {
  id: string;
  status: string;
  duration: number | null;
  maxStoredResolution: string | null;
  maxStoredFrameRate: number | null;
  aspectRatio: string | null;
  playbackIds: Array<{
    id: string;
    policy: string;
  }>;
  mp4Support: string | null;
  masterAccess: string | null;
  createdAt: string;
  tracks: any[];
  passthrough: any;
}

export interface MuxWebhookPayload {
  type: string;
  created_at: string;
  data: {
    id?: string;
    asset_id?: string;
    status?: string;
    passthrough?: string;
    errors?: string[];
    error?: string;
    [key: string]: any;
  };
  object: {
    environment: {
      name: string;
      id: string;
    };
    id: string;
    type: string;
  };
  id: string;
  environment: {
    name: string;
    id: string;
  };
  request_id: string | null;
  accessor: string | null;
  accessor_source: string | null;
}