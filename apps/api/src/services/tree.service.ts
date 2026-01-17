import { prisma } from '@familytree/database';
import type { FamilyTree, FamilyTreeWithMemberCount, CreateFamilyTreeInput, UpdateFamilyTreeInput } from '@familytree/types/tree.types';
import { AppError } from '../middleware/error.middleware';

export async function createTree(userId: string, data: CreateFamilyTreeInput): Promise<FamilyTree> {
  const tree = await prisma.familyTree.create({
    data: {
      ...data,
      userId,
    },
  });

  return tree;
}

export async function getTreesByUserId(userId: string): Promise<FamilyTreeWithMemberCount[]> {
  const trees = await prisma.familyTree.findMany({
    where: { userId },
    include: {
      _count: {
        select: { members: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return trees;
}

export async function getTreeById(
  treeId: string,
  userId: string
): Promise<FamilyTree | null> {
  const tree = await prisma.familyTree.findFirst({
    where: {
      id: treeId,
      OR: [{ userId }, { isPublic: true }],
    },
  });

  return tree;
}

export async function updateTree(
  treeId: string,
  userId: string,
  data: UpdateFamilyTreeInput
): Promise<FamilyTree> {
  const existingTree = await prisma.familyTree.findFirst({
    where: { id: treeId, userId },
  });

  if (!existingTree) {
    throw new AppError(404, 'TREE_NOT_FOUND', 'Family tree not found');
  }

  const tree = await prisma.familyTree.update({
    where: { id: treeId },
    data,
  });

  return tree;
}

export async function deleteTree(treeId: string, userId: string): Promise<void> {
  const existingTree = await prisma.familyTree.findFirst({
    where: { id: treeId, userId },
  });

  if (!existingTree) {
    throw new AppError(404, 'TREE_NOT_FOUND', 'Family tree not found');
  }

  await prisma.familyTree.delete({
    where: { id: treeId },
  });
}

export async function verifyTreeOwnership(treeId: string, userId: string): Promise<boolean> {
  const tree = await prisma.familyTree.findFirst({
    where: { id: treeId, userId },
    select: { id: true },
  });

  return !!tree;
}
