import { useMemo, useState, type ReactNode } from "react";
import { readEmployeeDirectory } from "../../data/employeeDirectory";
import { AuthContext, type AuthContextValue } from "./authContext";
import { authenticateDemoUser, type DemoUser } from "./authService";

const storageKey = "team-pulse-demo-user";

function readStoredUser(): DemoUser | null {
  const stored = window.localStorage.getItem(storageKey);
  if (!stored) {
    return null;
  }

  try {
    const user = JSON.parse(stored) as DemoUser;
    if (user.role === "employee") {
      const employee = readEmployeeDirectory().find((item) => item.id === user.identifier && item.status === "active");
      return employee ? { ...user, name: employee.name } : null;
    }
    return user.role === "admin" || user.role === "employee" ? user : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DemoUser | null>(() => readStoredUser());

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      login: async (payload) => {
        await new Promise((resolve) => window.setTimeout(resolve, 450));
        const authenticated = authenticateDemoUser(payload);

        if (!authenticated) {
          throw new Error("Invalid demo credentials");
        }

        setUser(authenticated);
        window.localStorage.setItem(storageKey, JSON.stringify(authenticated));
        return authenticated;
      },
      logout: () => {
        setUser(null);
        window.localStorage.removeItem(storageKey);
      },
    }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
