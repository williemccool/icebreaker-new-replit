import { useQuery } from "@tanstack/react-query";
  import { Card } from "@/components/ui/card";
  import { Button } from "@/components/ui/button";
  import { MapPin, Users, ArrowLeft } from "lucide-react";
  import { Link, useParams } from "wouter";

  export default function VenueDetailPage() {
    const params = useParams();
    const venueId = params.id;

    const { data, isLoading } = useQuery({
      queryKey: [`/api/venues/${venueId}`],
      queryFn: async () => {
        const token = localStorage.getItem("token");
        const res = await fetch(`/api/venues/${venueId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        return res.json();
      }
    });

    if (isLoading) {
      return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    const { venue, checkedInUsers } = data || {};

    return (
      <div className="min-h-screen pb-20">
        <div className="relative">
          {venue?.imageUrl && (
            <img 
              src={venue.imageUrl} 
              alt={venue.name}
              className="w-full h-64 object-cover"
            />
          )}
          <Link href="/venues">
            <Button 
              variant="ghost" 
              size="sm"
              className="absolute top-4 left-4 bg-black/50 backdrop-blur"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
        </div>

        <div className="max-w-7xl mx-auto p-4 space-y-6">
          <Card className="card-dark">
            <h1 className="text-3xl font-bold mb-2">{venue?.name}</h1>
            <p className="text-gray-400 mb-4">{venue?.type}</p>
            
            <div className="flex items-center text-sm text-gray-400 mb-4">
              <MapPin className="w-4 h-4 mr-2" />
              {venue?.address}
            </div>

            {venue?.description && (
              <p className="text-sm mb-4">{venue.description}</p>
            )}

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-icebreaker-coral">
                <Users className="w-5 h-5" />
                <span className="font-semibold">{checkedInUsers?.length || 0}</span>
                <span className="text-sm text-gray-400">people here</span>
              </div>
            </div>
          </Card>

          {venue?.perks && venue.perks.length > 0 && (
            <Card className="card-dark">
              <h2 className="font-semibold text-lg mb-4">Perks & Offers</h2>
              <div className="space-y-2">
                {venue.perks.map((perk: string, i: number) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-icebreaker-success">✓</span>
                    <span className="text-sm">{perk}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card className="card-dark">
            <h2 className="font-semibold text-lg mb-4">Who's Here</h2>
            {checkedInUsers && checkedInUsers.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {checkedInUsers.map(({ user }: any) => (
                  <div key={user.id} className="flex items-center gap-3 p-3 rounded-lg bg-icebreaker-surface">
                    <div className="w-12 h-12 rounded-full bg-icebreaker-orchid flex items-center justify-center font-semibold">
                      {user.name?.[0] || "U"}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{user.name}</p>
                      <p className="text-xs text-gray-400">{user.bio?.slice(0, 30)}...</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-400 py-8">No one checked in yet. Be the first!</p>
            )}
          </Card>
        </div>
      </div>
    );
  }
  