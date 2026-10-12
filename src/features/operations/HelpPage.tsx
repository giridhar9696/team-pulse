import { Link } from "react-router-dom";
import { HelpCircle } from "lucide-react";
import { useAuth } from "../auth/authContext";

const adminFaqs = [
  ["How do approvals work?", "Open a submitted task, review the URL and completion note, then approve or request changes with feedback."],
  ["When is a task completed?", "A task counts as completed only after Admin approval. Submitted and in-progress work does not inflate project progress."],
  ["How do I manage employees?", "Use Employee Management to add, edit, deactivate, reactivate, or reset prototype demo passwords."],
  ["How do reports stay accurate?", "Reports derive from the same project and task records used by dashboards, calendars, and task management."],
];

const employeeFaqs = [
  ["How do I submit work?", "Open My Tasks, choose a task, add a valid work URL and completion note, then submit for Admin review."],
  ["What does Changes Requested mean?", "Admin reviewed your submission and left feedback. Resubmit from the same task detail page without losing earlier submissions."],
  ["How do I report a delay?", "Open the task detail and provide a mandatory blocker reason. The reason is preserved in delay history."],
  ["Can I change deadlines?", "No. Employees can report delays, but official assignments and deadlines stay controlled by Admin."],
];

export function HelpPage() {
  const { user } = useAuth();
  const faqs = user?.role === "admin" ? adminFaqs : employeeFaqs;
  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">{user?.role} help</p>
          <h1>Help & FAQs</h1>
          <p>Role-specific guidance for Team Pulse task workflows and prototype boundaries.</p>
        </div>
      </section>
      <section className="dashboard-grid">
        <div className="data-panel">
          <div className="panel-heading"><h2>Quick navigation</h2><HelpCircle size={18} /></div>
          <div className="quick-action-grid">
            <Link className="button button--secondary" to={`/${user?.role}`}>Dashboard</Link>
            <Link className="button button--secondary" to={`/${user?.role}/tasks`}>Tasks</Link>
            <Link className="button button--secondary" to={`/${user?.role}/calendar`}>Calendar</Link>
            {user?.role === "admin" && <Link className="button button--secondary" to="/admin/reports">Reports</Link>}
          </div>
        </div>
        <div className="data-panel">
          <div className="panel-heading"><h2>Task status guide</h2></div>
          <div className="activity-list">
            {["Pending", "In Progress", "Submitted", "Under Review", "Changes Requested", "Approved", "Overdue", "Cancelled"].map((status) => <article key={status}><strong>{status}</strong><span>{statusDescription(status)}</span></article>)}
          </div>
        </div>
        <div className="data-panel">
          <div className="panel-heading"><h2>FAQs</h2></div>
          <div className="activity-list">
            {faqs.map(([question, answer]) => <article key={question}><strong>{question}</strong><p>{answer}</p></article>)}
          </div>
        </div>
      </section>
    </div>
  );
}

function statusDescription(status: string) {
  const descriptions: Record<string, string> = {
    Pending: "Assigned but not started.",
    "In Progress": "Work is underway.",
    Submitted: "Employee submitted work for review.",
    "Under Review": "Admin is reviewing submitted work.",
    "Changes Requested": "Admin feedback requires resubmission.",
    Approved: "Completed and counted toward progress.",
    Overdue: "Deadline condition or reported delay needs attention.",
    Cancelled: "Closed without completion.",
  };
  return descriptions[status];
}
