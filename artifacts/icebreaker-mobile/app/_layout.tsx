import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/plus-jakarta-sans";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { setBaseUrl } from "@workspace/api-client-react";
import { ClerkProvider } from "@clerk/clerk-expo";
import { API_BASE_URL, CLERK_PUBLISHABLE_KEY } from "@/lib/config";

import * as Notifications from "expo-notifications";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider, useAuthContext } from "@/context/AuthContext";
import { routeForNotificationData } from "@/lib/push";

SplashScreen.preventAutoHideAsync();

const CLERK_KEY = CLERK_PUBLISHABLE_KEY;

const queryClient = new QueryClient();

if (API_BASE_URL) {
  setBaseUrl(API_BASE_URL);
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthContext();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated && pathname !== "/auth") {
      router.replace("/auth");
    }
  }, [isLoading, isAuthenticated, pathname]);

  // Deep-link when a push notification is tapped (e.g. a new chat message).
  // Handles both taps while running and a cold start launched from a tap.
  useEffect(() => {
    if (!isAuthenticated) return;

    const navigateFrom = (data: unknown) => {
      const route = routeForNotificationData(data);
      if (route) router.push(route as any);
    };

    let handled = false;
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!handled && response) {
        handled = true;
        navigateFrom(response.notification.request.content.data);
      }
    });

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      navigateFrom(response.notification.request.content.data);
    });
    return () => sub.remove();
  }, [isAuthenticated]);

  return <>{children}</>;
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back", headerShown: false }}>
      <Stack.Screen name="auth" />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="venues/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="rooms" options={{ headerShown: false }} />
      <Stack.Screen name="rooms/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ headerShown: false }} />
      <Stack.Screen name="rewards" options={{ headerShown: false }} />
      <Stack.Screen name="shop" options={{ headerShown: false }} />
      <Stack.Screen name="payment" options={{ headerShown: false }} />
      <Stack.Screen name="leaderboard" options={{ headerShown: false }} />
      <Stack.Screen name="game/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="events" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="safety" options={{ headerShown: false }} />
      <Stack.Screen name="gift/[userId]" options={{ headerShown: false }} />
      <Stack.Screen name="dates/plan/[matchId]" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  const app = (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <AuthGate>
              <GestureHandlerRootView>
                <KeyboardProvider>
                  <RootLayoutNav />
                </KeyboardProvider>
              </GestureHandlerRootView>
            </AuthGate>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );

  if (!CLERK_KEY) return app;

  return (
    <ClerkProvider publishableKey={CLERK_KEY} tokenCache={{
      getToken: async () => {
        try {
          return (await import("@react-native-async-storage/async-storage")).default.getItem("clerk_token");
        } catch { return null; }
      },
      saveToken: async (token: string) => {
        try {
          await (await import("@react-native-async-storage/async-storage")).default.setItem("clerk_token", token);
        } catch {}
      },
    }}>
      {app}
    </ClerkProvider>
  );
}
