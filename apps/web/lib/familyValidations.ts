import type { FamilyMemberWithRelations, RelationshipType } from '@familytree/types/member.types';

/**
 * Family relationship validation utilities
 * Prevents illogical family tree relationships
 */

// Member type for simplified UI
export type MemberType = 'ancestor' | 'descendant' | 'sibling' | 'spouse';

/**
 * Calculate the relationship type based on gender and member type
 */
export function calculateRelationship(
  memberType: MemberType,
  gender: 'male' | 'female' | 'other' | undefined,
  generationDiff: number = 1,
  isHalfSibling: boolean = false
): RelationshipType {
  const isMale = gender === 'male';
  const isFemale = gender === 'female';

  switch (memberType) {
    case 'ancestor':
      // generationDiff: 1 = parent, 2 = grandparent, 3 = great-grandparent, 4 = great-great-grandparent
      if (generationDiff === 1) {
        return isMale ? 'father' : isFemale ? 'mother' : 'father';
      } else if (generationDiff === 2) {
        return isMale ? 'grandfather' : isFemale ? 'grandmother' : 'grandfather';
      } else if (generationDiff === 3) {
        return isMale ? 'great-grandfather' : isFemale ? 'great-grandmother' : 'great-grandfather';
      } else {
        return isMale ? 'great-great-grandfather' : isFemale ? 'great-great-grandmother' : 'great-great-grandfather';
      }

    case 'descendant':
      // generationDiff: 1 = child, 2 = grandchild, 3 = great-grandchild, 4 = great-great-grandchild
      if (generationDiff === 1) {
        return isMale ? 'son' : isFemale ? 'daughter' : 'son';
      } else if (generationDiff === 2) {
        return isMale ? 'grandson' : isFemale ? 'granddaughter' : 'grandson';
      } else if (generationDiff === 3) {
        return isMale ? 'great-grandson' : isFemale ? 'great-granddaughter' : 'great-grandson';
      } else {
        return isMale ? 'great-great-grandson' : isFemale ? 'great-great-granddaughter' : 'great-great-grandson';
      }

    case 'sibling':
      if (isHalfSibling) {
        return isMale ? 'half-brother' : isFemale ? 'half-sister' : 'half-brother';
      }
      return isMale ? 'brother' : isFemale ? 'sister' : 'brother';

    case 'spouse':
      return 'spouse';

    default:
      return 'other';
  }
}

/**
 * Determine if a new member would be a half-sibling based on shared parents
 */
export function isHalfSiblingRelationship(
  parentId: string | undefined,
  secondParentId: string | undefined,
  referenceMembers: FamilyMemberWithRelations[],
  referenceMemberId: string
): boolean {
  const referenceMember = referenceMembers.find(m => m.id === referenceMemberId);
  if (!referenceMember) return false;

  // If no parents selected, not a sibling at all
  if (!parentId) return false;

  // Get reference member's parents
  const refParent1 = referenceMember.parentId;
  const refParent2 = referenceMember.secondParentId;

  // Check if they share exactly one parent (half-sibling)
  const sharesParent1 = parentId === refParent1 || parentId === refParent2 ||
                        secondParentId === refParent1 || secondParentId === refParent2;

  // For full siblings, both parents must match
  const sharesBothParents = refParent1 && refParent2 &&
    ((parentId === refParent1 && secondParentId === refParent2) ||
     (parentId === refParent2 && secondParentId === refParent1));

  // Half-sibling if shares at least one parent but not both
  return sharesParent1 && !sharesBothParents;
}

// Get all children of a member
export function getChildrenOf(memberId: string, members: FamilyMemberWithRelations[]): FamilyMemberWithRelations[] {
  return members.filter(m => m.parentId === memberId || m.secondParentId === memberId);
}

// Get parents of a member
export function getParentsOf(member: FamilyMemberWithRelations, members: FamilyMemberWithRelations[]): FamilyMemberWithRelations[] {
  const parents: FamilyMemberWithRelations[] = [];
  if (member.parentId) {
    const parent = members.find(m => m.id === member.parentId);
    if (parent) parents.push(parent);
  }
  if (member.secondParentId) {
    const parent = members.find(m => m.id === member.secondParentId);
    if (parent) parents.push(parent);
  }
  return parents;
}

