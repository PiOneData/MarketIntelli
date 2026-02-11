import { useProjects } from "../hooks/useProjects";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorMessage from "../components/common/ErrorMessage";

function ProjectsPage() {
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
      <section>
        <h3>Project Directory</h3>
        <p>
          {projects?.length ?? 0} projects loaded. Comprehensive database of
          operational, under-construction, and planned solar projects.
        </p>
        {/* Project list table will go here */}
      </section>
      <section>
        <h3>Developer Profiles</h3>
        <p>Historical performance, capacity portfolio, and risk scoring.</p>
      </section>
      <section>
        <h3>Tender Intelligence</h3>
        <p>Real-time updates on upcoming and awarded tenders with bid analytics.</p>
      </section>
    </div>
  );
}

export default ProjectsPage;
