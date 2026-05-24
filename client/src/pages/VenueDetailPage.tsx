import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, MapPin, Star, Zap, Users, Calendar, ChevronRight, Clock, GlassWater, Badge, Radio, Eye } from "lucide-react";
import InVenueUserSheet from "@/components/InVenueUserSheet";

export default function VenueDetailPage() {
  const params = useParams<{ id: string }>();
  const venueId = params.id;
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [presenceTab, setPresenceTab] = useState<"venue" | "live">("venue");
  const [visible, setVisible] = useState(true);
  const [sheetUserId, setSheetUserId] = useState<number | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: [`/api/venues/${venueId}`],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/venues/${venueId}`, { headers: { Authorization: `Bearer ${token}` } });
      return res.json();
    }
  });

  const { data: eventsData } = useQuery({
    queryKey: ["/api/events", venueId],
    queryFn: async () => {
      const res = await fetch(`/api/events?venueId=${venueId}`);
      return res.json();
    }
  });

  const { data: venueRooms } = useQuery({
    queryKey: ["/api/rooms", { venueId }],
    queryFn: async () => {
      const res = await fetch(`/api/rooms?venueId=${venueId}`);
      return res.json();
    }
  });

  const { data: meData } = useQuery({
    queryKey: ["/api/user/me"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/user/me", { headers: { Authorization: `Bearer ${token}` } });
      return res.json();
    }
  });

  // Auto-detect existing check-in for current user
  useEffect(() => {
    const myId = meData?.user?.id;
    const list = data?.checkedInUsers || [];
    if (myId && list.some((row: any) => row.user?.id === myId)) {
      setCheckedIn(true);
    }
  }, [meData, data]);

  const doCheckIn = async () => {
    if (checkedIn) {
      setCheckedIn(false);
      toast({ title: "Checked out" });
      return;
    }
    setCheckingIn(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/venues/${venueId}/check-in`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const d = await res.json();
        setCheckedIn(true);
        toast({ title: `Checked in! +${d.cubesEarned} Cubes 🎉` });
        refetch();
      } else {
        const e = await res.json();
        // if already checked in, still show dashboard
        if (e.error?.includes("already")) setCheckedIn(true);
        else toast({ title: e.error, variant: "destructive" });
      }
    } finally {
      setCheckingIn(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0A0A0C" }}>
        <div className="w-10 h-10 rounded-2xl animate-pulse" style={{ background: "linear-gradient(135deg, #FF1B8D, #00CFFF)" }} />
      </div>
    );
  }

  const { venue, checkedInUsers } = data || {};
  const venueEvents = (eventsData || []).slice(0, 2);

  /* ============================================================
     IN-VENUE DASHBOARD (post check-in)
     ============================================================ */
  if (checkedIn) {
    return (
      <div className="min-h-screen pb-24" style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(255,27,141,0.12) 0%, transparent 50%), #0A0A0C" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-5 pb-3">
          <button onClick={() => navigate("/venues")} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>
          <div className="flex-1 mx-3">
            <h1 className="text-base font-extrabold text-center">{venue?.name}</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full" style={{ background: "rgba(255,27,141,0.2)", border: "1px solid rgba(255,27,141,0.4)" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-icebreaker-coral animate-pulse" />
              <span className="text-[10px] font-bold text-icebreaker-coral">LIVE</span>
            </div>
            <button onClick={doCheckIn} className="px-3 py-1.5 rounded-full text-xs font-bold text-icebreaker-muted" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }} data-testid="button-checkout">
              Check Out
            </button>
          </div>
        </div>

        <div className="max-w-lg mx-auto px-4 space-y-4">
          {/* In-Venue / Online Live toggle */}
          <div className="flex p-1 rounded-2xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <button
              onClick={() => setPresenceTab("venue")}
              className="flex-1 py-2.5 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-1.5"
              style={presenceTab === "venue"
                ? { background: "linear-gradient(135deg, #FF1B8D, #d6007a)", color: "white", boxShadow: "0 2px 12px rgba(255,27,141,0.35)" }
                : { color: "#8A8FA8" }}
              data-testid="tab-in-venue"
            >
              <MapPin className="w-3.5 h-3.5" /> In-Venue
            </button>
            <button
              onClick={() => setPresenceTab("live")}
              className="flex-1 py-2.5 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-1.5"
              style={presenceTab === "live"
                ? { background: "linear-gradient(135deg, #00CFFF, #0099cc)", color: "white", boxShadow: "0 2px 12px rgba(0,207,255,0.35)" }
                : { color: "#8A8FA8" }}
              data-testid="tab-online-live"
            >
              <Radio className="w-3.5 h-3.5" /> Online Live
            </button>
          </div>

          {/* Visibility toggle */}
          <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-icebreaker-muted" />
              <span className="text-xs font-bold">Visible to others here</span>
            </div>
            <button
              onClick={() => setVisible(!visible)}
              className="w-10 h-6 rounded-full relative transition-colors"
              style={{ background: visible ? "#FF1B8D" : "rgba(255,255,255,0.15)" }}
              data-testid="toggle-visible"
              aria-label="Toggle visibility"
            >
              <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all" style={{ left: visible ? "18px" : "2px" }} />
            </button>
          </div>

          {/* Who's here */}
          {presenceTab === "venue" ? (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-base">Who's Here</h2>
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-icebreaker-teal" style={{ background: "rgba(0,207,255,0.15)" }}>{checkedInUsers?.length || 0}</span>
              </div>
              <Link href="/rooms">
                <span className="text-xs font-bold text-icebreaker-coral cursor-pointer">See all →</span>
              </Link>
            </div>
            {checkedInUsers && checkedInUsers.length > 0 ? (
              <div className="grid grid-cols-4 gap-2">
                {checkedInUsers.slice(0, 8).map(({ user }: any, i: number) => {
                  const photos = (user.photos as string[]) || [];
                  const hasPhoto = photos.length > 0;
                  return (
                    <button
                      key={user.id}
                      onClick={() => setSheetUserId(user.id)}
                      className="flex flex-col items-center gap-1.5 cursor-pointer focus:outline-none"
                      data-testid={`checked-in-user-${user.id}`}
                    >
                      <div className="relative">
                        {hasPhoto ? (
                          <img src={photos[0]} alt={user.name || ""} className="w-14 h-14 rounded-full object-cover" style={{ border: i === 0 ? "2px solid rgba(255,27,141,0.6)" : "2px solid rgba(0,207,255,0.3)" }} />
                        ) : (
                          <div className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg text-white" style={{ background: i === 0 ? "linear-gradient(135deg, #FF1B8D, #d6007a)" : "linear-gradient(135deg, #00CFFF, #009ecf)", border: i === 0 ? "2px solid rgba(255,27,141,0.6)" : "2px solid rgba(0,207,255,0.3)" }}>
                            {user.name?.[0] || "U"}
                          </div>
                        )}
                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-green-400 border-2 border-icebreaker-bg" />
                      </div>
                      <span className="text-[10px] font-semibold truncate w-full text-center">{user.name?.split(" ")[0]}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-icebreaker-muted">Be the first here tonight!</p>
              </div>
            )}
          </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h2 className="font-extrabold text-base">Live Rooms</h2>
                  <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md" style={{ background: "rgba(0,207,255,0.15)", color: "#00CFFF" }}>HYBRID MODE</span>
                </div>
                <Link href="/rooms">
                  <span className="text-xs font-bold text-icebreaker-teal cursor-pointer">All rooms →</span>
                </Link>
              </div>
              <p className="text-xs text-icebreaker-muted mb-3">In-venue? You can also join these online rooms from your table to meet others virtually before approaching.</p>
              {venueRooms && venueRooms.length > 0 ? (
                <div className="space-y-2">
                  {venueRooms.slice(0, 3).map((room: any) => {
                    const isLive = room.active;
                    return (
                      <button
                        key={room.id}
                        onClick={() => navigate(`/rooms/${room.id}/entry`)}
                        className="w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all active:scale-[0.98]"
                        style={{ background: "rgba(0,207,255,0.06)", border: `1px solid ${isLive ? "rgba(0,207,255,0.4)" : "rgba(255,255,255,0.08)"}` }}
                        data-testid={`venue-room-${room.id}`}
                      >
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: isLive ? "rgba(255,27,141,0.15)" : "rgba(255,255,255,0.05)" }}>
                          <Radio className={`w-4 h-4 ${isLive ? "text-icebreaker-coral" : "text-icebreaker-muted"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="font-extrabold text-sm truncate">{room.name}</p>
                            {isLive && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: "rgba(255,27,141,0.2)", color: "#FF1B8D" }}>LIVE</span>}
                          </div>
                          <p className="text-[11px] text-icebreaker-muted">{room.participants || 0}/{room.capacity} • {isLive ? "Very Active" : `Starts in ${Math.max(0, Math.floor((new Date(room.startsAt).getTime() - Date.now()) / 60000))}m`}</p>
                        </div>
                        <span className="text-xs font-extrabold px-3 py-1.5 rounded-full" style={{ background: "linear-gradient(135deg, #00CFFF, #0099cc)", color: "white" }}>
                          Join
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <p className="text-sm text-icebreaker-muted">No live rooms here right now</p>
                  <p className="text-xs text-icebreaker-muted/70 mt-1">Check back during peak hours</p>
                </div>
              )}
            </div>
          )}

          {/* Icebreaker Zone Rewards */}
          <div className="rounded-2xl p-4" style={{ background: "linear-gradient(135deg, rgba(255,27,141,0.08), rgba(0,207,255,0.06))", border: "1px solid rgba(255,27,141,0.2)" }}>
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-icebreaker-coral" />
              <h3 className="font-extrabold text-sm">Icebreaker Zone Rewards</h3>
            </div>
            <div className="flex items-center gap-2 text-xs text-icebreaker-muted">
              <span className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-icebreaker-teal flex-shrink-0" style={{ background: "rgba(0,207,255,0.15)" }}>✓</span>
              <span>You've earned <strong className="text-white">+20 Cubes</strong> for checking in tonight</span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-icebreaker-muted">
              <span className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-icebreaker-teal flex-shrink-0" style={{ background: "rgba(0,207,255,0.15)" }}>⚡</span>
              <span>Match someone here for <strong className="text-white">2× XP bonus</strong></span>
            </div>
          </div>

          {/* Venue offers */}
          {venue?.perks && venue.perks.length > 0 && (
            <div>
              <p className="text-xs font-bold text-icebreaker-muted uppercase tracking-widest mb-3">Live Offers</p>
              <div className="space-y-2">
                {venue.perks.slice(0, 2).map((perk: string, i: number) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: i === 0 ? "rgba(255,27,141,0.15)" : "rgba(0,207,255,0.15)" }}>
                        {i === 0 ? <GlassWater className="w-4 h-4 text-icebreaker-coral" /> : <Badge className="w-4 h-4 text-icebreaker-teal" />}
                      </div>
                      <span className="font-semibold text-sm">{perk}</span>
                    </div>
                    <button className="text-xs font-bold text-icebreaker-coral" data-testid={`button-offer-${i}`}>
                      {i === 0 ? "Redeem" : "View"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming at this venue */}
          {venueEvents.length > 0 && (
            <div>
              <p className="text-xs font-bold text-icebreaker-muted uppercase tracking-widest mb-3">Tonight's Schedule</p>
              {venueEvents.map((event: any) => (
                <div key={event.id} className="flex items-center gap-3 p-3 rounded-2xl mb-2" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,27,141,0.15)" }}>
                    <Calendar className="w-4 h-4 text-icebreaker-coral" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-xs truncate">{event.title}</p>
                    <p className="text-[10px] text-icebreaker-muted">{new Date(event.startsAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-icebreaker-muted flex-shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>

        <InVenueUserSheet
          userId={sheetUserId}
          venueName={venue?.name}
          onClose={() => setSheetUserId(null)}
        />
      </div>
    );
  }

  /* ============================================================
     VENUE DETAIL (pre check-in)
     ============================================================ */
  return (
    <div className="min-h-screen pb-24" style={{ background: "#0A0A0C" }}>
      {/* Hero image */}
      <div className="relative h-64">
        {venue?.imageUrl ? (
          <img src={venue.imageUrl} alt={venue.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full" style={{ background: "linear-gradient(135deg, rgba(255,27,141,0.25) 0%, rgba(0,207,255,0.2) 100%)" }} />
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 30%, #0A0A0C 100%)" }} />
        <button onClick={() => navigate("/venues")} className="absolute top-4 left-4 w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(10px)" }} data-testid="button-back">
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>
        {/* Trending badge */}
        {venue?.partner && (
          <div className="absolute top-4 right-4 px-2.5 py-1 rounded-full text-[10px] font-bold" style={{ background: "rgba(0,207,255,0.2)", border: "1px solid rgba(0,207,255,0.5)", color: "#00CFFF", backdropFilter: "blur(10px)" }}>
            🔥 TRENDING
          </div>
        )}
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-6 relative z-10 space-y-4">
        {/* Venue name + meta */}
        <div>
          <div className="flex items-start justify-between gap-3 mb-2">
            <h1 className="text-3xl font-extrabold tracking-tight">{venue?.name}</h1>
            <div className="flex items-center gap-1 text-yellow-400 flex-shrink-0 pt-1">
              <Star className="w-4 h-4 fill-yellow-400" />
              <span className="font-bold text-sm">4.8</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-icebreaker-muted mb-3">
            <MapPin className="w-3.5 h-3.5" />
            <span>{venue?.address || venue?.area || "Bangalore"}</span>
            {venue?.area && <span>• 0.3 mi away</span>}
          </div>
          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {(venue?.tags || [venue?.type]).filter(Boolean).map((t: string) => (
              <span key={t} className="pill-neutral text-xs">{t}</span>
            ))}
          </div>
        </div>

        {/* Check-in status + CTA */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 flex-1 px-3 py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <Users className="w-4 h-4 text-icebreaker-teal" />
            <span className="text-sm font-bold text-icebreaker-teal">{checkedInUsers?.length || 0} here now</span>
          </div>
          <button
            onClick={doCheckIn}
            disabled={checkingIn}
            className="flex-1 h-11 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
            style={{ background: "linear-gradient(135deg, #FF1B8D 0%, #d6007a 100%)", boxShadow: "0 0 20px rgba(255,27,141,0.4)" }}
            data-testid="button-checkin"
          >
            {checkingIn ? "…" : "✓ Check In"}
          </button>
        </div>

        {/* Description */}
        {venue?.description && (
          <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-3.5 h-3.5 text-icebreaker-coral" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-icebreaker-muted">Why it's great for first dates</h3>
            </div>
            <p className="text-sm text-icebreaker-muted leading-relaxed">{venue.description}</p>
          </div>
        )}

        {/* Perks */}
        {venue?.perks && venue.perks.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold text-icebreaker-muted uppercase tracking-widest">Tonight's Perks</p>
            {venue.perks.map((perk: string, i: number) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(0,207,255,0.15)" }}>
                    <GlassWater className="w-4 h-4 text-icebreaker-teal" />
                  </div>
                  <span className="text-sm font-semibold">{perk}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-icebreaker-muted" />
              </div>
            ))}
          </div>
        )}

        {/* Icebreaker Live schedule */}
        <div>
          <p className="text-xs font-bold text-icebreaker-muted uppercase tracking-widest mb-3">Icebreaker Live</p>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {["6 PM", "7 PM", "8 PM", "9 PM", "10 PM"].map((t, i) => (
              <div key={t} className={`flex-shrink-0 px-3 py-2 rounded-xl text-center text-xs font-bold ${i === 1 ? "text-icebreaker-coral" : "text-icebreaker-muted"}`} style={i === 1 ? { background: "rgba(255,27,141,0.15)", border: "1.5px solid rgba(255,27,141,0.4)" } : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="whitespace-nowrap">{t}</div>
                {i === 1 && <div className="text-[9px] mt-0.5">LIVE</div>}
              </div>
            ))}
          </div>
        </div>

        {/* Events */}
        {venueEvents.length > 0 && (
          <div>
            <p className="text-xs font-bold text-icebreaker-muted uppercase tracking-widest mb-3">Events</p>
            {venueEvents.map((event: any) => (
              <div key={event.id} className="flex items-center gap-3 p-4 rounded-2xl mb-2" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,27,141,0.15)" }}>
                  <Calendar className="w-5 h-5 text-icebreaker-coral" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{event.title}</p>
                  <div className="flex items-center gap-1 mt-0.5 text-xs text-icebreaker-muted">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(event.startsAt).toLocaleString("en-IN", { weekday: "short", hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-icebreaker-muted flex-shrink-0" />
              </div>
            ))}
          </div>
        )}

        {/* Unlock Tonight */}
        <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: "linear-gradient(135deg, rgba(255,27,141,0.1), rgba(0,207,255,0.08))", border: "1px solid rgba(255,27,141,0.2)" }}>
          <Zap className="w-8 h-8 text-icebreaker-coral flex-shrink-0" />
          <div className="flex-1">
            <p className="font-extrabold text-sm">Unlock Tonight</p>
            <p className="text-xs text-icebreaker-muted">Check in to access exclusive perks & meet people here</p>
          </div>
          <button onClick={doCheckIn} disabled={checkingIn} className="px-4 py-2 rounded-xl font-bold text-sm text-white" style={{ background: "linear-gradient(135deg, #FF1B8D, #d6007a)" }} data-testid="button-unlock">
            {checkingIn ? "…" : "Check In"}
          </button>
        </div>
      </div>
    </div>
  );
}
