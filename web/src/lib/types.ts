export const CONTEXT_TYPES = [
  "project",
  "idea",
  "preference",
  "writing_style",
  "skill",
  "general",
] as const;

export type ContextType = (typeof CONTEXT_TYPES)[number];

export interface Context {
  id: number;
  type: ContextType;
  title: string;
  content: string;
  tags: string[];
  metadata: Record<string, unknown>;
  parent_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface HealthResponse {
  ok: boolean;
  demo?: boolean;
  resets_every_minutes?: number;
  counts: Record<ContextType, number>;
}

export interface ActivityEntry {
  t: string;
  agent: string;
  action: "read" | "write";
  key: string;
}

export interface WritingStyleMeta {
  example?: string;
  used?: number;
}

export interface ProjectMeta {
  status?: "in_progress" | "done";
  progress?: number;
  updated?: string;
}

export interface PreferenceMeta {
  cat?: "env" | "voice" | "work" | "misc";
  value?: string;
}

export interface ToolParam {
  name: string;
  type: string;
  required: boolean;
  description?: string;
}

export interface ToolInfo {
  name: string;
  title: string;
  description: string;
  parameters: ToolParam[];
}

export interface ResourceInfo {
  name: string;
  uri: string;
  description: string;
}

export interface ToolsResponse {
  tools: ToolInfo[];
  resources: ResourceInfo[];
}
