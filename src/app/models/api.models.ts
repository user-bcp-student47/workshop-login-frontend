export interface LoginRequest {
  username: string;
  password: string;
  client: string;
}

export interface SessionUser {
  username?: unknown;
  displayName?: unknown;
  [key: string]: unknown;
}

export interface LoginResponse {
  token?: string | null;
  user?: SessionUser | null;
}

export interface UserPreferences {
  theme: unknown;
  showTips: unknown;
  compact: unknown;
  [key: string]: unknown;
}

export interface Task {
  title?: string;
  description?: string;
  status?: string | null;
  priority?: string | null;
  owner?: string | null;
  label?: string;
}

export interface TasksRequest {
  owner: string;
}

export type TasksResponse = Task[];

export interface SessionContext {
  token: string | null;
  user: unknown;
}