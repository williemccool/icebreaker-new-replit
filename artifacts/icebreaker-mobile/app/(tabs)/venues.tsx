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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { get, post } from "@/lib/api";
import * as Haptics from "expo-haptics";

export default function VenuesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: venues, isLoading } = useQuery({
    queryKey: ["venues"],
    queryFn: () => get("/api/venues?city=Bangalore"),
  });

  const checkInMutation = useMutation({
    mutationFn: (venueId: number) => post(`/api/venues/${venueId}/check-in`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["venues"] }),
  });

  const handleCheckIn = (venueId: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    checkInMutation.mutate(venueId);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Venues Near You</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Bangalore · {venues?.length || 0} venues
        </Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={venues || []}
          keyExtractor={(item: any) => String(item.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20, gap: 12 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }: { item: any }) => (
            <TouchableOpacity
              style={[styles.card, { borderColor: colors.border }]}
              onPress={() => router.push(`/venues/${item.id}`)}
              activeOpacity={0.8}
            >
              <View style={[styles.thumb, { backgroundColor: colors.primary + "15" }]}>
                <Feather name="map-pin" size={28} color={colors.primary} />
              </View>
              <View style={styles.cardBody}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={[styles.type, { color: colors.mutedForeground }]}>{item.type}</Text>
                  </View>
                  {item.partner && (
                    <View style={[styles.partnerBadge, { borderColor: colors.secondary + "40" }]}>
                      <Text style={[styles.partnerText, { color: colors.secondary }]}>Partner</Text>
                    </View>
                  )}
                </View>
                <View style={styles.locationRow}>
                  <Feather name="map-pin" size={12} color={colors.mutedForeground} />
                  <Text style={[styles.location, { color: colors.mutedForeground }]}>
                    {item.area}, {item.city}
                  </Text>
                </View>
                <View style={styles.footer}>
                  <View style={styles.checkedIn}>
                    <View style={[styles.checkDot, { backgroundColor: colors.secondary }]} />
                    <Text style={[styles.checkText, { color: colors.secondary }]}>{item.peopleHere || 0} checked in</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.checkBtn, { backgroundColor: colors.primary }]}
                    onPress={() => handleCheckIn(item.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.checkBtnText}>Check In</Text>
                  </TouchableOpacity>
                </View>
                {item.perks?.length > 0 && (
                  <View style={[styles.perkRow, { borderTopColor: colors.border }]}>
                    <Feather name="zap" size={12} color={colors.primary} />
                    <Text style={[styles.perkText, { color: colors.primary }]}>{item.perks[0]}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.card }]}>
                <Feather name="map-pin" size={28} color={colors.mutedForeground} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No venues found</Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>Check back soon</Text>
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
  title: { fontSize: 20, fontWeight: "800" },
  subtitle: { fontSize: 12, fontWeight: "600", marginTop: 2 },
  card: { borderRadius: 18, borderWidth: 1, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.02)" },
  thumb: { height: 140, alignItems: "center", justifyContent: "center" },
  cardBody: { padding: 14, gap: 8 },
  cardTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  name: { fontSize: 15, fontWeight: "800" },
  type: { fontSize: 11, fontWeight: "500", marginTop: 2 },
  partnerBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  partnerText: { fontSize: 9, fontWeight: "800" },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  location: { fontSize: 12, fontWeight: "500" },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 2 },
  checkedIn: { flexDirection: "row", alignItems: "center", gap: 5 },
  checkDot: { width: 5, height: 5, borderRadius: 2.5 },
  checkText: { fontSize: 12, fontWeight: "700" },
  checkBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12 },
  checkBtnText: { color: "#FFF", fontSize: 12, fontWeight: "700" },
  perkRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingTop: 8, borderTopWidth: 1 },
  perkText: { fontSize: 11, fontWeight: "600" },
  empty: { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyIcon: { width: 64, height: 64, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 15, fontWeight: "700" },
  emptySub: { fontSize: 12, fontWeight: "500" },
});
