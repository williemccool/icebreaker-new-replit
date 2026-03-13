import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Award, Trophy, LogOut, Settings, ChevronRight, Shield, Star } from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";

export default function ProfilePage() {
  const [user] = useState(JSON.parse(localStorage.getItem("user") || "{}"));

  const { data: walletData } = useQuery({
    queryKey: ["/api/user/me"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/user/me", {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.json();
    }
  });

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/";
  };

  const balance = walletData?.wallet?.balance ?? 0;

  return (
    <div className="min-h-screen pb-24">
      <div className="page-header">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <h1 className="text-xl font-extrabold tracking-tight">Profile</h1>
          <button className="w-9 h-9 rounded-xl flex items-center justify-center bg-icebreaker-surface border border-icebreaker-border" data-testid="button-settings">
            <Settings className="w-4 h-4 text-icebreaker-muted" />
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Avatar & Name */}
        <div className="card-dark text-center py-6">
          <div
            className="w-20 h-20 mx-auto rounded-full flex items-center justify-center text-3xl font-extrabold text-white mb-3"
            style={{ background: "linear-gradient(135deg, #FF5A5F 0%, #A855F7 100%)" }}
            data-testid="avatar-profile"
          >
            {user.name?.[0] || "U"}
          </div>
          <h2 className="text-xl font-extrabold tracking-tight">{user.name || "Your Name"}</h2>
          <p className="text-sm text-icebreaker-muted mt-0.5">{user.city || "Bangalore"}</p>
          {user.verified && (
            <div className="flex items-center justify-center gap-1.5 mt-2">
              <Shield className="w-3.5 h-3.5 text-icebreaker-teal" />
              <span className="text-xs font-bold text-icebreaker-teal">Verified</span>
            </div>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: user.level || 1, label: "Level", color: "text-icebreaker-coral" },
            { value: user.xp || 0, label: "XP", color: "text-icebreaker-orchid" },
            { value: balance, label: "Cubes", color: "text-icebreaker-teal" },
          ].map(({ value, label, color }) => (
            <div key={label} className="card-dark text-center py-3" data-testid={`stat-${label.toLowerCase()}`}>
              <div className={`text-2xl font-extrabold ${color}`}>{value}</div>
              <div className="text-xs text-icebreaker-muted mt-0.5 font-semibold">{label}</div>
            </div>
          ))}
        </div>

        {/* Bio */}
        {user.bio && (
          <div className="card-dark">
            <p className="text-sm text-icebreaker-muted leading-relaxed">{user.bio}</p>
          </div>
        )}

        {/* Interests */}
        {user.interests && user.interests.length > 0 && (
          <div className="card-dark">
            <h3 className="text-xs font-bold uppercase tracking-widest text-icebreaker-muted mb-3">Interests</h3>
            <div className="flex flex-wrap gap-2">
              {user.interests.map((interest: string) => (
                <span key={interest} className="pill-neutral">{interest}</span>
              ))}
            </div>
          </div>
        )}

        {/* Quick links */}
        <div className="card-dark divide-y divide-icebreaker-border">
          {[
            { href: "/quests", icon: Sparkles, label: "Quests & Rewards", color: "text-icebreaker-coral" },
            { href: "/leaderboard", icon: Trophy, label: "Leaderboard", color: "text-yellow-400" },
          ].map(({ href, icon: Icon, label, color }) => (
            <Link key={href} href={href}>
              <button className="w-full flex items-center gap-3 py-3 hover:bg-icebreaker-elevated transition-colors" data-testid={`link-${label.toLowerCase().replace(/ /g,"-")}`}>
                <Icon className={`w-4 h-4 ${color} flex-shrink-0`} />
                <span className="text-sm font-semibold flex-1 text-left">{label}</span>
                <ChevronRight className="w-4 h-4 text-icebreaker-muted" />
              </button>
            </Link>
          ))}
        </div>

        {/* Logout */}
        <Button
          onClick={logout}
          variant="outline"
          className="w-full h-10 border-red-500/40 text-red-400 hover:bg-red-500/10 hover:text-red-400 font-semibold text-sm"
          data-testid="button-logout"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>
    </div>
  );
}
