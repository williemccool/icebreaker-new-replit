import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Users, Clock, Crown, MessageSquare } from "lucide-react";
import { useLocation } from "wouter";

export default function RoomsPage() {
  const [, navigate] = useLocation();
  const { data: rooms, isLoading } = useQuery({
    queryKey: ["/api/rooms"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/rooms", {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.json();
    }
  });

  return (
    <div className="min-h-screen pb-24">
      <div className="page-header">
        <div className="max-w-lg mx-auto">
          <h1 className="text-xl font-extrabold tracking-tight">Virtual Rooms</h1>
          <p className="text-xs text-icebreaker-muted mt-0.5">Chat with people at the venue before meeting IRL</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="card-dark animate-pulse h-28" />)}
          </div>
        ) : rooms && rooms.length > 0 ? (
          rooms.map((room: any) => {
            const isFull = room.participants >= room.capacity;
            const pct = Math.round((room.participants / room.capacity) * 100);
            return (
              <div key={room.id} className="card-dark" data-testid={`room-card-${room.id}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 pr-3">
                    <h3 className="font-extrabold text-base tracking-tight">{room.name}</h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Clock className="w-3 h-3 text-icebreaker-muted" />
                      <span className="text-xs text-icebreaker-muted">
                        {new Date(room.startsAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} –{" "}
                        {new Date(room.endsAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                  {room.premium && (
                    <div className="flex items-center gap-1 pill-teal">
                      <Crown className="w-3 h-3" />
                      <span>Premium</span>
                    </div>
                  )}
                </div>

                {/* Capacity bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-icebreaker-teal" />
                      <span className="text-xs font-bold text-icebreaker-teal">{room.participants || 0}/{room.capacity}</span>
                    </div>
                    <span className="text-xs text-icebreaker-muted">{isFull ? "Full" : `${room.capacity - (room.participants || 0)} spots left`}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-icebreaker-surface overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        background: isFull ? "#FF1B8D" : "linear-gradient(90deg, #FF1B8D 0%, #00CFFF 100%)"
                      }}
                    />
                  </div>
                </div>

                <Button
                  size="sm"
                  className={`w-full h-9 text-sm font-bold ${isFull ? "opacity-50 cursor-not-allowed bg-icebreaker-surface border border-icebreaker-border text-icebreaker-muted" : "btn-coral"}`}
                  disabled={isFull}
                  onClick={() => !isFull && navigate(`/rooms/${room.id}`)}
                  data-testid={`button-join-room-${room.id}`}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  {isFull ? "Room Full" : "Join Room"}
                </Button>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-icebreaker-surface">
              <Users className="w-8 h-8 text-icebreaker-muted" />
            </div>
            <div className="text-center">
              <p className="font-bold text-icebreaker-muted">No active rooms right now</p>
              <p className="text-xs text-icebreaker-muted/60 mt-1">Rooms open when events start</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
