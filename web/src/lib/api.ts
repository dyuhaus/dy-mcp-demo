import type {
  ActivityEntry,
  Context,
  ContextType,
  HealthResponse,
  ToolsResponse,
} from "./types";

function getBaseUrl(): string {
  const env = (import.meta.env?.VITE_API_BASE_URL as string | undefined) ?? "";
  if (env) return env;
  if (typeof window !== "undefined") return window.location.origin;
  return "http://localhost:7879";
}

export function getServerUrl(): string {
  return getBaseUrl();
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-agent": "dy-mcp-web",
    ...((init.headers as Record<string, string>) ?? {}),
  };
  const res = await fetch(`${getBaseUrl()}${path}`, { ...init, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}: ${text || path}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export function getHealth(): Promise<HealthResponse> {
  return request<HealthResponse>("/health");
}

export function listContexts(
  params: {
    type?: ContextType;
    tag?: string;
    limit?: number;
    offset?: number;
  } = {},
): Promise<{ items: Context[] }> {
  const q = new URLSearchParams();
  if (params.type) q.set("type", params.type);
  if (params.tag) q.set("tag", params.tag);
  if (params.limit != null) q.set("limit", String(params.limit));
  if (params.offset != null) q.set("offset", String(params.offset));
  const qs = q.toString();
  return request(`/contexts${qs ? `?${qs}` : ""}`);
}

export function getContext(id: number): Promise<Context> {
  return request(`/contexts/${id}`);
}

export interface CreateContextInput {
  type: ContextType;
  title: string;
  content?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  parent_id?: number | null;
}

export function createContext(input: CreateContextInput): Promise<Context> {
  return request("/contexts", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateContext(
  id: number,
  patch: Partial<CreateContextInput>,
): Promise<Context> {
  return request(`/contexts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function deleteContext(id: number): Promise<{ ok: boolean }> {
  return request(`/contexts/${id}`, { method: "DELETE" });
}

export function searchContexts(
  query: string,
  type?: ContextType,
): Promise<{ items: Context[] }> {
  const q = new URLSearchParams({ q: query });
  if (type) q.set("type", type);
  return request(`/search?${q.toString()}`);
}

export function getActivity(limit = 50): Promise<{ items: ActivityEntry[] }> {
  return request(`/activity?limit=${limit}`);
}

export function getExport(): Promise<Record<string, unknown>> {
  return request(`/export`);
}

export function getTools(): Promise<ToolsResponse> {
  return request(`/tools`);
}
