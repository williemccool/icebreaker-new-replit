import { Link } from "wouter";
  import { Button } from "@/components/ui/button";
  import { Card } from "@/components/ui/card";
  import { MapPin, Users, Calendar, Sparkles, Award, Heart } from "lucide-react";
  import { useQuery } from "@tanstack/react-query";
  import { useEffect, useState } from "react";

  export default function HomePage() {
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
      const userData = localStorage.getItem("user");
      if (userData) setUser(JSON.parse(userData));
    }, []);

    const { data: wallet } = useQuery({
      queryKey: ["/api/user/me"],
      queryFn: async () => {
        const token = localStorage.getItem("token");
        const res = await fetch("/api/user/me", {
          headers: { Authorization: `Bearer ${token}` }
        });
        return res.json();
      }
    });

    return (
      <div className="min-h-screen pb-20">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-icebreaker-bg/95 backdrop-blur-lg border-b border-gray-800 p-4">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div>
              <h1 className="text-2xl font-bold">
                <span className="text-icebreaker-coral">Ice</span>
                <span className="text-icebreaker-orchid">breaker</span>
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/profile">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-icebreaker-surface">
                  <Sparkles className="w-4 h-4 text-icebreaker-coral" />
                  <span className="font-semibold">{wallet?.wallet?.balance || 0}</span>
                  <span className="text-xs text-gray-400">Cubes</span>
                </div>
              </Link>
              <Link href="/profile">
                <div className="w-10 h-10 rounded-full bg-icebreaker-orchid flex items-center justify-center font-semibold">
                  {user?.name?.[0] || "U"}
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto p-4 space-y-6">
          {/* Welcome Banner */}
          <Card className="glassmorphic p-6 bg-gradient-to-r from-icebreaker-coral/20 to-icebreaker-orchid/20 border-none">
            <h2 className="text-2xl font-bold mb-2">Welcome back, {user?.name || "there"}!</h2>
            <p className="text-gray-300">Ready to make tonight unforgettable?</p>
          </Card>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-4">
            <Link href="/venues">
              <Card className="card-dark hover:border-icebreaker-coral transition-colors cursor-pointer p-6 text-center">
                <MapPin className="w-8 h-8 mx-auto mb-2 text-icebreaker-coral" />
                <h3 className="font-semibold">Check In</h3>
                <p className="text-xs text-gray-400 mt-1">See who's out</p>
              </Card>
            </Link>

            <Link href="/rooms">
              <Card className="card-dark hover:border-icebreaker-orchid transition-colors cursor-pointer p-6 text-center">
                <Users className="w-8 h-8 mx-auto mb-2 text-icebreaker-orchid" />
                <h3 className="font-semibold">Virtual Rooms</h3>
                <p className="text-xs text-gray-400 mt-1">Join now</p>
              </Card>
            </Link>

            <Link href="/discover">
              <Card className="card-dark hover:border-icebreaker-coral transition-colors cursor-pointer p-6 text-center">
                <Heart className="w-8 h-8 mx-auto mb-2 text-icebreaker-coral" />
                <h3 className="font-semibold">Discover</h3>
                <p className="text-xs text-gray-400 mt-1">Swipe & match</p>
              </Card>
            </Link>

            <Link href="/events">
              <Card className="card-dark hover:border-icebreaker-success transition-colors cursor-pointer p-6 text-center">
                <Calendar className="w-8 h-8 mx-auto mb-2 text-icebreaker-success" />
                <h3 className="font-semibold">Events</h3>
                <p className="text-xs text-gray-400 mt-1">Upcoming mixers</p>
              </Card>
            </Link>
          </div>

          {/* Progress & Gamification */}
          <Card className="card-dark">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Your Progress</h3>
              <Link href="/quests">
                <Button variant="ghost" size="sm">View All</Button>
              </Link>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Level {user?.level || 1}</span>
                  <span>{user?.xp || 0} XP</span>
                </div>
                <div className="h-2 bg-icebreaker-surface rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-icebreaker-coral to-icebreaker-orchid"
                    style={{ width: `${((user?.xp || 0) % 100)}%` }}
                  />
                </div>
              </div>

              <Link href="/leaderboard">
                <div className="flex items-center justify-between p-3 rounded-lg bg-icebreaker-surface hover:bg-icebreaker-surface/80 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Award className="w-5 h-5 text-icebreaker-warning" />
                    <span className="font-medium">Leaderboard</span>
                  </div>
                  <span className="text-sm text-gray-400">→</span>
                </div>
              </Link>
            </div>
          </Card>

          {/* Recent Matches */}
          <Card className="card-dark">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Recent Matches</h3>
              <Link href="/matches">
                <Button variant="ghost" size="sm">View All</Button>
              </Link>
            </div>
            <div className="text-center text-gray-400 py-8">
              <Heart className="w-12 h-12 mx-auto mb-2 opacity-20" />
              <p>Start swiping to see your matches</p>
            </div>
          </Card>
        </div>

        {/* Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-icebreaker-surface border-t border-gray-800 px-4 py-2">
          <div className="flex justify-around items-center max-w-7xl mx-auto">
            <Link href="/">
              <Button variant="ghost" size="sm" className="flex-col h-auto py-2">
                <MapPin className="w-5 h-5 mb-1" />
                <span className="text-xs">Home</span>
              </Button>
            </Link>
            <Link href="/discover">
              <Button variant="ghost" size="sm" className="flex-col h-auto py-2">
                <Heart className="w-5 h-5 mb-1" />
                <span className="text-xs">Discover</span>
              </Button>
            </Link>
            <Link href="/rooms">
              <Button variant="ghost" size="sm" className="flex-col h-auto py-2">
                <Users className="w-5 h-5 mb-1" />
                <span className="text-xs">Rooms</span>
              </Button>
            </Link>
            <Link href="/matches">
              <Button variant="ghost" size="sm" className="flex-col h-auto py-2">
                <Sparkles className="w-5 h-5 mb-1" />
                <span className="text-xs">Matches</span>
              </Button>
            </Link>
            <Link href="/profile">
              <Button variant="ghost" size="sm" className="flex-col h-auto py-2">
                <Award className="w-5 h-5 mb-1" />
                <span className="text-xs">Profile</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }
  