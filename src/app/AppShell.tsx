import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Bell, Command, LogOut, PanelLeft, Search, UserRound, X } from "lucide-react";
import { Sidebar } from "../components/layout/Sidebar";
import { BrandMark } from "../components/ui/BrandMark";
import { useAuth } from "../features/auth/authContext";
import { useProjects } from "../features/admin/projectContext";

type AppShellProps = {
  panel: "admin" | "employee";
};

export function AppShell({ panel }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { user, logout } = useAuth();
  const { notifications, readNotificationIds, loading, busy, error, loadError, hasData, refresh, dismissError } = useProjects();
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState("");
  const [logoutError, setLogoutError] = useState('');
  const mobilePanel=useRef<HTMLDivElement>(null);
  const menuTrigger=useRef<HTMLButtonElement>(null);
  useEffect(()=>{
    if (!mobileOpen) return;
    const trigger=menuTrigger.current;
    mobilePanel.current?.querySelector<HTMLButtonElement>('button')?.focus();
    return ()=>trigger?.focus();
  },[mobileOpen]);
  const unreadCount = notifications.filter(item=>!readNotificationIds.includes(item.id)).length;

  const pageTitle = useMemo(() => {
    const segment = location.pathname.split("/").filter(Boolean).at(-1);
    if (!segment || segment === panel) {
      return panel === "admin" ? "Dashboard" : "Dashboard";
    }

    return segment
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }, [location.pathname, panel]);

  async function handleLogout() {
    try { await logout(); navigate("/login", { replace: true }); }
    catch { setLogoutError('Unable to log out. Please retry.'); }
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigate(`/${panel}/search?q=${encodeURIComponent(search.trim())}`);
  }

  return (
    <div className="app-shell">
      <Sidebar panel={panel} />
      {mobileOpen && (
        <div ref={mobilePanel} className="mobile-nav" role="dialog" aria-modal="true" aria-label="Navigation menu"
          onClick={event=>{if ((event.target as Element).closest('a')) setMobileOpen(false);}}
          onKeyDown={event=>{
            if (event.key==='Escape') {event.preventDefault();setMobileOpen(false);return;}
            if (event.key!=='Tab') return;
            const controls=event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]),a[href]');
            const first=controls[0],last=controls[controls.length-1];
            if (event.shiftKey&&document.activeElement===first) {event.preventDefault();last?.focus();}
            else if (!event.shiftKey&&document.activeElement===last) {event.preventDefault();first?.focus();}
          }}>
          <div className="mobile-nav__panel">
            <button className="icon-button mobile-nav__close" aria-label="Close navigation" onClick={() => setMobileOpen(false)}>
              <X size={19} />
            </button>
            <Sidebar panel={panel} />
          </div>
        </div>
      )}
      <div className="app-main">
        <header className="topbar">
          <div className="topbar__brand">
            <button ref={menuTrigger} className="icon-button topbar__menu" aria-label="Open navigation" onClick={() => setMobileOpen(true)}>
              <PanelLeft size={20} />
            </button>
            <div>
              <BrandMark />
              <div className="breadcrumbs">
                <Link to={`/${panel}`}>{panel === "admin" ? "Admin" : "Employee"}</Link>
                <span>/</span>
                <span>{pageTitle}</span>
              </div>
            </div>
            <span className="role-chip">{panel === "admin" ? "Admin" : "Employee"}</span>
          </div>
          <div className="topbar__actions">
            <form className="search-field" onSubmit={handleSearch}>
              <Search size={16} aria-hidden="true" />
              <input
                id="global-search"
                name="global-search"
                aria-label="Search tasks, projects, people"
                placeholder="Search tasks, projects, people"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <kbd>
                <Command size={12} />K
              </kbd>
            </form>
            <button className="icon-button notification-button" aria-label="Notifications" onClick={() => navigate(`/${panel}/notifications`)}>
              <Bell size={19} />
              {unreadCount > 0 && <span>{unreadCount}</span>}
            </button>
            <div className="profile-menu">
              <button
                className="profile-menu__trigger"
                type="button"
                aria-label={`Profile menu for ${user?.name}`}
                aria-expanded={profileOpen}
                aria-haspopup="menu"
                onClick={() => setProfileOpen((open) => !open)}
              >
                <span className="profile-menu__avatar" aria-hidden="true">
                  {user?.name
                    .split(" ")
                    .map((part) => part[0])
                    .join("")}
                </span>
                <span>{user?.name}</span>
              </button>
              {profileOpen && (
                <div className="dropdown-menu" role="menu">
                  <div className="dropdown-menu__header">
                    <UserRound size={16} />
                    <div>
                      <strong>{user?.name}</strong>
                      <span>{user?.identifier}</span>
                    </div>
                  </div>
                  <button type="button" role="menuitem" onClick={handleLogout}>
                    <LogOut size={16} />
                    Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="page-shell">
          {logoutError && <p role="alert">{logoutError}</p>}
          {error && <div role="alert" className="callout callout--warning">{error} <button type="button" onClick={()=>void refresh()}>Refresh</button> {!loadError && <button type="button" onClick={dismissError}>Dismiss</button>}</div>}
          {loading ? <p role="status">Loading your workspace…</p> : loadError && !hasData ? <p>Workspace data could not be loaded.</p> : <fieldset className="workspace-content" disabled={busy || loadError} aria-busy={busy}><Outlet /></fieldset>}
        </main>
      </div>
    </div>
  );
}
