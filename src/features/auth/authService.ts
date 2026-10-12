import { demoCredentials } from "../../data/demoData";
import { getLoginEmployee } from "../../data/employeeDirectory";

export type UserRole = "admin" | "employee";

export type DemoUser = {
  role: UserRole;
  name: string;
  identifier: string;
};

export type LoginPayload = {
  role: UserRole;
  identifier: string;
  password: string;
};

export function authenticateDemoUser({ role, identifier, password }: LoginPayload): DemoUser | null {
  if (
    role === "admin" &&
    identifier.trim().toLowerCase() === demoCredentials.admin.email &&
    password === demoCredentials.admin.password
  ) {
    return {
      role: "admin",
      name: "Alex Rivera",
      identifier: demoCredentials.admin.email,
    };
  }

  const employee = role === "employee" ? getLoginEmployee(identifier, password) : null;
  if (employee) {
    return {
      role: "employee",
      name: employee.name,
      identifier: employee.id,
    };
  }

  return null;
}
