export type TeamPulseEmployee = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "active" | "inactive" | "frozen";
  velocity: number;
  version: number;
  linked: boolean;
  accessRole: 'admin' | 'employee';
};

export type TaskStatus =
  | "pending"
  | "in_progress"
  | "submitted"
  | "review"
  | "changes_requested"
  | "approved"
  | "overdue"
  | "cancelled";
export type TechnologyArea = "Frontend" | "Backend" | "Database";

export type ProjectTask = {
  id: string;
  version: number;
  overdue?: boolean;
  title: string;
  description: string;
  technology: TechnologyArea;
  assigneeId: string;
  assignedDate: string;
  deadline: string;
  status: TaskStatus;
  required: boolean;
  submission?: TaskSubmission;
  submissions?: TaskSubmission[];
  review?: TaskReview;
  delay?: TaskDelay;
  delays?: TaskDelay[];
  history?: TaskHistoryEntry[];
};

export type TaskSubmission = {
  id: string;
  submittedAt: string;
  url: string;
  note: string;
};

export type TaskReview = {
  decision: "approved" | "changes_requested";
  reviewedAt: string;
  reviewedOn?: string;
  feedback: string;
};

export type TaskDelay = {
  reportedAt: string;
  reason: string;
};

export type TaskHistoryEntry = {
  id: string;
  at: string;
  message: string;
};

export type ProjectActivity = {
  id: string;
  at: string;
  message: string;
};

export type TeamPulseProject = {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  startDate: string;
  deadline: string;
  status: "Active" | "At Risk" | "Review" | "Completed";
  summary?: {progress:number;status:TeamPulseProject['status']};
  tasks: ProjectTask[];
  activity: ProjectActivity[];
  notifications: string[];
};
