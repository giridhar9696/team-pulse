import { useMemo, useState, type FormEvent } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, RefreshCcw, Send, XCircle } from "lucide-react";
import { FieldShell, TextAreaInput, TextInput } from "../../components/ui/FormControls";
import { Toast } from "../../components/ui/Toast";
import { useProjects } from "./projectContext";
import { getTaskRecords, statusLabel } from "./taskUtils";
import { submissionInput } from '../../lib/validation';
import { useDateFormat } from '../operations/useDateFormat';

export function TaskDetail() {
  const formatDate=useDateFormat();
  const { taskId } = useParams();
  const { projects, employees, approveTask, requestChanges, submitTask, reportDelay, cancelTask } = useProjects();
  const task = useMemo(() => getTaskRecords(projects, employees).find((item) => item.id === taskId), [employees, projects, taskId]);
  const [feedback, setFeedback] = useState("");
  const [submitUrl, setSubmitUrl] = useState("");
  const [submitNote, setSubmitNote] = useState("");
  const [delayReason, setDelayReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  if (!task) return <Navigate to="/admin/tasks" replace />;

  const canReview = Boolean(task.submission) && ['submitted','review'].includes(task.status);
  const canSubmit = !['approved','cancelled','submitted','review'].includes(task.status);

  async function handleApprove() {
    if (!task) return;
    const result = await approveTask(task.id, feedback.trim() || "Approved.");
    if (!result) return;
    setToast(result ? "Task approved and project progress updated." : "This task cannot be approved.");
    setFeedback("");
  }

  async function handleChanges() {
    if (!task) return;
    if (feedback.trim().length < 6) {
      setError("Feedback is required before requesting changes.");
      return;
    }
    const result = await requestChanges(task.id, feedback.trim());
    if (!result) return;
    setToast(result ? "Changes requested and previous submission preserved." : "This task cannot be changed.");
    setFeedback("");
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!task) return;
    if (!submissionInput.safeParse({url:submitUrl.trim(),note:submitNote.trim()}).success) {
      setError("A valid HTTP(S) URL and completion note are required.");
      return;
    }
    const result = await submitTask(task.id, { url: submitUrl.trim(), note: submitNote.trim() });
    if (!result) return;
    setToast(result ? "Work submitted for admin review." : "This task cannot be submitted.");
    setSubmitUrl("");
    setSubmitNote("");
    setError(null);
  }

  async function handleDelay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!task) return;
    if (!delayReason.trim()) {
      setError("Delay reason is required.");
      return;
    }
    const result = await reportDelay(task.id, delayReason.trim());
    if (!result) return;
    setToast(result ? "Delay reason recorded." : "This task cannot report a delay.");
    setDelayReason("");
    setError(null);
  }

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Task detail and review</p>
          <h1>{task.title}</h1>
          <p>{task.projectName} / {task.technology} / {task.assigneeName}</p>
        </div>
        <Link className="button button--secondary" to="/admin/tasks"><ArrowLeft size={16} /> Back to Tasks</Link>
      </section>

      {toast && <Toast tone="success" title="Workflow updated" message={toast} onDismiss={() => setToast(null)} />}
      {error && <Toast tone="error" title="Validation" message={error} onDismiss={() => setError(null)} />}

      <section className="workspace-hero">
        <article className="data-panel">
          <div className="panel-heading">
            <div>
              <h2>{task.id}</h2>
              <p>{task.description}</p>
            </div>
            <span className="status-chip">{statusLabel(task.status)}</span>
          </div>
          <div className="workspace-meta">
            <span>Assigned: {formatDate(task.assignedDate)}</span>
            <span>Deadline: {formatDate(task.deadline)}</span>
            <span>{task.required ? "Required" : "Optional"}</span>
          </div>
          {task.delay && <p className="callout callout--warning">Delay reported {formatDate(task.delay.reportedAt)}: {task.delay.reason}</p>}
          {task.review && <p className="callout">Last review: {task.review.decision} at {formatDate(task.review.reviewedAt)}. {task.review.feedback}</p>}
        </article>
      </section>

      <section className="dashboard-grid">
        <section className="data-panel">
          <div className="panel-heading">
            <h2>Submission review</h2>
          </div>
          {task.submission ? (
            <div className="activity-list">
              <article>
                <span className="mono">{formatDate(task.submission.submittedAt)}</span>
                <strong><a href={task.submission.url}>{task.submission.url}</a></strong>
                <p>{task.submission.note}</p>
              </article>
            </div>
          ) : (
            <p>No submitted work exists yet.</p>
          )}
          <FieldShell id="review-feedback" label="Admin feedback">
            <TextAreaInput id="review-feedback" value={feedback} onChange={(event) => setFeedback(event.target.value)} placeholder="Approval note or required changes." />
          </FieldShell>
          <div className="action-row">
            <button className="button button--primary" type="button" disabled={!canReview} onClick={handleApprove}><CheckCircle2 size={16} /> Approve</button>
            <button className="button button--secondary" type="button" disabled={!canReview} onClick={handleChanges}><RefreshCcw size={16} /> Request Changes</button>
            <button className="button button--secondary" type="button" disabled={task.status === "approved" || task.status === "cancelled"} onClick={async () => { if (await cancelTask(task.id)) setToast("Task cancelled."); }}><XCircle size={16} /> Cancel Task</button>
          </div>
        </section>

        <section className="data-panel">
          <div className="panel-heading">
            <h2>Employee submission integration</h2>
          </div>
          <form className="project-form" onSubmit={handleSubmit}>
            <FieldShell id="submission-url" label="Work URL">
              <TextInput id="submission-url" value={submitUrl} onChange={(event) => setSubmitUrl(event.target.value)} placeholder="https://example.com/work" />
            </FieldShell>
            <FieldShell id="submission-note" label="Completion note">
              <TextAreaInput id="submission-note" value={submitNote} onChange={(event) => setSubmitNote(event.target.value)} />
            </FieldShell>
            <button className="button button--primary" type="submit" disabled={!canSubmit}><Send size={16} /> Submit / Resubmit</button>
          </form>
          <form className="project-form" onSubmit={handleDelay}>
            <FieldShell id="delay-reason" label="Delay reason">
              <TextAreaInput id="delay-reason" value={delayReason} onChange={(event) => setDelayReason(event.target.value)} />
            </FieldShell>
            <button className="button button--secondary" type="submit" disabled={!canSubmit}>Report Delay</button>
          </form>
        </section>
      </section>

      <section className="dashboard-grid">
        <section className="data-panel">
          <div className="panel-heading"><h2>Submission and resubmission history</h2></div>
          <div className="activity-list">
            {(task.submissions ?? []).map((submission) => (
              <article key={submission.id}>
                <span className="mono">{formatDate(submission.submittedAt)}</span>
                <strong>{submission.url}</strong>
                <p>{submission.note}</p>
              </article>
            ))}
            {(task.submissions ?? []).length === 0 && <p>No submissions have been recorded.</p>}
          </div>
        </section>
        <section className="data-panel">
          <div className="panel-heading"><h2>Task activity</h2></div>
          <div className="activity-list">
            {(task.history ?? []).map((item) => (
              <article key={item.id}>
                <span className="mono">{formatDate(item.at)}</span>
                <p>{item.message}</p>
              </article>
            ))}
          </div>
        </section>
      </section>
    </div>
  );
}
