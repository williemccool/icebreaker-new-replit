import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { useAuthContext } from "@/context/AuthContext";
import { post } from "@/lib/api";
import * as Haptics from "expo-haptics";

export default function OnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, refreshUser } = useAuthContext();
  const qc = useQueryClient();

  const [name, setName] = useState(user?.name || "");
  // Pre-fill bio from the existing profile — starting empty silently wiped the
  // user's saved bio on every save.
  const [bio, setBio] = useState(user?.bio || "");
  const [dob, setDob] = useState(user?.dob ? new Date(user.dob).toISOString().slice(0, 10) : "");
  const [gender, setGender] = useState(user?.gender || "male");
  const [city, setCity] = useState(user?.city || "Bangalore");

  const saveMutation = useMutation({
    mutationFn: () => {
      // Validate DOB BEFORE building the payload. Previously an invalid date
      // made `new Date(dob).toISOString()` throw inside mutationFn with no
      // onError handler — the Save button silently did nothing.
      let dobIso: string | undefined;
      if (dob.trim()) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dob.trim())) {
          throw new Error("Date of birth must be in YYYY-MM-DD format (e.g. 1995-06-15).");
        }
        const d = new Date(dob.trim());
        if (Number.isNaN(d.getTime())) {
          throw new Error("That date of birth isn't a valid date.");
        }
        dobIso = d.toISOString();
      }
      if (!name.trim()) {
        throw new Error("Please enter your name.");
      }
      return post("/api/user/profile", {
        name: name.trim(),
        bio,
        dob: dobIso,
        gender,
        city: city.trim(),
      });
    },
    onSuccess: async () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await refreshUser();
      qc.invalidateQueries();
      router.back();
    },
    onError: (e: any) => {
      // Surface failures — a silent no-op here is what made saving look broken.
      Alert.alert("Couldn't save profile", e?.message || "Something went wrong. Please try again.");
    },
  });

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={[styles.backBtn, { borderColor: colors.border }]} onPress={() => router.back()}>
          <Feather name="arrow-left" size={18} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Edit Profile</Text>
        <TouchableOpacity
          onPress={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          {saveMutation.isPending ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={[styles.saveText, { color: colors.primary }]}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 30, gap: 14 }} keyboardShouldPersistTaps="handled">
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Name</Text>
          <TextInput style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground }]} value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={colors.mutedForeground} />
        </View>
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Bio</Text>
          <TextInput style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground, height: 80 }]} value={bio} onChangeText={setBio} placeholder="Tell us about yourself" placeholderTextColor={colors.mutedForeground} multiline />
        </View>
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Date of Birth (YYYY-MM-DD)</Text>
          <TextInput style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground }]} value={dob} onChangeText={setDob} placeholder="1995-06-15" placeholderTextColor={colors.mutedForeground} />
        </View>
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>City</Text>
          <TextInput style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground }]} value={city} onChangeText={setCity} placeholder="Bangalore" placeholderTextColor={colors.mutedForeground} />
        </View>
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Gender</Text>
          <View style={styles.genderRow}>
            {["male", "female", "other"].map((g) => (
              <TouchableOpacity
                key={g}
                style={[styles.genderBtn, { borderColor: gender === g ? colors.primary : colors.border, backgroundColor: gender === g ? colors.primary + "15" : "transparent" }]}
                onPress={() => setGender(g)}
              >
                <Text style={[styles.genderText, { color: gender === g ? colors.primary : colors.foreground }]}>
                  {g[0].toUpperCase() + g.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 10 },
  backBtn: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontFamily: "PlusJakartaSans_800ExtraBold" },
  saveText: { fontSize: 15, fontFamily: "PlusJakartaSans_700Bold" },
  field: { gap: 6 },
  label: { fontSize: 11, fontFamily: "PlusJakartaSans_800ExtraBold", letterSpacing: 0.8 },
  input: { borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "PlusJakartaSans_500Medium" },
  genderRow: { flexDirection: "row", gap: 8 },
  genderBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, alignItems: "center" },
  genderText: { fontSize: 14, fontFamily: "PlusJakartaSans_700Bold" },
});
