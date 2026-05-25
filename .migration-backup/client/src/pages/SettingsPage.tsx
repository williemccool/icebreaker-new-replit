import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, User, Bell, Shield, Eye, Heart, HelpCircle, FileText, LogOut,
  ChevronRight, Phone, MapPin, Crown, Sparkles, Trash2, Moon,
} from "lucide-react";

type SectionRow = {
  label: string;
  sublabel?: string;
  icon: any;
  href?: string;
  onClick?: () => void;
  toggle?: { value: boolean; onChange: (v: boolean) => void };
  value?: string;
  danger?: boolean;
};

export default function SettingsPage() {
  const [, navigate] = useLocation();
  const [notifMatches, setNotifMatches] = useState(true);
  const [notifEvents, setNotifEvents] = useState(true);
  const [notifMessages, setNotifMessages] = useState(true);
  const [hiddenMode, setHiddenMode] = useState(false);
  const [readReceipts, setReadReceipts] = useState(true);

  const { data: userData } = useQuery<any>({
    queryKey: ["/api/user/me"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/user/me", { headers: { Authorization: `Bearer ${token}` } });
      return res.json();
    },
  });

  const user = userData?.user;

  const signOut = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/auth";
  };

  const sections: { title: string; rows: SectionRow[] }[] = [
    {
      title: "Account",
      rows: [
        { label: "Edit profile", sublabel: "Photos, bio, interests", icon: User, href: "/onboarding" },
        { label: "Phone number", icon: Phone, value: user?.phone ? `+91 ${user.phone}` : "—" },
        { label: "City", icon: MapPin, value: user?.city || "Bangalore" },
      ],
    },
    {
      title: "Discovery",
      rows: [
        { label: "Hidden mode", sublabel: "Hide from new people", icon: Eye, toggle: { value: hiddenMode, onChange: setHiddenMode } },
        { label: "Read receipts", sublabel: "Let matches see when you read", icon: Heart, toggle: { value: readReceipts, onChange: setReadReceipts } },
      ],
    },
    {
      title: "Notifications",
      rows: [
        { label: "New matches", icon: Heart, toggle: { value: notifMatches, onChange: setNotifMatches } },
        { label: "Messages", icon: Bell, toggle: { value: notifMessages, onChange: setNotifMessages } },
        { label: "Events & venues", icon: Sparkles, toggle: { value: notifEvents, onChange: setNotifEvents } },
      ],
    },
    {
      title: "Premium & Wallet",
      rows: [
        { label: "Manage God Mode", sublabel: "Plans, renewals", icon: Crown, href: "/rewards" },
        { label: "Cubes wallet", sublabel: "Top up & transactions", icon: Sparkles, href: "/shop?tab=cubes" },
      ],
    },
    {
      title: "Privacy & Safety",
      rows: [
        { label: "Trust & Safety", sublabel: "Verification, blocked users", icon: Shield, href: "/safety" },
        { label: "Dark mode", sublabel: "Always on for night vibes", icon: Moon, value: "On" },
      ],
    },
    {
      title: "Support",
      rows: [
        { label: "Help center", icon: HelpCircle },
        { label: "Terms of service", icon: FileText },
        { label: "Privacy policy", icon: FileText },
      ],
    },
    {
      title: "Danger zone",
      rows: [
        { label: "Sign out", icon: LogOut, onClick: signOut, danger: true },
        { label: "Delete account", sublabel: "Permanently remove your data", icon: Trash2, danger: true },
      ],
    },
  ];

  return (
    <div className="min-h-screen pb-24" style={{ background: "#0A0A0C" }}>
      {/* Header */}
      <div className="sticky top-0 z-30 px-4 pt-4 pb-3" style={{ background: "rgba(10,10,12,0.92)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button
            onClick={() => navigate("/profile")}
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4 text-icebreaker-muted" />
          </button>
          <h1 className="text-xl font-extrabold tracking-tight flex-1">Settings</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-5 space-y-6">
        {sections.map(({ title, rows }) => (
          <div key={title}>
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-icebreaker-muted mb-2 px-1">{title}</p>
            <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              {rows.map((row, i) => (
                <SettingsRow key={row.label} row={row} isLast={i === rows.length - 1} />
              ))}
            </div>
          </div>
        ))}

        <p className="text-center text-[10px] text-icebreaker-muted pt-2 pb-4 font-semibold tracking-wider">
          Icebreaker · v1.0.0 · Made in Bangalore
        </p>
      </div>
    </div>
  );
}

function SettingsRow({ row, isLast }: { row: SectionRow; isLast: boolean }) {
  const [, navigate] = useLocation();
  const slug = row.label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const labelId = `row-label-${slug}`;

  const content = (
    <>
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{
          background: row.danger ? "rgba(248,113,113,0.1)" : "rgba(255,27,141,0.1)",
          border: row.danger ? "1px solid rgba(248,113,113,0.2)" : "1px solid rgba(255,27,141,0.2)",
        }}
      >
        <row.icon className={`w-4 h-4 ${row.danger ? "text-red-400" : "text-icebreaker-coral"}`} />
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p id={labelId} className={`text-sm font-bold ${row.danger ? "text-red-400" : "text-white"}`}>{row.label}</p>
        {row.sublabel && <p className="text-xs text-icebreaker-muted -mt-0.5">{row.sublabel}</p>}
      </div>
      {row.toggle ? (
        <Toggle value={row.toggle.value} onChange={row.toggle.onChange} labelledBy={labelId} slug={slug} />
      ) : row.value ? (
        <span className="text-xs font-bold text-icebreaker-muted">{row.value}</span>
      ) : row.href || row.onClick ? (
        <ChevronRight className="w-4 h-4 text-icebreaker-muted" />
      ) : null}
    </>
  );

  const baseCls = `w-full flex items-center gap-3 px-4 py-3.5 transition-colors active:bg-white/[0.02] ${!isLast ? "border-b border-white/[0.04]" : ""}`;
  const testId = `row-${slug}`;

  if (row.href) {
    return (
      <button onClick={() => navigate(row.href!)} className={baseCls} data-testid={testId}>
        {content}
      </button>
    );
  }
  if (row.onClick) {
    return (
      <button onClick={row.onClick} className={baseCls} data-testid={testId}>
        {content}
      </button>
    );
  }
  return <div className={baseCls} data-testid={testId}>{content}</div>;
}

function Toggle({
  value, onChange, labelledBy, slug,
}: { value: boolean; onChange: (v: boolean) => void; labelledBy: string; slug: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      aria-labelledby={labelledBy}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onChange(!value); }}
      className="relative w-11 h-6 rounded-full transition-all flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-icebreaker-coral/50"
      style={{
        background: value ? "linear-gradient(135deg, #FF1B8D, #d6007a)" : "rgba(255,255,255,0.1)",
        boxShadow: value ? "0 0 12px rgba(255,27,141,0.4)" : undefined,
      }}
      data-testid={`toggle-${slug}`}
    >
      <div
        className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all"
        style={{ left: value ? "22px" : "2px" }}
      />
    </button>
  );
}
