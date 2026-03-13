import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { MapPin, Users, Star, Zap } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function VenuesPage() {
  const { toast } = useToast();

  const { data: venues, isLoading } = useQuery({
    queryKey: ["/api/venues"],
    queryFn: async () => {
      const res = await fetch("/api/venues?city=Bangalore");
      return res.json();
    }
  });

  const checkIn = async (venueId: number, e: React.MouseEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    const res = await fetch(`/api/venues/${venueId}/check-in`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      toast({ title: "Checked in! 🎉", description: `+${data.cubesEarned} Cubes earned` });
    } else {
      const error = await res.json();
      toast({ title: error.error, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen pb-24">
      <div className="page-header">
        <div className="max-w-lg mx-auto">
          <h1 className="text-xl font-extrabold tracking-tight">Venues Near You</h1>
          <p className="text-xs text-icebreaker-muted mt-0.5">Bangalore · {venues?.length || 0} venues</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="card-dark animate-pulse h-36" />
            ))}
          </div>
        ) : venues && venues.length > 0 ? (
          venues.map((venue: any) => (
            <Link key={venue.id} href={`/venues/${venue.id}`}>
              <div className="card-dark hover:border-icebreaker-coral/40 transition-all cursor-pointer overflow-hidden" data-testid={`venue-card-${venue.id}`}>
                {venue.imageUrl && (
                  <img src={venue.imageUrl} alt={venue.name} className="w-full h-40 object-cover -mx-5 -mt-5 w-[calc(100%+40px)] mb-4" style={{ width: "calc(100% + 40px)", marginLeft: "-20px", marginTop: "-20px" }} />
                )}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0 pr-3">
                    <h3 className="font-extrabold text-base tracking-tight truncate">{venue.name}</h3>
                    <p className="text-xs text-icebreaker-muted mt-0.5">{venue.type}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {venue.partner && (
                      <span className="pill-teal">Partner</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center text-xs text-icebreaker-muted mb-3 gap-1">
                  <MapPin className="w-3 h-3" />
                  {venue.area}, {venue.city}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-icebreaker-teal animate-pulse" />
                    <span className="text-xs font-bold text-icebreaker-teal">{venue.peopleHere || 0} checked in</span>
                  </div>
                  <Button
                    onClick={(e) => checkIn(venue.id, e)}
                    size="sm"
                    className="btn-coral h-8 text-xs px-4"
                    data-testid={`button-checkin-${venue.id}`}
                  >
                    Check In
                  </Button>
                </div>

                {venue.perks && venue.perks.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-icebreaker-border flex items-center gap-2">
                    <Zap className="w-3 h-3 text-icebreaker-coral flex-shrink-0" />
                    <p className="text-xs text-icebreaker-coral font-medium">{venue.perks[0]}</p>
                  </div>
                )}
              </div>
            </Link>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-icebreaker-surface">
              <MapPin className="w-8 h-8 text-icebreaker-muted" />
            </div>
            <div className="text-center">
              <p className="font-bold text-icebreaker-muted">No venues found</p>
              <p className="text-xs text-icebreaker-muted/60 mt-1">Check back soon</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
