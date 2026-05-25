import { useQuery } from "@tanstack/react-query";
import { Users, Clock, Bell, MapPin, Radio, Zap, Crown } from "lucide-react";
import { useLocation } from "wouter";

export default function RoomsPage() {
  const [, navigate] = useLocation();

  const { data: rooms, isLoading } = useQuery({
    queryKey: ["/api/rooms"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/rooms", { headers: { Authorization: `Bearer ${token}` } });
      return res.json();
    }
  });

  const liveRooms = (rooms || []).filter((r: any) => r.active);
  const upcomingRooms = (rooms || []).filter((r: any) => !r.active);

  const GenderBar = ({ room }: { room: any }) => {
    const total = Math.max(room.participants || 1, 1);
    const female = Math.round((room.femaleRatio || 0.5) * total);
    const male = total - female;
    const femPct = Math.round((female / total) * 100);
    return (
      <div>
        <div className="flex items-center justify-between text-[10px] font-bold mb-1.5">
          <span className="text-icebreaker-coral">♀ {femPct}%</span>
          <span className="text-icebreaker-muted">MIXED</span>
          <span className="text-icebreaker-teal">{100 - femPct}% ♂</span>
        </div>
        <div className="w-full h-1.5 rounded-full overflow-hidden flex">
          <div style={{ width: `${femPct}%`, background: "#FF1B8D" }} />
          <div style={{ width: `${100 - femPct}%`, background: "#00CFFF" }} />
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen pb-24" style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(0,207,255,0.1) 0%, transparent 50%), #0A0A0C" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-5 pb-3">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">Icebreaker Live</h1>
          <p className="text-xs text-icebreaker-muted font-semibold mt-0.5">Real venues. Virtual rooms.</p>
        </div>
        <button className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <Bell className="w-4 h-4 text-icebreaker-muted" />
        </button>
      </div>

      <div className="max-w-lg mx-auto px-4 space-y-4">
        {isLoading && [1, 2, 3].map(i => (
          <div key={i} className="rounded-2xl h-56 animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
        ))}

        {/* Live rooms */}
        {liveRooms.map((room: any) => {
          const isFull = (room.participants || 0) >= room.capacity;
          const pct = Math.min(100, Math.round(((room.participants || 0) / room.capacity) * 100));
          const spotsLeft = room.capacity - (room.participants || 0);
          const endMs = new Date(room.endsAt).getTime() - Date.now();
          const endMin = Math.max(0, Math.floor(endMs / 60000));

          return (
            <div key={room.id} className="rounded-2xl overflow-hidden" style={{ background: "linear-gradient(135deg, #0d0d1a 0%, #141428 100%)", border: "1px solid rgba(0,207,255,0.2)", boxShadow: "0 0 40px rgba(0,207,255,0.06)" }} data-testid={`room-card-${room.id}`}>
              {/* Location row */}
              <div className="flex items-center justify-between px-4 pt-3 pb-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-icebreaker-teal" />
                  <span className="text-xs font-bold text-icebreaker-muted uppercase tracking-wide">{room.venueName || "Neon High – Indiranagar"}</span>
                </div>
                <span className="text-xs font-bold text-icebreaker-muted">›</span>
              </div>

              <div className="p-4 space-y-3">
                {/* Title + badges */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: "rgba(255,27,141,0.2)", border: "1px solid rgba(255,27,141,0.4)", color: "#FF1B8D" }}>
                      <span className="w-1.5 h-1.5 rounded-full bg-icebreaker-coral animate-pulse" />
                      LIVE
                    </span>
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: "rgba(255,176,0,0.15)", border: "1px solid rgba(255,176,0,0.3)", color: "#FFB000" }}>
                      <Zap className="w-3 h-3" />
                      2×XP
                    </span>
                    {room.premium && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: "rgba(0,207,255,0.15)", border: "1px solid rgba(0,207,255,0.3)", color: "#00CFFF" }}>
                        <Crown className="w-3 h-3" />
                        God Mode
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-extrabold">{room.name}</h3>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-3 text-xs text-icebreaker-muted font-semibold">
                  <div className="flex items-center gap-1"><Clock className="w-3 h-3" /> Ends in {endMin}m</div>
                  {pct >= 70 && <span className="text-icebreaker-coral font-bold">FILLING FAST</span>}
                  <div className="flex items-center gap-1"><Users className="w-3 h-3" /> {room.participants || 0}/{room.capacity} joined</div>
                </div>

                {/* Gender bar */}
                <GenderBar room={room} />

                {/* Pricing */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl p-2.5" style={{ background: "rgba(255,27,141,0.06)", border: "1px solid rgba(255,27,141,0.15)" }}>
                    <p className="text-[10px] font-bold text-icebreaker-coral uppercase mb-0.5">Women</p>
                    <p className="text-sm font-extrabold text-white">Free</p>
                    <p className="text-[10px] text-icebreaker-teal font-semibold">+ Earn 20 Cubes</p>
                  </div>
                  <div className="rounded-xl p-2.5" style={{ background: "rgba(0,207,255,0.06)", border: "1px solid rgba(0,207,255,0.15)" }}>
                    <p className="text-[10px] font-bold text-icebreaker-teal uppercase mb-0.5">Men</p>
                    <p className="text-sm font-extrabold text-white">40 Cubes</p>
                    <p className="text-[10px] text-icebreaker-muted font-semibold">or Night Pass</p>
                  </div>
                </div>

                {/* Join button */}
                <button
                  onClick={() => !isFull && navigate(`/rooms/${room.id}/entry`)}
                  disabled={isFull}
                  className="w-full h-12 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                  style={isFull ? { background: "rgba(255,255,255,0.06)" } : { background: "linear-gradient(135deg, #FF1B8D 0%, #d6007a 100%)", boxShadow: "0 0 20px rgba(255,27,141,0.4)" }}
                  data-testid={`button-join-room-${room.id}`}
                >
                  <Radio className="w-4 h-4" />
                  {isFull ? "Room Full" : "Join Room →"}
                </button>
              </div>
            </div>
          );
        })}

        {/* Upcoming rooms */}
        {upcomingRooms.length > 0 && (
          <div>
            <p className="text-xs font-bold text-icebreaker-muted uppercase tracking-widest mb-3">Upcoming</p>
            {upcomingRooms.map((room: any) => {
              const startMs = new Date(room.startsAt).getTime() - Date.now();
              const startMin = Math.max(0, Math.floor(startMs / 60000));
              return (
                <div key={room.id} className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} data-testid={`upcoming-room-${room.id}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(255,176,0,0.15)", color: "#FFB000", border: "1px solid rgba(255,176,0,0.3)" }}>UPCOMING</span>
                      </div>
                      <h3 className="font-extrabold text-base">{room.name}</h3>
                      <p className="text-xs text-icebreaker-muted mt-0.5">Starts in {startMin}m</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-icebreaker-coral font-bold">Women: 10 Cubes</p>
                      <p className="text-xs text-icebreaker-teal font-bold">Men: 25 Cubes</p>
                    </div>
                  </div>
                  <GenderBar room={room} />
                  <button className="w-full h-10 rounded-xl font-bold text-sm mt-3 flex items-center justify-center gap-1.5" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }} data-testid={`button-remind-room-${room.id}`}>
                    <Bell className="w-3.5 h-3.5 text-icebreaker-muted" />
                    <span className="text-icebreaker-muted">Set Reminder</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {!isLoading && (!rooms || rooms.length === 0) && (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)" }}>
              <Radio className="w-8 h-8 text-icebreaker-muted" />
            </div>
            <p className="font-bold text-icebreaker-muted">No active rooms right now</p>
            <p className="text-xs text-icebreaker-muted/60">Rooms open when events start</p>
          </div>
        )}

        {/* Location note */}
        <div className="flex items-center gap-2 py-3 px-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <MapPin className="w-3.5 h-3.5 text-icebreaker-muted flex-shrink-0" />
          <p className="text-xs text-icebreaker-muted">Rooms require Location Access to check-in</p>
        </div>
      </div>
    </div>
  );
}
