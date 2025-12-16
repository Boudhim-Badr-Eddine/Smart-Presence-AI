import { create } from 'zustand';

type Role = 'admin' | 'trainer' | 'student' | null;

type AuthState = {
  role: Role;
  email: string | null;
  setAuth: (payload: { role: Role; email: string | null }) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  role: null,
  email: null,
  setAuth: ({ role, email }) => set({ role, email }),
}));
