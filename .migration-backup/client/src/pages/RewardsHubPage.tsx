import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Crown, Sparkles, Trophy, ChevronRight, ArrowLeft, CheckCircle,
  TrendingUp, TrendingDown, Zap, Calendar, Award, Flame,
} from "lucide-react";

const authFetch = async (url: string) => {
  const token = localStorage.getItem("token");
  const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) return null;
  return res.json();
};

const daysBetween = (a: Date, b: Date) =>
  Math.max(0, Math.ceil((b.getTime() - a.getTime()) / (24 * 3600 * 1000)));

const TXN_LABEL: Record<string, string> = {
  check_in: "Venue check-in",
  match: "New match",
  quest_complete: "Quest complete",
  season_top_up: "Season top-up",
  drink_gift: "Sent a drink",
  event_ticket: "Event ticket",
};

export default function RewardsHubPage() {
  const { data: walletData } = useQuery<any>({ queryKey: ["/api/wallet"], queryFn: () => authFetch("/api/wallet") });
  const { data: subData } = useQuery<any>({ queryKey: ["/api/me/subscription"], queryFn: () => authFetch("/api/me/subscription") });
  const { data: rankData } = useQuery<any>({ queryKey: ["/api/me/rank"], queryFn: () => authFetch("/api/me/rank") });
  const { data: quests } = useQuery<any[]>({ queryKey: ["/api/quests"], queryFn: () => authFetch("/api/quests") });
  const { data: txns } = useQuery<any[]>({ queryKey: ["/api/cubes/transactions"], queryFn: () => authFetch("/api/cubes/transactions") });

  const wallet = walletData?.wallet;
  const sub = subData?.subscription;
  const season = rankData?.season;
  const isPremium = !!sub;
  const premiumDaysLeft = sub ? daysBetween(new Date(), new Date(sub.endsAt)) : 0;
  const seasonDaysLeft = season ? daysBetween(new Date(), new Date(season.endDate)) : 0;

  const completedQuests = (quests || []).filter((q) => q.progress?.completedAt).length;
  const totalQuests = quests?.length || 0;
  const seasonPct = totalQuests ? Math.round((completedQuests / totalQuests) * 100) : 0;

  return (
    <div className="min-h-screen pb-28" style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(255,27,141,0.14) 0%, transparent 50%), #0A0A0C" }}>
      {/* Header */}
      <div className="sticky top-0 z-20 px-4 pt-4 pb-3" style={{ background: "rgba(10,10,12,0.92)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link href="/profile">
            <button className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }} data-testid="button-back">
              <ArrowLeft className="w-4 h-4 text-icebreaker-muted" />
            </button>
          </Link>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">Rewards</h1>
            <p className="text-xs text-icebreaker-muted -mt-0.5">Premium · Cubes · Season Pass</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-5 space-y-5">

        {/* ============ PREMIUM / GOD MODE ============ */}
        <div
          className="rounded-3xl p-5 relative overflow-hidden"
          style={{
            background: isPremium
              ? "linear-gradient(135deg, #2a0f1f 0%, #0f1a2e 100%)"
              : "linear-gradient(135deg, #141418 0%, #1a1420 100%)",
            border: isPremium ? "1px solid rgba(255,27,141,0.4)" : "1px solid rgba(255,255,255,0.07)",
            boxShadow: isPremium ? "0 0 40px rgba(255,27,141,0.18)" : undefined,
          }}
          data-testid="card-premium"
        >
          <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full opacity-30" style={{ background: "radial-gradient(circle, #FF1B8D 0%, transparent 70%)" }} />
          <div className="absolute -left-8 -bottom-8 w-40 h-40 rounded-full opacity-20" style={{ background: "radial-gradient(circle, #00CFFF 0%, transparent 70%)" }} />

          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #FF1B8D, #d6007a)", boxShadow: "0 0 20px rgba(255,27,141,0.5)" }}>
                  <Crown className="w-5 h-5 text-white" fill="white" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-icebreaker-coral">God Mode</p>
                  <p className="text-base font-extrabold tracking-tight -mt-0.5">{isPremium ? "Active" : "Unlock Premium"}</p>
                </div>
              </div>
              {isPremium && (
                <div className="px-2.5 py-1 rounded-full" style={{ background: "rgba(0,207,255,0.12)", border: "1px solid rgba(0,207,255,0.3)" }}>
                  <span className="text-[10px] font-extrabold text-icebreaker-teal uppercase tracking-wider">{premiumDaysLeft}d left</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
              {[
                { icon: Zap, label: "Unlimited swipes" },
                { icon: Flame, label: "See who likes you" },
                { icon: Crown, label: "Premium rooms" },
                { icon: Sparkles, label: "2× Cubes earning" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 text-xs">
                  <Icon className="w-3.5 h-3.5 text-icebreaker-coral flex-shrink-0" />
                  <span className="font-semibold text-icebreaker-muted">{label}</span>
                </div>
              ))}
            </div>

            {isPremium ? (
              <div className="rounded-2xl px-4 py-3 flex items-center justify-between" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-icebreaker-muted font-bold">Plan</p>
                  <p className="text-sm font-extrabold">{sub.plan?.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-widest text-icebreaker-muted font-bold">Renews</p>
                  <p className="text-sm font-extrabold">{new Date(sub.endsAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
                </div>
              </div>
            ) : (
              <Link href="/shop?tab=godmode">
                <button className="w-full h-12 rounded-2xl font-extrabold text-sm text-white flex items-center justify-center gap-2" style={{ background: "linear-gradient(135deg, #FF1B8D 0%, #d6007a 100%)", boxShadow: "0 0 24px rgba(255,27,141,0.5)" }} data-testid="button-upgrade-premium">
                  <Crown className="w-4 h-4" />
                  Upgrade to God Mode · from ₹499
                </button>
              </Link>
            )}
          </div>
        </div>

        {/* ============ CUBES WALLET ============ */}
        <div className="rounded-3xl p-5" style={{ background: "linear-gradient(135deg, rgba(0,207,255,0.08) 0%, rgba(255,27,141,0.06) 100%)", border: "1px solid rgba(0,207,255,0.25)" }} data-testid="card-cubes">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "rgba(0,207,255,0.15)", border: "1px solid rgba(0,207,255,0.3)" }}>
                <Sparkles className="w-5 h-5 text-icebreaker-teal" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-icebreaker-teal">Cubes Wallet</p>
                <p className="text-base font-extrabold tracking-tight -mt-0.5">In-app currency</p>
              </div>
            </div>
            <Link href="/shop?tab=cubes">
              <button className="px-3 h-8 rounded-full text-xs font-extrabold flex items-center gap-1" style={{ background: "linear-gradient(135deg, #00CFFF, #008fb3)", color: "white", boxShadow: "0 0 12px rgba(0,207,255,0.4)" }} data-testid="button-topup-cubes">
                <Sparkles className="w-3 h-3" /> Top up
              </button>
            </Link>
          </div>

          <div className="flex items-end gap-2 mb-1">
            <span className="text-5xl font-black tracking-tight" style={{ background: "linear-gradient(135deg, #00CFFF, #FF1B8D)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }} data-testid="text-cube-balance">
              {wallet?.balance ?? 0}
            </span>
            <span className="text-sm text-icebreaker-muted font-bold mb-2">cubes</span>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-3">
            <div className="rounded-2xl px-3 py-2.5" style={{ background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div className="flex items-center gap-1.5 mb-0.5">
                <TrendingUp className="w-3 h-3 text-icebreaker-teal" />
                <span className="text-[10px] uppercase tracking-wider text-icebreaker-muted font-bold">Earned</span>
              </div>
              <p className="text-base font-extrabold text-icebreaker-teal">{wallet?.totalEarned ?? 0}</p>
            </div>
            <div className="rounded-2xl px-3 py-2.5" style={{ background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div className="flex items-center gap-1.5 mb-0.5">
                <TrendingDown className="w-3 h-3 text-icebreaker-coral" />
                <span className="text-[10px] uppercase tracking-wider text-icebreaker-muted font-bold">Spent</span>
              </div>
              <p className="text-base font-extrabold text-icebreaker-coral">{wallet?.totalSpent ?? 0}</p>
            </div>
          </div>

          {txns && txns.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/5">
              <p className="text-[10px] uppercase tracking-widest text-icebreaker-muted font-bold mb-2">Recent activity</p>
              <div className="space-y-1.5">
                {txns.slice(0, 5).map((t: any) => {
                  const reason = t.meta?.reason || "activity";
                  const earn = t.kind === "earn";
                  return (
                    <div key={t.id} className="flex items-center justify-between text-xs py-1.5" data-testid={`txn-${t.id}`}>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: earn ? "rgba(0,207,255,0.1)" : "rgba(255,27,141,0.1)" }}>
                          {earn ? <TrendingUp className="w-3 h-3 text-icebreaker-teal" /> : <TrendingDown className="w-3 h-3 text-icebreaker-coral" />}
                        </div>
                        <div>
                          <p className="font-bold text-white">{TXN_LABEL[reason] || reason}</p>
                          <p className="text-[10px] text-icebreaker-muted">{new Date(t.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
                        </div>
                      </div>
                      <span className={`font-extrabold ${earn ? "text-icebreaker-teal" : "text-icebreaker-coral"}`}>
                        {earn ? "+" : "−"}{t.amount}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ============ SEASON PASS ============ */}
        {season && (
          <div className="rounded-3xl p-5" style={{ background: "linear-gradient(135deg, #14101e 0%, #0d1424 100%)", border: "1px solid rgba(255,255,255,0.08)" }} data-testid="card-season">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(255,215,0,0.2), rgba(255,27,141,0.15))", border: "1px solid rgba(255,215,0,0.3)" }}>
                  <Trophy className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-yellow-400">Season Pass</p>
                  <p className="text-base font-extrabold tracking-tight -mt-0.5">{season.title}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-widest text-icebreaker-muted font-bold">Ends in</p>
                <p className="text-sm font-extrabold flex items-center gap-1"><Calendar className="w-3 h-3" />{seasonDaysLeft}d</p>
              </div>
            </div>

            {/* Rank chip */}
            {rankData?.rank && (
              <div className="rounded-2xl px-4 py-3 flex items-center justify-between mb-3" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center font-extrabold" style={{ background: "linear-gradient(135deg, #FFD700, #FF1B8D)", color: "#0A0A0C" }}>
                    #{rankData.rank}
                  </div>
                  <div>
                    <p className="text-xs text-icebreaker-muted font-semibold">Your rank in Bangalore</p>
                    <p className="text-sm font-extrabold">{rankData.score} pts · top {Math.max(1, Math.round((rankData.rank / Math.max(rankData.total, 1)) * 100))}%</p>
                  </div>
                </div>
                <Link href="/leaderboard">
                  <span className="text-xs font-bold text-icebreaker-coral cursor-pointer flex items-center gap-0.5">Full board <ChevronRight className="w-3 h-3" /></span>
                </Link>
              </div>
            )}

            {/* Season progress */}
            <div className="mb-3">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs font-bold text-icebreaker-muted">Quest progress</span>
                <span className="text-xs font-extrabold text-icebreaker-coral">{completedQuests}/{totalQuests}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-icebreaker-surface overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${seasonPct}%`, background: "linear-gradient(90deg, #FF1B8D 0%, #FFD700 50%, #00CFFF 100%)", boxShadow: "0 0 12px rgba(255,27,141,0.5)" }} />
              </div>
            </div>

            {/* Active quests preview */}
            <div className="space-y-2">
              {(quests || []).slice(0, 3).map((q: any) => {
                const prog = q.progress?.progress || 0;
                const done = !!q.progress?.completedAt;
                const pct = Math.min((prog / q.goalValue) * 100, 100);
                return (
                  <div key={q.id} className="rounded-2xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${done ? "rgba(0,207,255,0.25)" : "rgba(255,255,255,0.06)"}` }} data-testid={`quest-preview-${q.id}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {done && <CheckCircle className="w-3.5 h-3.5 text-icebreaker-teal flex-shrink-0" />}
                        <span className="text-xs font-extrabold truncate">{q.title}</span>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Sparkles className="w-3 h-3 text-icebreaker-coral" />
                        <span className="text-xs font-extrabold text-icebreaker-coral">+{q.rewardCubes}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-icebreaker-surface overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: done ? "#00CFFF" : "linear-gradient(90deg, #FF1B8D, #00CFFF)" }} />
                      </div>
                      <span className="text-[10px] font-bold text-icebreaker-muted">{prog}/{q.goalValue}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-2 mt-3">
              <Link href="/quests">
                <button className="w-full h-11 rounded-2xl font-bold text-sm flex items-center justify-center gap-2" style={{ background: "rgba(255,27,141,0.1)", border: "1.5px solid rgba(255,27,141,0.4)", color: "#FF1B8D" }} data-testid="button-all-quests">
                  <Award className="w-4 h-4" />
                  All quests
                </button>
              </Link>
              <Link href="/shop?tab=season">
                <button className="w-full h-11 rounded-2xl font-extrabold text-sm text-black flex items-center justify-center gap-2" style={{ background: "linear-gradient(135deg, #FFD700, #FF1B8D)", boxShadow: "0 0 16px rgba(255,215,0,0.35)" }} data-testid="button-buy-season-pass">
                  <Trophy className="w-4 h-4" />
                  Get Season Pass
                </button>
              </Link>
            </div>
          </div>
        )}

        {/* Shop entry */}
        <Link href="/shop">
          <div className="rounded-3xl p-4 cursor-pointer flex items-center gap-3 active:scale-[0.99] transition-transform" style={{ background: "linear-gradient(135deg, #1a0e1a 0%, #0d1424 100%)", border: "1px solid rgba(255,27,141,0.3)" }} data-testid="link-shop">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #FF1B8D, #00CFFF)" }}>
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-extrabold">Shop · Cubes · Plans · Season Pass</p>
              <p className="text-[10px] text-icebreaker-muted">Everything in one place — instant unlock</p>
            </div>
            <ChevronRight className="w-5 h-5 text-icebreaker-muted" />
          </div>
        </Link>

        {/* Shortcuts */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/quests">
            <div className="rounded-2xl p-4 cursor-pointer" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }} data-testid="link-quests">
              <Award className="w-5 h-5 text-icebreaker-coral mb-2" />
              <p className="text-sm font-extrabold">All quests</p>
              <p className="text-[10px] text-icebreaker-muted">Earn Cubes & XP</p>
            </div>
          </Link>
          <Link href="/leaderboard">
            <div className="rounded-2xl p-4 cursor-pointer" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }} data-testid="link-leaderboard">
              <Trophy className="w-5 h-5 text-yellow-400 mb-2" />
              <p className="text-sm font-extrabold">Leaderboard</p>
              <p className="text-[10px] text-icebreaker-muted">City rankings</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
