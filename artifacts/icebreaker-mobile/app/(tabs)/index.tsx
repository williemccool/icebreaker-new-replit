import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { useAuthContext } from "@/context/AuthContext";
import { get } from "@/lib/api";
import * as Haptics from "expo-haptics";

const TABS = ["Dating", "Friends", "Crew", "Events"];

function QuickAction({ icon, label, color, onPress }: { icon: any; label: string; color: string; onPress: () => void }) {
  const colors = useColors();
  return (
    <TouchableOpacity style={styles.quickAction} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.quickIcon, { backgroundColor: color + "18", borderColor: color + "33" }]}>
        <Feather name={icon} size={16} color={color} />
      </View>
      <Text style={[styles.quickLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuthContext();
  const [activeTab, setActiveTab] = useState("Dating");

  const { data: venues, isLoading: vLoading } = useQuery({
    queryKey: ["venues"],
    queryFn: () => get("/api/venues?city=Bangalore"),
  });
  const { data: rooms, isLoading: rLoading } = useQuery({
    queryKey: ["rooms"],
    queryFn: () => get("/api/rooms"),
  });
  const { data: events } = useQuery({
    queryKey: ["events"],
    queryFn: () => get("/api/events"),
  });
  const { data: wallet } = useQuery({
    queryKey: ["wallet"],
    queryFn: () => get("/api/wallet"),
  });

  const hotVenues = Array.isArray(venues) ? venues.slice(0, 4) : [];
  const liveRooms = Array.isArray(rooms) ? rooms.slice(0, 2) : [];
  const nextEvent = Array.isArray(events) ? events[0] : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}
      
      
      
      >
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View style={[styles.headerLogo, { backgroundColor: colors.primary }]}>
              <Feather name="heart" size={14} color="#FFF" />
            </View>
            <View>
              <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>TONIGHT IN</Text>
              <Text style={[styles.headerCity, { color: colors.foreground }]}>Bangalore</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={[styles.iconBtn, { borderColor: colors.border }]} onPress={() => {}}>
              <Feather name="bell" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.avatarBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push("/profile")}
            >
              <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() || "U"}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tabPill,
                activeTab === tab && { backgroundColor: colors.primary + "25", borderColor: colors.primary + "60" },
              ]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, { color: activeTab === tab ? colors.primary : colors.mutedForeground }]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}>
        {/* Rewards hero */}
        <TouchableOpacity
          style={[styles.rewardsCard, { borderColor: colors.primary + "50" }]}
          onPress={() => router.push("/rewards")}
          activeOpacity={0.8}
        >
          <View style={styles.rewardsInner}>
            <View style={[styles.rewardsIcon, { backgroundColor: colors.primary }]}>
              <Feather name="star" size={20} color="#FFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rewardsTag, { color: colors.primary }]}>GOD MODE · CUBES · SEASON PASS</Text>
              <Text style={[styles.rewardsTitle, { color: colors.foreground }]}>
                {wallet?.wallet?.balance ?? 0} cubes
              </Text>
              <Text style={[styles.rewardsSub, { color: colors.mutedForeground }]}>Premium · Quests · Leaderboard</Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </View>
        </TouchableOpacity>

        {/* Go out tonight */}
        <View style={[styles.sectionCard, { borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Go out tonight</Text>
          <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>Find the vibe, check who is there, and meet IRL.</Text>
          <TouchableOpacity
            style={[styles.ctaButton, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/venues")}
            activeOpacity={0.8}
          >
            <Feather name="map-pin" size={16} color="#FFF" />
            <Text style={styles.ctaText}>Explore venues & check in</Text>
          </TouchableOpacity>
        </View>

        {/* Icebreaker Live */}
        <View style={[styles.sectionCard, { borderColor: colors.secondary + "20" }]}>
          <View style={styles.liveBadgeRow}>
            <View style={[styles.liveBadge, { backgroundColor: colors.primary + "20", borderColor: colors.primary + "40" }]}>
              <View style={[styles.liveDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.liveText, { color: colors.primary }]}>LIVE NOW</Text>
            </View>
            <Text style={[styles.liveTime, { color: colors.mutedForeground }]}>24h LEFT</Text>
          </View>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Icebreaker Live</Text>
          <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>Jump into audio rooms and meet people from home.</Text>
          <TouchableOpacity
            style={[styles.ghostCta, { borderColor: colors.secondary + "60", backgroundColor: colors.secondary + "10" }]}
            onPress={() => router.push("/rooms")}
            activeOpacity={0.8}
          >
            <Feather name="mic" size={16} color={colors.secondary} />
            <Text style={[styles.ghostCtaText, { color: colors.secondary }]}>Join a Live room</Text>
          </TouchableOpacity>
        </View>

        {/* Quick actions grid */}
        <View style={styles.quickGrid}>
          <QuickAction icon="map-pin" label="My venues" color={colors.primary} onPress={() => router.push("/venues")} />
          <QuickAction icon="users" label="Live rooms" color={colors.secondary} onPress={() => router.push("/rooms")} />
          <QuickAction icon="star" label="Rewards" color={colors.primary} onPress={() => router.push("/rewards")} />
          <QuickAction icon="star" label="Leaderboard" color={colors.secondary} onPress={() => router.push("/leaderboard")} />
        </View>

        {/* Venues near you */}
        {vLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
        ) : hotVenues.length > 0 ? (
          <View style={styles.listSection}>
            <View style={styles.listHeader}>
              <Text style={[styles.listTitle, { color: colors.foreground }]}>Venues near you</Text>
              <TouchableOpacity onPress={() => router.push("/venues")}>
                <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={hotVenues}
              keyExtractor={(item: any) => String(item.id)}
              renderItem={({ item }: { item: any }) => (
                <TouchableOpacity
                  style={[styles.venueCard, { borderColor: colors.border }]}
                  onPress={() => router.push(`/venues/${item.id}`)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.venueThumb, { backgroundColor: colors.primary + "15" }]}>
                    <Feather name="map-pin" size={24} color={colors.primary} />
                  </View>
                  <Text style={[styles.venueName, { color: colors.foreground }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <View style={styles.venueMeta}>
                    <View style={[styles.hotDot, { backgroundColor: colors.secondary }]} />
                    <Text style={[styles.hotText, { color: colors.secondary }]}>Hot</Text>
                    <Text style={[styles.venueArea, { color: colors.mutedForeground }]}>· {item.area || item.type}</Text>
                  </View>
                </TouchableOpacity>
              )}
              contentContainerStyle={{ paddingRight: 16 }}
            />
          </View>
        ) : null}

        {/* Live rooms tonight */}
        {rLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
        ) : liveRooms.length > 0 ? (
          <View style={styles.listSection}>
            <View style={styles.listHeader}>
              <Text style={[styles.listTitle, { color: colors.foreground }]}>Icebreaker Live tonight</Text>
              <TouchableOpacity onPress={() => router.push("/rooms")}>
                <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
              </TouchableOpacity>
            </View>
            {liveRooms.map((room: any) => (
              <TouchableOpacity
                key={room.id}
                style={[styles.roomRow, { borderColor: colors.border }]}
                onPress={() => router.push(`/rooms/${room.id}`)}
                activeOpacity={0.8}
              >
                <View style={[styles.roomIcon, { backgroundColor: colors.secondary + "15", borderColor: colors.secondary + "30" }]}>
                  <Feather name="radio" size={16} color={colors.secondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.roomName, { color: colors.foreground }]} numberOfLines={1}>
                    {room.name}
                  </Text>
                  <Text style={[styles.roomCount, { color: colors.mutedForeground }]}>{room.participants || 0} joined</Text>
                </View>
                <View style={[styles.liveTag, { backgroundColor: colors.primary + "20" }]}>
                  <Text style={[styles.liveTagText, { color: colors.primary }]}>LIVE</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {/* Events */}
        {nextEvent && (
          <View style={styles.listSection}>
            <View style={styles.listHeader}>
              <Text style={[styles.listTitle, { color: colors.foreground }]}>Events & Crew plans</Text>
              <TouchableOpacity onPress={() => router.push("/events")}>
                <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.eventCard, { borderColor: colors.border }]}
              onPress={() => router.push("/events")}
              activeOpacity={0.8}
            >
              <View style={styles.eventOverlay} />
              <View style={styles.eventContent}>
                <Text style={[styles.eventType, { color: colors.primary }]}>{nextEvent.type}</Text>
                <Text style={[styles.eventTitle, { color: colors.foreground }]}>{nextEvent.title}</Text>
                <Text style={[styles.eventDate, { color: colors.mutedForeground }]}>
                  {new Date(nextEvent.startsAt).toLocaleDateString("en-IN", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Leaderboard CTA */}
        <TouchableOpacity
          style={[styles.leaderboardCard, { borderColor: "#FFB020" + "30" }]}
          onPress={() => router.push("/leaderboard")}
          activeOpacity={0.8}
        >
          <Feather name="award" size={28} color="#FFB020" />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.leaderboardTitle, { color: colors.foreground }]}>Season Leaderboard</Text>
            <Text style={[styles.leaderboardSub, { color: colors.mutedForeground }]}>Climb the ranks. Win real rewards.</Text>
          </View>
          <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    backgroundColor: "rgba(10,10,12,0.95)",
  },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerLogo: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  headerSub: { fontSize: 9, fontWeight: "800", letterSpacing: 1.5 },
  headerCity: { fontSize: 14, fontWeight: "800", marginTop: -2 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconBtn: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  avatarBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#FFF", fontSize: 14, fontWeight: "700" },
  tabRow: { gap: 6, paddingTop: 4 },
  tabPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: "transparent" },
  tabText: { fontSize: 13, fontWeight: "700" },
  content: { padding: 16, gap: 14 },
  rewardsCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    backgroundColor: "#1a0f1f",
  },
  rewardsInner: { flexDirection: "row", alignItems: "center", gap: 10 },
  rewardsIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  rewardsTag: { fontSize: 9, fontWeight: "800", letterSpacing: 1.2 },
  rewardsTitle: { fontSize: 16, fontWeight: "800", marginTop: 2 },
  rewardsSub: { fontSize: 11, fontWeight: "600", marginTop: 2 },
  sectionCard: { borderRadius: 18, borderWidth: 1, padding: 16, gap: 6 },
  cardTitle: { fontSize: 18, fontWeight: "800" },
  cardSub: { fontSize: 13, fontWeight: "500", marginBottom: 4 },
  ctaButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 44, borderRadius: 14, marginTop: 4 },
  ctaText: { color: "#FFF", fontSize: 14, fontWeight: "700" },
  liveBadgeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  liveBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, borderWidth: 1 },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  liveText: { fontSize: 9, fontWeight: "800" },
  liveTime: { fontSize: 9, fontWeight: "700" },
  ghostCta: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 44, borderRadius: 14, borderWidth: 1.5, marginTop: 4 },
  ghostCtaText: { fontSize: 14, fontWeight: "700" },
  quickGrid: { flexDirection: "row", gap: 8 },
  quickAction: { flex: 1, alignItems: "center", gap: 6, paddingVertical: 12, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  quickIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  quickLabel: { fontSize: 10, fontWeight: "600", textAlign: "center" },
  listSection: { gap: 8 },
  listHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  listTitle: { fontSize: 15, fontWeight: "800" },
  seeAll: { fontSize: 12, fontWeight: "700" },
  venueCard: { width: 140, borderRadius: 16, borderWidth: 1, overflow: "hidden", marginRight: 10, backgroundColor: "rgba(255,255,255,0.03)" },
  venueThumb: { height: 80, alignItems: "center", justifyContent: "center" },
  venueName: { fontSize: 12, fontWeight: "700", paddingHorizontal: 10, paddingTop: 8 },
  venueMeta: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingBottom: 8, paddingTop: 4 },
  hotDot: { width: 5, height: 5, borderRadius: 2.5 },
  hotText: { fontSize: 10, fontWeight: "700" },
  venueArea: { fontSize: 10, fontWeight: "500" },
  roomRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 16, borderWidth: 1 },
  roomIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  roomName: { fontSize: 14, fontWeight: "700" },
  roomCount: { fontSize: 12, fontWeight: "500", marginTop: 2 },
  liveTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  liveTagText: { fontSize: 9, fontWeight: "800" },
  eventCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden", height: 120, justifyContent: "flex-end", padding: 12, backgroundColor: "#1a0d0d" },
  eventOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(10,10,12,0.7)" },
  eventContent: { position: "relative", zIndex: 1 },
  eventType: { fontSize: 9, fontWeight: "800", letterSpacing: 1.2, marginBottom: 4 },
  eventTitle: { fontSize: 15, fontWeight: "800", marginBottom: 2 },
  eventDate: { fontSize: 12, fontWeight: "500" },
  leaderboardCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    backgroundColor: "rgba(255,176,32,0.06)",
  },
  leaderboardTitle: { fontSize: 14, fontWeight: "800" },
  leaderboardSub: { fontSize: 11, fontWeight: "500", marginTop: 2 },
});
