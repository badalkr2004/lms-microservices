// src/utils/image.utils.ts
import sharp from 'sharp';

/**
 * Image processing utilities using Sharp
 */
export class ImageProcessor {
  /**
   * Resize image while maintaining aspect ratio
   */
  static async resizeImage(
    buffer: Buffer, 
    maxWidth: number = 1920, 
    maxHeight: number = 1080,
    quality: number = 85
  ): Promise<Buffer> {
    return sharp(buffer)
      .resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality })
      .toBuffer();
  }

  /**
   * Generate thumbnail
   */
  static async generateThumbnail(
    buffer: Buffer,
    width: number = 150,
    height: number = 150
  ): Promise<Buffer> {
    return sharp(buffer)
      .resize(width, height, {
        fit: 'cover',
        position: 'center',
      })
      .jpeg({ quality: 80 })
      .toBuffer();
  }

  /**
   * Get image metadata
   */
  static async getImageMetadata(buffer: Buffer): Promise<sharp.Metadata> {
    return sharp(buffer).metadata();
  }

  /**
   * Convert image to WebP format
   */
  static async convertToWebP(buffer: Buffer, quality: number = 85): Promise<Buffer> {
    return sharp(buffer)
      .webp({ quality })
      .toBuffer();
  }

  /**
   * Optimize image size
   */
  static async optimizeImage(
    buffer: Buffer,
    options: {
      maxWidth?: number;
      maxHeight?: number;
      quality?: number;
      format?: 'jpeg' | 'png' | 'webp';
    } = {}
  ): Promise<Buffer> {
    const {
      maxWidth = 1920,
      maxHeight = 1080,
      quality = 85,
      format = 'jpeg'
    } = options;

    let pipeline = sharp(buffer).resize(maxWidth, maxHeight, {
      fit: 'inside',
      withoutEnlargement: true,
    });

    switch (format) {
      case 'jpeg':
        pipeline = pipeline.jpeg({ quality });
        break;
      case 'png':
        pipeline = pipeline.png({ quality });
        break;
      case 'webp':
        pipeline = pipeline.webp({ quality });
        break;
    }

    return pipeline.toBuffer();
  }
}