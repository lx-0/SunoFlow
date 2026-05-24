import { apiError, ErrorCode, internalError } from "@/lib/api-error";
import { logServerError } from "@/lib/error-logger";
import { mapSunoApiError, type MapSunoApiErrorOptions } from "@/lib/suno-api-error";
import { resolveUserApiKey, SunoApiError } from "@/lib/sunoapi";

export async function resolveRequiredSunoApiKey(userId: string): Promise<string | Response> {
  const apiKey = await resolveUserApiKey(userId);
  if (!apiKey) {
    return apiError("No Suno API key configured", ErrorCode.VALIDATION_ERROR, 400);
  }
  return apiKey;
}

export async function withRequiredSunoApiKey<T>(
  userId: string,
  run: (apiKey: string) => Promise<T | Response>
): Promise<T | Response> {
  const apiKey = await resolveRequiredSunoApiKey(userId);
  if (apiKey instanceof Response) {
    return apiKey;
  }
  return run(apiKey);
}

export function handleSunoRouteError(
  error: unknown,
  config: {
    logLabel: string;
    route: string;
    mapOptions?: MapSunoApiErrorOptions;
    transformMappedResponse?: (response: Response) => Response;
    fallbackResponse?: Response;
  }
): Response {
  if (error instanceof SunoApiError) {
    const mapped = mapSunoApiError(error, config.mapOptions);
    return config.transformMappedResponse ? config.transformMappedResponse(mapped) : mapped;
  }
  logServerError(config.logLabel, error, { route: config.route });
  return config.fallbackResponse ?? internalError();
}
