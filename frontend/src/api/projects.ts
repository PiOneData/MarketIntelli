import apiClient from "./client";
import type {
  SolarProject,
  Developer,
  Tender,
} from "../types/projects";

export async function listProjects(params?: {
  state?: string;
  status?: string;
  developer_id?: string;
  page?: number;
  page_size?: number;
}): Promise<SolarProject[]> {
  const { data } = await apiClient.get("/projects/", { params });
  return data;
}

export async function getProject(id: string): Promise<SolarProject> {
  const { data } = await apiClient.get(`/projects/${id}`);
  return data;
}

export async function listDevelopers(): Promise<Developer[]> {
  const { data } = await apiClient.get("/projects/developers/");
  return data;
}

export async function listTenders(status?: string): Promise<Tender[]> {
  const { data } = await apiClient.get("/projects/tenders/", {
    params: { status },
  });
  return data;
}
