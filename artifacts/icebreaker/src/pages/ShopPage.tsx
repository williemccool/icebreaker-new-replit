import { useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, Sparkles, Crown, Trophy, Check, Zap, Flame, Star, ShieldCheck,
} from "lucide-react";
import { SHOP_CATALOG, type ShopItem, type ShopCategory } from "@shared/shop";

const authFetch = async (url: string) => {
  const token = localStorage.getItem("token");
  const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) return null;
  return res.json();
};

const fmt = (paise: number) => `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;

const CUBE_ITEMS = ["cubes_100", "cubes_500", "cubes_1200", "cubes_3000"].map(s => SHOP_CATALOG[s]);
const GOD_ITEMS = ["godmode_monthly", "godmode_quarterly", "godmode_yearly"].map(s => SHOP_CATALOG[s]);
const SEASON_ITEM = SHOP_CATALOG.season_pass;

const TABS: { id: ShopCategory; label: string; icon: any }[] = [
  { id: "godmode", label: "God Mode", icon: Crown },
  { id: "cubes", label: "Cubes", icon: Sparkles },
  { id: "season", label: "Season Pass", icon: Trophy },
];

export default function ShopPage() {
  const search = useSearch();
  const initialTab = (new URLSearchParams(search).get("tab") as ShopCategory) || "godmode";
  const [tab, setTab] = useState<ShopCategory>(TABS.find(t => t.id === initialTab) ? initialTab : "godmode");
  const [, navigate] = useLocation();

  const { data: walletData } = useQuery<any>({ queryKey: ["/api/wallet"], queryFn: () => authFetch("/api/wallet") });
  const { data: subData } = useQuery<any>({ queryKey: ["/api/me/subscription"], queryFn: () => authFetch("/api/me/subscription") });
  const isPremium = !!subData?.subscription;

  const buy = (sku: string) => navigate(`/payment?sku=${sku}`);

  return (
    <div className="min-h-screen pb-28" style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(255,27,141,0.18) 0%, transparent 55%), #0A0A0C" }}>
      {/* Header */}
      <div className="sticky top-0 z-30 px-4 pt-4 pb-3" style={{ background: "rgba(10,10,12,0.92)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link href="/rewards">
            <button className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }} data-testid="button-back">
              <ArrowLeft className="w-4 h-4 text-icebreaker-muted" />
            </button>
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-extrabold tracking-tight">Shop</h1>
            <p className="text-xs text-icebreaker-muted -mt-0.5">Upgrade your nights · Instant delivery</p>
          </div>
          <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-full" style={{ background: "rgba(0,207,255,0.1)", border: "1px solid rgba(0,207,255,0.3)" }} data-testid="text-shop-balance">
            <Sparkles className="w-3 h-3 text-icebreaker-teal" />
            <span className="text-xs font-extrabold text-icebreaker-teal">{walletData?.wallet?.balance ?? 0}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-lg mx-auto mt-3 flex gap-1.5 overflow-x-auto no-scrollbar">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-extrabold whitespace-nowrap transition-all ${tab === id ? "text-white" : "text-icebreaker-muted"}`}
              style={tab === id
                ? { background: "linear-gradient(135deg, #FF1B8D, #d6007a)", boxShadow: "0 0 16px rgba(255,27,141,0.4)" }
                : { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
              data-testid={`tab-${id}`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-5 space-y-4">

        {/* ============ GOD MODE ============ */}
        {tab === "godmode" && (
          <>
            {/* Hero pitch */}
            <div className="rounded-3xl p-5 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #2a0f1f 0%, #0f1a2e 100%)", border: "1px solid rgba(255,27,141,0.35)" }}>
              <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full opacity-30" style={{ background: "radial-gradient(circle, #FF1B8D 0%, transparent 70%)" }} />
              <div className="relative flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #FF1B8D, #d6007a)", boxShadow: "0 0 24px rgba(255,27,141,0.6)" }}>
                  <Crown className="w-6 h-6 text-white" fill="white" />
                </div>
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-icebreaker-coral">God Mode Premium</p>
                  <p className="text-lg font-extrabold tracking-tight">Own the night.</p>
                </div>
              </div>
              <p className="text-sm text-icebreaker-muted relative">Unlimited swipes, see who likes you, walk into premium rooms, and earn cubes 2× faster.</p>
              {isPremium && (
                <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: "rgba(0,207,255,0.15)", border: "1px solid rgba(0,207,255,0.4)" }}>
                  <ShieldCheck className="w-3 h-3 text-icebreaker-teal" />
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-icebreaker-teal">You're a member · Extending stacks days</span>
                </div>
              )}
            </div>

            {/* Plan cards */}
            <div className="space-y-3">
              {GOD_ITEMS.map((p) => (
                <PlanCard key={p.sku} item={p} onBuy={() => buy(p.sku)} />
              ))}
            </div>

            {/* Trust strip */}
            <TrustStrip />
          </>
        )}

        {/* ============ CUBES ============ */}
        {tab === "cubes" && (
          <>
            <div className="rounded-3xl p-5 relative overflow-hidden" style={{ background: "linear-gradient(135deg, rgba(0,207,255,0.12) 0%, rgba(255,27,141,0.08) 100%)", border: "1px solid rgba(0,207,255,0.3)" }}>
              <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full opacity-30" style={{ background: "radial-gradient(circle, #00CFFF 0%, transparent 70%)" }} />
              <div className="relative flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #00CFFF, #008fb3)", boxShadow: "0 0 24px rgba(0,207,255,0.5)" }}>
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-icebreaker-teal">Cubes Wallet</p>
                  <p className="text-lg font-extrabold tracking-tight">Top up & treat someone</p>
                </div>
              </div>
              <p className="text-sm text-icebreaker-muted relative">Send drinks, unlock premium rooms, gift event tickets, and join boosts.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {CUBE_ITEMS.map((p) => (
                <CubeCard key={p.sku} item={p} onBuy={() => buy(p.sku)} />
              ))}
            </div>

            <TrustStrip />
          </>
        )}

        {/* ============ SEASON PASS ============ */}
        {tab === "season" && (
          <>
            <div className="rounded-3xl p-6 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #1a1408 0%, #14101e 50%, #0d1424 100%)", border: "1px solid rgba(255,215,0,0.35)" }}>
              <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full opacity-30" style={{ background: "radial-gradient(circle, #FFD700 0%, transparent 70%)" }} />
              <div className="absolute -left-10 -bottom-10 w-48 h-48 rounded-full opacity-20" style={{ background: "radial-gradient(circle, #FF1B8D 0%, transparent 70%)" }} />

              <div className="relative">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-3" style={{ background: "rgba(255,215,0,0.15)", border: "1px solid rgba(255,215,0,0.3)" }}>
                  <Star className="w-3 h-3 text-yellow-400" fill="#FFD700" />
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-yellow-400">Season 1 · Monsoon Nights</span>
                </div>
                <h2 className="text-2xl font-extrabold tracking-tight mb-1">Season Pass</h2>
                <p className="text-sm text-icebreaker-muted">Double your rewards on every quest. Walk away with a season-end bonus and an exclusive badge.</p>

                <div className="mt-5 space-y-2">
                  {(SEASON_ITEM.perks || []).map((perk) => (
                    <div key={perk} className="flex items-center gap-2.5">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,215,0,0.15)", border: "1px solid rgba(255,215,0,0.3)" }}>
                        <Check className="w-3 h-3 text-yellow-400" />
                      </div>
                      <span className="text-sm font-semibold">{perk}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-5 pt-4 border-t border-white/10 flex items-end justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-icebreaker-muted">One-time</p>
                    <p className="text-3xl font-black tracking-tight">{fmt(SEASON_ITEM.priceInPaise)}</p>
                  </div>
                  <button
                    onClick={() => buy(SEASON_ITEM.sku)}
                    className="h-12 px-6 rounded-2xl font-extrabold text-sm text-black flex items-center gap-2 active:scale-95 transition-transform"
                    style={{ background: "linear-gradient(135deg, #FFD700, #FF1B8D)", boxShadow: "0 0 24px rgba(255,215,0,0.4)" }}
                    data-testid="button-buy-season"
                  >
                    <Trophy className="w-4 h-4" />
                    Get Season Pass
                  </button>
                </div>
              </div>
            </div>

            {/* Quick add cubes upsell */}
            <Link href="/shop?tab=cubes">
              <div className="rounded-2xl p-4 cursor-pointer flex items-center gap-3 active:scale-[0.99]" style={{ background: "rgba(0,207,255,0.06)", border: "1px solid rgba(0,207,255,0.2)" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(0,207,255,0.15)" }}>
                  <Sparkles className="w-5 h-5 text-icebreaker-teal" />
                </div>
                <div className="flex-1">
                  <p className="font-extrabold text-sm">Add Cubes too</p>
                  <p className="text-xs text-icebreaker-muted">Spend them on drinks, premium rooms, boosts</p>
                </div>
                <span className="text-xs font-bold text-icebreaker-teal">Browse →</span>
              </div>
            </Link>

            <TrustStrip />
          </>
        )}
      </div>
    </div>
  );
}

function PlanCard({ item, onBuy }: { item: ShopItem; onBuy: () => void }) {
  const monthly = item.durationDays ? Math.round(item.priceInPaise / 100 / (item.durationDays / 30)) : 0;
  return (
    <div
      className="rounded-3xl p-5 relative overflow-hidden"
      style={{
        background: item.popular || item.bestValue
          ? "linear-gradient(135deg, #1f0d1a 0%, #0d1424 100%)"
          : "rgba(255,255,255,0.04)",
        border: item.bestValue
          ? "1.5px solid rgba(255,27,141,0.6)"
          : item.popular
            ? "1.5px solid rgba(0,207,255,0.5)"
            : "1px solid rgba(255,255,255,0.08)",
        boxShadow: item.bestValue ? "0 0 32px rgba(255,27,141,0.2)" : undefined,
      }}
      data-testid={`plan-${item.sku}`}
    >
      {(item.popular || item.bestValue) && (
        <div className="absolute -top-px right-5 px-3 py-1 rounded-b-lg text-[10px] font-extrabold uppercase tracking-widest"
          style={{
            background: item.bestValue ? "linear-gradient(135deg, #FF1B8D, #d6007a)" : "linear-gradient(135deg, #00CFFF, #008fb3)",
            color: "white",
          }}>
          {item.bestValue ? "BEST VALUE" : "POPULAR"}
        </div>
      )}

      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-icebreaker-muted">God Mode</p>
          <p className="text-xl font-extrabold tracking-tight">{item.name}</p>
          <p className="text-xs text-icebreaker-muted mt-0.5">{item.tagline}</p>
        </div>
        <div className="text-right flex-shrink-0">
          {item.originalPriceInPaise && (
            <p className="text-xs text-icebreaker-muted line-through">{fmt(item.originalPriceInPaise)}</p>
          )}
          <p className="text-2xl font-black tracking-tight">{fmt(item.priceInPaise)}</p>
          {monthly > 0 && item.durationDays && item.durationDays > 30 && (
            <p className="text-[10px] text-icebreaker-muted">≈ ₹{monthly}/mo</p>
          )}
        </div>
      </div>

      <div className="space-y-1.5 mb-4">
        {(item.perks || []).slice(0, 4).map((perk) => (
          <div key={perk} className="flex items-center gap-2 text-xs">
            <Check className="w-3.5 h-3.5 text-icebreaker-coral flex-shrink-0" />
            <span className="font-semibold text-icebreaker-muted">{perk}</span>
          </div>
        ))}
      </div>

      <button
        onClick={onBuy}
        className="w-full h-12 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
        style={item.bestValue || item.popular
          ? { background: "linear-gradient(135deg, #FF1B8D, #d6007a)", color: "white", boxShadow: "0 0 20px rgba(255,27,141,0.4)" }
          : { background: "rgba(255,27,141,0.1)", border: "1.5px solid rgba(255,27,141,0.4)", color: "#FF1B8D" }}
        data-testid={`button-buy-${item.sku}`}
      >
        <Crown className="w-4 h-4" />
        Get {item.name}
      </button>
    </div>
  );
}

function CubeCard({ item, onBuy }: { item: ShopItem; onBuy: () => void }) {
  const total = (item.cubes || 0) + (item.bonusCubes || 0);
  const isPremium = item.popular || item.bestValue;
  return (
    <button
      onClick={onBuy}
      className="rounded-3xl p-4 text-left relative overflow-hidden active:scale-[0.98] transition-transform"
      style={{
        background: isPremium
          ? "linear-gradient(135deg, rgba(255,27,141,0.12) 0%, rgba(0,207,255,0.1) 100%)"
          : "rgba(255,255,255,0.04)",
        border: item.bestValue ? "1.5px solid rgba(255,27,141,0.5)" : item.popular ? "1.5px solid rgba(0,207,255,0.4)" : "1px solid rgba(255,255,255,0.08)",
        boxShadow: item.bestValue ? "0 0 20px rgba(255,27,141,0.2)" : undefined,
      }}
      data-testid={`cube-${item.sku}`}
    >
      {item.badge && (
        <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider"
          style={{ background: item.bestValue ? "rgba(255,27,141,0.2)" : "rgba(0,207,255,0.15)", color: item.bestValue ? "#FF1B8D" : "#00CFFF", border: `1px solid ${item.bestValue ? "rgba(255,27,141,0.4)" : "rgba(0,207,255,0.3)"}` }}>
          {item.badge}
        </div>
      )}

      <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ background: "linear-gradient(135deg, rgba(0,207,255,0.25), rgba(255,27,141,0.2))", border: "1px solid rgba(0,207,255,0.3)", boxShadow: "0 0 16px rgba(0,207,255,0.25)" }}>
        <Sparkles className="w-6 h-6 text-icebreaker-teal" />
      </div>

      <p className="text-[10px] font-extrabold uppercase tracking-widest text-icebreaker-muted">{item.name}</p>
      <p className="text-2xl font-black tracking-tight leading-none mt-1" style={{ background: "linear-gradient(135deg, #00CFFF, #FF1B8D)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
        {total.toLocaleString("en-IN")}
      </p>
      <p className="text-[10px] text-icebreaker-muted font-semibold">cubes {item.bonusCubes ? <span className="text-icebreaker-teal">incl. +{item.bonusCubes}</span> : null}</p>
      <p className="text-xs text-icebreaker-muted/80 mt-1 leading-snug min-h-[2.5em]">{item.tagline}</p>

      <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
        <span className="text-lg font-extrabold">{fmt(item.priceInPaise)}</span>
        <span className="text-[10px] font-extrabold text-icebreaker-coral uppercase tracking-wider">Buy →</span>
      </div>
    </button>
  );
}

function TrustStrip() {
  return (
    <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="flex items-center gap-1.5">
        <Zap className="w-3.5 h-3.5 text-icebreaker-teal" />
        <span className="text-[10px] font-bold text-icebreaker-muted uppercase tracking-wider">Instant</span>
      </div>
      <div className="w-px h-3 bg-white/10" />
      <div className="flex items-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 text-icebreaker-teal" />
        <span className="text-[10px] font-bold text-icebreaker-muted uppercase tracking-wider">Secure</span>
      </div>
      <div className="w-px h-3 bg-white/10" />
      <div className="flex items-center gap-1.5">
        <Flame className="w-3.5 h-3.5 text-icebreaker-coral" />
        <span className="text-[10px] font-bold text-icebreaker-muted uppercase tracking-wider">Cancel anytime</span>
      </div>
    </div>
  );
}
