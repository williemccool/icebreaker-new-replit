import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { get } from "@/lib/api";
import {
  SHOP_CATALOG,
  CUBE_SKUS,
  GODMODE_SKUS,
  SEASON_SKU,
  formatINR,
  type ShopCategory,
  type ShopItem,
} from "@/lib/shop";

type FeatherName = keyof typeof Feather.glyphMap;

const TABS: { id: ShopCategory; label: string; icon: FeatherName }[] = [
  { id: "godmode", label: "God Mode", icon: "award" },
  { id: "cubes", label: "Cubes", icon: "zap" },
  { id: "season", label: "Season Pass", icon: "calendar" },
];

const PINK = "#FF1B8D";
const CYAN = "#00CFFF";

export default function ShopScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();

  const initialTab = TABS.find((t) => t.id === params.tab)?.id ?? "godmode";
  const [tab, setTab] = useState<ShopCategory>(initialTab);

  const { data: walletData } = useQuery({ queryKey: ["wallet"], queryFn: () => get("/api/wallet") });
  const { data: subData } = useQuery({ queryKey: ["subscription"], queryFn: () => get("/api/me/subscription") });
  const balance = walletData?.wallet?.balance ?? 0;
  const isPremium = !!subData?.subscription;

  const buy = (sku: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/payment?sku=${sku}` as any);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={[styles.iconBtn, { borderColor: colors.border }]} onPress={() => router.back()}>
          <Feather name="arrow-left" size={18} color={colors.foreground} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Shop</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>Upgrade your nights · Instant delivery</Text>
        </View>
        <View style={[styles.balanceChip, { borderColor: CYAN + "55", backgroundColor: CYAN + "1A" }]}>
          <Feather name="zap" size={12} color={CYAN} />
          <Text style={[styles.balanceChipText, { color: CYAN }]}>{balance}</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        {TABS.map(({ id, label, icon }) => {
          const active = tab === id;
          return (
            <TouchableOpacity
              key={id}
              style={[
                styles.tab,
                active
                  ? { backgroundColor: PINK, shadowColor: PINK, shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6 }
                  : { backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
              ]}
              onPress={() => { setTab(id); Haptics.selectionAsync(); }}
              activeOpacity={0.85}
            >
              <Feather name={icon} size={14} color={active ? "#FFF" : colors.mutedForeground} />
              <Text style={[styles.tabText, { color: active ? "#FFF" : colors.mutedForeground }]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40, gap: 14 }} showsVerticalScrollIndicator={false}>
        {tab === "godmode" && (
          <>
            <HeroCard
              icon="award"
              eyebrow="God Mode Premium"
              title="Own the night."
              body="Unlimited swipes, see who likes you, walk into premium rooms, and earn cubes 2x faster."
              active={isPremium}
              activeLabel="You're a member · Extending stacks days"
            />
            {GODMODE_SKUS.map((sku) => (
              <PlanCard key={sku} item={SHOP_CATALOG[sku]} onBuy={() => buy(sku)} colors={colors} />
            ))}
            <TrustStrip colors={colors} />
          </>
        )}

        {tab === "cubes" && (
          <>
            <HeroCard
              icon="zap"
              eyebrow="Cube Wallet"
              title="Keep the drinks flowing."
              body="Cubes send drinks, unlock rooms, and gift your matches. Bigger packs come loaded with bonus cubes."
              tint={CYAN}
            />
            <View style={styles.cubeGrid}>
              {CUBE_SKUS.map((sku) => (
                <CubeCard key={sku} item={SHOP_CATALOG[sku]} onBuy={() => buy(sku)} colors={colors} />
              ))}
            </View>
            <TrustStrip colors={colors} />
          </>
        )}

        {tab === "season" && (
          <>
            <HeroCard
              icon="calendar"
              eyebrow="Season 1 · Monsoon Nights"
              title="Unlock the full track."
              body="Premium quests, 2x cube rewards, an exclusive badge, and a season-end bonus drop."
              tint={CYAN}
            />
            <PlanCard item={SHOP_CATALOG[SEASON_SKU]} onBuy={() => buy(SEASON_SKU)} colors={colors} />
            <TrustStrip colors={colors} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

function HeroCard({
  icon, eyebrow, title, body, tint = PINK, active, activeLabel,
}: {
  icon: FeatherName; eyebrow: string; title: string; body: string;
  tint?: string; active?: boolean; activeLabel?: string;
}) {
  return (
    <View style={[styles.heroCard, { borderColor: tint + "55" }]}>
      <View style={[styles.heroGlow, { backgroundColor: tint }]} />
      <View style={styles.heroTop}>
        <View style={[styles.heroIcon, { backgroundColor: tint, shadowColor: tint }]}>
          <Feather name={icon} size={22} color="#FFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.heroEyebrow, { color: tint }]}>{eyebrow.toUpperCase()}</Text>
          <Text style={styles.heroTitle}>{title}</Text>
        </View>
      </View>
      <Text style={styles.heroBody}>{body}</Text>
      {active && (
        <View style={[styles.activeBadge, { borderColor: CYAN + "66", backgroundColor: CYAN + "22" }]}>
          <Feather name="shield" size={11} color={CYAN} />
          <Text style={[styles.activeBadgeText, { color: CYAN }]}>{activeLabel}</Text>
        </View>
      )}
    </View>
  );
}

function PlanCard({ item, onBuy, colors }: { item: ShopItem; onBuy: () => void; colors: any }) {
  const highlight = item.bestValue || item.popular;
  return (
    <View style={[styles.planCard, { borderColor: highlight ? PINK + "66" : colors.border }]}>
      {(item.popular || item.bestValue) && (
        <View style={[styles.ribbon, { backgroundColor: item.bestValue ? CYAN : PINK }]}>
          <Text style={styles.ribbonText}>{item.bestValue ? "BEST VALUE" : "POPULAR"}</Text>
        </View>
      )}
      <View style={styles.planHead}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.planName, { color: colors.foreground }]}>{item.name}</Text>
          <Text style={[styles.planTagline, { color: colors.mutedForeground }]}>{item.tagline}</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          {item.originalPriceInPaise && (
            <Text style={styles.planStrike}>{formatINR(item.originalPriceInPaise)}</Text>
          )}
          <Text style={[styles.planPrice, { color: colors.foreground }]}>{formatINR(item.priceInPaise)}</Text>
        </View>
      </View>

      {!!item.perks?.length && (
        <View style={styles.perkList}>
          {item.perks.map((p) => (
            <View key={p} style={styles.perkRow}>
              <View style={[styles.perkCheck, { backgroundColor: PINK + "22" }]}>
                <Feather name="check" size={11} color={PINK} />
              </View>
              <Text style={[styles.perkText, { color: colors.foreground }]}>{p}</Text>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity style={[styles.buyBtn, { backgroundColor: PINK }]} onPress={onBuy} activeOpacity={0.85}>
        <Text style={styles.buyBtnText}>Get {item.name}</Text>
        <Feather name="arrow-right" size={16} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

function CubeCard({ item, onBuy, colors }: { item: ShopItem; onBuy: () => void; colors: any }) {
  const total = (item.cubes || 0) + (item.bonusCubes || 0);
  const highlight = item.bestValue || item.popular;
  return (
    <TouchableOpacity
      style={[styles.cubeCard, { borderColor: highlight ? CYAN + "66" : colors.border }]}
      onPress={onBuy}
      activeOpacity={0.85}
    >
      {(item.popular || item.bestValue) && (
        <View style={[styles.cubeTag, { backgroundColor: item.bestValue ? CYAN : PINK }]}>
          <Text style={styles.cubeTagText}>{item.bestValue ? "BEST" : "POPULAR"}</Text>
        </View>
      )}
      <View style={[styles.cubeIcon, { backgroundColor: CYAN + "1A" }]}>
        <Feather name="zap" size={20} color={CYAN} />
      </View>
      <Text style={[styles.cubeAmount, { color: colors.foreground }]}>{total.toLocaleString("en-IN")}</Text>
      <Text style={[styles.cubeLabel, { color: colors.mutedForeground }]}>cubes</Text>
      {!!item.bonusCubes && (
        <Text style={[styles.cubeBonus, { color: CYAN }]}>+{item.bonusCubes} bonus</Text>
      )}
      <View style={[styles.cubePrice, { borderColor: colors.border }]}>
        <Text style={[styles.cubePriceText, { color: colors.foreground }]}>{formatINR(item.priceInPaise)}</Text>
      </View>
    </TouchableOpacity>
  );
}

function TrustStrip({ colors }: { colors: any }) {
  const items: { icon: FeatherName; label: string }[] = [
    { icon: "lock", label: "Encrypted" },
    { icon: "zap", label: "Instant delivery" },
    { icon: "refresh-cw", label: "Cancel anytime" },
  ];
  return (
    <View style={styles.trustStrip}>
      {items.map((t) => (
        <View key={t.label} style={styles.trustItem}>
          <Feather name={t.icon} size={12} color={colors.mutedForeground} />
          <Text style={[styles.trustText, { color: colors.mutedForeground }]}>{t.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12 },
  iconBtn: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 20, fontFamily: "PlusJakartaSans_800ExtraBold" },
  headerSub: { fontSize: 11, fontFamily: "PlusJakartaSans_500Medium", marginTop: 1 },
  balanceChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  balanceChipText: { fontSize: 13, fontFamily: "PlusJakartaSans_800ExtraBold" },
  tabsRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingBottom: 6 },
  tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 999 },
  tabText: { fontSize: 12, fontFamily: "PlusJakartaSans_800ExtraBold" },

  heroCard: { borderRadius: 22, borderWidth: 1, padding: 18, overflow: "hidden", backgroundColor: "#16101a" },
  heroGlow: { position: "absolute", right: -50, top: -50, width: 160, height: 160, borderRadius: 80, opacity: 0.25 },
  heroTop: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  heroIcon: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center", shadowOpacity: 0.6, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  heroEyebrow: { fontSize: 10, fontFamily: "PlusJakartaSans_800ExtraBold", letterSpacing: 1.5 },
  heroTitle: { fontSize: 20, fontFamily: "PlusJakartaSans_800ExtraBold", color: "#FFF", marginTop: 2 },
  heroBody: { fontSize: 13, fontFamily: "PlusJakartaSans_500Medium", color: "rgba(240,242,247,0.75)", lineHeight: 19 },
  activeBadge: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", marginTop: 12, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  activeBadgeText: { fontSize: 10, fontFamily: "PlusJakartaSans_800ExtraBold", letterSpacing: 0.3 },

  planCard: { borderRadius: 20, borderWidth: 1.5, padding: 16, backgroundColor: "rgba(255,255,255,0.02)" },
  ribbon: { position: "absolute", top: -1, right: 16, paddingHorizontal: 10, paddingVertical: 4, borderBottomLeftRadius: 10, borderBottomRightRadius: 10 },
  ribbonText: { fontSize: 9, fontFamily: "PlusJakartaSans_800ExtraBold", color: "#FFF", letterSpacing: 1 },
  planHead: { flexDirection: "row", alignItems: "flex-start", marginBottom: 12, marginTop: 4 },
  planName: { fontSize: 18, fontFamily: "PlusJakartaSans_800ExtraBold" },
  planTagline: { fontSize: 12, fontFamily: "PlusJakartaSans_500Medium", marginTop: 2, paddingRight: 8 },
  planStrike: { fontSize: 12, fontFamily: "PlusJakartaSans_600SemiBold", color: "#8A8FA8", textDecorationLine: "line-through" },
  planPrice: { fontSize: 22, fontFamily: "PlusJakartaSans_800ExtraBold" },
  perkList: { gap: 8, marginBottom: 16 },
  perkRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  perkCheck: { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  perkText: { fontSize: 13, fontFamily: "PlusJakartaSans_600SemiBold", flex: 1 },
  buyBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 50, borderRadius: 16 },
  buyBtnText: { fontSize: 15, fontFamily: "PlusJakartaSans_800ExtraBold", color: "#FFF" },

  cubeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  cubeCard: { width: "47%", flexGrow: 1, borderRadius: 18, borderWidth: 1.5, padding: 16, alignItems: "center", backgroundColor: "rgba(255,255,255,0.02)" },
  cubeTag: { position: "absolute", top: 10, right: 10, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  cubeTagText: { fontSize: 8, fontFamily: "PlusJakartaSans_800ExtraBold", color: "#FFF", letterSpacing: 0.8 },
  cubeIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 10, marginTop: 4 },
  cubeAmount: { fontSize: 26, fontFamily: "PlusJakartaSans_800ExtraBold" },
  cubeLabel: { fontSize: 11, fontFamily: "PlusJakartaSans_600SemiBold", marginTop: -2 },
  cubeBonus: { fontSize: 11, fontFamily: "PlusJakartaSans_800ExtraBold", marginTop: 6 },
  cubePrice: { marginTop: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, width: "100%", alignItems: "center" },
  cubePriceText: { fontSize: 15, fontFamily: "PlusJakartaSans_800ExtraBold" },

  trustStrip: { flexDirection: "row", justifyContent: "center", gap: 16, marginTop: 6, paddingVertical: 8 },
  trustItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  trustText: { fontSize: 11, fontFamily: "PlusJakartaSans_600SemiBold" },
});
