import React, { useState, useEffect, useMemo } from "react";
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
  PACKS,
  TONES,
  TONE_COLOR,
  TONE_LABEL,
  TONE_EMOJI,
  pickPackForMatch,
  pickOtherTone,
  type Tone,
} from "@/lib/icebreakerPacks";

type Stage = "turn1" | "typing" | "turn2_reveal" | "turn3" | "submitting" | "done";

export default function GameScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const matchId = Number(id);
  const qc = useQueryClient();

  const [stage, setStage] = useState<Stage>("turn1");
  const [turn1Tone, setTurn1Tone] = useState<Tone | null>(null);
  const [turn2Tone, setTurn2Tone] = useState<Tone | null>(null);
  const [turn3Tone, setTurn3Tone] = useState<Tone | null>(null);

  const { data: matchData, isLoading } = useQuery({
    queryKey: ["match", matchId],
    queryFn: () => get(`/api/matches/${matchId}`),
    enabled: !!matchId,
  });

  const otherUser = matchData?.otherUser;
  const match = matchData?.match;
  const otherName = (otherUser?.name as string)?.split(" ")[0] || "them";

  const pack = useMemo(
    () => pickPackForMatch(matchId || 0, match?.venueName),
    [matchId, match?.venueName]
  );

  const turn1Text = turn1Tone ? pack.turn1_options[turn1Tone] : null;
  const turn2Text = turn1Tone && turn2Tone ? pack.turn2_options[turn1Tone][turn2Tone] : null;
  const turn3Text = turn2Tone && turn3Tone ? pack.turn3_options[turn2Tone][turn3Tone] : null;

  // After user picks turn 1, simulate "typing" then reveal person 2's reply
  useEffect(() => {
    if (stage !== "typing" || !turn1Tone) return;
    const t = setTimeout(() => {
      const tt = pickOtherTone(matchId, 2, turn1Tone);
      setTurn2Tone(tt);
      setStage("turn2_reveal");
    }, 1400);
    return () => clearTimeout(t);
  }, [stage, turn1Tone, matchId]);

  const submitMutation = useMutation({
    mutationFn: () =>
      post(`/api/matches/${matchId}/icebreaker-conversation`, {
        packId: pack.id,
        turn1Tone,
        turn3Tone,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["match", matchId] });
      qc.invalidateQueries({ queryKey: ["matches"] });
      setStage("done");
    },
    onError: () => {
      setStage("turn3");
    },
  });

  const handlePickTurn1 = (t: Tone) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTurn1Tone(t);
    setStage("typing");
  };

  const handlePickTurn3 = (t: Tone) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTurn3Tone(t);
  };

  const handleSubmit = () => {
    if (!turn1Tone || !turn3Tone) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setStage("submitting");
    submitMutation.mutate();
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 40 }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  // Already completed — show unlock state
  if (stage === "done" || matchData?.match?.icebreakerCompleted) {
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

  const currentTurn = stage === "turn1" ? 1 : stage === "typing" || stage === "turn2_reveal" ? 2 : 3;
  const accentTone = stage === "turn3" ? (turn3Tone || turn1Tone || "flirty") : (turn1Tone || "flirty");
  const accent = TONE_COLOR[accentTone];

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
            const done = (n === 1 && currentTurn > 1) || (n === 2 && currentTurn > 2);
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
          Turn {currentTurn} of 3 · {currentTurn === 1 ? "Your move" : currentTurn === 2 ? "Their reply" : "Your reply"}
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Screen prompt */}
        <View style={[styles.promptBanner, { borderColor: "rgba(255,27,141,0.25)", backgroundColor: "rgba(255,27,141,0.06)" }]}>
          <Text style={[styles.promptBannerLabel, { color: colors.primary }]}>✦ Conversation Prompt</Text>
          <Text style={[styles.promptBannerText, { color: colors.foreground }]}>{pack.screen_prompt}</Text>
        </View>

        {/* Turn 1 bubble */}
        {turn1Text && (
          <View style={styles.bubbleRowRight}>
            <View style={[styles.bubble, { backgroundColor: TONE_COLOR[turn1Tone!], shadowColor: TONE_COLOR[turn1Tone!] }]}>
              <Text style={styles.bubbleToneLabel}>{TONE_EMOJI[turn1Tone!]} {TONE_LABEL[turn1Tone!]}</Text>
              <Text style={styles.bubbleText}>{turn1Text}</Text>
            </View>
          </View>
        )}

        {/* Typing indicator */}
        {stage === "typing" && (
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

        {/* Turn 2 bubble (their reply) */}
        {turn2Text && (
          <View style={styles.bubbleRowLeft}>
            <View style={[styles.bubble, styles.bubbleThem, { borderColor: TONE_COLOR[turn2Tone!] + "55" }]}>
              <Text style={[styles.bubbleToneLabel, { color: TONE_COLOR[turn2Tone!] }]}>
                {TONE_EMOJI[turn2Tone!]} {otherName} · {TONE_LABEL[turn2Tone!]}
              </Text>
              <Text style={[styles.bubbleText, { color: "#FFF" }]}>{turn2Text}</Text>
            </View>
          </View>
        )}

        {/* Turn 3 bubble (your chosen reply) */}
        {turn3Text && turn3Tone && (
          <View style={styles.bubbleRowRight}>
            <View style={[styles.bubble, { backgroundColor: TONE_COLOR[turn3Tone], shadowColor: TONE_COLOR[turn3Tone] }]}>
              <Text style={styles.bubbleToneLabel}>{TONE_EMOJI[turn3Tone]} {TONE_LABEL[turn3Tone]}</Text>
              <Text style={styles.bubbleText}>{turn3Text}</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom actions */}
      <View style={[styles.bottomPanel, { paddingBottom: insets.bottom + 12, borderTopColor: colors.border }]}>
        {/* Turn 1: pick your opening tone */}
        {stage === "turn1" && (
          <View style={styles.toneSection}>
            <Text style={[styles.tonePrompt, { color: colors.mutedForeground }]}>
              Pick how you want to open with {otherName}
            </Text>
            {TONES.map((t) => (
              <ToneCard
                key={t}
                tone={t}
                text={pack.turn1_options[t]}
                selected={turn1Tone === t}
                onPress={() => handlePickTurn1(t)}
              />
            ))}
          </View>
        )}

        {/* Turn 2 reveal: tell user what tone their match used, let them proceed */}
        {stage === "turn2_reveal" && turn2Tone && (
          <View style={styles.revealSection}>
            <Text style={[styles.revealText, { color: colors.mutedForeground }]}>
              {otherName} went{" "}
              <Text style={{ color: TONE_COLOR[turn2Tone], fontFamily: "PlusJakartaSans_700Bold" }}>
                {TONE_LABEL[turn2Tone]}
              </Text>
              . Your turn to reply.
            </Text>
            <TouchableOpacity
              style={[styles.continueBtn, { backgroundColor: TONE_COLOR[turn2Tone] }]}
              onPress={() => setStage("turn3")}
              activeOpacity={0.8}
            >
              <Text style={styles.continueBtnText}>Pick your reply →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Turn 3: pick reply tone */}
        {stage === "turn3" && turn2Tone && (
          <View style={styles.toneSection}>
            <Text style={[styles.tonePrompt, { color: colors.mutedForeground }]}>
              This unlocks your chat with {otherName}
            </Text>
            {TONES.map((t) => (
              <ToneCard
                key={t}
                tone={t}
                text={pack.turn3_options[turn2Tone][t]}
                selected={turn3Tone === t}
                onPress={() => handlePickTurn3(t)}
              />
            ))}
            <TouchableOpacity
              style={[
                styles.sendBtn,
                {
                  backgroundColor: turn3Tone ? colors.primary : "rgba(255,255,255,0.06)",
                  opacity: turn3Tone ? 1 : 0.5,
                },
              ]}
              onPress={handleSubmit}
              disabled={!turn3Tone}
              activeOpacity={0.8}
            >
              <Feather name="send" size={16} color={turn3Tone ? "#FFF" : colors.mutedForeground} style={{ marginRight: 8 }} />
              <Text style={[styles.sendBtnText, { color: turn3Tone ? "#FFF" : colors.mutedForeground }]}>
                Send & unlock chat
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Submitting */}
        {stage === "submitting" && (
          <View style={styles.submittingRow}>
            <ActivityIndicator color={colors.primary} size="small" />
            <Text style={[styles.submittingText, { color: colors.mutedForeground }]}>
              Saving your conversation…
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
  revealSection: { gap: 12 },
  revealText: { fontSize: 13, fontFamily: "PlusJakartaSans_500Medium", textAlign: "center" },
  continueBtn: {
    height: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  continueBtnText: { fontSize: 15, fontFamily: "PlusJakartaSans_700Bold", color: "#FFF" },
  sendBtn: {
    height: 52,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  sendBtnText: { fontSize: 15, fontFamily: "PlusJakartaSans_700Bold" },
  submittingRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16 },
  submittingText: { fontSize: 14, fontFamily: "PlusJakartaSans_500Medium" },
  doneBody: { flex: 1, alignItems: "center", justifyContent: "center", padding: 30, gap: 16 },
  doneIcon: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  doneTitle: { fontSize: 24, fontFamily: "PlusJakartaSans_800ExtraBold" },
  doneSub: { fontSize: 14, fontFamily: "PlusJakartaSans_500Medium", textAlign: "center" },
  doneBtn: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: 16, marginTop: 8 },
  doneBtnText: { color: "#FFF", fontSize: 15, fontFamily: "PlusJakartaSans_700Bold" },
});
