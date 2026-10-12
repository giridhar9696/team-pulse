export const demoCredentials = {
  admin: {
    email: "admin@teampulse.demo",
    password: "Admin@123",
  },
  employee: {
    employeeId: "EMP001",
    password: "Employee@123",
  },
} as const;

export type TeamPulseEmployee = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "active" | "inactive" | "frozen";
  demoPassword: string;
  velocity: number;
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
  tasks: ProjectTask[];
  activity: ProjectActivity[];
  notifications: string[];
};

export const employees: TeamPulseEmployee[] = [
  { id: "EMP001", name: "Jordan Lee", email: "jordan@teampulse.demo", role: "Frontend Engineer", status: "active", demoPassword: "Employee@123", velocity: 98 },
  { id: "EMP014", name: "Maya Chen", email: "maya@teampulse.demo", role: "Backend Engineer", status: "active", demoPassword: "Employee@123", velocity: 91 },
  { id: "EMP023", name: "Ravi Menon", email: "ravi@teampulse.demo", role: "Database Engineer", status: "active", demoPassword: "Employee@123", velocity: 87 },
  { id: "EMP032", name: "Nora Patel", email: "nora@teampulse.demo", role: "QA Analyst", status: "active", demoPassword: "Employee@123", velocity: 82 },
];

