import { useState } from "react";
  import { Card } from "@/components/ui/card";
  import { Button } from "@/components/ui/button";
  import { Sparkles, Award, Settings, LogOut } from "lucide-react";
  import { Link } from "wouter";

  export default function ProfilePage() {
    const [user] = useState(JSON.parse(localStorage.getItem("user") || "{}"));

    const logout = () => {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/";
    };

    return (
      <div className="min-h-screen pb-20">
        <div className="sticky top-0 z-10 bg-icebreaker-bg/95 backdrop-blur-lg border-b border-gray-800 p-4">
          <h1 className="text-2xl font-bold max-w-7xl mx-auto">Profile</h1>
        </div>

        <div className="max-w-7xl mx-auto p-4 space-y-6">
          <Card className="card-dark text-center">
            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-icebreaker-coral to-icebreaker-orchid flex items-center justify-center text-3xl font-bold">
              {user.name?.[0] || "U"}
            </div>
            <h2 className="text-2xl font-bold mt-4">{user.name}</h2>
            <p className="text-gray-400">{user.city}</p>
          </Card>

          <Card className="card-dark">
            <h3 className="font-semibold text-lg mb-4">Stats</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-icebreaker-coral">{user.level || 1}</div>
                <div className="text-xs text-gray-400">Level</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-icebreaker-orchid">{user.xp || 0}</div>
                <div className="text-xs text-gray-400">XP</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-icebreaker-success">0</div>
                <div className="text-xs text-gray-400">Badges</div>
              </div>
            </div>
          </Card>

          <Card className="card-dark">
            <h3 className="font-semibold text-lg mb-4">Quick Links</h3>
            <div className="space-y-2">
              <Link href="/quests">
                <Button variant="ghost" className="w-full justify-start">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Quests & Rewards
                </Button>
              </Link>
              <Link href="/leaderboard">
                <Button variant="ghost" className="w-full justify-start">
                  <Award className="w-4 h-4 mr-2" />
                  Leaderboard
                </Button>
              </Link>
            </div>
          </Card>

          <Button 
            onClick={logout}
            variant="outline" 
            className="w-full border-red-500 text-red-500 hover:bg-red-500/10"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>
    );
  }