import { Link, useNavigate } from "react-router-dom";
import Breadcrumbs from "@/components/Breadcrumbs";
import ErrorCard from "@/components/ErrorCard";
import LoadingCard from "@/components/LoadingCard";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useAuth } from "@/hooks/useAuth";
import { useFavorites } from "@/hooks/useFavorites";
import { useProjects } from "@/hooks/useProjects";

export default function Favorites() {
  useDocumentTitle("Favorites");

  const navigate = useNavigate();

  const { Session, Loading: AuthLoading, Error: AuthError } = useAuth();
  const {
    Projects,
    Loading: ProjectsLoading,
    Error: ProjectsError,
  } = useProjects();
  const {
    FavoriteProjectIds,
    RemoveFavorite,
    Loading: FavoritesLoading,
    Error: FavoritesError,
  } = useFavorites();

  if (AuthLoading || ProjectsLoading || FavoritesLoading) {
    return <LoadingCard message="Loading your favorites..." />;
  }

  if (AuthError || ProjectsError || FavoritesError) {
    return (
      <ErrorCard
        message="We could not load your favorites. Please try again later."
        error={AuthError || ProjectsError?.message || FavoritesError}
      />
    );
  }

  if (!Session) {
    return (
      <main className="min-h-screen bg-[#e6e0d8] px-4 py-10 md:px-8">
        <Card className="mx-auto max-w-xl border border-[#c8b9a7] bg-white text-[#0f2f4f] shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Login Required</CardTitle>
            <CardDescription className="text-[#24507f]">
              Please login to access your saved projects.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button
              className="cursor-pointer bg-[#0f2f4f] text-white hover:bg-[#173b67]"
              onClick={() => navigate("/login")}
            >
              Go to login
            </Button>
          </CardFooter>
        </Card>
      </main>
    );
  }

  const favoriteProjects = Projects?.filter(
    (project) =>
      typeof project.id === "number" && FavoriteProjectIds.includes(project.id),
  );

  return (
    <main className="min-h-screen bg-[#e6e0d8] px-4 py-6 md:px-8 md:py-10">
      <Breadcrumbs />
      <section className="mx-auto max-w-6xl space-y-6">
        <Card className="border border-[#c8b9a7] bg-white text-[#0f2f4f] shadow-lg">
          <CardHeader>
            <CardTitle className="text-3xl font-bold">Saved Projects</CardTitle>
            <CardDescription className="text-[#24507f]">
              Track your shortlisted opportunities and book viewings faster.
            </CardDescription>
          </CardHeader>
        </Card>

        {favoriteProjects?.length === 0 ? (
          <Card className="border border-[#c8b9a7] bg-white text-[#0f2f4f] shadow-lg">
            <CardContent className="p-8 text-center text-[#24507f]">
              You have not saved any projects yet.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {favoriteProjects?.map((project) => (
              <Card
                key={project.id}
                className="border border-[#c8b9a7] bg-white text-[#0f2f4f] shadow-sm"
              >
                <CardHeader>
                  <CardTitle className="text-xl">{project.name}</CardTitle>
                  <CardDescription className="text-[#24507f]">
                    {project.location}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-[#24507f]">
                  <p className="line-clamp-2">{project.description}</p>
                  {project.handover_date && (
                    <p>Handover: {new Date(project.handover_date).toLocaleDateString()}</p>
                  )}
                  {project.expected_roi_note && (
                    <p className="line-clamp-2">ROI Note: {project.expected_roi_note}</p>
                  )}
                </CardContent>
                <CardFooter className="flex items-center gap-2">
                  <Link
                    to={`/projects/${project.id}`}
                    className="inline-flex rounded-md bg-[#0f2f4f] px-3 py-2 text-sm font-medium text-white hover:bg-[#173b67]"
                  >
                    View Details
                  </Link>
                  <Button
                    variant="outline"
                    className="cursor-pointer border-[#c8b9a7]"
                    onClick={() => RemoveFavorite(project.id)}
                  >
                    Remove
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