export const initialProjects: TeamPulseProject[] = [
  {
    id: "PULSE-CORE",
    name: "Core Operations Console",
    description: "Centralized operations surface for task review, team load, deadlines, and delivery health.",
    ownerId: "EMP014",
    startDate: "2026-09-14",
    deadline: "2026-11-05",
    status: "Active",
    notifications: ["Two review queues need admin attention.", "Calendar deadline export is ready for QA."],
    activity: [
      { id: "ACT-101", at: "2026-10-10", message: "Maya submitted the review queue schema." },
      { id: "ACT-102", at: "2026-10-11", message: "Jordan updated task card responsive states." },
    ],
    tasks: [
      {
        id: "TP-1042",
        title: "Review queue foundation",
        description: "Build the admin-facing review queue data contract.",
        technology: "Backend",
        assigneeId: "EMP014",
        assignedDate: "2026-09-15",
        deadline: "2026-10-14",
        status: "submitted",
        required: true,
        submission: {
          id: "SUB-1042-1",
          submittedAt: "2026-10-11T09:45",
          url: "https://example.com/review-queue-contract",
          note: "API contract draft ready for admin review.",
        },
        submissions: [
          {
            id: "SUB-1042-1",
            submittedAt: "2026-10-11T09:45",
            url: "https://example.com/review-queue-contract",
            note: "API contract draft ready for admin review.",
          },
        ],
        history: [{ id: "H-1042-1", at: "2026-10-11T09:45", message: "Work submitted for admin review." }],
      },
      {
        id: "TP-1043",
        title: "Dashboard density pass",
        description: "Tune admin dashboard cards and table density.",
        technology: "Frontend",
        assigneeId: "EMP001",
        assignedDate: "2026-09-16",
        deadline: "2026-10-18",
        status: "in_progress",
        required: true,
        history: [{ id: "H-1043-1", at: "2026-09-16T10:00", message: "Task assigned to Jordan Lee." }],
      },
      {
        id: "TP-1044",
        title: "Audit activity indexes",
        description: "Prepare indexes for activity lookup by project and employee.",
        technology: "Database",
        assigneeId: "EMP023",
        assignedDate: "2026-09-18",
        deadline: "2026-10-04",
        status: "approved",
        required: true,
        submission: {
          id: "SUB-1044-1",
          submittedAt: "2026-10-03T14:20",
          url: "https://example.com/audit-indexes",
          note: "Index plan attached for review.",
        },
        submissions: [
          {
            id: "SUB-1044-1",
            submittedAt: "2026-10-03T14:20",
            url: "https://example.com/audit-indexes",
            note: "Index plan attached for review.",
          },
        ],
        review: { decision: "approved", reviewedAt: "2026-10-04T11:30", feedback: "Approved for Prompt 4 integration." },
        history: [{ id: "H-1044-1", at: "2026-10-04T11:30", message: "Task approved by admin." }],
      },
    ],
  },
  {
    id: "PULSE-MOB",
    name: "Mobile Task Flow",
    description: "Mobile-first task submission, delay reporting, and task status review surfaces.",
    ownerId: "EMP001",
    startDate: "2026-09-20",
    deadline: "2026-10-20",
    status: "At Risk",
    notifications: ["Database task is overdue and blocks task submission metrics."],
    activity: [
      { id: "ACT-201", at: "2026-10-09", message: "Delay reporting copy was finalized." },
      { id: "ACT-202", at: "2026-10-12", message: "Database validation task moved overdue." },
    ],
    tasks: [
      {
        id: "TP-2031",
        title: "Employee task cards",
        description: "Implement employee task card grouping and status chips.",
        technology: "Frontend",
        assigneeId: "EMP001",
        assignedDate: "2026-09-22",
        deadline: "2026-10-10",
        status: "approved",
        required: true,
        review: { decision: "approved", reviewedAt: "2026-10-10T12:00", feedback: "Card states are ready." },
        history: [{ id: "H-2031-1", at: "2026-10-10T12:00", message: "Task approved by admin." }],
      },
      {
        id: "TP-2032",
        title: "Submission endpoint contract",
        description: "Prepare future submission endpoint shape without backend wiring.",
        technology: "Backend",
        assigneeId: "EMP014",
        assignedDate: "2026-09-23",
        deadline: "2026-10-16",
        status: "review",
        required: true,
        submission: {
          id: "SUB-2032-1",
          submittedAt: "2026-10-10T15:15",
          url: "https://example.com/submission-contract",
          note: "Contract needs admin decision on attachment metadata.",
        },
        submissions: [
          {
            id: "SUB-2032-1",
            submittedAt: "2026-10-10T15:15",
            url: "https://example.com/submission-contract",
            note: "Contract needs admin decision on attachment metadata.",
          },
        ],
        history: [{ id: "H-2032-1", at: "2026-10-10T15:15", message: "Work submitted for admin review." }],
      },
      {
        id: "TP-2033",
        title: "Task status materialized view",
        description: "Draft database view for employee task counts.",
        technology: "Database",
        assigneeId: "EMP023",
        assignedDate: "2026-09-24",
        deadline: "2026-10-08",
        status: "overdue",
        required: true,
        delay: { reportedAt: "2026-10-09T10:10", reason: "Waiting on final task status vocabulary before indexing." },
        delays: [{ reportedAt: "2026-10-09T10:10", reason: "Waiting on final task status vocabulary before indexing." }],
        history: [{ id: "H-2033-1", at: "2026-10-09T10:10", message: "Delay reported by assignee." }],
      },
    ],
  },
  {
    id: "PULSE-DATA",
    name: "Analytics Workspace",
    description: "Sprint velocity, employee comparison, and project progress analytics for admins.",
    ownerId: "EMP023",
    startDate: "2026-10-01",
    deadline: "2026-11-22",
    status: "Review",
    notifications: ["Velocity comparison is ready for design review."],
    activity: [
      { id: "ACT-301", at: "2026-10-08", message: "Velocity comparison mock data was normalized." },
      { id: "ACT-302", at: "2026-10-11", message: "Report export modal requirements were linked." },
    ],
    tasks: [
      {
        id: "TP-3041",
        title: "Velocity comparison chart",
        description: "Render accessible comparison bars using demo data.",
        technology: "Frontend",
        assigneeId: "EMP001",
        assignedDate: "2026-10-02",
        deadline: "2026-10-19",
        status: "submitted",
        required: true,
        submission: {
          id: "SUB-3041-1",
          submittedAt: "2026-10-11T16:35",
          url: "https://example.com/velocity-comparison",
          note: "Ready for admin review after copy pass.",
        },
        submissions: [
          {
            id: "SUB-3041-1",
            submittedAt: "2026-10-11T16:35",
            url: "https://example.com/velocity-comparison",
            note: "Ready for admin review after copy pass.",
          },
        ],
        history: [{ id: "H-3041-1", at: "2026-10-11T16:35", message: "Work submitted for admin review." }],
      },
      {
        id: "TP-3042",
        title: "Metrics aggregation contract",
        description: "Define derived metrics for dashboard panels.",
        technology: "Backend",
        assigneeId: "EMP014",
        assignedDate: "2026-10-03",
        deadline: "2026-10-23",
        status: "pending",
        required: true,
        history: [{ id: "H-3042-1", at: "2026-10-03T09:00", message: "Task assigned to Maya Chen." }],
      },
      {
        id: "TP-3043",
        title: "Analytics seed shape",
        description: "Create normalized analytics seed data.",
        technology: "Database",
        assigneeId: "EMP023",
        assignedDate: "2026-10-04",
        deadline: "2026-10-16",
        status: "approved",
        required: true,
        review: { decision: "approved", reviewedAt: "2026-10-16T13:00", feedback: "Seed shape is ready for dashboard derivations." },
        history: [{ id: "H-3043-1", at: "2026-10-16T13:00", message: "Task approved by admin." }],
      },
    ],
  },
];

export const employeeTasks = initialProjects
  .flatMap((project) =>
    project.tasks.map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      priority: task.status === "overdue" || task.status === "submitted" ? "High" : "Medium",
      project: project.name,
      assigneeId: task.assigneeId,
    })),
  )
  .filter((task) => task.assigneeId === "EMP001");
