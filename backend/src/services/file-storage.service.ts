import { createWriteStream, createReadStream, existsSync, mkdirSync, unlinkSync } from "fs";
import { join } from "path";
import { randomBytes } from "crypto";
import { pipeline } from "stream/promises";
import type { MultipartFile } from "@fastify/multipart";

/**
 * File Storage Service
 * Handles file uploads, downloads, and deletions
 * Currently uses local filesystem, can be extended to S3/MinIO
 */

export interface UploadResult {
  fileName: string;
  fileSize: number;
  mimeType: string;
  storageKey: string;
  fileUrl: string;
}

export interface FileMetadata {
  originalName: string;
  mimeType: string;
  size: number;
}

export class FileStorageService {
  private static readonly UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private static readonly ALLOWED_MIME_TYPES = [
    // Images
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    // Documents
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    // Text
    "text/plain",
    "text/csv",
  ];

  /**
   * Initialize storage directory
   */
  static initialize(): void {
    if (!existsSync(this.UPLOAD_DIR)) {
      mkdirSync(this.UPLOAD_DIR, { recursive: true });
    }
  }

  /**
   * Generate a unique storage key for a file
   */
  static generateStorageKey(originalName: string): string {
    const timestamp = Date.now();
    const randomString = randomBytes(8).toString("hex");
    const extension = originalName.split(".").pop() || "";
    return `${timestamp}-${randomString}${extension ? "." + extension : ""}`;
  }

  /**
   * Validate file before upload
   */
  static validateFile(file: MultipartFile): void {
    // Check MIME type
    if (!this.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new Error(
        `File type not allowed. Allowed types: ${this.ALLOWED_MIME_TYPES.join(", ")}`
      );
    }

    // Note: Size validation happens during streaming
  }

  /**
   * Upload a file from multipart request
   */
  static async uploadFile(
    file: MultipartFile,
    subfolder?: string
  ): Promise<UploadResult> {
    this.initialize();
    this.validateFile(file);

    const storageKey = this.generateStorageKey(file.filename);
    const uploadPath = subfolder
      ? join(this.UPLOAD_DIR, subfolder)
      : this.UPLOAD_DIR;

    // Ensure subfolder exists
    if (!existsSync(uploadPath)) {
      mkdirSync(uploadPath, { recursive: true });
    }

    const filePath = join(uploadPath, storageKey);
    const writeStream = createWriteStream(filePath);

    let fileSize = 0;
    const chunks: Buffer[] = [];

    // Stream file to disk with size tracking
    file.file.on("data", (chunk: Buffer) => {
      fileSize += chunk.length;
      if (fileSize > this.MAX_FILE_SIZE) {
        file.file.destroy();
        writeStream.destroy();
        throw new Error(
          `File size exceeds maximum allowed size of ${this.MAX_FILE_SIZE / 1024 / 1024}MB`
        );
      }
    });

    await pipeline(file.file, writeStream);

    // Generate file URL (relative path for now)
    const relativePath = subfolder
      ? join(subfolder, storageKey)
      : storageKey;
    const fileUrl = `/api/v1/files/${relativePath}`;

    return {
      fileName: file.filename,
      fileSize,
      mimeType: file.mimetype,
      storageKey,
      fileUrl,
    };
  }

  /**
   * Get file path from storage key
   */
  static getFilePath(storageKey: string, subfolder?: string): string {
    const uploadPath = subfolder
      ? join(this.UPLOAD_DIR, subfolder)
      : this.UPLOAD_DIR;
    return join(uploadPath, storageKey);
  }

  /**
   * Check if file exists
   */
  static fileExists(storageKey: string, subfolder?: string): boolean {
    const filePath = this.getFilePath(storageKey, subfolder);
    return existsSync(filePath);
  }

  /**
   * Delete a file
   */
  static async deleteFile(
    storageKey: string,
    subfolder?: string
  ): Promise<void> {
    const filePath = this.getFilePath(storageKey, subfolder);

    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
  }

  /**
   * Get file stream for download
   */
  static getFileStream(storageKey: string, subfolder?: string) {
    const filePath = this.getFilePath(storageKey, subfolder);

    if (!existsSync(filePath)) {
      throw new Error("File not found");
    }

    return createReadStream(filePath);
  }

  /**
   * Get maximum file size
   */
  static getMaxFileSize(): number {
    return this.MAX_FILE_SIZE;
  }

  /**
   * Get allowed MIME types
   */
  static getAllowedMimeTypes(): string[] {
    return this.ALLOWED_MIME_TYPES;
  }
}
