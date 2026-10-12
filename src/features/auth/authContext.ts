import { createContext, useContext } from "react";
import type { DemoUser, LoginPayload } from "./authService";

export type AuthContextValue = {
  user: DemoUser | null;
  login: (payload: LoginPayload) => Promise<DemoUser>;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
