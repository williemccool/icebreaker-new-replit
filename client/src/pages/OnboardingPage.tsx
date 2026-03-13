import { useState } from "react";
  import { Button } from "@/components/ui/button";
  import { Input } from "@/components/ui/input";
  import { Textarea } from "@/components/ui/textarea";
  import { Card } from "@/components/ui/card";
  import { useToast } from "@/hooks/use-toast";
  import { Calendar } from "@/components/ui/calendar";
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

  export default function OnboardingPage() {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
      name: "",
      dob: new Date(),
      gender: "",
      city: "Bangalore",
      bio: "",
      interests: [] as string[],
      photos: []
    });
    const { toast } = useToast();

    const interests = [
      "Nightlife", "Dancing", "Live Music", "Craft Beer", "Cocktails",
      "Rooftop Bars", "Gaming", "Food", "Travel", "Fitness"
    ];

    const toggleInterest = (interest: string) => {
      setFormData(prev => ({
        ...prev,
        interests: prev.interests.includes(interest)
          ? prev.interests.filter(i => i !== interest)
          : [...prev.interests, interest]
      }));
    };

    const completeOnboarding = async () => {
      if (!formData.name || !formData.gender) {
        toast({ title: "Please fill all required fields", variant: "destructive" });
        return;
      }

      try {
        const token = localStorage.getItem("token");
        const res = await fetch("/api/user/profile", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(formData)
        });

        if (res.ok) {
          const user = await res.json();
          localStorage.setItem("user", JSON.stringify(user));
          window.location.href = "/";
        }
      } catch (error) {
        toast({ title: "Error saving profile", variant: "destructive" });
      }
    };

    return (
      <div className="min-h-screen p-4 flex items-center justify-center bg-gradient-to-br from-icebreaker-bg via-icebreaker-surface to-icebreaker-bg">
        <Card className="w-full max-w-2xl p-8 glassmorphic">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Let's set up your profile</h1>
            <p className="text-gray-400">Step {step} of 3</p>
          </div>

          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Name *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Your name"
                  className="bg-icebreaker-surface border-gray-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Gender *</label>
                <Select value={formData.gender} onValueChange={(value) => setFormData({ ...formData, gender: value })}>
                  <SelectTrigger className="bg-icebreaker-surface border-gray-700">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="non_binary">Non-binary</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">City</label>
                <Select value={formData.city} onValueChange={(value) => setFormData({ ...formData, city: value })}>
                  <SelectTrigger className="bg-icebreaker-surface border-gray-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bangalore">Bangalore</SelectItem>
                    <SelectItem value="Mumbai">Mumbai</SelectItem>
                    <SelectItem value="Delhi">Delhi</SelectItem>
                    <SelectItem value="Pune">Pune</SelectItem>
                    <SelectItem value="Hyderabad">Hyderabad</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={() => setStep(2)} className="w-full btn-coral">
                Continue
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">About You</label>
                <Textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Tell us about yourself..."
                  className="bg-icebreaker-surface border-gray-700 min-h-[100px]"
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  Back
                </Button>
                <Button onClick={() => setStep(3)} className="flex-1 btn-coral">
                  Continue
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-4">Your Interests</label>
                <div className="flex flex-wrap gap-2">
                  {interests.map((interest) => (
                    <button
                      key={interest}
                      onClick={() => toggleInterest(interest)}
                      className={`px-4 py-2 rounded-full border transition-all ${
                        formData.interests.includes(interest)
                          ? "bg-icebreaker-coral border-icebreaker-coral text-white"
                          : "border-gray-700 hover:border-gray-600"
                      }`}
                    >
                      {interest}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                  Back
                </Button>
                <Button onClick={completeOnboarding} className="flex-1 btn-coral">
                  Complete Setup
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    );
  }
  