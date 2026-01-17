import type { Request, Response, NextFunction } from 'express';
import { uploadMemberFile, getFilesByMemberId, getFileDownloadUrl, deleteFileById, uploadProfilePhoto } from '../services/file.service';
import type { UploadFileInput, FileIdParam } from '@familytree/validations/file.schema';
import type { FileCategory } from '@familytree/types/member.types';

interface ProfilePhotoInput {
  treeId: string;
}

interface MemberIdParams {
  memberId: string;
}

export async function handleUploadFile(
  req: Request<unknown, unknown, UploadFileInput>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
      });
      return;
    }

    if (!req.file) {
      res.status(400).json({
        success: false,
        error: { code: 'NO_FILE', message: 'No file provided' },
      });
      return;
    }

    const { familyMemberId, category, description } = req.body;

    const file = await uploadMemberFile(
      req.user.userId,
      req.file,
      familyMemberId,
      category as FileCategory | undefined,
      description
    );

    res.status(201).json({
      success: true,
      data: file,
    });
  } catch (error) {
    next(error);
  }
}

export async function handleGetFiles(
  req: Request<MemberIdParams>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
      });
      return;
    }

    const files = await getFilesByMemberId(req.params.memberId, req.user.userId);

    res.json({
      success: true,
      data: files,
    });
  } catch (error) {
    next(error);
  }
}

export async function handleGetFileDownloadUrl(
  req: Request<FileIdParam>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
      });
      return;
    }

    const result = await getFileDownloadUrl(req.params.id, req.user.userId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function handleDeleteFile(
  req: Request<FileIdParam>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
      });
      return;
    }

    await deleteFileById(req.params.id, req.user.userId);

    res.json({
      success: true,
      data: { message: 'File deleted successfully' },
    });
  } catch (error) {
    next(error);
  }
}

export async function handleUploadProfilePhoto(
  req: Request<unknown, unknown, ProfilePhotoInput>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
      });
      return;
    }

    if (!req.file) {
      res.status(400).json({
        success: false,
        error: { code: 'NO_FILE', message: 'No file provided' },
      });
      return;
    }

    const { treeId } = req.body;

    if (!treeId) {
      res.status(400).json({
        success: false,
        error: { code: 'MISSING_TREE_ID', message: 'Tree ID is required' },
      });
      return;
    }

    const result = await uploadProfilePhoto(req.user.userId, req.file, treeId);

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
