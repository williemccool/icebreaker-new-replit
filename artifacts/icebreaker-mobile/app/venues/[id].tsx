import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { get, post } from "@/lib/api";
import * as Haptics from "expo-haptics";

export default function VenueDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const venueId = Number(id);
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"people" | "rooms">("people");

  const { data: venue, isLoading } = useQuery({
    queryKey: ["venue", venueId],
    queryFn: () => get(`/api/venues/${venueId}`),
    enabled: !!venueId,
  });

  const { data: venueData } = useQuery({
    queryKey: ["venue-detail", venueId],
    queryFn: () => get(`/api/venues/${venueId}`),
    enabled: !!venueId,
  });

  const checkInMutation = useMutation({
    mutationFn: () => post(`/api/venues/${venueId}/check-in`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["venue-checkins", venueId] });
      qc.invalidateQueries({ queryKey: ["venues"] });
    },
  });

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 40 }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const v = venue || {};
  const people = venueData?.checkedInUsers || [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={[styles.backBtn, { borderColor: colors.border }]} onPress={() => router.back()}>
          <Feather name="arrow-left" size={18} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
          {v.name || "Venue"}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 30, padding: 16, gap: 14 }}>
        {/* Venue card */}
        <View style={[styles.venueCard, { borderColor: colors.border }]}>
          <View style={[styles.venueThumb, { backgroundColor: colors.primary + "15" }]}>
            <Feather name="map-pin" size={40} color={colors.primary} />
          </View>
          <View style={styles.venueBody}>
            <Text style={[styles.venueName, { color: colors.foreground }]}>{v.name}</Text>
            <Text style={[styles.venueType, { color: colors.mutedForeground }]}>{v.type}</Text>
            <View style={styles.venueLocation}>
              <Feather name="map-pin" size={12} color={colors.mutedForeground} />
              <Text style={[styles.venueLocationText, { color: colors.mutedForeground }]}>
                {v.area}, {v.city}
              </Text>
            </View>
            {v.partner && (
              <View style={[styles.partnerBadge, { borderColor: colors.secondary + "40" }]}>
                <Text style={[styles.partnerText, { color: colors.secondary }]}>Partner Venue</Text>
              </View>
            )}
            <TouchableOpacity
              style={[styles.checkInBtn, { backgroundColor: colors.primary }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                checkInMutation.mutate();
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.checkInText}>Check In</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "people" && { borderBottomColor: colors.primary }]}
            onPress={() => setActiveTab("people")}
          >
            <Text style={[styles.tabText, { color: activeTab === "people" ? colors.primary : colors.mutedForeground }]}>
              People here ({people.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "rooms" && { borderBottomColor: colors.primary }]}
            onPress={() => setActiveTab("rooms")}
          >
            <Text style={[styles.tabText, { color: activeTab === "rooms" ? colors.primary : colors.mutedForeground }]}>
              Live Rooms
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === "people" && (
          <View key="people" style={{ gap: 8 }}>
            {people.length === 0 ? (
              <View style={styles.empty}>
                <Feather name="users" size={28} color={colors.mutedForeground} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No one checked in yet</Text>
              </View>
            ) : (
              people.map((p: any) => (
                <View key={p.id} style={[styles.personCard, { borderColor: colors.border }]}>
                  <View style={[styles.personAvatar, { backgroundColor: colors.secondary + "20" }]}>
                    <Text style={[styles.personAvatarText, { color: colors.secondary }]}>
                      {p.name?.[0]?.toUpperCase() || "?"}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.personName, { color: colors.foreground }]}>{p.name}</Text>
                    <Text style={[styles.personMeta, { color: colors.mutedForeground }]}>
                      {p.gender} · Checked in recently
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.likeBtn, { backgroundColor: colors.primary }]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      post("/api/swipe", { swipedId: p.id, liked: true });
                    }}
                  >
                    <Feather name="heart" size={14} color="#FFF" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === "rooms" && (
          <View key="rooms" style={styles.empty}>
            <Feather name="radio" size={28} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Live rooms appear here</Text>
            <TouchableOpacity
              style={[styles.roomsBtn, { backgroundColor: colors.secondary + "15", borderColor: colors.secondary + "40" }]}
              onPress={() => router.push("/rooms")}
            >
              <Text style={[styles.roomsBtnText, { color: colors.secondary }]}>Browse all rooms</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
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
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  backBtn: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 16, fontFamily: "PlusJakartaSans_800ExtraBold", flex: 1, textAlign: "center", marginHorizontal: 8 },
  venueCard: { borderRadius: 18, borderWidth: 1, overflow: "hidden" },
  venueThumb: { height: 160, alignItems: "center", justifyContent: "center" },
  venueBody: { padding: 16, gap: 6 },
  venueName: { fontSize: 18, fontFamily: "PlusJakartaSans_800ExtraBold" },
  venueType: { fontSize: 13, fontFamily: "PlusJakartaSans_500Medium" },
  venueLocation: { flexDirection: "row", alignItems: "center", gap: 4 },
  venueLocationText: { fontSize: 12, fontFamily: "PlusJakartaSans_500Medium" },
  partnerBadge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1, marginTop: 4 },
  partnerText: { fontSize: 10, fontFamily: "PlusJakartaSans_800ExtraBold" },
  checkInBtn: { height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 8 },
  checkInText: { color: "#FFF", fontSize: 15, fontFamily: "PlusJakartaSans_700Bold" },
  tabBar: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)" },
  tab: { flex: 1, alignItems: "center", paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabText: { fontSize: 13, fontFamily: "PlusJakartaSans_700Bold" },
  personCard: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 16, borderWidth: 1 },
  personAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  personAvatarText: { fontSize: 16, fontFamily: "PlusJakartaSans_800ExtraBold" },
  personName: { fontSize: 14, fontFamily: "PlusJakartaSans_700Bold" },
  personMeta: { fontSize: 11, fontFamily: "PlusJakartaSans_500Medium", marginTop: 2 },
  likeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", paddingVertical: 40, gap: 10 },
  emptyText: { fontSize: 13, fontFamily: "PlusJakartaSans_600SemiBold" },
  roomsBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, borderWidth: 1, marginTop: 4 },
  roomsBtnText: { fontSize: 13, fontFamily: "PlusJakartaSans_700Bold" },
});
