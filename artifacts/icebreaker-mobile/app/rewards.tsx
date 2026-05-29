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

export default function RewardsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuthContext();

  const { data: wallet } = useQuery({ queryKey: ["wallet"], queryFn: () => get("/api/wallet") });
  const { data: sub } = useQuery({ queryKey: ["subscription"], queryFn: () => get("/api/me/subscription") });
  const { data: quests } = useQuery({ queryKey: ["quests"], queryFn: () => get("/api/quests") });
  const { data: season } = useQuery({ queryKey: ["season"], queryFn: () => get("/api/season/current") });

  const balance = wallet?.wallet?.balance ?? 0;
  const isPremium = !!sub?.subscription;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={[styles.backBtn, { borderColor: colors.border }]} onPress={() => router.back()}>
          <Feather name="arrow-left" size={18} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Rewards</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 30, gap: 14 }}>
        {/* Cube balance */}
        <View style={[styles.balanceCard, { borderColor: colors.primary + "40" }]}>
          <View style={styles.balanceRow}>
            <View style={[styles.balanceIcon, { backgroundColor: colors.primary }]}>
              <Feather name="zap" size={24} color="#FFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.balanceLabel, { color: colors.mutedForeground }]}>CUBE BALANCE</Text>
              <Text style={[styles.balanceValue, { color: colors.foreground }]}>{balance}</Text>
            </View>
            <TouchableOpacity
              style={[styles.topUpBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push("/shop?tab=cubes" as any)}
              activeOpacity={0.85}
            >
              <Feather name="plus" size={14} color="#FFF" />
              <Text style={styles.topUpText}>Get Cubes</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* God Mode */}
        <TouchableOpacity
          style={[styles.premiumCard, { borderColor: isPremium ? colors.primary + "50" : colors.border }]}
          activeOpacity={0.8}
          onPress={() => router.push("/shop?tab=godmode" as any)}
        >
          <View style={styles.premiumRow}>
            <View style={[styles.premiumIcon, { backgroundColor: colors.primary }]}>
              <Feather name="star" size={20} color="#FFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.premiumTitle, { color: colors.foreground }]}>God Mode</Text>
              <Text style={[styles.premiumSub, { color: colors.mutedForeground }]}>
                {isPremium ? "Active · Renews monthly" : "Unlock premium features"}
              </Text>
            </View>
            <View style={[styles.premiumBadge, { backgroundColor: isPremium ? colors.primary + "20" : "rgba(255,255,255,0.05)" }]}>
              <Text style={[styles.premiumBadgeText, { color: isPremium ? colors.primary : colors.mutedForeground }]}>
                {isPremium ? "ACTIVE" : "UPGRADE"}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Season Pass */}
        <TouchableOpacity
          style={[styles.seasonCard, { borderColor: colors.secondary + "30" }]}
          activeOpacity={0.8}
          onPress={() => router.push("/shop?tab=season" as any)}
        >
          <View style={styles.seasonRow}>
            <Feather name="calendar" size={20} color={colors.secondary} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.seasonTitle, { color: colors.foreground }]}>Season Pass</Text>
              <Text style={[styles.seasonSub, { color: colors.mutedForeground }]}>
                {season?.season?.name || "Current Season"}
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </View>
        </TouchableOpacity>

        {/* Quests */}
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>QUESTS</Text>
        <View style={{ gap: 8 }}>
          {(quests || []).slice(0, 3).map((q: any) => (
            <View key={q.id} style={[styles.questCard, { borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.questTitle, { color: colors.foreground }]}>{q.title}</Text>
                <Text style={[styles.questSub, { color: colors.mutedForeground }]}>{q.description}</Text>
              </View>
              <View style={[styles.questReward, { backgroundColor: colors.primary + "15" }]}>
                <Text style={[styles.questRewardText, { color: colors.primary }]}>+{q.cubesReward}</Text>
              </View>
            </View>
          ))}
          {(!quests || quests.length === 0) && (
            <Text style={[styles.empty, { color: colors.mutedForeground }]}>No active quests</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 10 },
  backBtn: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontFamily: "PlusJakartaSans_800ExtraBold" },
  balanceCard: { borderRadius: 18, borderWidth: 1, padding: 16 },
  balanceRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  balanceIcon: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  balanceLabel: { fontSize: 10, fontFamily: "PlusJakartaSans_800ExtraBold", letterSpacing: 1.2 },
  balanceValue: { fontSize: 32, fontFamily: "PlusJakartaSans_800ExtraBold", marginTop: 2 },
  topUpBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12 },
  topUpText: { color: "#FFF", fontSize: 13, fontFamily: "PlusJakartaSans_800ExtraBold" },
  premiumCard: { borderRadius: 18, borderWidth: 1, padding: 14 },
  premiumRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  premiumIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  premiumTitle: { fontSize: 16, fontFamily: "PlusJakartaSans_800ExtraBold" },
  premiumSub: { fontSize: 12, fontFamily: "PlusJakartaSans_500Medium", marginTop: 2 },
  premiumBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  premiumBadgeText: { fontSize: 9, fontFamily: "PlusJakartaSans_800ExtraBold" },
  seasonCard: { borderRadius: 18, borderWidth: 1, padding: 14 },
  seasonRow: { flexDirection: "row", alignItems: "center" },
  seasonTitle: { fontSize: 15, fontFamily: "PlusJakartaSans_800ExtraBold" },
  seasonSub: { fontSize: 12, fontFamily: "PlusJakartaSans_500Medium", marginTop: 2 },
  sectionTitle: { fontSize: 11, fontFamily: "PlusJakartaSans_800ExtraBold", letterSpacing: 1.5, marginBottom: 4 },
  questCard: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 14, borderWidth: 1 },
  questTitle: { fontSize: 14, fontFamily: "PlusJakartaSans_700Bold" },
  questSub: { fontSize: 11, fontFamily: "PlusJakartaSans_500Medium", marginTop: 2 },
  questReward: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  questRewardText: { fontSize: 12, fontFamily: "PlusJakartaSans_800ExtraBold" },
  empty: { fontSize: 13, fontFamily: "PlusJakartaSans_500Medium", textAlign: "center", paddingVertical: 20 },
});
