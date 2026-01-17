import type { FamilyMemberWithRelations } from '@familytree/types/member.types';

// Spouse info for display
export interface SpouseInfo {
  id: string;
  name: string;
  firstName: string;
  photoUrl?: string;
  gender?: string;
  birthYear: number;
  // If true, this spouse appears elsewhere in tree (has own parents)
  appearsElsewhere: boolean;
}

// Custom node data type for family tree (not extending RawNodeDatum due to attribute type constraints)
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
    // All spouses - supports multiple marriages
    spouses: SpouseInfo[];
  };
  children?: FamilyNodeData[];
}

/**
 * Get spouse(s) of a member (those who share children OR have direct spouseId link)
 */
function getSpouses(
  memberId: string,
  members: FamilyMemberWithRelations[]
): FamilyMemberWithRelations[] {
  const spouseIds = new Set<string>();
  const member = members.find(m => m.id === memberId);

  // Check direct spouse relationship (spouseId field)
  if (member?.spouseId) {
    spouseIds.add(member.spouseId);
  }

  // Check if someone has this member as their spouse
  for (const m of members) {
    if (m.spouseId === memberId) {
      spouseIds.add(m.id);
    }
  }

  // Also check shared children (legacy behavior)
  for (const m of members) {
    if (m.parentId === memberId && m.secondParentId) {
      spouseIds.add(m.secondParentId);
    }
    if (m.secondParentId === memberId && m.parentId) {
      spouseIds.add(m.parentId);
    }
  }

  return members.filter(m => spouseIds.has(m.id));
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
 * Find TRUE root members based on PARENT-CHILD relationships
 * Roots are members who have NO parents in the tree
 */
function findRoots(members: FamilyMemberWithRelations[]): FamilyMemberWithRelations[] {
  const memberIds = new Set(members.map(m => m.id));

  return members.filter(m => {
    const hasParent1InTree = m.parentId && memberIds.has(m.parentId);
    const hasParent2InTree = m.secondParentId && memberIds.has(m.secondParentId);
    return !hasParent1InTree && !hasParent2InTree;
  });
}

/**
 * Filter roots to exclude "spouse-only" members
 * A spouse-only is someone with no parents BUT whose spouse HAS parents
 */
function filterSpouseOnlyRoots(
  roots: FamilyMemberWithRelations[],
  members: FamilyMemberWithRelations[]
): FamilyMemberWithRelations[] {
  const memberIds = new Set(members.map(m => m.id));

  return roots.filter(root => {
    const spouses = getSpouses(root.id, members);

    // Check if any spouse has parents in the tree
    for (const spouse of spouses) {
      const spouseHasParent = (spouse.parentId && memberIds.has(spouse.parentId)) ||
                              (spouse.secondParentId && memberIds.has(spouse.secondParentId));
      if (spouseHasParent) {
        // This root is just a spouse of someone with lineage - not a true root
        return false;
      }
    }

    return true;
  });
}

/**
 * Convert a single member to a tree node
 * All spouses are included in the spouses array
 */
function memberToNode(
  member: FamilyMemberWithRelations,
  calculatedGen: number,
  allSpouses: FamilyMemberWithRelations[],
  members: FamilyMemberWithRelations[]
): FamilyNodeData {
  // Build spouses array with info about whether each appears elsewhere
  const spousesInfo: SpouseInfo[] = allSpouses.map(spouse => ({
    id: spouse.id,
    name: `${spouse.firstName} ${spouse.lastName}`,
    firstName: spouse.firstName,
    photoUrl: spouse.photoUrl ?? undefined,
    gender: spouse.gender ?? undefined,
    birthYear: spouse.birthYear,
    appearsElsewhere: hasParentsInTree(spouse.id, members),
  }));

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
      spouses: spousesInfo,
    },
    children: [],
  };
}

/**
 * Check if a member has parents in the tree
 */
function hasParentsInTree(memberId: string, members: FamilyMemberWithRelations[]): boolean {
  const member = members.find(m => m.id === memberId);
  if (!member) return false;

  const memberIds = new Set(members.map(m => m.id));
  const hasParent1 = !!(member.parentId && memberIds.has(member.parentId));
  const hasParent2 = !!(member.secondParentId && memberIds.has(member.secondParentId));
  return hasParent1 || hasParent2;
}

