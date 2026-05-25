import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useAuthContext } from "@/context/AuthContext";
import { post } from "@/lib/api";
import { useOAuth, useAuth } from "@clerk/clerk-expo";
import * as WebBrowser from "expo-web-browser";

const CLERK_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

WebBrowser.maybeCompleteAuthSession();

export default function AuthScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signIn, exchangeClerkToken } = useAuthContext();
  const { startOAuthFlow } = useOAuth({ strategy: "oauth_google" });
  const clerkAuth = useAuth();

  const [step, setStep] = useState<"welcome" | "phone" | "otp">("welcome");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);

  const sendOTP = async () => {
    if (!phone || phone.length < 10) {
      Alert.alert("Enter a valid phone number");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoading(true);
    try {
      const data: any = await post("/api/auth/send-otp", { phone });
      setStep("otp");
      const auto = data?.devOtp || (data?.demo ? "123456" : null);
      if (auto) {
        setDevOtp(auto);
        setOtp(auto);
        Alert.alert("Dev mode", `Auto-filled OTP: ${auto}`);
      }
    } catch {
      Alert.alert("Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    if (!otp || otp.length < 4) {
      Alert.alert("Enter your OTP");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    const ok = await signIn(phone, otp);
    setLoading(false);
    if (ok) {
      router.replace("/");
    } else {
      Alert.alert("Invalid OTP");
    }
  };

  const bgStyle = { backgroundColor: colors.background };

  return (
    <KeyboardAvoidingView
      style={[styles.container, bgStyle]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require("../assets/images/logo.png")}
            style={{ width: 80, height: 80 }}
            resizeMode="contain"
          />
        </View>

        {step === "welcome" && (
          <>
            <Text style={[styles.title, { color: colors.foreground }]}>Icebreaker</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Meet where you go out.
            </Text>
          </>
        )}

        {step === "phone" && (
          <>
            <Text style={[styles.title, { color: colors.foreground }]}>Your number</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              We will send a one-time code to verify you
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.input,
                  borderColor: colors.border,
                  color: colors.foreground,
                },
              ]}
              placeholder="+91 98765 43210"
              placeholderTextColor={colors.mutedForeground}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              autoFocus
            />
          </>
        )}

        {step === "otp" && (
          <>
            <Text style={[styles.title, { color: colors.foreground }]}>Enter code</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Sent to {phone}
            </Text>
            {devOtp && (
              <View
                style={[
                  styles.devBanner,
                  { backgroundColor: colors.secondary + "15", borderColor: colors.secondary + "50" },
                ]}
              >
                <Text style={[styles.devLabel, { color: colors.secondary }]}>DEV MODE</Text>
                <Text style={[styles.devCode, { color: colors.foreground }]}>{devOtp}</Text>
                <Text style={[styles.devHint, { color: colors.mutedForeground }]}>
                  Auto-filled
                </Text>
              </View>
            )}
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.input,
                  borderColor: colors.border,
                  color: colors.foreground,
                  letterSpacing: 8,
                  fontSize: 24,
                  textAlign: "center",
                },
              ]}
              placeholder="------"
              placeholderTextColor={colors.mutedForeground}
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />
          </>
        )}

        <View style={styles.spacer} />

        {step === "welcome" && (
          <>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setStep("phone");
              }}
              activeOpacity={0.8}
            >
              <Feather name="smartphone" size={18} color="#FFF" />
              <Text style={styles.primaryButtonText}>Continue with phone</Text>
            </TouchableOpacity>

            {!!CLERK_KEY && (
              <TouchableOpacity
                style={[styles.ghostButton, { borderColor: colors.secondary + "60" }]}
                onPress={async () => {
                  try {
                    setLoading(true);
                    const { createdSessionId, setActive } = await startOAuthFlow();
                    if (createdSessionId && setActive) {
                      await setActive({ session: createdSessionId });
                      // Get a JWT from Clerk and exchange it for our backend token
                      const jwt = await clerkAuth.getToken();
                      const ok = jwt ? await exchangeClerkToken(jwt) : false;
                      if (ok) {
                        router.replace("/");
                      } else {
                        Alert.alert("Login failed", "Could not exchange Clerk session.");
                      }
                    } else {
                      Alert.alert("Google sign-in", "Sign-in was cancelled or failed.");
                    }
                  } catch (e: any) {
                    Alert.alert("Google sign-in error", e?.message || "Something went wrong");
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color={colors.secondary} />
                ) : (
                  <>
                    <Feather name="globe" size={18} color={colors.secondary} />
                    <Text style={[styles.ghostButtonText, { color: colors.foreground }]}>
                      Continue with Google
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            <Text style={[styles.terms, { color: colors.mutedForeground }]}>
              By continuing you confirm you are 18+ and agree to our Terms, Privacy, and Community Guidelines.
            </Text>
          </>
        )}

        {step === "phone" && (
          <>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              onPress={sendOTP}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Send Code</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setStep("welcome")} style={styles.backLink}>
              <Text style={[styles.backText, { color: colors.mutedForeground }]}>Back</Text>
            </TouchableOpacity>
          </>
        )}

        {step === "otp" && (
          <>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              onPress={verifyOTP}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Verify & Enter</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setStep("phone")} style={styles.backLink}>
              <Text style={[styles.backText, { color: colors.mutedForeground }]}>
                Change number
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, alignItems: "center", paddingHorizontal: 24 },
  logoContainer: { marginBottom: 24 },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  title: { fontSize: 32, fontFamily: "PlusJakartaSans_800ExtraBold", letterSpacing: -0.5, marginBottom: 6 },
  subtitle: { fontSize: 15, fontFamily: "PlusJakartaSans_500Medium", textAlign: "center", marginBottom: 32 },
  input: {
    width: "100%",
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: "PlusJakartaSans_600SemiBold",
    marginTop: 8,
  },
  spacer: { flex: 1 },
  primaryButton: {
    width: "100%",
    height: 54,
    borderRadius: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 12,
  },
  primaryButtonText: { color: "#FFF", fontSize: 16, fontFamily: "PlusJakartaSans_700Bold" },
  ghostButton: {
    width: "100%",
    height: 54,
    borderRadius: 28,
    borderWidth: 1.5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 12,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  ghostButtonText: { fontSize: 16, fontFamily: "PlusJakartaSans_700Bold" },
  backLink: { marginTop: 8, padding: 8 },
  backText: { fontSize: 14, fontFamily: "PlusJakartaSans_600SemiBold" },
  terms: { fontSize: 11, fontFamily: "PlusJakartaSans_400Regular", textAlign: "center", marginTop: 8, lineHeight: 16 },
  devBanner: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  devLabel: { fontSize: 10, fontFamily: "PlusJakartaSans_800ExtraBold", letterSpacing: 2, marginBottom: 4 },
  devCode: { fontSize: 22, fontFamily: "PlusJakartaSans_800ExtraBold", letterSpacing: 6 },
  devHint: { fontSize: 10, marginTop: 2 },
});
