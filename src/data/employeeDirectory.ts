import type { TeamPulseEmployee } from './types';

export type EmployeeInput = Pick<TeamPulseEmployee, 'id' | 'name' | 'email' | 'role' | 'status' | 'velocity'>;
