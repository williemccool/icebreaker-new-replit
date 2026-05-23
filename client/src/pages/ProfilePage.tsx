import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Settings, MapPin, BadgeCheck, Heart, Users, PartyPopper, Eye, Sparkles, Trophy, ChevronRight, Shield, LogOut, Crown } from "lucide-react";

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState("Dating");

  const { data: userData } = useQuery({
    queryKey: ["/api/user/me"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/user/me", { headers: { Authorization: `Bearer ${token}` } });
      return res.json();
    }
  });

  const { data: walletData } = useQuery({
    queryKey: ["/api/wallet"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/wallet", { headers: { Authorization: `Bearer ${token}` } });
      return res.json();
    }
  });

  const user = userData?.user;
  const age = user?.dob ? Math.floor((Date.now() - new Date(user.dob).getTime()) / (365.25 * 24 * 3600 * 1000)) : null;

  const TABS = [
    { label: "Dating", icon: Heart },
    { label: "Crew", icon: Users },
    { label: "Party", icon: PartyPopper },
  ];

  const menuItems = [
    { label: "Leaderboard", href: "/leaderboard", icon: Trophy },
    { label: "Trust & Safety", href: "/safety", icon: Shield },
    { label: "My Events", href: "/events", icon: PartyPopper },
  ];

  return (
    <div className="min-h-screen pb-24" style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(255,27,141,0.12) 0%, transparent 50%), #0A0A0C" }}>
      <div className="flex items-center justify-between px-5 pt-5 pb-2 max-w-lg mx-auto">
        <h1 className="text-xl font-extrabold tracking-tight">My Profile</h1>
        <button className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }} data-testid="button-settings">
          <Settings className="w-4 h-4 text-icebreaker-muted" />
        </button>
      </div>

      <div className="max-w-lg mx-auto px-5 space-y-5">
        {/* Avatar + info */}
        <div className="flex flex-col items-center pt-4 pb-2">
          <div className="relative mb-4">
            <div className="w-24 h-24 rounded-full p-[3px]" style={{ background: "linear-gradient(135deg, #FF1B8D 0%, #00CFFF 100%)" }}>
              <div className="w-full h-full rounded-full bg-icebreaker-surface flex items-center justify-center text-3xl font-extrabold text-white" data-testid="avatar-profile">
                {user?.name?.[0] || "U"}
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #FF1B8D, #00CFFF)" }}>
              <BadgeCheck className="w-4 h-4 text-white" />
            </div>
          </div>

          <h2 className="text-2xl font-extrabold tracking-tight text-center">
            {user?.name || "Your Name"}{age ? `, ${age}` : ""}
          </h2>
          <div className="flex items-center gap-1.5 mt-1 text-icebreaker-muted text-sm">
            <MapPin className="w-3.5 h-3.5" />
            <span>{user?.city || "Bangalore"}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full" style={{ background: "rgba(255,27,141,0.1)", border: "1px solid rgba(255,27,141,0.25)" }}>
            <Shield className="w-3.5 h-3.5 text-icebreaker-coral" />
            <span className="text-xs font-bold text-icebreaker-coral uppercase tracking-wider">Verified Profile</span>
          </div>
        </div>

        {/* Mode tabs */}
        <div className="flex items-center gap-2">
          {TABS.map(({ label, icon: Icon }) => (
            <button
              key={label}
              onClick={() => setActiveTab(label)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition-all ${activeTab === label ? "text-white" : "text-icebreaker-muted"}`}
              style={activeTab === label
                ? { background: "linear-gradient(135deg, #FF1B8D 0%, #d6007a 100%)", boxShadow: "0 0 16px rgba(255,27,141,0.4)" }
                : { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
              data-testid={`tab-${label.toLowerCase()}`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: "1.2k", label: "Views", icon: Eye },
            { value: walletData?.wallet?.totalEarned ?? "—", label: "XP", icon: Sparkles },
            { value: user?.xp ?? "—", label: "Matches", icon: Heart },
          ].map(({ value, label }) => (
            <div key={label} className="rounded-2xl p-4 text-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <p className="text-xl font-extrabold text-white" data-testid={`stat-${label.toLowerCase()}`}>{value}</p>
              <p className="text-xs text-icebreaker-muted mt-0.5 uppercase tracking-wide font-semibold">{label}</p>
            </div>
          ))}
        </div>

        {/* Edit profile */}
        <Link href="/onboarding">
          <button className="w-full h-12 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm transition-all active:scale-95" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }} data-testid="button-edit-profile">
            <Settings className="w-4 h-4 text-icebreaker-coral" />
            Edit Profile Details
          </button>
        </Link>

        {/* Rewards hub — Premium / Cubes / Season Pass */}
        <Link href="/rewards">
          <div className="rounded-2xl p-4 relative overflow-hidden cursor-pointer active:scale-[0.99] transition-transform" style={{ background: "linear-gradient(135deg, #2a0f1f 0%, #0f1a2e 100%)", border: "1px solid rgba(255,27,141,0.4)", boxShadow: "0 0 24px rgba(255,27,141,0.18)" }} data-testid="card-rewards-entry">
            <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full opacity-30" style={{ background: "radial-gradient(circle, #FF1B8D 0%, transparent 70%)" }} />
            <div className="relative flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, #FF1B8D, #d6007a)", boxShadow: "0 0 16px rgba(255,27,141,0.5)" }}>
                <Crown className="w-5 h-5 text-white" fill="white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-icebreaker-coral">Rewards</p>
                <p className="text-base font-extrabold tracking-tight">God Mode · Cubes · Season Pass</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Sparkles className="w-3 h-3 text-icebreaker-teal" />
                  <span className="text-xs font-bold text-icebreaker-teal" data-testid="cubes-balance">{walletData?.wallet?.balance ?? 0} cubes</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-icebreaker-muted flex-shrink-0" />
            </div>
          </div>
        </Link>

        {/* Menu items */}
        <div className="space-y-2">
          {menuItems.map(({ label, href, icon: Icon }) => (
            <Link key={href} href={href}>
              <div className="flex items-center gap-3 p-4 rounded-2xl cursor-pointer transition-all active:scale-[0.98]" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="icon-badge-coral w-9 h-9">
                  <Icon className="w-4 h-4 text-icebreaker-coral" />
                </div>
                <span className="flex-1 font-semibold text-sm">{label}</span>
                <ChevronRight className="w-4 h-4 text-icebreaker-muted" />
              </div>
            </Link>
          ))}
        </div>

        <button
          onClick={() => { localStorage.removeItem("token"); localStorage.removeItem("user"); window.location.reload(); }}
          className="w-full py-3 text-sm font-semibold text-red-400/70 text-center flex items-center justify-center gap-2"
          data-testid="button-logout"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </div>
  );
}
