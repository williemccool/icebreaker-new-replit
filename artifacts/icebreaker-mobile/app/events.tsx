import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { get } from "@/lib/api";

export default function EventsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data: events } = useQuery({ queryKey: ["events"], queryFn: () => get("/api/events") });
  const list = Array.isArray(events) ? events : [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={[styles.backBtn, { borderColor: colors.border }]} onPress={() => router.back()}>
          <Feather name="arrow-left" size={18} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Events</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 30, gap: 10 }}>
        {list.map((e: any) => (
          <View key={e.id} style={[styles.card, { borderColor: colors.border }]}>
            <View style={[styles.typeBadge, { borderColor: colors.primary + "40" }]}>
              <Text style={[styles.typeText, { color: colors.primary }]}>{e.type}</Text>
            </View>
            <Text style={[styles.title, { color: colors.foreground }]}>{e.title}</Text>
            <Text style={[styles.date, { color: colors.mutedForeground }]}>
              {new Date(e.startsAt).toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            </Text>
          </View>
        ))}
        {list.length === 0 && (
          <View style={styles.empty}>
            <Feather name="calendar" size={28} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No upcoming events</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 10 },
  backBtn: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "800" },
  card: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 6 },
  typeBadge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  typeText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.8 },
  title: { fontSize: 15, fontWeight: "800" },
  date: { fontSize: 12, fontWeight: "500" },
  empty: { alignItems: "center", paddingVertical: 50, gap: 10 },
  emptyText: { fontSize: 13, fontWeight: "500" },
});
