import { clientFetchErrorMessage, fetchWithTimeout } from "@/lib/fetch-client";

export interface QueueItem {
  id: string;
  prompt: string;
  title: string | null;
  tags: string | null;
  makeInstrumental: boolean;
  personaId: string | null;
  status: "pending" | "processing" | "done" | "failed" | "cancelled";
  position: number;
  songId: string | null;
  errorMessage: string | null;
}

export interface QueueListResponse {
  items: QueueItem[];
}

export interface QueueAddResponse {
  item: QueueItem;
}

export interface QueueProcessResponse {
  item?: QueueItem;
  song?: {
    id: string;
    title: string | null;
  };
  error?: string;
}

const GENERATION_QUEUE_BASE = "/api/generation-queue";

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T | { error?: string };
  if (!response.ok) {
    const fallbackMessage =
      response.statusText || "Request failed. Please try again.";
    const message = typeof data === "object" && data && "error" in data
      ? String((data as { error?: string }).error ?? fallbackMessage)
      : fallbackMessage;
    throw new Error(message);
  }
  return data as T;
}

async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  try {
    const response = await fetchWithTimeout(input, init);
    return parseJsonResponse<T>(response);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message) return Promise.reject(error);
    }
    throw new Error(clientFetchErrorMessage(error));
  }
}

export async function fetchQueueItems(): Promise<QueueListResponse> {
  return requestJson<QueueListResponse>(GENERATION_QUEUE_BASE);
}

export async function addQueueItem(
  params: {
    prompt: string;
    title?: string;
    tags?: string;
    makeInstrumental?: boolean;
    personaId?: string;
  },
): Promise<QueueAddResponse> {
  return requestJson<QueueAddResponse>(GENERATION_QUEUE_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
}

export async function removeQueueItem(id: string): Promise<void> {
  await requestJson<unknown>(`${GENERATION_QUEUE_BASE}/${id}`, {
    method: "DELETE",
  });
}

export async function reorderQueueItems(orderedIds: string[]): Promise<void> {
  await requestJson<unknown>(`${GENERATION_QUEUE_BASE}/reorder`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderedIds }),
  });
}

export async function processNextQueueItem(): Promise<QueueProcessResponse> {
  return requestJson<QueueProcessResponse>(`${GENERATION_QUEUE_BASE}/process-next`, {
    method: "POST",
  });
}
