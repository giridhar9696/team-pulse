import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft, CalendarClock, CheckCircle2, ClipboardList } from "lucide-react";
import { type TechnologyArea } from "../../data/types";
import { useProjects } from "./projectContext";
import { getDerivedProjectStatus, getProjectProgress } from "./projectMetrics";
import { useDateFormat } from '../operations/useDateFormat';

const areas: TechnologyArea[] = ["Frontend", "Backend", "Database"];

export function ProjectWorkspace() {
  const formatDate=useDateFormat();
  const { projectId } = useParams();
  const { projects, employees } = useProjects();
  const project = projects.find((item) => item.id === projectId);

  if (!project) {
    return <Navigate to="/admin/projects" replace />;
  }

  const progress = getProjectProgress(project);
  const status = getDerivedProjectStatus(project);
  const approved = project.tasks.filter((task) => task.status === "approved").length;
  const submissions = project.tasks.filter((task) => task.submission);

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Project workspace</p>
          <h1>{project.name}</h1>
          <p>{project.description}</p>
        </div>
        <Link className="button button--secondary" to="/admin/projects">
          <ArrowLeft size={16} /> Back to Projects
        </Link>
      </section>

      <section className="workspace-hero">
        <article className="data-panel">
          <div className="panel-heading">
            <div>
              <h2>Overview</h2>
              <p className="mono">{project.id}</p>
            </div>
            <span className="status-chip">{status}</span>
          </div>
          <div className="progress-meter progress-meter--large">
            <span style={{ width: `${progress}%` }} />
          </div>
          <div className="workspace-meta">
            <span><CalendarClock size={15} /> {formatDate(project.startDate)} to {formatDate(project.deadline)}</span>
            <span><CheckCircle2 size={15} /> {approved}/{project.tasks.length} approved tasks</span>
            <span><ClipboardList size={15} /> {progress}% required progress</span>
          </div>
        </article>
      </section>

      <section className="technology-grid">
        {areas.map((area) => {
          const tasks = project.tasks.filter((task) => task.technology === area);
          return (
            <section className="data-panel" key={area}>
              <div className="panel-heading">
                <h2>{area}</h2>
                <span className="status-chip">{tasks.length} tasks</span>
              </div>
              {tasks.length === 0 ? (
                <p>No {area.toLowerCase()} tasks are currently attached.</p>
              ) : (
                <div className="compact-list">
                  {tasks.map((task) => {
                    const employee = employees.find((item) => item.id === task.assigneeId);
                    return (
                      <article key={task.id}>
                        <span className="mono">{task.id}</span>
                        <strong>{task.title}</strong>
                        <span>{employee?.name ?? task.assigneeId}</span>
                        <span className="status-chip">{task.status}</span>
                        <span className="mono">{formatDate(task.assignedDate)} → {formatDate(task.deadline)}</span>
                        <p>{task.description}</p>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </section>

      <section className="dashboard-grid">
        <section className="data-panel">
          <div className="panel-heading">
            <h2>Submissions and review integration</h2>
          </div>
          {submissions.length ? (
            <div className="activity-list">
              {submissions.map((task) => (
                <article key={task.id}>
                  <span className="mono">{task.submission ? formatDate(task.submission.submittedAt) : ''}</span>
                  <strong>{task.title}</strong>
                  <p>{task.submission?.note}</p>
                </article>
              ))}
            </div>
          ) : (
            <p>No work has been submitted yet.</p>
          )}
        </section>
        <section className="data-panel">
          <div className="panel-heading">
            <h2>Recent project activity</h2>
          </div>
          <div className="activity-list">
            {project.activity.map((item) => (
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
