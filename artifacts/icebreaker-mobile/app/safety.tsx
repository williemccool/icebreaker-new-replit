import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

export default function SafetyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const items = [
    { icon: "shield", title: "Face Verification", desc: "Verify your profile with a selfie to build trust." },
    { icon: "flag", title: "Report Users", desc: "Report inappropriate behavior. Our team reviews within 24h." },
    { icon: "slash", title: "Block Users", desc: "Block anyone you do not want to interact with again." },
    { icon: "map-pin", title: "Location Safety", desc: "We only show approximate areas, never exact addresses." },
    { icon: "phone", title: "Emergency Contact", desc: "Keep a trusted contact on speed dial when going out." },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={[styles.backBtn, { borderColor: colors.border }]} onPress={() => router.back()}>
          <Feather name="arrow-left" size={18} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Trust & Safety</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 30, gap: 10 }}>
        {items.map((item) => (
          <View key={item.title} style={[styles.card, { borderColor: colors.border }]}>
            <View style={[styles.iconWrap, { backgroundColor: colors.primary + "15" }]}>
              <Feather name={item.icon as any} size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>{item.title}</Text>
              <Text style={[styles.cardDesc, { color: colors.mutedForeground }]}>{item.desc}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 10 },
  backBtn: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontFamily: "PlusJakartaSans_800ExtraBold" },
  card: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 16, borderWidth: 1 },
  iconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 14, fontFamily: "PlusJakartaSans_700Bold" },
  cardDesc: { fontSize: 12, fontFamily: "PlusJakartaSans_500Medium", marginTop: 2 },
});
