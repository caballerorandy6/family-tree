import { create } from 'zustand';
import type { UserWithoutPassword } from '@familytree/types/auth.types';

interface AuthState {
  user: UserWithoutPassword | null;
  accessToken: string | null;
  isLoading: boolean;
  setAuth: (user: UserWithoutPassword, accessToken: string) => void;
  clearAuth: () => void;
  setLoading: (isLoading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isLoading: true,
  setAuth: (user, accessToken) => set({ user, accessToken, isLoading: false }),
  clearAuth: () => set({ user: null, accessToken: null, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
}));
