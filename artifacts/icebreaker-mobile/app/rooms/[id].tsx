import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { get, post } from "@/lib/api";
import * as Haptics from "expo-haptics";

const AVATARS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&q=80",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&q=80",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&q=80",
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=600&q=80",
];

const PROMPTS = [
  "The worst first date idea is\u2026",
  "You'd never catch me\u2026",
  "My love language is\u2026",
];

export default function RoomDiscoveryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const roomId = Number(id);
  const [index, setIndex] = useState(0);
  const [leaving, setLeaving] = useState<"left" | "right" | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["room", roomId],
    queryFn: () => get(`/api/rooms/${roomId}`),
    enabled: !!roomId,
  });

  const swipeMutation = useMutation({
    mutationFn: ({ swipedId, liked }: { swipedId: number; liked: boolean }) =>
      post("/api/swipe", { swipedId, liked }),
  });

  const room = data?.room;
  const profiles = (data?.participants || []).map((u: any, i: number) => ({
    ...u,
    photo: (u.photos as string[])?.[0] || AVATARS[i % AVATARS.length],
    prompt: PROMPTS[i % PROMPTS.length],
    answer: u.bio || "Love meeting new people",
    age: u.dob ? Math.floor((Date.now() - new Date(u.dob).getTime()) / (365.25 * 24 * 3600 * 1000)) : 24,
  }));

  const current = profiles[index];
  const done = index >= profiles.length;

  const handleAction = (action: "like" | "pass") => {
    if (!current) return;
    setLeaving(action === "like" ? "right" : "left");
    if (current.id) {
      swipeMutation.mutate({ swipedId: current.id, liked: action === "like" });
      if (action === "like") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }
    setTimeout(() => {
      setLeaving(null);
      setIndex((i) => i + 1);
    }, 350);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 40 }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 8 }]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={[styles.iconBtn, { borderColor: colors.border }]} onPress={() => router.back()}>
          <Feather name="arrow-left" size={18} color={colors.foreground} />
        </TouchableOpacity>
        <View style={[styles.roomPill, { borderColor: colors.border }]}>
          <View style={[styles.liveDot, { backgroundColor: colors.primary }]} />
          <Text style={[styles.roomName, { color: colors.foreground }]} numberOfLines={1}>{room?.name || "Live Room"}</Text>
        </View>
        <View style={[styles.countPill, { borderColor: colors.secondary + "30" }]}>
          <Feather name="users" size={12} color={colors.secondary} />
          <Text style={[styles.countText, { color: colors.secondary }]}>{profiles.length}</Text>
        </View>
      </View>

      {/* Card area */}
      <View style={styles.cardArea}>
        {done || profiles.length === 0 ? (
          <View style={styles.doneState}>
            <View style={[styles.doneIcon, { borderColor: colors.primary + "30" }]}>
              <Feather name="heart" size={32} color={colors.primary} />
            </View>
            <Text style={[styles.doneTitle, { color: colors.foreground }]}>You have seen everyone!</Text>
            <Text style={[styles.doneSub, { color: colors.mutedForeground }]}>Check back as more people join</Text>
            <TouchableOpacity style={[styles.doneBtn, { backgroundColor: colors.primary }]} onPress={() => router.back()}>
              <Text style={styles.doneBtnText}>Back to Rooms</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.cardWrap}>
            {/* Profile card */}
            <View
              style={[
                styles.card,
                {
                  borderColor: colors.primary + "30",
                  transform: leaving === "right" ? [{ translateX: 200 }, { rotate: "15deg" }] : leaving === "left" ? [{ translateX: -200 }, { rotate: "-15deg" }] : undefined,
                },
              ]}
            >
              <View style={[styles.photoArea, { backgroundColor: colors.primary + "10" }]}>
                <Feather name="user" size={60} color={colors.mutedForeground} />
              </View>
              <View style={styles.cardOverlay}>
                <View style={[styles.promptBox, { borderColor: colors.border }]}>
                  <Text style={[styles.prompt, { color: colors.secondary }]}>{current.prompt}</Text>
                  <Text style={[styles.answer, { color: colors.foreground }]}>{current.answer}</Text>
                </View>
                <View style={styles.profileInfo}>
                  <View>
                    <Text style={[styles.profileName, { color: colors.foreground }]}>
                      {current.name || "Unknown"}, {current.age}
                    </Text>
                    {current.verified && (
                      <View style={styles.verifiedRow}>
                        <Feather name="check-circle" size={12} color={colors.secondary} />
                        <Text style={[styles.verifiedText, { color: colors.secondary }]}>Selfie-Verified</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            </View>

            {/* Dots */}
            <View style={styles.dotsRow}>
              {profiles.map((_: any, i: number) => (
                <View
                  key={i}
                  style={{
                    width: i === index ? 18 : 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: i === index ? colors.primary : i < index ? colors.primary + "40" : "rgba(255,255,255,0.15)",
                  }}
                />
              ))}
            </View>

            {/* Action buttons */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.passBtn, { borderColor: colors.border }]}            
                onPress={() => handleAction("pass")}
                activeOpacity={0.8}
              >
                <Feather name="x" size={24} color={colors.mutedForeground} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.likeBtn, { backgroundColor: colors.primary }]}                
                onPress={() => handleAction("like")}
                activeOpacity={0.8}
              >
                <Feather name="heart" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 10 },
  iconBtn: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  roomPill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, backgroundColor: "rgba(255,255,255,0.04)", maxWidth: "55%" },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  roomName: { fontSize: 12, fontWeight: "700" },
  countPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
  countText: { fontSize: 11, fontWeight: "700" },
  cardArea: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  cardWrap: { width: "100%", maxWidth: 360, alignItems: "center", gap: 16 },
  card: { width: "100%", aspectRatio: 3 / 4, borderRadius: 24, borderWidth: 1.5, overflow: "hidden", backgroundColor: "#0D0D12" },
  photoArea: { flex: 1, alignItems: "center", justifyContent: "center" },
  cardOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: "space-between", padding: 16 },
  promptBox: { padding: 12, borderRadius: 14, borderWidth: 1, backgroundColor: "rgba(10,10,12,0.7)" },
  prompt: { fontSize: 10, fontWeight: "800", letterSpacing: 0.8, marginBottom: 4 },
  answer: { fontSize: 14, fontWeight: "600" },
  profileInfo: { paddingBottom: 8 },
  profileName: { fontSize: 22, fontWeight: "800" },
  verifiedRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  verifiedText: { fontSize: 11, fontWeight: "700" },
  dotsRow: { flexDirection: "row", gap: 4 },
  actions: { flexDirection: "row", gap: 24, marginTop: 4 },
  passBtn: { width: 64, height: 64, borderRadius: 32, borderWidth: 1.5, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.04)" },
  likeBtn: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  doneState: { alignItems: "center", gap: 14 },
  doneIcon: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  doneTitle: { fontSize: 18, fontWeight: "800" },
  doneSub: { fontSize: 13, fontWeight: "500", color: "#8A8FA8" },
  doneBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 16, marginTop: 8 },
  doneBtnText: { color: "#FFF", fontSize: 14, fontWeight: "700" },
});
