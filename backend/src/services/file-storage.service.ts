import { createReadStream, existsSync, mkdirSync, unlinkSync } from "fs";
import { writeFile } from "fs/promises";
import { join } from "path";
import { randomBytes } from "crypto";
import type { MultipartFile } from "@fastify/multipart";

/**
 * Magic-byte signatures for the allowed MIME types (REV-040). A client's
 * declared Content-Type on a multipart part is attacker-controlled and was
 * the only check here before this — uploading an arbitrary script with
 * `Content-Type: image/png` was accepted outright. This checks what the
 * file's bytes actually are.
 */
const MAGIC_BYTES: Record<string, Buffer[]> = {
  "image/jpeg": [Buffer.from([0xff, 0xd8, 0xff])],
  "image/png": [Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
  "image/gif": [Buffer.from("GIF87a", "ascii"), Buffer.from("GIF89a", "ascii")],
  "image/webp": [Buffer.from("RIFF", "ascii")],
  "application/pdf": [Buffer.from("%PDF-", "ascii")],
  // Legacy Office formats (.doc/.xls) are OLE2/CFBF containers.
  "application/msword": [Buffer.from([0xd0, 0xcf, 0x11, 0xe0])],
  "application/vnd.ms-excel": [Buffer.from([0xd0, 0xcf, 0x11, 0xe0])],
  // Modern Office formats (.docx/.xlsx) are zip archives.
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    Buffer.from([0x50, 0x4b, 0x03, 0x04]),
  ],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
    Buffer.from([0x50, 0x4b, 0x03, 0x04]),
  ],
};

// text/plain and text/csv have no reliable magic bytes, so they're not in
// MAGIC_BYTES above — content is skipped for those, but they're still
// covered by the executable-signature check below.
const TEXT_MIME_TYPES = new Set(["text/plain", "text/csv"]);

// Rejected outright regardless of declared Content-Type — the "disguised
// executable" case the review specifically asked this to catch.
const EXECUTABLE_SIGNATURES: Buffer[] = [
  Buffer.from("MZ", "ascii"), // Windows PE/EXE
  Buffer.from([0x7f, 0x45, 0x4c, 0x46]), // ELF (Linux binaries)
  Buffer.from("#!", "ascii"), // Shebang scripts (#!/bin/sh, #!/usr/bin/env …)
  Buffer.from([0xca, 0xfe, 0xba, 0xbe]), // Java class / Mach-O fat binary
  Buffer.from([0xfe, 0xed, 0xfa]), // Mach-O (32/64-bit)
];

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
   * Validate the declared Content-Type against the allowlist. This alone
   * is not sufficient — see validateFileContent, which checks what the
   * bytes actually are (REV-040).
   */
  static validateFile(file: MultipartFile): void {
    if (!this.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new Error(
        `File type not allowed. Allowed types: ${this.ALLOWED_MIME_TYPES.join(", ")}`,
      );
    }
  }

  /**
   * Validate what a file's bytes actually are, independent of the
   * client-declared Content-Type (REV-040). Rejects known executable/script
   * signatures outright, and for types with a reliable magic number,
   * rejects content that doesn't match the declared type.
   */
  static validateFileContent(buffer: Buffer, declaredMimeType: string): void {
    for (const sig of EXECUTABLE_SIGNATURES) {
      if (buffer.subarray(0, sig.length).equals(sig)) {
        throw new Error(
          "File content matches an executable or script signature and is not allowed",
        );
      }
    }

    if (TEXT_MIME_TYPES.has(declaredMimeType)) {
      return;
    }

    const signatures = MAGIC_BYTES[declaredMimeType];
    if (!signatures) return; // no signature registered for this type

    const matches = signatures.some((sig) =>
      buffer.subarray(0, sig.length).equals(sig),
    );
    if (!matches) {
      throw new Error(
        `File content does not match declared type ${declaredMimeType}`,
      );
    }
  }

  /**
   * Upload a file from multipart request
   */
  static async uploadFile(
    file: MultipartFile,
    subfolder?: string,
  ): Promise<UploadResult> {
    this.initialize();
    this.validateFile(file);

    // Buffered rather than streamed to disk: @fastify/multipart already
    // enforces the size limit at the plugin level (server.ts), and
    // buffering lets content be inspected (validateFileContent) before
    // anything touches the filesystem, rather than after a partial write.
    const buffer = await file.toBuffer();
    if (file.file.truncated) {
      throw new Error(
        `File size exceeds the maximum allowed size of ${this.MAX_FILE_SIZE / 1024 / 1024}MB`,
      );
    }
    this.validateFileContent(buffer, file.mimetype);

    const storageKey = this.generateStorageKey(file.filename);
    const uploadPath = subfolder
      ? join(this.UPLOAD_DIR, subfolder)
      : this.UPLOAD_DIR;

    // Ensure subfolder exists
    if (!existsSync(uploadPath)) {
      mkdirSync(uploadPath, { recursive: true });
    }

    const filePath = join(uploadPath, storageKey);
    await writeFile(filePath, buffer);
    const fileSize = buffer.length;

    // Generate file URL (relative path for now)
    const relativePath = subfolder ? join(subfolder, storageKey) : storageKey;
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
    subfolder?: string,
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
