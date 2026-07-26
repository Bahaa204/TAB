import { supabaseClient } from "@/lib/supabaseClient";
import type { Project } from "@/types/projects";
import type { Data } from "@/types/types";

export async function fetchProjects() {
  const { data, error } = (await supabaseClient
    .from("projects")
    .select("*")) as Data<Project[]>;

  if (error) throw error;

  return data;
}

export async function addProject(new_project: Project) {
  const { data, error } = (await supabaseClient
    .from("projects")
    .insert(new_project)
    .select("*")
    .single()) as Data<Project>;

  if (error) throw error;

  return data;
}

export async function updateProject({
  projectId,
  updated_project,
}: {
  updated_project: Partial<Project>;
  projectId: Project["id"];
}) {
  const { data, error } = (await supabaseClient
    .from("projects")
    .update(updated_project)
    .eq("id", projectId)
    .select("*")
    .single()) as Data<Project>;

  if (error) throw error;

  return data;
}

export async function removeProject(projectId: Project["id"]) {
  const { error } = await supabaseClient
    .from("projects")
    .delete()
    .eq("id", projectId);

  if (error) throw error;

  return true;
}
