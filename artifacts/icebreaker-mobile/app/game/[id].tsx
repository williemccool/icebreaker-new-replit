import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { get, post } from "@/lib/api";
import * as Haptics from "expo-haptics";
import {
  TONES,
  TONE_COLOR,
  TONE_LABEL,
  TONE_EMOJI,
  getPackById,
  type Tone,
  type Pack,
} from "@/lib/icebreakerPacks";

type IceTurn = { turn: number; tone: Tone; senderId: number; body: string; mine: boolean };
type IceState = {
  status: "not_started" | "in_progress" | "completed";
  packId: string | null;
  initiatorId: number | null;
  currentTurn: number | null;
  currentTurnUserId: number | null;
  yourTurn: boolean;
  isInitiator: boolean | null;
  turns: IceTurn[];
  otherUser: { id: number; name: string; photos: string[]; verified: boolean } | null;
};

// The tone options the current player should choose from, given the path so far.
function optionsForTurn(pack: Pack | null, turn: number, turns: IceTurn[]): Record<Tone, string> | null {
  if (!pack) return null;
  if (turn === 1) return pack.turn1_options;
  if (turn === 2) {
    const t1 = turns[0]?.tone;
    return t1 ? pack.turn2_options[t1] : null;
  }
  if (turn === 3) {
    const t2 = turns[1]?.tone;
    return t2 ? pack.turn3_options[t2] : null;
  }
  return null;
}

