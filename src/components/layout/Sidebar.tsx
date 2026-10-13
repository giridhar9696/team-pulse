import { Link, NavLink } from "react-router-dom";
import {
  Activity,
  BarChart3,
  CalendarDays,
  FolderKanban,
  HelpCircle,
  LayoutDashboard,
  ListChecks,
  Settings,
  UsersRound,
  Bell,
} from "lucide-react";
import { BrandMark } from "../ui/BrandMark";

type SidebarProps = {
  panel: "admin" | "employee";
};

const adminItems = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/projects", label: "Projects", icon: FolderKanban },
  { to: "/admin/tasks", label: "Tasks", icon: ListChecks },
  { to: "/admin/employees", label: "Employees", icon: UsersRound },
  { to: "/admin/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/admin/reports", label: "Reports", icon: BarChart3 },
  { to: "/admin/notifications", label: "Notifications", icon: Bell },
  { to: "/admin/activity", label: "Activity Log", icon: Activity },
  { to: "/admin/settings", label: "Settings", icon: Settings },
  { to: "/admin/help", label: "Help", icon: HelpCircle },
];

const employeeItems = [
  { to: "/employee", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/employee/tasks", label: "My Tasks", icon: ListChecks },
  { to: "/employee/projects", label: "My Projects", icon: FolderKanban },
  { to: "/employee/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/employee/notifications", label: "Notifications", icon: Bell },
  { to: "/employee/activity", label: "Activity History", icon: Activity },
  { to: "/employee/settings", label: "Settings", icon: Settings },
  { to: "/employee/help", label: "Help", icon: HelpCircle },
];

export function Sidebar({ panel }: SidebarProps) {
  const items = panel === "admin" ? adminItems : employeeItems;

  return (
    <aside className="sidebar">
      <div>
        <Link className="sidebar__brand" to={panel === "admin" ? "/admin" : "/employee"}>
          <BrandMark stacked />
        </Link>
        <nav className="sidebar__nav" aria-label={`${panel} navigation`}>
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  isActive ? "sidebar__link sidebar__link--active" : "sidebar__link"
                }
              >
                <Icon size={19} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>
      <div className="sidebar__note">
        <strong>{panel === "admin" ? "Admin" : "Employee"} panel</strong>
        <span>Your organization workspace</span>
      </div>
    </aside>
  );
}
