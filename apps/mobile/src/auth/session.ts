import * as SecureStore from "expo-secure-store";

// Secure credential storage. Login (POST /api/v1/auth/token) returns a single
// revocable API key (`sk-...`) plus its id. We keep both in the keychain: the
// key for `Authorization: Bearer`, the id to revoke on sign-out.

const API_KEY = "sunoflow.apiKey";
const API_KEY_ID = "sunoflow.apiKeyId";

export function getApiKey(): Promise<string | null> {
  return SecureStore.getItemAsync(API_KEY);
}

export function getApiKeyId(): Promise<string | null> {
  return SecureStore.getItemAsync(API_KEY_ID);
}

export async function setSession(key: string, id: string): Promise<void> {
  await SecureStore.setItemAsync(API_KEY, key);
  await SecureStore.setItemAsync(API_KEY_ID, id);
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(API_KEY);
  await SecureStore.deleteItemAsync(API_KEY_ID);
}