// Check if two members share at least one child (are spouses/partners)
export function areSpouses(member1Id: string, member2Id: string, members: FamilyMemberWithRelations[]): boolean {
  return members.some(m =>
    (m.parentId === member1Id && m.secondParentId === member2Id) ||
    (m.parentId === member2Id && m.secondParentId === member1Id)
  );
}

// Get all spouses/partners of a member (those who share children with them)
export function getSpousesOf(memberId: string, members: FamilyMemberWithRelations[]): FamilyMemberWithRelations[] {
  const spouseIds = new Set<string>();
  for (const m of members) {
    if (m.parentId === memberId && m.secondParentId) {
      spouseIds.add(m.secondParentId);
    }
    if (m.secondParentId === memberId && m.parentId) {
      spouseIds.add(m.parentId);
    }
  }
  return Array.from(spouseIds)
    .map(id => members.find(m => m.id === id))
    .filter((m): m is FamilyMemberWithRelations => m !== undefined);
}

// Get all ancestors (parents, grandparents, etc.) recursively
export function getAllAncestors(memberId: string, members: FamilyMemberWithRelations[], visited = new Set<string>()): Set<string> {
  if (visited.has(memberId)) return visited;

  const member = members.find(m => m.id === memberId);
  if (!member) return visited;

  if (member.parentId && !visited.has(member.parentId)) {
    visited.add(member.parentId);
    getAllAncestors(member.parentId, members, visited);
  }
  if (member.secondParentId && !visited.has(member.secondParentId)) {
    visited.add(member.secondParentId);
    getAllAncestors(member.secondParentId, members, visited);
  }

  return visited;
}

// Get all descendants (children, grandchildren, etc.) recursively
export function getAllDescendants(memberId: string, members: FamilyMemberWithRelations[], visited = new Set<string>()): Set<string> {
  if (visited.has(memberId)) return visited;

  const children = getChildrenOf(memberId, members);
  for (const child of children) {
    if (!visited.has(child.id)) {
      visited.add(child.id);
      getAllDescendants(child.id, members, visited);
    }
  }

  return visited;
}

// Get siblings (full and half)
export function getSiblingsOf(memberId: string, members: FamilyMemberWithRelations[]): {
  fullSiblings: FamilyMemberWithRelations[];
  halfSiblings: FamilyMemberWithRelations[];
} {
  const member = members.find(m => m.id === memberId);
  if (!member) return { fullSiblings: [], halfSiblings: [] };

  const fullSiblings: FamilyMemberWithRelations[] = [];
  const halfSiblings: FamilyMemberWithRelations[] = [];

  for (const m of members) {
    if (m.id === memberId) continue;

    const sharesParent1 = member.parentId && (m.parentId === member.parentId || m.secondParentId === member.parentId);
    const sharesParent2 = member.secondParentId && (m.parentId === member.secondParentId || m.secondParentId === member.secondParentId);

    if (sharesParent1 && sharesParent2 && member.parentId && member.secondParentId) {
      // Shares both parents = full sibling
      fullSiblings.push(m);
    } else if (sharesParent1 || sharesParent2) {
      // Shares only one parent = half sibling
      halfSiblings.push(m);
    }
  }

  return { fullSiblings, halfSiblings };
}

// Validation result interface
export interface ValidationResult {
  isValid: boolean;
  error?: string;
  warning?: string;
}

// Validate that a person cannot be their own parent
export function validateNotSelfParent(
  memberId: string | undefined,
  parentId: string | undefined,
  secondParentId: string | undefined
): ValidationResult {
  if (memberId && (parentId === memberId || secondParentId === memberId)) {
    return { isValid: false, error: 'A person cannot be their own parent.' };
  }
  return { isValid: true };
}

// Validate that both parents are not the same person
export function validateDifferentParents(
  parentId: string | undefined,
  secondParentId: string | undefined
): ValidationResult {
  if (parentId && secondParentId && parentId === secondParentId) {
    return { isValid: false, error: 'First and second parent cannot be the same person.' };
  }
  return { isValid: true };
}

