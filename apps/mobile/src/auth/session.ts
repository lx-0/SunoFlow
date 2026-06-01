import * as SecureStore from "expo-secure-store";

// Secure credential storage for the native client. The backend login
// (POST /api/v1/auth/token, M004-S02-T01) returns a single long-lived,
// revocable API key (`sk-...`) — NOT an access/refresh JWT pair. We store that
// one key in the device keychain and send it as `Authorization: Bearer sk-...`.

const API_KEY = "sunoflow.apiKey";

export function getApiKey(): Promise<string | null> {
  return SecureStore.getItemAsync(API_KEY);
}

export async function setApiKey(key: string): Promise<void> {
  await SecureStore.setItemAsync(API_KEY, key);
}

export async function clearApiKey(): Promise<void> {
  await SecureStore.deleteItemAsync(API_KEY);
}
