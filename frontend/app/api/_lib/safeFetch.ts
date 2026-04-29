const BACKEND_UNAVAILABLE_STATUS = 502;
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_RETRIES = 1;
const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

type SafeFetchInit = RequestInit & {
  retries?: number;
  timeoutMs?: number;
};

const getMethod = (init?: RequestInit) => (init?.method ?? "GET").toUpperCase();

const shouldRetry = (response: Response, attempt: number, retries: number, method: string) =>
  method === "GET" && attempt < retries && RETRYABLE_STATUS_CODES.has(response.status);

const isAbortError = (error: unknown) => error instanceof DOMException && error.name === "AbortError";

async function fetchWithTimeout(input: RequestInfo | URL, init: SafeFetchInit): Promise<Response> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, signal } = init;
  const fetchInit: RequestInit = { ...init };
  delete (fetchInit as SafeFetchInit).retries;
  delete (fetchInit as SafeFetchInit).timeoutMs;
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), timeoutMs);

  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener("abort", () => controller.abort(), { once: true });
    }
  }

  try {
    return await fetch(input, { ...fetchInit, signal: controller.signal });
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}

export async function safeFetch(input: RequestInfo | URL, init: SafeFetchInit = {}): Promise<Response> {
  const retries = init.retries ?? DEFAULT_RETRIES;
  const method = getMethod(init);
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetchWithTimeout(input, init);
      if (!shouldRetry(response, attempt, retries, method)) {
        return response;
      }
    } catch (error: unknown) {
      if (isAbortError(error)) {
        return Response.json({ detail: "Backend request timed out" }, { status: BACKEND_UNAVAILABLE_STATUS });
      }
      lastError = error;
      if (method !== "GET" || attempt >= retries) {
        break;
      }
    }
  }

  const detail = lastError instanceof Error ? lastError.message : "Backend service unavailable";
  return Response.json({ detail }, { status: BACKEND_UNAVAILABLE_STATUS });
}
