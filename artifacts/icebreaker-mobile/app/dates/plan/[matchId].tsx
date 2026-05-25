import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { get, post } from "@/lib/api";
import * as Haptics from "expo-haptics";

type Step = "when" | "where" | "confirm";

const EVENING_TIMES = ["6:00 PM", "6:30 PM", "7:00 PM", "7:30 PM", "8:00 PM", "8:30 PM"];
const LATE_TIMES = ["9:00 PM", "9:30 PM", "10:00 PM", "10:30 PM", "11:00 PM"];

function parseTimeToHM(t: string) {
  const [time, mer] = t.split(" ");
  const [hh, mm] = time.split(":").map(Number);
  let h = hh % 12;
  if (mer === "PM") h += 12;
  return { h, m: mm };
}

function buildDays(count = 7) {
  const out: { date: Date; weekday: string; day: number; isToday: boolean }[] = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  for (let i = 0; i < count; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    out.push({
      date: d,
      weekday: i === 0 ? "TODAY" : d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase(),
      day: d.getDate(),
      isToday: i === 0,
    });
  }
  return out;
}

export default function PlanDateScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { matchId } = useLocalSearchParams();
  const mid = Number(matchId);
  const qc = useQueryClient();

  const [step, setStep] = useState<Step>("when");
  const days = useMemo(() => buildDays(7), []);
  const [dayIdx, setDayIdx] = useState(0);
  const [time, setTime] = useState("8:00 PM");
  const [venueId, setVenueId] = useState<number | null>(null);
  const [safety, setSafety] = useState(false);

  const { data: matchData } = useQuery({
    queryKey: ["match", mid],
    queryFn: () => get(`/api/matches/${mid}`),
    enabled: !!mid,
  });

  const { data: venues = [] } = useQuery({
    queryKey: ["venues"],
    queryFn: () => get("/api/venues"),
  });

  const other = matchData?.otherUser;
  const selectedVenue = useMemo(
    () => (venues || []).find((v: any) => v.id === venueId),
    [venues, venueId],
  );

  const bookingDate = useMemo(() => {
    const d = new Date(days[dayIdx].date);
    const { h, m } = parseTimeToHM(time);
    d.setHours(h, m, 0, 0);
    return d;
  }, [dayIdx, time, days]);

  const propose = useMutation({
    mutationFn: async () => {
      return post("/api/dates/propose", {
        matchId: mid,
        venueId,
        bookingDate: bookingDate.toISOString(),
        safetyCheck: safety,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["messages", mid] });
      Alert.alert("Date invite sent", `Proposed ${selectedVenue?.name ?? "a venue"} on ${bookingDate.toLocaleDateString()}`);
      (router as any).replace(`/chat/${mid}`);
    },
    onError: (err: any) => {
      Alert.alert("Couldn't send invite", err?.message || "Try again later");
    },
  });

  const stepNum = step === "when" ? 1 : step === "where" ? 2 : 3;
  const isNight = parseTimeToHM(time).h >= 21;
  const times = isNight ? LATE_TIMES : EVENING_TIMES;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 20 }}
    >
      <View style={styles.header}>
        <TouchableOpacity style={[styles.backBtn, { borderColor: colors.border }]} onPress={() => router.back()}>
          <Feather name="arrow-left" size={18} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Plan a Date</Text>
        <View style={{ width: 36 }} />
      </View>

      <Text style={[styles.stepLabel, { color: colors.mutedForeground }]}>
        STEP {stepNum} / 3 — {step.toUpperCase()}
      </Text>

      {other && (
        <View style={[styles.matchRow, { borderColor: colors.border }]}>
          <View style={[styles.matchAvatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.matchInitial}>{other.name?.[0]?.toUpperCase?.() ?? "?"}</Text>
          </View>
          <Text style={[styles.matchName, { color: colors.foreground }]}>{other.name}</Text>
        </View>
      )}

      {step === "when" && (
        <>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>DATE</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
            {days.map((d, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  styles.dayChip,
                  {
                    borderColor: dayIdx === i ? colors.primary : colors.border,
                    backgroundColor: dayIdx === i ? colors.primary + "15" : "transparent",
                  },
                ]}
                onPress={() => setDayIdx(i)}
              >
                <Text style={[styles.dayWeekday, { color: dayIdx === i ? colors.primary : colors.mutedForeground }]}>
                  {d.weekday}
                </Text>
                <Text style={[styles.dayNumber, { color: colors.foreground }]}>{d.day}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 20 }]}>TIME</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
            {times.map((t) => (
              <TouchableOpacity
                key={t}
                style={[
                  styles.timeChip,
                  {
                    borderColor: time === t ? colors.secondary : colors.border,
                    backgroundColor: time === t ? colors.secondary + "15" : "transparent",
                  },
                ]}
                onPress={() => setTime(t)}
              >
                <Text style={[styles.timeText, { color: time === t ? colors.secondary : colors.foreground }]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.primary, marginTop: 24 }]}
            onPress={() => setStep("where")}
          >
            <Text style={styles.primaryButtonText}>Next: Pick Venue</Text>
          </TouchableOpacity>
        </>
      )}

      {step === "where" && (
        <>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>VENUE</Text>
          {venues.map((v: any) => (
            <TouchableOpacity
              key={v.id}
              style={[
                styles.venueRow,
                {
                  borderColor: venueId === v.id ? colors.primary : colors.border,
                  backgroundColor: venueId === v.id ? colors.primary + "10" : "transparent",
                },
              ]}
              onPress={() => setVenueId(v.id)}
            >
              <View>
                <Text style={[styles.venueName, { color: colors.foreground }]}>{v.name}</Text>
                <Text style={[styles.venueMeta, { color: colors.mutedForeground }]}>{v.neighborhood || v.city}</Text>
              </View>
              {venueId === v.id && <Feather name="check" size={18} color={colors.primary} />}
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.primary, marginTop: 16 }]}
            onPress={() => venueId ? setStep("confirm") : Alert.alert("Select a venue")}
          >
            <Text style={styles.primaryButtonText}>Next: Confirm</Text>
          </TouchableOpacity>
        </>
      )}

      {step === "confirm" && (
        <>
          <View style={[styles.summaryCard, { borderColor: colors.border }]}>
            <Text style={[styles.summaryTitle, { color: colors.foreground }]}>Date Proposal</Text>
            <View style={styles.summaryRow}>
              <Feather name="map-pin" size={14} color={colors.mutedForeground} />
              <Text style={[styles.summaryValue, { color: colors.foreground }]}>{selectedVenue?.name}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Feather name="calendar" size={14} color={colors.mutedForeground} />
              <Text style={[styles.summaryValue, { color: colors.foreground }]}>
                {days[dayIdx].weekday} {days[dayIdx].day} at {time}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.safetyRow, { borderColor: safety ? colors.secondary : colors.border }]}
            onPress={() => setSafety((s) => !s)}
          >
            <Feather name="shield" size={16} color={safety ? colors.secondary : colors.mutedForeground} />
            <Text style={[styles.safetyText, { color: colors.foreground }]}>Share date details with a friend</Text>
            <View style={[styles.checkbox, { borderColor: safety ? colors.secondary : colors.border, backgroundColor: safety ? colors.secondary + "20" : "transparent" }]}>
              {safety && <Feather name="check" size={12} color={colors.secondary} />}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.primary, marginTop: 16 }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              propose.mutate();
            }}
            disabled={propose.isPending}
          >
            {propose.isPending ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Send Date Invite</Text>
            )}
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontFamily: "PlusJakartaSans_700Bold" },
  stepLabel: { fontSize: 11, fontFamily: "PlusJakartaSans_800ExtraBold", letterSpacing: 2, marginHorizontal: 16, marginBottom: 8 },
  matchRow: { flexDirection: "row", alignItems: "center", gap: 12, marginHorizontal: 16, padding: 12, borderRadius: 14, borderWidth: 1, marginBottom: 16 },
  matchAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  matchInitial: { color: "#FFF", fontSize: 16, fontFamily: "PlusJakartaSans_700Bold" },
  matchName: { fontSize: 15, fontFamily: "PlusJakartaSans_700Bold" },
  sectionLabel: { fontSize: 11, fontFamily: "PlusJakartaSans_800ExtraBold", letterSpacing: 2, marginHorizontal: 16, marginBottom: 8, marginTop: 12 },
  dayChip: { width: 64, height: 72, borderRadius: 14, borderWidth: 1.5, alignItems: "center", justifyContent: "center", marginRight: 8 },
  dayWeekday: { fontSize: 10, fontFamily: "PlusJakartaSans_800ExtraBold", letterSpacing: 1 },
  dayNumber: { fontSize: 22, fontFamily: "PlusJakartaSans_800ExtraBold", marginTop: 4 },
  timeChip: { paddingHorizontal: 16, height: 40, borderRadius: 12, borderWidth: 1.5, alignItems: "center", justifyContent: "center", marginRight: 8 },
  timeText: { fontSize: 13, fontFamily: "PlusJakartaSans_700Bold" },
  venueRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginHorizontal: 16, padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 8 },
  venueName: { fontSize: 15, fontFamily: "PlusJakartaSans_700Bold" },
  venueMeta: { fontSize: 12, marginTop: 2, fontFamily: "PlusJakartaSans_600SemiBold" },
  summaryCard: { marginHorizontal: 16, padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 16 },
  summaryTitle: { fontSize: 16, fontFamily: "PlusJakartaSans_800ExtraBold", marginBottom: 10 },
  summaryRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  summaryValue: { fontSize: 14, fontFamily: "PlusJakartaSans_600SemiBold" },
  safetyRow: { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 16, padding: 14, borderRadius: 14, borderWidth: 1.5 },
  safetyText: { flex: 1, fontSize: 14, fontFamily: "PlusJakartaSans_600SemiBold" },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  primaryButton: { marginHorizontal: 16, height: 54, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  primaryButtonText: { color: "#FFF", fontSize: 16, fontFamily: "PlusJakartaSans_700Bold" },
});
