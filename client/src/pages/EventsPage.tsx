import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Ticket, Users, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function EventsPage() {
  const { toast } = useToast();

  const { data: events, isLoading } = useQuery({
    queryKey: ["/api/events"],
    queryFn: async () => {
      const res = await fetch("/api/events?city=Bangalore");
      return res.json();
    }
  });

  const purchaseTicket = async (eventId: number) => {
    const token = localStorage.getItem("token");
    const res = await fetch(`/api/events/${eventId}/purchase`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      toast({ title: "Ticket confirmed! 🎟️", description: "Check your profile for QR code" });
    } else {
      const error = await res.json();
      toast({ title: error.error, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen pb-24">
      <div className="page-header">
        <div className="max-w-lg mx-auto">
          <h1 className="text-xl font-extrabold tracking-tight">Events</h1>
          <p className="text-xs text-icebreaker-muted mt-0.5">Speed dating, mixers & parties</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1,2].map(i => <div key={i} className="card-dark animate-pulse h-44" />)}
          </div>
        ) : events && events.length > 0 ? (
          events.map((event: any) => (
            <div key={event.id} className="card-dark overflow-hidden" data-testid={`event-card-${event.id}`}>
              {event.imageUrl && (
                <img src={event.imageUrl} alt={event.title} className="w-full h-44 object-cover -mx-5 -mt-5 mb-4" style={{ width: "calc(100% + 40px)", marginLeft: "-20px", marginTop: "-20px" }} />
              )}

              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="pill-coral">{event.type}</span>
                    {event.price === 0 && <span className="pill-teal">Free</span>}
                  </div>
                  <h3 className="font-extrabold text-base leading-snug tracking-tight">{event.title}</h3>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-extrabold text-xl text-icebreaker-coral">
                    {event.price === 0 ? "Free" : `₹${event.price}`}
                  </div>
                </div>
              </div>

              <p className="text-xs text-icebreaker-muted mb-4 leading-relaxed">{event.description}</p>

              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="flex items-center gap-1.5 text-xs text-icebreaker-muted">
                  <Calendar className="w-3.5 h-3.5 text-icebreaker-coral flex-shrink-0" />
                  <span>{new Date(event.startsAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-icebreaker-muted">
                  <Clock className="w-3.5 h-3.5 text-icebreaker-teal flex-shrink-0" />
                  <span>{new Date(event.startsAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-icebreaker-muted">
                  <Users className="w-3.5 h-3.5 text-icebreaker-teal flex-shrink-0" />
                  <span>{event.capacity} spots</span>
                </div>
              </div>

              <Button
                onClick={() => purchaseTicket(event.id)}
                className="w-full btn-coral h-10 text-sm"
                data-testid={`button-get-ticket-${event.id}`}
              >
                <Ticket className="w-4 h-4 mr-2" />
                {event.price === 0 ? "Register Free" : "Get Ticket"}
              </Button>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-icebreaker-surface">
              <Calendar className="w-8 h-8 text-icebreaker-muted" />
            </div>
            <div className="text-center">
              <p className="font-bold text-icebreaker-muted">No upcoming events</p>
              <p className="text-xs text-icebreaker-muted/60 mt-1">Check back soon</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
