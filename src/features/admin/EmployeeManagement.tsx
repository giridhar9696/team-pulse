import { useMemo, useState, type FormEvent } from "react";
import { AlertTriangle, Edit3, KeyRound, Plus, Search, UserCheck, UserX } from "lucide-react";
import { FieldShell, TextInput } from "../../components/ui/FormControls";
import { Toast } from "../../components/ui/Toast";
import type { EmployeeInput } from "../../data/employeeDirectory";
import type { TeamPulseEmployee } from "../../data/demoData";
import { useProjects } from "./projectContext";
import { statusLabel } from "./taskUtils";
import { getEmployeeMetrics } from "./employeeMetrics";

const defaultPassword = "Employee@123";

function blankEmployee(): EmployeeInput {
  return { id: "", name: "", email: "", role: "Frontend Engineer", status: "active", demoPassword: defaultPassword, velocity: 80 };
}

export function EmployeeManagement() {
  const { projects, employees, createEmployee, updateEmployee, setEmployeeStatus, resetEmployeePassword, reassignTask } = useProjects();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editing, setEditing] = useState<TeamPulseEmployee | "new" | null>(null);
  const [pendingAction, setPendingAction] = useState<{ employee: TeamPulseEmployee; status: TeamPulseEmployee["status"] } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const filtered = useMemo(() => employees.filter((employee) => {
    const text = `${employee.id} ${employee.name} ${employee.email} ${employee.role}`.toLowerCase();
    return text.includes(query.toLowerCase()) && (statusFilter === "all" || employee.status === statusFilter);
  }), [employees, query, statusFilter]);

  function handleStatus(employee: TeamPulseEmployee, status: TeamPulseEmployee["status"]) {
    const metrics = getEmployeeMetrics(employee, projects);
    if (status === "inactive" && metrics.pending > 0) {
      setPendingAction({ employee, status });
      return;
    }
    setEmployeeStatus(employee.id, status);
    setToast(`${employee.name} ${status === "active" ? "resumed" : status === "frozen" ? "frozen" : "deactivated"}.`);
  }

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Admin employee management</p>
          <h1>Engineering Directory</h1>
          <p>Manage prototype employee access, assignment metrics, and performance profiles.</p>
        </div>
        <button className="button button--primary" type="button" onClick={() => setEditing("new")}><Plus size={16} /> Add Employee</button>
      </section>

      {toast && <Toast tone="success" title="Employee updated" message={toast} onDismiss={() => setToast(null)} />}

      {pendingAction && (
        <section className="confirm-bar" role="alert">
          <div>
            <strong>Deactivate {pendingAction.employee.name}?</strong>
            <span>They still have active or review-state tasks. History and submissions will be preserved.</span>
          </div>
          <div className="confirm-bar__actions">
            <button className="button button--secondary" type="button" onClick={() => setPendingAction(null)}>Cancel</button>
            <button className="button button--primary" type="button" onClick={() => {
              setEmployeeStatus(pendingAction.employee.id, pendingAction.status);
              setToast(`${pendingAction.employee.name} deactivated. Demo login is now blocked.`);
              setPendingAction(null);
            }}>Deactivate</button>
          </div>
        </section>
      )}

      {editing === "new" && (
        <section className="data-panel">
          <div className="panel-heading">
            <h2>Add employee</h2>
          </div>
          <EmployeeForm
            initial={blankEmployee()}
            existingIds={employees.map((employee) => employee.id)}
            onCancel={() => setEditing(null)}
            onSubmit={(input) => {
              const result = createEmployee(input);
              if (!result) {
                setToast("Duplicate employee ID rejected.");
                return;
              }
              setToast(`${result.name} saved.`);
              setEditing(null);
            }}
          />
        </section>
      )}

      <section className="data-panel">
        <div className="filters-grid">
          <label className="search-field filters-grid__search" htmlFor="employee-search">
            <Search size={16} />
            <input id="employee-search" placeholder="Search employee, ID, email, role" value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <label className="select-field">
            <select aria-label="Account status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="frozen">Frozen</option>
            </select>
          </label>
        </div>
      </section>

      <section className="employee-directory">
        {filtered.map((employee) => {
          const metrics = getEmployeeMetrics(employee, projects);
          const isEditingEmployee = editing !== "new" && editing?.id === employee.id;
          return (
            <article className="employee-card" key={employee.id}>
              <div className="employee-card__header">
                <div className="employee-avatar">{employee.name.split(" ").map((part) => part[0]).join("")}</div>
                <div>
                  <h2>{employee.name}</h2>
                  <p>{employee.id} / {employee.role}</p>
                  <p>{employee.email}</p>
                </div>
                <span className={employee.status === "active" ? "status-chip status-chip--cyan" : "status-chip"}>{employee.status}</span>
              </div>
              <div className="employee-metrics">
                <span>Assigned <strong>{metrics.assigned}</strong></span>
                <span>Completed <strong>{metrics.completed}</strong></span>
                <span>Pending <strong>{metrics.pending}</strong></span>
                <span>Overdue <strong>{metrics.overdue}</strong></span>
              </div>
              <div className="bar-row">
                <div><strong>On-time completion</strong><span>{metrics.onTime} on time / {metrics.late} late</span></div>
                <div className="progress-meter"><span style={{ width: `${metrics.completed ? Math.round((metrics.onTime / metrics.completed) * 100) : 0}%` }} /></div>
                <span className="mono">{employee.velocity}%</span>
              </div>
              <div className="activity-list employee-card__tasks">
                {metrics.tasks.map((task) => (
                  <article key={task.id}>
                    <span className="mono">{task.id}</span>
                    <strong>{task.title}</strong>
                    <span className="status-chip">{statusLabel(task.status)}</span>
                    <label className="select-field select-field--full">
                      <select
                        aria-label={`Reassign ${task.id}`}
                        value={task.assigneeId}
                        onChange={(event) => {
                          const result = reassignTask(task.id, event.target.value);
                          setToast(result ? `${task.id} reassigned.` : `${task.id} could not be reassigned.`);
                        }}
                        disabled={task.status === "approved" || task.status === "cancelled"}
                      >
                        {employees.filter((item) => item.status === "active").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                      </select>
                    </label>
                  </article>
                ))}
              </div>
              <div className="row-actions">
                <button className="icon-button" type="button" title="Edit employee details" aria-label={`Edit ${employee.name}`} onClick={() => setEditing(isEditingEmployee ? null : employee)}><Edit3 size={16} /></button>
                <button className="icon-button" type="button" title="Reset demo password" aria-label={`Reset password for ${employee.name}`} onClick={() => { resetEmployeePassword(employee.id); setToast(`${employee.name}'s demo password reset to ${defaultPassword}.`); }}><KeyRound size={16} /></button>
                {employee.status === "active" ? (
                  <>
                    <button className="icon-button" type="button" aria-label={`Freeze ${employee.name}`} onClick={() => handleStatus(employee, "frozen")}><UserX size={16} /></button>
                    <button className="icon-button" type="button" aria-label={`Deactivate ${employee.name}`} onClick={() => handleStatus(employee, "inactive")}><UserX size={16} /></button>
                  </>
                ) : (
                  <button className="icon-button" type="button" aria-label={`Resume ${employee.name}`} onClick={() => handleStatus(employee, "active")}><UserCheck size={16} /></button>
                )}
              </div>
              {isEditingEmployee && (
                <section className="employee-card__editor" aria-label={`Edit ${employee.name} details`}>
                  <div className="panel-heading">
                    <div>
                      <h3>Edit employee details</h3>
                      <p>Pen edits details. Key resets the prototype password.</p>
                    </div>
                  </div>
                  <EmployeeForm
                    initial={employee}
                    existingIds={employees.map((item) => item.id)}
                    originalId={employee.id}
                    onCancel={() => setEditing(null)}
                    onSubmit={(input) => {
                      const result = updateEmployee(employee.id, input);
                      if (!result) {
                        setToast("Duplicate employee ID rejected.");
                        return;
                      }
                      setToast(`${result.name} saved.`);
                      setEditing(null);
                    }}
                  />
                </section>
              )}
            </article>
          );
        })}
      </section>
    </div>
  );
}

