import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { AppShell } from "./app/AppShell";
import { AdminHome } from "./features/admin/AdminHome";
import { AddProjectForm } from "./features/admin/AddProjectForm";
import { AdminTasks } from "./features/admin/AdminTasks";
import { EmployeeManagement } from "./features/admin/EmployeeManagement";
import { ReportsPage } from "./features/admin/ReportsPage";
import { TaskDetail } from "./features/admin/TaskDetail";
import { CalendarPage } from "./features/calendar/CalendarPage";
import { ActivityLogPage } from "./features/operations/ActivityLogPage";
import { GlobalSearchPage } from "./features/operations/GlobalSearchPage";
import { HelpPage } from "./features/operations/HelpPage";
import { NotificationsPage } from "./features/operations/NotificationsPage";
import { SettingsPage } from "./features/operations/SettingsPage";
import { EmployeeHome } from "./features/employee/EmployeeHome";
import { EmployeeProjects } from "./features/employee/EmployeeProjects";
import { EmployeeTaskDetail } from "./features/employee/EmployeeTaskDetail";
import { EmployeeTasks } from "./features/employee/EmployeeTasks";
import { AuthProvider } from "./features/auth/AuthProvider";
import { LoginPage } from "./features/auth/LoginPage";
import { RequireRole } from "./features/auth/RequireRole";
import { ProjectProvider } from "./features/admin/ProjectProvider";
import { ProjectsList } from "./features/admin/ProjectsList";
import { ProjectWorkspace } from "./features/admin/ProjectWorkspace";
import "./styles/global.css";

const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/login" replace /> },
  { path: "/login", element: <LoginPage /> },
  {
    path: "/admin",
    element: <RequireRole role="admin" />,
    children: [
      {
        element: <AppShell panel="admin" />,
        children: [
          { index: true, element: <AdminHome /> },
          { path: "projects", element: <ProjectsList /> },
          { path: "projects/new", element: <AddProjectForm /> },
          { path: "projects/:projectId", element: <ProjectWorkspace /> },
          { path: "tasks", element: <AdminTasks /> },
          { path: "tasks/:taskId", element: <TaskDetail /> },
          { path: "employees", element: <EmployeeManagement /> },
          { path: "calendar", element: <CalendarPage panel="admin" /> },
          { path: "reports", element: <ReportsPage /> },
          { path: "notifications", element: <NotificationsPage /> },
          { path: "search", element: <GlobalSearchPage /> },
          { path: "activity", element: <ActivityLogPage /> },
          { path: "settings", element: <SettingsPage /> },
          { path: "help", element: <HelpPage /> },
        ],
      },
    ],
  },
  {
    path: "/employee",
    element: <RequireRole role="employee" />,
    children: [
      {
        element: <AppShell panel="employee" />,
        children: [
          { index: true, element: <EmployeeHome /> },
          { path: "tasks", element: <EmployeeTasks /> },
          { path: "tasks/:taskId", element: <EmployeeTaskDetail /> },
          { path: "projects", element: <EmployeeProjects /> },
          { path: "calendar", element: <CalendarPage panel="employee" /> },
          { path: "notifications", element: <NotificationsPage /> },
          { path: "search", element: <GlobalSearchPage /> },
          { path: "activity", element: <ActivityLogPage /> },
          { path: "settings", element: <SettingsPage /> },
          { path: "help", element: <HelpPage /> },
        ],
      },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <ProjectProvider>
        <RouterProvider router={router} />
      </ProjectProvider>
    </AuthProvider>
  </StrictMode>,
);
