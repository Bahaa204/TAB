import { useEffect, useState } from "react";
import type { Data } from "../types/types";
import type { PostgrestError } from "@supabase/supabase-js";
import { supabaseClient } from "../lib/supabaseClient";
import { GetMinMaxDate } from "../helpers/Date";
import type { DateReturn, DateString } from "../types/date";
import type { House } from "@/types/house";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addHouse,
  fetchHouses,
  removeHouse,
  updateHouse,
} from "@/services/houseservice";

export function useHouses() {
  const [Loading, setLoading] = useState<boolean>(false);
  const [Error, setError] = useState<PostgrestError | null>(null);

  const queryClient = useQueryClient();

  const {
    data: Houses,
    isLoading,
    error: FetchError,
  } = useQuery<House[], PostgrestError>({
    queryKey: ["houses"],
    queryFn: fetchHouses,
  });

  useEffect(() => {
    const channel = supabaseClient.channel("Houses-Channel");

    channel
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "houses" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["houses"] });
        },
      )
      .subscribe((status) => {
        console.log("House Channel:", status);
      });

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, []);

  const AddMutation = useMutation<House, PostgrestError, House>({
    mutationFn: addHouse,
    onMutate: () => setLoading(true),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["houses"] });
      setLoading(false);
    },
    onError: (error) => {
      setError(error);
      setLoading(false);
    },
  });

  const UpdateMutation = useMutation<
    House,
    PostgrestError,
    { houseId: House["id"]; updated_house: Partial<House> }
  >({
    mutationFn: updateHouse,
    onMutate: () => setLoading(true),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["houses"] });
      setLoading(false);
    },
    onError: (error) => {
      setError(error);
      setLoading(false);
    },
  });

  const RemoveMutation = useMutation<boolean, PostgrestError, House["id"]>({
    mutationFn: removeHouse,
    onMutate: () => setLoading(true),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["houses"] });
      setLoading(false);
    },
    onError: (error) => {
      setError(error);
      setLoading(false);
    },
  });

  async function AddHouse(new_house: House) {
    const { data, mutateAsync, isSuccess } = AddMutation;

    await mutateAsync(new_house);

    return isSuccess ? data : null;
  }

  async function UpdateHouse(
    updated_house: Partial<House>,
    houseId: House["id"],
  ) {
    const { data, mutateAsync, isSuccess } = UpdateMutation;

    await mutateAsync({ updated_house, houseId });

    return isSuccess ? data : null;
  }

  async function RemoveHouse(houseId: House["id"]) {
    const { mutateAsync, isSuccess } = RemoveMutation;

    await mutateAsync(houseId);

    return isSuccess;
  }

  /**
   * Retrieves the minimum and maximum dates from the list of houses.
   * @returns An object containing the minimum and maximum dates from the list of houses.
   */
  function getDates(): DateReturn {
    // Extracting the timestamps from the houses and filtering out any null or undefined values
    const timestamps: string[] = Houses!
      .map((house) => house.added_at)
      .filter((timestamp): timestamp is string => Boolean(timestamp));

    const { minInputDate, maxInputDate } = GetMinMaxDate(timestamps);

    return { minInputDate, maxInputDate };
  }

  /**
   * Retrieves houses within a specified date range.
   * @param minDate - The minimum date to filter the houses.
   * @param maxDate - The maximum date to filter the houses.
   * @returns A promise resolving to an array of houses that were added between the specified dates.
   */
  async function getHousesBetweenDates(
    minDate: DateString,
    maxDate: DateString,
  ) {
    // Start of minDate (inclusive)
    const start = new Date(minDate);
    start.setUTCHours(0, 0, 0, 0);

    // Start of next day after maxDate (exclusive)
    const end = new Date(maxDate);
    end.setDate(end.getDate() + 1);
    end.setUTCHours(0, 0, 0, 0);

    const { data, error: FetchError } = (await supabaseClient
      .from("houses")
      .select("*")
      .gte("added_at", start.toISOString())
      .lt("added_at", end.toISOString())) as Data<House[]>;

    if (FetchError) {
      setError(FetchError);
      return [];
    }

    return data;
  }

  return {
    Houses,
    Loading: isLoading || Loading,
    Error: FetchError || Error,
    AddHouse,
    UpdateHouse,
    RemoveHouse,
    getDates,
    getHousesBetweenDates,
  };
}
