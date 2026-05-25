import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { get } from "@/lib/api";
import * as Haptics from "expo-haptics";

export default function RoomsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data: rooms, isLoading } = useQuery({
    queryKey: ["rooms"],
    queryFn: () => get("/api/rooms"),
  });

  const liveRooms = Array.isArray(rooms) ? rooms.filter((r: any) => r.active) : [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={[styles.backBtn, { borderColor: colors.border }]} onPress={() => router.back()}>
          <Feather name="arrow-left" size={18} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Live Rooms</Text>
        <View style={{ width: 36 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={liveRooms}
          keyExtractor={(item: any) => String(item.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20, gap: 10 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }: { item: any }) => (
            <TouchableOpacity
              style={[styles.card, { borderColor: colors.border }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push(`/rooms/${item.id}`);
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.iconWrap, { backgroundColor: colors.secondary + "15", borderColor: colors.secondary + "30" }]}>
                <Feather name="radio" size={20} color={colors.secondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>{item.name}</Text>
                <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                  {item.participants || 0} joined · {item.capacity} max
                </Text>
              </View>
              <View style={[styles.liveTag, { backgroundColor: colors.primary + "20" }]}>
                <Text style={[styles.liveText, { color: colors.primary }]}>LIVE</Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="radio" size={32} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No live rooms</Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>Check back later tonight</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)" },
  backBtn: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "800" },
  card: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 16, borderWidth: 1 },
  iconWrap: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  name: { fontSize: 15, fontWeight: "700" },
  meta: { fontSize: 12, fontWeight: "500", marginTop: 2 },
  liveTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  liveText: { fontSize: 9, fontWeight: "800" },
  empty: { alignItems: "center", paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: "700" },
  emptySub: { fontSize: 12, fontWeight: "500" },
});
