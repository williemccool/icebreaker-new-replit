// Auth token storage.
//
// On native (iOS/Android) the JWT lives in the OS keychain/keystore via
// expo-secure-store. On web (Expo web build) SecureStore isn't available, so we
// fall back to AsyncStorage. Existing tokens previously written to AsyncStorage
// are transparently migrated into SecureStore on first read.

import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

const KEY = "token";
const isNative = Platform.OS === "ios" || Platform.OS === "android";

export async function getToken(): Promise<string | null> {
  if (isNative) {
    try {
      const secure = await SecureStore.getItemAsync(KEY);
      if (secure) return secure;
      // One-time migration from the legacy AsyncStorage location.
      const legacy = await AsyncStorage.getItem(KEY);
      if (legacy) {
        await SecureStore.setItemAsync(KEY, legacy);
        await AsyncStorage.removeItem(KEY);
        return legacy;
      }
      return null;
    } catch {
      return AsyncStorage.getItem(KEY);
    }
  }
  return AsyncStorage.getItem(KEY);
}

export async function setToken(token: string): Promise<void> {
  if (isNative) {
    try {
      await SecureStore.setItemAsync(KEY, token);
      return;
    } catch {
      // fall through to AsyncStorage if SecureStore is unavailable
    }
  }
  await AsyncStorage.setItem(KEY, token);
}

export async function clearToken(): Promise<void> {
  if (isNative) {
    try {
      await SecureStore.deleteItemAsync(KEY);
    } catch {
      // ignore
    }
  }
  await AsyncStorage.removeItem(KEY);
}
