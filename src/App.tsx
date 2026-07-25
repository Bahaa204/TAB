import { createBrowserRouter, RouterProvider } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import Home from "./pages/Home";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Projects from "./pages/Projects";
import Login from "./pages/Login";
import ProjectDetails from "./pages/ProjectDetails";
import Admin from "./pages/Admin";
import ErrorPage from "./pages/ErrorPage";
import NotFound from "./pages/NotFound";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import Finances from "./pages/Finances";
import ProjectsDashboard from "./pages/ProjectsDashboard";
import ResetPassword from "./pages/ResetPassword";
import Support from "./pages/Support";
import Favorites from "./pages/Favorites";
import StaffTourBookings from "./pages/StaffTourBookings";

const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: "about", element: <About /> },
      { path: "contact", element: <Contact /> },
      { path: "projects", element: <Projects /> },
      {
        path: "projects/:projectID",
        element: <ProjectDetails />,
      },
      { path: "login", element: <Login /> },
      { path: "staff", element: <Admin /> },
      { path: "staff/employees", element: <EmployeeDashboard /> },
      { path: "staff/finances", element: <Finances /> },
      { path: "staff/projects", element: <ProjectsDashboard /> },
      { path: "staff/bookings", element: <StaffTourBookings /> },
      { path: "favorites", element: <Favorites /> },
      { path: "reset-password", element: <ResetPassword /> },
      { path: "support", element: <Support /> },
      { path: "*", element: <NotFound /> },
    ],
    errorElement: <ErrorPage />,
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
