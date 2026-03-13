import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { MapPin, Users, Calendar, Sparkles, Zap, Trophy } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Flame } from "lucide-react";

export default function HomePage() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) setUser(JSON.parse(userData));
  }, []);

  const { data: walletData } = useQuery({
    queryKey: ["/api/user/me"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/user/me", {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.json();
    }
  });

  const { data: venues } = useQuery({
    queryKey: ["/api/venues"],
    queryFn: async () => {
      const res = await fetch("/api/venues?city=Bangalore");
      return res.json();
    }
  });

  const { data: events } = useQuery({
    queryKey: ["/api/events"],
    queryFn: async () => {
      const res = await fetch("/api/events?city=Bangalore");
      return res.json();
    }
  });

  const hotVenues = venues?.filter((v: any) => v.partner)?.slice(0, 3) || [];
  const nextEvent = events?.[0];

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #FF1B8D 0%, #00CFFF 100%)" }}>
              <Flame className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-xl font-extrabold tracking-tight">
              <span className="text-icebreaker-coral">Ice</span><span className="text-icebreaker-teal">breaker</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/quests">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-icebreaker-surface border border-icebreaker-border cursor-pointer" data-testid="cubes-balance">
                <Sparkles className="w-3.5 h-3.5 text-icebreaker-coral" />
                <span className="font-bold text-sm">{walletData?.wallet?.balance ?? "—"}</span>
                <span className="text-xs text-icebreaker-muted">Cubes</span>
              </div>
            </Link>
            <Link href="/profile">
              <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white cursor-pointer" style={{ background: "linear-gradient(135deg, #FF1B8D 0%, #00CFFF 100%)" }} data-testid="avatar-header">
                {user?.name?.[0] || "U"}
              </div>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-6">
        {/* Welcome */}
        <div>
          <p className="text-icebreaker-muted text-sm font-medium">Good evening 👋</p>
          <h2 className="text-2xl font-extrabold tracking-tight mt-0.5">
            {user?.name ? `Hey, ${user.name.split(" ")[0]}` : "Welcome back"}
          </h2>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/venues">
            <div className="card-dark cursor-pointer hover:border-icebreaker-coral/50 transition-all group" data-testid="quick-action-venues">
              <div className="icon-badge-coral mb-3">
                <MapPin className="w-5 h-5 text-icebreaker-coral" />
              </div>
              <h3 className="font-bold text-sm">Check In</h3>
              <p className="text-xs text-icebreaker-muted mt-0.5">Find venues near you</p>
            </div>
          </Link>
          <Link href="/rooms">
            <div className="card-dark cursor-pointer hover:border-icebreaker-teal/50 transition-all group" data-testid="quick-action-rooms">
              <div className="icon-badge-teal mb-3">
                <Users className="w-5 h-5 text-icebreaker-teal" />
              </div>
              <h3 className="font-bold text-sm">Virtual Rooms</h3>
              <p className="text-xs text-icebreaker-muted mt-0.5">Meet people digitally</p>
            </div>
          </Link>
          <Link href="/discover">
            <div className="card-dark cursor-pointer hover:border-icebreaker-coral/50 transition-all group" data-testid="quick-action-discover">
              <div className="icon-badge-teal mb-3">
                <Zap className="w-5 h-5 text-icebreaker-teal" />
              </div>
              <h3 className="font-bold text-sm">Discover</h3>
              <p className="text-xs text-icebreaker-muted mt-0.5">Swipe & match</p>
            </div>
          </Link>
          <Link href="/events">
            <div className="card-dark cursor-pointer hover:border-icebreaker-coral/50 transition-all group" data-testid="quick-action-events">
              <div className="icon-badge-coral mb-3">
                <Calendar className="w-5 h-5 text-icebreaker-coral" />
              </div>
              <h3 className="font-bold text-sm">Events</h3>
              <p className="text-xs text-icebreaker-muted mt-0.5">Speed dating & mixers</p>
            </div>
          </Link>
        </div>

        {/* How it Works */}
        <div>
          <h3 className="text-base font-extrabold mb-3 tracking-tight">How Icebreaker Works</h3>
          <div className="grid grid-cols-1 gap-3">
            {/* Physical Check-in */}
            <div className="card-dark">
              <div className="flex items-start gap-3 mb-4">
                <div className="icon-badge-coral">
                  <MapPin className="w-5 h-5 text-icebreaker-coral" />
                </div>
                <div>
                  <h4 className="font-extrabold text-base tracking-tight">Physical Check-in</h4>
                  <p className="text-xs text-icebreaker-muted mt-1 leading-relaxed">
                    Already at the venue? Check in to see the profile of everyone around you right now.
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                {[
                  { n: 1, title: "See who's here", desc: "Browse active profiles in the room." },
                  { n: 2, title: "Spot & Approach", desc: "Send a digital wave or just walk over." },
                  { n: 3, title: "Meet in the Zone", desc: "Head to the designated Icebreaker Zone." },
                ].map(({ n, title, desc }) => (
                  <div key={n} className="flex items-start gap-3">
                    <div className="num-badge-coral mt-0.5">{n}</div>
                    <div>
                      <p className="text-sm font-bold">{title}</p>
                      <p className="text-xs text-icebreaker-muted">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="divider-glow mt-4 mb-3" />
              <div className="flex items-center gap-2">
                <Zap className="w-3 h-3 text-icebreaker-coral" />
                <span className="tag-coral">Best for spontaneous vibes</span>
              </div>
            </div>

            {/* Virtual Rooms */}
            <div className="card-dark">
              <div className="flex items-start gap-3 mb-4">
                <div className="icon-badge-teal">
                  <Users className="w-5 h-5 text-icebreaker-teal" />
                </div>
                <div>
                  <h4 className="font-extrabold text-base tracking-tight">Join Virtual Room</h4>
                  <p className="text-xs text-icebreaker-muted mt-1 leading-relaxed">
                    Match and chat digitally with people at the venue before you meet face-to-face.
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                {[
                  { n: 1, title: "Enter the Room", desc: "Join the venue's exclusive digital space." },
                  { n: 2, title: "Match & Chat", desc: "Break the ice online first." },
                  { n: 3, title: "Meet & Get Rewards", desc: "Meet IRL at the venue to unlock 50% off drinks.", coral: true },
                ].map(({ n, title, desc, coral }) => (
                  <div key={n} className="flex items-start gap-3">
                    <div className="num-badge-teal mt-0.5">{n}</div>
                    <div>
                      <p className="text-sm font-bold">{title}</p>
                      <p className="text-xs text-icebreaker-muted">
                        {coral ? (
                          <>{desc.split("50% off drinks")[0]}<span className="text-icebreaker-coral font-semibold">50% off drinks</span>{desc.split("50% off drinks")[1]}</>
                        ) : desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="divider-glow mt-4 mb-3" />
              <div className="flex items-center gap-2">
                <Users className="w-3 h-3 text-icebreaker-teal" />
                <span className="tag-teal">Best for breaking the ice safely</span>
              </div>
            </div>
          </div>
        </div>

        {/* Hot Venues */}
        {hotVenues.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-extrabold tracking-tight">🔥 Hot Tonight</h3>
              <Link href="/venues">
                <span className="text-xs text-icebreaker-coral font-semibold cursor-pointer">See all →</span>
              </Link>
            </div>
            <div className="space-y-2">
              {hotVenues.map((venue: any) => (
                <Link key={venue.id} href={`/venues/${venue.id}`}>
                  <div className="card-dark hover:border-icebreaker-coral/40 transition-all cursor-pointer flex items-center gap-3 py-3" data-testid={`venue-card-${venue.id}`}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, rgba(255,27,141,0.2) 0%, rgba(0,207,255,0.2) 100%)" }}>
                      <MapPin className="w-5 h-5 text-icebreaker-coral" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{venue.name}</p>
                      <p className="text-xs text-icebreaker-muted">{venue.area} · {venue.type}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-icebreaker-teal animate-pulse" />
                      <span className="text-xs font-bold text-icebreaker-teal">{venue.peopleHere || 0}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Next Event */}
        {nextEvent && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-extrabold tracking-tight">🎉 Upcoming Event</h3>
              <Link href="/events">
                <span className="text-xs text-icebreaker-coral font-semibold cursor-pointer">See all →</span>
              </Link>
            </div>
            <Link href="/events">
              <div className="card-dark cursor-pointer hover:border-icebreaker-coral/40 transition-all" data-testid="upcoming-event-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <span className="pill-coral text-xs mb-2 inline-block">{nextEvent.type}</span>
                    <h4 className="font-extrabold text-sm leading-snug">{nextEvent.title}</h4>
                    <p className="text-xs text-icebreaker-muted mt-1">
                      {new Date(nextEvent.startsAt).toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" })}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-extrabold text-lg text-icebreaker-coral">
                      {nextEvent.price === 0 ? "Free" : `₹${nextEvent.price}`}
                    </div>
                    <div className="text-xs text-icebreaker-muted">{nextEvent.capacity} spots</div>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* Leaderboard CTA */}
        <Link href="/leaderboard">
          <div className="cursor-pointer rounded-2xl p-4 flex items-center gap-3" style={{ background: "linear-gradient(135deg, rgba(255,176,32,0.1) 0%, rgba(255,27,141,0.08) 100%)", border: "1px solid rgba(255,176,32,0.2)" }} data-testid="leaderboard-cta">
            <Trophy className="w-8 h-8 text-yellow-400 flex-shrink-0" />
            <div>
              <p className="font-extrabold text-sm">Season Leaderboard</p>
              <p className="text-xs text-icebreaker-muted">Climb the ranks. Win real rewards.</p>
            </div>
            <span className="ml-auto text-icebreaker-muted text-sm">→</span>
          </div>
        </Link>
      </div>
    </div>
  );
}
