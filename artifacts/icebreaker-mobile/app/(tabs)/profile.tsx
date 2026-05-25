import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { useAuthContext } from "@/context/AuthContext";
import { get } from "@/lib/api";
import * as Haptics from "expo-haptics";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, signOut } = useAuthContext();

  const { data: walletData } = useQuery({ queryKey: ["wallet"], queryFn: () => get("/api/wallet") });
  const { data: subData } = useQuery({ queryKey: ["subscription"], queryFn: () => get("/api/me/subscription") });
  const { data: rankData } = useQuery({ queryKey: ["rank"], queryFn: () => get("/api/me/rank") });

  const age = user?.dob
    ? Math.floor((Date.now() - new Date(user.dob).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null;
  const isPremium = !!subData?.subscription;

  const stats = [
    { value: user?.level ?? 1, label: "Level", icon: "zap" },
    { value: (user?.xp ?? 0).toLocaleString("en-IN"), label: "XP", icon: "award" },
    { value: rankData?.rank ? `#${rankData.rank}` : "—", label: "Rank", icon: "award" },
  ];

  const handleSignOut = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await signOut();
    router.replace("/auth");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Profile</Text>
        <TouchableOpacity
          style={[styles.iconBtn, { borderColor: colors.border }]}
          onPress={() => router.push("/settings")}
          activeOpacity={0.7}
        >
          <Feather name="settings" size={18} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 30, padding: 16, gap: 14 }}>
        {/* Hero card */}
        <View style={[styles.heroCard, { borderColor: "rgba(255,255,255,0.08)" }]}>
          <View style={styles.heroInner}>
            <View style={styles.avatarWrap}>
              <View style={[styles.avatarRing, { backgroundColor: colors.primary }]}>
                <View style={[styles.avatar, { backgroundColor: colors.card }]}>
                  <Text style={[styles.avatarLetter, { color: colors.foreground }]}>
                    {user?.name?.[0]?.toUpperCase() || "U"}
                  </Text>
                </View>
              </View>
              {user?.verified && (
                <View style={[styles.verifiedBadge, { backgroundColor: colors.primary }]}>
                  <Feather name="check" size={12} color="#FFF" />
                </View>
              )}
            </View>
            <Text style={[styles.name, { color: colors.foreground }]}>
              {user?.name || "Your Name"}
              {age ? `, ${age}` : ""}
            </Text>
            <View style={styles.locationRow}>
              <Feather name="map-pin" size={12} color={colors.mutedForeground} />
              <Text style={[styles.location, { color: colors.mutedForeground }]}>{user?.city || "Bangalore"}</Text>
            </View>
            <View style={styles.badgeRow}>
              {user?.verified && (
                <View style={[styles.badge, { borderColor: colors.secondary + "30" }]}>
                  <Feather name="shield" size={10} color={colors.secondary} />
                  <Text style={[styles.badgeText, { color: colors.secondary }]}>Verified</Text>
                </View>
              )}
              {isPremium && (
                <View style={[styles.badge, { borderColor: colors.primary + "30" }]}>
                  <Feather name="star" size={10} color={colors.primary} />
                  <Text style={[styles.badgeText, { color: colors.primary }]}>God Mode</Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              style={[styles.editBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push("/onboarding")}
              activeOpacity={0.8}
            >
              <Feather name="edit-3" size={14} color="#FFF" />
              <Text style={styles.editText}>Edit profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {stats.map((s) => (
            <View key={s.label} style={[styles.statCard, { borderColor: colors.border }]}>
              <Feather name={s.icon as any} size={16} color={colors.primary} />
              <Text style={[styles.statValue, { color: colors.foreground }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Rewards */}
        <TouchableOpacity
          style={[styles.rewardsCard, { borderColor: colors.primary + "40" }]}
          onPress={() => router.push("/rewards")}
          activeOpacity={0.8}
        >
          <View style={styles.rewardsInner}>
            <View style={[styles.rewardsIcon, { backgroundColor: colors.primary }]}>
              <Feather name="star" size={20} color="#FFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rewardsTag, { color: colors.primary }]}>REWARDS</Text>
              <Text style={[styles.rewardsTitle, { color: colors.foreground }]}>God Mode · Cubes · Season Pass</Text>
              <View style={styles.cubesRow}>
                <Feather name="zap" size={12} color={colors.secondary} />
                <Text style={[styles.cubesText, { color: colors.secondary }]}>
                  {walletData?.wallet?.balance ?? 0} cubes
                </Text>
              </View>
            </View>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </View>
        </TouchableOpacity>

        {/* Quick links */}
        <View style={styles.linksRow}>
          <TouchableOpacity
            style={[styles.linkCard, { borderColor: colors.border }]}
            onPress={() => router.push("/leaderboard")}
            activeOpacity={0.8}
          >
            <Feather name="award" size={20} color="#FFB020" />
            <Text style={[styles.linkTitle, { color: colors.foreground }]}>Leaderboard</Text>
            <Text style={[styles.linkSub, { color: colors.mutedForeground }]}>City rankings</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.linkCard, { borderColor: colors.border }]}
            onPress={() => router.push("/safety")}
            activeOpacity={0.8}
          >
            <Feather name="shield" size={20} color={colors.secondary} />
            <Text style={[styles.linkTitle, { color: colors.foreground }]}>Trust & Safety</Text>
            <Text style={[styles.linkSub, { color: colors.mutedForeground }]}>Verification, blocks</Text>
          </TouchableOpacity>
        </View>

        {/* Settings */}
        <TouchableOpacity
          style={[styles.settingsRow, { borderColor: colors.border }]}
          onPress={() => router.push("/settings")}
          activeOpacity={0.8}
        >
          <View style={[styles.settingsIcon, { backgroundColor: "rgba(255,255,255,0.05)" }]}>
            <Feather name="settings" size={16} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.settingsText, { color: colors.foreground }]}>Settings & preferences</Text>
          <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
        </TouchableOpacity>

        {/* Sign out */}
        <TouchableOpacity
          style={[styles.signOutBtn, { borderColor: colors.destructive + "30" }]}
          onPress={handleSignOut}
          activeOpacity={0.8}
        >
          <Feather name="log-out" size={16} color={colors.destructive} />
          <Text style={[styles.signOutText, { color: colors.destructive }]}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 10 },
  headerTitle: { fontSize: 20, fontFamily: "PlusJakartaSans_800ExtraBold" },
  iconBtn: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  heroCard: { borderRadius: 20, borderWidth: 1, padding: 18, backgroundColor: "rgba(255,27,141,0.04)" },
  heroInner: { alignItems: "center" },
  avatarWrap: { position: "relative", marginBottom: 10 },
  avatarRing: { width: 100, height: 100, borderRadius: 50, padding: 3 },
  avatar: { flex: 1, borderRadius: 50, alignItems: "center", justifyContent: "center" },
  avatarLetter: { fontSize: 36, fontFamily: "PlusJakartaSans_800ExtraBold" },
  verifiedBadge: { position: "absolute", bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#0A0A0C" },
  name: { fontSize: 22, fontFamily: "PlusJakartaSans_800ExtraBold" },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  location: { fontSize: 13, fontFamily: "PlusJakartaSans_500Medium" },
  badgeRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
  badgeText: { fontSize: 9, fontFamily: "PlusJakartaSans_800ExtraBold", letterSpacing: 0.5 },
  editBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, marginTop: 12 },
  editText: { color: "#FFF", fontSize: 13, fontFamily: "PlusJakartaSans_700Bold" },
  statsRow: { flexDirection: "row", gap: 8 },
  statCard: { flex: 1, borderRadius: 16, borderWidth: 1, padding: 14, alignItems: "center", backgroundColor: "rgba(255,255,255,0.02)" },
  statValue: { fontSize: 20, fontFamily: "PlusJakartaSans_800ExtraBold", marginTop: 6 },
  statLabel: { fontSize: 9, fontFamily: "PlusJakartaSans_700Bold", letterSpacing: 1.5, marginTop: 4 },
  rewardsCard: { borderRadius: 18, borderWidth: 1, padding: 14 },
  rewardsInner: { flexDirection: "row", alignItems: "center", gap: 10 },
  rewardsIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  rewardsTag: { fontSize: 9, fontFamily: "PlusJakartaSans_800ExtraBold", letterSpacing: 1.2 },
  rewardsTitle: { fontSize: 14, fontFamily: "PlusJakartaSans_800ExtraBold", marginTop: 2 },
  cubesRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  cubesText: { fontSize: 12, fontFamily: "PlusJakartaSans_700Bold" },
  linksRow: { flexDirection: "row", gap: 8 },
  linkCard: { flex: 1, borderRadius: 16, borderWidth: 1, padding: 14, backgroundColor: "rgba(255,255,255,0.02)" },
  linkTitle: { fontSize: 14, fontFamily: "PlusJakartaSans_800ExtraBold", marginTop: 8 },
  linkSub: { fontSize: 10, fontFamily: "PlusJakartaSans_500Medium", marginTop: 2 },
  settingsRow: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 16, borderWidth: 1, padding: 14, backgroundColor: "rgba(255,255,255,0.02)" },
  settingsIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  settingsText: { flex: 1, fontSize: 14, fontFamily: "PlusJakartaSans_700Bold" },
  signOutBtn: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 16, borderWidth: 1, padding: 14, alignSelf: "center", marginTop: 8 },
  signOutText: { fontSize: 14, fontFamily: "PlusJakartaSans_700Bold" },
});
