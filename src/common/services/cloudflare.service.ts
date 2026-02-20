/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';

@Injectable()
export class CloudflareService {
  private s3Client: S3Client;
  private bucketName: string;
  private publicUrl: string;

  constructor(private configService: ConfigService) {
    // Initialize S3 client for Cloudflare R2
    const endpoint = this.configService.get<string>('CLOUDFLARE_ENDPOINT');
    const accessKeyId = this.configService.get<string>(
      'CLOUDFLARE_ACCESS_KEY_ID',
    );
    const secretAccessKey = this.configService.get<string>(
      'CLOUDFLARE_SECRET_ACCESS_KEY',
    );
    const bucketName = this.configService.get<string>('CLOUDFLARE_BUCKET_NAME');
    const publicUrl = this.configService.get<string>('CLOUDFLARE_PUBLIC_URL');

    if (
      !endpoint ||
      !accessKeyId ||
      !secretAccessKey ||
      !bucketName ||
      !publicUrl
    ) {
      throw new InternalServerErrorException(
        'Cloudflare R2 configuration is missing. Please check your environment variables.',
      );
    }

    this.s3Client = new S3Client({
      region: 'auto',
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    this.bucketName = bucketName;
    this.publicUrl = publicUrl;
  }

  /**
   * Upload a file to Cloudflare R2
   * @param file - The file buffer to upload
   * @param filename - The desired filename in storage
   * @param folder - Optional folder path (e.g., 'post-images', 'media')
   * @returns The public URL of the uploaded file
   */
  async uploadFile(
    file: Buffer,
    filename: string,
    folder: string = 'uploads',
  ): Promise<string> {
    try {
      const key = `${folder}/${filename}`;

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file,
        ContentType: this.getMimeType(filename),
      });

      await this.s3Client.send(command);

      // Return the public URL
      return `${this.publicUrl}/${key}`;
    } catch (error) {
      console.error('Cloudflare R2 Upload Error:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException(
        `Failed to upload file to Cloudflare R2: ${errorMessage}`,
      );
    }
  }

  /**
   * Delete a file from Cloudflare R2
   * @param fileUrl - The public URL of the file to delete
   */
  async deleteFile(fileUrl: string): Promise<void> {
    try {
      // Extract the key from the public URL
      const key = fileUrl.replace(`${this.publicUrl}/`, '');

      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
    } catch (error) {
      console.error('Cloudflare R2 Delete Error:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException(
        `Failed to delete file from Cloudflare R2: ${errorMessage}`,
      );
    }
  }

  /**
   * Get MIME type based on file extension
   */
  private getMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      mp4: 'video/mp4',
      mov: 'video/quicktime',
      avi: 'video/x-msvideo',
    };

    return ext
      ? mimeTypes[ext] || 'application/octet-stream'
      : 'application/octet-stream';
  }
}
