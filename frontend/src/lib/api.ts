// The only module that knows the backend exists.
import type {
  AnalysisRequestBody,
  AnalysisResult,
  ApiErrorCode,
  Category,
  CategoryDetail,
} from './types';
import { clearToken, getToken, setToken } from './session';

const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

/** Errors carry a machine code; the UI looks up wording in its message files. */
export class ApiError extends Error {
  code: ApiErrorCode;
  retryAfterSeconds?: number;

  constructor(code: ApiErrorCode, retryAfterSeconds?: number) {
    super(code);
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

async function toApiError(response: Response): Promise<ApiError> {
  try {
    const body = await response.json();
    const error = body?.error ?? {};
    return new ApiError(
      (error.code as ApiErrorCode) ?? 'INTERNAL_ERROR',
      error.retry_after_seconds
    );
  } catch {
    return new ApiError('INTERNAL_ERROR');
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/api/v1${path}`, init);
  } catch {
    throw new ApiError('NETWORK');
  }
  if (!response.ok) {
    throw await toApiError(response);
  }
  return response.json() as Promise<T>;
}

export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${BASE_URL}/api/v1/health`, {
      cache: 'no-store',
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function ensureSession(locale: string): Promise<string> {
  const existing = getToken();
  if (existing) return existing;

  const body = await request<{ token: string }>('/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ language: locale }),
  });
  setToken(body.token);
  return body.token;
}

export function fetchCategories(locale: string): Promise<{ categories: Category[] }> {
  return request(`/content/categories?lang=${locale}`);
}

export function fetchCategory(
  key: string,
  locale: string
): Promise<CategoryDetail> {
  return request(`/content/categories/${key}?lang=${locale}`);
}

export async function createAnalysis(
  locale: string,
  payload: AnalysisRequestBody,
  image: File | null
): Promise<AnalysisResult> {
  const token = await ensureSession(locale);
  const form = new FormData();
  form.append('payload', JSON.stringify(payload));
  if (image) form.append('image', image);

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/api/v1/analyses`, {
      method: 'POST',
      headers: { 'X-Session-Token': token },
      body: form,
    });
  } catch {
    throw new ApiError('NETWORK');
  }

  if (response.status === 401) {
    // The session expired mid-flow; drop it so the next attempt starts fresh.
    clearToken();
    throw new ApiError('SESSION_INVALID');
  }
  if (!response.ok) {
    throw await toApiError(response);
  }

  const result = (await response.json()) as AnalysisResult;
  result.degradedReason = response.headers.get('X-RESQ-Degraded');
  return result;
}

export async function fetchAnalysis(id: string): Promise<AnalysisResult> {
  const token = getToken();
  if (!token) throw new ApiError('SESSION_INVALID');

  return request<AnalysisResult>(`/analyses/${id}`, {
    headers: { 'X-Session-Token': token },
  });
}
