import { logger } from "./logger";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/**
 * Send an Expo push notification to one or more device tokens.
 *
 * Best-effort: logs and swallows all failures so a push problem never breaks the
 * request that triggered it. Targets Expo's hosted push service, which works for
 * Expo-managed apps without bundling native FCM/APNs credentials. Returns the
 * count of messages handed to Expo (not delivery-confirmed).
 *
 * For high volume you'd batch (Expo caps at 100/request) and process receipts;
 * this is the minimal correct version to build on.
 */
export async function sendExpoPush(tokens: string[], message: PushMessage): Promise<number> {
  const valid = tokens.filter(
    (t) => typeof t === "string" && (t.startsWith("ExponentPushToken") || t.startsWith("ExpoPushToken")),
  );
  if (valid.length === 0) return 0;

  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(
        valid.map((to) => ({
          to,
          sound: "default",
          title: message.title,
          body: message.body,
          data: message.data ?? {},
        })),
      ),
    });
    if (!res.ok) {
      logger.warn({ status: res.status }, "[push] Expo push request failed");
      return 0;
    }
    return valid.length;
  } catch (e) {
    logger.warn({ err: e }, "[push] Expo push send threw");
    return 0;
  }
}
