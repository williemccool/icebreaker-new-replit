import { useQuery } from "@tanstack/react-query";
  import { Card } from "@/components/ui/card";
  import { Button } from "@/components/ui/button";
  import { MapPin, Users, Star } from "lucide-react";
  import { Link } from "wouter";
  import { useToast } from "@/hooks/use-toast";

  export default function VenuesPage() {
    const { toast } = useToast();

    const { data: venues, isLoading } = useQuery({
      queryKey: ["/api/venues"],
      queryFn: async () => {
        const token = localStorage.getItem("token");
        const res = await fetch("/api/venues?city=Bangalore", {
          headers: { Authorization: `Bearer ${token}` }
        });
        return res.json();
      }
    });

    const checkIn = async (venueId: number) => {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/venues/${venueId}/check-in`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        toast({ 
          title: "Checked in!", 
          description: `Earned ${data.cubesEarned} Cubes!`
        });
      } else {
        const error = await res.json();
        toast({ title: error.error, variant: "destructive" });
      }
    };

    return (
      <div className="min-h-screen pb-20">
        <div className="sticky top-0 z-10 bg-icebreaker-bg/95 backdrop-blur-lg border-b border-gray-800 p-4">
          <h1 className="text-2xl font-bold max-w-7xl mx-auto">Venues Near You</h1>
        </div>

        <div className="max-w-7xl mx-auto p-4 space-y-4">
          {isLoading ? (
            <div className="text-center py-12">Loading venues...</div>
          ) : venues && venues.length > 0 ? (
            venues.map((venue: any) => (
              <Link key={venue.id} href={`/venues/${venue.id}`}>
                <Card className="card-dark hover:border-icebreaker-coral transition-colors cursor-pointer overflow-hidden">
                  {venue.imageUrl && (
                    <img 
                      src={venue.imageUrl} 
                      alt={venue.name}
                      className="w-full h-48 object-cover"
                    />
                  )}
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-bold text-lg">{venue.name}</h3>
                        <p className="text-sm text-gray-400">{venue.type}</p>
                      </div>
                      {venue.partner && (
                        <span className="px-2 py-1 rounded-full bg-icebreaker-success/20 text-icebreaker-success text-xs">
                          Partner
                        </span>
                      )}
                    </div>

                    <div className="flex items-center text-sm text-gray-400 mb-3">
                      <MapPin className="w-4 h-4 mr-1" />
                      {venue.area}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-icebreaker-coral">
                        <Users className="w-5 h-5" />
                        <span className="font-semibold">{venue.peopleHere || 0}</span>
                        <span className="text-sm text-gray-400">checked in</span>
                      </div>

                      <Button 
                        onClick={(e) => {
                          e.preventDefault();
                          checkIn(venue.id);
                        }}
                        size="sm"
                        className="btn-coral"
                      >
                        Check In
                      </Button>
                    </div>

                    {venue.perks && venue.perks.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-800">
                        <p className="text-xs text-icebreaker-orchid">
                          {venue.perks[0]}
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
              </Link>
            ))
          ) : (
            <div className="text-center py-12">
              <MapPin className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="text-gray-400">No venues found</p>
            </div>
          )}
        </div>
      </div>
    );
  }
  