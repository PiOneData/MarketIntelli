import { useQuery } from "@tanstack/react-query";
import {
  listProjects,
  getProject,
  listDevelopers,
  listTenders,
} from "../api/projects";

export function useProjects(params?: {
  state?: string;
  status?: string;
  developer_id?: string;
  page?: number;
  page_size?: number;
}) {
  return useQuery({
    queryKey: ["projects", params],
    queryFn: () => listProjects(params),
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ["projects", id],
    queryFn: () => getProject(id),
    enabled: !!id,
  });
}

export function useDevelopers() {
  return useQuery({
    queryKey: ["developers"],
    queryFn: listDevelopers,
  });
}

export function useTenders(status?: string) {
  return useQuery({
    queryKey: ["tenders", status],
    queryFn: () => listTenders(status),
  });
}
