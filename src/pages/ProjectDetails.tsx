import React, { useMemo, useState, useEffect, type SubmitEvent } from "react";
import {
  MapPin,
  Map as MapIcon,
  CheckCircle2,
  X,
  Calendar,
  Clock,
  Phone,
  FileText,
} from "lucide-react";
import { motion } from "framer-motion";
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabaseClient } from "../lib/supabaseClient";
import { Suspense } from "react";
import { useBuildings } from "@/hooks/useBuildings";
import { useHouses } from "@/hooks/useHouses";
import { useProjects } from "@/hooks/useProjects";
import { useCountries } from "@/hooks/useCountries";
import { Canvas } from "@react-three/fiber";
import { Environment, ContactShadows } from "@react-three/drei";
import ImageGallery from "@/components/Project Details Components/ImageGallery";
import UnitCard from "@/components/Project Details Components/UnitCard";
import LazyModelPreview from "@/components/Project Details Components/LazyModelPreview";
import { Loader } from "@/components/Project Details Components/Loader";
import Model from "@/components/Project Details Components/Model";
import SceneControls from "@/components/Project Details Components/SceneControls";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Building } from "@/types/building";
import type { House } from "@/types/house";
import type { Project } from "@/types/projects";
import type { PaymentFormData } from "@/types/form";
import type { BookTourFormData } from "@/types/form";
import type { Country } from "@/types/country";
import Breadcrumbs from "@/components/Breadcrumbs";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import {
  ValidateBookTour,
  ValidatePayment,
  sanitizeMapUrl,
} from "@/helpers/helpers";
import { useAuth } from "@/hooks/useAuth";
import ErrorCard from "@/components/ErrorCard";

import { useFavorites } from "@/hooks/useFavorites";
import { useTourBookings } from "@/hooks/useTourBookings";
import { useDisplay3DModelsContext } from "@/context/Display3DModelsContext";

const MODELS = [
  "models/simple_low_poly_abandoned_brick_building.glb",
  "models/modern_villa_apartment_house_home_building.glb",
  "models/modern_luxury_villa_house_building.glb",
  "models/modern_apartment_house_building_design.glb",
  "models/futuristic_building.glb",
  "models/amelinco_office_building.glb",
];

const PROJECT_HERO_IMAGE_FILES: string[] = [
  "image1.webp",
  "image2.webp",
  "image3.jpg",
  "image4.jpg",
  "image5.jpeg",
  "image6.jpg",
  "image7.jpg",
  "image8.webp",
];

const PROJECT_HERO_IMAGES = PROJECT_HERO_IMAGE_FILES.map(
  (file) => `/images/projects/${encodeURIComponent(file)}`,
);

type BuildingWithHouses = Building & { houses: House[] };

function getUniqueModelAssignments(buildingsCount: number): string[] {
  if (buildingsCount === 0) return [];

  const totalModels = MODELS.length;
  const assignments: string[] = [];

  if (buildingsCount === totalModels) {
    // Unique one-to-one assignment when model count matches buildings count.
    return [...MODELS];
  }

  if (buildingsCount < totalModels) {
    // Use a random subset so single-building projects don't always show the first model.
    const shuffled = [...MODELS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, buildingsCount);
  }

  // More buildings than models: distribute models randomly but keep them balanced.
  for (let i = 0; i < buildingsCount; i += 1) {
    assignments.push(MODELS[i % totalModels]);
  }

  return assignments.sort(() => Math.random() - 0.5);
}

function getProjectImageUrls(project: Project): string[] {
  const projectWithLegacyFields = project as Project & {
    images_url?: unknown;
    images?: unknown;
  };

  const fromImagesObjects =
    Array.isArray(project.images) && project.images.length > 0
      ? project.images
          .map((image) => {
            if (typeof image?.url === "string" && image.url.length > 0)
              return image.url;

            if (typeof image?.path === "string" && image.path.length > 0) {
              return supabaseClient.storage
                .from("projects_images")
                .getPublicUrl(image.path).data.publicUrl;
            }

            return "";
          })
          .filter((url): url is string => Boolean(url))
      : [];

  if (fromImagesObjects.length > 0) return fromImagesObjects;

  const fromLegacyImagesUrl = projectWithLegacyFields.images_url;
  if (Array.isArray(fromLegacyImagesUrl)) {
    return fromLegacyImagesUrl.filter(
      (url): url is string => typeof url === "string" && url.length > 0,
    );
  }

  const rawImages = projectWithLegacyFields.images;
  if (Array.isArray(rawImages)) {
    return rawImages
      .map((image) => {
        if (typeof image === "string") return image;
        if (typeof image !== "object" || image === null) return "";

        const imageRecord = image as { url?: unknown; path?: unknown };

        if (typeof imageRecord.url === "string" && imageRecord.url.length > 0)
          return imageRecord.url;

        if (
          typeof imageRecord.path === "string" &&
          imageRecord.path.length > 0
        ) {
          return supabaseClient.storage
            .from("projects_images")
            .getPublicUrl(imageRecord.path).data.publicUrl;
        }

        return "";
      })
      .filter((url): url is string => Boolean(url));
  }

  return [];
}

