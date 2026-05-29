import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { post } from "@/lib/api";
import { SHOP_CATALOG, formatINRDecimal, type ShopCategory } from "@/lib/shop";

type FeatherName = keyof typeof Feather.glyphMap;

const PINK = "#FF1B8D";
const CYAN = "#00CFFF";

const METHODS: { id: string; label: string; sub: string; icon: FeatherName }[] = [
  { id: "upi", label: "UPI / Google Pay", sub: "Default method", icon: "smartphone" },
  { id: "visa", label: "Visa ending in 4242", sub: "Expires 12/25", icon: "credit-card" },
  { id: "mc", label: "Mastercard 8839", sub: "Expires 09/26", icon: "credit-card" },
];

const CATEGORY_META: Record<ShopCategory, { icon: FeatherName; label: string }> = {
  cubes: { icon: "zap", label: "Cubes Top-up" },
  godmode: { icon: "award", label: "God Mode Premium" },
  season: { icon: "calendar", label: "Season Pass" },
};

export default function PaymentScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ sku?: string }>();
  const sku = params.sku || "";
  const item = SHOP_CATALOG[sku];

  const [selected, setSelected] = useState("upi");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<{ cubesAdded?: number } | null>(null);

  if (!item) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={[styles.notFoundIcon, { backgroundColor: "rgba(255,255,255,0.05)" }]}>
          <Feather name="help-circle" size={28} color={colors.mutedForeground} />
        </View>
        <Text style={[styles.notFoundTitle, { color: colors.foreground }]}>Product not found</Text>
        <Text style={[styles.notFoundSub, { color: colors.mutedForeground }]}>That checkout link is invalid or expired.</Text>
        <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: PINK, marginTop: 18 }]} onPress={() => router.replace("/shop" as any)}>
          <Text style={styles.primaryBtnText}>Browse the Shop</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const subtotal = item.priceInPaise;
  const tax = Math.round(subtotal * 0.18);
  const total = subtotal + tax;
  const meta = CATEGORY_META[item.category];
  const isSub = item.category === "godmode";
  const totalCubes = (item.cubes || 0) + (item.bonusCubes || 0);

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["wallet"] });
    qc.invalidateQueries({ queryKey: ["subscription"] });
    qc.invalidateQueries({ queryKey: ["cubes-transactions"] });
    qc.invalidateQueries({ queryKey: ["user", "me"] });
  };

  const handlePay = async () => {
    setLoading(true);
    try {
      // Try the Razorpay order flow first. When Razorpay isn't configured the
      // server responds 503, which is the only case where we fall back to the
      // simulated demo purchase path. Any other error is a real failure.
      let needsRealCheckout = false;
      try {
        await post("/api/payments/create-order", { sku });
        needsRealCheckout = true;
      } catch (e: any) {
        if (e?.status !== 503) throw e;
        // 503 = Razorpay not configured → use the simulated purchase endpoint.
      }

      if (needsRealCheckout) {
        // Razorpay is configured. The native checkout SDK isn't part of this
        // build, so we can't complete (and verify) the payment in-app — surface
        // that clearly instead of pretending the purchase succeeded.
        setLoading(false);
        alert(
          "Online payments aren't available in this build yet. Please complete your purchase from the Icebreaker web app.",
        );
        return;
      }

      const data: any = await post("/api/purchase", { sku });
      invalidateAll();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDone({ cubesAdded: data?.cubesAdded });
    } catch (e: any) {
      setLoading(false);
      // Surface the failure inline rather than silently.
      setDone(null);
      alert(e?.message || "Payment failed. Please try again.");
    }
  };

  if (done) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={[styles.successIcon, { backgroundColor: CYAN + "1A", borderColor: CYAN + "55" }]}>
          <Feather name="check" size={36} color={CYAN} />
        </View>
        <Text style={[styles.successTitle, { color: colors.foreground }]}>You're all set</Text>
        <Text style={[styles.successSub, { color: colors.mutedForeground }]}>
          {done.cubesAdded
            ? `+${done.cubesAdded.toLocaleString("en-IN")} cubes added to your wallet`
            : `${item.name} is now active`}
        </Text>
        <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: PINK, marginTop: 24 }]} onPress={() => router.replace("/rewards")}>
          <Text style={styles.primaryBtnText}>Go to Rewards</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ marginTop: 14 }} onPress={() => router.replace("/shop" as any)}>
          <Text style={[styles.secondaryLink, { color: colors.mutedForeground }]}>Back to Shop</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={[styles.iconBtn, { borderColor: colors.border }]} onPress={() => router.back()}>
          <Feather name="arrow-left" size={18} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>CHECKOUT</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 200, gap: 14 }} showsVerticalScrollIndicator={false}>
        {/* Product summary */}
        <View style={[styles.summaryCard, { borderColor: PINK + "4D" }]}>
          <View style={[styles.heroGlow, { backgroundColor: PINK }]} />
          <View style={styles.summaryTop}>
            <View style={[styles.summaryIcon, { backgroundColor: PINK }]}>
              <Feather name={meta.icon} size={26} color="#FFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.summaryEyebrow, { color: PINK }]}>{meta.label.toUpperCase()}</Text>
              <Text style={[styles.summaryName, { color: colors.foreground }]}>{item.name}</Text>
              <Text style={[styles.summaryTagline, { color: colors.mutedForeground }]}>{item.tagline}</Text>
            </View>
          </View>
          {totalCubes > 0 && (
            <View style={[styles.summaryFooter, { borderTopColor: "rgba(255,255,255,0.1)" }]}>
              <Feather name="zap" size={14} color={CYAN} />
              <Text style={[styles.summaryFooterText, { color: CYAN }]}>{totalCubes.toLocaleString("en-IN")} cubes</Text>
              {!!item.bonusCubes && (
                <Text style={[styles.summaryFooterNote, { color: colors.mutedForeground }]}>(includes +{item.bonusCubes} bonus)</Text>
              )}
            </View>
          )}
          {!!item.durationDays && (
            <View style={[styles.summaryFooter, { borderTopColor: "rgba(255,255,255,0.1)", justifyContent: "center" }]}>
              <Text style={[styles.summaryFooterNote, { color: colors.mutedForeground }]}>Active for </Text>
              <Text style={[styles.summaryFooterText, { color: colors.foreground }]}>{item.durationDays} days</Text>
            </View>
          )}
        </View>

        {/* Bill */}
        <View style={[styles.billCard, { borderColor: colors.border }]}>
          <View style={styles.billRow}>
            <Text style={[styles.billLabel, { color: colors.mutedForeground }]}>Subtotal</Text>
            <Text style={[styles.billValue, { color: colors.foreground }]}>{formatINRDecimal(subtotal)}</Text>
          </View>
          <View style={styles.billRow}>
            <Text style={[styles.billLabel, { color: colors.mutedForeground }]}>GST (18%)</Text>
            <Text style={[styles.billValue, { color: colors.foreground }]}>{formatINRDecimal(tax)}</Text>
          </View>
          <View style={[styles.billRow, styles.billTotalRow, { borderTopColor: "rgba(255,255,255,0.08)" }]}>
            <Text style={[styles.billTotalLabel, { color: colors.foreground }]}>
              Total {isSub ? <Text style={[styles.billLabel, { color: colors.mutedForeground }]}>(one-time)</Text> : null}
            </Text>
            <Text style={[styles.billTotalValue, { color: PINK }]}>{formatINRDecimal(total)}</Text>
          </View>
        </View>

        {/* Payment methods */}
        <Text style={[styles.methodHeading, { color: colors.mutedForeground }]}>PAYMENT METHOD</Text>
        <View style={{ gap: 8 }}>
          {METHODS.map((m) => {
            const active = selected === m.id;
            return (
              <TouchableOpacity
                key={m.id}
                style={[styles.methodRow, active
                  ? { borderColor: CYAN + "66", backgroundColor: CYAN + "14" }
                  : { borderColor: colors.border, backgroundColor: "rgba(255,255,255,0.03)" }]}
                onPress={() => { setSelected(m.id); Haptics.selectionAsync(); }}
                activeOpacity={0.85}
              >
                <View style={[styles.methodIcon, { backgroundColor: "rgba(255,255,255,0.06)" }]}>
                  <Feather name={m.icon} size={18} color={colors.foreground} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.methodLabel, { color: colors.foreground }]}>{m.label}</Text>
                  <Text style={[styles.methodSub, { color: colors.mutedForeground }]}>{m.sub}</Text>
                </View>
                <Feather name={active ? "check-circle" : "circle"} size={20} color={active ? CYAN : colors.mutedForeground} />
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Sticky CTA */}
      <View style={[styles.stickyBottom, { paddingBottom: insets.bottom + 16, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.payBtn, { backgroundColor: PINK }]}
          onPress={handlePay}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Text style={styles.payBtnText}>Pay {formatINRDecimal(total)}</Text>
              <Feather name="lock" size={16} color="rgba(255,255,255,0.85)" />
            </>
          )}
        </TouchableOpacity>
        <View style={styles.secureRow}>
          <Feather name="lock" size={11} color={colors.mutedForeground} />
          <Text style={[styles.secureText, { color: colors.mutedForeground }]}>Encrypted · Cancel anytime</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12 },
  iconBtn: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 14, fontFamily: "PlusJakartaSans_800ExtraBold", letterSpacing: 2 },

  summaryCard: { borderRadius: 22, borderWidth: 1, padding: 18, overflow: "hidden", backgroundColor: "#16101a" },
  heroGlow: { position: "absolute", right: -50, top: -50, width: 150, height: 150, borderRadius: 75, opacity: 0.28 },
  summaryTop: { flexDirection: "row", alignItems: "center", gap: 14 },
  summaryIcon: { width: 54, height: 54, borderRadius: 18, alignItems: "center", justifyContent: "center", shadowColor: PINK, shadowOpacity: 0.5, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  summaryEyebrow: { fontSize: 10, fontFamily: "PlusJakartaSans_800ExtraBold", letterSpacing: 1.5 },
  summaryName: { fontSize: 18, fontFamily: "PlusJakartaSans_800ExtraBold", marginTop: 2 },
  summaryTagline: { fontSize: 12, fontFamily: "PlusJakartaSans_500Medium", marginTop: 2 },
  summaryFooter: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 14, paddingTop: 14, borderTopWidth: 1 },
  summaryFooterText: { fontSize: 14, fontFamily: "PlusJakartaSans_800ExtraBold" },
  summaryFooterNote: { fontSize: 12, fontFamily: "PlusJakartaSans_500Medium" },

  billCard: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 10, backgroundColor: "rgba(255,255,255,0.03)" },
  billRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  billLabel: { fontSize: 13, fontFamily: "PlusJakartaSans_500Medium" },
  billValue: { fontSize: 13, fontFamily: "PlusJakartaSans_700Bold" },
  billTotalRow: { paddingTop: 10, borderTopWidth: 1 },
  billTotalLabel: { fontSize: 15, fontFamily: "PlusJakartaSans_800ExtraBold" },
  billTotalValue: { fontSize: 20, fontFamily: "PlusJakartaSans_800ExtraBold" },

  methodHeading: { fontSize: 10, fontFamily: "PlusJakartaSans_800ExtraBold", letterSpacing: 1.5, marginTop: 4 },
  methodRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 16, borderWidth: 1.5 },
  methodIcon: { width: 44, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  methodLabel: { fontSize: 14, fontFamily: "PlusJakartaSans_700Bold" },
  methodSub: { fontSize: 11, fontFamily: "PlusJakartaSans_500Medium", marginTop: 1 },

  stickyBottom: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, backgroundColor: "rgba(10,10,12,0.97)" },
  payBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 54, borderRadius: 18 },
  payBtnText: { fontSize: 16, fontFamily: "PlusJakartaSans_800ExtraBold", color: "#FFF" },
  secureRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, marginTop: 10 },
  secureText: { fontSize: 10, fontFamily: "PlusJakartaSans_700Bold", letterSpacing: 0.5 },

  primaryBtn: { height: 50, paddingHorizontal: 28, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  primaryBtnText: { fontSize: 15, fontFamily: "PlusJakartaSans_800ExtraBold", color: "#FFF" },
  secondaryLink: { fontSize: 13, fontFamily: "PlusJakartaSans_700Bold" },

  notFoundIcon: { width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  notFoundTitle: { fontSize: 18, fontFamily: "PlusJakartaSans_800ExtraBold" },
  notFoundSub: { fontSize: 13, fontFamily: "PlusJakartaSans_500Medium", textAlign: "center", marginTop: 6 },

  successIcon: { width: 84, height: 84, borderRadius: 42, borderWidth: 1.5, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  successTitle: { fontSize: 22, fontFamily: "PlusJakartaSans_800ExtraBold" },
  successSub: { fontSize: 14, fontFamily: "PlusJakartaSans_500Medium", textAlign: "center", marginTop: 8 },
});
