import { useMemo, useState, type FormEvent } from "react";
import { AlertTriangle, Edit3, KeyRound, Plus, Search, UserCheck, UserX } from "lucide-react";
import { FieldShell, TextInput } from "../../components/ui/FormControls";
import { Toast } from "../../components/ui/Toast";
import type { EmployeeInput } from "../../data/employeeDirectory";
import type { TeamPulseEmployee } from "../../data/types";
import { useProjects } from "./projectContext";
import { statusLabel } from "./taskUtils";
import { getEmployeeMetrics } from "./employeeMetrics";
import { employeeInput } from '../../lib/validation';

function blankEmployee(): EmployeeInput {
  return { id: "", name: "", email: "", role: "Frontend Engineer", status: "active", velocity: 0 };
}

export function EmployeeManagement() {
  const { projects, employees, createEmployee, updateEmployee, setEmployeeStatus, resetEmployeePassword, inviteEmployee, reassignTask } = useProjects();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editing, setEditing] = useState<TeamPulseEmployee | "new" | null>(null);
  const [pendingAction, setPendingAction] = useState<{ employee: TeamPulseEmployee; status: TeamPulseEmployee["status"] } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const filtered = useMemo(() => employees.filter((employee) => {
    const text = `${employee.id} ${employee.name} ${employee.email} ${employee.role}`.toLowerCase();
    return text.includes(query.toLowerCase()) && (statusFilter === "all" || employee.status === statusFilter);
  }), [employees, query, statusFilter]);

  async function handleStatus(employee: TeamPulseEmployee, status: TeamPulseEmployee["status"]) {
    const metrics = getEmployeeMetrics(employee, projects);
    if (status === "inactive" && metrics.pending > 0) {
      setPendingAction({ employee, status });
      return;
    }
    if (!await setEmployeeStatus(employee.id, status, employee.version)) return;
    setToast(`${employee.name} ${status === "active" ? "resumed" : status === "frozen" ? "frozen" : "deactivated"}.`);
  }

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Admin employee management</p>
          <h1>Engineering Directory</h1>
          <p>Manage employee access, assignment metrics, and performance profiles.</p>
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
            <button className="button button--primary" type="button" onClick={async () => {
              if (!await setEmployeeStatus(pendingAction.employee.id, pendingAction.status, pendingAction.employee.version)) return;
              setToast(`${pendingAction.employee.name} deactivated. Workspace access is now blocked.`);
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
            onSubmit={async (input) => {
              const result = await createEmployee(input);
              if (!result) {
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
            <input id="employee-search" aria-label="Search employees" placeholder="Search employee, ID, email, role" value={query} onChange={(event) => setQuery(event.target.value)} />
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
                        onChange={async (event) => {
                          const result = await reassignTask(task.id, event.target.value);
                          if (result) setToast(`${task.id} reassigned.`);
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
                {employee.accessRole === 'employee' && <>
                <button className="icon-button" type="button" title="Edit employee details" aria-label={`Edit ${employee.name}`} onClick={() => setEditing(isEditingEmployee ? null : employee)}><Edit3 size={16} /></button>
                <button className="icon-button" type="button" title={employee.linked ? 'Request password recovery' : 'Invite employee'} aria-label={employee.linked ? `Reset password for ${employee.name}` : `Invite ${employee.name}`} onClick={async () => { if (await (employee.linked ? resetEmployeePassword(employee.id) : inviteEmployee(employee.id))) setToast('Account email requested.'); }}><KeyRound size={16} /></button>
                {employee.status === "active" ? (
                  <>
                    <button className="icon-button" type="button" aria-label={`Freeze ${employee.name}`} onClick={() => handleStatus(employee, "frozen")}><UserX size={16} /></button>
                    <button className="icon-button" type="button" aria-label={`Deactivate ${employee.name}`} onClick={() => handleStatus(employee, "inactive")}><UserX size={16} /></button>
                  </>
                ) : (
                  <button className="icon-button" type="button" aria-label={`Resume ${employee.name}`} onClick={() => handleStatus(employee, "active")}><UserCheck size={16} /></button>
                )}
                </>}
              </div>
              {isEditingEmployee && (
                <section className="employee-card__editor" aria-label={`Edit ${employee.name} details`}>
                  <div className="panel-heading">
                    <div>
                      <h3>Edit employee details</h3>
                      <p>Pen edits details. Key requests invitation or password recovery.</p>
                    </div>
                  </div>
                  <EmployeeForm
                    initial={employee}
                    existingIds={employees.map((item) => item.id)}
                    originalId={employee.id}
                    onCancel={() => setEditing(null)}
                    onSubmit={async (input) => {
                      const result = await updateEmployee(employee.id, input, editing ? editing.version : employee.version);
                      if (!result) {
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

function EmployeeForm({ initial, existingIds, originalId, onSubmit, onCancel }: { initial: EmployeeInput; existingIds: string[]; originalId?: string; onSubmit: (input: EmployeeInput) => Promise<void>; onCancel: () => void }) {
  const [form, setForm] = useState<EmployeeInput>(initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const id = form.id.trim().toUpperCase();
    if (!id || !form.name.trim() || !form.role.trim()) {
      setError("Employee ID, name, and role are required.");
      return;
    }
    if (id !== originalId && existingIds.includes(id)) {
      setError("Employee ID must be unique.");
      return;
    }
    if (!employeeInput.safeParse({...form,id}).success) {setError('Enter a valid employee code, name, email and job title.');return;}
    setSaving(true);
    try { await onSubmit({ ...form, id }); } finally { setSaving(false); }
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
      </div>
      <div className="form-actions form-actions--inline">
        <button className="button button--secondary" type="button" onClick={onCancel}>Cancel</button>
        <button className="button button--primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Employee'}</button>
      </div>
    </form>
  );
}
