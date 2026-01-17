import { prisma } from '@familytree/database';
import type { FamilyMember, FamilyMemberWithRelations, CreateFamilyMemberInput, UpdateFamilyMemberInput } from '@familytree/types/member.types';
import { AppError } from '../middleware/error.middleware';
import { verifyTreeOwnership } from './tree.service';

export async function createMember(
  userId: string,
  data: CreateFamilyMemberInput
): Promise<FamilyMember> {
  const isOwner = await verifyTreeOwnership(data.familyTreeId, userId);

  if (!isOwner) {
    throw new AppError(403, 'FORBIDDEN', 'You do not have access to this family tree');
  }

  const member = await prisma.familyMember.create({
    data,
  });

  return member as FamilyMember;
}

export async function getMembersByTreeId(
  treeId: string,
  userId: string
): Promise<FamilyMemberWithRelations[]> {
  const tree = await prisma.familyTree.findFirst({
    where: {
      id: treeId,
      OR: [{ userId }, { isPublic: true }],
    },
    select: { id: true },
  });

  if (!tree) {
    throw new AppError(404, 'TREE_NOT_FOUND', 'Family tree not found');
  }

  const members = await prisma.familyMember.findMany({
    where: { familyTreeId: treeId },
    include: {
      parent: true,
      secondParent: true,
      children: true,
      files: true,
    },
    orderBy: [{ generation: 'asc' }, { birthYear: 'asc' }],
  });

  return members as FamilyMemberWithRelations[];
}

export async function getMemberById(
  memberId: string,
  userId: string
): Promise<FamilyMemberWithRelations | null> {
  const member = await prisma.familyMember.findUnique({
    where: { id: memberId },
    include: {
      parent: true,
      secondParent: true,
      children: true,
      files: true,
      familyTree: {
        select: { userId: true, isPublic: true },
      },
    },
  });

  if (!member) {
    return null;
  }

  if (member.familyTree.userId !== userId && !member.familyTree.isPublic) {
    throw new AppError(403, 'FORBIDDEN', 'You do not have access to this family member');
  }

  const { familyTree: _familyTree, ...memberData } = member;

  return memberData as FamilyMemberWithRelations;
}

export async function updateMember(
  memberId: string,
  userId: string,
  data: UpdateFamilyMemberInput
): Promise<FamilyMember> {
  const existingMember = await prisma.familyMember.findUnique({
    where: { id: memberId },
    include: {
      familyTree: { select: { userId: true } },
    },
  });

  if (!existingMember) {
    throw new AppError(404, 'MEMBER_NOT_FOUND', 'Family member not found');
  }

  if (existingMember.familyTree.userId !== userId) {
    throw new AppError(403, 'FORBIDDEN', 'You do not have access to this family member');
  }

  const member = await prisma.familyMember.update({
    where: { id: memberId },
    data,
  });

  return member as FamilyMember;
}

export async function deleteMember(memberId: string, userId: string): Promise<void> {
  const existingMember = await prisma.familyMember.findUnique({
    where: { id: memberId },
    include: {
      familyTree: { select: { userId: true } },
    },
  });

  if (!existingMember) {
    throw new AppError(404, 'MEMBER_NOT_FOUND', 'Family member not found');
  }

  if (existingMember.familyTree.userId !== userId) {
    throw new AppError(403, 'FORBIDDEN', 'You do not have access to this family member');
  }

  await prisma.familyMember.delete({
    where: { id: memberId },
  });
}
