import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Sparkles } from "lucide-react";
import { useLocation } from "wouter";

const STEPS = ["BASICS", "VIBE", "PHOTOS"];

const INTERESTS = ["Nightlife", "Dancing", "Live Music", "Craft Beer", "Cocktails", "Rooftop Bars", "Gaming", "Food", "Travel", "Fitness", "Karaoke", "Open Mic"];

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [gender, setGender] = useState("");
  const [meetWho, setMeetWho] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [form, setForm] = useState({
    name: "", dob: "2000-01-01", city: "Bangalore", pronouns: "", bio: ""
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const toggleMeet = (v: string) => setMeetWho(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);
  const toggleInterest = (v: string) => setInterests(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);

  const save = async () => {
    if (!form.name || !gender) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }
    try {
      const token = localStorage.getItem("token");
      const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
      const res = await fetch("/api/user/profile", {
        method: "PUT", headers,
        body: JSON.stringify({ ...form, gender })
      });
      await fetch("/api/user/preferences", {
        method: "PUT", headers,
        body: JSON.stringify({ interests: { hobbies: interests, meetWho } })
      });
      if (res.ok) {
        toast({ title: "Profile saved! +50 XP +10 Cubes" });
        navigate("/");
      } else {
        const err = await res.json();
        toast({ title: err.error || "Failed to save", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    }
  };

  const next = () => {
    if (step < 2) setStep(s => s + 1);
    else save();
  };

  const GENDER_MAP: Record<string, string> = { "Woman": "female", "Man": "male", "Non-binary": "non_binary" };

  const GenderBtn = ({ label, emoji }: { label: string; emoji: string }) => {
    const val = GENDER_MAP[label] || label.toLowerCase();
    return (
      <button
        onClick={() => setGender(val)}
        className={`flex flex-col items-center justify-center gap-1.5 py-4 rounded-2xl text-sm font-bold transition-all`}
        style={gender === val
          ? { background: "rgba(255,27,141,0.2)", border: "2px solid #FF1B8D", color: "#FF1B8D" }
          : { background: "rgba(255,255,255,0.04)", border: "1.5px solid rgba(255,255,255,0.1)", color: "#F0F2F7" }}
        data-testid={`gender-${label.toLowerCase()}`}
      >
        <span className="text-2xl">{emoji}</span>
        {label}
      </button>
    );
  };

  const MeetBtn = ({ label }: { label: string }) => (
    <button
      onClick={() => toggleMeet(label)}
      className="px-5 py-2.5 rounded-full text-sm font-bold transition-all"
      style={meetWho.includes(label)
        ? { background: "rgba(255,27,141,0.2)", border: "2px solid #FF1B8D", color: "#FF1B8D" }
        : { background: "rgba(255,255,255,0.04)", border: "1.5px solid rgba(255,255,255,0.1)", color: "#8A8FA8" }}
      data-testid={`meet-${label.toLowerCase()}`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0A0A0C" }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <button onClick={() => step > 0 ? setStep(s => s - 1) : navigate("/")} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ background: "rgba(255,27,141,0.15)", border: "1px solid rgba(255,27,141,0.3)" }}>
          <span className="text-xs font-bold text-icebreaker-coral">🏆 LVL 1 ROOKIE</span>
        </div>
        <button onClick={() => navigate("/")} className="text-xs font-bold text-icebreaker-muted">Skip</button>
      </div>

      {/* Progress bar + step tabs */}
      <div className="px-5 mb-5">
        <div className="w-full h-1 rounded-full bg-white/10 mb-3 overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${((step + 1) / 3) * 100}%`, background: "linear-gradient(90deg, #FF1B8D, #00CFFF)" }} />
        </div>
        <div className="flex items-center gap-4">
          {STEPS.map((s, i) => (
            <span key={s} className={`text-[10px] font-bold uppercase tracking-widest ${i === step ? "text-icebreaker-coral" : "text-icebreaker-muted/40"}`}>{s}</span>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 space-y-5 pb-36">
        {step === 0 && (
          <>
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight mb-1">Who are you?</h2>
              <p className="text-sm text-icebreaker-muted">Start with the essentials to unlock your profile badge.</p>
            </div>

            <div>
              <label className="text-xs font-bold text-icebreaker-muted uppercase tracking-widest mb-2 block">Display Name</label>
              <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Your name" className="h-14 rounded-2xl bg-white/5 border-white/10 text-white text-base" data-testid="input-name" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-icebreaker-muted uppercase tracking-widest mb-2 block">Age</label>
                <Input type="date" value={form.dob} onChange={e => set("dob", e.target.value)} className="h-14 rounded-2xl bg-white/5 border-white/10 text-white" data-testid="input-dob" />
              </div>
              <div>
                <label className="text-xs font-bold text-icebreaker-muted uppercase tracking-widest mb-2 block">City</label>
                <Input value={form.city} onChange={e => set("city", e.target.value)} placeholder="Your city" className="h-14 rounded-2xl bg-white/5 border-white/10 text-white" data-testid="input-city" />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-icebreaker-muted uppercase tracking-widest mb-3 block">Gender</label>
              <div className="grid grid-cols-3 gap-2">
                <GenderBtn label="Woman" emoji="♀" />
                <GenderBtn label="Man" emoji="♂" />
                <GenderBtn label="Non-binary" emoji="⚧" />
              </div>
              <button
                onClick={() => setGender("other")}
                className="w-full mt-2 py-3 rounded-2xl text-sm font-semibold text-icebreaker-muted transition-all"
                style={gender === "other" ? { background: "rgba(255,27,141,0.15)", border: "2px solid #FF1B8D", color: "#FF1B8D" } : { background: "rgba(255,255,255,0.04)", border: "1.5px solid rgba(255,255,255,0.1)" }}
                data-testid="gender-self-describe"
              >
                ✏️ Self-describe
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-icebreaker-muted uppercase tracking-widest mb-2 block">Pronouns <span className="normal-case text-icebreaker-muted/50">(Optional)</span></label>
              <Input value={form.pronouns} onChange={e => set("pronouns", e.target.value)} placeholder="e.g. she/her, they/them" className="h-14 rounded-2xl bg-white/5 border-white/10 text-white" data-testid="input-pronouns" />
            </div>

            <div>
              <label className="text-xs font-bold text-icebreaker-muted uppercase tracking-widest mb-3 block">Who do you want to meet? <span className="normal-case text-icebreaker-muted/50 ml-2">Multi-select</span></label>
              <div className="flex gap-2 flex-wrap">
                <MeetBtn label="Women" />
                <MeetBtn label="Men" />
                <MeetBtn label="Everyone" />
              </div>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight mb-1">Your vibe</h2>
              <p className="text-sm text-icebreaker-muted">Tell people what you're into.</p>
            </div>

            <div>
              <label className="text-xs font-bold text-icebreaker-muted uppercase tracking-widest mb-2 block">Bio</label>
              <Textarea value={form.bio} onChange={e => set("bio", e.target.value)} placeholder="What's your scene? What brings you out tonight?" className="min-h-28 rounded-2xl bg-white/5 border-white/10 text-white resize-none" data-testid="input-bio" />
            </div>

            <div>
              <label className="text-xs font-bold text-icebreaker-muted uppercase tracking-widest mb-3 block">Interests</label>
              <div className="flex flex-wrap gap-2">
                {INTERESTS.map(interest => (
                  <button
                    key={interest}
                    onClick={() => toggleInterest(interest)}
                    className="px-3 py-1.5 rounded-full text-sm font-semibold transition-all"
                    style={interests.includes(interest)
                      ? { background: "rgba(0,207,255,0.2)", border: "1.5px solid #00CFFF", color: "#00CFFF" }
                      : { background: "rgba(255,255,255,0.04)", border: "1.5px solid rgba(255,255,255,0.1)", color: "#8A8FA8" }}
                    data-testid={`interest-${interest.toLowerCase().replace(/ /g, "-")}`}
                  >
                    {interest}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight mb-1">Add photos</h2>
              <p className="text-sm text-icebreaker-muted">Show the real you. Profiles with photos get 5x more matches.</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2, 3, 4, 5].map(i => (
                <div key={i} className="aspect-square rounded-2xl flex items-center justify-center text-2xl" style={{ background: "rgba(255,255,255,0.04)", border: "2px dashed rgba(255,255,255,0.12)" }}>
                  {i === 0 ? "📷" : "＋"}
                </div>
              ))}
            </div>
            <p className="text-xs text-icebreaker-muted text-center">Photo upload coming soon — you can still complete your profile!</p>
          </>
        )}
      </div>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 px-5 pb-8 pt-4" style={{ background: "linear-gradient(to top, #0A0A0C 70%, transparent 100%)" }}>
        {/* Reward bar */}
        <div className="rounded-xl p-3 mb-3 flex items-center gap-3" style={{ background: "rgba(255,27,141,0.1)", border: "1px solid rgba(255,27,141,0.25)" }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "conic-gradient(#FF1B8D 33%, rgba(255,255,255,0.1) 33%)" }}>
            <span className="text-[9px] font-extrabold text-white">33%</span>
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-bold text-icebreaker-muted uppercase tracking-widest">Reward unlocking…</p>
            <p className="text-xs font-bold">Complete Basics — Step {step + 1}/3</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-icebreaker-coral">+50 XP ⚡</p>
            <p className="text-xs font-bold text-icebreaker-teal">+10 Cubes</p>
          </div>
        </div>

        <button
          onClick={next}
          className="w-full h-14 rounded-full font-bold text-white text-base flex items-center justify-center gap-2 transition-all active:scale-95"
          style={{ background: "linear-gradient(135deg, #FF1B8D 0%, #d6007a 100%)", boxShadow: "0 0 30px rgba(255,27,141,0.4)" }}
          data-testid="button-continue"
        >
          {step < 2 ? "Continue →" : "Finish & Enter ✨"}
        </button>
      </div>
    </div>
  );
}
