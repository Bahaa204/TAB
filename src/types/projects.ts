/**
 * This file defines the types for the project data used in the application.
 */

import type { Building } from "./building";
import type { Country } from "./country";
import type { House } from "./house";
import type { Common, Image } from "./types";

export type Project = Common & {
  name: string;
  description: string;
  location: string;
  nb_visits?: number; // Supabase defaults the value to 0 so it is optional
  country_id: Country["id"]; // Same Type as the Country id
  images: Image[];
  handover_date?: string | null;
  expected_roi_note?: string | null;
  map_url?: string | null;
  map_embed_url?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

// Same type as the Projects but changing the images type from Image[] to FileList or null
export type ProjectsInput = Omit<Project, "images"> & {
  images: FileList | null;
};

export type Functions = {
  UpdateProject: (
    updated_project: Project,
    projectId: Project["id"],
  ) => Promise<Project | null>;
  RemoveProject: (projectId: Project["id"]) => Promise<boolean>;
  UpdateBuilding: (
    updated_building: Building,
    buildingId: Building["id"],
  ) => Promise<Building | null>;
  RemoveBuilding: (buildingId: Building["id"]) => Promise<boolean>;
  UpdateHouse: (
    updated_house: Partial<House>,
    houseId: House["id"],
  ) => Promise<House | null>;
  RemoveHouse: (houseId: House["id"]) => Promise<boolean>;
};

export type ProjectsDashBoardDisplayProps = {
  Countries: Country[];
  Projects: Project[];
  Buildings: Building[];
  Houses: House[];
} & Functions;

export type ImageGalleryProps = {
  images: string[];
};

export type UnitCardProps = {
  house: House;
  isHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
  onBuy: () => void;
  onBookTour: () => void;
};

export type ProjectsData = {
  project_name: string;
  project_description: string;
  project_location: string;
  project_images: FileList | null;
  project_country_id: Country["id"];
  project_handover_date: string;
  project_expected_roi_note: string;
  project_map_url: string;
  project_map_embed_url: string;
};

export type ProjectCardsProps = {
  project: Project;
  Countries: Country[];
  IsBuildingOpen: boolean;
  ToggleBuildingShow: (projectId: Project["id"]) => void;
  UpdateProject: (
    updated_project: Project,
    projectId: Project["id"],
  ) => Promise<boolean>;
  RemoveProject: (projectId: Project["id"]) => Promise<boolean>;
};

export type Recommendation = {
  project: Project;
  building: Building;
  house: House;
};

export type FavoriteProject = Common & {
  user_id: string;
  project_id: Project["id"];
};

export type DisplayMode = "projects" | "buildings" | "houses";

export type ProjectsTableProps = {
  projects: Project[];
  countries: Country[];
  RemoveProject: (id: Project["id"]) => Promise<boolean>;
  EditProject: (
    updated_project: Project,
    projectId: Project["id"],
  ) => Promise<Project | null>;
};

export type ProjectFormValues = { images: FileList | null } & Pick<
  Project,
  | "name"
  | "description"
  | "location"
  | "country_id"
  | "handover_date"
  | "expected_roi_note"
  | "map_url"
>;
