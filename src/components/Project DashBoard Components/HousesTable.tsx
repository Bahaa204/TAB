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
import type { House } from "@/types/house";
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

type HousesTableProps = {
  houses: House[];
  buildings: Building[];
  RemoveHouse: (id: House["id"]) => Promise<boolean>;
  EditHouse: (
    updated_house: Partial<House>,
    houseId: House["id"],
  ) => Promise<House | null>;
};

type HouseFormValues = Pick<
  House,
  | "floor"
  | "nb_bedrooms"
  | "nb_bathrooms"
  | "building_id"
  | "price"
  | "area"
  | "is_sold"
>;

export default function HousesTable({
  houses,
  buildings,
  RemoveHouse,
  EditHouse,
}: HousesTableProps) {
  const InitialValue: HouseFormValues = {
    floor: NaN,
    nb_bedrooms: NaN,
    nb_bathrooms: NaN,
    building_id: NaN,
    price: NaN,
    area: null,
    is_sold: false,
  };

  const [EditId, setEditId] = useState<House["id"] | null>(null);
  const [EditValues, setEditValues] = useState<HouseFormValues>(InitialValue);
  const [DeleteHouse, setDeleteHouse] = useState<House | null>(null);
  const [IsOpen, setIsOpen] = useState<boolean>(false);
  const [ErrorNotice, setErrorNotice] = useState<string>("");

  function startEditing(house: House) {
    setEditId(house.id);
    setEditValues({
      floor: house.floor,
      nb_bedrooms: house.nb_bedrooms,
      nb_bathrooms: house.nb_bathrooms,
      building_id: house.building_id,
      price: house.price,
      area: house.area ?? null,
      is_sold: house.is_sold ?? false,
    });
  }

  function cancelEditing() {
    setEditId(null);
    setEditValues(InitialValue);
  }

  function UpdateFields(fields: Partial<HouseFormValues>) {
    setEditValues((prev) => ({ ...prev, ...fields }));
  }

  async function handleEdit(house: House) {
    const updatedHouse: Partial<House> = {
      floor: EditValues.floor,
      nb_bedrooms: EditValues.nb_bedrooms,
      nb_bathrooms: EditValues.nb_bathrooms,
      building_id: EditValues.building_id,
      price: EditValues.price,
      area:
        typeof EditValues.area === "number" && !Number.isNaN(EditValues.area)
          ? EditValues.area
          : null,
      is_sold: EditValues.is_sold,
    };

    const ok = await EditHouse(updatedHouse, house.id);

    if (ok) cancelEditing();
  }

  async function handleDelete(house: House) {
    const ok = await RemoveHouse(house.id);

    if (!ok)
      return setErrorNotice(
        `Something went wrong while deleting house on floor ${house.floor}.`,
      );

    return alert("House has been deleted");
  }

  return (
    <>
      <Table>
        <TableCaption>
          Showing {houses.length} houses across all TAB buildings
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead></TableHead>
            <TableHead className="text-center">Floor</TableHead>
            <TableHead className="text-center">Price</TableHead>
            <TableHead className="text-center">Bedrooms</TableHead>
            <TableHead className="text-center">Bathrooms</TableHead>
            <TableHead className="text-center">Area (m²)</TableHead>
            <TableHead className="text-center">Is Sold</TableHead>
            <TableHead className="text-center">Building</TableHead>
            <TableHead className="text-center">Added At</TableHead>
            <TableHead className="text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {houses.map((house, index) => {
            const isEditing = EditId === house.id;

            return (
              <TableRow
                className="hover:bg-[#24507f] hover:text-white"
                key={house.id}
              >
                <TableCell>{index + 1}</TableCell>
                <TableCell>
                  {isEditing ? (
                    <Input
                      type="number"
                      className="border-slate-300 bg-white text-slate-900"
                      value={
                        Number.isNaN(EditValues.floor) ? "" : EditValues.floor
                      }
                      onChange={(event) => {
                        UpdateFields({
                          floor: parseInt(event.target.value.trim()),
                        });
                      }}
                    />
                  ) : (
                    house.floor
                  )}
                </TableCell>
                <TableCell>
                  {isEditing ? (
                    <Input
                      type="number"
                      className="border-slate-300 bg-white text-slate-900"
                      value={
                        Number.isNaN(EditValues.price) ? "" : EditValues.price
                      }
                      onChange={(event) => {
                        UpdateFields({
                          price: parseInt(event.target.value.trim()),
                        });
                      }}
                    />
                  ) : (
                    `$ ${house.price.toLocaleString()}`
                  )}
                </TableCell>
                <TableCell>
                  {isEditing ? (
                    <Input
                      type="number"
                      className="border-slate-300 bg-white text-slate-900"
                      value={
                        Number.isNaN(EditValues.nb_bedrooms)
                          ? ""
                          : EditValues.nb_bedrooms
                      }
                      onChange={(event) => {
                        UpdateFields({
                          nb_bedrooms: parseInt(event.target.value.trim()),
                        });
                      }}
                    />
                  ) : (
                    house.nb_bedrooms
                  )}
                </TableCell>
                <TableCell>
                  {isEditing ? (
                    <Input
                      type="number"
                      className="border-slate-300 bg-white text-slate-900"
                      value={
                        Number.isNaN(EditValues.nb_bathrooms)
                          ? ""
                          : EditValues.nb_bathrooms
                      }
                      onChange={(event) => {
                        UpdateFields({
                          nb_bathrooms: parseInt(event.target.value.trim()),
                        });
                      }}
                    />
                  ) : (
                    house.nb_bathrooms
                  )}
                </TableCell>
                <TableCell>
                  {isEditing ? (
                    <Input
                      type="number"
                      className="border-slate-300 bg-white text-slate-900"
                      value={
                        typeof EditValues.area === "number" &&
                        !Number.isNaN(EditValues.area)
                          ? EditValues.area
                          : ""
                      }
                      onChange={(event) => {
                        const value = event.target.value.trim();
                        UpdateFields({
                          area: value === "" ? null : parseFloat(value),
                        });
                      }}
                    />
                  ) : (
                    (house.area ?? "N/A")
                  )}
                </TableCell>
                <TableCell>
                  {isEditing ? (
                    <Select
                      value={EditValues.is_sold ? "yes" : "no"}
                      onValueChange={(value) => {
                        UpdateFields({ is_sold: value === "yes" });
                      }}
                    >
                      <SelectTrigger className="w-full border-slate-300 bg-white text-slate-900">
                        <SelectValue placeholder="Sold status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no">No</SelectItem>
                        <SelectItem value="yes">Yes</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : house.is_sold ? (
                    "Yes"
                  ) : (
                    "No"
                  )}
                </TableCell>
                <TableCell>
                  {isEditing ? (
                    <Select
                      value={String(EditValues.building_id ?? "")}
                      onValueChange={(value) => {
                        UpdateFields({ building_id: parseInt(value) });
                      }}
                    >
                      <SelectTrigger className="w-full border-slate-300 bg-white text-slate-900">
                        <SelectValue placeholder="Select a building" />
                      </SelectTrigger>
                      <SelectContent>
                        {buildings.map((building) => (
                          <SelectItem
                            value={String(building.id)}
                            key={building.id}
                          >
                            {building.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    buildings.find(
                      (building) => building.id === house.building_id,
                    )?.name
                  )}
                </TableCell>
                <TableCell>{house.added_at?.split("T")[0] || "N/A"}</TableCell>
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
                              onClick={() => startEditing(house)}
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
                              onClick={() => handleEdit(house)}
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
                              setDeleteHouse(house);
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
            <TableCell colSpan={10} align="center">
              {ErrorNotice}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>

      <Modal
        Open={IsOpen}
        setOpen={setIsOpen}
        handleDelete={async () => await handleDelete(DeleteHouse!)}
        text="this house"
      />
    </>
  );
}
