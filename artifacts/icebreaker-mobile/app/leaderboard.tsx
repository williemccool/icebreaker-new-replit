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

export default function LeaderboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuthContext();

  const { data: leaderboard } = useQuery({ queryKey: ["leaderboard"], queryFn: () => get("/api/leaderboard") });
  const { data: myRank } = useQuery({ queryKey: ["my-rank"], queryFn: () => get("/api/me/rank") });

  const entries = Array.isArray(leaderboard) ? leaderboard : [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={[styles.backBtn, { borderColor: colors.border }]} onPress={() => router.back()}>
          <Feather name="arrow-left" size={18} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Leaderboard</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 30, gap: 12 }}>
        {/* My rank */}
        {myRank?.rank && (
          <View style={[styles.myRank, { borderColor: colors.primary + "40" }]}>
            <View style={styles.myRankRow}>
              <Text style={[styles.myRankNum, { color: colors.primary }]}>#{myRank.rank}</Text>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.myRankName, { color: colors.foreground }]}>{user?.name || "You"}</Text>
                <Text style={[styles.myRankXp, { color: colors.mutedForeground }]}>{(user?.xp ?? 0).toLocaleString("en-IN")} XP</Text>
              </View>
              <Feather name="award" size={20} color="#FFB020" />
            </View>
          </View>
        )}

        {/* Top 10 */}
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>TOP 10</Text>
        <View style={{ gap: 6 }}>
          {entries.slice(0, 10).map((entry: any, i: number) => (
            <View key={entry.userId || i} style={[styles.entry, { borderColor: colors.border }]}>
              <Text
                style={[
                  styles.entryRank,
                  {
                    color:
                      i === 0 ? "#FFB020" : i === 1 ? "#C0C0C0" : i === 2 ? "#CD7F32" : colors.mutedForeground,
                  },
                ]}
              >
                {i + 1}
              </Text>
              <View style={[styles.entryAvatar, { backgroundColor: colors.secondary + "15" }]}>
                <Text style={[styles.entryAvatarText, { color: colors.secondary }]}>
                  {entry.name?.[0]?.toUpperCase() || "?"}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.entryName, { color: colors.foreground }]} numberOfLines={1}>
                  {entry.name}
                </Text>
                <Text style={[styles.entryXp, { color: colors.mutedForeground }]}>{entry.xp?.toLocaleString("en-IN")} XP</Text>
              </View>
              {i < 3 && (
                <Feather name="award" size={16} color={i === 0 ? "#FFB020" : i === 1 ? "#C0C0C0" : "#CD7F32"} />
              )}
            </View>
          ))}
          {entries.length === 0 && (
            <Text style={[styles.empty, { color: colors.mutedForeground }]}>Leaderboard updates soon</Text>
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
  myRank: { borderRadius: 18, borderWidth: 1, padding: 14 },
  myRankRow: { flexDirection: "row", alignItems: "center" },
  myRankNum: { fontSize: 24, fontFamily: "PlusJakartaSans_800ExtraBold" },
  myRankName: { fontSize: 15, fontFamily: "PlusJakartaSans_800ExtraBold" },
  myRankXp: { fontSize: 12, fontFamily: "PlusJakartaSans_500Medium", marginTop: 2 },
  sectionTitle: { fontSize: 11, fontFamily: "PlusJakartaSans_800ExtraBold", letterSpacing: 1.5, marginBottom: 4 },
  entry: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 14, borderWidth: 1 },
  entryRank: { width: 24, textAlign: "center", fontSize: 14, fontFamily: "PlusJakartaSans_800ExtraBold" },
  entryAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  entryAvatarText: { fontSize: 14, fontFamily: "PlusJakartaSans_800ExtraBold" },
  entryName: { fontSize: 14, fontFamily: "PlusJakartaSans_700Bold" },
  entryXp: { fontSize: 11, fontFamily: "PlusJakartaSans_500Medium", marginTop: 1 },
  empty: { fontSize: 13, fontFamily: "PlusJakartaSans_500Medium", textAlign: "center", paddingVertical: 30 },
});
