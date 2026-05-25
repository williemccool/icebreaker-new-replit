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
import { useAuthContext } from "@/context/AuthContext";
import { get, post } from "@/lib/api";
import * as Haptics from "expo-haptics";

const DRINKS = [
  { key: "beer", label: "Beer", sub: "PINT / BOTTLE", cubes: 150, accent: "#FF1B8D" },
  { key: "cocktail", label: "Cocktail", sub: "SIGNATURE", cubes: 250, accent: "#FF1B8D" },
  { key: "mocktail", label: "Mocktail", sub: "ALCOHOL-FREE", cubes: 100, accent: "#00CFFF" },
  { key: "coffee", label: "Coffee", sub: "HOT / ICED", cubes: 80, accent: "#00CFFF" },
];

export default function GiftDrinkScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { userId } = useLocalSearchParams();
  const recipientId = Number(userId);
  const { user } = useAuthContext();
  const qc = useQueryClient();

  const [selected, setSelected] = useState("beer");
  const [note, setNote] = useState("");
  const [voucher, setVoucher] = useState<any | null>(null);

  const { data: walletData } = useQuery({
    queryKey: ["wallet"],
    queryFn: () => get("/api/wallet"),
  });

  const { data: recipientData } = useQuery({
    queryKey: ["user", recipientId],
    queryFn: () => get(`/api/users/${recipientId}`),
    enabled: !!recipientId,
  });

  const drink = useMemo(() => DRINKS.find((d) => d.key === selected) ?? DRINKS[0], [selected]);
  const recipient = recipientData?.user;
  const balance = walletData?.wallet?.balance ?? 0;
  const canAfford = balance >= drink.cubes;

  const sendGift = useMutation({
    mutationFn: async () => {
      return post("/api/gifts/send", {
        recipientId,
        drinkName: drink.key,
        note: note.trim() || undefined,
      });
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["wallet"] });
      setVoucher(data?.gift ?? null);
    },
    onError: (err: any) => {
      Alert.alert("Failed to send gift", err?.message || "Please try again");
    },
  });

  if (voucher) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 8 }]}>
        <View style={styles.header}>
          <TouchableOpacity style={[styles.backBtn, { borderColor: colors.border }]} onPress={() => (router as any).replace("/")}>
            <Feather name="x" size={18} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.mutedForeground }]}>VOUCHER SENT</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.voucherBody}>
          <View style={[styles.voucherCard, { borderColor: colors.border }]}>
            <Text style={[styles.voucherLabel, { color: colors.primary }]}>DRINK VOUCHER</Text>
            <Text style={[styles.voucherDrink, { color: colors.foreground }]}>
              {voucher.drinkName?.toUpperCase?.() ?? drink.label}
            </Text>
            <View style={styles.voucherDivider} />
            <Text style={[styles.voucherCode, { color: colors.foreground }]}>
              {voucher.voucherCode ?? "XXXX-XXXX"}
            </Text>
            <Text style={[styles.voucherHint, { color: colors.mutedForeground }]}>
              Show this at the bar to redeem
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            onPress={() => (router as any).replace("/")}
          >
            <Text style={styles.primaryButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 20 }}
    >
      <View style={styles.header}>
        <TouchableOpacity style={[styles.backBtn, { borderColor: colors.border }]} onPress={() => router.back()}>
          <Feather name="arrow-left" size={18} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Gift a Drink</Text>
        <View style={{ width: 36 }} />
      </View>

      {recipient && (
        <View style={[styles.recipientRow, { borderColor: colors.border }]}>
          <View style={[styles.recipientAvatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.recipientInitial}>{recipient.name?.[0]?.toUpperCase?.() ?? "?"}</Text>
          </View>
          <View>
            <Text style={[styles.recipientName, { color: colors.foreground }]}>{recipient.name}</Text>
            <Text style={[styles.recipientMeta, { color: colors.mutedForeground }]}>Send them a drink</Text>
          </View>
        </View>
      )}

      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>SELECT DRINK</Text>
      {DRINKS.map((d) => (
        <TouchableOpacity
          key={d.key}
          style={[
            styles.drinkRow,
            {
              borderColor: selected === d.key ? d.accent : colors.border,
              backgroundColor: selected === d.key ? d.accent + "10" : "transparent",
            },
          ]}
          onPress={() => {
            setSelected(d.key);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          activeOpacity={0.8}
        >
          <View>
            <Text style={[styles.drinkLabel, { color: colors.foreground }]}>{d.label}</Text>
            <Text style={[styles.drinkSub, { color: colors.mutedForeground }]}>{d.sub}</Text>
          </View>
          <Text style={[styles.drinkPrice, { color: d.accent }]}>{d.cubes} cubes</Text>
        </TouchableOpacity>
      ))}

      <View style={[styles.walletRow, { borderColor: colors.border }]}>
        <Feather name="zap" size={16} color={colors.secondary} />
        <Text style={[styles.walletLabel, { color: colors.foreground }]}>Wallet balance</Text>
        <Text style={[styles.walletValue, { color: colors.foreground }]}>{balance} cubes</Text>
      </View>

      <View style={styles.spacer} />

      <TouchableOpacity
        style={[styles.primaryButton, {
          backgroundColor: canAfford ? colors.primary : colors.mutedForeground + "40",
        }]}
        onPress={() => {
          if (!canAfford) {
            Alert.alert("Not enough cubes", "Top up your wallet in the rewards tab.");
            return;
          }
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          sendGift.mutate();
        }}
        disabled={sendGift.isPending}
        activeOpacity={0.8}
      >
        {sendGift.isPending ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.primaryButtonText}>
            {canAfford ? `Gift ${drink.label} (${drink.cubes} cubes)` : "Not enough cubes"}
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontFamily: "PlusJakartaSans_700Bold" },
  recipientRow: { flexDirection: "row", alignItems: "center", gap: 12, marginHorizontal: 16, padding: 12, borderRadius: 14, borderWidth: 1, marginBottom: 16 },
  recipientAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  recipientInitial: { color: "#FFF", fontSize: 18, fontFamily: "PlusJakartaSans_700Bold" },
  recipientName: { fontSize: 15, fontFamily: "PlusJakartaSans_700Bold" },
  recipientMeta: { fontSize: 12, marginTop: 2 },
  sectionLabel: { fontSize: 11, fontFamily: "PlusJakartaSans_800ExtraBold", letterSpacing: 2, marginHorizontal: 16, marginBottom: 8 },
  drinkRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginHorizontal: 16, padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 8 },
  drinkLabel: { fontSize: 15, fontFamily: "PlusJakartaSans_700Bold" },
  drinkSub: { fontSize: 11, marginTop: 2, fontFamily: "PlusJakartaSans_600SemiBold" },
  drinkPrice: { fontSize: 14, fontFamily: "PlusJakartaSans_800ExtraBold" },
  walletRow: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 16, marginTop: 12, padding: 12, borderRadius: 14, borderWidth: 1 },
  walletLabel: { flex: 1, fontSize: 14, fontFamily: "PlusJakartaSans_600SemiBold" },
  walletValue: { fontSize: 14, fontFamily: "PlusJakartaSans_800ExtraBold" },
  spacer: { flex: 1 },
  primaryButton: { marginHorizontal: 16, height: 54, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  primaryButtonText: { color: "#FFF", fontSize: 16, fontFamily: "PlusJakartaSans_700Bold" },
  voucherBody: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  voucherCard: { width: "100%", borderRadius: 20, borderWidth: 1.5, borderStyle: "dashed", padding: 28, alignItems: "center", marginBottom: 24 },
  voucherLabel: { fontSize: 11, fontFamily: "PlusJakartaSans_800ExtraBold", letterSpacing: 3, marginBottom: 8 },
  voucherDrink: { fontSize: 24, fontFamily: "PlusJakartaSans_800ExtraBold", marginBottom: 12 },
  voucherDivider: { width: 40, height: 3, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.1)", marginVertical: 12 },
  voucherCode: { fontSize: 28, fontFamily: "PlusJakartaSans_800ExtraBold", letterSpacing: 4, marginVertical: 8 },
  voucherHint: { fontSize: 12, marginTop: 8, textAlign: "center" },
});