export default function GameScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const matchId = Number(id);
  const qc = useQueryClient();

  const [picked, setPicked] = useState<Tone | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  // Light match query for the header name (icebreaker state also carries otherUser as fallback).
  const { data: matchData } = useQuery({
    queryKey: ["match", matchId],
    queryFn: () => get(`/api/matches/${matchId}`),
    enabled: !!matchId,
  });

  // Authoritative turn-based icebreaker state. Polls while waiting on the other player.
  const { data: state, isLoading } = useQuery<IceState>({
    queryKey: ["icebreaker", matchId],
    queryFn: () => get(`/api/matches/${matchId}/icebreaker`),
    enabled: !!matchId,
    refetchInterval: (query) => {
      const s = query.state.data as IceState | undefined;
      if (!s || s.status === "completed") return false;
      return s.yourTurn ? false : 2500;
    },
  });

  const submitMutation = useMutation({
    mutationFn: (tone: Tone) =>
      post<IceState>(`/api/matches/${matchId}/icebreaker-turn`, { tone, packId: state?.packId }),
    onSuccess: (newState) => {
      setPicked(null);
      if (newState && newState.status) {
        qc.setQueryData(["icebreaker", matchId], newState);
      }
      qc.invalidateQueries({ queryKey: ["icebreaker", matchId] });
      if (newState?.status === "completed") {
        qc.invalidateQueries({ queryKey: ["match", matchId] });
        qc.invalidateQueries({ queryKey: ["matches"] });
      }
    },
  });

  const otherName =
    ((state?.otherUser?.name || (matchData?.otherUser?.name as string)) || "them").split(" ")[0];

  const pack = useMemo(() => (state?.packId ? getPackById(state.packId) ?? null : null), [state?.packId]);

  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(t);
  }, [state?.turns?.length, state?.yourTurn]);

  const handlePick = (t: Tone) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPicked(t);
  };

  const handleSubmit = () => {
    if (!picked) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    submitMutation.mutate(picked);
  };

  if (isLoading || !state || !pack) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 40 }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  // ============ DONE STATE ============
  if (state.status === "completed") {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 8 }]}>
        <View style={styles.doneBody}>
          <View style={[styles.doneIcon, { backgroundColor: colors.primary }]}>
            <Feather name="unlock" size={32} color="#FFF" />
          </View>
          <Text style={[styles.doneTitle, { color: colors.foreground }]}>Ice Broken!</Text>
          <Text style={[styles.doneSub, { color: colors.mutedForeground }]}>
            Your conversation with {otherName} has started.
          </Text>
          <TouchableOpacity
            style={[styles.doneBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.replace(`/chat/${matchId}` as any)}
            activeOpacity={0.8}
          >
            <Text style={styles.doneBtnText}>Open Chat →</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const currentTurn = state.currentTurn ?? 3;
  const lastTone = state.turns[state.turns.length - 1]?.tone;
  const accentTone: Tone = picked || lastTone || "flirty";
  const accent = TONE_COLOR[accentTone];
  const options = optionsForTurn(pack, currentTurn, state.turns);
  const isFinalTurn = currentTurn === 3;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={[styles.backBtn, { borderColor: colors.border }]} onPress={() => router.back()}>
          <Feather name="arrow-left" size={18} color={colors.foreground} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Icebreaker</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>{pack.round_title}</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressTrack, { backgroundColor: "rgba(255,255,255,0.08)" }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: accent,
                width: `${((currentTurn - 1) / 2) * 100}%`,
              },
            ]}
          />
        </View>
        <View style={styles.progressDots}>
          {[1, 2, 3].map((n) => {
            const done = n < currentTurn;
            const active = n === currentTurn;
            return (
              <View
                key={n}
                style={[
                  styles.progressDot,
                  {
                    backgroundColor: done || active ? accent : "rgba(255,255,255,0.12)",
                    borderColor: active ? accent : "transparent",
                    transform: [{ scale: active ? 1.15 : 1 }],
                  },
                ]}
              >
                <Text style={styles.progressDotText}>{n}</Text>
              </View>
            );
          })}
        </View>
        <Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>
          Turn {currentTurn} of 3 · {state.yourTurn ? "Your move" : `${otherName}'s move`}
        </Text>
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Screen prompt */}
        <View style={[styles.promptBanner, { borderColor: "rgba(255,27,141,0.25)", backgroundColor: "rgba(255,27,141,0.06)" }]}>
          <Text style={[styles.promptBannerLabel, { color: colors.primary }]}>✦ Conversation Prompt</Text>
          <Text style={[styles.promptBannerText, { color: colors.foreground }]}>{pack.screen_prompt}</Text>
        </View>

        {/* Played turns */}
        {state.turns.map((t) =>
          t.mine ? (
            <View key={t.turn} style={styles.bubbleRowRight}>
              <View style={[styles.bubble, { backgroundColor: TONE_COLOR[t.tone], shadowColor: TONE_COLOR[t.tone] }]}>
                <Text style={styles.bubbleToneLabel}>{TONE_EMOJI[t.tone]} {TONE_LABEL[t.tone]}</Text>
                <Text style={styles.bubbleText}>{t.body}</Text>
              </View>
            </View>
          ) : (
            <View key={t.turn} style={styles.bubbleRowLeft}>
              <View style={[styles.bubble, styles.bubbleThem, { borderColor: TONE_COLOR[t.tone] + "55" }]}>
                <Text style={[styles.bubbleToneLabel, { color: TONE_COLOR[t.tone] }]}>
                  {TONE_EMOJI[t.tone]} {otherName} · {TONE_LABEL[t.tone]}
                </Text>
                <Text style={[styles.bubbleText, { color: "#FFF" }]}>{t.body}</Text>
              </View>
            </View>
          )
        )}

        {/* Typing indicator while waiting on the other player */}
        {!state.yourTurn && state.status === "in_progress" && (
          <View style={styles.bubbleRowLeft}>
            <View style={[styles.bubble, styles.bubbleThem]}>
              <View style={styles.typingDots}>
                <View style={[styles.dot, { backgroundColor: colors.mutedForeground }]} />
                <View style={[styles.dot, { backgroundColor: colors.mutedForeground, marginHorizontal: 4 }]} />
                <View style={[styles.dot, { backgroundColor: colors.mutedForeground }]} />
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom actions */}
      <View style={[styles.bottomPanel, { paddingBottom: insets.bottom + 12, borderTopColor: colors.border }]}>
        {state.yourTurn && options ? (
          <View style={styles.toneSection}>
            <Text style={[styles.tonePrompt, { color: colors.mutedForeground }]}>
              {currentTurn === 1
                ? `Pick how you want to open with ${otherName}`
                : isFinalTurn
                ? `This unlocks your chat with ${otherName}`
                : `Reply to ${otherName} — choose your tone`}
            </Text>
            {TONES.map((t) => (
              <ToneCard
                key={t}
                tone={t}
                text={options[t]}
                selected={picked === t}
                onPress={() => handlePick(t)}
              />
            ))}
            <TouchableOpacity
              style={[
                styles.sendBtn,
                {
                  backgroundColor: picked ? colors.primary : "rgba(255,255,255,0.06)",
                  opacity: picked && !submitMutation.isPending ? 1 : 0.5,
                },
              ]}
              onPress={handleSubmit}
              disabled={!picked || submitMutation.isPending}
              activeOpacity={0.8}
            >
              {submitMutation.isPending ? (
                <ActivityIndicator color="#FFF" size="small" style={{ marginRight: 8 }} />
              ) : (
                <Feather name="send" size={16} color={picked ? "#FFF" : colors.mutedForeground} style={{ marginRight: 8 }} />
              )}
              <Text style={[styles.sendBtnText, { color: picked ? "#FFF" : colors.mutedForeground }]}>
                {isFinalTurn ? "Send & unlock chat" : "Send reply"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.waitingSection}>
            <ActivityIndicator color={colors.primary} size="small" />
            <Text style={[styles.waitingTitle, { color: colors.foreground }]}>Waiting for {otherName}…</Text>
            <Text style={[styles.waitingSub, { color: colors.mutedForeground }]}>
              We'll update the moment {otherName} takes their turn.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

function ToneCard({
  tone,
  text,
  selected,
  onPress,
}: {
  tone: Tone;
  text: string;
  selected: boolean;
  onPress: () => void;
}) {
  const c = TONE_COLOR[tone];
  return (
    <TouchableOpacity
      style={[
        styles.toneCard,
        selected
          ? { borderColor: c, backgroundColor: c + "18", shadowColor: c, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6 }
          : { borderColor: "rgba(255,255,255,0.09)", backgroundColor: "rgba(255,255,255,0.02)" },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.toneBadge, { backgroundColor: c }]}>
        <Text style={styles.toneEmoji}>{TONE_EMOJI[tone]}</Text>
        <Text style={styles.toneBadgeLabel}>{TONE_LABEL[tone].slice(0, 3).toUpperCase()}</Text>
      </View>
      <Text style={[styles.toneText, { color: selected ? "#FFF" : "rgba(255,255,255,0.85)" }]}>{text}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 16, fontFamily: "PlusJakartaSans_800ExtraBold" },
  headerSub: { fontSize: 11, fontFamily: "PlusJakartaSans_500Medium", marginTop: 1 },
  progressContainer: { paddingHorizontal: 20, marginBottom: 12 },
  progressTrack: { height: 3, borderRadius: 2, overflow: "hidden", marginBottom: 10 },
  progressFill: { height: "100%", borderRadius: 2 },
  progressDots: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  progressDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  progressDotText: { fontSize: 11, fontFamily: "PlusJakartaSans_700Bold", color: "#FFF" },
  progressLabel: { fontSize: 10, fontFamily: "PlusJakartaSans_600SemiBold", textAlign: "center", letterSpacing: 0.5 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 16, gap: 10 },
  promptBanner: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 4,
  },
  promptBannerLabel: {
    fontSize: 10,
    fontFamily: "PlusJakartaSans_700Bold",
    letterSpacing: 1,
    marginBottom: 6,
  },
  promptBannerText: { fontSize: 14, fontFamily: "PlusJakartaSans_600SemiBold", lineHeight: 20 },
  bubbleRowRight: { flexDirection: "row", justifyContent: "flex-end" },
  bubbleRowLeft: { flexDirection: "row", justifyContent: "flex-start" },
  bubble: {
    maxWidth: "82%",
    borderRadius: 18,
    padding: 14,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  bubbleThem: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    shadowOpacity: 0,
    elevation: 0,
  },
  bubbleToneLabel: {
    fontSize: 10,
    fontFamily: "PlusJakartaSans_700Bold",
    color: "rgba(255,255,255,0.75)",
    marginBottom: 5,
    letterSpacing: 0.3,
  },
  bubbleText: { fontSize: 14, fontFamily: "PlusJakartaSans_500Medium", color: "#FFF", lineHeight: 20 },
  typingDots: { flexDirection: "row", alignItems: "center", paddingVertical: 4 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  bottomPanel: {
    borderTopWidth: 1,
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  toneSection: { gap: 8 },
  tonePrompt: { fontSize: 12, fontFamily: "PlusJakartaSans_500Medium", textAlign: "center", marginBottom: 4 },
  toneCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  toneBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  toneEmoji: { fontSize: 16 },
  toneBadgeLabel: {
    fontSize: 8,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    color: "#FFF",
    letterSpacing: 0.5,
  },
  toneText: { fontSize: 13, fontFamily: "PlusJakartaSans_500Medium", flex: 1, lineHeight: 18 },
  sendBtn: {
    height: 52,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  sendBtnText: { fontSize: 15, fontFamily: "PlusJakartaSans_700Bold" },
  waitingSection: { alignItems: "center", justifyContent: "center", paddingVertical: 18, gap: 8 },
  waitingTitle: { fontSize: 15, fontFamily: "PlusJakartaSans_700Bold" },
  waitingSub: { fontSize: 12, fontFamily: "PlusJakartaSans_500Medium", textAlign: "center" },
  doneBody: { flex: 1, alignItems: "center", justifyContent: "center", padding: 30, gap: 16 },
  doneIcon: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  doneTitle: { fontSize: 24, fontFamily: "PlusJakartaSans_800ExtraBold" },
  doneSub: { fontSize: 14, fontFamily: "PlusJakartaSans_500Medium", textAlign: "center" },
  doneBtn: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: 16, marginTop: 8 },
  doneBtnText: { color: "#FFF", fontSize: 15, fontFamily: "PlusJakartaSans_700Bold" },
});
