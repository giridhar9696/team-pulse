import { useState, type FormEvent } from "react";
import { Save } from "lucide-react";
import { FieldShell, TextInput } from "../../components/ui/FormControls";
import { Toast } from "../../components/ui/Toast";
import { useProjects } from "../admin/projectContext";
import { useAuth } from "../auth/authContext";

export function SettingsPage() {
  const { user } = useAuth();
  const { employees, settings, updateSettings, updateEmployee, updateEmployeePassword } = useProjects();
  const employee = employees.find((item) => item.id === user?.identifier);
  const [displayName, setDisplayName] = useState(settings.displayName || user?.name || "");
  const [email, setEmail] = useState(settings.email || employee?.email || (user?.role === "admin" ? user.identifier : ""));
  const [password, setPassword] = useState("");
  const [digest, setDigest] = useState(settings.notificationDigest);
  const [deadlineAlerts, setDeadlineAlerts] = useState(settings.deadlineAlerts);
  const [dateFormat, setDateFormat] = useState(settings.dateFormat);
  const [theme, setTheme] = useState(settings.theme);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!displayName.trim()) {
      setError("Display name is required.");
      return;
    }
    if (password && password.length < 8) {
      setError("Prototype password must be at least 8 characters.");
      return;
    }
    updateSettings({ displayName: displayName.trim(), email: email.trim(), password: password ? "updated" : settings.password, notificationDigest: digest, deadlineAlerts, dateFormat, theme });
    if (user?.role === "employee" && employee) {
      updateEmployee(employee.id, { ...employee, name: displayName.trim(), email: email.trim(), demoPassword: password || employee.demoPassword });
      if (password) updateEmployeePassword(employee.id, password);
    }
    setPassword("");
    setToast("Settings saved for this frontend demo.");
  }

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">{user?.role} settings</p>
          <h1>Settings</h1>
          <p>Profile, prototype password, notifications, date display, and theme preference.</p>
        </div>
      </section>
      {toast && <Toast tone="success" title="Settings saved" message={toast} onDismiss={() => setToast(null)} />}
      {error && <Toast tone="error" title="Settings error" message={error} onDismiss={() => setError(null)} />}
      <form className="data-panel" onSubmit={submit}>
        <div className="form-grid">
          <FieldShell id="settings-name" label="Display name"><TextInput id="settings-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></FieldShell>
          <FieldShell id="settings-email" label="Email"><TextInput id="settings-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></FieldShell>
          <FieldShell id="settings-password" label="Prototype password" hint="Frontend demo only"><TextInput id="settings-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Leave blank to keep current" /></FieldShell>
          <FieldShell id="settings-date" label="Date display"><label className="select-field select-field--full"><select id="settings-date" value={dateFormat} onChange={(event) => setDateFormat(event.target.value as typeof dateFormat)}><option value="iso">ISO dates</option><option value="friendly">Friendly dates</option></select></label></FieldShell>
          <FieldShell id="settings-theme" label="Theme preference"><label className="select-field select-field--full"><select id="settings-theme" value={theme} onChange={(event) => setTheme(event.target.value as typeof theme)}><option value="dark">Dark</option><option value="light">Light</option><option value="system">Device appearance ready</option></select></label></FieldShell>
          <FieldShell id="settings-notifications" label="Notification preferences">
            <div className="settings-toggles">
              <label className="toggle-row"><input type="checkbox" checked={digest} onChange={(event) => setDigest(event.target.checked)} /><span>Digest summaries</span></label>
              <label className="toggle-row"><input type="checkbox" checked={deadlineAlerts} onChange={(event) => setDeadlineAlerts(event.target.checked)} /><span>Deadline alerts</span></label>
            </div>
          </FieldShell>
        </div>
        <p className="callout">Authentication and password changes are frontend prototype state only. No backend security or permanent credential store is implemented.</p>
        <div className="form-actions form-actions--inline"><button className="button button--primary" type="submit"><Save size={16} /> Save Settings</button></div>
      </form>
    </div>
  );
}
