import { useState, type SubmitEvent } from "react";
import { useMultistepForm } from "@/hooks/useMultistepForm";
import ProjectForm from "./ProjectForm";
import BuildingForm from "./BuildingForm";
import HouseForm from "./HouseForm";
import { UploadImage } from "@/services/imageServices";
import { Button } from "../ui/button";
import {
  FieldDescription,
  FieldGroup,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from "../ui/field";
import type { FormData } from "@/types/form";
import type { Country } from "@/types/country";
import type { Project } from "@/types/projects";
import type { Building } from "@/types/building";
import type { House } from "@/types/house";
import type { Image } from "@/types/types";

const InitialData: FormData = {
  project_name: "",
  project_description: "",
  project_location: "",
  project_country_id: NaN,
  project_images: null,
  project_handover_date: "",
  project_expected_roi_note: "",
  project_map_url: "",
  project_map_embed_url: "",
  buildings_name: "",
  buildings_block: "",
  buildings_images: null,
  buildings_project_id: NaN,
  house_floor: NaN,
  house_nb_bedrooms: NaN,
  house_nb_bathrooms: NaN,
  house_building_id: NaN,
  house_price: NaN,
  house_area: NaN,
};

type ProjectsDashBoardFormProps = {
  Countries: Country[];
  Projects: Project[];
  Buildings: Building[];
  loading: boolean;
  AddProject: (new_project: Project) => Promise<Project | null>;
  AddBuilding: (new_building: Building) => Promise<Building | null>;
  AddHouse: (new_house: House) => Promise<House | null>;
};

export default function ProjectsDashBoardForm({
  loading,
  AddBuilding,
  AddHouse,
  AddProject,
  Buildings,
  Projects,
  Countries,
}: ProjectsDashBoardFormProps) {
  const [FormData, setFormData] = useState<FormData>(InitialData);

  const { CurrentStepIndex, steps, step, goTo, next } = useMultistepForm([
    <ProjectForm
      {...FormData}
      loading={loading}
      updateFields={updateFields}
      Options={Countries}
    />,
    <BuildingForm
      {...FormData}
      loading={loading}
      updateFields={updateFields}
      Options={Projects}
    />,
    <HouseForm
      {...FormData}
      loading={loading}
      updateFields={updateFields}
      Options={Buildings}
    />,
  ]);

  function updateFields(fields: Partial<FormData>) {
    setFormData((prev) => ({ ...prev, ...fields }));
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    // 0 id for Projects, 1 is for buildings, 2 is for Houses
    switch (CurrentStepIndex) {
      // Projects
      case 0: {
        const images = FormData.project_images;
        const project_images: Image[] = [];
        if (images) {
          for (const file of images) {
            const imageObj = await UploadImage(file, "projects_images");

            if (imageObj) project_images.push(imageObj);
          }
          const newProject: Project = {
            id: Math.floor(Math.random() * 1000),
            name: FormData.project_name,
            description: FormData.project_description,
            location: FormData.project_location,
            nb_visits: 0,
            country_id: FormData.project_country_id,
            images: project_images,
            handover_date: FormData.project_handover_date || null,
            expected_roi_note: FormData.project_expected_roi_note || null,
            map_url: FormData.project_map_url || null,
            map_embed_url: FormData.project_map_embed_url || null,
          };

          const ok = await AddProject(newProject);
          if (ok) return next();
        }

        break;
      }
      // Buildings
      case 1: {
        const images = FormData.buildings_images;
        if (images) {
          const building_images: Image[] = [];
          for (const file of images) {
            const imageObj = await UploadImage(file, "buildings_images");

            if (imageObj) building_images.push(imageObj);
          }
          const newBuilding: Building = {
            id: Math.floor(Math.random() * 100),
            name: FormData.buildings_name,
            block: FormData.buildings_block,
            images: building_images,
            project_id: FormData.buildings_project_id,
          };

          const ok = await AddBuilding(newBuilding);
          if (ok) return next();
        }

        break;
      }

      // Houses
      case 2: {
        const newHouse: House = {
          id: Math.floor(Math.random() * 100),
          floor: FormData.house_floor,
          nb_bedrooms: FormData.house_nb_bedrooms,
          nb_bathrooms: FormData.house_nb_bathrooms,
          building_id: FormData.house_building_id,
          price: FormData.house_price,
          area: FormData.house_area,
        };

        const ok = await AddHouse(newHouse);

        if (ok) return goTo(0);

        break;
      }

      default:
        break;
    }
  }

  const active: string = "bg-[#173b67] text-white hover:bg-[#24507f]";
  const inactive: string =
    "border-slate-300 bg-white text-slate-900 hover:bg-slate-100";

  return (
    <FieldSet className="gap-4 rounded-xl border border-slate-200 bg-white p-4 text-slate-900 shadow-lg md:p-6">
      <div className="space-y-2">
        <FieldLegend className="text-2xl font-semibold text-slate-900 md:text-3xl">
          Projects Dashboard
        </FieldLegend>
        <FieldDescription className="text-slate-600">
          Create projects, buildings, and houses from one workflow.
        </FieldDescription>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 md:text-sm">
          Step {CurrentStepIndex + 1} of {steps.length}
        </div>
        {step}
      </form>

      <FieldSeparator />

      <FieldGroup className="flex flex-row items-center gap-2 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-3 whitespace-nowrap">
        <p className="text-sm text-slate-700">Jump to step:</p>
        <Button
          type="button"
          variant="link"
          className={`cursor-pointer ${CurrentStepIndex === 0 ? active : inactive}`}
          onClick={() => {
            goTo(0);
          }}
          disabled={loading}
        >
          Add Project
        </Button>
        <Button
          type="button"
          variant="link"
          className={`cursor-pointer ${CurrentStepIndex === 1 ? active : inactive}`}
          onClick={() => {
            goTo(1);
          }}
          disabled={loading}
        >
          Add Building
        </Button>
        <Button
          type="button"
          variant="link"
          className={`cursor-pointer ${CurrentStepIndex === 2 ? active : inactive}`}
          onClick={() => {
            goTo(2);
          }}
          disabled={loading}
        >
          Add House
        </Button>
      </FieldGroup>
    </FieldSet>
  );
}
