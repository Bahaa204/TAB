import { useEffect, useState } from "react";
import type { PostgrestError } from "@supabase/supabase-js";
import { supabaseClient } from "../lib/supabaseClient";
import type { Project } from "@/types/projects";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addProject,
  fetchProjects,
  removeProject,
  updateProject,
} from "@/services/projectservice";

export function useProjects() {
  const [Loading, setLoading] = useState<boolean>(false);
  const [Error, setError] = useState<PostgrestError | null>(null);

  const queryClient = useQueryClient();

  const {
    data: Projects,
    isLoading,
    error: FetchError,
  } = useQuery<Project[], PostgrestError>({
    queryKey: ["projects"],
    queryFn: fetchProjects,
  });

  useEffect(() => {
    const channel = supabaseClient.channel("Projects-Channel");

    channel
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "projects" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["projects"] });
        },
      )
      .subscribe((status) => {
        console.log("Projects Channel:", status);
      });

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, []);

  const AddMutation = useMutation<Project, PostgrestError, Project>({
    mutationFn: addProject,
    onMutate: () => setLoading(true),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setLoading(false);
    },
    onError: (error) => {
      setError(error);
      setLoading(false);
    },
  });

  const UpdateMutation = useMutation<
    Project,
    PostgrestError,
    { projectId: Project["id"]; updated_project: Partial<Project> }
  >({
    mutationFn: updateProject,
    onMutate: () => setLoading(true),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setLoading(false);
    },
    onError: (error) => {
      setError(error);
      setLoading(false);
    },
  });

  const DeleteMutation = useMutation<boolean, PostgrestError, Project["id"]>({
    mutationFn: removeProject,
    onMutate: () => setLoading(true),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setLoading(false);
    },
    onError: (error) => {
      setError(error);
      setLoading(false);
    },
  });

  async function AddProject(new_project: Project) {
    const { data, mutateAsync, isSuccess } = AddMutation;

    await mutateAsync(new_project);

    return isSuccess ? data : null;
  }

  async function UpdateProject(
    updated_project: Partial<Project>,
    projectId: Project["id"],
  ) {
    const { data, mutateAsync, isSuccess } = UpdateMutation;

    await mutateAsync({ updated_project, projectId });

    return isSuccess ? data : null;
  }

  async function RemoveProject(projectId: Project["id"]) {
    const { mutateAsync, isSuccess } = DeleteMutation;

    await mutateAsync(projectId);

    return isSuccess;
  }

  return {
    Projects,
    Loading: isLoading || Loading,
    Error: FetchError || Error,
    AddProject,
    UpdateProject,
    RemoveProject,
  };
}
