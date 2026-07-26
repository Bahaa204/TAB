import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useBuildings } from "../hooks/useBuildings";
import { useHouses } from "../hooks/useHouses";
import { useProjects } from "../hooks/useProjects";
import ProjectsDashBoardForm from "../components/Project DashBoard Components/ProjectsDashBoardForm";
import ProjectsDashBoardDisplay from "../components/Project DashBoard Components/ProjectsDashBoardDisplay";
import { useCountries } from "../hooks/useCountries";
import type { Session } from "@supabase/supabase-js";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "../components/ui/card";
import { Spinner } from "../components/ui/spinner";
import Breadcrumbs from "@/components/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import ErrorCard from "@/components/ErrorCard";

export default function ProjectsDashboard() {
  useDocumentTitle("Projects Dashboard");

  const navigate = useNavigate();

  const {
    Session,
    Loading: AuthLoading,
    Error: AuthError,
    GetRoleFromEmail,
  } = useAuth();

  const {
    Countries,
    Loading: CountriesLoading,
    Error: CountriesError,
  } = useCountries();

  const {
    Projects,
    Loading: ProjectsLoading,
    Error: ProjectsError,
    AddProject,
    RemoveProject,
    UpdateProject,
  } = useProjects();

  const {
    Buildings,
    Loading: BuildingsLoading,
    Error: BuildingsError,
    AddBuilding,
    RemoveBuilding,
    UpdateBuilding,
  } = useBuildings();

  const {
    Houses,
    Loading: HousesLoading,
    Error: HousesError,
    AddHouse,
    RemoveHouse,
    UpdateHouse,
  } = useHouses();

  // combining all the loading and error states into 1 variable
  const loading =
    AuthLoading ||
    CountriesLoading ||
    ProjectsLoading ||
    BuildingsLoading ||
    HousesLoading;

  const error =
    AuthError ||
    CountriesError?.message ||
    ProjectsError?.message ||
    BuildingsError?.message ||
    HousesError?.message || "An unknown error occurred.";

  // Checking for any errors
  if (error) {
    return (
      <main className='min-h-screen bg-[#e6e0d8] p-4 md:p-8'>
        <Card className='mx-auto max-w-3xl border border-[#c8b9a7] bg-white text-[#0f2f4f] shadow-lg'>
          <CardHeader>
            <CardTitle className='text-2xl text-[#0f2f4f]'>Error</CardTitle>
            <CardDescription className='text-[#24507f]'>
              We could not load the support chat. Please try again later.
            </CardDescription>
          </CardHeader>
          <CardContent className='text-[#173b67]'>{error}</CardContent>
          <CardFooter>{new Date().toLocaleString()}</CardFooter>
        </Card>
      </main>
    );
  }

  if (loading) {
    return (
      <main className='min-h-screen bg-[#e6e0d8] p-4 md:p-8'>
        <Card className='mx-auto max-w-3xl border border-[#c8b9a7] bg-white text-[#0f2f4f] shadow-lg'>
          <CardContent className='flex items-center justify-center gap-3 py-8 text-center text-[#173b67]'>
            <Spinner className='size-5 text-[#173b67]' />
            <span>
              {AuthLoading ? "Checking Authentication" : "Loading Data"}...
            </span>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!Countries || !Projects || !Buildings || !Houses)
    return <ErrorCard message='Failed to load required data.' error={error} />;

  function checkAccess(Session: Session) {
    const role = GetRoleFromEmail(Session.user.email);
    return role === "admin" || role === "employee";
  }

  // Preventing unauthenticated or non-admin users from accessing the page
  if (!Session || !checkAccess(Session)) {
    return (
      <div className='min-h-screen flex flex-col items-center justify-center'>
        <p className='text-lg text-[#10243e]'>
          You must be logged in as an admin to access this page.
        </p>
        <Button
          variant='link'
          className='cursor-pointer text-lg'
          onClick={() => navigate("/login")}
        >
          Navigate to Login
        </Button>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-[#e6e0d8] px-4 py-10 sm:px-6 lg:px-8'>
      <Breadcrumbs />
      <div className='mx-auto w-full'>
        <Card className='rounded-[2rem] bg-[linear-gradient(135deg,#10243e,#17365d_65%,#bf530a)] px-8 py-10 text-white shadow-xl'>
          <CardHeader>
            <CardTitle>
              <p className='  -3 text-sm uppercase tracking-[0.3em] text-[#ffe0c2]'>
                Admin workspace
              </p>
              <h1 className='text-4xl font-semibold tracking-tight sm:text-5xl'>
                Manage Projects
              </h1>
            </CardTitle>
            <CardDescription className='mt-4 max-w-2xl text-sm leading-6 text-[#d9e4f0] sm:text-base'>
              View, edit, delete, or add projects, buildings, or houses.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card className='grid gap-4 p-5 md:grid-cols-3 mt-5 mb-5 bg-transparent ring-0!'>
          <Card className='rounded-3xl border border-[#ffd2ad] bg-[linear-gradient(180deg,#ffffff_0%,#fff8f2_100%)] p-5 shadow-sm'>
            <CardHeader>
              <CardTitle className='text-sm text-[#5f7490]'>
                Core actions
              </CardTitle>
              <CardDescription className='mt-2 text-lg font-semibold text-[#10243e]'>
                Create, update, and delete projects, buildings, or houses
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className='rounded-3xl border border-[#ffd2ad] bg-[linear-gradient(180deg,#ffffff_0%,#fff8f2_100%)] p-5 shadow-sm'>
            <CardHeader>
              <CardTitle className='text-sm text-[#5f7490]'>
                Data source
              </CardTitle>
              <CardDescription className='mt-2 text-lg font-semibold text-[#10243e]'>
                Synced with the Database
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className='rounded-3xl border border-[#ffd2ad] bg-[linear-gradient(180deg,#ffffff_0%,#fff8f2_100%)] p-5 shadow-sm'>
            <CardHeader>
              <CardTitle className='text-sm text-[#5f7490]'>
                Editing style
              </CardTitle>
              <CardDescription className='mt-2 text-lg font-semibold text-[#10243e]'>
                Inline updates with instant refresh
              </CardDescription>
            </CardHeader>
          </Card>
        </Card>

        <Card className='bg-transparent ring-0! p-0!'>
          <CardContent className='flex flex-col gap-5 p-5'>
            <ProjectsDashBoardForm
              AddBuilding={AddBuilding}
              AddHouse={AddHouse}
              AddProject={AddProject}
              Projects={Projects}
              Buildings={Buildings}
              loading={loading}
              Countries={Countries}
            />
            <ProjectsDashBoardDisplay
              Buildings={Buildings}
              Projects={Projects}
              Countries={Countries}
              Houses={Houses}
              UpdateProject={UpdateProject}
              RemoveProject={RemoveProject}
              UpdateBuilding={UpdateBuilding}
              RemoveBuilding={RemoveBuilding}
              RemoveHouse={RemoveHouse}
              UpdateHouse={UpdateHouse}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
