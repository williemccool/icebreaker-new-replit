import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import {
  Settings, MapPin, BadgeCheck, Sparkles, ChevronRight, Shield, Crown,
  Trophy, Edit3, Zap, Award,
} from "lucide-react";

const authFetch = async (url: string) => {
  const token = localStorage.getItem("token");
  const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) return null;
  return res.json();
};

export default function ProfilePage() {
  const [, navigate] = useLocation();
  const { data: userData } = useQuery<any>({ queryKey: ["/api/user/me"], queryFn: () => authFetch("/api/user/me") });
  const { data: walletData } = useQuery<any>({ queryKey: ["/api/wallet"], queryFn: () => authFetch("/api/wallet") });
  const { data: subData } = useQuery<any>({ queryKey: ["/api/me/subscription"], queryFn: () => authFetch("/api/me/subscription") });
  const { data: rankData } = useQuery<any>({ queryKey: ["/api/me/rank"], queryFn: () => authFetch("/api/me/rank") });

  const user = userData?.user;
  const age = user?.dob ? Math.floor((Date.now() - new Date(user.dob).getTime()) / (365.25 * 24 * 3600 * 1000)) : null;
  const isPremium = !!subData?.subscription;

  const stats = [
    { value: user?.level ?? 1, label: "Level", icon: Zap },
    { value: (user?.xp ?? 0).toLocaleString("en-IN"), label: "XP", icon: Award },
    { value: rankData?.rank ? `#${rankData.rank}` : "—", label: "Rank", icon: Trophy },
  ];

  return (
    <div className="min-h-screen pb-24" style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(255,27,141,0.12) 0%, transparent 50%), #0A0A0C" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-2 max-w-lg mx-auto">
        <h1 className="text-xl font-extrabold tracking-tight">Profile</h1>
        <button
          onClick={() => navigate("/settings")}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors active:bg-white/10"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
          aria-label="Open settings"
          data-testid="button-settings"
        >
          <Settings className="w-4 h-4 text-icebreaker-muted" />
        </button>
      </div>

      <div className="max-w-lg mx-auto px-5 space-y-5">
        {/* Hero card: avatar + identity + edit */}
        <div className="rounded-3xl p-5 relative overflow-hidden" style={{ background: "linear-gradient(180deg, rgba(255,27,141,0.08) 0%, rgba(255,255,255,0.02) 100%)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-3">
              <div className="w-24 h-24 rounded-full p-[3px]" style={{ background: "linear-gradient(135deg, #FF1B8D 0%, #00CFFF 100%)" }}>
                <div className="w-full h-full rounded-full bg-icebreaker-surface flex items-center justify-center text-3xl font-extrabold text-white" data-testid="avatar-profile">
                  {user?.name?.[0]?.toUpperCase() || "U"}
                </div>
              </div>
              {user?.verified && (
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #FF1B8D, #00CFFF)" }}>
                  <BadgeCheck className="w-4 h-4 text-white" />
                </div>
              )}
            </div>

            <h2 className="text-2xl font-extrabold tracking-tight" data-testid="text-profile-name">
              {user?.name || "Your Name"}{age ? `, ${age}` : ""}
            </h2>
            <div className="flex items-center gap-1.5 mt-1 text-icebreaker-muted text-sm">
              <MapPin className="w-3.5 h-3.5" />
              <span>{user?.city || "Bangalore"}</span>
            </div>

            <div className="flex items-center gap-1.5 mt-3 flex-wrap justify-center">
              {user?.verified && (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full" style={{ background: "rgba(0,207,255,0.1)", border: "1px solid rgba(0,207,255,0.25)" }}>
                  <Shield className="w-3 h-3 text-icebreaker-teal" />
                  <span className="text-[10px] font-extrabold text-icebreaker-teal uppercase tracking-wider">Verified</span>
                </div>
              )}
              {isPremium && (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full" style={{ background: "rgba(255,27,141,0.12)", border: "1px solid rgba(255,27,141,0.3)" }}>
                  <Crown className="w-3 h-3 text-icebreaker-coral" fill="#FF1B8D" />
                  <span className="text-[10px] font-extrabold text-icebreaker-coral uppercase tracking-wider">God Mode</span>
                </div>
              )}
            </div>

            <button
              onClick={() => navigate("/onboarding")}
              className="mt-4 h-10 px-5 rounded-full font-extrabold text-xs text-white flex items-center gap-1.5 active:scale-95 transition-transform"
              style={{ background: "linear-gradient(135deg, #FF1B8D, #d6007a)", boxShadow: "0 0 16px rgba(255,27,141,0.3)" }}
              data-testid="button-edit-profile"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Edit profile
            </button>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-2.5">
          {stats.map(({ value, label, icon: Icon }) => (
            <div key={label} className="rounded-2xl p-3.5 text-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <Icon className="w-4 h-4 text-icebreaker-coral mx-auto mb-1.5" />
              <p className="text-xl font-extrabold text-white leading-none" data-testid={`stat-${label.toLowerCase()}`}>{value}</p>
              <p className="text-[10px] text-icebreaker-muted mt-1 uppercase tracking-widest font-bold">{label}</p>
            </div>
          ))}
        </div>

        {/* Rewards hub entry */}
        <Link href="/rewards">
          <div className="rounded-2xl p-4 relative overflow-hidden cursor-pointer active:scale-[0.99] transition-transform" style={{ background: "linear-gradient(135deg, #2a0f1f 0%, #0f1a2e 100%)", border: "1px solid rgba(255,27,141,0.35)" }} data-testid="card-rewards-entry">
            <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full opacity-25" style={{ background: "radial-gradient(circle, #FF1B8D 0%, transparent 70%)" }} />
            <div className="relative flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, #FF1B8D, #d6007a)", boxShadow: "0 0 16px rgba(255,27,141,0.45)" }}>
                <Crown className="w-5 h-5 text-white" fill="white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-icebreaker-coral">Rewards</p>
                <p className="text-sm font-extrabold tracking-tight">God Mode · Cubes · Season Pass</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Sparkles className="w-3 h-3 text-icebreaker-teal" />
                  <span className="text-xs font-bold text-icebreaker-teal" data-testid="text-cubes-balance">{walletData?.wallet?.balance ?? 0} cubes</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-icebreaker-muted flex-shrink-0" />
            </div>
          </div>
        </Link>

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/leaderboard">
            <div className="rounded-2xl p-4 cursor-pointer active:scale-[0.98] transition-transform h-full" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }} data-testid="link-leaderboard">
              <Trophy className="w-5 h-5 text-yellow-400 mb-2" />
              <p className="text-sm font-extrabold">Leaderboard</p>
              <p className="text-[10px] text-icebreaker-muted">City rankings</p>
            </div>
          </Link>
          <Link href="/safety">
            <div className="rounded-2xl p-4 cursor-pointer active:scale-[0.98] transition-transform h-full" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }} data-testid="link-safety">
              <Shield className="w-5 h-5 text-icebreaker-teal mb-2" />
              <p className="text-sm font-extrabold">Trust & Safety</p>
              <p className="text-[10px] text-icebreaker-muted">Verification, blocks</p>
            </div>
          </Link>
        </div>

        {/* Settings link */}
        <Link href="/settings">
          <div className="rounded-2xl p-4 flex items-center gap-3 cursor-pointer active:scale-[0.99] transition-transform" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }} data-testid="link-settings">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)" }}>
              <Settings className="w-4 h-4 text-icebreaker-muted" />
            </div>
            <span className="flex-1 font-bold text-sm">Settings & preferences</span>
            <ChevronRight className="w-4 h-4 text-icebreaker-muted" />
          </div>
        </Link>
      </div>
    </div>
  );
}