// Validate no circular relationships (can't be ancestor of your ancestor)
export function validateNoCircularRelationship(
  newMemberId: string | undefined,
  parentId: string | undefined,
  secondParentId: string | undefined,
  members: FamilyMemberWithRelations[]
): ValidationResult {
  if (!newMemberId) return { isValid: true };

  // Get all descendants of the new member
  const descendants = getAllDescendants(newMemberId, members);

  // Check if any proposed parent is a descendant of the new member
  if (parentId && descendants.has(parentId)) {
    const parent = members.find(m => m.id === parentId);
    return {
      isValid: false,
      error: `Cannot set ${parent?.firstName || 'this person'} as parent - they are a descendant of this person (circular relationship).`
    };
  }

  if (secondParentId && descendants.has(secondParentId)) {
    const parent = members.find(m => m.id === secondParentId);
    return {
      isValid: false,
      error: `Cannot set ${parent?.firstName || 'this person'} as parent - they are a descendant of this person (circular relationship).`
    };
  }

  return { isValid: true };
}

// Validate generation consistency (parents should be from earlier generation)
export function validateGenerationConsistency(
  memberGeneration: number,
  parentId: string | undefined,
  secondParentId: string | undefined,
  members: FamilyMemberWithRelations[]
): ValidationResult {
  if (parentId) {
    const parent = members.find(m => m.id === parentId);
    if (parent && parent.generation >= memberGeneration) {
      return {
        isValid: false,
        warning: `Warning: ${parent.firstName} (generation ${parent.generation}) should be from an earlier generation than the child (generation ${memberGeneration}).`
      };
    }
  }

  if (secondParentId) {
    const parent = members.find(m => m.id === secondParentId);
    if (parent && parent.generation >= memberGeneration) {
      return {
        isValid: false,
        warning: `Warning: ${parent.firstName} (generation ${parent.generation}) should be from an earlier generation than the child (generation ${memberGeneration}).`
      };
    }
  }

  return { isValid: true };
}

// Minimum age for a parent (reasonable biological minimum)
const MIN_PARENT_AGE = 12;

// Validate birth year consistency (child cannot be born before parent)
export function validateBirthYearConsistency(
  childBirthYear: number | undefined,
  parentId: string | undefined,
  secondParentId: string | undefined,
  members: FamilyMemberWithRelations[]
): ValidationResult {
  if (!childBirthYear) return { isValid: true };

  const errors: string[] = [];

  if (parentId) {
    const parent = members.find(m => m.id === parentId);
    if (parent) {
      const ageDiff = childBirthYear - parent.birthYear;
      if (ageDiff < 0) {
        errors.push(`${parent.firstName} was born in ${parent.birthYear}. A child cannot be born before their parent (${childBirthYear}).`);
      } else if (ageDiff < MIN_PARENT_AGE) {
        errors.push(`${parent.firstName} was born in ${parent.birthYear}. They would have been only ${ageDiff} years old when the child was born (${childBirthYear}). Minimum parent age is ${MIN_PARENT_AGE}.`);
      }
    }
  }

  if (secondParentId) {
    const parent = members.find(m => m.id === secondParentId);
    if (parent) {
      const ageDiff = childBirthYear - parent.birthYear;
      if (ageDiff < 0) {
        errors.push(`${parent.firstName} was born in ${parent.birthYear}. A child cannot be born before their parent (${childBirthYear}).`);
      } else if (ageDiff < MIN_PARENT_AGE) {
        errors.push(`${parent.firstName} was born in ${parent.birthYear}. They would have been only ${ageDiff} years old when the child was born (${childBirthYear}). Minimum parent age is ${MIN_PARENT_AGE}.`);
      }
    }
  }

  if (errors.length > 0) {
    return { isValid: false, error: errors[0] };
  }

  return { isValid: true };
}

