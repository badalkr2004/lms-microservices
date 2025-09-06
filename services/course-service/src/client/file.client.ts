import axios, { AxiosInstance } from 'axios';
import { config } from '../config';

const FILE_SERVICE_URL = config.fileService.url;

export type InitiateUploadRequest = {
  courseId: string;
  lectureId: string;
  fileName: string;
  fileSize: number;
  contentType: string;
};

export type InitiateUploadResponse = {
  fileId: string;
  uploadUrl: string;
  uploadId: string;
  expiresAt: string;
  status: 'pending';
};

export type VideoStatus = {
  fileId: string;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed' | 'cancelled';
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  duration: number | null;
  muxAssetId: string | null;
  processingProgress: number;
  error: string | null;
};

export type VideoMetadata = {
  fileId: string;
  assetId: string;
  playbackUrl: string;
  thumbnailUrl: string | null;
  duration: number | null;
  aspectRatio?: string | null;
  maxResolution?: string | null;
  tracks?: any[];
  createdAt: string;
};

export class FileClient {
  private http: AxiosInstance;

  constructor() {
    this.http = axios.create({
      baseURL: FILE_SERVICE_URL,
      timeout: 15000,
    });
  }

  async initiateVideoUpload(payload: InitiateUploadRequest, userId: string) {
    try {
      const { data } = await this.http.post('/api/videos/upload', payload, {
        headers: {
          'x-user-id': userId,
        },
      });
      return data.data;
    } catch (error) {
      throw error;
    }
  }

  async getStatus(fileId: string, userId: string) {
    const { data } = await this.http.get(`/api/videos/${fileId}/status`, {
      headers: {
        'x-user-id': userId,
      },
    });
    return data.data;
  }

  async getMetadata(fileId: string, userId: string) {
    const { data } = await this.http.get(`/api/videos/${fileId}/metadata`, {
      headers: {
        'x-user-id': userId,
      },
    });
    return data.data;
  }

  async getSignedPlaybackUrl(fileId: string, userId: string, expirationHours = 24) {
    const { data } = await this.http.post(
      `/api/videos/${fileId}/signed-url`,
      { expirationHours },
      {
        headers: {
          'x-user-id': userId,
        },
      }
    );
    return data.data;
  }

  async deleteVideo(fileId: string, userId: string) {
    console.log('delete video called');
    const { data } = await this.http.delete(`/api/videos/${fileId}`, {
      headers: {
        'x-user-id': userId,
      },
    });
    return data.data;
  }
}

export const fileClient = new FileClient();
