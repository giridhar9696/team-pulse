import { employees, type TeamPulseEmployee } from "./demoData";

const storageKey = "team-pulse-employee-directory";

export type EmployeeInput = Pick<TeamPulseEmployee, "id" | "name" | "email" | "role" | "status" | "demoPassword" | "velocity">;

function isEmployeeRecord(value: unknown): value is TeamPulseEmployee {
  if (!value || typeof value !== "object") return false;
  const employee = value as Partial<TeamPulseEmployee>;
  return (
    typeof employee.id === "string" &&
    typeof employee.name === "string" &&
    typeof employee.email === "string" &&
    typeof employee.role === "string" &&
    (employee.status === "active" || employee.status === "inactive") &&
    typeof employee.demoPassword === "string" &&
    typeof employee.velocity === "number"
  );
}

export function readEmployeeDirectory(): TeamPulseEmployee[] {
  const stored = window.localStorage.getItem(storageKey);
  if (!stored) return employees;
  try {
    const parsed = JSON.parse(stored) as unknown;
    if (!Array.isArray(parsed)) return employees;
    const validEmployees = parsed.filter(isEmployeeRecord);
    return validEmployees.length ? validEmployees : employees;
  } catch {
    return employees;
  }
}

export function writeEmployeeDirectory(next: TeamPulseEmployee[]) {
  window.localStorage.setItem(storageKey, JSON.stringify(next));
}

export function getLoginEmployee(employeeId: string, password: string) {
  return readEmployeeDirectory().find(
    (employee) => employee.id === employeeId.trim().toUpperCase() && employee.demoPassword === password && employee.status === "active",
  );
}