// Validate that ancestor is older than descendant
export function validateAncestorAge(
  ancestorBirthYear: number | undefined,
  descendantId: string | undefined,
  members: FamilyMemberWithRelations[],
  generationDiff: number = 1
): ValidationResult {
  if (!ancestorBirthYear || !descendantId) return { isValid: true };

  const descendant = members.find(m => m.id === descendantId);
  if (!descendant) return { isValid: true };

  const minAgeDiff = MIN_PARENT_AGE * generationDiff;
  const actualAgeDiff = descendant.birthYear - ancestorBirthYear;

  if (actualAgeDiff < 0) {
    return {
      isValid: false,
      error: `An ancestor cannot be younger than their descendant. ${descendant.firstName} was born in ${descendant.birthYear}.`
    };
  }

  if (actualAgeDiff < minAgeDiff) {
    return {
      isValid: false,
      error: `The ancestor would have been only ${actualAgeDiff} years old when ${descendant.firstName} was born. For ${generationDiff} generation(s) difference, minimum is ${minAgeDiff} years.`
    };
  }

  return { isValid: true };
}

// Validate parents are from the same generation (warning only)
export function validateParentsSameGeneration(
  parentId: string | undefined,
  secondParentId: string | undefined,
  members: FamilyMemberWithRelations[]
): ValidationResult {
  if (!parentId || !secondParentId) return { isValid: true };

  const parent1 = members.find(m => m.id === parentId);
  const parent2 = members.find(m => m.id === secondParentId);

  if (parent1 && parent2 && parent1.generation !== parent2.generation) {
    return {
      isValid: true, // Allow but warn
      warning: `Note: ${parent1.firstName} (generation ${parent1.generation}) and ${parent2.firstName} (generation ${parent2.generation}) are from different generations.`
    };
  }

  return { isValid: true };
}

// Validate for half-sibling: should NOT share both parents (that would make them full siblings)
export function validateHalfSiblingRelationship(
  parentId: string | undefined,
  secondParentId: string | undefined,
  members: FamilyMemberWithRelations[],
  isHalfSibling: boolean = false
): ValidationResult {
  if (!parentId) return { isValid: true };

  // Check if secondParent is already a spouse of parent1
  if (secondParentId) {
    const isExistingSpouse = areSpouses(parentId, secondParentId, members);

    if (isExistingSpouse && isHalfSibling) {
      const parent1 = members.find(m => m.id === parentId);
      const parent2 = members.find(m => m.id === secondParentId);
      return {
        isValid: false,
        error: `${parent1?.firstName ?? 'First parent'} and ${parent2?.firstName ?? 'second parent'} already have children together. A half-sibling cannot have the same two parents - that would make them a full sibling.`
      };
    }
  }

  return { isValid: true };
}

// Check if adding this parent would create a new relationship (warning)
export function checkNewParentalRelationship(
  parentId: string | undefined,
  secondParentId: string | undefined,
  members: FamilyMemberWithRelations[]
): ValidationResult {
  if (!parentId || !secondParentId) return { isValid: true };

  const alreadySpouses = areSpouses(parentId, secondParentId, members);

  if (!alreadySpouses) {
    const parent1 = members.find(m => m.id === parentId);
    const parent2 = members.find(m => m.id === secondParentId);
    const parent1Spouses = getSpousesOf(parentId, members);
    const parent2Spouses = getSpousesOf(secondParentId, members);

    if (parent1 && parent2) {
      if (parent1Spouses.length > 0 && parent2Spouses.length > 0) {
        return {
          isValid: true,
          warning: `This will create a new parental relationship between ${parent1.firstName} and ${parent2.firstName}. Both already have other partners in the tree.`
        };
      } else if (parent1Spouses.length > 0) {
        return {
          isValid: true,
          warning: `${parent1.firstName} already has children with ${parent1Spouses.map(s => s.firstName).join(', ')}. This creates a new relationship with ${parent2.firstName}.`
        };
      } else if (parent2Spouses.length > 0) {
        return {
          isValid: true,
          warning: `${parent2.firstName} already has children with ${parent2Spouses.map(s => s.firstName).join(', ')}. This creates a new relationship with ${parent1.firstName}.`
        };
      }
    }
  }

  return { isValid: true };
}

