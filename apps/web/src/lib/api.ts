const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export class ApiError extends Error {
  statusCode: number;
  code: string;
  details?: any;

  constructor(statusCode: number, code: string, message: string, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  body?: any;
  token?: string;
}

export async function apiFetch<T = any>(
  endpoint: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  let token = options.token;
  if (!token && typeof window !== 'undefined') {
    token = localStorage.getItem('chithi_token') || undefined;
  }

  const isJsonBody = options.body && typeof options.body === 'object' && !(options.body instanceof FormData);

  const headers: Record<string, string> = {
    ...(isJsonBody ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string>),
  };

  const body = isJsonBody ? JSON.stringify(options.body) : options.body;

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
    body,
    credentials: 'include',
  });

  const text = await response.text();
  let data: any = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  if (!response.ok) {
    const message = data?.message || response.statusText || 'Request failed';
    const code = data?.code || 'UNKNOWN_ERROR';
    throw new ApiError(response.status, code, message, data?.details);
  }

  return data as T;
}
