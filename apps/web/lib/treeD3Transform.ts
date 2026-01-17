import type { FamilyMemberWithRelations } from '@familytree/types/member.types';

// Custom node data type for family tree
export interface FamilyNodeData {
  name: string;
  attributes?: {
    id: string;
    birthYear: number;
    deathYear?: number;
    gender?: string;
    photoUrl?: string;
    occupation?: string;
    relationship?: string;
    generation: number;
    // Spouse ID for drawing connection lines (not merged into same node)
    spouseId?: string;
    spouseName?: string;
  };
  children?: FamilyNodeData[];
}

/**
 * Get direct children of a member (where they are parent or secondParent)
 */
function getDirectChildren(
  memberId: string,
  members: FamilyMemberWithRelations[]
): FamilyMemberWithRelations[] {
  return members.filter(m => m.parentId === memberId || m.secondParentId === memberId);
}

/**
 * Check if a member has parents in the tree
 */
function hasParentsInTree(memberId: string, members: FamilyMemberWithRelations[]): boolean {
  const member = members.find(m => m.id === memberId);
  if (!member) return false;

  const memberIds = new Set(members.map(m => m.id));
  return !!(member.parentId && memberIds.has(member.parentId)) ||
         !!(member.secondParentId && memberIds.has(member.secondParentId));
}

/**
 * Find root members (those with no parents in tree)
 */
function findRoots(members: FamilyMemberWithRelations[]): FamilyMemberWithRelations[] {
  return members.filter(m => !hasParentsInTree(m.id, members));
}

/**
 * Get spouse of a member (direct spouseId relationship)
 */
function getSpouse(
  memberId: string,
  members: FamilyMemberWithRelations[]
): FamilyMemberWithRelations | undefined {
  const member = members.find(m => m.id === memberId);

  // Check direct spouse relationship
  if (member?.spouseId) {
    return members.find(m => m.id === member.spouseId);
  }

  // Check if someone has this member as their spouse
  const spouseOf = members.find(m => m.spouseId === memberId);
  if (spouseOf) {
    return spouseOf;
  }

  return undefined;
}

/**
 * Convert a member to a tree node (individual, not merged with spouse)
 */
function memberToNode(
  member: FamilyMemberWithRelations,
  calculatedGen: number,
  members: FamilyMemberWithRelations[]
): FamilyNodeData {
  const spouse = getSpouse(member.id, members);

  return {
    name: `${member.firstName} ${member.lastName}`,
    attributes: {
      id: member.id,
      birthYear: member.birthYear,
      deathYear: member.deathYear ?? undefined,
      gender: member.gender ?? undefined,
      photoUrl: member.photoUrl ?? undefined,
      occupation: member.occupation ?? undefined,
      relationship: member.relationship ?? undefined,
      generation: calculatedGen,
      spouseId: spouse?.id,
      spouseName: spouse ? `${spouse.firstName} ${spouse.lastName}` : undefined,
    },
    children: [],
  };
}

/**
 * Build tree recursively - each person is their own node
 */
function buildSubtree(
  member: FamilyMemberWithRelations,
  members: FamilyMemberWithRelations[],
  processedIds: Set<string>,
  currentGeneration: number
): FamilyNodeData {
  processedIds.add(member.id);

  // Create individual node for this member
  const node = memberToNode(member, currentGeneration, members);

  // Get children of this member
  const children = getDirectChildren(member.id, members);

  // Build subtrees for children
  const childNodes: FamilyNodeData[] = [];
  for (const child of children) {
    if (processedIds.has(child.id)) continue;
    childNodes.push(buildSubtree(child, members, processedIds, currentGeneration + 1));
  }

  if (childNodes.length > 0) {
    node.children = childNodes;
  }

  return node;
}

/**
 * Transform flat family member array to hierarchical tree structure
 * Each person is their own individual node
 */
export function transformToTreeData(
  members: FamilyMemberWithRelations[]
): FamilyNodeData | null {
  if (members.length === 0) return null;

  const processedIds = new Set<string>();

  // Find all members with no parents (roots)
  const roots = findRoots(members);

  if (roots.length === 0 && members.length > 0) {
    // Edge case: circular references - use first member
    return buildSubtree(members[0]!, members, processedIds, 0);
  }

  // Build tree from each root
  const rootNodes: FamilyNodeData[] = [];

  for (const root of roots) {
    if (processedIds.has(root.id)) continue;
    rootNodes.push(buildSubtree(root, members, processedIds, 0));
  }

  // Handle any remaining unprocessed members
  const remaining = members.filter(m => !processedIds.has(m.id));
  for (const member of remaining) {
    rootNodes.push(buildSubtree(member, members, processedIds, 0));
  }

  // Return single root or virtual root for multiple
  if (rootNodes.length === 1) {
    return rootNodes[0] ?? null;
  }

  if (rootNodes.length === 0) return null;

  return {
    name: 'Family',
    attributes: {
      id: 'root',
      birthYear: 0,
      generation: -1,
    },
    children: rootNodes,
  };
}

/**
 * Find a member by ID
 */
export function findMemberById(
  id: string,
  members: FamilyMemberWithRelations[]
): FamilyMemberWithRelations | undefined {
  if (id === 'root') return undefined;
  return members.find(m => m.id === id);
}
