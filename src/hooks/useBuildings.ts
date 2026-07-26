import { useEffect, useState } from "react";
import type { PostgrestError } from "@supabase/supabase-js";
import { supabaseClient } from "../lib/supabaseClient";
import type { Building } from "@/types/building";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addBuilding,
  fetchBuildings,
  removeBuilding,
  updateBuilding,
} from "@/services/buildingservice";

export function useBuildings() {
  const [Loading, setLoading] = useState<boolean>(false);
  const [Error, setError] = useState<PostgrestError | null>(null);

  const queryClient = useQueryClient();

  const {
    data: Buildings,
    isLoading,
    error: FetchError,
  } = useQuery<Building[], PostgrestError>({
    queryKey: ["buildings"],
    queryFn: fetchBuildings,
  });

  useEffect(() => {
    const channel = supabaseClient.channel("Buildings-Channel");

    channel
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "buildings" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["buildings"] });
        },
      )
      .subscribe((status) => {
        console.log("Buildings Channel:", status);
      });

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, []);

  const AddMutation = useMutation<Building, PostgrestError, Building>({
    mutationFn: addBuilding,
    onMutate: () => setLoading(true),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["buildings"] });
      setLoading(false);
    },
    onError: (error) => {
      setError(error);
      setLoading(false);
    },
  });

  const UpdateMutation = useMutation<
    Building,
    PostgrestError,
    { buildingId: Building["id"]; updated_building: Partial<Building> }
  >({
    mutationFn: updateBuilding,
    onMutate: () => setLoading(true),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["buildings"] });
      setLoading(false);
    },
    onError: (error) => {
      setError(error);
      setLoading(false);
    },
  });

  const RemoveMutation = useMutation<boolean, PostgrestError, Building["id"]>({
    mutationFn: removeBuilding,
    onMutate: () => setLoading(true),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["buildings"] });
      setLoading(false);
    },
    onError: (error) => {
      setError(error);
      setLoading(false);
    },
  });

  async function AddBuilding(new_building: Building) {
    const { data, mutateAsync, isSuccess } = AddMutation;

    await mutateAsync(new_building);

    return isSuccess ? data : null;
  }

  async function UpdateBuilding(
    updated_building: Building,
    buildingId: Building["id"],
  ) {
    const { data, mutateAsync, isSuccess } = UpdateMutation;

    await mutateAsync({ updated_building, buildingId });

    return isSuccess ? data : null;
  }

  async function RemoveBuilding(buildingId: Building["id"]) {
    const { mutateAsync, isSuccess } = RemoveMutation;

    await mutateAsync(buildingId);

    return isSuccess;
  }

  return {
    Buildings,
    Loading: isLoading || Loading,
    Error: FetchError || Error,
    AddBuilding,
    UpdateBuilding,
    RemoveBuilding,
  };
}
