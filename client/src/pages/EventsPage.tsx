import { useQuery } from "@tanstack/react-query";
  import { Card } from "@/components/ui/card";
  import { Button } from "@/components/ui/button";
  import { Calendar, MapPin, Ticket } from "lucide-react";
  import { useToast } from "@/hooks/use-toast";

  export default function EventsPage() {
    const { toast } = useToast();

    const { data: events } = useQuery({
      queryKey: ["/api/events"],
      queryFn: async () => {
        const token = localStorage.getItem("token");
        const res = await fetch("/api/events?city=Bangalore", {
          headers: { Authorization: `Bearer ${token}` }
        });
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
        toast({ title: "Ticket purchased!", description: "Check your profile for QR code" });
      } else {
        const error = await res.json();
        toast({ title: error.error, variant: "destructive" });
      }
    };

    return (
      <div className="min-h-screen pb-20">
        <div className="sticky top-0 z-10 bg-icebreaker-bg/95 backdrop-blur-lg border-b border-gray-800 p-4">
          <h1 className="text-2xl font-bold max-w-7xl mx-auto">Upcoming Events</h1>
        </div>

        <div className="max-w-7xl mx-auto p-4 space-y-4">
          {events && events.length > 0 ? (
            events.map((event: any) => (
              <Card key={event.id} className="card-dark overflow-hidden">
                {event.imageUrl && (
                  <img 
                    src={event.imageUrl} 
                    alt={event.title}
                    className="w-full h-48 object-cover"
                  />
                )}
                <div className="p-4">
                  <h3 className="font-bold text-lg mb-2">{event.title}</h3>
                  <p className="text-sm text-gray-400 mb-4">{event.description}</p>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-400">
                      <Calendar className="w-4 h-4 mr-2" />
                      {new Date(event.startsAt).toLocaleDateString()}
                    </div>
                    <div className="flex items-center text-sm text-gray-400">
                      <MapPin className="w-4 h-4 mr-2" />
                      {event.city}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-icebreaker-coral font-semibold">
                      {event.price === 0 ? "Free" : `₹${event.price}`}
                    </div>
                    <Button 
                      onClick={() => purchaseTicket(event.id)}
                      size="sm"
                      className="btn-coral"
                    >
                      <Ticket className="w-4 h-4 mr-2" />
                      Get Ticket
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="text-gray-400">No upcoming events</p>
            </div>
          )}
        </div>
      </div>
    );
  }