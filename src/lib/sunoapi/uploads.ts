import type { FileUploadResult } from "./types";
import { SunoApiError, FILE_UPLOAD_BASE_URL, fetchWithRetry, buildHeaders } from "./http";

/**
 * Upload a file via base64 encoding. Best for files ≤10MB.
 * Files are automatically deleted after 3 days. Uploads are free.
 */
export async function uploadFileBase64(
  base64Data: string,
  apiKey?: string
): Promise<FileUploadResult> {
  const res = await fetchWithRetry(`${FILE_UPLOAD_BASE_URL}/api/file-base64-upload`, {
    method: "POST",
    headers: buildHeaders(apiKey),
    body: JSON.stringify({ file: base64Data }),
  });

  const json = (await res.json()) as { success?: boolean; code?: number; data?: FileUploadResult };
  if (!json.data?.fileUrl) {
    throw new SunoApiError(500, "No file data returned from base64 upload");
  }
  return json.data;
}

/**
 * Upload a file via URL. The server downloads from the provided URL.
 * Best for remote files. 30-second download timeout, ≤100MB recommended.
 */
export async function uploadFileFromUrl(
  url: string,
  apiKey?: string
): Promise<FileUploadResult> {
  const res = await fetchWithRetry(`${FILE_UPLOAD_BASE_URL}/api/file-url-upload`, {
    method: "POST",
    headers: buildHeaders(apiKey),
    body: JSON.stringify({ url }),
  });

  const json = (await res.json()) as { success?: boolean; code?: number; data?: FileUploadResult };
  if (!json.data?.fileUrl) {
    throw new SunoApiError(500, "No file data returned from URL upload");
  }
  return json.data;
}
