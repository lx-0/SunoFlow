import * as SecureStore from "expo-secure-store";

// Secure token storage for the native client (bearer-auth, M004-S02 backend).
// Keychain-backed via expo-secure-store. No tokens in AsyncStorage / plaintext.

const ACCESS = "sunoflow.accessToken";
const REFRESH = "sunoflow.refreshToken";

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ACCESS);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH);
}

export async function setTokens(access: string, refresh: string): Promise<void> {
  await SecureStore.setItemAsync(ACCESS, access);
  await SecureStore.setItemAsync(REFRESH, refresh);
}

export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCESS);
  await SecureStore.deleteItemAsync(REFRESH);
}
