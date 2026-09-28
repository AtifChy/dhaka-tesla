"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { AuthSession } from "@/lib/types";

interface AuthStore {
  session: AuthSession | null;
  setSession: (session: AuthSession) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      session: null,
      setSession: (session) => set({ session }),
      clearSession: () => set({ session: null }),
    }),
    {
      name: "dhaka-tesla-pool-auth",
    },
  ),
);