// Filter valid parent options based on member being edited
export function getValidParentOptions(
  memberId: string | undefined,
  members: FamilyMemberWithRelations[],
  excludeId?: string
): FamilyMemberWithRelations[] {
  if (!memberId) return members;

  const member = members.find(m => m.id === memberId);
  if (!member) return members;

  // Get all descendants - cannot be parent if you're a descendant
  const descendants = getAllDescendants(memberId, members);

  return members.filter(m => {
    // Cannot be self
    if (m.id === memberId) return false;
    // Cannot be a descendant (would create circular relationship)
    if (descendants.has(m.id)) return false;
    // Exclude specific ID if provided
    if (excludeId && m.id === excludeId) return false;
    return true;
  });
}

// Get display info for a member with relationship context
export function getMemberDisplayInfo(
  member: FamilyMemberWithRelations,
  members: FamilyMemberWithRelations[]
): string {
  const children = getChildrenOf(member.id, members);
  const spouses = getSpousesOf(member.id, members);

  let info = `${member.firstName} ${member.lastName}`;

  const details: string[] = [];
  if (children.length > 0) {
    details.push(`${children.length} child${children.length > 1 ? 'ren' : ''}`);
  }
  if (spouses.length > 0) {
    details.push(`partner: ${spouses.map(s => s.firstName).join(', ')}`);
  }

  if (details.length > 0) {
    info += ` (${details.join(', ')})`;
  }

  return info;
}

// Run all validations and return combined result
export function runAllValidations(
  memberId: string | undefined,
  parentId: string | undefined,
  secondParentId: string | undefined,
  memberGeneration: number,
  members: FamilyMemberWithRelations[],
  isHalfSibling: boolean = false,
  birthYear?: number,
  memberType?: MemberType,
  relatedToId?: string
): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check self-parent
  const selfParentResult = validateNotSelfParent(memberId, parentId, secondParentId);
  if (!selfParentResult.isValid && selfParentResult.error) errors.push(selfParentResult.error);

  // Check different parents
  const differentParentsResult = validateDifferentParents(parentId, secondParentId);
  if (!differentParentsResult.isValid && differentParentsResult.error) errors.push(differentParentsResult.error);

  // Check circular relationships
  const circularResult = validateNoCircularRelationship(memberId, parentId, secondParentId, members);
  if (!circularResult.isValid && circularResult.error) errors.push(circularResult.error);

  // Check generation consistency (warning)
  const generationResult = validateGenerationConsistency(memberGeneration, parentId, secondParentId, members);
  if (generationResult.warning) warnings.push(generationResult.warning);

  // Check parents same generation (warning)
  const sameGenResult = validateParentsSameGeneration(parentId, secondParentId, members);
  if (sameGenResult.warning) warnings.push(sameGenResult.warning);

  // Check half-sibling logic
  const halfSibResult = validateHalfSiblingRelationship(parentId, secondParentId, members, isHalfSibling);
  if (!halfSibResult.isValid && halfSibResult.error) errors.push(halfSibResult.error);
  if (halfSibResult.warning) warnings.push(halfSibResult.warning);

  // Check new parental relationship
  const newRelResult = checkNewParentalRelationship(parentId, secondParentId, members);
  if (newRelResult.warning) warnings.push(newRelResult.warning);

  // Check birth year consistency for descendants/siblings (child cannot be older than parent)
  // Also check when editing (no memberType but has parents)
  if (birthYear && (memberType === 'descendant' || memberType === 'sibling' || (!memberType && (parentId || secondParentId)))) {
    const birthYearResult = validateBirthYearConsistency(birthYear, parentId, secondParentId, members);
    if (!birthYearResult.isValid && birthYearResult.error) errors.push(birthYearResult.error);
  }

  // Check ancestor age (ancestor must be older than descendant)
  if (birthYear && memberType === 'ancestor' && relatedToId) {
    const ancestorResult = validateAncestorAge(birthYear, relatedToId, members, 1);
    if (!ancestorResult.isValid && ancestorResult.error) errors.push(ancestorResult.error);
  }

  return { errors, warnings };
}
