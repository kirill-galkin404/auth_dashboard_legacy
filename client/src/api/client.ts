import type {
  DashboardData,
  LoginSuccessResponse,
  LogoutResponse,
  MeResponse,
} from './types';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // no JSON body (e.g. empty response) — leave body as null
  }

  if (!res.ok) {
    const message =
      body && typeof body === 'object' && 'error' in body && typeof (body as { error?: unknown }).error === 'string'
        ? (body as { error: string }).error
        : `Request failed with status ${res.status}`;
    throw new ApiError(res.status, message);
  }

  return body as T;
}

export function postLogin(username: string, password: string): Promise<LoginSuccessResponse> {
  return request<LoginSuccessResponse>('/api/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export function postLogout(): Promise<LogoutResponse> {
  return request<LogoutResponse>('/api/logout', {
    method: 'POST',
  });
}

export function getMe(): Promise<MeResponse> {
  return request<MeResponse>('/api/me', {
    method: 'GET',
  });
}

export function getDashboard(): Promise<DashboardData> {
  return request<DashboardData>('/api/dashboard', {
    method: 'GET',
  });
}
