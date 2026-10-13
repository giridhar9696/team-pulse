import { createContext, useContext } from "react";
import type { AppUser, LoginPayload } from "./authService";

export type AuthContextValue = {
  user: AppUser | null;
  loading: boolean;
  error: string | null;
  login: (payload: LoginPayload) => Promise<AppUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
