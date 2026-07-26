import { supabaseClient } from "@/lib/supabaseClient";
import type { House } from "@/types/house";
import type { Data } from "@/types/types";

export async function fetchHouses() {
  const { data, error } = (await supabaseClient
    .from("houses")
    .select("*")) as Data<House[]>;

  if (error) throw error;

  return data;
}

export async function addHouse(new_house: House) {
  const { data, error } = (await supabaseClient
    .from("houses")
    .insert(new_house)
    .select("*")
    .single()) as Data<House>;

  if (error) throw error;

  return data;
}

export async function updateHouse({
  houseId,
  updated_house,
}: {
  updated_house: Partial<House>;
  houseId: House["id"];
}) {
  const { data, error } = (await supabaseClient
    .from("houses")
    .update(updated_house)
    .eq("id", houseId)
    .select("*")
    .single()) as Data<House>;

  if (error) throw error;

  return data;
}

export async function removeHouse(houseId: House["id"]) {
  const { error } = await supabaseClient
    .from("houses")
    .delete()
    .eq("id", houseId);

  if (error) throw error;

  return true;
}