export default function ProjectDetails() {
  const navigate = useNavigate();
  const { projectID } = useParams();

  const InitialValue: PaymentFormData = {
    cardName: "",
    cardNumber: "",
    expiry: "",
    cvc: "",
    email: "",
    contactPhone: "",
  };

  const [selectedBuilding, setSelectedBuilding] = useState<
    Building["id"] | null
  >(null);

  const [hoveredUnit, setHoveredUnit] = useState<House["id"] | null>(null);

  const [showPayment, setShowPayment] = useState<boolean>(false);

  const [paymentHouse, setPaymentHouse] = useState<House | null>(null);

  const [paymentSuccess, setPaymentSuccess] = useState<boolean>(false);

  const [paymentError, setPaymentError] = useState<string>("");

  const [paymentForm, setPaymentForm] = useState<PaymentFormData>(InitialValue);
  const [showBookTour, setShowBookTour] = useState<boolean>(false);
  const [bookTourError, setBookTourError] = useState<string>("");
  const [tourHouse, setTourHouse] = useState<House | null>(null);
  const [tourForm, setTourForm] = useState<BookTourFormData>({
    preferredDate: "",
    preferredTime: "10:00",
    contactPhone: "",
    notes: "",
  });
  const [showToast, setShowToast] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>("");
  const [loanAmountInput, setLoanAmountInput] = useState<string>("350000");
  const [downPaymentInput, setDownPaymentInput] = useState<string>("70000");
  const [annualRateInput, setAnnualRateInput] = useState<string>("5");
  const [loanTermYearsInput, setLoanTermYearsInput] = useState<string>("25");

  useEffect(() => {
    if (!showToast) return;
    const t = setTimeout(() => setShowToast(false), 4000);
    return () => clearTimeout(t);
  }, [showToast]);

  const { Session } = useAuth();
  const { IsFavorited, ToggleFavorite } = useFavorites();
  const { AddBooking, Loading: BookingLoading } = useTourBookings();

  const {
    Countries,
    Loading: CountriesLoading,
    Error: CountriesError,
  } = useCountries();

  const {
    Projects,
    Loading: ProjectsLoading,
    Error: ProjectsError,
  } = useProjects();

  const {
    Buildings,
    Loading: BuildingsLoading,
    Error: BuildingsError,
  } = useBuildings();

  const {
    Houses,
    Loading: HousesLoading,
    Error: HousesError,
    UpdateHouse,
  } = useHouses();

  const { Display3DModels } = useDisplay3DModelsContext();

  const loading =
    CountriesLoading || ProjectsLoading || BuildingsLoading || HousesLoading;

  const error =
    CountriesError || ProjectsError || BuildingsError || HousesError;

  const countries = (Countries || []) as Country[];

  const projectIdAsNumber = Number(projectID);

  const project = useMemo(
    () =>
      Projects?.find(
        (item): item is Project & { id: number } =>
          typeof item.id === "number" && item.id === projectIdAsNumber,
      ) || null,
    [Projects, projectIdAsNumber],
  );

  useDocumentTitle(project?.name || "Project Details");

  const countryById = useMemo(
    () =>
      new Map<number, Country>(
        countries
          .filter(
            (country): country is Country & { id: number } =>
              typeof country.id === "number",
          )
          .map((country) => [country.id, country]),
      ),
    [countries],
  );

  const housesByBuildingId = useMemo(() => {
    const map = new Map<number, House[]>();
    if (!Houses) return map;

  Houses.forEach((house) => {
      if (
        typeof house.id !== "number" ||
        typeof house.building_id !== "number"
      ) {
        return;
      }

      const typedHouse: House = {
        ...house,
        id: house.id,
        building_id: house.building_id,
      };

      const existing = map.get(house.building_id);
      if (existing) {
        existing.push(typedHouse);
      } else {
        map.set(house.building_id, [typedHouse]);
      }
    });

    return map;
  }, [Houses]);

  const projectBuildings = useMemo<BuildingWithHouses[]>(() => {
    if (!project || !Buildings || typeof project.id !== "number") return [];

    return Buildings.filter(
      (building): building is Building & { id: number; project_id: number } =>
        typeof building.id === "number" &&
        typeof building.project_id === "number" &&
        building.project_id === project.id,
    ).map((building) => ({
      ...building,
      id: building.id,
      houses: housesByBuildingId.get(building.id) ?? [],
    }));
  }, [Buildings, housesByBuildingId, project]);

  const projectImages = useMemo(
    () => (project ? getProjectImageUrls(project) : []),
    [project],
  );

  const projectHeroImageById = useMemo(() => {
    const map = new Map<number, string>();

    const sortedProjects = Projects?.filter(
      (item): item is Project & { id: number } => typeof item.id === "number",
    ).sort((a, b) => a.id - b.id);

    sortedProjects?.forEach((item, index) => {
      const image = PROJECT_HERO_IMAGES[index];
      if (image) {
        map.set(item.id, image);
      }
    });

    return map;
  }, [Projects]);

  const projectHeroImage =
    typeof project?.id === "number"
      ? (projectHeroImageById.get(project.id) ?? null)
      : null;

  const modelAssignments = useMemo(() => {
    return getUniqueModelAssignments(projectBuildings.length);
  }, [projectBuildings]);

  const isSingleBuildingProject = projectBuildings.length === 1;

  const mortgageSummary = useMemo(() => {
    const loanAmount = Number(loanAmountInput);
    const downPayment = Number(downPaymentInput);
    const annualRate = Number(annualRateInput);
    const loanTermYears = Number(loanTermYearsInput);

    if (
      Number.isNaN(loanAmount) ||
      Number.isNaN(downPayment) ||
      Number.isNaN(annualRate) ||
      Number.isNaN(loanTermYears)
    ) {
      return null;
    }

    const principal = Math.max(loanAmount - downPayment, 0);
    const months = Math.max(Math.round(loanTermYears * 12), 0);
    const monthlyRate = Math.max(annualRate, 0) / 100 / 12;

    if (principal <= 0 || months <= 0) {
      return {
        principal,
        monthlyPayment: 0,
        totalPaid: 0,
        totalInterest: 0,
      };
    }

    const monthlyPayment =
      monthlyRate === 0
        ? principal / months
        : (principal * monthlyRate * (1 + monthlyRate) ** months) /
          ((1 + monthlyRate) ** months - 1);

    const totalPaid = monthlyPayment * months;
    const totalInterest = Math.max(totalPaid - principal, 0);

    return {
      principal,
      monthlyPayment,
      totalPaid,
      totalInterest,
    };
  }, [loanAmountInput, downPaymentInput, annualRateInput, loanTermYearsInput]);

  if (loading) {
    return (
      <main className='min-h-screen bg-[#e6e0d8]'>
        {/* Hero skeleton */}
        <div className='bg-slate-900 py-20 px-6'>
          <div className='max-w-5xl mx-auto'>
            <div className='h-4 w-32 bg-white/20 rounded-full mb-6 animate-pulse' />
            <div className='h-10 w-64 bg-white/20 rounded-xl mb-4 animate-pulse' />
            <div className='h-4 w-48 bg-white/10 rounded-full animate-pulse' />
          </div>
        </div>
        <div className='max-w-5xl mx-auto px-6 -mt-8'>
          {/* Stats skeleton */}
          <div className='grid grid-cols-3 gap-4 mb-10'>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className='bg-white rounded-2xl shadow-lg p-6 text-center animate-pulse'
              >
                <div className='h-8 w-16 bg-gray-200 rounded-lg mx-auto mb-2' />
                <div className='h-3 w-12 bg-gray-100 rounded mx-auto' />
              </div>
            ))}
          </div>
          {/* Image gallery skeleton */}
          <div className='h-80 bg-gray-200 rounded-2xl mb-10 animate-pulse' />
          {/* Description skeleton */}
          <div className='bg-white rounded-2xl shadow-md p-8 mb-10 animate-pulse'>
            <div className='h-6 w-48 bg-gray-200 rounded-lg mb-4' />
            <div className='space-y-2'>
              <div className='h-4 w-full bg-gray-100 rounded' />
              <div className='h-4 w-5/6 bg-gray-100 rounded' />
              <div className='h-4 w-4/6 bg-gray-100 rounded' />
            </div>
          </div>
          {/* Buildings skeleton */}
          <div className='mb-20'>
            <div className='h-7 w-48 bg-gray-300 rounded-lg mb-2 animate-pulse' />
            <div className='h-4 w-64 bg-gray-200 rounded mb-8 animate-pulse' />
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8'>
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className='rounded-3xl border border-gray-200 bg-white p-6 animate-pulse'
                >
                  <div className='h-5 w-32 bg-gray-200 rounded mb-3' />
                  <div className='h-3 w-20 bg-gray-100 rounded' />
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <ErrorCard
        message='We could not load Project Details. Please try again later.'
        error={error.message}
      />
    );
  }

  if (!project) {
    return (
      <main className='min-h-screen p-4 md:p-8'>
        <Breadcrumbs name='Project Details' style='light' />
        <Card className='mx-auto max-w-3xl border border-[#c8b9a7] bg-white text-[#0f2f4f] shadow-lg'>
          <CardHeader>
            <CardAction>
              <Link
                to='/projects'
                className='text-orange-500 hover:underline font-medium'
              >
                Back to Projects
              </Link>
            </CardAction>
            <CardTitle className='text-2xl text-[#0f2f4f]'>Error</CardTitle>
            <CardDescription className='text-[#24507f]'>
              Project not found. It may have been removed or the URL may be
              incorrect.
            </CardDescription>
          </CardHeader>
          <CardContent className='text-[#173b67]'>{error}</CardContent>
          <CardFooter className='bg-transparent'>
            {new Date().toLocaleString()}
          </CardFooter>
        </Card>
      </main>
    );
  }

  const totalUnits = projectBuildings.reduce(
    (sum, b) => sum + b.houses.length,
    0,
  );

  const effectiveSelectedBuildingId =
    selectedBuilding &&
    projectBuildings.some((building) => building.id === selectedBuilding)
      ? selectedBuilding
      : (projectBuildings[0]?.id ?? null);

  const activeBldg = projectBuildings.find(
    (building) => building.id === effectiveSelectedBuildingId,
  );
  const countryName =
    typeof project.country_id === "number"
      ? countryById.get(project.country_id)?.name
      : undefined;
  const sanitizedMapLink = sanitizeMapUrl(project.map_url);
  const projectId = project.id;

  function openPayment(house: House) {
    if (house.is_sold) return;

    if (!Session) {
      return navigate("/login");
    }

    setPaymentHouse(house);
    setPaymentSuccess(false);
    setPaymentError("");
    setPaymentForm({
      ...InitialValue,
      email: Session.user.email || "",
    });
    setShowPayment(true);
  }

  function closePayment() {
    setShowPayment(false);
    setPaymentHouse(null);
    setPaymentSuccess(false);
    setPaymentError("");
  }

  async function handlePaymentSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    const message = ValidatePayment(paymentForm, paymentHouse);
    if (message) return setPaymentError(message);

    const ok = await UpdateHouse({ is_sold: true }, paymentHouse!.id);

    if (!ok)
      return setPaymentError("Failed to Process Payment. Please try again.");

    setPaymentError("");
    setPaymentSuccess(true);
  }

  function openBookTour(house: House) {
    if (house.is_sold) return;

    if (!Session) {
      return navigate("/login");
    }

    setTourHouse(house);
    setBookTourError("");
    setTourForm({
      preferredDate: "",
      preferredTime: "10:00",
      contactPhone: "",
      notes: "",
    });
    setShowBookTour(true);
  }

  async function handleBookTourSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = ValidateBookTour(tourForm);
    if (validationError) {
      setBookTourError(validationError);
      return;
    }

    const ok = await AddBooking({
      project_id: projectId,
      house_id: tourHouse?.id ?? null,
      preferred_date: tourForm.preferredDate,
      preferred_time: tourForm.preferredTime,
      contact_phone: tourForm.contactPhone,
      notes: tourForm.notes,
    });

    if (!ok) {
      setBookTourError("Could not book the tour. Please try again.");
      return;
    }

    // Close the modal and show a toast notification
    setShowBookTour(false);
    setToastMessage("Tour request submitted! Our team will confirm shortly.");
    setShowToast(true);
  }

  async function handleFavoriteToggle() {
    if (!Session) {
      navigate("/login");
      return;
    }

    await ToggleFavorite(projectId);
  }

  return (
    <div className='min-h-screen bg-[#e6e0d8]'>
      {/* Hero */}
      <div className='relative overflow-hidden text-white py-24 md:py-32 px-6'>
        {projectHeroImage ? (
          <motion.div
            key={projectHeroImage}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className='absolute inset-0 bg-cover bg-center'
            style={{ backgroundImage: `url(${projectHeroImage})` }}
          />
        ) : (
          <div className='absolute inset-0 bg-slate-900' />
        )}
        <div className='absolute inset-0 bg-black/45' />

        <div className='relative max-w-5xl mx-auto'>
          <Breadcrumbs name={project.name} style='light' />
          <h1 className='text-4xl md:text-5xl font-extrabold mb-3'>
            {project.name}
          </h1>
          <div className='flex flex-wrap gap-4 text-gray-300 items-center'>
            <span className='flex items-center gap-1.5'>
              <MapPin className='w-4 h-4' /> {project.location}
            </span>
            <span>•</span>
            <span>{countryName || "Unknown"}</span>
          </div>
          <div className='mt-4 flex flex-wrap items-center gap-3'>
            <button
              type='button'
              onClick={handleFavoriteToggle}
              className='rounded-full border border-white/40 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 cursor-pointer'
            >
              {IsFavorited(project.id)
                ? "Saved in Favorites"
                : "Add to Favorites"}
            </button>
            {sanitizedMapLink && (
              <a
                href={sanitizedMapLink}
                target='_blank'
                rel='noreferrer'
                className='rounded-full border border-white/40 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 inline-flex items-center gap-1.5'
              >
                <MapIcon className='w-4 h-4' /> View Map
              </a>
            )}
            <span className='text-sm text-orange-200'>
              Handover:{" "}
              {project.handover_date
                ? new Date(project.handover_date).toLocaleDateString()
                : "To be announced"}
            </span>
          </div>
        </div>
      </div>

      <div className='max-w-5xl mx-auto px-6 mt-8 md:mt-10'>
        {/* Stats cards */}
        <div className='grid grid-cols-3 gap-4 mb-10'>
          <div className='h-28 md:h-32 bg-white rounded-2xl shadow-lg p-6 text-center flex flex-col items-center justify-center'>
            <p className='text-3xl font-extrabold text-orange-500'>
              {projectBuildings.length}
            </p>
            <p className='text-gray-500 text-sm mt-1'>Buildings</p>
          </div>
          <div className='h-28 md:h-32 bg-white rounded-2xl shadow-lg p-6 text-center flex flex-col items-center justify-center'>
            <p className='text-3xl font-extrabold text-orange-500'>
              {totalUnits}
            </p>
            <p className='text-gray-500 text-sm mt-1'>Units</p>
          </div>
          <div className='h-28 md:h-32 bg-white rounded-2xl shadow-lg p-6 text-center flex flex-col items-center justify-center'>
            <p className='text-3xl font-extrabold text-orange-500'>
              {countryName || "—"}
            </p>
            <p className='text-gray-500 text-sm mt-1'>Country</p>
          </div>
        </div>

        {/* Gallery */}
        {projectImages.length > 0 ? (
          <ImageGallery images={projectImages} />
        ) : (
          <div className='h-64 bg-slate-300 rounded-2xl shadow-lg mb-10 flex items-center justify-center'>
            <span className='text-white/20 text-9xl font-black'>
              {project.name[0]}
            </span>
          </div>
        )}

        {/* Description */}
        <div className='bg-white rounded-2xl shadow-md p-8 mb-10'>
          <h2 className='text-xl font-bold mb-4'>About this Project</h2>
          <p className='text-gray-600 leading-relaxed whitespace-pre-line'>
            {project.description}
          </p>
          <div className='mt-6 grid gap-3 rounded-xl border border-orange-100 bg-orange-50 p-4 text-sm text-[#8a3f00]'>
            <p>
              Expected ROI/Yield:{" "}
              {project.expected_roi_note ||
                "Projected stable yield with long-term demand in this district."}
            </p>
            <p>
              Sales advisory: Booking a tour allows our team to align units with
              your timeline and investment target.
            </p>
          </div>
        </div>

        {/* Buildings & Units */}
        {projectBuildings.length > 0 && (
          <div className='mb-20'>
            <h2 className='text-2xl font-bold mb-2'>Buildings & Units</h2>
            <p className='text-gray-400 mb-8 text-sm'>
              Select a building to see its available units.
            </p>

            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8'>
              {projectBuildings.map((building) => (
                <button
                  key={building.id}
                  type='button'
                  onClick={() => {
                    setSelectedBuilding(building.id);
                    setHoveredUnit(null);
                  }}
                  className={`cursor-pointer rounded-3xl border p-6 text-left transition-all duration-200 ${
                    effectiveSelectedBuildingId === building.id
                      ? "border-orange-400 bg-orange-50 shadow-lg ring-2 ring-orange-300/50"
                      : "border-gray-200 bg-white hover:border-orange-200"
                  }`}
                >
                  <p className='text-lg font-semibold text-slate-900'>
                    {building.name}
                  </p>
                  <p className='text-sm text-gray-500 mt-2'>
                    {building.houses.length} unit
                    {building.houses.length !== 1 ? "s" : ""} available
                  </p>
                </button>
              ))}
            </div>

            {activeBldg && (
              <div className='bg-white rounded-2xl shadow-md p-8'>
                <div className='flex items-center justify-between mb-6'>
                  <div>
                    <h3 className='text-xl font-bold'>{activeBldg.name}</h3>
                    <p className='text-sm text-gray-400'>
                      {activeBldg.houses.length} unit
                      {activeBldg.houses.length !== 1 ? "s" : ""} available
                    </p>
                  </div>
                </div>

                {activeBldg.houses.length === 0 ? (
                  <p className='text-gray-400'>No units in this building.</p>
                ) : (
                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                    {activeBldg.houses
                      .sort((a, b) => b.floor - a.floor)
                      .map((house) => (
                        <UnitCard
                          key={house.id}
                          house={house}
                          isHovered={hoveredUnit === house.id}
                          onHover={() => setHoveredUnit(house.id)}
                          onLeave={() => setHoveredUnit(null)}
                          onBuy={() => openPayment(house)}
                          onBookTour={() => openBookTour(house)}
                        />
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className='bg-white rounded-2xl shadow-lg p-8 mb-20'>
          <h2 className='text-2xl font-bold'>Project 3D Previews</h2>
          <h3 className='text-lg font-semibold mb-4 bg-yellow-200/20 text-yellow-800 p-2 rounded'>
            ⚠️WARNING: The 3D Previews are still work in progress and may lag
            your device. These models are for demonstration purposes only and
            doesnt not reflect real buildings or projects.
          </h3>
          {Display3DModels ? (
            <div
              className={`grid gap-6 ${isSingleBuildingProject ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"}`}
            >
              {projectBuildings.map((building, index) => {
                const modelPath =
                  modelAssignments[index] ?? MODELS[index % MODELS.length];
                return (
                  <div key={building.id} className='bg-gray-50 rounded-2xl p-4'>
                    <h3 className='text-lg font-semibold mb-2'>
                      {building.name}
                    </h3>
                    <LazyModelPreview
                      className={`relative overflow-hidden rounded-2xl ${isSingleBuildingProject ? "h-175" : "h-64"}`}
                    >
                      <Canvas
                        camera={{ position: [0, 1.8, 7], fov: 42 }}
                        shadows
                      >
                        <color attach='background' args={["#f8fbfd"]} />
                        <ambientLight intensity={0.8} />
                        <spotLight
                          position={[10, 10, 10]}
                          angle={0.15}
                          penumbra={1}
                          intensity={1}
                          castShadow
                        />

                        <Suspense fallback={<Loader />}>
                          <Environment preset='city' />
                          <Model modelPath={modelPath} />
                          <ContactShadows
                            position={[0, -1, 0]}
                            opacity={0.4}
                            scale={20}
                            blur={2.5}
                            far={4.5}
                          />
                        </Suspense>

                        <SceneControls />
                      </Canvas>
                    </LazyModelPreview>
                  </div>
                );
              })}
            </div>
          ) : (
            <div>3D Previews are disabled. Please make sure that you enable them from the dropdown menu.</div>
          )}
        </div>

        <div className='mb-20 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg'>
          <div className='bg-linear-to-r from-[#10243e] via-[#17365d] to-[#24507f] px-8 py-7 text-white'>
            <h2 className='text-2xl font-bold md:text-3xl'>
              Mortgage Calculator
            </h2>
            <p className='mt-2 max-w-2xl text-sm text-slate-200'>
              Adjust purchase values to estimate monthly installments, total
              paid amount, and lifetime interest.
            </p>
          </div>

          <div className='grid gap-6 p-7 lg:grid-cols-[1.35fr_1fr]'>
            <div className='rounded-2xl border border-slate-200 bg-slate-50 p-6'>
              <p className='text-xs font-semibold uppercase tracking-[0.18em] text-slate-500'>
                Loan inputs
              </p>

              <div className='mt-5 grid grid-cols-1 gap-5'>
                <div>
                  <label className='mb-2 block text-sm font-semibold text-slate-700'>
                    Home price ($)
                  </label>
                  <input
                    type='number'
                    min='0'
                    step='1000'
                    value={loanAmountInput}
                    onChange={(event) => setLoanAmountInput(event.target.value)}
                    className='w-full rounded-xl border border-slate-200 bg-white px-4 py-4 text-base text-slate-800 shadow-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-200'
                  />
                </div>

                <div>
                  <label className='mb-2 block text-sm font-semibold text-slate-700'>
                    Down payment ($)
                  </label>
                  <input
                    type='number'
                    min='0'
                    step='1000'
                    value={downPaymentInput}
                    onChange={(event) =>
                      setDownPaymentInput(event.target.value)
                    }
                    className='w-full rounded-xl border border-slate-200 bg-white px-4 py-4 text-base text-slate-800 shadow-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-200'
                  />
                </div>

                <div>
                  <label className='mb-2 block text-sm font-semibold text-slate-700'>
                    Interest rate (% / year)
                  </label>
                  <input
                    type='number'
                    min='0'
                    step='0.1'
                    value={annualRateInput}
                    onChange={(event) => setAnnualRateInput(event.target.value)}
                    className='w-full rounded-xl border border-slate-200 bg-white px-4 py-4 text-base text-slate-800 shadow-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-200 disabled:cursor-not-allowed'
                    disabled
                  />
                </div>

                <div>
                  <label className='mb-2 block text-sm font-semibold text-slate-700'>
                    Loan term (years)
                  </label>
                  <input
                    type='number'
                    min='1'
                    step='1'
                    value={loanTermYearsInput}
                    onChange={(event) =>
                      setLoanTermYearsInput(event.target.value)
                    }
                    className='w-full rounded-xl border border-slate-200 bg-white px-4 py-4 text-base text-slate-800 shadow-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-200'
                  />
                </div>
              </div>
            </div>

            <div className='rounded-2xl border border-slate-200 bg-white p-6 shadow-sm'>
              <p className='text-xs font-semibold uppercase tracking-[0.18em] text-slate-500'>
                Summary
              </p>

              <div className='mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1'>
                <div className='rounded-xl border border-orange-200 bg-orange-50 p-4'>
                  <p className='text-xs uppercase tracking-[0.16em] text-orange-600'>
                    Monthly payment
                  </p>
                  <p className='mt-2 text-2xl font-bold text-[#10243e]'>
                    $
                    {mortgageSummary
                      ? mortgageSummary.monthlyPayment.toLocaleString(
                          undefined,
                          {
                            maximumFractionDigits: 2,
                            minimumFractionDigits: 2,
                          },
                        )
                      : "0.00"}
                  </p>
                </div>

                <div className='rounded-xl border border-slate-200 bg-slate-50 p-4'>
                  <p className='text-xs uppercase tracking-[0.16em] text-slate-500'>
                    Loan principal
                  </p>
                  <p className='mt-2 text-xl font-bold text-[#10243e]'>
                    $
                    {mortgageSummary
                      ? mortgageSummary.principal.toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                          minimumFractionDigits: 2,
                        })
                      : "0.00"}
                  </p>
                </div>

                <div className='rounded-xl border border-slate-200 bg-slate-50 p-4'>
                  <p className='text-xs uppercase tracking-[0.16em] text-slate-500'>
                    Total payment
                  </p>
                  <p className='mt-2 text-xl font-bold text-[#10243e]'>
                    $
                    {mortgageSummary
                      ? mortgageSummary.totalPaid.toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                          minimumFractionDigits: 2,
                        })
                      : "0.00"}
                  </p>
                </div>

                <div className='rounded-xl border border-slate-200 bg-slate-50 p-4'>
                  <p className='text-xs uppercase tracking-[0.16em] text-slate-500'>
                    Total interest
                  </p>
                  <p className='mt-2 text-xl font-bold text-[#10243e]'>
                    $
                    {mortgageSummary
                      ? mortgageSummary.totalInterest.toLocaleString(
                          undefined,
                          {
                            maximumFractionDigits: 2,
                            minimumFractionDigits: 2,
                          },
                        )
                      : "0.00"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showPayment && (
        <div
          className='fixed inset-0 z-9000 overflow-y-auto flex items-center justify-center bg-black/50 p-4'
          onMouseDown={closePayment}
        >
          <div
            className='w-full max-w-5xl max-h-[92vh] rounded-[2rem] bg-white shadow-2xl overflow-y-auto no-scrollbar'
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className='flex items-center justify-between flex-wrap gap-4 bg-orange-500 px-7 py-6 text-white rounded-t-[2rem]'>
              <div>
                <h2 className='text-3xl font-bold'>Complete purchase</h2>
                <p className='mt-2 text-sm text-orange-100'>
                  Fill the card details to confirm your purchase.
                </p>
              </div>
              <button
                type='button'
                onClick={closePayment}
                className='rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20 cursor-pointer'
              >
                Close
              </button>
            </div>

            <div className='p-7'>
              <div className='grid gap-6 lg:grid-cols-[1.55fr_1fr]'>
                <div className='space-y-6'>
                  <div className='rounded-2xl border border-orange-100 bg-orange-50 p-5 shadow-sm'>
                    <p className='text-sm uppercase tracking-[0.2em] text-orange-500'>
                      Selected unit
                    </p>
                    <p className='mt-2 text-2xl font-semibold text-slate-900'>
                      {paymentHouse
                        ? `Unit #${paymentHouse.id} - $${paymentHouse.price.toLocaleString()}`
                        : "No unit selected"}
                    </p>
                    <p className='text-sm text-gray-500 mt-2'>
                      {paymentHouse
                        ? `${paymentHouse.nb_bedrooms} bedrooms • ${paymentHouse.nb_bathrooms} bathrooms`
                        : "Select a unit to start."}
                    </p>
                  </div>

                  <form
                    onSubmit={handlePaymentSubmit}
                    className='rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5'
                  >
                    <div>
                      <label className='block text-sm font-semibold text-slate-700 mb-2'>
                        Cardholder name
                      </label>
                      <input
                        value={paymentForm.cardName}
                        onChange={(e) =>
                          setPaymentForm({
                            ...paymentForm,
                            cardName: e.target.value,
                          })
                        }
                        className='w-full rounded-xl border border-slate-200 bg-white p-3.5 text-sm shadow-sm'
                        placeholder='John Doe'
                      />
                    </div>

                    <div>
                      <label className='block text-sm font-semibold text-slate-700 mb-2'>
                        Card number
                      </label>
                      <input
                        value={paymentForm.cardNumber}
                        onChange={(e) =>
                          setPaymentForm({
                            ...paymentForm,
                            cardNumber: e.target.value,
                          })
                        }
                        className='w-full rounded-xl border border-slate-200 bg-white p-3.5 text-sm shadow-sm'
                        placeholder='1234 5678 9012 3456'
                        inputMode='numeric'
                      />
                    </div>

                    <div className='grid grid-cols-2 gap-4'>
                      <div>
                        <label className='block text-sm font-semibold text-slate-700 mb-2'>
                          Expiry
                        </label>
                        <input
                          value={paymentForm.expiry}
                          onChange={(e) =>
                            setPaymentForm({
                              ...paymentForm,
                              expiry: e.target.value,
                            })
                          }
                          className='w-full rounded-xl border border-slate-200 bg-white p-3.5 text-sm shadow-sm'
                          placeholder='MM/YY'
                        />
                      </div>
                      <div>
                        <label className='block text-sm font-semibold text-slate-700 mb-2'>
                          CVC
                        </label>
                        <input
                          value={paymentForm.cvc}
                          onChange={(e) =>
                            setPaymentForm({
                              ...paymentForm,
                              cvc: e.target.value,
                            })
                          }
                          className='w-full rounded-xl border border-slate-200 bg-white p-3.5 text-sm shadow-sm'
                          placeholder='123'
                          inputMode='numeric'
                        />
                      </div>
                    </div>

                    <div>
                      <label className='block text-sm font-semibold text-slate-700 mb-2'>
                        Email
                      </label>
                      <input
                        value={paymentForm.email}
                        onChange={(e) =>
                          setPaymentForm({
                            ...paymentForm,
                            email: e.target.value,
                          })
                        }
                        className='w-full rounded-xl border border-slate-200 bg-white p-3.5 text-sm shadow-sm'
                        placeholder='you@example.com'
                        type='email'
                      />
                    </div>

                    <div>
                      <label className='block text-sm font-semibold text-slate-700 mb-2'>
                        Phone number
                      </label>
                      <PhoneInput
                        defaultCountry='eg'
                        className='w-full!'
                        disableFocusAfterCountrySelect
                        value={paymentForm.contactPhone}
                        onChange={(phone) =>
                          setPaymentForm({
                            ...paymentForm,
                            contactPhone: phone,
                          })
                        }
                        countrySelectorStyleProps={{
                          buttonStyle: {
                            height: "50px",
                            padding: "0 12px",
                            borderRadius: "0px",
                          },
                        }}
                        inputStyle={{
                          height: "50px",
                          width: "100%",
                          fontSize: "1rem",
                          lineHeight: "1.5rem",
                          paddingTop: "12px",
                          paddingBottom: "12px",
                          paddingLeft: "16px",
                          paddingRight: "16px",
                          borderRadius: "8px",
                          borderTopLeftRadius: "0px",
                          borderBottomLeftRadius: "0px",
                        }}
                        style={
                          {
                            width: "100%",
                            "--react-international-phone-border-radius": "0px",
                            "--react-international-phone-border-color":
                              "#d7e0ea",
                            "--react-international-phone-height": "50px",
                            "--react-international-phone-font-size": "1rem",
                          } as React.CSSProperties
                        }
                      />
                    </div>

                    {paymentError && (
                      <p className='text-sm text-red-500'>{paymentError}</p>
                    )}

                    <button
                      type='submit'
                      className='w-full rounded-xl bg-orange-500 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition'
                    >
                      Pay now
                    </button>
                  </form>
                </div>

                <div className='rounded-2xl border border-slate-200 bg-slate-50 p-6 text-slate-900 shadow-sm'>
                  <p className='text-sm uppercase tracking-[0.2em] text-slate-500'>
                    Payment summary
                  </p>
                  <div className='mt-4 space-y-4'>
                    <div className='rounded-2xl border border-slate-200 bg-white p-4'>
                      <p className='text-sm text-slate-500'>Unit</p>
                      <p className='mt-2 text-lg font-semibold'>
                        {paymentHouse ? `#${paymentHouse.id}` : "-"}
                      </p>
                    </div>
                    <div className='rounded-2xl border border-slate-200 bg-white p-4'>
                      <p className='text-sm text-slate-500'>Price</p>
                      <p className='mt-2 text-lg font-semibold'>
                        {paymentHouse
                          ? `$${paymentHouse.price.toLocaleString()}`
                          : "-"}
                      </p>
                    </div>
                    <div className='rounded-2xl border border-slate-200 bg-white p-4'>
                      <p className='text-sm text-slate-500'>Total</p>
                      <p className='mt-2 text-lg font-semibold'>
                        {paymentHouse
                          ? `$${paymentHouse.price.toLocaleString()}`
                          : "-"}
                      </p>
                    </div>
                  </div>

                  {paymentSuccess && (
                    <div className='mt-6 rounded-3xl bg-emerald-50 p-4 text-emerald-900 shadow-inner'>
                      <p className='text-sm uppercase tracking-[0.2em] text-emerald-600'>
                        Success
                      </p>
                      <p className='mt-2 text-base font-semibold'>
                        Payment completed successfully.
                      </p>
                      <p className='mt-2 text-sm text-slate-700'>
                        Your purchase is confirmed. Our team will contact you
                        shortly.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showBookTour && (
        <div
          className='fixed inset-0 z-9000 overflow-y-auto flex items-center justify-center bg-black/50 p-4'
          onMouseDown={() => setShowBookTour(false)}
        >
          <div
            className='w-full max-w-xl rounded-[2rem] bg-white shadow-2xl'
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className='flex items-center justify-between bg-orange-500 px-6 py-5 text-white rounded-t-[2rem]'>
              <div>
                <h2 className='text-2xl font-bold'>Book a Tour</h2>
                <p className='text-sm text-orange-100 mt-1'>
                  Reserve your preferred date and our advisor will confirm.
                </p>
              </div>
              <button
                type='button'
                onClick={() => setShowBookTour(false)}
                className='rounded-full border border-white/30 bg-white/10 hover:bg-white/20 transition p-2 cursor-pointer'
              >
                <X className='w-4 h-4' />
              </button>
            </div>

            <form onSubmit={handleBookTourSubmit} className='space-y-4 p-6'>
              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                <div>
                  <label className='mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-700'>
                    <Calendar className='w-4 h-4 text-orange-500' />
                    Preferred date
                  </label>
                  <input
                    type='date'
                    value={tourForm.preferredDate}
                    onChange={(event) =>
                      setTourForm((prev) => ({
                        ...prev,
                        preferredDate: event.target.value,
                      }))
                    }
                    className='w-full rounded-lg border border-slate-200 p-3 focus:outline-none focus:ring-2 focus:ring-orange-400'
                    required
                  />
                </div>

                <div>
                  <label className='mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-700'>
                    <Clock className='w-4 h-4 text-orange-500' />
                    Preferred time
                  </label>
                  <select
                    value={tourForm.preferredTime}
                    onChange={(event) =>
                      setTourForm((prev) => ({
                        ...prev,
                        preferredTime: event.target.value,
                      }))
                    }
                    className='w-full rounded-lg border border-slate-200 p-3 focus:outline-none focus:ring-2 focus:ring-orange-400'
                  >
                    <option value='10:00'>10:00 AM</option>
                    <option value='12:00'>12:00 PM</option>
                    <option value='14:00'>2:00 PM</option>
                    <option value='16:00'>4:00 PM</option>
                  </select>
                </div>
              </div>

              <div>
                <label className='mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-700'>
                  <Phone className='w-4 h-4 text-orange-500' />
                  Contact phone
                </label>
                <PhoneInput
                  defaultCountry='eg'
                  className='w-full!'
                  disableFocusAfterCountrySelect
                  value={tourForm.contactPhone}
                  onChange={(phone) =>
                    setTourForm((prev) => ({ ...prev, contactPhone: phone }))
                  }
                  countrySelectorStyleProps={{
                    buttonStyle: {
                      height: "50px",
                      padding: "0 12px",
                      borderRadius: "0px",
                    },
                  }}
                  inputStyle={{
                    height: "50px",
                    width: "100%",
                    fontSize: "1rem",
                    lineHeight: "1.5rem",
                    paddingTop: "12px",
                    paddingBottom: "12px",
                    paddingLeft: "16px",
                    paddingRight: "16px",
                    borderRadius: "8px",
                    borderTopLeftRadius: "0px",
                    borderBottomLeftRadius: "0px",
                  }}
                  style={
                    {
                      width: "100%",
                      "--react-international-phone-border-radius": "0px",
                      "--react-international-phone-border-color": "#d7e0ea",
                      "--react-international-phone-height": "50px",
                      "--react-international-phone-font-size": "1rem",
                    } as React.CSSProperties
                  }
                />
              </div>

              <div>
                <label className='mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-700'>
                  <FileText className='w-4 h-4 text-orange-500' />
                  Notes (optional)
                </label>
                <textarea
                  value={tourForm.notes}
                  onChange={(event) =>
                    setTourForm((prev) => ({
                      ...prev,
                      notes: event.target.value,
                    }))
                  }
                  className='w-full rounded-lg border border-slate-200 p-3 focus:outline-none focus:ring-2 focus:ring-orange-400'
                  rows={3}
                  placeholder='Preferred meeting point, questions, or unit preference'
                />
              </div>

              {bookTourError && (
                <p className='text-sm text-red-500'>{bookTourError}</p>
              )}

              <button
                type='submit'
                disabled={BookingLoading}
                className='w-full rounded-lg bg-orange-500 px-4 py-3 text-sm font-semibold text-white hover:bg-orange-600 transition disabled:opacity-60'
              >
                {BookingLoading
                  ? "Submitting..."
                  : `Confirm Tour${tourHouse ? ` for Unit #${tourHouse.id}` : ""}`}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Toast notification */}
      {showToast && (
        <div className='fixed bottom-6 left-1/2 -translate-x-1/2 z-9999 flex items-center gap-3 bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-xl shadow-emerald-900/30 animate-in slide-in-from-bottom-4 duration-300'>
          <CheckCircle2 className='w-5 h-5 shrink-0' />
          <p className='text-sm font-semibold'>{toastMessage}</p>
          <button
            type='button'
            onClick={() => setShowToast(false)}
            className='ml-2 text-white/70 hover:text-white'
          >
            <X className='w-4 h-4' />
          </button>
        </div>
      )}
    </div>
  );
}
