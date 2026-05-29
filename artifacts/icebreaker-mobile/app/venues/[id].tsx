import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { get, post } from "@/lib/api";
import * as Haptics from "expo-haptics";

const VENUE_IMAGES = [
  "https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=800&q=80",
  "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800&q=80",
  "https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=800&q=80",
  "https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=800&q=80",
  "https://images.unsplash.com/photo-1525268323446-0505b6fe7778?w=800&q=80",
  "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80",
];

export default function VenueDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const venueId = Number(id);
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"people" | "rooms">("people");
  const [likedIds, setLikedIds] = useState<Set<number>>(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ["venue", venueId],
    queryFn: () => get(`/api/venues/${venueId}`),
    enabled: !!venueId,
  });

  const checkInMutation = useMutation({
    mutationFn: () => post(`/api/venues/${venueId}/check-in`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["venue", venueId] });
      qc.invalidateQueries({ queryKey: ["venues"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Checked in! 🎉", "You're now visible to others at this venue.");
    },
    onError: () => {
      Alert.alert("Already checked in", "You're already at this venue.");
    },
  });

  const swipeMutation = useMutation({
    mutationFn: ({ swipedId }: { swipedId: number }) =>
      post("/api/swipe", { swipedId, liked: true }),
    onSuccess: (_, { swipedId }) => {
      setLikedIds((prev) => new Set([...prev, swipedId]));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: () => {
      Alert.alert("Couldn't like", "Please try again.");
    },
  });

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 40 }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const v = data?.venue || data || {};
  const rawPeople = data?.checkedInUsers || [];
  const people = Array.from(
    new Map(
      rawPeople.map((p: any) => {
        const userId = p.user?.id ?? p.id;
        return [userId, {
          id: userId,
          name: p.user?.name ?? p.name,
          gender: p.user?.gender ?? p.gender,
          photos: p.user?.photos ?? p.photos ?? [],
          verified: p.user?.verified ?? false,
          checkIn: p.checkIn,
        }];
      })
    ).values()
  ) as any[];

  const venueImage = VENUE_IMAGES[(venueId - 1) % VENUE_IMAGES.length];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Floating back button */}
      <TouchableOpacity
        style={[styles.floatingBack, { top: insets.top + 8 }]}
        onPress={() => router.back()}
      >
        <Feather name="arrow-left" size={18} color="#FFF" />
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 30 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero image */}
        <View style={styles.hero}>
          <Image source={{ uri: venueImage }} style={styles.heroImage} resizeMode="cover" />
          <View style={styles.heroOverlay} />
          <View style={styles.heroContent}>
            <Text style={styles.heroName}>{v.name || "Venue"}</Text>
            <View style={styles.heroMeta}>
              <Feather name="map-pin" size={12} color="rgba(255,255,255,0.8)" />
              <Text style={styles.heroMetaText}>{v.area}, {v.city}</Text>
              {v.type && (
                <>
                  <Text style={styles.heroMetaSep}>·</Text>
                  <Text style={styles.heroMetaText}>{v.type}</Text>
                </>
              )}
            </View>
            {v.partner && (
              <View style={styles.partnerBadge}>
                <Feather name="star" size={10} color="#00CFFF" />
                <Text style={styles.partnerText}>Partner Venue</Text>
              </View>
            )}
          </View>
        </View>

        <View style={{ padding: 16, gap: 14 }}>
          {/* Check-in button */}
          <TouchableOpacity
            style={[styles.checkInBtn, { backgroundColor: colors.primary }]}
            onPress={() => checkInMutation.mutate()}
            disabled={checkInMutation.isPending}
            activeOpacity={0.85}
          >
            {checkInMutation.isPending ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Feather name="map-pin" size={16} color="#FFF" />
                <Text style={styles.checkInText}>Check In Here</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={[styles.statChip, { borderColor: colors.border }]}>
              <Feather name="users" size={13} color={colors.secondary} />
              <Text style={[styles.statText, { color: colors.foreground }]}>
                {people.length} here now
              </Text>
            </View>
            <View style={[styles.statChip, { borderColor: colors.border }]}>
              <Feather name="radio" size={13} color={colors.primary} />
              <Text style={[styles.statText, { color: colors.foreground }]}>
                Live rooms open
              </Text>
            </View>
          </View>

          {/* Tabs */}
          <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
            {(["people", "rooms"] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, activeTab === tab && { borderBottomColor: colors.primary }]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabText, { color: activeTab === tab ? colors.primary : colors.mutedForeground }]}>
                  {tab === "people" ? `People here (${people.length})` : "Live Rooms"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {activeTab === "people" && (
            <View style={{ gap: 8 }}>
              {people.length === 0 ? (
                <View style={styles.empty}>
                  <View style={[styles.emptyIcon, { borderColor: colors.border }]}>
                    <Feather name="users" size={28} color={colors.mutedForeground} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No one checked in yet</Text>
                  <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                    Be the first to check in tonight
                  </Text>
                </View>
              ) : (
                people.map((p: any) => {
                  const photo = (p.photos as string[])?.[0];
                  const isLiked = likedIds.has(p.id);
                  const isLiking = swipeMutation.isPending && !isLiked;
                  return (
                    <View key={p.id} style={[styles.personCard, { borderColor: colors.border }]}>
                      {/* Avatar */}
                      {photo ? (
                        <Image source={{ uri: photo }} style={styles.personPhoto} resizeMode="cover" />
                      ) : (
                        <View style={[styles.personAvatar, { backgroundColor: colors.secondary + "20" }]}>
                          <Text style={[styles.personAvatarText, { color: colors.secondary }]}>
                            {p.name?.[0]?.toUpperCase() || "?"}
                          </Text>
                        </View>
                      )}

                      {/* Info */}
                      <View style={{ flex: 1 }}>
                        <View style={styles.personNameRow}>
                          <Text style={[styles.personName, { color: colors.foreground }]}>{p.name}</Text>
                          {p.verified && (
                            <Feather name="check-circle" size={12} color={colors.secondary} />
                          )}
                        </View>
                        <Text style={[styles.personMeta, { color: colors.mutedForeground }]}>
                          {p.gender === "female" ? "Woman" : p.gender === "male" ? "Man" : p.gender || "Here tonight"}
                        </Text>
                      </View>

                      {/* Actions */}
                      <View style={styles.personActions}>
                        <TouchableOpacity
                          style={[
                            styles.likeBtn,
                            isLiked
                              ? { backgroundColor: colors.primary + "20", borderWidth: 1, borderColor: colors.primary + "50" }
                              : { backgroundColor: colors.primary },
                          ]}
                          onPress={() => {
                            if (!isLiked) {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              swipeMutation.mutate({ swipedId: p.id });
                            }
                          }}
                          disabled={isLiked || isLiking}
                          activeOpacity={0.8}
                        >
                          <Feather
                            name={isLiked ? "check" : "heart"}
                            size={14}
                            color={isLiked ? colors.primary : "#FFF"}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.giftBtn, { borderColor: colors.border }]}
                          onPress={() => router.push(`/gift/${p.id}`)}
                          activeOpacity={0.8}
                        >
                          <Feather name="gift" size={14} color={colors.secondary} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          )}

          {activeTab === "rooms" && (
            <View style={styles.empty}>
              <View style={[styles.emptyIcon, { borderColor: colors.border }]}>
                <Feather name="radio" size={28} color={colors.mutedForeground} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Live rooms appear here</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                Virtual rooms open when the event starts
              </Text>
              <TouchableOpacity
                style={[styles.roomsBtn, { backgroundColor: colors.secondary + "15", borderColor: colors.secondary + "40" }]}
                onPress={() => router.push("/rooms")}
                activeOpacity={0.8}
              >
                <Feather name="radio" size={14} color={colors.secondary} />
                <Text style={[styles.roomsBtnText, { color: colors.secondary }]}>Browse all rooms</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  floatingBack: {
    position: "absolute",
    left: 16,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  hero: { width: "100%", height: 240, position: "relative" },
  heroImage: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  heroContent: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    padding: 16,
    paddingBottom: 20,
  },
  heroName: { fontSize: 24, fontFamily: "PlusJakartaSans_800ExtraBold", color: "#FFF" },
  heroMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  heroMetaText: { fontSize: 12, fontFamily: "PlusJakartaSans_500Medium", color: "rgba(255,255,255,0.8)" },
  heroMetaSep: { color: "rgba(255,255,255,0.5)", fontSize: 12 },
  partnerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "rgba(0,207,255,0.2)",
    borderWidth: 1,
    borderColor: "rgba(0,207,255,0.4)",
  },
  partnerText: { fontSize: 10, fontFamily: "PlusJakartaSans_800ExtraBold", color: "#00CFFF" },
  checkInBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 50,
    borderRadius: 16,
  },
  checkInText: { color: "#FFF", fontSize: 15, fontFamily: "PlusJakartaSans_700Bold" },
  statsRow: { flexDirection: "row", gap: 8 },
  statChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  statText: { fontSize: 12, fontFamily: "PlusJakartaSans_600SemiBold" },
  tabBar: { flexDirection: "row", borderBottomWidth: 1 },
  tab: { flex: 1, alignItems: "center", paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabText: { fontSize: 13, fontFamily: "PlusJakartaSans_700Bold" },
  personCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  personPhoto: { width: 48, height: 48, borderRadius: 24 },
  personAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  personAvatarText: { fontSize: 18, fontFamily: "PlusJakartaSans_800ExtraBold" },
  personNameRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  personName: { fontSize: 14, fontFamily: "PlusJakartaSans_700Bold" },
  personMeta: { fontSize: 11, fontFamily: "PlusJakartaSans_500Medium", marginTop: 2 },
  personActions: { flexDirection: "row", gap: 6 },
  likeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  giftBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  empty: { alignItems: "center", paddingVertical: 40, gap: 10 },
  emptyIcon: { width: 60, height: 60, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 15, fontFamily: "PlusJakartaSans_700Bold" },
  emptyText: { fontSize: 12, fontFamily: "PlusJakartaSans_500Medium", textAlign: "center" },
  roomsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
  },
  roomsBtnText: { fontSize: 13, fontFamily: "PlusJakartaSans_700Bold" },
});
