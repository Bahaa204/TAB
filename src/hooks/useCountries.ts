import type { PostgrestError } from "@supabase/supabase-js";
import type { Country } from "@/types/country";
import { useQuery } from "@tanstack/react-query";
import { fetchCountries } from "@/services/countryservice";

export function useCountries() {
  const {
    data: Countries,
    isLoading: Loading,
    error: Error,
  } = useQuery<Country[], PostgrestError>({
    queryKey: ["countries"],
    queryFn: fetchCountries,
  });

  return { Countries, Loading, Error };
}
