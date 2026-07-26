import { useEffect, useRef, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Breadcrumbs from "@/components/Breadcrumbs";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import type { FAQItem, SummaryLabel } from "@/types/types";
import type { CountryInfo, CountryDisplay } from "@/types/country";
import { useCountries } from "@/hooks/useCountries";
import { useProjects } from "@/hooks/useProjects";
import { RandomizeSplitArray } from "@/helpers/helpers";
import { GlobeHeroSection } from "@/components/GlobeHeroSection";
import StatCard from "@/components/StatCard";
import ErrorCard from "@/components/ErrorCard";
import LoadingCard from "@/components/LoadingCard";

const countryInfo: CountryInfo = {
  "United Arab Emirates": { flagCode: "ae", lat: 24.4539, lng: 54.3773 },
  Egypt: { flagCode: "eg", lat: 26.8206, lng: 30.8025 },
  "United Kingdom": { flagCode: "gb", lat: 55.3781, lng: -3.436 },
  "Saudi Arabia": { flagCode: "sa", lat: 23.8859, lng: 45.0792 },
  Turkey: { flagCode: "tr", lat: 38.9637, lng: 35.2433 },
  Oman: { flagCode: "om", lat: 21.4735, lng: 55.9754 },
  Bahrain: { flagCode: "bh", lat: 26.0667, lng: 50.5577 },
  Qatar: { flagCode: "qa", lat: 25.3548, lng: 51.1839 },
  Kuwait: { flagCode: "kw", lat: 29.3117, lng: 47.4818 },
  Iraq: { flagCode: "iq", lat: 33.2232, lng: 43.6793 },
  Jordan: { flagCode: "jo", lat: 30.5852, lng: 36.2384 },
  Lebanon: { flagCode: "lb", lat: 33.8547, lng: 35.8623 },
  Morocco: { flagCode: "ma", lat: 31.7917, lng: -7.0926 },
};

const faqItems: FAQItem[] = [
  {
    question: "What types of properties does TAB Developments offer?",
    answer:
      "TAB Developments offers apartments, villas, townhouses, and selected commercial opportunities across key locations in Egypt, the UAE, and the UK. Availability varies by project phase and location.",
  },
  {
    question: "How can I reserve a unit?",
    answer:
      "You can reserve a unit by selecting your preferred project, contacting our sales team, and completing the reservation form with the required documents and initial payment.",
  },
  {
    question: "Do you provide installment payment plans?",
    answer:
      "Yes. Flexible installment plans are available on many projects. Plan duration, down payment, and milestone structure depend on the specific development and current offer.",
  },
  {
    question: "Are your projects suitable for investment?",
    answer:
      "Many of our projects are designed with long-term value in mind, including strong locations, quality construction, and rental demand factors that support investment objectives.",
  },
  {
    question: "Can international buyers purchase properties?",
    answer:
      "Yes, international buyers can purchase in many of our developments, subject to local regulations and verification requirements in each country.",
  },
  {
    question: "What documents are required to purchase a property?",
    answer:
      "Typically, you will need a valid identification document, proof of address, and signed reservation or contract forms. Exact requirements may vary by country and project.",
  },
  {
    question: "How do I schedule a site visit or virtual tour?",
    answer:
      "You can schedule a site visit or virtual tour directly through our project pages or by contacting our support team. We will coordinate a suitable time with an advisor.",
  },
  {
    question: "Do you support after-sales services?",
    answer:
      "Yes. We provide structured after-sales support, including handover guidance, documentation coordination, and dedicated assistance for post-purchase inquiries.",
  },
  {
    question: "How is project handover timing communicated?",
    answer:
      "Handover timelines are shared in project updates and contract documents. We also provide progress communication through official channels during construction phases.",
  },
  {
    question: "Who can I contact for financing guidance?",
    answer:
      "Our sales advisors can guide you through available financing options and connect you with partner institutions where applicable, based on your chosen project and eligibility.",
  },
];

export default function About() {
  useDocumentTitle("About Us");

  const globeRef = useRef<any>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const globeRef2 = useRef<HTMLDivElement>(null);

  const { Countries, Loading: CountriesLoading } = useCountries();
  const { Projects, Loading: ProjectsLoading } = useProjects();

  const loading = CountriesLoading || ProjectsLoading;

  const [countries, setCountries] = useState<CountryDisplay[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<CountryDisplay | null>(
    null,
  );
  const [showAbout, setShowAbout] = useState(true);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  useEffect(() => {
    if (location.hash === "#globe" && globeRef2.current) {
      setTimeout(() => {
        globeRef2.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [location.hash]);

  useEffect(() => {
    async function fetchCountries() {
      if (!Countries) return;
      const filteredCountries = Countries.filter((c) => countryInfo[c.name]);
      const mapped: CountryDisplay[] = filteredCountries.map((c) => ({
        ...c,
        ...countryInfo[c.name],
      }));
      setCountries(mapped);
      if (mapped.length > 0) setSelectedCountry(mapped[0]);
    }
    fetchCountries();
  }, [Countries]);

  useEffect(() => {
    if (!globeRef.current || !selectedCountry) return;
    globeRef.current.pointOfView(
      { lat: selectedCountry.lat, lng: selectedCountry.lng, altitude: 1.8 },
      1200,
    );
  }, [selectedCountry]);

  if (loading) return <LoadingCard message="Loading data. Please wait..." />

  if (!Countries)
    return (
      <ErrorCard
        message='Failed to fetch countries'
        error='Unable to retrieve country information.'
      />
    );

  if (!Projects)
    return (
      <ErrorCard
        message='Failed to fetch projects'
        error='Unable to retrieve project information.'
      />
    );

  const FeaturedProjects =
    RandomizeSplitArray(Projects, 3) || Projects.slice(0, 3);

  function handleExplore() {
    if (!selectedCountry) return;
    navigate(`/projects?country=${selectedCountry.id}`);
  }

  const SummaryLabels: SummaryLabel[] = [
    { num: "8+", label: "Projects" },
    { num: "3+", label: "Countries" },
    { num: "12+", label: "Buildings" },
    { num: "22+", label: "Units" },
  ];

  return (
    <>
      {/* Hero Section */}
      <section className='relative overflow-hidden text-white'>
        <motion.div
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className='absolute inset-0 bg-cover bg-center'
          style={{ backgroundImage: "url('/images/about/about-us.png')" }}
        />
        <div className='absolute inset-0 bg-black/45' />
        <div className='p-5'>
          <Breadcrumbs />
        </div>
        <div className='relative max-w-7xl mx-auto px-6 py-24 md:py-32'>
          <h1 className='text-5xl md:text-7xl font-extrabold leading-tight mb-6'>
            Building the
            <br />
            <span className='text-orange-400'>Future</span>
          </h1>
          <p className='text-lg md:text-xl text-gray-300 max-w-xl mb-10'>
            Premium real estate developments across Egypt, UAE, and the United
            Kingdom. Discover your next home with TAB Developments.
          </p>
          <div className='flex gap-4'>
            <Link
              to='/projects'
              className='bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-full font-semibold transition shadow-lg shadow-orange-500/30'
            >
              View Projects
            </Link>
            <button
              onClick={() =>
                globeRef2.current?.scrollIntoView({ behavior: "smooth" })
              }
              className='border border-white/30 hover:border-white text-white px-8 py-3 rounded-full font-semibold transition'
            >
              Explore Globe
            </button>
          </div>
        </div>
      </section>
      {/* Stats */}
      <section className='py-16 px-6'>
        <div className='max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center'>
          {SummaryLabels.map((stat) => {
            const numericValue = parseInt(stat.num.replace("+", ""), 10);
            return (
              <StatCard
                key={stat.label}
                value={numericValue}
                label={stat.label}
              />
            );
          })}
        </div>
      </section>
      {/* Featured Projects */}
      <section className='py-20 px-6'>
        <div className='max-w-7xl mx-auto'>
          <h2 className='text-3xl md:text-4xl font-bold text-center mb-4'>
            Featured Projects
          </h2>
          <p className='text-gray-500 text-center mb-12'>
            A selection of our finest developments
          </p>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-8'>
            {FeaturedProjects.map((project) => {
              const country = Countries.find(
                (country) => country.id === project.country_id,
              );

              return (
                <Link
                  key={project.id}
                  to={`/projects/${project.id}`}
                  className='group rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white'
                >
                  <div className='h-48 bg-linear-to-br from-orange-400 to-orange-600 flex items-center justify-center'>
                    {!project.images[0].url && (
                      <span className='text-white text-6xl font-bold opacity-20'>
                        {project.name[0]}
                      </span>
                    )}
                    {project.images[0].url && (
                      <img
                        src={project.images[0].url}
                        alt={project.name}
                        className='size-full object-cover bg-center'
                      />
                    )}
                  </div>
                  <div className='p-6'>
                    <h3 className='text-xl font-bold mb-2 group-hover:text-orange-500 transition'>
                      {project.name}
                    </h3>
                    <p className='text-gray-500 text-sm line-clamp-2 mb-3'>
                      {project.description}
                    </p>
                    <div className='flex items-center justify-between text-sm text-gray-400'>
                      <span>📍 {project.location}</span>
                      <span>{country?.name}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
          <div className='text-center mt-12'>
            <Link
              to='/projects'
              className='bg-gray-900 hover:bg-gray-800 text-white px-8 py-3 rounded-full font-semibold transition'
            >
              View All Projects →
            </Link>
          </div>
        </div>
      </section>
      {/* FAQ */}
      <section className='py-20 px-6 bg-[#e6e0d8]'>
        <div className='max-w-4xl mx-auto'>
          <div className='text-center mb-12'>
            <h2 className='text-3xl md:text-4xl font-bold text-slate-900'>
              Most Asked Questions
            </h2>
            <p className='mt-3 text-slate-500 max-w-2xl mx-auto'>
              Find quick, clear answers about buying, payments, investment,
              handover, and support.
            </p>
            <div className='mx-auto mt-5 h-1 w-24 rounded-full bg-orange-500/70' />
          </div>

          <div className='grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5'>
            {[0, 1].map((columnIndex) => (
              <div key={columnIndex} className='space-y-4 md:space-y-5'>
                {faqItems
                  .filter((_, itemIndex) => itemIndex % 2 === columnIndex)
                  .map((item, filteredIndex) => {
                    const index = filteredIndex * 2 + columnIndex;
                    const isOpen = openFaqIndex === index;

                    return (
                      <article
                        key={item.question}
                        className='w-full rounded-2xl border border-slate-200 bg-white shadow-sm'
                      >
                        <button
                          type='button'
                          onClick={() =>
                            setOpenFaqIndex((prev) =>
                              prev === index ? null : index,
                            )
                          }
                          className='flex h-24 w-full items-center justify-between gap-6 px-6 py-5 text-left cursor-pointer'
                          aria-expanded={isOpen}
                        >
                          <h3 className='line-clamp-2 text-base md:text-lg font-semibold text-slate-900'>
                            {item.question}
                          </h3>
                          <span
                            className={`inline-flex h-8 w-8 shrink-0 flex-none items-center justify-center rounded-full border border-slate-300 text-lg leading-none text-slate-600 transition-transform ${
                              isOpen ? "rotate-45" : "rotate-0"
                            }`}
                          >
                            +
                          </span>
                        </button>

                        <AnimatePresence initial={false}>
                          {isOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.22, ease: "easeOut" }}
                              className='overflow-hidden'
                            >
                              <div className='px-6 pb-6 border-t border-slate-100'>
                                <p className='pt-4 text-sm md:text-base leading-7 text-slate-600'>
                                  {item.answer}
                                </p>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </article>
                    );
                  })}
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* Globe Section */}
      <div ref={globeRef2} className='w-full'>
        <GlobeHeroSection
          globeRef={globeRef}
          countries={countries}
          selectedCountry={selectedCountry}
          setSelectedCountry={setSelectedCountry}
          showAbout={showAbout}
          setShowAbout={setShowAbout}
          handleExplore={handleExplore}
        />
      </div>
    </>
  );
}
