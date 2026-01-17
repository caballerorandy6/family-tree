import type { ApiResponse } from '@familytree/types/api.types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

interface FetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

export async function api<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<ApiResponse<T>> {
  const { body, headers, ...rest } = options;

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json() as ApiResponse<T>;
  return data;
}

export async function apiWithAuth<T>(
  endpoint: string,
  token: string,
  options: FetchOptions = {}
): Promise<ApiResponse<T>> {
  return api<T>(endpoint, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
}

export async function uploadFile<T>(
  endpoint: string,
  token: string,
  formData: FormData
): Promise<ApiResponse<T>> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const data = await response.json() as ApiResponse<T>;
  return data;
}
