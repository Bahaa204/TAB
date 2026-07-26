import { supabaseClient } from "@/lib/supabaseClient";
import type { Building } from "@/types/building";
import type { Data } from "@/types/types";

export async function fetchBuildings() {
  const { data, error } = (await supabaseClient
    .from("buildings")
    .select("*")) as Data<Building[]>;

  if (error) throw error;

  return data;
}

export async function addBuilding(new_building: Building) {
  const { data, error } = (await supabaseClient
    .from("buildings")
    .insert(new_building)
    .select("*")
    .single()) as Data<Building>;

  if (error) throw error;

  return data;
}

export async function updateBuilding({
  buildingId,
  updated_building,
}: {
  updated_building: Partial<Building>;
  buildingId: Building["id"];
}) {
  const { data, error } = (await supabaseClient
    .from("buildings")
    .update(updated_building)
    .eq("id", buildingId)
    .select("*")
    .single()) as Data<Building>;

  if (error) throw error;

  return data;
}

export async function removeBuilding(buildingId: Building["id"]) {
  const { error } = await supabaseClient
    .from("buildings")
    .delete()
    .eq("id", buildingId);

  if (error) throw error;

  return true;
}
