/* oxlint-disable typescript/no-unsafe-type-assertion -- Runtime JSON is narrowed for errors and typed by each API call at this boundary. */
interface ApiErrorBody {
  error?: {
    code?: string;
    message?: string | string[];
    details?: unknown;
  };
  requestId?: string;
}

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api/v1";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(message: string, status: number, code: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  accessToken?: string,
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");

  if (init.body) {
    headers.set("Content-Type", "application/json");
  }
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(
      "The API could not be reached. Check that the backend is running.",
      0,
      "NETWORK_ERROR",
    );
  }

  const body = (await response.json().catch(() => undefined)) as ApiErrorBody | T | undefined;

  if (!response.ok) {
    const errorBody = body as ApiErrorBody | undefined;
    const rawMessage = errorBody?.error?.message;
    const message = Array.isArray(rawMessage)
      ? rawMessage.join(", ")
      : (rawMessage ?? `Request failed with status ${response.status}`);

    throw new ApiError(
      message,
      response.status,
      errorBody?.error?.code ?? "REQUEST_FAILED",
      errorBody?.error?.details,
    );
  }

  return body as T;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}
