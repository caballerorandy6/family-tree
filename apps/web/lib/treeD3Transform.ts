import type { FamilyMemberWithRelations } from '@familytree/types/member.types';

// Custom node data type for family tree
export interface FamilyNodeData {
  name: string;
  attributes?: {
    id: string;
    memberId?: string; // Real member ID (for non-couple nodes)
    isCouple?: boolean; // True for couple nodes
    partner1Id?: string;
    partner2Id?: string;
    birthYear: number;
    deathYear?: number;
    gender?: string;
    photoUrl?: string;
    generation: number;
    spouseId?: string;
  };
  children?: FamilyNodeData[];
}

/**
 * Get direct children of a member
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
 * Get all children of a couple (both parents combined)
 */
function getChildrenOfCouple(
  parent1Id: string,
  parent2Id: string | null,
  members: FamilyMemberWithRelations[]
): FamilyMemberWithRelations[] {
  return members.filter(m => {
    const hasParent1 = m.parentId === parent1Id || m.secondParentId === parent1Id;
    if (!parent2Id) return hasParent1;
    const hasParent2 = m.parentId === parent2Id || m.secondParentId === parent2Id;
    return hasParent1 || hasParent2;
  });
}

/**
 * Find partner of a member (through shared children or spouseId)
 */
function findPartner(
  memberId: string,
  members: FamilyMemberWithRelations[]
): FamilyMemberWithRelations | undefined {
  const member = members.find(m => m.id === memberId);

  // Check direct spouseId
  if (member?.spouseId) {
    const spouse = members.find(m => m.id === member.spouseId);
    if (spouse) return spouse;
  }

  // Check if someone has this member as spouse
  const spouseOf = members.find(m => m.spouseId === memberId);
  if (spouseOf) return spouseOf;

  // Check through shared children
  const children = getDirectChildren(memberId, members);
  for (const child of children) {
    const otherId = child.parentId === memberId ? child.secondParentId : child.parentId;
    if (otherId) {
      const other = members.find(m => m.id === otherId);
      if (other) return other;
    }
  }

  return undefined;
}

/**
 * Create a node for a single member
 */
function createMemberNode(
  member: FamilyMemberWithRelations,
  generation: number
): FamilyNodeData {
  return {
    name: `${member.firstName} ${member.lastName}`,
    attributes: {
      id: member.id,
      memberId: member.id,
      isCouple: false,
      birthYear: member.birthYear,
      deathYear: member.deathYear ?? undefined,
      gender: member.gender ?? undefined,
      photoUrl: member.photoUrl ?? undefined,
      generation,
      spouseId: member.spouseId ?? undefined,
    },
    children: [],
  };
}

/**
 * Create a couple node (shows both partners side by side)
 */
function createCoupleNode(
  member1: FamilyMemberWithRelations,
  member2: FamilyMemberWithRelations,
  generation: number
): FamilyNodeData {
  return {
    name: `${member1.firstName} & ${member2.firstName}`,
    attributes: {
      id: `couple-${member1.id}-${member2.id}`,
      isCouple: true,
      partner1Id: member1.id,
      partner2Id: member2.id,
      birthYear: Math.min(member1.birthYear, member2.birthYear),
      generation,
    },
    children: [],
  };
}

/**
 * Build tree recursively
 */
function buildSubtree(
  member: FamilyMemberWithRelations,
  members: FamilyMemberWithRelations[],
  processedIds: Set<string>,
  currentGeneration: number
): FamilyNodeData {
  processedIds.add(member.id);

  // Find partner
  const partner = findPartner(member.id, members);

  // If has partner not yet processed, create couple node
  if (partner && !processedIds.has(partner.id)) {
    processedIds.add(partner.id);

    const coupleNode = createCoupleNode(member, partner, currentGeneration);

    // Get all children of this couple
    const children = getChildrenOfCouple(member.id, partner.id, members);

    for (const child of children) {
      if (processedIds.has(child.id)) continue;
      coupleNode.children!.push(
        buildSubtree(child, members, processedIds, currentGeneration + 1)
      );
    }

    return coupleNode;
  }

  // Single member node
  const node = createMemberNode(member, currentGeneration);

  // Get children
  const children = getDirectChildren(member.id, members);

  for (const child of children) {
    if (processedIds.has(child.id)) continue;
    node.children!.push(
      buildSubtree(child, members, processedIds, currentGeneration + 1)
    );
  }

  return node;
}

/**
 * Transform flat family member array to hierarchical tree structure
 */
export function transformToTreeData(
  members: FamilyMemberWithRelations[]
): FamilyNodeData | null {
  if (members.length === 0) return null;

  const processedIds = new Set<string>();
  const roots = findRoots(members);

  if (roots.length === 0 && members.length > 0) {
    return buildSubtree(members[0]!, members, processedIds, 0);
  }

  const rootNodes: FamilyNodeData[] = [];

  for (const root of roots) {
    if (processedIds.has(root.id)) continue;
    rootNodes.push(buildSubtree(root, members, processedIds, 0));
  }

  // Handle remaining unprocessed members
  const remaining = members.filter(m => !processedIds.has(m.id));
  for (const member of remaining) {
    rootNodes.push(buildSubtree(member, members, processedIds, 0));
  }

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
  if (id === 'root' || id.startsWith('couple-')) return undefined;
  return members.find(m => m.id === id);
}
