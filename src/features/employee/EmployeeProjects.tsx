import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { StateBlock } from "../../components/ui/StateBlock";
import { useProjects } from "../admin/projectContext";
import { statusLabel } from "../admin/taskUtils";
import { useAuth } from "../auth/authContext";
import { getEmployeeProjects } from "./employeeUtils";
import { useDateFormat } from '../operations/useDateFormat';

export function EmployeeProjects() {
  const formatDate=useDateFormat();
  const { user } = useAuth();
  const { projects } = useProjects();
  const employeeProjects = getEmployeeProjects(projects, user?.identifier ?? "");

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Employee workspace</p>
          <h1>My Projects</h1>
          <p>Only projects connected to your assigned tasks are shown here.</p>
        </div>
      </section>

      {employeeProjects.length === 0 ? (
        <StateBlock title="No tasks assigned yet.">Project access appears after your first assignment.</StateBlock>
      ) : (
        <section className="project-card-grid employee-project-grid">
          {employeeProjects.map((project) => (
            <article className="project-card" key={project.id}>
              <div className="project-card__top">
                <span className="mono">{project.id}</span>
                <span className="status-chip">{project.status}</span>
              </div>
              <div>
                <h2>{project.name}</h2>
                <p>{project.description}</p>
              </div>
              <div className="progress-meter progress-meter--large" aria-label={`${project.name} progress ${project.progress}%`}>
                <span style={{ width: `${project.progress}%` }} />
              </div>
              <div className="project-card__meta">
                <span>{project.progress}% approved required work</span>
                <span>Due {formatDate(project.deadline)}</span>
              </div>
              <div className="employee-project-tasks">
                {project.tasks.map((task) => (
                  <Link key={task.id} to={`/employee/tasks/${task.id}`}>
                    <span className="mono">{task.id}</span>
                    <strong>{task.title}</strong>
                    <span className="status-chip">{statusLabel(task.status)}</span>
                    <ArrowRight size={15} />
                  </Link>
                ))}
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
