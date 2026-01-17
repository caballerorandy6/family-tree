import type { FileCategory } from './member.types';

export interface UploadFileInput {
  familyMemberId: string;
  category?: FileCategory;
  description?: string;
}

export interface FileMetadata {
  id: string;
  name: string;
  originalName: string;
  fileKey: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  category: FileCategory | null;
  description: string | null;
  familyMemberId: string;
  createdAt: Date;
}

export interface SignedUrlResponse {
  url: string;
  expiresAt: number;
}

export const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

export type AllowedFileType = (typeof ALLOWED_FILE_TYPES)[number];

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
