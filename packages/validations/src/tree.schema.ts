import { z } from 'zod';

export const createTreeSchema = z.object({
  name: z
    .string()
    .min(1, 'Tree name is required')
    .max(100, 'Tree name must be at most 100 characters'),
  description: z.string().max(500, 'Description must be at most 500 characters').optional(),
  coverImage: z.string().url('Invalid cover image URL').optional(),
  isPublic: z.boolean().optional().default(false),
});

export const updateTreeSchema = z.object({
  name: z
    .string()
    .min(1, 'Tree name is required')
    .max(100, 'Tree name must be at most 100 characters')
    .optional(),
  description: z.string().max(500, 'Description must be at most 500 characters').nullable().optional(),
  coverImage: z.string().url('Invalid cover image URL').nullable().optional(),
  isPublic: z.boolean().optional(),
});

export const treeIdParamSchema = z.object({
  id: z.string().cuid('Invalid tree ID'),
});

export type CreateTreeInput = z.infer<typeof createTreeSchema>;
export type UpdateTreeInput = z.infer<typeof updateTreeSchema>;
export type TreeIdParam = z.infer<typeof treeIdParamSchema>;
