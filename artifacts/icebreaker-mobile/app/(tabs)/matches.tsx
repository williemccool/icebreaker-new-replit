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

export default function MatchesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data: matches, isLoading } = useQuery({
    queryKey: ["matches"],
    queryFn: () => get("/api/matches"),
  });

  const handlePress = (match: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (match.icebreakerCompleted) {
      router.push(`/chat/${match.id}`);
    } else {
      router.push(`/game/${match.id}`);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Matches</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          {matches?.length || 0} connections
        </Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={matches || []}
          keyExtractor={(item: any) => String(item.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20, gap: 10 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }: { item: any }) => (
            <TouchableOpacity
              style={[styles.card, { borderColor: colors.border }]}
              onPress={() => handlePress(item)}
              activeOpacity={0.8}
            >
              <View style={[styles.avatar, { backgroundColor: colors.secondary + "20" }]}>
                <Text style={[styles.avatarText, { color: colors.secondary }]}>
                  {item.otherUser?.name?.[0]?.toUpperCase() || "?"}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.nameRow}>
                  <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
                    {item.otherUser?.name || "Someone"}
                  </Text>
                  {!item.icebreakerCompleted && (
                    <View style={[styles.newBadge, { borderColor: colors.secondary + "40" }]}>
                      <Feather name="star" size={10} color={colors.secondary} />
                      <Text style={[styles.newText, { color: colors.secondary }]}>NEW</Text>
                    </View>
                  )}
                </View>
                {item.icebreakerCompleted ? (
                  item.lastMessage ? (
                    <Text style={[styles.lastMsg, { color: colors.mutedForeground }]} numberOfLines={1}>
                      {item.lastMessage.body}
                    </Text>
                  ) : (
                    <Text style={[styles.lastMsg, { color: colors.mutedForeground }]}>Say hi</Text>
                  )
                ) : (
                  <Text style={[styles.lockText, { color: colors.primary }]}>Tap to break the ice</Text>
                )}
              </View>
              <View style={{ alignItems: "center" }}>
                {item.icebreakerCompleted ? (
                  <Feather name="message-circle" size={18} color={colors.primary} />
                ) : (
                  <Feather name="lock" size={16} color={colors.secondary} />
                )}
                {item.icebreakerCompleted && (
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      (router as any).push(`/gift/${item.otherUser?.id}`);
                    }}
                    style={{ marginTop: 6 }}
                  >
                    <Feather name="gift" size={14} color={colors.secondary} />
                  </TouchableOpacity>
                )}
                {item.icebreakerCompleted && item.lastMessage && (
                  <Text style={[styles.time, { color: colors.mutedForeground }]}>
                    {new Date(item.lastMessage.createdAt).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.card }]}>
                <Feather name="heart" size={28} color={colors.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No matches yet</Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                Join a Live room or check into a Venue to meet people!
              </Text>
              <TouchableOpacity
                style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push("/rooms")}
                activeOpacity={0.8}
              >
                <Text style={styles.emptyBtnText}>Explore Live Rooms</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: 1 },
  title: { fontSize: 20, fontFamily: "PlusJakartaSans_800ExtraBold" },
  subtitle: { fontSize: 12, fontFamily: "PlusJakartaSans_600SemiBold", marginTop: 2 },
  card: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 16, borderWidth: 1 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 18, fontFamily: "PlusJakartaSans_800ExtraBold" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { fontSize: 15, fontFamily: "PlusJakartaSans_700Bold", flex: 1 },
  newBadge: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  newText: { fontSize: 9, fontFamily: "PlusJakartaSans_800ExtraBold" },
  lastMsg: { fontSize: 12, fontFamily: "PlusJakartaSans_500Medium", marginTop: 2 },
  lockText: { fontSize: 12, fontFamily: "PlusJakartaSans_700Bold", marginTop: 2 },
  time: { fontSize: 10, fontFamily: "PlusJakartaSans_500Medium", marginTop: 4 },
  empty: { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyIcon: { width: 64, height: 64, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 16, fontFamily: "PlusJakartaSans_700Bold" },
  emptySub: { fontSize: 12, fontFamily: "PlusJakartaSans_500Medium", textAlign: "center", paddingHorizontal: 30 },
  emptyBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 14, marginTop: 8 },
  emptyBtnText: { color: "#FFF", fontSize: 14, fontFamily: "PlusJakartaSans_700Bold" },
});
