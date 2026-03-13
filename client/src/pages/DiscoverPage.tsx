import { useState } from "react";
  import { useQuery, useMutation } from "@tanstack/react-query";
  import { Card } from "@/components/ui/card";
  import { Button } from "@/components/ui/button";
  import { Heart, X, MapPin, Briefcase } from "lucide-react";
  import { useToast } from "@/hooks/use-toast";

  export default function DiscoverPage() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const { toast } = useToast();

    const { data: candidates, refetch } = useQuery({
      queryKey: ["/api/discover/swipe"],
      queryFn: async () => {
        const token = localStorage.getItem("token");
        const res = await fetch("/api/discover/swipe", {
          headers: { Authorization: `Bearer ${token}` }
        });
        return res.json();
      }
    });

    const swipeMutation = useMutation({
      mutationFn: async ({ swipedId, liked }: { swipedId: number; liked: boolean }) => {
        const token = localStorage.getItem("token");
        const res = await fetch("/api/swipe", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ swipedId, liked })
        });
        return res.json();
      },
      onSuccess: (data) => {
        if (data.matched) {
          toast({
            title: "🎉 It's a match!",
            description: "You can now start chatting"
          });
        }
        setCurrentIndex(prev => prev + 1);
        if (currentIndex >= (candidates?.length || 0) - 3) {
          refetch();
        }
      }
    });

    const currentUser = candidates?.[currentIndex];

    const handleSwipe = (liked: boolean) => {
      if (currentUser) {
        swipeMutation.mutate({ swipedId: currentUser.id, liked });
      }
    };

    if (!candidates || candidates.length === 0) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Heart className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="text-gray-400">No more profiles to show</p>
            <Button onClick={() => refetch()} className="mt-4 btn-coral">
              Refresh
            </Button>
          </div>
        </div>
      );
    }

    if (!currentUser) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-400">Loading...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen pb-20 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="glassmorphic overflow-hidden relative h-[600px]">
            {/* Profile Image */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80">
              {currentUser.photos?.[0] ? (
                <img 
                  src={currentUser.photos[0]} 
                  alt={currentUser.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-icebreaker-coral to-icebreaker-orchid flex items-center justify-center">
                  <span className="text-8xl font-bold text-white">
                    {currentUser.name?.[0] || "?"}
                  </span>
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
              <h2 className="text-3xl font-bold mb-2">
                {currentUser.name}, {new Date().getFullYear() - new Date(currentUser.dob).getFullYear()}
              </h2>
              
              {currentUser.bio && (
                <p className="text-sm mb-3 line-clamp-2">{currentUser.bio}</p>
              )}

              <div className="flex items-center gap-4 text-sm mb-3">
                {currentUser.city && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {currentUser.city}
                  </div>
                )}
              </div>

              {currentUser.interests && currentUser.interests.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {currentUser.interests.slice(0, 3).map((interest: string) => (
                    <span 
                      key={interest}
                      className="px-3 py-1 rounded-full bg-white/20 backdrop-blur text-xs"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Swipe Buttons */}
          <div className="flex justify-center gap-6 mt-6">
            <Button
              onClick={() => handleSwipe(false)}
              size="lg"
              variant="outline"
              className="w-16 h-16 rounded-full border-red-500 text-red-500 hover:bg-red-500/10"
            >
              <X className="w-8 h-8" />
            </Button>

            <Button
              onClick={() => handleSwipe(true)}
              size="lg"
              className="w-16 h-16 rounded-full btn-coral"
            >
              <Heart className="w-8 h-8 fill-current" />
            </Button>
          </div>

          <p className="text-center text-sm text-gray-400 mt-4">
            {currentIndex + 1} / {candidates.length}
          </p>
        </div>
      </div>
    );
  }
  