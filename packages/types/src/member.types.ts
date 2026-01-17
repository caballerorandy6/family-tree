export type RelationshipType =
  // Great-great-grandparents (tatarabuelos)
  | 'great-great-grandfather'
  | 'great-great-grandmother'
  // Great-grandparents (bisabuelos)
  | 'great-grandfather'
  | 'great-grandmother'
  // Grandparents (abuelos)
  | 'grandfather'
  | 'grandmother'
  // Parents (padres)
  | 'father'
  | 'mother'
  // Siblings (hermanos)
  | 'brother'
  | 'sister'
  | 'half-brother'
  | 'half-sister'
  // Spouse (cónyuge)
  | 'spouse'
  // Children (hijos)
  | 'son'
  | 'daughter'
  | 'stepson'
  | 'stepdaughter'
  // Grandchildren (nietos)
  | 'grandson'
  | 'granddaughter'
  // Great-grandchildren (bisnietos)
  | 'great-grandson'
  | 'great-granddaughter'
  // Great-great-grandchildren (tataranietos)
  | 'great-great-grandson'
  | 'great-great-granddaughter'
  // Extended family
  | 'uncle'
  | 'aunt'
  | 'nephew'
  | 'niece'
  | 'cousin'
  // Other
  | 'other';

export type GenderType = 'male' | 'female' | 'other';

export interface FamilyMember {
  id: string;
  firstName: string;
  lastName: string;
  birthYear: number;
  deathYear: number | null;
  birthPlace: string | null;
  deathPlace: string | null;
  photoUrl: string | null;
  biography: string | null;
  occupation: string | null;
  relationship: RelationshipType;
  gender: GenderType | null;
  generation: number;
  parentId: string | null;
  secondParentId: string | null;
  spouseId: string | null;
  familyTreeId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FamilyMemberWithRelations extends FamilyMember {
  parent: FamilyMember | null;
  secondParent: FamilyMember | null;
  spouse: FamilyMember | null;
  children: FamilyMember[];
  files: FamilyFile[];
}

export interface FamilyFile {
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

export type FileCategory = 'photo' | 'document' | 'certificate' | 'letter' | 'other';

export interface CreateFamilyMemberInput {
  firstName: string;
  lastName: string;
  birthYear: number;
  deathYear?: number;
  birthPlace?: string;
  deathPlace?: string;
  photoUrl?: string;
  biography?: string;
  occupation?: string;
  relationship: RelationshipType;
  gender?: GenderType;
  generation?: number;
  parentId?: string;
  secondParentId?: string;
  spouseId?: string;
  familyTreeId: string;
}

export interface UpdateFamilyMemberInput {
  firstName?: string;
  lastName?: string;
  birthYear?: number;
  deathYear?: number | null;
  birthPlace?: string | null;
  deathPlace?: string | null;
  photoUrl?: string | null;
  biography?: string | null;
  occupation?: string | null;
  relationship?: RelationshipType;
  gender?: GenderType | null;
  generation?: number;
  parentId?: string | null;
  secondParentId?: string | null;
  spouseId?: string | null;
}
