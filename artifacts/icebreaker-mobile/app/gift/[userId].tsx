import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Share,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { get, post } from "@/lib/api";
import * as Haptics from "expo-haptics";

const DRINKS = [
  { key: "beer",     label: "Beer",     sub: "Pint / Bottle",    cubes: 150, icon: "beer", accent: "#FF1B8D" },
  { key: "cocktail", label: "Cocktail", sub: "Signature Mix",    cubes: 250, icon: "glass-cocktail", accent: "#FF1B8D" },
  { key: "mocktail", label: "Mocktail", sub: "Alcohol-Free",     cubes: 100, icon: "cup", accent: "#00CFFF" },
  { key: "coffee",   label: "Coffee",   sub: "Hot or Iced",      cubes: 80,  icon: "coffee", accent: "#00CFFF" },
];

export default function GiftDrinkScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { userId } = useLocalSearchParams();
  const recipientId = Number(userId);
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
    mutationFn: async () =>
      post("/api/gifts/send", {
        recipientId,
        drinkName: drink.key,
        note: note.trim() || undefined,
      }),
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["wallet"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setVoucher(data?.gift ?? null);
    },
    onError: (err: any) => {
      Alert.alert("Failed to send gift", err?.message || "Please try again.");
    },
  });

  // ── Voucher success screen ─────────────────────────────────────────────────
  if (voucher) {
    const code = voucher.qrCode || voucher.voucherCode || "XXXX-XXXX";
    return (
      <View style={[styles.voucherScreen, { backgroundColor: colors.background, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }]}>
        {/* Header */}
        <View style={styles.voucherHeader}>
          <TouchableOpacity
            style={[styles.backBtn, { borderColor: colors.border }]}
            onPress={() => router.replace("/(tabs)")}
          >
            <Feather name="x" size={18} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.mutedForeground }]}>VOUCHER SENT</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Main voucher card */}
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }}>
          <View style={[styles.voucherCard, { borderColor: colors.primary + "60" }]}>
            {/* Top section */}
            <View style={[styles.voucherTop, { backgroundColor: colors.primary + "10" }]}>
              <MaterialCommunityIcons name={drink.icon as any} size={48} color={drink.accent} style={styles.voucherEmoji} />
              <View style={[styles.voucherLabel, { borderColor: colors.primary + "40" }]}>
                <Text style={[styles.voucherLabelText, { color: colors.primary }]}>DRINK VOUCHER</Text>
              </View>
              <Text style={[styles.voucherDrink, { color: colors.foreground }]}>
                {(voucher.drinkName || drink.key).toUpperCase()}
              </Text>
              {recipient && (
                <Text style={[styles.voucherFor, { color: colors.mutedForeground }]}>
                  for {recipient.name}
                </Text>
              )}
            </View>

            {/* Perforation line */}
            <View style={styles.perfLine}>
              <View style={[styles.perfCircleL, { backgroundColor: colors.background }]} />
              <View style={styles.perfDash} />
              <View style={[styles.perfCircleR, { backgroundColor: colors.background }]} />
            </View>

            {/* Bottom section */}
            <View style={styles.voucherBottom}>
              <Text style={[styles.voucherCodeLabel, { color: colors.mutedForeground }]}>REDEMPTION CODE</Text>
              <Text style={[styles.voucherCode, { color: colors.foreground }]}>{code}</Text>
              <Text style={[styles.voucherHint, { color: colors.mutedForeground }]}>
                Show this code at the bar to redeem
              </Text>
              {voucher.expiresAt && (
                <View style={[styles.expiryBadge, { backgroundColor: "rgba(255,176,0,0.1)", borderColor: "rgba(255,176,0,0.3)" }]}>
                  <Feather name="clock" size={11} color="#FFB000" />
                  <Text style={styles.expiryText}>
                    Expires {new Date(voucher.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={[styles.voucherActions, { paddingHorizontal: 24 }]}>
          <TouchableOpacity
            style={[styles.shareBtn, { borderColor: colors.border }]}
            onPress={() => Share.share({ message: `Your drink is on me! Redemption code: ${code}` })}
            activeOpacity={0.8}
          >
            <Feather name="share-2" size={16} color={colors.foreground} />
            <Text style={[styles.shareBtnText, { color: colors.foreground }]}>Share Code</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.doneBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.replace("/(tabs)")}
            activeOpacity={0.85}
          >
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Selection screen ───────────────────────────────────────────────────────
  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 0 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={[styles.backBtn, { borderColor: colors.border }]} onPress={() => router.back()}>
            <Feather name="arrow-left" size={18} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Gift a Drink</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Recipient */}
        {recipient && (
          <View style={[styles.recipientRow, { borderColor: colors.border }]}>
            <View style={[styles.recipientAvatar, { backgroundColor: colors.primary }]}>
              <Text style={styles.recipientInitial}>{recipient.name?.[0]?.toUpperCase?.() ?? "?"}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.recipientName, { color: colors.foreground }]}>{recipient.name}</Text>
              <Text style={[styles.recipientMeta, { color: colors.mutedForeground }]}>Send them a surprise drink</Text>
            </View>
            <Feather name="gift" size={18} color={colors.primary} />
          </View>
        )}

        {/* Drink selector */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>SELECT DRINK</Text>
        <View style={{ paddingHorizontal: 16, gap: 8 }}>
          {DRINKS.map((d) => (
            <TouchableOpacity
              key={d.key}
              style={[
                styles.drinkRow,
                {
                  borderColor: selected === d.key ? d.accent : colors.border,
                  backgroundColor: selected === d.key ? d.accent + "10" : "rgba(255,255,255,0.02)",
                },
              ]}
              onPress={() => {
                setSelected(d.key);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name={d.icon as any} size={24} color={d.accent} style={styles.drinkEmoji} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.drinkLabel, { color: colors.foreground }]}>{d.label}</Text>
                <Text style={[styles.drinkSub, { color: colors.mutedForeground }]}>{d.sub}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={[styles.drinkPrice, { color: d.accent }]}>{d.cubes} cubes</Text>
                {selected === d.key && (
                  <View style={[styles.selectedDot, { backgroundColor: d.accent }]} />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Wallet balance */}
        <View style={[styles.walletRow, { borderColor: colors.border }]}>
          <View style={[styles.walletIcon, { backgroundColor: colors.secondary + "20" }]}>
            <Feather name="zap" size={14} color={colors.secondary} />
          </View>
          <Text style={[styles.walletLabel, { color: colors.foreground }]}>Your balance</Text>
          <Text style={[styles.walletValue, {
            color: canAfford ? colors.secondary : "#FF5050",
            fontFamily: "PlusJakartaSans_800ExtraBold",
          }]}>
            {balance} cubes
          </Text>
          {!canAfford && (
            <TouchableOpacity
              style={[styles.topUpBtn, { backgroundColor: colors.primary + "20", borderColor: colors.primary + "40" }]}
              onPress={() => router.push("/rewards")}
            >
              <Text style={[styles.topUpText, { color: colors.primary }]}>Top up</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Bottom spacer to keep scroll room for button */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Sticky send button */}
      <View style={[styles.stickyBottom, { paddingBottom: insets.bottom + 16, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: canAfford ? colors.primary : "rgba(255,255,255,0.08)" }]}
          onPress={() => {
            if (!canAfford) {
              Alert.alert("Not enough cubes", "Top up your wallet in the Rewards tab.");
              return;
            }
            sendGift.mutate();
          }}
          disabled={sendGift.isPending}
          activeOpacity={0.85}
        >
          {sendGift.isPending ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <MaterialCommunityIcons name={drink.icon as any} size={20} color="#FFF" style={styles.sendBtnEmoji} />
              <Text style={[styles.sendBtnText, !canAfford && { color: "#8A8FA8" }]}>
                {canAfford
                  ? `Gift ${drink.label} · ${drink.cubes} cubes`
                  : "Not enough cubes"}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  voucherScreen: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  voucherHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontFamily: "PlusJakartaSans_700Bold" },
  recipientRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 16,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
    backgroundColor: "rgba(255,27,141,0.04)",
  },
  recipientAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  recipientInitial: { color: "#FFF", fontSize: 18, fontFamily: "PlusJakartaSans_700Bold" },
  recipientName: { fontSize: 15, fontFamily: "PlusJakartaSans_700Bold" },
  recipientMeta: { fontSize: 12, marginTop: 2, fontFamily: "PlusJakartaSans_500Medium" },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    letterSpacing: 2,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  drinkRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 10,
  },
  drinkEmoji: { fontSize: 24, width: 32, textAlign: "center" },
  drinkLabel: { fontSize: 15, fontFamily: "PlusJakartaSans_700Bold" },
  drinkSub: { fontSize: 11, marginTop: 2, fontFamily: "PlusJakartaSans_500Medium" },
  drinkPrice: { fontSize: 14, fontFamily: "PlusJakartaSans_800ExtraBold" },
  selectedDot: { width: 6, height: 6, borderRadius: 3, marginTop: 4, alignSelf: "flex-end" },
  walletRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  walletIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  walletLabel: { flex: 1, fontSize: 14, fontFamily: "PlusJakartaSans_600SemiBold" },
  walletValue: { fontSize: 14 },
  topUpBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    marginLeft: 6,
  },
  topUpText: { fontSize: 11, fontFamily: "PlusJakartaSans_700Bold" },
  stickyBottom: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    backgroundColor: "rgba(10,10,12,0.97)",
  },
  sendBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 54,
    borderRadius: 18,
  },
  sendBtnEmoji: { fontSize: 20 },
  sendBtnText: { fontSize: 16, fontFamily: "PlusJakartaSans_700Bold", color: "#FFF" },

  // Voucher screen
  voucherCard: {
    width: "100%",
    borderRadius: 24,
    borderWidth: 1.5,
    overflow: "hidden",
  },
  voucherTop: {
    alignItems: "center",
    paddingVertical: 28,
    paddingHorizontal: 20,
    gap: 8,
  },
  voucherEmoji: { fontSize: 48, marginBottom: 4 },
  voucherLabel: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  voucherLabelText: { fontSize: 10, fontFamily: "PlusJakartaSans_800ExtraBold", letterSpacing: 2 },
  voucherDrink: { fontSize: 26, fontFamily: "PlusJakartaSans_800ExtraBold" },
  voucherFor: { fontSize: 13, fontFamily: "PlusJakartaSans_500Medium" },
  perfLine: {
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    height: 20,
  },
  perfCircleL: { width: 20, height: 20, borderRadius: 10, marginLeft: -10 },
  perfCircleR: { width: 20, height: 20, borderRadius: 10, marginRight: -10 },
  perfDash: { flex: 1, height: 1, borderStyle: "dashed", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  voucherBottom: {
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 20,
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  voucherCodeLabel: { fontSize: 9, fontFamily: "PlusJakartaSans_800ExtraBold", letterSpacing: 2 },
  voucherCode: { fontSize: 26, fontFamily: "PlusJakartaSans_800ExtraBold", letterSpacing: 5 },
  voucherHint: { fontSize: 11, fontFamily: "PlusJakartaSans_500Medium", textAlign: "center", marginTop: 4 },
  expiryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 8,
  },
  expiryText: { fontSize: 11, fontFamily: "PlusJakartaSans_700Bold", color: "#FFB000" },
  voucherActions: { gap: 10, marginTop: 20 },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  shareBtnText: { fontSize: 14, fontFamily: "PlusJakartaSans_700Bold" },
  doneBtn: { height: 54, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  doneBtnText: { color: "#FFF", fontSize: 16, fontFamily: "PlusJakartaSans_700Bold" },
});
