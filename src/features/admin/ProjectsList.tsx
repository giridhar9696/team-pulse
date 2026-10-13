import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Filter, Plus, Search } from "lucide-react";
import { StateBlock } from "../../components/ui/StateBlock";
import { useProjects } from "./projectContext";
import { getDerivedProjectStatus, getProjectProgress } from "./projectMetrics";
import { useDateFormat } from '../operations/useDateFormat';

export function ProjectsList() {
  const formatDate=useDateFormat();
  const { projects } = useProjects();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [progress, setProgress] = useState("all");

  const filtered = useMemo(() => {
    return projects.filter((project) => {
      const projectStatus = getDerivedProjectStatus(project);
      const projectProgress = getProjectProgress(project);
      const matchesQuery =
        project.name.toLowerCase().includes(query.toLowerCase()) ||
        project.id.toLowerCase().includes(query.toLowerCase());
      const matchesStatus = status === "all" || projectStatus === status;
      const matchesProgress =
        progress === "all" ||
        (progress === "low" && projectProgress < 40) ||
        (progress === "mid" && projectProgress >= 40 && projectProgress < 80) ||
        (progress === "high" && projectProgress >= 80);
      return matchesQuery && matchesStatus && matchesProgress;
    });
  }, [progress, projects, query, status]);

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Admin projects</p>
          <h1>Projects list</h1>
          <p>Search, filter, inspect, and create shared projects.</p>
        </div>
        <Link className="button button--primary" to="/admin/projects/new">
          <Plus size={16} /> Add Project
        </Link>
      </section>

      <section className="data-panel">
        <div className="filters-grid">
          <label className="search-field filters-grid__search" htmlFor="project-search">
            <Search size={16} />
            <input
              id="project-search"
              name="project-search"
              aria-label="Search projects"
              placeholder="Search by project name or ID"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <label className="select-field">
            <Filter size={16} />
            <select aria-label="Project status" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="all">All statuses</option>
              <option value="Active">Active</option>
              <option value="At Risk">At Risk</option>
              <option value="Review">Review</option>
              <option value="Completed">Completed</option>
            </select>
          </label>
          <label className="select-field">
            <Filter size={16} />
            <select aria-label="Project progress" value={progress} onChange={(event) => setProgress(event.target.value)}>
              <option value="all">All progress</option>
              <option value="low">Below 40%</option>
              <option value="mid">40-79%</option>
              <option value="high">80%+</option>
            </select>
          </label>
        </div>
      </section>

      {projects.length === 0 && <StateBlock title="No projects yet">Use Add Project to create the first project.</StateBlock>}
      {projects.length > 0 && filtered.length === 0 && <StateBlock title="No matching projects">Adjust search or filters to see more projects.</StateBlock>}

      <section className="project-card-grid">
        {filtered.map((project) => {
          const derivedStatus = getDerivedProjectStatus(project);
          const approved = project.tasks.filter((task) => task.status === "approved").length;
          return (
            <Link className="project-card" key={project.id} to={`/admin/projects/${project.id}`}>
              <div className="project-card__top">
                <span className="mono">{project.id}</span>
                <span className="status-chip">{derivedStatus}</span>
              </div>
              <h2>{project.name}</h2>
              <p>{project.description}</p>
              <div className="progress-meter">
                <span style={{ width: `${getProjectProgress(project)}%` }} />
              </div>
              <div className="project-card__meta">
                <span>{getProjectProgress(project)}% approved</span>
                <span>{approved}/{project.tasks.length} tasks</span>
                <span>Due {formatDate(project.deadline)}</span>
              </div>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
