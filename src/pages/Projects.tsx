import { useMemo, useState, type MouseEvent, type SubmitEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import Breadcrumbs from "@/components/Breadcrumbs";
import { useBuildings } from "@/hooks/useBuildings";
import { useProjects } from "@/hooks/useProjects";
import { useHouses } from "@/hooks/useHouses";
import { useCountries } from "@/hooks/useCountries";
import ImageGallery from "@/components/ImageGallery";
import { supabaseClient } from "@/lib/supabaseClient";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Project, Recommendation } from "@/types/projects";
import type { Building } from "@/types/building";
import type { House } from "@/types/house";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SurveyForm } from "@/types/form";
import ErrorCard from "@/components/ErrorCard";
import { useAuth } from "@/hooks/useAuth";
import { useFavorites } from "@/hooks/useFavorites";
import { Heart, X } from "lucide-react";

const countryFlags: Record<string, string> = {
  Egypt: "eg",
  "United Arab Emirates": "ae",
  "United Kingdom": "gb",
  "Saudi Arabia": "sa",
  Turkey: "tr",
  Oman: "om",
  Bahrain: "bh",
  Qatar: "qa",
};

const cardGradients = [
  "from-orange-400 to-rose-500",
  "from-blue-500 to-indigo-600",
  "from-emerald-400 to-teal-600",
  "from-violet-500 to-purple-600",
  "from-amber-400 to-orange-500",
  "from-cyan-400 to-blue-500",
  "from-pink-400 to-rose-500",
  "from-lime-400 to-emerald-500",
];

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

function scoreCandidate(candidate: Recommendation, form: SurveyForm) {
  let score = 0;
  const price = candidate.house.price ?? 0;
  const projectText =
    `${candidate.project.name} ${candidate.project.description} ${candidate.project.location}`.toLowerCase();
  const priority = form.priority.toLowerCase();
  const bedrooms = Number(form.bedrooms);
  const floor = candidate.house.floor ?? 0;

  if (form.budgetRange === "low") {
    if (price <= 200000) score += 5;
    else if (price <= 400000) score += 2;
  } else if (form.budgetRange === "mid") {
    if (price >= 200000 && price <= 800000) score += 5;
    else if (price >= 150000 && price <= 900000) score += 2;
  } else if (form.budgetRange === "high") {
    if (price >= 800000) score += 5;
    else if (price >= 600000) score += 2;
  } else {
    score += 1;
  }

  if (
    form.countryId &&
    Number(form.countryId) === candidate.project.country_id
  ) {
    score += 4;
  }

  if (form.floorPreference === "high") {
    if (floor >= 8) score += 4;
    else if (floor >= 5) score += 2;
  } else if (form.floorPreference === "low") {
    if (floor <= 3) score += 4;
    else if (floor <= 5) score += 2;
  }

  if (priority === "family") {
    if (projectText.match(/family|community|garden|school|park/)) score += 3;
  } else if (priority === "luxury") {
    if (projectText.match(/luxury|exclusive|premium|five-star|high-end/))
      score += 3;
  } else if (priority === "investment") {
    if (projectText.match(/investment|value|return|growth|rental|development/))
      score += 3;
  } else if (priority === "beachfront") {
    if (projectText.match(/beach|sea|waterfront|coast/)) score += 3;
  }

  if (bedrooms > 0 && candidate.house.nb_bedrooms != null) {
    if (candidate.house.nb_bedrooms === bedrooms) score += 4;
    else if (bedrooms >= 4 && candidate.house.nb_bedrooms >= 4) score += 2;
  }

  if (candidate.house.nb_bedrooms != null && candidate.house.nb_bedrooms >= 3) {
    score += 1;
  }

  return score;
}

function matchesBudget(price: number, budgetRange: SurveyForm["budgetRange"]) {
  if (budgetRange === "low") return price <= 200000;
  if (budgetRange === "mid") return price >= 200000 && price <= 800000;
  if (budgetRange === "high") return price >= 800000;
  return true;
}

