import { useParams } from "react-router-dom";
import { useProjects } from "../hooks/useProjects";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorMessage from "../components/common/ErrorMessage";

function ProjectsPage() {
  const { section } = useParams<{ section: string }>();
  const activeSection = section || "project-directory";
  const { data: projects, isLoading, isError, refetch } = useProjects();

  if (isLoading) return <LoadingSpinner message="Loading projects..." />;
  if (isError)
    return (
      <ErrorMessage
        message="Failed to load projects"
        onRetry={() => refetch()}
      />
    );

  return (
    <div className="projects-page">
      <h2>Project &amp; Developer Intelligence</h2>

      {activeSection === "project-directory" && (
        <section id="project-directory">
          <h3>Project Directory</h3>
          <p>
            {projects?.length ?? 0} projects loaded. Comprehensive database of
            operational, under-construction, and planned solar projects.
          </p>
        </section>
      )}

      {activeSection === "developer-profiles" && (
        <section id="developer-profiles">
          <h3>Developer Profiles</h3>
          <p>Historical performance, capacity portfolio, and risk scoring.</p>
        </section>
      )}

      {activeSection === "tender-intelligence" && (
        <section id="tender-intelligence">
          <h3>Tender Intelligence</h3>
          <p>Real-time updates on upcoming and awarded tenders with bid analytics.</p>
        </section>
      )}
    </div>
  );
}

export default ProjectsPage;
