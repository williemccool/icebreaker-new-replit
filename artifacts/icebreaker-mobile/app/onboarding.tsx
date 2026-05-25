import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
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
  const [bio, setBio] = useState("");
  const [dob, setDob] = useState(user?.dob ? new Date(user.dob).toISOString().slice(0, 10) : "");
  const [gender, setGender] = useState(user?.gender || "male");
  const [city, setCity] = useState(user?.city || "Bangalore");

  const saveMutation = useMutation({
    mutationFn: () =>
      post("/api/user/profile", {
        name,
        bio,
        dob: dob ? new Date(dob).toISOString() : undefined,
        gender,
        city,
      }),
    onSuccess: () => {
      refreshUser();
      router.back();
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
        <TouchableOpacity onPress={() => saveMutation.mutate()}>
          <Text style={[styles.saveText, { color: colors.primary }]}>Save</Text>
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
