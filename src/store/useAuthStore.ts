import { create } from 'zustand';
import type { User } from 'firebase/auth';
import type { UserProfile } from '../types';
import { auth } from '../firebase';

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  initialized: boolean; // 초기화 여부 추가
  setUser: (user: User | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  loading: true,
  initialized: false,
  setUser: (user) => set({ user, loading: false }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
  setInitialized: (initialized) => set({ initialized }),
  signOut: async () => {
    await auth.signOut();
    set({ user: null, profile: null, loading: false });
  },
}));
