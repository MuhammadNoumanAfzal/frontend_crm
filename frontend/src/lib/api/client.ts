import { clearToken, getToken } from "@/lib/auth/session";
import type { ApiEnvelope } from "@/lib/api/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: HeadersInit;
};

export class ApiClientError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
  }
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}) {
  const headers = new Headers(options.headers);
  const token = getToken();

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let body: BodyInit | undefined;
  if (options.body instanceof FormData) {
    body = options.body;
  } else if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(options.body);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? "GET",
    headers,
    body,
    credentials: "include",
  });

  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;

  if (response.status === 401) {
    // Global auth handling: clear local token + redirect to login.
    if (typeof window !== "undefined") {
      clearToken();
      const redirectTo = encodeURIComponent(`${window.location.pathname}${window.location.search}`);
      window.location.href = `/login?redirect=${redirectTo}`;
    }
    throw new ApiClientError(payload?.message ?? "Unauthorized", response.status);
  }

  if (!response.ok || !payload?.success) {
    throw new ApiClientError(payload?.message ?? "Unexpected API error", payload?.statusCode ?? response.status);
  }

  return payload;
}

export async function apiRequestBlob(path: string, options: RequestOptions = {}) {
  const headers = new Headers(options.headers);
  const token = getToken();

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let body: BodyInit | undefined;
  if (options.body instanceof FormData) {
    body = options.body;
  } else if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(options.body);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? "GET",
    headers,
    body,
    credentials: "include",
  });

  if (response.status === 401) {
    if (typeof window !== "undefined") {
      clearToken();
      const redirectTo = encodeURIComponent(`${window.location.pathname}${window.location.search}`);
      window.location.href = `/login?redirect=${redirectTo}`;
    }
    throw new ApiClientError("Unauthorized", response.status);
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as ApiEnvelope<unknown> | null;
    throw new ApiClientError(payload?.message ?? "Unexpected API error", payload?.statusCode ?? response.status);
  }

  const blob = await response.blob();
  const disposition = response.headers.get("content-disposition") ?? "";
  const filenameMatch = disposition.match(/filename\*?=(?:UTF-8''|\")?([^\";]+)/i);
  const filename = filenameMatch ? decodeURIComponent(filenameMatch[1]) : null;

  return {
    blob,
    filename,
    contentType: response.headers.get("content-type"),
  };
}