function matchesPriority(projectText: string, priority: string) {
  const normalized = priority.trim().toLowerCase();

  if (!normalized) return true;
  if (normalized === "city living") {
    return /city|downtown|urban|center|metropolitan/.test(projectText);
  }
  if (normalized === "family") {
    return /family|community|garden|school|park/.test(projectText);
  }
  if (normalized === "luxury") {
    return /luxury|exclusive|premium|five-star|high-end/.test(projectText);
  }
  if (normalized === "investment") {
    return /investment|value|return|growth|rental|development/.test(
      projectText,
    );
  }
  if (normalized === "beachfront") {
    return /beach|sea|waterfront|coast/.test(projectText);
  }

  return true;
}

function matchesAllFilters(candidate: Recommendation, form: SurveyForm) {
  const price = candidate.house.price ?? 0;
  const bedrooms = Number(form.bedrooms);
  const floor = candidate.house.floor ?? 0;
  const projectText =
    `${candidate.project.name} ${candidate.project.description} ${candidate.project.location}`.toLowerCase();

  if (
    form.countryId &&
    Number(form.countryId) !== candidate.project.country_id
  ) {
    return false;
  }

  if (!matchesBudget(price, form.budgetRange)) {
    return false;
  }

  if (form.floorPreference === "high" && floor < 5) {
    return false;
  }

  if (form.floorPreference === "low" && floor > 5) {
    return false;
  }

  if (
    bedrooms > 0 &&
    (candidate.house.nb_bedrooms == null ||
      (bedrooms >= 4
        ? candidate.house.nb_bedrooms < 4
        : candidate.house.nb_bedrooms !== bedrooms))
  ) {
    return false;
  }

  return matchesPriority(projectText, form.priority);
}

