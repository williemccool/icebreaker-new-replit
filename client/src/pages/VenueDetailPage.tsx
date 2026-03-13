import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { MapPin, Users, ArrowLeft, Zap, CheckCircle } from "lucide-react";
import { Link, useParams } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function VenueDetailPage() {
  const params = useParams();
  const venueId = params.id;
  const { toast } = useToast();

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

  const checkIn = async () => {
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 rounded-2xl bg-icebreaker-surface animate-pulse" />
      </div>
    );
  }

  const { venue, checkedInUsers } = data || {};

  return (
    <div className="min-h-screen pb-24">
      {/* Hero */}
      <div className="relative">
        {venue?.imageUrl ? (
          <img src={venue.imageUrl} alt={venue.name} className="w-full h-56 object-cover" />
        ) : (
          <div className="w-full h-56" style={{ background: "linear-gradient(135deg, rgba(255,90,95,0.3) 0%, rgba(168,85,247,0.3) 100%)" }} />
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 40%, rgba(14,15,19,1) 100%)" }} />
        <Link href="/venues">
          <button className="absolute top-4 left-4 w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(10px)" }} data-testid="button-back">
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>
        </Link>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-8 space-y-4 relative z-10">
        {/* Venue Card */}
        <div className="card-dark">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">{venue?.name}</h1>
              <p className="text-sm text-icebreaker-muted mt-0.5">{venue?.type}</p>
            </div>
            {venue?.partner && <span className="pill-teal flex-shrink-0">Partner</span>}
          </div>

          <div className="flex items-center gap-1.5 text-xs text-icebreaker-muted mb-3">
            <MapPin className="w-3.5 h-3.5" />
            <span>{venue?.address}</span>
          </div>

          {venue?.description && (
            <p className="text-sm text-icebreaker-muted leading-relaxed mb-4">{venue.description}</p>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-icebreaker-teal animate-pulse" />
              <span className="text-sm font-bold text-icebreaker-teal">{checkedInUsers?.length || 0} here now</span>
            </div>
            <Button onClick={checkIn} className="btn-coral h-9 text-sm px-5" data-testid="button-checkin">
              Check In
            </Button>
          </div>
        </div>

        {/* Perks */}
        {venue?.perks && venue.perks.length > 0 && (
          <div className="card-dark">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-icebreaker-coral" />
              <h2 className="font-extrabold text-sm tracking-tight">Perks for Icebreaker Users</h2>
            </div>
            <div className="space-y-2.5">
              {venue.perks.map((perk: string, i: number) => (
                <div key={i} className="flex items-start gap-2.5">
                  <CheckCircle className="w-4 h-4 text-icebreaker-teal flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{perk}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Who's here */}
        <div className="card-dark">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-icebreaker-orchid" />
            <h2 className="font-extrabold text-sm tracking-tight">Who's Here</h2>
          </div>
          {checkedInUsers && checkedInUsers.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {checkedInUsers.map(({ user }: any) => (
                <div key={user.id} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-icebreaker-elevated" data-testid={`checked-in-user-${user.id}`}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white flex-shrink-0" style={{ background: "linear-gradient(135deg, #A855F7 0%, #FF5A5F 100%)" }}>
                    {user.name?.[0] || "U"}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-xs truncate">{user.name}</p>
                    {user.bio && <p className="text-xs text-icebreaker-muted truncate">{user.bio.slice(0, 20)}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-sm text-icebreaker-muted">No one checked in yet.</p>
              <p className="text-xs text-icebreaker-muted/60 mt-1">Be the first to break the ice!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
