import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
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

const PACKS = [
  {
    id: "classic",
    name: "Classic Icebreaker",
    rounds: [
      { question: "What is your go-to karaoke song?", options: ["Bohemian Rhapsody", "Shape of You", "I do not do karaoke", "Despacito"] },
      { question: "Best first date spot in Bangalore?", options: ["Toit", "The Permit Room", "Cubbon Park", "Koramangala rooftop"] },
      { question: "Your spirit animal at a party?", options: ["The dancer", "The wallflower", "The DJ", "The snack hunter"] },
    ],
  },
];

export default function GameScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const matchId = Number(id);
  const qc = useQueryClient();

  const { data: matchData, isLoading } = useQuery({
    queryKey: ["match", matchId],
    queryFn: () => get(`/api/matches/${matchId}`),
    enabled: !!matchId,
  });

  const [roundIndex, setRoundIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);

  const submitMutation = useMutation({
    mutationFn: (answers: any[]) => post(`/api/matches/${matchId}/icebreaker-conversation`, { answers }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["match", matchId] });
    },
  });

  const pack = PACKS[0];
  const round = pack.rounds[roundIndex];
  const otherUser = matchData?.otherUser;

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 40 }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (finished || matchData?.match?.icebreakerCompleted) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 8 }]}>
        <View style={styles.doneBody}>
          <View style={[styles.doneIcon, { backgroundColor: colors.primary }]}>
            <Feather name="unlock" size={32} color="#FFF" />
          </View>
          <Text style={[styles.doneTitle, { color: colors.foreground }]}>Ice Broken!</Text>
          <Text style={[styles.doneSub, { color: colors.mutedForeground }]}>
            You and {otherUser?.name?.split(" ")[0] || "your match"} completed the icebreaker.
          </Text>
          <TouchableOpacity
            style={[styles.doneBtn, { backgroundColor: colors.primary }]}            
            onPress={() => router.push(`/chat/${matchId}`)}
            activeOpacity={0.8}
          >
            <Text style={styles.doneBtnText}>Start Chatting</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const handleSelect = (option: string) => {
    setSelected(option);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleNext = () => {
    if (!selected) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (roundIndex < pack.rounds.length - 1) {
      setRoundIndex((i) => i + 1);
      setSelected(null);
    } else {
      setFinished(true);
      submitMutation.mutate([]);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 8 }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={[styles.backBtn, { borderColor: colors.border }]} onPress={() => router.back()}>
          <Feather name="arrow-left" size={18} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Icebreaker</Text>
        <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
          Round {roundIndex + 1} of {pack.rounds.length}
        </Text>
      </View>

      {/* Progress */}
      <View style={styles.progressRow}>
        {pack.rounds.map((_, i) => (
          <View
            key={i}
            style={[
              styles.progressDot,
              {
                backgroundColor: i <= roundIndex ? colors.primary : "rgba(255,255,255,0.15)",
              },
            ]}
          />
        ))}
      </View>

      {/* Question */}
      <View style={styles.questionArea}>
        <Text style={[styles.question, { color: colors.foreground }]}>{round.question}</Text>
        <View style={styles.options}>
          {round.options.map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[
                styles.option,
                {
                  borderColor: selected === opt ? colors.primary : colors.border,
                  backgroundColor: selected === opt ? colors.primary + "15" : "rgba(255,255,255,0.02)",
                },
              ]}              
              onPress={() => handleSelect(opt)}
              activeOpacity={0.8}
            >
              <Text style={[styles.optionText, { color: selected === opt ? colors.primary : colors.foreground }]}>
                {opt}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Next */}
      <TouchableOpacity
        style={[styles.nextBtn, { backgroundColor: selected ? colors.primary : "rgba(255,255,255,0.08)" }]}
        onPress={handleNext}
        disabled={!selected}
        activeOpacity={0.8}
      >
        <Text style={[styles.nextText, { color: selected ? "#FFF" : colors.mutedForeground }]}>
          {roundIndex < pack.rounds.length - 1 ? "Next →" : "Finish"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 10, gap: 10 },
  backBtn: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 16, fontFamily: "PlusJakartaSans_800ExtraBold" },
  headerSub: { fontSize: 12, fontFamily: "PlusJakartaSans_600SemiBold", marginLeft: "auto" },
  progressRow: { flexDirection: "row", gap: 6, paddingHorizontal: 16, marginBottom: 20 },
  progressDot: { flex: 1, height: 4, borderRadius: 2 },
  questionArea: { flex: 1, paddingHorizontal: 16, justifyContent: "center" },
  question: { fontSize: 22, fontFamily: "PlusJakartaSans_800ExtraBold", marginBottom: 24, lineHeight: 30 },
  options: { gap: 10 },
  option: { padding: 14, borderRadius: 14, borderWidth: 1.5 },
  optionText: { fontSize: 15, fontFamily: "PlusJakartaSans_600SemiBold" },
  nextBtn: { marginHorizontal: 16, marginBottom: 20, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  nextText: { fontSize: 16, fontFamily: "PlusJakartaSans_700Bold" },
  doneBody: { flex: 1, alignItems: "center", justifyContent: "center", padding: 30, gap: 16 },
  doneIcon: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  doneTitle: { fontSize: 24, fontFamily: "PlusJakartaSans_800ExtraBold" },
  doneSub: { fontSize: 14, fontFamily: "PlusJakartaSans_500Medium", textAlign: "center", color: "#8A8FA8" },
  doneBtn: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: 16, marginTop: 8 },
  doneBtnText: { color: "#FFF", fontSize: 15, fontFamily: "PlusJakartaSans_700Bold" },
});
