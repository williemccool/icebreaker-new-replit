import { useQuery } from "@tanstack/react-query";
  import { Card } from "@/components/ui/card";
  import { Button } from "@/components/ui/button";
  import { Users, Clock } from "lucide-react";

  export default function RoomsPage() {
    const { data: rooms } = useQuery({
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
      <div className="min-h-screen pb-20">
        <div className="sticky top-0 z-10 bg-icebreaker-bg/95 backdrop-blur-lg border-b border-gray-800 p-4">
          <h1 className="text-2xl font-bold max-w-7xl mx-auto">Virtual Rooms</h1>
        </div>

        <div className="max-w-7xl mx-auto p-4 space-y-4">
          {rooms && rooms.length > 0 ? (
            rooms.map((room: any) => (
              <Card key={room.id} className="card-dark">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-lg">{room.name}</h3>
                    <p className="text-sm text-gray-400">
                      {new Date(room.startsAt).toLocaleTimeString()} - {new Date(room.endsAt).toLocaleTimeString()}
                    </p>
                  </div>
                  {room.premium && (
                    <span className="px-2 py-1 rounded-full bg-icebreaker-orchid/20 text-icebreaker-orchid text-xs">
                      Premium
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-icebreaker-coral">
                    <Users className="w-5 h-5" />
                    <span className="font-semibold">{room.participants || 0}/{room.capacity}</span>
                  </div>

                  <Button 
                    size="sm"
                    className="btn-coral"
                    disabled={room.participants >= room.capacity}
                  >
                    {room.participants >= room.capacity ? "Full" : "Join Room"}
                  </Button>
                </div>
              </Card>
            ))
          ) : (
            <div className="text-center py-12">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="text-gray-400">No active rooms right now</p>
            </div>
          )}
        </div>
      </div>
    );
  }