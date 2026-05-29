import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  ScrollView,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { get, post } from "@/lib/api";
import * as Haptics from "expo-haptics";

const PROMPTS = [
  "The worst first date idea is…",
  "What's your most controversial music opinion?",
  "Describe your perfect Sunday in 5 words",
  "You'd never catch me…",
  "My love language is…",
];

const AVATARS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&q=80",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&q=80",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&q=80",
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=600&q=80",
  "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=600&q=80",
];

type Phase = "entry" | "discovery";

export default function RoomScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const roomId = Number(id);

  const [phase, setPhase] = useState<Phase>("entry");
  const [tab, setTab] = useState<"dating" | "crew" | "20s30s">("dating");
  const [answer, setAnswer] = useState("");
  const [joining, setJoining] = useState(false);

  // Discovery state
  const [index, setIndex] = useState(0);
  const [leaving, setLeaving] = useState<"left" | "right" | null>(null);
  const [actionsOpen, setActionsOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["room", roomId],
    queryFn: () => get(`/api/rooms/${roomId}`),
    enabled: !!roomId,
  });

  const swipeMutation = useMutation({
    mutationFn: ({ swipedId, liked }: { swipedId: number; liked: boolean }) =>
      post("/api/swipe", { swipedId, liked }),
  });

  const reportMutation = useMutation({
    mutationFn: (reportedUserId: number) =>
      post("/api/reports", { reportedUserId, contentType: "user", reason: "Reported from live room" }),
    onSuccess: () => Alert.alert("Reported", "Thanks — our team will review within 24h."),
  });

  const blockMutation = useMutation({
    mutationFn: (blockedId: number) => post("/api/blocks", { blockedId }),
    onSuccess: () => {
      Alert.alert("Blocked", "You won't see them again.");
      setActionsOpen(false);
      setIndex((i) => i + 1);
    },
  });

  const room = data?.room;
  const profiles = (data?.participants || []).map((u: any, i: number) => ({
    ...u,
    photo: (u.photos as string[])?.[0] || AVATARS[i % AVATARS.length],
    prompt: PROMPTS[i % PROMPTS.length],
    answer: u.bio || "Love meeting new people",
    age: u.dob
      ? Math.floor((Date.now() - new Date(u.dob).getTime()) / (365.25 * 24 * 3600 * 1000))
      : 24,
  }));

  const minsLeft = data?.minsLeft ?? 0;
  const participants = profiles.length;
  const capacity = room?.capacity ?? 20;
  const female = Math.ceil(participants * (room?.femaleRatio ?? 0.5));
  const male = participants - female;
  const prompt = PROMPTS[(roomId ?? 0) % PROMPTS.length];

  const current = profiles[index];
  const done = index >= profiles.length;

  const handleAction = (action: "like" | "pass") => {
    if (!current) return;
    setLeaving(action === "like" ? "right" : "left");
    if (current.id) {
      swipeMutation.mutate({ swipedId: current.id, liked: action === "like" });
      if (action === "like") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
    setTimeout(() => {
      setLeaving(null);
      setIndex((i) => i + 1);
    }, 350);
  };

  const handleJoin = () => {
    if (!answer.trim()) {
      Alert.alert("Answer required", "Please answer the icebreaker prompt to join.");
      return;
    }
    setJoining(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => {
      setJoining(false);
      setPhase("discovery");
    }, 600);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 40 }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  // ── Entry lobby phase ──────────────────────────────────────────────────────
  if (phase === "entry") {
    const isLive = room?.active ?? true;
    return (
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={[styles.entryHeader, { paddingTop: insets.top + 10 }]}>
            <TouchableOpacity style={[styles.iconBtn, { borderColor: colors.border }]} onPress={() => router.back()}>
              <Feather name="arrow-left" size={18} color={colors.foreground} />
            </TouchableOpacity>
            <View style={[styles.lobbyBadge, { borderColor: isLive ? "rgba(0,200,80,0.3)" : "rgba(255,176,0,0.3)" }]}>
              <View style={[styles.lobbyDot, { backgroundColor: isLive ? "#00C850" : "#FFB000" }]} />
              <Text style={[styles.lobbyBadgeText, { color: isLive ? "#00C850" : "#FFB000" }]}>
                {isLive ? "ONLINE LOBBY" : "OPENS SOON"}
              </Text>
            </View>
            <View style={{ width: 36 }} />
          </View>

          <View style={styles.entryContent}>
            {/* Filter tabs */}
            <View style={styles.filterRow}>
              {(["dating", "crew", "20s30s"] as const).map((k) => (
                <TouchableOpacity
                  key={k}
                  style={[styles.filterTab, tab === k && styles.filterTabActive]}
                  onPress={() => setTab(k)}
                >
                  <Text style={[styles.filterTabText, { color: tab === k ? colors.primary : colors.mutedForeground }]}>
                    {k === "20s30s" ? "20S-30S" : k.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Title */}
            <View style={{ alignItems: "center", gap: 8 }}>
              <Text style={[styles.entryTitle, { color: colors.foreground }]} numberOfLines={2}>
                {room?.name || "Live Room"}
              </Text>
              <View style={[styles.venueTag, { borderColor: colors.border }]}>
                <Feather name="map-pin" size={11} color={colors.primary} />
                <Text style={[styles.venueTagText, { color: colors.mutedForeground }]}>
                  Room for{" "}
                  <Text style={{ color: colors.foreground }}>
                    {(data as any)?.venueName || "tonight's venue"}
                  </Text>
                </Text>
              </View>
              <View style={styles.liveInfo}>
                <Feather name="clock" size={11} color={colors.primary} />
                <Text style={[styles.liveInfoText, { color: colors.mutedForeground }]}>
                  {isLive ? `Live now · ${minsLeft}m left` : "Starts soon"}
                </Text>
                <Text style={{ color: colors.mutedForeground }}>·</Text>
                <Text style={[styles.liveInfoText, { color: colors.mutedForeground }]}>Live Duration: 1h</Text>
              </View>
            </View>

            {/* Stats grid */}
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { borderColor: colors.border }]}>
                <View style={styles.statCardHeader}>
                  <Feather name="users" size={14} color={colors.mutedForeground} />
                  <Text style={styles.openBadge}>• OPEN</Text>
                </View>
                <Text style={[styles.statBig, { color: colors.foreground }]}>
                  {participants}
                  <Text style={[styles.statSmall, { color: colors.mutedForeground }]}>/{capacity}</Text>
                </Text>
                <Text style={styles.statLabel}>Capacity</Text>
                <View style={[styles.progressBg, { backgroundColor: colors.border }]}>
                  <View style={[styles.progressFill, { width: `${Math.min(100, (participants / capacity) * 100)}%` as any }]} />
                </View>
              </View>

              <View style={[styles.statCard, { borderColor: colors.border }]}>
                <View style={styles.statCardHeader}>
                  <Feather name="users" size={14} color={colors.mutedForeground} />
                </View>
                <Text style={[styles.statBig, { color: colors.foreground }]}>
                  <Text style={{ color: "#FF1B8D" }}>{female}W</Text>
                  <Text style={[styles.statSmall, { color: colors.mutedForeground }]}> vs </Text>
                  <Text style={{ color: "#00CFFF" }}>{male}M</Text>
                </Text>
                <Text style={styles.statLabel}>Current Ratio</Text>
                <View style={styles.ratioBar}>
                  <View style={[styles.ratioFill, { width: `${(female / Math.max(participants, 1)) * 100}%` as any, backgroundColor: "#FF1B8D" }]} />
                  <View style={[styles.ratioFill, { width: `${(male / Math.max(participants, 1)) * 100}%` as any, backgroundColor: "#00CFFF" }]} />
                </View>
              </View>
            </View>

            {/* Entry status */}
            <View style={[styles.entryStatusCard, { borderColor: colors.border }]}>
              <Text style={[styles.sectionLabel, { color: colors.primary }]}>✦ YOUR ENTRY STATUS</Text>
              <View style={styles.entryRow}>
                <View style={[styles.entryIconWrap, { backgroundColor: "rgba(255,27,141,0.2)" }]}>
                  <Feather name="star" size={16} color="#FF1B8D" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.entryRowTitle, { color: colors.foreground }]}>Free Entry</Text>
                  <Text style={styles.entryReward}>+20 Cubes Reward</Text>
                </View>
                <View style={styles.qualifiedBadge}>
                  <Text style={styles.qualifiedText}>QUALIFIED</Text>
                </View>
              </View>
              <View style={[styles.entryRowDim, { borderColor: colors.border }]}>
                <View style={[styles.entryIconWrap, { backgroundColor: "rgba(0,207,255,0.1)" }]}>
                  <Text style={{ color: "#00CFFF", fontFamily: "PlusJakartaSans_700Bold" }}>♂</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.entryRowTitle, { color: colors.foreground, opacity: 0.6 }]}>40 Cubes</Text>
                  <Text style={[styles.entryNote, { color: colors.mutedForeground }]}>or Night Pass</Text>
                </View>
              </View>
            </View>

            {/* Icebreaker prompt */}
            <View style={[styles.promptCard, { borderColor: "rgba(255,27,141,0.25)" }]}>
              <Text style={[styles.sectionLabel, { color: colors.primary }]}>ICEBREAKER PROMPT</Text>
              <Text style={[styles.promptText, { color: colors.foreground }]}>"{prompt}"</Text>
              <TextInput
                value={answer}
                onChangeText={setAnswer}
                placeholder="Type your answer to join…"
                placeholderTextColor="#8A8FA8"
                multiline
                style={[styles.promptInput, { borderColor: "rgba(255,27,141,0.3)", color: colors.foreground }]}
              />
              <Text style={[styles.promptHint, { color: colors.mutedForeground }]}>*Required to enter the live room</Text>
            </View>

            {/* Safety */}
            <View style={[styles.safetyCard, { borderColor: "rgba(0,207,255,0.2)" }]}>
              <Text style={[styles.sectionLabel, { color: "#00CFFF" }]}>🛡 SAFETY FIRST</Text>
              {["No screenshots allowed inside the room.", "Respect boundaries. No means no.", "Comfort Mode applies here."].map((item) => (
                <Text key={item} style={[styles.safetyItem, { color: colors.mutedForeground }]}>• {item}</Text>
              ))}
              <View style={styles.safetyFooter}>
                <View style={styles.safetyBadge}>
                  <View style={styles.safetyDot} />
                  <Text style={styles.safetyBadgeText}>Comfort Mode ON</Text>
                </View>
                <Text style={[styles.safetyNote, { color: colors.mutedForeground }]}>· Report anytime</Text>
              </View>
            </View>

            <Text style={[styles.footerNote, { color: colors.mutedForeground }]}>
              Virtual space linked to the physical venue. You are interacting online.
            </Text>
          </View>
        </ScrollView>

        {/* Sticky join button */}
        <View style={[styles.stickyBottom, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            style={[styles.joinLiveBtn, (!answer.trim() || joining) && styles.joinLiveBtnDim]}
            onPress={handleJoin}
            disabled={!answer.trim() || joining}
            activeOpacity={0.85}
          >
            <Text style={styles.joinLiveText}>{joining ? "Joining…" : "Join Live Room"}</Text>
            <Feather name="arrow-right" size={18} color="#FFF" />
          </TouchableOpacity>
          <Text style={[styles.joinNote, { color: colors.mutedForeground }]}>By entering, you agree to the House Rules</Text>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // ── Discovery / swipe phase ────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 8 }]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={[styles.iconBtn, { borderColor: colors.border }]} onPress={() => setPhase("entry")}>
          <Feather name="arrow-left" size={18} color={colors.foreground} />
        </TouchableOpacity>
        <View style={[styles.roomPill, { borderColor: colors.border }]}>
          <View style={[styles.liveDot2, { backgroundColor: colors.primary }]} />
          <Text style={[styles.roomName, { color: colors.foreground }]} numberOfLines={1}>
            {room?.name || "Live Room"}
          </Text>
          <Text style={[styles.roomSep, { color: colors.mutedForeground }]}>·</Text>
          <Feather name="clock" size={11} color={colors.mutedForeground} />
          <Text style={[styles.roomTime, { color: colors.mutedForeground }]}>{minsLeft}m</Text>
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
            <TouchableOpacity
              style={[styles.doneBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.back()}
            >
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
                  transform: leaving === "right"
                    ? [{ translateX: 200 }, { rotate: "15deg" }]
                    : leaving === "left"
                    ? [{ translateX: -200 }, { rotate: "-15deg" }]
                    : [],
                },
              ]}
            >
              {/* Photo */}
              {current.photo ? (
                <Image
                  source={{ uri: current.photo }}
                  style={styles.cardPhoto}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.photoPlaceholder, { backgroundColor: colors.primary + "10" }]}>
                  <Feather name="user" size={60} color={colors.mutedForeground} />
                </View>
              )}

              {/* Dark scrim — bottom 50% of the card so text is always readable */}
              <View style={styles.cardScrim} />

              {/* Content overlay */}
              <View style={styles.cardOverlay}>
                {/* Prompt box (top) */}
                <View style={[styles.promptBox, { borderColor: "rgba(255,255,255,0.15)" }]}>
                  <Text style={[styles.promptLabel, { color: "#00CFFF" }]}>{current.prompt}</Text>
                  <Text style={[styles.promptAnswer, { color: "#FFF" }]}>{current.answer}</Text>
                </View>

                {/* Profile footer (bottom — sits on dark scrim so always readable) */}
                <View style={styles.profileFooter}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.profileName}>
                      {current.name || "Unknown"}, {current.age}
                    </Text>
                    {current.verified && (
                      <View style={styles.verifiedRow}>
                        <Feather name="check-circle" size={13} color="#00CFFF" />
                        <Text style={[styles.verifiedText, { color: "#00CFFF" }]}>Selfie-Verified</Text>
                      </View>
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.moreBtn}
                    onPress={() => setActionsOpen(true)}
                  >
                    <Text style={styles.moreText}>⋯</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Progress dots */}
            <View style={styles.dotsRow}>
              {profiles.map((_: any, i: number) => (
                <View
                  key={i}
                  style={{
                    width: i === index ? 18 : 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor:
                      i === index
                        ? colors.primary
                        : i < index
                        ? colors.primary + "40"
                        : "rgba(255,255,255,0.15)",
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
                <Feather name="x" size={26} color={colors.mutedForeground} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.likeBtn, { backgroundColor: colors.primary }]}
                onPress={() => handleAction("like")}
                activeOpacity={0.8}
              >
                <Feather name="heart" size={26} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Actions bottom sheet */}
      {actionsOpen && current?.id && (
        <TouchableOpacity
          style={styles.sheetOverlay}
          onPress={() => setActionsOpen(false)}
          activeOpacity={1}
        >
          <TouchableOpacity
            style={[styles.sheet, { backgroundColor: "#0F0F14", borderColor: "rgba(255,255,255,0.08)" }]}
            activeOpacity={1}
          >
            <Text style={[styles.sheetName, { color: colors.foreground }]}>{current.name || "User"}</Text>
            <TouchableOpacity
              style={[styles.sheetBtn, { backgroundColor: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)" }]}
              onPress={() => { reportMutation.mutate(current.id); setActionsOpen(false); }}
            >
              <Feather name="flag" size={16} color="#FACC15" />
              <Text style={[styles.sheetBtnText, { color: colors.foreground }]}>Report this user</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sheetBtn, { backgroundColor: "rgba(255,80,80,0.08)", borderColor: "rgba(255,80,80,0.25)" }]}
              onPress={() => blockMutation.mutate(current.id)}
            >
              <Feather name="slash" size={16} color="#FF5050" />
              <Text style={[styles.sheetBtnText, { color: "#FF5050" }]}>Block this user</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setActionsOpen(false)}>
              <Text style={[styles.sheetCancel, { color: colors.mutedForeground }]}>Cancel</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // ── Entry ──
  entryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  iconBtn: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  lobbyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: "rgba(0,200,80,0.08)",
  },
  lobbyDot: { width: 6, height: 6, borderRadius: 3 },
  lobbyBadgeText: { fontSize: 10, fontFamily: "PlusJakartaSans_800ExtraBold" },
  entryContent: { paddingHorizontal: 16, gap: 16 },
  filterRow: { flexDirection: "row", gap: 8 },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  filterTabActive: { borderColor: "rgba(255,27,141,0.5)", backgroundColor: "rgba(255,27,141,0.12)" },
  filterTabText: { fontSize: 10, fontFamily: "PlusJakartaSans_800ExtraBold" },
  entryTitle: { fontSize: 32, fontFamily: "PlusJakartaSans_800ExtraBold", textAlign: "center", lineHeight: 38 },
  venueTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  venueTagText: { fontSize: 11, fontFamily: "PlusJakartaSans_600SemiBold" },
  liveInfo: { flexDirection: "row", alignItems: "center", gap: 5 },
  liveInfoText: { fontSize: 11, fontFamily: "PlusJakartaSans_700Bold" },
  statsGrid: { flexDirection: "row", gap: 10 },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.03)",
    gap: 4,
  },
  statCardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  openBadge: { fontSize: 9, fontFamily: "PlusJakartaSans_700Bold", color: "#00C850" },
  statBig: { fontSize: 22, fontFamily: "PlusJakartaSans_800ExtraBold" },
  statSmall: { fontSize: 14, fontFamily: "PlusJakartaSans_500Medium" },
  statLabel: { fontSize: 9, fontFamily: "PlusJakartaSans_700Bold", color: "#8A8FA8", letterSpacing: 0.5 },
  progressBg: { height: 4, borderRadius: 2, overflow: "hidden", marginTop: 4 },
  progressFill: { height: "100%" as any, borderRadius: 2, backgroundColor: "#FF1B8D" },
  ratioBar: { flexDirection: "row", height: 4, borderRadius: 2, overflow: "hidden", marginTop: 4 },
  ratioFill: { height: "100%" as any },
  entryStatusCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.02)",
    gap: 8,
  },
  sectionLabel: { fontSize: 9, fontFamily: "PlusJakartaSans_800ExtraBold", letterSpacing: 1.2 },
  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 12,
    backgroundColor: "rgba(255,27,141,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,27,141,0.2)",
  },
  entryRowDim: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    opacity: 0.6,
  },
  entryIconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  entryRowTitle: { fontSize: 14, fontFamily: "PlusJakartaSans_800ExtraBold" },
  entryReward: { fontSize: 11, fontFamily: "PlusJakartaSans_700Bold", color: "#00CFFF" },
  entryNote: { fontSize: 11, fontFamily: "PlusJakartaSans_500Medium" },
  qualifiedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "rgba(0,200,80,0.15)",
    borderWidth: 1,
    borderColor: "rgba(0,200,80,0.3)",
  },
  qualifiedText: { fontSize: 9, fontFamily: "PlusJakartaSans_800ExtraBold", color: "#00C850" },
  promptCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    backgroundColor: "rgba(255,27,141,0.03)",
    gap: 10,
  },
  promptText: { fontSize: 17, fontFamily: "PlusJakartaSans_800ExtraBold", lineHeight: 24 },
  promptInput: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: "PlusJakartaSans_500Medium",
    backgroundColor: "rgba(0,0,0,0.3)",
    minHeight: 70,
    textAlignVertical: "top",
  },
  promptHint: { fontSize: 10, fontFamily: "PlusJakartaSans_500Medium" },
  safetyCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    backgroundColor: "rgba(0,207,255,0.03)",
    gap: 6,
  },
  safetyItem: { fontSize: 12, fontFamily: "PlusJakartaSans_500Medium" },
  safetyFooter: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  safetyBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  safetyDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: "#FF1B8D" },
  safetyBadgeText: { fontSize: 10, fontFamily: "PlusJakartaSans_700Bold", color: "#F0F2F7" },
  safetyNote: { fontSize: 10, fontFamily: "PlusJakartaSans_600SemiBold", marginLeft: 6 },
  footerNote: { fontSize: 11, fontFamily: "PlusJakartaSans_500Medium", textAlign: "center", paddingBottom: 8 },
  stickyBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: "rgba(10,10,12,0.95)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
    gap: 6,
  },
  joinLiveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 54,
    borderRadius: 18,
    backgroundColor: "#FF1B8D",
  },
  joinLiveBtnDim: { opacity: 0.55 },
  joinLiveText: { color: "#FFF", fontSize: 16, fontFamily: "PlusJakartaSans_800ExtraBold" },
  joinNote: { fontSize: 10, fontFamily: "PlusJakartaSans_500Medium", textAlign: "center" },

  // ── Discovery ──
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  roomPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
    maxWidth: "55%",
  },
  liveDot2: { width: 6, height: 6, borderRadius: 3 },
  roomName: { fontSize: 12, fontFamily: "PlusJakartaSans_700Bold", flex: 1 },
  roomSep: { fontSize: 12 },
  roomTime: { fontSize: 11, fontFamily: "PlusJakartaSans_600SemiBold" },
  countPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  countText: { fontSize: 11, fontFamily: "PlusJakartaSans_700Bold" },
  cardArea: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  cardWrap: { width: "100%", maxWidth: 360, alignItems: "center", gap: 16 },
  card: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: 24,
    borderWidth: 1.5,
    overflow: "hidden",
    backgroundColor: "#0D0D12",
  },
  cardPhoto: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  photoPlaceholder: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  cardScrim: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "60%",
    backgroundColor: "rgba(0,0,0,0.65)",
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
    padding: 16,
  },
  promptBox: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: "rgba(10,10,12,0.75)",
  },
  promptLabel: { fontSize: 10, fontFamily: "PlusJakartaSans_800ExtraBold", letterSpacing: 0.8, marginBottom: 4 },
  promptAnswer: { fontSize: 14, fontFamily: "PlusJakartaSans_600SemiBold" },
  profileFooter: { flexDirection: "row", alignItems: "flex-end" },
  profileName: { fontSize: 22, fontFamily: "PlusJakartaSans_800ExtraBold", color: "#FFF" },
  verifiedRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  verifiedText: { fontSize: 11, fontFamily: "PlusJakartaSans_700Bold" },
  moreBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  moreText: { color: "#FFF", fontSize: 18, lineHeight: 20 },
  dotsRow: { flexDirection: "row", gap: 4 },
  actions: { flexDirection: "row", gap: 24, marginTop: 4 },
  passBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  likeBtn: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  doneState: { alignItems: "center", gap: 14 },
  doneIcon: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  doneTitle: { fontSize: 18, fontFamily: "PlusJakartaSans_800ExtraBold" },
  doneSub: { fontSize: 13, fontFamily: "PlusJakartaSans_500Medium" },
  doneBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 16, marginTop: 8 },
  doneBtnText: { color: "#FFF", fontSize: 14, fontFamily: "PlusJakartaSans_700Bold" },

  // ── Bottom sheet ──
  sheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    zIndex: 50,
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 20,
    gap: 10,
  },
  sheetName: { fontSize: 16, fontFamily: "PlusJakartaSans_800ExtraBold", marginBottom: 4 },
  sheetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  sheetBtnText: { fontSize: 14, fontFamily: "PlusJakartaSans_700Bold" },
  sheetCancel: { fontSize: 13, fontFamily: "PlusJakartaSans_500Medium", textAlign: "center", paddingVertical: 8 },
});
