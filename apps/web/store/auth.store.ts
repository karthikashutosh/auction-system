import { User } from "@repo/types";
import { create } from "zustand";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isInitialized: boolean;

  initialize: (user: User | null) => void;
  setUser: (user: User | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isInitialized: false,

  initialize: (user) =>
    set({
      user,
      isAuthenticated: !!user,
      isInitialized: true,
    }),

  setUser: (user) =>
    set((state) => ({
      user,
      isAuthenticated: !!user,
      isInitialized: state.isInitialized,
    })),

  logout: () =>
    set({
      user: null,
      isAuthenticated: false,
      isInitialized: true,
    }),
}));