function EmployeeForm({ initial, existingIds, originalId, onSubmit, onCancel }: { initial: EmployeeInput; existingIds: string[]; originalId?: string; onSubmit: (input: EmployeeInput) => void; onCancel: () => void }) {
  const [form, setForm] = useState<EmployeeInput>(initial);
  const [error, setError] = useState<string | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const id = form.id.trim().toUpperCase();
    if (!id || !form.name.trim() || !form.role.trim()) {
      setError("Employee ID, name, and role are required.");
      return;
    }
    if (id !== originalId && existingIds.includes(id)) {
      setError("Employee ID must be unique.");
      return;
    }
    onSubmit({ ...form, id });
  }

  return (
    <form className="task-editor" onSubmit={submit}>
      {error && <p className="callout callout--warning"><AlertTriangle size={16} /> {error}</p>}
      <div className="form-grid">
        <FieldShell id="employee-id" label="Employee ID"><TextInput id="employee-id" value={form.id} onChange={(event) => setForm({ ...form, id: event.target.value })} /></FieldShell>
        <FieldShell id="employee-name" label="Name"><TextInput id="employee-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></FieldShell>
        <FieldShell id="employee-email" label="Email"><TextInput id="employee-email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></FieldShell>
        <FieldShell id="employee-role" label="Role"><TextInput id="employee-role" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} /></FieldShell>
        <FieldShell id="employee-status" label="Account status">
          <label className="select-field select-field--full">
            <select id="employee-status" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as TeamPulseEmployee["status"] })}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="frozen">Frozen</option>
            </select>
          </label>
        </FieldShell>
        <FieldShell id="employee-password" label="Demo password" hint="Never shown in lists">
          <TextInput id="employee-password" type="password" value={form.demoPassword} onChange={(event) => setForm({ ...form, demoPassword: event.target.value })} />
        </FieldShell>
      </div>
      <div className="form-actions form-actions--inline">
        <button className="button button--secondary" type="button" onClick={onCancel}>Cancel</button>
        <button className="button button--primary" type="submit">Save Employee</button>
      </div>
    </form>
  );
}
