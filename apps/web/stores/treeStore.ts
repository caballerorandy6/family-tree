import { create } from 'zustand';
import type { FamilyTree, FamilyTreeWithMemberCount } from '@familytree/types/tree.types';
import type { FamilyMemberWithRelations } from '@familytree/types/member.types';

interface TreeState {
  trees: FamilyTreeWithMemberCount[];
  currentTree: FamilyTree | null;
  members: FamilyMemberWithRelations[];
  selectedMember: FamilyMemberWithRelations | null;
  isLoading: boolean;
  setTrees: (trees: FamilyTreeWithMemberCount[]) => void;
  setCurrentTree: (tree: FamilyTree | null) => void;
  setMembers: (members: FamilyMemberWithRelations[]) => void;
  setSelectedMember: (member: FamilyMemberWithRelations | null) => void;
  setLoading: (isLoading: boolean) => void;
  addTree: (tree: FamilyTreeWithMemberCount) => void;
  updateTree: (id: string, updates: Partial<FamilyTree>) => void;
  removeTree: (id: string) => void;
  addMember: (member: FamilyMemberWithRelations) => void;
  updateMember: (id: string, updates: Partial<FamilyMemberWithRelations>) => void;
  removeMember: (id: string) => void;
}

export const useTreeStore = create<TreeState>((set) => ({
  trees: [],
  currentTree: null,
  members: [],
  selectedMember: null,
  isLoading: false,
  setTrees: (trees) => set({ trees }),
  setCurrentTree: (tree) => set({ currentTree: tree }),
  setMembers: (members) => set({ members }),
  setSelectedMember: (member) => set({ selectedMember: member }),
  setLoading: (isLoading) => set({ isLoading }),
  addTree: (tree) => set((state) => ({ trees: [tree, ...state.trees] })),
  updateTree: (id, updates) =>
    set((state) => ({
      trees: state.trees.map((t) => (t.id === id ? { ...t, ...updates } : t)),
      currentTree: state.currentTree?.id === id ? { ...state.currentTree, ...updates } : state.currentTree,
    })),
  removeTree: (id) =>
    set((state) => ({
      trees: state.trees.filter((t) => t.id !== id),
      currentTree: state.currentTree?.id === id ? null : state.currentTree,
    })),
  addMember: (member) =>
    set((state) => ({
      members: [...state.members, member].sort((a, b) =>
        a.generation !== b.generation ? a.generation - b.generation : a.birthYear - b.birthYear
      ),
    })),
  updateMember: (id, updates) =>
    set((state) => ({
      members: state.members.map((m) => (m.id === id ? { ...m, ...updates } : m)),
      selectedMember: state.selectedMember?.id === id ? { ...state.selectedMember, ...updates } : state.selectedMember,
    })),
  removeMember: (id) =>
    set((state) => ({
      members: state.members.filter((m) => m.id !== id),
      selectedMember: state.selectedMember?.id === id ? null : state.selectedMember,
    })),
}));
