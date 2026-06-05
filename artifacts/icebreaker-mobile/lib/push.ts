// Push notifications (Expo).
//
// Flow: request permission -> get the Expo push token -> register it with the
// backend (POST /api/me/push-token). On logout we unregister (DELETE). The
// backend sends a push to a recipient who isn't currently connected when they
// get a new chat message; tapping it deep-links into that chat.
//
// All functions are best-effort and never throw — a push problem must never
// block login/logout or crash the app.

import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { post, del } from "@/lib/api";

// Show notifications while the app is foregrounded too.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let cachedToken: string | null = null;

function resolveProjectId(): string | undefined {
  return (
    (Constants.expoConfig as any)?.extra?.eas?.projectId ||
    (Constants as any)?.easConfig?.projectId ||
    undefined
  );
}

async function fetchExpoPushToken(): Promise<string | null> {
  try {
    const projectId = resolveProjectId();
    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    return tokenData.data || null;
  } catch (e) {
    // Most commonly: no EAS projectId configured. The wiring is correct; the
    // team just needs to set extra.eas.projectId for real delivery.
    console.warn("[push] could not get Expo push token:", e);
    return null;
  }
}

/**
 * Ask for permission (if needed), get the Expo push token, and register it with
 * the backend. Returns the token or null. Safe to call repeatedly — the backend
 * upserts on the token.
 */
export async function registerPushToken(): Promise<string | null> {
  try {
    // Push only works on physical devices.
    if (!Device.isDevice) return null;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Default",
        importance: Notifications.AndroidImportance.DEFAULT,
        lightColor: "#FF1B8D",
      });
    }

    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== "granted") {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
    }
    if (status !== "granted") return null;

    const token = await fetchExpoPushToken();
    if (!token) return null;

    cachedToken = token;
    await post("/api/me/push-token", { token, platform: Platform.OS });
    return token;
  } catch (e) {
    console.warn("[push] registerPushToken failed:", e);
    return null;
  }
}

/**
 * Remove this device's push token from the backend (on logout). Falls back to
 * deleting all of the user's tokens if we don't have the specific one cached.
 * Must be called BEFORE the auth token is cleared.
 */
export async function unregisterPushToken(): Promise<void> {
  try {
    const token = cachedToken ?? (await fetchExpoPushToken());
    await del("/api/me/push-token", token ? { token } : undefined);
    cachedToken = null;
  } catch (e) {
    console.warn("[push] unregisterPushToken failed:", e);
  }
}

/**
 * Given a notification's data payload, return the in-app route to navigate to,
 * or null if it isn't deep-linkable. Backend message pushes carry
 * { type: "message", matchId }.
 */
export function routeForNotificationData(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  if (d.type === "message" && (typeof d.matchId === "number" || typeof d.matchId === "string")) {
    return `/chat/${d.matchId}`;
  }
  return null;
}
