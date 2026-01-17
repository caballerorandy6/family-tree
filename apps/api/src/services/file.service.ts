import { prisma } from '@familytree/database';
import sharp from 'sharp';
import type { FileMetadata, SignedUrlResponse } from '@familytree/types/file.types';
import type { FileCategory } from '@familytree/types/member.types';
import { uploadFile, deleteFile } from '../config/storage';
import { AppError } from '../middleware/error.middleware';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_IMAGE_WIDTH = 2048;
const MAX_IMAGE_HEIGHT = 2048;
const JPEG_QUALITY = 85;

async function optimizeImage(buffer: Buffer, mimeType: string): Promise<{ buffer: Buffer; mimeType: string }> {
  if (!IMAGE_TYPES.includes(mimeType)) {
    return { buffer, mimeType };
  }

  try {
    const image = sharp(buffer);
    const metadata = await image.metadata();

    // Skip optimization for small images
    if ((metadata.width ?? 0) <= MAX_IMAGE_WIDTH && (metadata.height ?? 0) <= MAX_IMAGE_HEIGHT) {
      // Just optimize quality without resizing
      const optimized = await image
        .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
        .toBuffer();
      return { buffer: optimized, mimeType: 'image/jpeg' };
    }

    // Resize and optimize
    const optimized = await image
      .resize(MAX_IMAGE_WIDTH, MAX_IMAGE_HEIGHT, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
      .toBuffer();

    return { buffer: optimized, mimeType: 'image/jpeg' };
  } catch {
    // If optimization fails, return original
    return { buffer, mimeType };
  }
}

export async function uploadMemberFile(
  userId: string,
  file: Express.Multer.File,
  familyMemberId: string,
  category?: FileCategory,
  description?: string
): Promise<FileMetadata> {
  const member = await prisma.familyMember.findUnique({
    where: { id: familyMemberId },
    include: {
      familyTree: { select: { userId: true } },
    },
  });

  if (!member) {
    throw new AppError(404, 'MEMBER_NOT_FOUND', 'Family member not found');
  }

  if (member.familyTree.userId !== userId) {
    throw new AppError(403, 'FORBIDDEN', 'You do not have access to this family member');
  }

  // Optimize images before upload
  const { buffer: optimizedBuffer, mimeType: optimizedMimeType } = await optimizeImage(
    file.buffer,
    file.mimetype
  );

  // Update filename extension if image was converted to JPEG
  let filename = file.originalname;
  if (optimizedMimeType !== file.mimetype && optimizedMimeType === 'image/jpeg') {
    const nameParts = filename.split('.');
    nameParts[nameParts.length - 1] = 'jpg';
    filename = nameParts.join('.');
  }

  const { fileKey, fileUrl } = await uploadFile(
    optimizedBuffer,
    filename,
    optimizedMimeType,
    `members/${familyMemberId}`
  );

  const fileRecord = await prisma.familyFile.create({
    data: {
      name: filename.split('.').slice(0, -1).join('.') || filename,
      originalName: file.originalname,
      fileKey,
      fileUrl,
      fileType: optimizedMimeType,
      fileSize: optimizedBuffer.length,
      category,
      description,
      familyMemberId,
    },
  });

  return fileRecord as FileMetadata;
}

export async function getFilesByMemberId(
  memberId: string,
  userId: string
): Promise<FileMetadata[]> {
  const member = await prisma.familyMember.findUnique({
    where: { id: memberId },
    include: {
      familyTree: { select: { userId: true, isPublic: true } },
    },
  });

  if (!member) {
    throw new AppError(404, 'MEMBER_NOT_FOUND', 'Family member not found');
  }

  if (member.familyTree.userId !== userId && !member.familyTree.isPublic) {
    throw new AppError(403, 'FORBIDDEN', 'You do not have access to this family member');
  }

  const files = await prisma.familyFile.findMany({
    where: { familyMemberId: memberId },
    orderBy: { createdAt: 'desc' },
  });

  return files as FileMetadata[];
}

export async function getFileDownloadUrl(
  fileId: string,
  userId: string
): Promise<SignedUrlResponse> {
  const file = await prisma.familyFile.findUnique({
    where: { id: fileId },
    include: {
      familyMember: {
        include: {
          familyTree: { select: { userId: true, isPublic: true } },
        },
      },
    },
  });

  if (!file) {
    throw new AppError(404, 'FILE_NOT_FOUND', 'File not found');
  }

  const { familyTree } = file.familyMember;

  if (familyTree.userId !== userId && !familyTree.isPublic) {
    throw new AppError(403, 'FORBIDDEN', 'You do not have access to this file');
  }

  // Use the stored fileUrl directly since files are public on Cloudinary
  // This is more reliable than regenerating the URL from fileKey
  return { url: file.fileUrl, expiresAt: Date.now() + 3600 * 1000 };
}

// Upload profile photo (public, not tied to a member yet)
export async function uploadProfilePhoto(
  userId: string,
  file: Express.Multer.File,
  treeId: string
): Promise<{ photoUrl: string }> {
  // Verify user owns the tree
  const tree = await prisma.familyTree.findUnique({
    where: { id: treeId },
    select: { userId: true },
  });

  if (!tree) {
    throw new AppError(404, 'TREE_NOT_FOUND', 'Family tree not found');
  }

  if (tree.userId !== userId) {
    throw new AppError(403, 'FORBIDDEN', 'You do not have access to this family tree');
  }

  // Only allow images
  if (!IMAGE_TYPES.includes(file.mimetype)) {
    throw new AppError(400, 'INVALID_FILE_TYPE', 'Only image files are allowed for profile photos');
  }

  // Optimize image
  const { buffer: optimizedBuffer, mimeType: optimizedMimeType } = await optimizeImage(
    file.buffer,
    file.mimetype
  );

  // Upload to profiles folder with public access
  const { fileUrl } = await uploadFile(
    optimizedBuffer,
    file.originalname.replace(/\.[^/.]+$/, '.jpg'),
    optimizedMimeType,
    `profiles/${treeId}`
  );

  return { photoUrl: fileUrl };
}

export async function deleteFileById(fileId: string, userId: string): Promise<void> {
  const file = await prisma.familyFile.findUnique({
    where: { id: fileId },
    include: {
      familyMember: {
        include: {
          familyTree: { select: { userId: true } },
        },
      },
    },
  });

  if (!file) {
    throw new AppError(404, 'FILE_NOT_FOUND', 'File not found');
  }

  if (file.familyMember.familyTree.userId !== userId) {
    throw new AppError(403, 'FORBIDDEN', 'You do not have access to this file');
  }

  await Promise.all([
    deleteFile(file.fileKey),
    prisma.familyFile.delete({ where: { id: fileId } }),
  ]);
}
