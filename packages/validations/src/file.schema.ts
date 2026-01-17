import { z } from 'zod';

const fileCategories = ['photo', 'document', 'certificate', 'letter', 'other'] as const;

export const uploadFileSchema = z.object({
  familyMemberId: z.string().cuid('Invalid family member ID'),
  category: z.enum(fileCategories).optional(),
  description: z.string().max(500, 'Description must be at most 500 characters').optional(),
});

export const fileIdParamSchema = z.object({
  id: z.string().cuid('Invalid file ID'),
});

export const fileMemberIdParamSchema = z.object({
  memberId: z.string().cuid('Invalid member ID'),
});

export type UploadFileInput = z.infer<typeof uploadFileSchema>;
export type FileIdParam = z.infer<typeof fileIdParamSchema>;
export type FileMemberIdParam = z.infer<typeof fileMemberIdParamSchema>;
