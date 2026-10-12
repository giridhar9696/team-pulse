import { useMemo, useState, type FormEvent } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Send, TimerReset } from "lucide-react";
import { FieldShell, TextAreaInput, TextInput } from "../../components/ui/FormControls";
import { Toast } from "../../components/ui/Toast";
import { useProjects } from "../admin/projectContext";
import { isTaskOverdue, statusLabel } from "../admin/taskUtils";
import { useAuth } from "../auth/authContext";
import { canEmployeeSubmit, getEmployeeTasks, isValidSubmissionUrl } from "./employeeUtils";

type FormErrors = {
  url?: string;
  note?: string;
  reason?: string;
};

export function EmployeeTaskDetail() {
  const { taskId } = useParams();
  const { user } = useAuth();
  const { projects, employees, submitTask, reportDelay } = useProjects();
  const employeeId = user?.identifier ?? "";
  const task = useMemo(() => getEmployeeTasks(projects, employeeId, employees).find((item) => item.id === taskId), [employeeId, employees, projects, taskId]);
  const [url, setUrl] = useState(task?.submission?.url ?? "");
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState<"submit" | "delay" | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});

  if (!task) return <Navigate to="/employee" replace />;

  const canSubmit = canEmployeeSubmit(task);
  const overdue = task.status === "overdue" || isTaskOverdue(task);
  const delays = task.delays ?? (task.delay ? [task.delay] : []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: FormErrors = {};
    if (!url.trim()) nextErrors.url = "Work URL is required.";
    else if (!isValidSubmissionUrl(url.trim())) nextErrors.url = "Enter a valid http or https URL.";
    if (!note.trim()) nextErrors.note = "Completion note is required.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || saving) return;

    setSaving("submit");
    const result = submitTask(task.id, { url: url.trim(), note: note.trim() });
    setSaving(null);
    if (!result) {
      setToast("This task cannot be submitted in its current state.");
      return;
    }
    setNote("");
    setToast(task.status === "changes_requested" ? "Resubmission sent for admin review." : "Submission sent for admin review.");
  }

  function handleDelay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: FormErrors = {};
    if (!reason.trim()) nextErrors.reason = "Delay reason is required.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || saving) return;

    setSaving("delay");
    const result = reportDelay(task.id, reason.trim());
    setSaving(null);
    if (!result) {
      setToast("This task cannot report a delay in its current state.");
      return;
    }
    setReason("");
    setToast("Delay reason recorded for admin visibility.");
  }

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">My task detail</p>
          <h1>{task.title}</h1>
          <p>{task.projectName} / {task.technology}</p>
        </div>
        <Link className="button button--secondary" to="/employee/tasks"><ArrowLeft size={16} /> Back to Tasks</Link>
      </section>

      {toast && <Toast tone={toast.startsWith("This task") ? "error" : "success"} title="Task update" message={toast} onDismiss={() => setToast(null)} />}

      <section className="data-panel">
        <div className="panel-heading">
          <div>
            <span className="mono">{task.id}</span>
            <h2>{task.description}</h2>
          </div>
          <span className="status-chip">{statusLabel(task.status)}</span>
        </div>
        <div className="workspace-meta">
          <span>Assigned {task.assignedDate}</span>
          <span className={overdue ? "deadline deadline--late" : "deadline"}>Due {task.deadline}</span>
          <span>{task.assigneeName}</span>
        </div>
        {task.review?.decision === "changes_requested" && <p className="callout callout--warning">Changes requested: {task.review.feedback}</p>}
        {task.review?.decision === "approved" && <p className="callout"><CheckCircle2 size={16} /> Approved {task.review.reviewedAt}: {task.review.feedback}</p>}
        {task.delay && <p className="callout callout--warning">Latest delay: {task.delay.reason} ({task.delay.reportedAt})</p>}
      </section>

      <section className="dashboard-grid">
        <form className="data-panel" id="submit" onSubmit={handleSubmit}>
          <div className="panel-heading">
            <div>
              <h2>{task.status === "changes_requested" ? "Resubmit work" : "Submit work"}</h2>
              <p>Send a URL and note to the Admin review queue.</p>
            </div>
          </div>
          <FieldShell id="employee-submit-url" label="Work URL" error={errors.url}>
            <TextInput id="employee-submit-url" name="employee-submit-url" placeholder="https://github.com/teampulse/app/pull/184" value={url} onChange={(event) => setUrl(event.target.value)} error={errors.url} disabled={!canSubmit} />
          </FieldShell>
          <FieldShell id="employee-submit-note" label="Completion note" error={errors.note}>
            <TextAreaInput id="employee-submit-note" name="employee-submit-note" placeholder="Summarize what changed and how you checked it." value={note} onChange={(event) => setNote(event.target.value)} disabled={!canSubmit} />
          </FieldShell>
          <div className="form-actions form-actions--inline">
            <button className="button button--secondary" type="button" onClick={() => { setUrl(task.submission?.url ?? ""); setNote(""); setErrors({}); }} disabled={!canSubmit || saving === "submit"}>Cancel</button>
            <button className="button button--primary" type="submit" disabled={!canSubmit || saving === "submit"}><Send size={16} /> {saving === "submit" ? "Submitting" : "Submit for Review"}</button>
          </div>
        </form>

        <form className="data-panel" id="delay" onSubmit={handleDelay}>
          <div className="panel-heading">
            <div>
              <h2>Report delay</h2>
              <p>Record a reason without changing official assignment or approval fields.</p>
            </div>
          </div>
          <FieldShell id="employee-delay" label="Mandatory reason" error={errors.reason}>
            <TextAreaInput id="employee-delay" name="employee-delay" placeholder="Describe the blocker, impact, and mitigation." value={reason} onChange={(event) => setReason(event.target.value)} disabled={!canSubmit} />
          </FieldShell>
          <div className="form-actions form-actions--inline">
            <button className="button button--secondary" type="button" onClick={() => { setReason(""); setErrors({}); }} disabled={!canSubmit || saving === "delay"}>Cancel</button>
            <button className="button button--secondary" type="submit" disabled={!canSubmit || saving === "delay"}><TimerReset size={16} /> {saving === "delay" ? "Recording" : "Report Delay"}</button>
          </div>
        </form>
      </section>

      <section className="dashboard-grid">
        <div className="data-panel">
          <div className="panel-heading">
            <h2>Submission history</h2>
          </div>
          <div className="activity-list">
            {(task.submissions ?? []).length ? task.submissions!.map((submission) => (
              <article key={submission.id}>
                <strong>{submission.url}</strong>
                <span>{submission.note}</span>
                <span className="mono">{submission.submittedAt}</span>
              </article>
            )) : <p>No submissions yet.</p>}
          </div>
        </div>
        <div className="data-panel">
          <div className="panel-heading">
            <h2>Delay history</h2>
          </div>
          <div className="activity-list">
            {delays.length ? delays.map((delay) => (
              <article key={`${delay.reportedAt}-${delay.reason}`}>
                <strong>{delay.reportedAt}</strong>
                <span>{delay.reason}</span>
              </article>
            )) : <p>No delays reported.</p>}
          </div>
        </div>
        <div className="data-panel">
          <div className="panel-heading">
            <h2>Task activity</h2>
          </div>
          <div className="activity-list">
            {(task.history ?? []).map((entry) => (
              <article key={entry.id}>
                <strong>{entry.message}</strong>
                <span className="mono">{entry.at}</span>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
