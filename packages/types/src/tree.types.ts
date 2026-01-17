export interface FamilyTree {
  id: string;
  name: string;
  description: string | null;
  coverImage: string | null;
  isPublic: boolean;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FamilyTreeWithMemberCount extends FamilyTree {
  _count: {
    members: number;
  };
}

export interface CreateFamilyTreeInput {
  name: string;
  description?: string;
  coverImage?: string;
  isPublic?: boolean;
}

export interface UpdateFamilyTreeInput {
  name?: string;
  description?: string | null;
  coverImage?: string | null;
  isPublic?: boolean;
}
