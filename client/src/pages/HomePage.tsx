import { Link, useLocation } from "wouter";
import { MapPin, Users, Calendar, Sparkles, Bell, Radio, Mic, Trophy, ChevronRight, Heart } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

const TABS = ["Dating", "Friends", "Crew", "Events"];

export default function HomePage() {
  const [activeTab, setActiveTab] = useState("Dating");
  const [, navigate] = useLocation();

  const { data: userData } = useQuery({
    queryKey: ["/api/user/me"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/user/me", { headers: { Authorization: `Bearer ${token}` } });
      return res.json();
    }
  });

  const { data: venues } = useQuery({
    queryKey: ["/api/venues"],
    queryFn: async () => {
      const res = await fetch("/api/venues?city=Bangalore");
      return res.json();
    }
  });

  const { data: rooms } = useQuery({
    queryKey: ["/api/rooms"],
    queryFn: async () => {
      const res = await fetch("/api/rooms");
      return res.json();
    }
  });

  const { data: events } = useQuery({
    queryKey: ["/api/events"],
    queryFn: async () => {
      const res = await fetch("/api/events?city=Bangalore");
      return res.json();
    }
  });

  const user = userData?.user;
  const wallet = userData?.wallet;
  const hotVenues = (venues || []).slice(0, 4);
  const liveRooms = (rooms || []).slice(0, 2);
  const nextEvent = (events || [])[0];

  return (
    <div className="min-h-screen pb-24" style={{ background: "#0A0A0C" }}>

      {/* Header */}
      <div className="sticky top-0 z-20 px-4 pt-4 pb-3" style={{ background: "rgba(10,10,12,0.95)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #FF1B8D, #00CFFF)" }}>
                <Heart className="w-4 h-4 text-white" fill="white" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-icebreaker-muted uppercase tracking-widest">Tonight in</p>
                <p className="text-sm font-extrabold tracking-tight -mt-0.5">Bangalore ▼</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }} data-testid="button-notifications">
                <Bell className="w-4 h-4 text-icebreaker-muted" />
              </button>
              <Link href="/profile">
                <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white" style={{ background: "linear-gradient(135deg, #FF1B8D, #00CFFF)" }} data-testid="avatar-header">
                  {user?.name?.[0] || "U"}
                </div>
              </Link>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-all flex-shrink-0 ${activeTab === tab ? "text-white" : "text-icebreaker-muted"}`}
                style={activeTab === tab ? { background: "rgba(255,27,141,0.2)", border: "1px solid rgba(255,27,141,0.4)", color: "#FF1B8D" } : {}}
                data-testid={`tab-${tab.toLowerCase()}`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 space-y-5 pt-4">

        {/* Go out tonight */}
        <div className="rounded-2xl p-5 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #141418 0%, #1a1420 100%)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="absolute right-0 top-0 bottom-0 w-24 opacity-20" style={{ background: "radial-gradient(ellipse at right, #FF1B8D 0%, transparent 70%)" }} />
          <h2 className="text-xl font-extrabold mb-1">Go out tonight</h2>
          <p className="text-sm text-icebreaker-muted mb-4">Find the vibe, check who's there, and meet IRL.</p>
          <Link href="/venues">
            <button className="flex items-center gap-2 h-11 px-5 rounded-2xl font-bold text-sm text-white w-full justify-center" style={{ background: "linear-gradient(135deg, #FF1B8D 0%, #d6007a 100%)", boxShadow: "0 0 24px rgba(255,27,141,0.4)" }} data-testid="button-explore-venues">
              <MapPin className="w-4 h-4" />
              Explore venues & check in
            </button>
          </Link>
          <p className="text-xs text-icebreaker-muted/60 text-center mt-2">View your favourite spots</p>
        </div>

        {/* Icebreaker Live */}
        <div className="rounded-2xl p-5 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #0d0d1a 0%, #141428 100%)", border: "1px solid rgba(0,207,255,0.15)" }}>
          <div className="absolute right-0 top-0 bottom-0 w-32 opacity-15" style={{ background: "radial-gradient(ellipse at right, #00CFFF 0%, transparent 70%)" }} />
          <div className="flex items-center gap-2 mb-2">
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: "rgba(255,27,141,0.2)", border: "1px solid rgba(255,27,141,0.4)", color: "#FF1B8D" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-icebreaker-coral animate-pulse" />
              LIVE NOW
            </span>
            <span className="text-[10px] text-icebreaker-muted font-semibold">24h LEFT</span>
          </div>
          <h2 className="text-xl font-extrabold mb-1">Icebreaker Live</h2>
          <p className="text-sm text-icebreaker-muted mb-4">Jump into audio rooms and meet people from home.</p>
          <Link href="/rooms">
            <button className="flex items-center gap-2 h-11 px-5 rounded-2xl font-bold text-sm w-full justify-center" style={{ background: "rgba(0,207,255,0.1)", border: "1.5px solid rgba(0,207,255,0.4)", color: "#00CFFF" }} data-testid="button-join-live-room">
              <Mic className="w-4 h-4" />
              Join a Live room
            </button>
          </Link>
          <p className="text-xs text-icebreaker-muted/60 text-center mt-2">See tonight's schedule</p>
        </div>

        {/* Quick action grid */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "My venues", icon: MapPin, href: "/venues", color: "#FF1B8D" },
            { label: "Rooms joined", icon: Users, href: "/rooms", color: "#00CFFF" },
            { label: "My vouchers", icon: Trophy, href: "/quests", color: "#FF1B8D" },
            { label: "Quests", icon: Sparkles, href: "/quests", color: "#00CFFF" },
          ].map(({ label, icon: Icon, href, color }) => (
            <Link key={href + label} href={href}>
              <div className="flex flex-col items-center gap-2 p-3 rounded-2xl cursor-pointer" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }} data-testid={`quick-action-${label.toLowerCase().replace(/ /g, "-")}`}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}18`, border: `1px solid ${color}33` }}>
                  <Icon className="w-4 h-4" style={{ color }} />
                </div>
                <span className="text-[10px] font-semibold text-icebreaker-muted text-center leading-tight">{label}</span>
              </div>
            </Link>
          ))}
        </div>

        {/* Venues near you */}
        {hotVenues.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-extrabold tracking-tight">Venues near you</h3>
              <Link href="/venues">
                <span className="text-xs font-bold text-icebreaker-coral cursor-pointer">See all →</span>
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
              {hotVenues.map((venue: any) => (
                <Link key={venue.id} href={`/venues/${venue.id}`}>
                  <div className="flex-shrink-0 w-36 rounded-2xl overflow-hidden cursor-pointer" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }} data-testid={`venue-card-${venue.id}`}>
                    <div className="h-24 flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(255,27,141,0.2), rgba(0,207,255,0.2))" }}>
                      <MapPin className="w-8 h-8 text-icebreaker-coral" />
                    </div>
                    <div className="p-2.5">
                      <p className="font-bold text-xs leading-snug truncate">{venue.name}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-icebreaker-teal animate-pulse" />
                        <span className="text-[10px] text-icebreaker-teal font-semibold">Hot</span>
                        <span className="text-[10px] text-icebreaker-muted">• {venue.area || venue.type}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Icebreaker Live tonight */}
        {liveRooms.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-extrabold tracking-tight">Icebreaker Live tonight</h3>
              <Link href="/rooms">
                <span className="text-xs font-bold text-icebreaker-coral cursor-pointer">See all →</span>
              </Link>
            </div>
            <div className="space-y-2">
              {liveRooms.map((room: any) => (
                <Link key={room.id} href={`/rooms/${room.id}`}>
                  <div className="flex items-center gap-3 p-3 rounded-2xl cursor-pointer" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }} data-testid={`live-room-${room.id}`}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(0,207,255,0.15)", border: "1px solid rgba(0,207,255,0.3)" }}>
                      <Radio className="w-4 h-4 text-icebreaker-teal" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{room.name}</p>
                      <p className="text-xs text-icebreaker-muted">{room.participants || 0} joined</p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(255,27,141,0.2)", color: "#FF1B8D" }}>LIVE</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Events & Crew plans */}
        {nextEvent && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-extrabold tracking-tight">Events & Crew plans</h3>
              <Link href="/events">
                <span className="text-xs font-bold text-icebreaker-coral cursor-pointer">See all →</span>
              </Link>
            </div>
            <Link href="/events">
              <div className="relative rounded-2xl overflow-hidden cursor-pointer" style={{ border: "1px solid rgba(255,255,255,0.07)" }} data-testid="upcoming-event-card">
                <div className="h-28 flex items-end p-4" style={{ background: "linear-gradient(135deg, #1a0d0d, #1a1a2e)" }}>
                  <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(10,10,12,0.9) 0%, transparent 60%)" }} />
                  <div className="relative z-10 flex items-end justify-between w-full">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-icebreaker-coral">{nextEvent.type}</span>
                      <p className="font-extrabold text-base leading-tight">{nextEvent.title}</p>
                      <p className="text-xs text-icebreaker-muted">{new Date(nextEvent.startsAt).toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" })}</p>
                    </div>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,27,141,0.3)", border: "1px solid rgba(255,27,141,0.5)" }}>
                      <ChevronRight className="w-4 h-4 text-icebreaker-coral" />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* Leaderboard CTA */}
        <Link href="/leaderboard">
          <div className="cursor-pointer rounded-2xl p-4 flex items-center gap-3" style={{ background: "linear-gradient(135deg, rgba(255,176,32,0.08) 0%, rgba(255,27,141,0.06) 100%)", border: "1px solid rgba(255,176,32,0.2)" }} data-testid="leaderboard-cta">
            <Trophy className="w-8 h-8 text-yellow-400 flex-shrink-0" />
            <div>
              <p className="font-extrabold text-sm">Season Leaderboard</p>
              <p className="text-xs text-icebreaker-muted">Climb the ranks. Win real rewards.</p>
            </div>
            <ChevronRight className="ml-auto text-icebreaker-muted w-4 h-4" />
          </div>
        </Link>
      </div>
    </div>
  );
}
