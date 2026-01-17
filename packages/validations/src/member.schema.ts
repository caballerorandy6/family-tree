import { z } from 'zod';

const relationshipTypes = [
  // Great-great-grandparents (tatarabuelos)
  'great-great-grandfather',
  'great-great-grandmother',
  // Great-grandparents (bisabuelos)
  'great-grandfather',
  'great-grandmother',
  // Grandparents (abuelos)
  'grandfather',
  'grandmother',
  // Parents (padres)
  'father',
  'mother',
  // Siblings (hermanos)
  'brother',
  'sister',
  'half-brother',
  'half-sister',
  // Spouse (cónyuge)
  'spouse',
  // Children (hijos)
  'son',
  'daughter',
  'stepson',
  'stepdaughter',
  // Grandchildren (nietos)
  'grandson',
  'granddaughter',
  // Great-grandchildren (bisnietos)
  'great-grandson',
  'great-granddaughter',
  // Great-great-grandchildren (tataranietos)
  'great-great-grandson',
  'great-great-granddaughter',
  // Extended family
  'uncle',
  'aunt',
  'nephew',
  'niece',
  'cousin',
  // Other
  'other',
] as const;

const genderTypes = ['male', 'female', 'other'] as const;

export const createMemberSchema = z.object({
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name must be at most 50 characters'),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be at most 50 characters'),
  birthYear: z
    .number()
    .int('Birth year must be a whole number')
    .min(1000, 'Birth year must be at least 1000')
    .max(new Date().getFullYear(), 'Birth year cannot be in the future'),
  deathYear: z
    .number()
    .int('Death year must be a whole number')
    .min(1000, 'Death year must be at least 1000')
    .max(new Date().getFullYear(), 'Death year cannot be in the future')
    .optional(),
  birthPlace: z.string().max(200, 'Birth place must be at most 200 characters').optional(),
  deathPlace: z.string().max(200, 'Death place must be at most 200 characters').optional(),
  photoUrl: z.string().url('Invalid photo URL').optional(),
  biography: z.string().max(5000, 'Biography must be at most 5000 characters').optional(),
  occupation: z.string().max(100, 'Occupation must be at most 100 characters').optional(),
  relationship: z.enum(relationshipTypes, {
    errorMap: () => ({ message: 'Invalid relationship type' }),
  }).optional().default('other'),
  gender: z.enum(genderTypes).optional(),
  generation: z.number().int().default(0),
  parentId: z.string().cuid('Invalid parent ID').optional(),
  secondParentId: z.string().cuid('Invalid second parent ID').optional(),
  spouseId: z.string().cuid('Invalid spouse ID').optional(),
  familyTreeId: z.string().cuid('Invalid family tree ID'),
});

export const updateMemberSchema = z.object({
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name must be at most 50 characters')
    .optional(),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be at most 50 characters')
    .optional(),
  birthYear: z
    .number()
    .int('Birth year must be a whole number')
    .min(1000, 'Birth year must be at least 1000')
    .max(new Date().getFullYear(), 'Birth year cannot be in the future')
    .optional(),
  deathYear: z
    .number()
    .int('Death year must be a whole number')
    .min(1000, 'Death year must be at least 1000')
    .max(new Date().getFullYear(), 'Death year cannot be in the future')
    .nullable()
    .optional(),
  birthPlace: z.string().max(200, 'Birth place must be at most 200 characters').nullable().optional(),
  deathPlace: z.string().max(200, 'Death place must be at most 200 characters').nullable().optional(),
  photoUrl: z.string().url('Invalid photo URL').nullable().optional(),
  biography: z.string().max(5000, 'Biography must be at most 5000 characters').nullable().optional(),
  occupation: z.string().max(100, 'Occupation must be at most 100 characters').nullable().optional(),
  relationship: z.enum(relationshipTypes).optional(),
  gender: z.enum(genderTypes).nullable().optional(),
  generation: z.number().int().optional(),
  parentId: z.string().cuid('Invalid parent ID').nullable().optional(),
  secondParentId: z.string().cuid('Invalid second parent ID').nullable().optional(),
  spouseId: z.string().cuid('Invalid spouse ID').nullable().optional(),
});

export const memberIdParamSchema = z.object({
  id: z.string().cuid('Invalid member ID'),
});

export const memberTreeIdParamSchema = z.object({
  treeId: z.string().cuid('Invalid tree ID'),
});

export type CreateMemberInput = z.infer<typeof createMemberSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
export type MemberIdParam = z.infer<typeof memberIdParamSchema>;
