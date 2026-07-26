import { supabaseClient } from "@/lib/supabaseClient";
import type { Country } from "@/types/country";
import type { Data } from "@/types/types";

export async function fetchCountries() {
  const { data, error } = (await supabaseClient
    .from("countries")
    .select("*")) as Data<Country[]>;

  if (error) throw error;

  return data;
}
