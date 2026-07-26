import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Building } from "@/types/building";
import type { Project } from "@/types/projects";
import type { Image } from "@/types/types";
import { useState } from "react";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import { MoreHorizontalIcon } from "lucide-react";
import Modal from "./Modal";
import { DeleteImages, UploadImage } from "@/services/imageServices";

type BuildingsTableProps = {
  buildings: Building[];
  projects: Project[];
  RemoveBuilding: (id: Building["id"]) => Promise<boolean>;
  EditBuilding: (
    updated_building: Building,
    buildingId: Building["id"],
  ) => Promise<Building | null>;
};

type BuildingFormValues = {
  name: string;
  block: string;
  project_id: Project["id"];
  images: FileList | null;
};

export default function BuildingsTable({
  buildings,
  projects,
  RemoveBuilding,
  EditBuilding,
}: BuildingsTableProps) {
  const InitialValue: BuildingFormValues = {
    name: "",
    block: "",
    project_id: NaN,
    images: null,
  };

  const [EditId, setEditId] = useState<Building["id"] | null>(null);
  const [EditValues, setEditValues] =
    useState<BuildingFormValues>(InitialValue);
  const [DeleteBuilding, setDeleteBuilding] = useState<Building | null>(null);
  const [IsOpen, setIsOpen] = useState<boolean>(false);
  const [ErrorNotice, setErrorNotice] = useState<string>("");

  function startEditing(building: Building) {
    setEditId(building.id);
    setEditValues({
      name: building.name,
      block: building.block,
      project_id: building.project_id,
      images: null,
    });
  }

  function cancelEditing() {
    setEditId(null);
    setEditValues(InitialValue);
  }

  function UpdateFields(fields: Partial<BuildingFormValues>) {
    setEditValues((prev) => ({ ...prev, ...fields }));
  }

  async function handleEdit(building: Building) {
    const images = EditValues.images;
    const building_images: Image[] = [];

    if (images) {
      for (const image of images) {
        const imageObj = await UploadImage(image, "buildings_images");
        if (imageObj) building_images.push(imageObj);
      }
    }

    const updatedBuilding: Building = {
      name: EditValues.name,
      block: EditValues.block,
      project_id: EditValues.project_id,
      images:
        building_images.length > 0 ? building_images : (building.images ?? []),
    };

    const ok = await EditBuilding(updatedBuilding, building.id);

    if (ok) cancelEditing();
  }

  async function handleDelete(building: Building) {
    const paths: string[] = [];

    building.images.forEach((image) => paths.push(image.path));

    const ImagesOk = await DeleteImages(paths, "buildings_images");

    if (!ImagesOk)
      return setErrorNotice(
        `Something went wrong while deleting images of ${building.name}.`,
      );

    const ok = await RemoveBuilding(building.id);

    if (ok) return alert("Building has been deleted");
  }

  return (
    <>
      <Table>
        <TableCaption>
          Showing {buildings.length} buildings that belong to TAB projects
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead></TableHead>
            <TableHead className="text-center">Name</TableHead>
            <TableHead className="text-center">Block</TableHead>
            <TableHead className="text-center">Project</TableHead>
            <TableHead className="text-center">Images</TableHead>
            <TableHead className="text-center">Added At</TableHead>
            <TableHead className="text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {buildings.map((building, index) => {
            const isEditing = EditId === building.id;

            return (
              <TableRow
                className="hover:bg-[#24507f] hover:text-white"
                key={building.id}
              >
                <TableCell>{index + 1}</TableCell>
                <TableCell>
                  {isEditing ? (
                    <Input
                      type="text"
                      className="border-slate-300 bg-white text-slate-900"
                      placeholder="Building Name"
                      value={EditValues.name}
                      onChange={(event) => {
                        UpdateFields({ name: event.target.value });
                      }}
                    />
                  ) : (
                    building.name
                  )}
                </TableCell>
                <TableCell>
                  {isEditing ? (
                    <Input
                      type="text"
                      className="border-slate-300 bg-white text-slate-900"
                      placeholder="Building Block"
                      value={EditValues.block}
                      onChange={(event) => {
                        UpdateFields({ block: event.target.value });
                      }}
                    />
                  ) : (
                    building.block? building.block : "N/A"
                  )}
                </TableCell>
                <TableCell>
                  {isEditing ? (
                    <Select
                      value={String(EditValues.project_id ?? "")}
                      onValueChange={(value) => {
                        UpdateFields({ project_id: parseInt(value) });
                      }}
                    >
                      <SelectTrigger className="w-full border-slate-300 bg-white text-slate-900">
                        <SelectValue placeholder="Select a project" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((project) => (
                          <SelectItem
                            value={String(project.id)}
                            key={project.id}
                          >
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    projects.find(
                      (project) => project.id === building.project_id,
                    )?.name
                  )}
                </TableCell>
                <TableCell>
                  {isEditing ? (
                    <Input
                      type="file"
                      multiple
                      accept="image/*"
                      className="cursor-pointer border-slate-300 bg-white text-slate-900 file:text-slate-700"
                      onChange={(event) => {
                        UpdateFields({ images: event.target.files });
                      }}
                    />
                  ) : (
                    building.images.length
                  )}
                </TableCell>
                <TableCell>
                  {building.added_at?.split("T")[0] || "N/A"}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild className="cursor-pointer">
                      <Button variant="secondary">
                        <MoreHorizontalIcon />
                        <span className="sr-only">Open Menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="center"
                      className="focus:bg-none"
                    >
                      {!isEditing && (
                        <>
                          <DropdownMenuItem>
                            <Button
                              variant="secondary"
                              className="cursor-pointer"
                              onClick={() => startEditing(building)}
                            >
                              Edit
                            </Button>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </>
                      )}
                      {isEditing && (
                        <>
                          <DropdownMenuItem>
                            <Button
                              variant="secondary"
                              className="cursor-pointer"
                              onClick={() => handleEdit(building)}
                            >
                              Submit Edits
                            </Button>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </>
                      )}
                      {isEditing && (
                        <DropdownMenuItem>
                          <Button
                            variant="secondary"
                            className="cursor-pointer"
                            onClick={cancelEditing}
                          >
                            Cancel Edits
                          </Button>
                        </DropdownMenuItem>
                      )}
                      {!isEditing && (
                        <DropdownMenuItem variant="destructive">
                          <Button
                            variant="destructive"
                            className="cursor-pointer"
                            onClick={() => {
                              setIsOpen(true);
                              setDeleteBuilding(building);
                            }}
                          >
                            Delete
                          </Button>
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
        <TableFooter className="bg-transparent">
          <TableRow>
            <TableCell colSpan={7} align="center">
              {ErrorNotice}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>

      <Modal
        Open={IsOpen}
        setOpen={setIsOpen}
        handleDelete={async () => await handleDelete(DeleteBuilding!)}
        text={DeleteBuilding?.name || "Building"}
      />
    </>
  );
}
