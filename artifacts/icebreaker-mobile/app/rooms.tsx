import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { get } from "@/lib/api";
import * as Haptics from "expo-haptics";

function GenderBar({ room }: { room: any }) {
  const total = Math.max(room.participants || 1, 1);
  const femPct = Math.round((room.femaleRatio ?? 0.5) * 100);
  return (
    <View>
      <View style={styles.genderRow}>
        <View style={styles.genderTag}>
          <Ionicons name="female" size={11} color="#FF1B8D" />
          <Text style={[styles.genderLabel, { color: "#FF1B8D" }]}>{femPct}%</Text>
        </View>
        <Text style={styles.genderMixed}>MIXED</Text>
        <View style={styles.genderTag}>
          <Text style={[styles.genderLabel, { color: "#00CFFF" }]}>{100 - femPct}%</Text>
          <Ionicons name="male" size={11} color="#00CFFF" />
        </View>
      </View>
      <View style={styles.genderBar}>
        <View style={[styles.genderFill, { width: `${femPct}%` as any, backgroundColor: "#FF1B8D" }]} />
        <View style={[styles.genderFill, { width: `${100 - femPct}%` as any, backgroundColor: "#00CFFF" }]} />
      </View>
    </View>
  );
}

export default function RoomsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data: rooms, isLoading } = useQuery({
    queryKey: ["rooms"],
    queryFn: () => get("/api/rooms"),
  });

  const liveRooms = Array.isArray(rooms) ? rooms.filter((r: any) => r.active) : [];
  const upcomingRooms = Array.isArray(rooms) ? rooms.filter((r: any) => !r.active) : [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.backBtn, { borderColor: colors.border }]}
          onPress={() => router.back()}
        >
          <Feather name="arrow-left" size={18} color={colors.foreground} />
        </TouchableOpacity>
        <View>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Icebreaker Live</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>Real venues. Virtual rooms.</Text>
        </View>
        <TouchableOpacity style={[styles.backBtn, { borderColor: colors.border }]}>
          <Feather name="bell" size={16} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={liveRooms}
          keyExtractor={(item: any) => String(item.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 30, gap: 12 }}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            upcomingRooms.length > 0 ? (
              <View style={{ gap: 10, marginTop: 8 }}>
                <Text style={[styles.upcomingLabel, { color: colors.mutedForeground }]}>UPCOMING</Text>
                {upcomingRooms.map((room: any) => {
                  const startMs = new Date(room.startsAt).getTime() - Date.now();
                  const startMin = Math.max(0, Math.floor(startMs / 60000));
                  return (
                    <View
                      key={room.id}
                      style={[styles.upcomingCard, { borderColor: colors.border }]}
                    >
                      <View style={styles.upcomingTop}>
                        <View style={{ flex: 1 }}>
                          <View style={styles.badgeRow}>
                            <View style={styles.upcomingBadge}>
                              <Text style={styles.upcomingBadgeText}>UPCOMING</Text>
                            </View>
                          </View>
                          <Text style={[styles.roomName, { color: colors.foreground }]} numberOfLines={1}>
                            {room.name}
                          </Text>
                          <Text style={[styles.startsIn, { color: colors.mutedForeground }]}>
                            Starts in {startMin}m
                          </Text>
                        </View>
                        <View style={{ alignItems: "flex-end" }}>
                          <Text style={[styles.priceFemale]}>Women: 10 Cubes</Text>
                          <Text style={[styles.priceMale]}>Men: 25 Cubes</Text>
                        </View>
                      </View>
                      <GenderBar room={room} />
                      <TouchableOpacity
                        style={[styles.remindBtn, { borderColor: colors.border }]}
                      >
                        <Feather name="bell" size={13} color={colors.mutedForeground} />
                        <Text style={[styles.remindText, { color: colors.mutedForeground }]}>Set Reminder</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            ) : null
          }
          renderItem={({ item }: { item: any }) => {
            const isFull = (item.participants || 0) >= item.capacity;
            const pct = Math.min(100, Math.round(((item.participants || 0) / item.capacity) * 100));
            const endMs = new Date(item.endsAt).getTime() - Date.now();
            const endMin = Math.max(0, Math.floor(endMs / 60000));

            return (
              <View style={styles.roomCard}>
                {/* Location row */}
                <View style={styles.locationRow}>
                  <Feather name="map-pin" size={12} color="#00CFFF" />
                  <Text style={styles.locationText} numberOfLines={1}>
                    {item.venueName || "Icebreaker Venue"}
                  </Text>
                </View>

                <View style={{ padding: 14, gap: 10 }}>
                  {/* Badges */}
                  <View style={styles.badgeRow}>
                    <View style={styles.liveBadge}>
                      <View style={styles.liveDot} />
                      <Text style={styles.liveBadgeText}>LIVE</Text>
                    </View>
                    <View style={styles.xpBadge}>
                      <Feather name="zap" size={9} color="#FFB000" />
                      <Text style={styles.xpText}>2x XP</Text>
                    </View>
                    {item.premium && (
                      <View style={styles.crownBadge}>
                        <Feather name="star" size={9} color="#00CFFF" />
                        <Text style={styles.crownText}>God Mode</Text>
                      </View>
                    )}
                  </View>

                  {/* Room name */}
                  <Text style={styles.roomName}>{item.name}</Text>

                  {/* Stats */}
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Feather name="clock" size={11} color="#8A8FA8" />
                      <Text style={styles.statText}>Ends in {endMin}m</Text>
                    </View>
                    {pct >= 70 && (
                      <Text style={styles.fillingFast}>FILLING FAST</Text>
                    )}
                    <View style={styles.statItem}>
                      <Feather name="users" size={11} color="#8A8FA8" />
                      <Text style={styles.statText}>{item.participants || 0}/{item.capacity} joined</Text>
                    </View>
                  </View>

                  {/* Gender bar */}
                  <GenderBar room={item} />

                  {/* Pricing grid */}
                  <View style={styles.pricingGrid}>
                    <View style={styles.priceCardFemale}>
                      <Text style={styles.priceGenderF}>WOMEN</Text>
                      <Text style={styles.priceAmount}>Free</Text>
                      <Text style={styles.priceReward}>+ Earn 20 Cubes</Text>
                    </View>
                    <View style={styles.priceCardMale}>
                      <Text style={styles.priceGenderM}>MEN</Text>
                      <Text style={styles.priceAmount}>40 Cubes</Text>
                      <Text style={styles.priceNote}>or Night Pass</Text>
                    </View>
                  </View>

                  {/* Join button */}
                  <TouchableOpacity
                    style={[styles.joinBtn, isFull && styles.joinBtnFull]}
                    disabled={isFull}
                    onPress={() => {
                      if (!isFull) {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        router.push(`/rooms/${item.id}`);
                      }
                    }}
                    activeOpacity={0.85}
                  >
                    <Feather name="radio" size={16} color={isFull ? "#8A8FA8" : "#FFF"} />
                    <Text style={[styles.joinText, isFull && { color: "#8A8FA8" }]}>
                      {isFull ? "Room Full" : "Join Room"}
                    </Text>
                    {!isFull && <Feather name="arrow-right" size={16} color="#FFF" />}
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={[styles.emptyIcon, { borderColor: "rgba(255,255,255,0.08)" }]}>
                <Feather name="radio" size={28} color="#8A8FA8" />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No active rooms right now</Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>Rooms open when events start</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontFamily: "PlusJakartaSans_800ExtraBold" },
  headerSub: { fontSize: 11, fontFamily: "PlusJakartaSans_600SemiBold", marginTop: 1 },
  roomCard: {
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#0d0d1a",
    borderWidth: 1,
    borderColor: "rgba(0,207,255,0.2)",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.07)",
  },
  locationText: { fontSize: 11, fontFamily: "PlusJakartaSans_700Bold", color: "#8A8FA8", letterSpacing: 0.5, flex: 1 },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
    backgroundColor: "rgba(255,27,141,0.2)",
    borderWidth: 1,
    borderColor: "rgba(255,27,141,0.4)",
  },
  liveDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: "#FF1B8D" },
  liveBadgeText: { fontSize: 9, fontFamily: "PlusJakartaSans_800ExtraBold", color: "#FF1B8D" },
  xpBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
    backgroundColor: "rgba(255,176,0,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,176,0,0.3)",
  },
  xpText: { fontSize: 9, fontFamily: "PlusJakartaSans_800ExtraBold", color: "#FFB000" },
  crownBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
    backgroundColor: "rgba(0,207,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(0,207,255,0.3)",
  },
  crownText: { fontSize: 9, fontFamily: "PlusJakartaSans_800ExtraBold", color: "#00CFFF" },
  roomName: { fontSize: 19, fontFamily: "PlusJakartaSans_800ExtraBold", color: "#F0F2F7" },
  statsRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  statItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  statText: { fontSize: 11, fontFamily: "PlusJakartaSans_600SemiBold", color: "#8A8FA8" },
  fillingFast: { fontSize: 10, fontFamily: "PlusJakartaSans_800ExtraBold", color: "#FF1B8D" },
  genderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 5 },
  genderTag: { flexDirection: "row", alignItems: "center", gap: 3 },
  genderLabel: { fontSize: 10, fontFamily: "PlusJakartaSans_800ExtraBold" },
  genderMixed: { fontSize: 10, fontFamily: "PlusJakartaSans_700Bold", color: "#8A8FA8" },
  genderBar: { flexDirection: "row", height: 5, borderRadius: 3, overflow: "hidden" },
  genderFill: { height: "100%" as any },
  pricingGrid: { flexDirection: "row", gap: 8 },
  priceCardFemale: {
    flex: 1,
    borderRadius: 12,
    padding: 10,
    backgroundColor: "rgba(255,27,141,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,27,141,0.15)",
  },
  priceCardMale: {
    flex: 1,
    borderRadius: 12,
    padding: 10,
    backgroundColor: "rgba(0,207,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(0,207,255,0.15)",
  },
  priceGenderF: { fontSize: 9, fontFamily: "PlusJakartaSans_800ExtraBold", color: "#FF1B8D", marginBottom: 2 },
  priceGenderM: { fontSize: 9, fontFamily: "PlusJakartaSans_800ExtraBold", color: "#00CFFF", marginBottom: 2 },
  priceAmount: { fontSize: 13, fontFamily: "PlusJakartaSans_800ExtraBold", color: "#F0F2F7" },
  priceReward: { fontSize: 9, fontFamily: "PlusJakartaSans_600SemiBold", color: "#00CFFF", marginTop: 1 },
  priceNote: { fontSize: 9, fontFamily: "PlusJakartaSans_600SemiBold", color: "#8A8FA8", marginTop: 1 },
  joinBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#FF1B8D",
  },
  joinBtnFull: { backgroundColor: "rgba(255,255,255,0.06)" },
  joinText: { fontSize: 14, fontFamily: "PlusJakartaSans_700Bold", color: "#FFF" },
  upcomingLabel: {
    fontSize: 10,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  upcomingCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  upcomingTop: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  upcomingBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: "rgba(255,176,0,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,176,0,0.3)",
    alignSelf: "flex-start",
    marginBottom: 4,
  },
  upcomingBadgeText: { fontSize: 8, fontFamily: "PlusJakartaSans_800ExtraBold", color: "#FFB000" },
  startsIn: { fontSize: 11, fontFamily: "PlusJakartaSans_600SemiBold", marginTop: 3 },
  priceFemale: { fontSize: 11, fontFamily: "PlusJakartaSans_700Bold", color: "#FF1B8D" },
  priceMale: { fontSize: 11, fontFamily: "PlusJakartaSans_700Bold", color: "#00CFFF" },
  remindBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 2,
  },
  remindText: { fontSize: 12, fontFamily: "PlusJakartaSans_700Bold" },
  empty: { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyIcon: { width: 64, height: 64, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 15, fontFamily: "PlusJakartaSans_700Bold" },
  emptySub: { fontSize: 12, fontFamily: "PlusJakartaSans_500Medium" },
});