export default function Projects() {
  useDocumentTitle("Projects");
  const navigate = useNavigate();

  const [searchParams, setSearchParams] = useSearchParams();
  const [showSurvey, setShowSurvey] = useState(false);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(
    null,
  );
  const [recommendationText, setRecommendationText] = useState(
    "Answer the questions to get the closest match in the selected country.",
  );
  const [form, setForm] = useState<SurveyForm>({
    budgetRange: "any",
    countryId: "",
    floorPreference: "any",
    priority: "City living",
    bedrooms: "",
  });

  const {
    Countries,
    Loading: CountriesLoading,
    Error: CountriesError,
  } = useCountries();
  const {
    Projects: AllProjects,
    Loading: ProjectsLoading,
    Error: ProjectsError,
    UpdateProject,
  } = useProjects();
  const {
    Buildings,
    Loading: BuildingsLoading,
    Error: BuildingsError,
  } = useBuildings();
  const { Houses, Loading: HousesLoading, Error: HousesError } = useHouses();
  const { Session } = useAuth();
  const { IsFavorited, ToggleFavorite } = useFavorites();

  const loading =
    CountriesLoading || ProjectsLoading || BuildingsLoading || HousesLoading;
  const error =
    CountriesError || ProjectsError || BuildingsError || HousesError;

  const countries = Countries;

  const selectedCountry = searchParams.get("country");
  const activeCountryId = form.countryId || selectedCountry || "";

  const projects = useMemo(
    () =>
      AllProjects?.filter(
        (project): project is Project & { id: number } =>
          typeof project.id === "number" &&
          (!selectedCountry || String(project.country_id) === selectedCountry),
      ),
    [AllProjects, selectedCountry],
  );

  const projectImagesById = useMemo(() => {
    const map = new Map<number, string[]>();

    projects?.forEach((project) => {
      map.set(project.id, getProjectImageUrls(project));
    });

    return map;
  }, [projects]);

  const countryById = useMemo(
    () => new Map(countries?.map((country) => [country.id, country])),
    [countries],
  );

  const housesByBuildingId = useMemo(() => {
    const map = new Map<number, House[]>();

    Houses?.forEach((house) => {
      if (typeof house.building_id !== "number") return;
      const existing = map.get(house.building_id);
      if (existing) {
        existing.push(house);
      } else {
        map.set(house.building_id, [house]);
      }
    });

    return map;
  }, [Houses]);

  const buildingsByProjectId = useMemo(() => {
    const map = new Map<number, Building[]>();

    Buildings?.forEach((building) => {
      if (typeof building.project_id !== "number") return;
      const existing = map.get(building.project_id);
      if (existing) {
        existing.push(building);
      } else {
        map.set(building.project_id, [building]);
      }
    });

    return map;
  }, [Buildings]);

  const projectPriceRanges = useMemo(() => {
    const map = new Map<number, { min: number; max: number }>();

    projects?.forEach((project) => {
      const projectBuildings = buildingsByProjectId.get(project.id) ?? [];
      const prices = projectBuildings.flatMap(
        (building) =>
          housesByBuildingId
            .get((building.id as number) ?? -1)
            ?.map((house) => house.price)
            .filter((price): price is number => typeof price === "number") ??
          [],
      );

      if (prices.length === 0) {
        map.set(project.id, { min: 0, max: 0 });
        return;
      }

      map.set(project.id, {
        min: Math.min(...prices),
        max: Math.max(...prices),
      });
    });

    return map;
  }, [projects, buildingsByProjectId, housesByBuildingId]);

  function getPriceRange(projectId: number) {
    return projectPriceRanges.get(projectId) ?? { min: 0, max: 0 };
  }

  const allVisiblePrices = useMemo(
    () =>
      Array.from(projectPriceRanges.values()).flatMap((range) =>
        range.min > 0 && range.max > 0 ? [range.min, range.max] : [],
      ),
    [projectPriceRanges],
  );

  const overallPrices = useMemo(() => {
    return {
      min: allVisiblePrices.length ? Math.min(...allVisiblePrices) : 0,
      max: allVisiblePrices.length ? Math.max(...allVisiblePrices) : 0,
    };
  }, [allVisiblePrices]);

  const recommendationCandidates = useMemo(() => {
    return AllProjects?.flatMap((project) => {
      if (typeof project.id !== "number") return [];
      const projectBuildings = buildingsByProjectId.get(project.id) ?? [];

      return projectBuildings.flatMap((building) => {
        if (typeof building.id !== "number") return [];
        const buildingHouses = housesByBuildingId.get(building.id) ?? [];

        return buildingHouses.map((house) => ({ project, building, house }));
      });
    });
  }, [AllProjects, buildingsByProjectId, housesByBuildingId]);

  function handleFilter(countryId: string | null) {
    if (countryId) {
      setSearchParams({ country: countryId });
    } else {
      setSearchParams({});
    }
  }

  function openSurvey() {
    setRecommendation(null);
    setRecommendationText(
      "Answer the questions to get the closest match in the selected country.",
    );
    setForm((prev) => ({
      ...prev,
      budgetRange: "any",
      countryId: selectedCountry || "",
      floorPreference: "any",
      priority: "City living",
      bedrooms: "",
    }));
    setShowSurvey(true);
  }

  function closeSurvey() {
    setShowSurvey(false);
  }

  if (!countries || !projects || !Buildings || !Houses)
    return <ErrorCard message='Failed go load the data required.' error='' />;

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    const strictMatches = recommendationCandidates?.filter((candidate) =>
      matchesAllFilters(candidate, {
        ...form,
        countryId: form.countryId || activeCountryId,
      }),
    );

    if (strictMatches?.length === 0) {
      setRecommendation(null);
      setRecommendationText(
        "Not found. No project matches your selected filters.",
      );
      return;
    }

    const best = strictMatches?.reduce<Recommendation | null>(
      (bestSoFar, candidate) => {
        if (!bestSoFar) return candidate;
        return scoreCandidate(candidate, form) > scoreCandidate(bestSoFar, form)
          ? candidate
          : bestSoFar;
      },
      null,
    );

    if (best) {
      setRecommendation(best);
      setRecommendationText(
        `Great match: ${best.project.name}. Best building: ${best.building.name}, unit price $${best.house.price.toLocaleString()}.`,
      );
    } else {
      setRecommendation(null);
      setRecommendationText(
        "Not found. No project matches your selected filters.",
      );
    }
  }

  async function handleFavoriteClick(
    event: MouseEvent<HTMLButtonElement>,
    projectId: Project["id"],
  ) {
    event.preventDefault();
    event.stopPropagation();

    if (!Session) {
      navigate("/login");
      return;
    }

    await ToggleFavorite(projectId);
  }

  return (
    <div className='bg-[#e6e0d8]'>
      <div className='relative overflow-hidden text-white py-24 md:py-32 px-6'>
        <motion.div
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className='absolute inset-0 bg-cover bg-center'
          style={{
            backgroundImage: "url('/images/projects/projects.jpg')",
          }}
        />
        <div className='absolute inset-0 bg-black/45' />
        <Breadcrumbs style='light' />
        <div className='relative max-w-5xl mx-auto text-center'>
          <h1 className='text-4xl md:text-5xl font-extrabold mb-4'>
            Our Projects
          </h1>
          <p className='text-gray-300 text-lg max-w-xl mx-auto'>
            Explore our developments across the globe and get a quick
            personalized recommendation.
          </p>
        </div>
      </div>

      <div className='max-w-6xl mx-auto px-6 mt-8 md:mt-10'>
        <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8'>
          <div className='rounded-3xl bg-white p-5 shadow-lg'>
            <h2 className='text-xl font-semibold text-slate-900'>
              Need a recommendation?
            </h2>
            <p className='mt-2 text-sm text-slate-500'>
              Open the survey and get the best building match based on budget,
              country, floor preference and priorities.
            </p>
          </div>
          <button
            type='button'
            onClick={openSurvey}
            className='inline-flex items-center justify-center rounded-3xl bg-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition cursor-pointer'
          >
            Open recommendation survey
          </button>
        </div>

        <div className='bg-white rounded-2xl shadow-lg p-4 flex flex-wrap justify-center gap-3 mb-10'>
          <button
            onClick={() => handleFilter(null)}
            className={`px-6 py-2.5 rounded-full text-sm font-semibold transition cursor-pointer ${
              !selectedCountry
                ? "bg-orange-500 text-white shadow-md shadow-orange-500/30"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            All
          </button>
          {countries.map((c) => (
            <button
              key={c.id}
              onClick={() => handleFilter(String(c.id))}
              className={`px-6 py-2.5 rounded-full text-sm font-semibold transition flex items-center gap-2 cursor-pointer ${
                selectedCountry === String(c.id)
                  ? "bg-orange-500 text-white shadow-md shadow-orange-500/30"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <img
                src={`https://flagcdn.com/w40/${countryFlags[c.name] || "xx"}.png`}
                alt={c.name}
                className='w-5 h-4 object-cover rounded-sm'
              />
              {c.name}
            </button>
          ))}
        </div>

        {error && (
          <ErrorCard
            message='We could not load the projects. Please try again later.'
            error={error.message}
          />
        )}

        {loading ? (
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 pb-20'>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className='bg-white rounded-2xl overflow-hidden shadow-md animate-pulse'
              >
                {/* Image placeholder */}
                <div className='h-48 bg-gray-200' />
                <div className='p-6'>
                  {/* Country flag + name */}
                  <div className='flex items-center gap-2 mb-3'>
                    <div className='h-4 w-5 bg-gray-200 rounded' />
                    <div className='h-3 w-20 bg-gray-100 rounded' />
                  </div>
                  {/* Title */}
                  <div className='h-5 w-3/4 bg-gray-200 rounded mb-3' />
                  {/* Description lines */}
                  <div className='space-y-2 mb-4'>
                    <div className='h-3 w-full bg-gray-100 rounded' />
                    <div className='h-3 w-5/6 bg-gray-100 rounded' />
                  </div>
                  {/* Meta */}
                  <div className='h-3 w-1/2 bg-gray-100 rounded mb-1' />
                  <div className='h-3 w-2/3 bg-gray-100 rounded mb-4' />
                  {/* Footer */}
                  <div className='flex justify-between'>
                    <div className='h-3 w-24 bg-gray-100 rounded' />
                    <div className='h-3 w-28 bg-gray-100 rounded' />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <p className='text-center text-gray-400 py-20'>No projects found.</p>
        ) : (
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 pb-20'>
            {projects.map((project, i) => {
              const projectImages = projectImagesById.get(project.id) ?? [];

              return (
                <Link
                  to={`/projects/${project.id}`}
                  key={project.id}
                  className='group relative text-left bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1'
                  onClick={async () =>
                    await UpdateProject(
                      { nb_visits: (project.nb_visits || 0) + 1 },
                      project.id,
                    )
                  }
                >
                  <button
                    type='button'
                    onClick={(event) => handleFavoriteClick(event, project.id)}
                    className='absolute right-3 top-3 z-30 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-[#0f2f4f] shadow-md transition hover:bg-orange-50 cursor-pointer'
                    aria-label={
                      IsFavorited(project.id)
                        ? "Remove from favorites"
                        : "Add to favorites"
                    }
                  >
                    <Heart
                      className={`h-4 w-4 ${IsFavorited(project.id) ? "fill-orange-500 text-orange-500" : "text-[#0f2f4f]"}`}
                    />
                  </button>

                  {projectImages.length > 0 ? (
                    <ImageGallery images={projectImages} />
                  ) : (
                    <div
                      className={`h-48 bg-linear-to-br ${cardGradients[i % cardGradients.length]} flex items-center justify-center relative`}
                    >
                      <span className='text-white/20 text-8xl font-black'>
                        {project.name[0]}
                      </span>
                    </div>
                  )}

                  <div className='p-6'>
                    <div className='flex items-center gap-2 mb-2'>
                      {countryById.get(project.country_id) &&
                        countryFlags[
                          countryById.get(project.country_id)?.name || ""
                        ] && (
                          <img
                            src={`https://flagcdn.com/w40/${countryFlags[countryById.get(project.country_id)?.name || ""]}.png`}
                            alt=''
                            className='w-5 h-4 object-cover rounded-sm'
                          />
                        )}
                      <span className='text-xs text-gray-400'>
                        {countryById.get(project.country_id)?.name || "Unknown"}
                      </span>
                    </div>
                    <h2 className='text-lg font-bold mb-2 group-hover:text-orange-500 transition'>
                      {project.name}
                    </h2>
                    <p className='text-gray-500 text-sm line-clamp-2 mb-4'>
                      {project.description}
                    </p>
                    <div className='mb-4 space-y-1 text-xs text-[#24507f]'>
                      <p>
                        Handover:{" "}
                        {project.handover_date
                          ? new Date(project.handover_date).toLocaleDateString()
                          : "To be announced"}
                      </p>
                      <p className='line-clamp-2'>
                        ROI Insight:{" "}
                        {project.expected_roi_note ||
                          "Steady rental demand with long-term growth potential."}
                      </p>
                    </div>
                    <div className='flex items-center justify-between text-sm text-gray-400'>
                      <span>📍 {project.location}</span>
                      <span>
                        {getPriceRange(project.id).min > 0
                          ? `$${getPriceRange(project.id).min.toLocaleString()} - $${getPriceRange(project.id).max.toLocaleString()}`
                          : "Price available"}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {showSurvey && (
        <Card
          className='fixed inset-0 z-9000 overflow-y-auto flex items-start justify-center bg-black/50 p-4 sm:items-center no-scrollbar overflow-hidden'
          onMouseDown={closeSurvey}
        >
          <Card
            className='w-full max-w-6xl max-h-[92vh] overflow-y-auto rounded-[2rem] bg-white shadow-2xl p-0! no-scrollbar'
            onMouseDown={(e) => e.stopPropagation()}
          >
            <CardHeader className='flex items-center justify-between bg-orange-500 px-6 py-5 text-white rounded-t-[2rem]'>
              <div>
                <CardTitle className='text-2xl font-bold'>
                  Find your perfect building
                </CardTitle>
                <CardDescription className='text-sm text-orange-100 mt-1'>
                  Answer a few quick questions and we'll recommend the best
                  building from our current projects.
                </CardDescription>
              </div>
              <CardAction>
                <button
                  type='button'
                  onClick={closeSurvey}
                  className='rounded-full border border-white/30 bg-white/10 hover:bg-white/20 transition p-2 cursor-pointer'
                >
                  <X className='w-4 h-4' />
                </button>
              </CardAction>
            </CardHeader>

            <CardContent className='grid grid-cols-1 gap-6 p-7 lg:grid-cols-[1.6fr_1fr]'>
              <Card className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ring-0!'>
                <CardHeader className='mb-6 rounded-2xl border border-orange-100 bg-orange-50 p-5'>
                  <CardTitle className='text-sm text-gray-500 mb-2'>
                    Available price range
                  </CardTitle>
                  <CardDescription className='text-2xl font-semibold text-slate-900'>
                    {overallPrices.min
                      ? `$${overallPrices.min.toLocaleString()}`
                      : "N/A"}{" "}
                    -{" "}
                    {overallPrices.max
                      ? `$${overallPrices.max.toLocaleString()}`
                      : "N/A"}
                  </CardDescription>
                  <CardFooter className='text-sm text-gray-500 mt-3 bg-transparent border-t-0! p-0!'>
                    This survey uses existing prices from our projects database.
                  </CardFooter>
                </CardHeader>

                <form onSubmit={handleSubmit} className='space-y-5'>
                  <Field>
                    <Label className='block text-sm font-semibold text-slate-700 mb-2'>
                      What price is in mind?
                    </Label>
                    <Select
                      value={form.budgetRange}
                      onValueChange={(value) =>
                        setForm({ ...form, budgetRange: value })
                      }
                    >
                      <SelectTrigger className='w-full rounded-lg border border-slate-200 bg-white p-3.5 text-sm shadow-sm cursor-pointer'>
                        <SelectValue placeholder='Select Your Budget' />
                      </SelectTrigger>
                      <SelectContent className='z-9001'>
                        <SelectGroup>
                          <SelectLabel>Select Your Budget</SelectLabel>
                          <SelectItem value='any'>Any budget</SelectItem>
                          <SelectItem value='low'>Up to 200K</SelectItem>
                          <SelectItem value='mid'>200K - 800K</SelectItem>
                          <SelectItem value='high'>800K+</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field>
                    <Label className='block text-sm font-semibold text-slate-700 mb-2'>
                      Which country do you prefer?
                    </Label>
                    <Select
                      value={form.countryId}
                      onValueChange={(value) =>
                        setForm({ ...form, countryId: value })
                      }
                    >
                      <SelectTrigger className='w-full rounded-lg border border-slate-200 bg-white p-3.5 text-sm shadow-sm cursor-pointer'>
                        <SelectValue placeholder='Select Your Country' />
                      </SelectTrigger>
                      <SelectContent className='z-9001'>
                        <SelectGroup>
                          <SelectLabel>Select Your Country</SelectLabel>
                          {countries.map((country) => (
                            <SelectItem
                              key={country.id}
                              value={String(country.id!)}
                            >
                              {country.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field>
                    <Label className='block text-sm font-semibold text-slate-700 mb-2'>
                      Do you prefer a high floor or a low floor?
                    </Label>
                    <Select
                      value={form.floorPreference}
                      onValueChange={(value) =>
                        setForm({ ...form, floorPreference: value })
                      }
                    >
                      <SelectTrigger className='w-full rounded-lg border border-slate-200 bg-white p-3.5 text-sm shadow-sm cursor-pointer'>
                        <SelectValue placeholder='No preference' />
                      </SelectTrigger>
                      <SelectContent className='z-9001'>
                        <SelectGroup>
                          <SelectLabel>Floor preference</SelectLabel>
                          <SelectItem value='any'>No preference</SelectItem>
                          <SelectItem value='high'>High floor</SelectItem>
                          <SelectItem value='low'>Low floor</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field>
                    <Label className='block text-sm font-semibold text-slate-700 mb-2'>
                      What matters most?
                    </Label>
                    <Select
                      value={form.priority}
                      onValueChange={(value) =>
                        setForm({ ...form, priority: value })
                      }
                    >
                      <SelectTrigger className='w-full rounded-lg border border-slate-200 bg-white p-3.5 text-sm shadow-sm cursor-pointer'>
                        <SelectValue placeholder='What Matters Most?' />
                      </SelectTrigger>
                      <SelectContent className='z-9001'>
                        <SelectGroup>
                          <SelectLabel>What Matters Most?</SelectLabel>
                          <SelectItem value='City living'>
                            City living
                          </SelectItem>
                          <SelectItem value='Beachfront'>Beachfront</SelectItem>
                          <SelectItem value='Family'>
                            Family friendly
                          </SelectItem>
                          <SelectItem value='Luxury'>
                            Luxury experience
                          </SelectItem>
                          <SelectItem value='Investment'>
                            Investment potential
                          </SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field>
                    <Label className='block text-sm font-semibold text-slate-700 mb-2'>
                      How many bedrooms do you prefer?
                    </Label>
                    <Select
                      value={form.bedrooms}
                      onValueChange={(value) =>
                        setForm({ ...form, bedrooms: value })
                      }
                    >
                      <SelectTrigger className='w-full rounded-lg border border-slate-200 bg-white p-3.5 text-sm shadow-sm cursor-pointer'>
                        <SelectValue placeholder='No preference' />
                      </SelectTrigger>
                      <SelectContent className='z-9001'>
                        <SelectGroup>
                          <SelectLabel>Preferences</SelectLabel>
                          <SelectItem value='1'>1 bedroom</SelectItem>
                          <SelectItem value='2'>2 bedrooms</SelectItem>
                          <SelectItem value='3'>3 bedrooms</SelectItem>
                          <SelectItem value='4'>4+ bedrooms</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field>
                    <Button
                      type='submit'
                      variant='secondary'
                      className='w-full rounded-lg bg-orange-500 px-4 py-3 text-sm font-semibold text-white hover:bg-orange-600 transition cursor-pointer'
                    >
                      Get recommendation
                    </Button>
                  </Field>
                </form>
              </Card>

              <Card className='rounded-2xl border border-slate-200 bg-slate-50 p-5 text-slate-900 shadow-sm'>
                <CardHeader className='mb-6'>
                  <CardTitle className='text-xl font-semibold'>
                    Your current preferences
                  </CardTitle>
                  <CardDescription className='text-slate-600 mt-2'>
                    Country:
                    {activeCountryId
                      ? countries.find(
                          (item) => String(item.id) === activeCountryId,
                        )?.name
                      : "Any"}
                    <p className='text-slate-600 mt-1'>
                      Floor preference:
                      {form.floorPreference === "high"
                        ? "High floor"
                        : form.floorPreference === "low"
                          ? "Low floor"
                          : "No preference"}
                    </p>
                  </CardDescription>
                </CardHeader>

                <CardContent className='space-y-4'>
                  <Card className='rounded-xl border border-slate-200 bg-white p-4'>
                    <CardHeader className='text-sm uppercase tracking-[0.2em] text-slate-400 p-0!'>
                      <CardTitle>Budget range</CardTitle>
                      <CardDescription className='mt-2 text-base font-semibold text-slate-900'>
                        {form.budgetRange}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                  <Card className='rounded-xl border border-slate-200 bg-white p-4'>
                    <CardHeader className='text-sm uppercase tracking-[0.2em] text-slate-400 p-0!'>
                      <CardTitle>Preference</CardTitle>
                      <CardDescription className='mt-2 text-base font-semibold text-slate-900'>
                        {form.priority}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </CardContent>

                <Card className='mt-8 rounded-2xl border border-orange-100 bg-white p-5 text-slate-900 shadow-sm'>
                  <CardHeader className='text-sm uppercase tracking-[0.2em] text-orange-500'>
                    <CardTitle>Recommendation</CardTitle>
                  </CardHeader>
                  <CardDescription className='text-sm! text-slate-600!'>
                    {recommendationText}
                  </CardDescription>
                  <CardContent>
                    {recommendation && (
                      <Card className='mt-5 rounded-2xl border border-orange-100 bg-orange-50 p-4 text-slate-900'>
                        <CardHeader className='text-sm uppercase tracking-[0.2em] text-orange-500'>
                          <CardTitle>Best building</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Card className='p-3 bg-transparent ring-0! '>
                            <CardHeader className='mt-2 text-xl font-bold'>
                              {recommendation.building.name}
                            </CardHeader>
                            <CardContent>
                              <p className='mt-2 text-sm text-slate-700'>
                                Project: {recommendation.project.name}
                              </p>
                              <p className='mt-1 text-sm text-slate-700'>
                                Price: $
                                {recommendation.house.price.toLocaleString()}
                              </p>
                              <p className='mt-1 text-sm text-slate-700'>
                                Bedrooms:{" "}
                                {recommendation.house.nb_bedrooms ?? "N/A"}
                              </p>
                              <Link
                                to={`/projects/${recommendation.project.id}`}
                                onClick={closeSurvey}
                                className='inline-flex mt-4 items-center rounded-2xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 transition'
                              >
                                View project details
                              </Link>
                            </CardContent>
                          </Card>
                        </CardContent>
                      </Card>
                    )}
                  </CardContent>
                </Card>
              </Card>
            </CardContent>
          </Card>
        </Card>
      )}
    </div>
  );
}