/**
 * Build tree recursively following parent→child relationships
 *
 * IMPORTANT: Spouse is only attached if they have NO parents in the tree.
 * If spouse has their own parents, they appear as their own node for clear lineage.
 */
function buildSubtree(
  primaryMember: FamilyMemberWithRelations,
  members: FamilyMemberWithRelations[],
  processedIds: Set<string>,
  currentGeneration: number
): FamilyNodeData {
  processedIds.add(primaryMember.id);

  // Get ALL spouses (those who share children with this member)
  const allSpouses = getSpouses(primaryMember.id, members);

  // Mark spouses as processed ONLY if they don't have parents in tree
  // (so they won't appear as their own branch)
  for (const spouse of allSpouses) {
    if (!hasParentsInTree(spouse.id, members) && !processedIds.has(spouse.id)) {
      processedIds.add(spouse.id);
    }
  }

  // Create node with ALL spouses info
  const node = memberToNode(primaryMember, currentGeneration, allSpouses, members);

  // Collect all children of the primary member AND all their spouses
  const childIds = new Set<string>();
  const children = getDirectChildren(primaryMember.id, members);
  children.forEach(c => childIds.add(c.id));

  // Include children from ALL spouses to ensure children appear
  for (const spouse of allSpouses) {
    const spouseChildren = getDirectChildren(spouse.id, members);
    spouseChildren.forEach(c => childIds.add(c.id));
  }

  // Build subtrees for children (next generation = currentGeneration + 1)
  const childNodes: FamilyNodeData[] = [];
  for (const childId of childIds) {
    if (processedIds.has(childId)) continue;

    const child = members.find(m => m.id === childId);
    if (child) {
      childNodes.push(buildSubtree(child, members, processedIds, currentGeneration + 1));
    }
  }

  if (childNodes.length > 0) {
    node.children = childNodes;
  }

  return node;
}

/**
 * Transform flat family member array to hierarchical tree structure
 *
 * IMPORTANT: The tree is built from PARENT-CHILD relationships, NOT creation order.
 * The oldest ancestor (whoever has no parents in the tree) becomes the root.
 */
export function transformToTreeData(
  members: FamilyMemberWithRelations[]
): FamilyNodeData | null {
  if (members.length === 0) return null;

  const processedIds = new Set<string>();

  // Step 1: Find all members with no parents (potential roots)
  const potentialRoots = findRoots(members);

  // Step 2: Filter out spouse-only members (they'll be included with their spouse)
  const trueRoots = filterSpouseOnlyRoots(potentialRoots, members);

  // Fallback if no true roots (shouldn't happen normally)
  const roots = trueRoots.length > 0 ? trueRoots : potentialRoots;

  if (roots.length === 0 && members.length > 0) {
    // Edge case: circular references or data issue - just use first member
    return buildSubtree(members[0]!, members, processedIds, 0);
  }

  // Step 3: Build tree from roots
  // Only attach spouse if they also have no parents (both are true roots)
  const rootNodes: FamilyNodeData[] = [];

  for (const root of roots) {
    if (processedIds.has(root.id)) continue;

    // Get ALL spouses for this root
    const allSpouses = getSpouses(root.id, members);

    // Mark root as processed
    processedIds.add(root.id);

    // Mark spouses as processed ONLY if they don't have parents
    for (const spouse of allSpouses) {
      if (!hasParentsInTree(spouse.id, members) && !processedIds.has(spouse.id)) {
        processedIds.add(spouse.id);
      }
    }

    // Create node with ALL spouses info
    const node = memberToNode(root, 0, allSpouses, members);

    // Get all children from root AND all their spouses
    const childIds = new Set<string>();
    getDirectChildren(root.id, members).forEach(c => childIds.add(c.id));

    for (const spouse of allSpouses) {
      getDirectChildren(spouse.id, members).forEach(c => childIds.add(c.id));
    }

    // Build child subtrees
    const childNodes: FamilyNodeData[] = [];
    for (const childId of childIds) {
      if (processedIds.has(childId)) continue;
      const child = members.find(m => m.id === childId);
      if (child) {
        childNodes.push(buildSubtree(child, members, processedIds, 1));
      }
    }

    if (childNodes.length > 0) {
      node.children = childNodes;
    }

    rootNodes.push(node);
  }

  // Step 5: Handle any remaining unprocessed members (orphans)
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
      spouses: [],
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
