import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import {
  ArrowLeft, ChevronRight, MapPin, Sun, Moon, Calendar as CalendarIcon,
  ShieldCheck, Edit2, Send, Check, Sparkles,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type Step = "when" | "where" | "confirm";

const EVENING_TIMES = ["6:00 PM", "6:30 PM", "7:00 PM", "7:30 PM", "8:00 PM", "8:30 PM"];
const LATE_TIMES    = ["9:00 PM", "9:30 PM", "10:00 PM", "10:30 PM", "11:00 PM"];

function parseTimeToHM(t: string): { h: number; m: number } {
  const [time, mer] = t.split(" ");
  const [hh, mm] = time.split(":").map(Number);
  let h = hh % 12;
  if (mer === "PM") h += 12;
  return { h, m: mm };
}

function buildDays(count = 7) {
  const out: { date: Date; weekday: string; day: number; isToday: boolean }[] = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  for (let i = 0; i < count; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    out.push({
      date: d,
      weekday: i === 0 ? "TODAY" : d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase(),
      day: d.getDate(),
      isToday: i === 0,
    });
  }
  return out;
}

export default function PlanDatePage() {
  const { matchId } = useParams<{ matchId: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>("when");
  const days = useMemo(() => buildDays(7), []);
  const [dayIdx, setDayIdx] = useState(0);
  const [time, setTime] = useState("8:00 PM");
  const [venueId, setVenueId] = useState<number | null>(null);
  const [safety, setSafety] = useState(false);

  const { data: matchData } = useQuery<any>({
    queryKey: [`/api/matches/${matchId}`],
    enabled: !!matchId,
  });
  const { data: venues = [] } = useQuery<any[]>({
    queryKey: ["/api/venues"],
  });

  const other = matchData?.otherUser;
  const selectedVenue = useMemo(
    () => (venues || []).find((v: any) => v.id === venueId),
    [venues, venueId],
  );

  const bookingDate = useMemo(() => {
    const d = new Date(days[dayIdx].date);
    const { h, m } = parseTimeToHM(time);
    d.setHours(h, m, 0, 0);
    return d;
  }, [dayIdx, time, days]);

  const propose = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/dates/propose", {
        matchId: parseInt(matchId!),
        venueId,
        bookingDate: bookingDate.toISOString(),
        safetyCheck: safety,
      });
      return res.json();
    },
    onSuccess: async () => {
      // Drop a date proposal card into the match thread so the recipient sees it.
      try {
        await apiRequest("POST", `/api/matches/${matchId}/messages`, {
          body: `📅 DATE_PROPOSAL ${selectedVenue?.name ?? "Venue"} • ${bookingDate.toLocaleString("en-IN", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`,
        });
      } catch {}
      queryClient.invalidateQueries({ queryKey: [`/api/matches/${matchId}/messages`] });
      toast({ title: "Date invite sent" });
      navigate(`/chat/${matchId}`);
    },
    onError: (err: any) => toast({ title: err?.message || "Couldn't send invite", variant: "destructive" }),
  });

  const stepNum = step === "when" ? 1 : step === "where" ? 2 : 3;
  const isNight = parseTimeToHM(time).h >= 21;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(255,27,141,0.18), transparent 55%), #0A0A0C" }}>
      {/* Header */}
      <div className="grid grid-cols-3 items-center px-4 pt-5 pb-2">
        <button
          onClick={() => step === "when" ? navigate(`/chat/${matchId}`) : setStep(step === "confirm" ? "where" : "when")}
          className="w-9 h-9 rounded-xl flex items-center justify-center justify-self-start"
          style={{ background: "rgba(255,255,255,0.06)" }}
          data-testid="button-back"
          aria-label="Back"
        >
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>
        <div className="text-center">
          <h1 className="text-base font-extrabold tracking-tight text-white">
            {step === "confirm" ? "REVIEW" : "PLAN DATE"}
          </h1>
          {step === "confirm" && (
            <span className="text-[10px] font-bold tracking-widest text-icebreaker-muted">STEP 3 OF 3</span>
          )}
        </div>
        <div />
      </div>

      {/* Progress */}
      <div className="px-4 mt-1 mb-4 flex gap-1.5">
        {[1, 2, 3].map((n) => (
          <div key={n} className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
            <div
              className="h-full transition-all"
              style={{
                width: stepNum >= n ? "100%" : "0%",
                background: "linear-gradient(90deg,#FF1B8D,#00CFFF)",
              }}
            />
          </div>
        ))}
      </div>

      <div className="flex-1 px-4 pb-32">
        {step === "when" && (
          <>
            <h2 className="text-3xl font-extrabold tracking-tight mb-1">
              When's the&nbsp;
              <span style={{
                background: "linear-gradient(90deg,#FF1B8D,#00CFFF)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}>move?</span>
            </h2>
            <p className="text-sm text-icebreaker-muted mb-5">Choose a vibe time for your date.</p>

            {/* Day picker */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-6 -mx-1 px-1">
              {days.map((d, i) => {
                const active = i === dayIdx;
                return (
                  <button
                    key={d.day}
                    onClick={() => setDayIdx(i)}
                    className="flex-shrink-0 w-[72px] h-[88px] rounded-2xl flex flex-col items-center justify-center transition-all"
                    style={
                      active
                        ? { background: "linear-gradient(135deg,#FF1B8D,#d6007a)", boxShadow: "0 6px 24px rgba(255,27,141,0.45)" }
                        : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }
                    }
                    data-testid={`day-${i}`}
                  >
                    <span className={`text-[10px] font-bold tracking-widest ${active ? "text-white/85" : "text-icebreaker-muted"}`}>
                      {d.weekday}
                    </span>
                    <span className={`text-3xl font-extrabold mt-0.5 ${active ? "text-white" : "text-white"}`}>{d.day}</span>
                    {active && <span className="w-1.5 h-1.5 rounded-full bg-white mt-1.5" />}
                  </button>
                );
              })}
            </div>

            {/* Evening */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center"
                     style={{ background: "rgba(255,27,141,0.15)" }}>
                  <Sun className="w-3.5 h-3.5 text-icebreaker-coral" />
                </div>
                <h3 className="text-base font-extrabold">Evening Vibes</h3>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {EVENING_TIMES.map((t) => {
                  const active = t === time;
                  return (
                    <button
                      key={t}
                      onClick={() => setTime(t)}
                      className="h-12 rounded-xl text-sm font-bold transition-all"
                      style={
                        active
                          ? { background: "rgba(255,27,141,0.15)", border: "1.5px solid #FF1B8D", color: "#FF1B8D" }
                          : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#F0F2F7" }
                      }
                      data-testid={`time-${t.replace(/[:\s]/g, "")}`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Late Night */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center"
                     style={{ background: "rgba(108,99,255,0.15)" }}>
                  <Moon className="w-3.5 h-3.5" style={{ color: "#9b91ff" }} />
                </div>
                <h3 className="text-base font-extrabold">Late Night</h3>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {LATE_TIMES.map((t) => {
                  const active = t === time;
                  const disabled = t === "10:30 PM" || t === "11:00 PM" ? days[dayIdx].isToday : false;
                  return (
                    <button
                      key={t}
                      disabled={disabled}
                      onClick={() => setTime(t)}
                      className="h-12 rounded-xl text-sm font-bold transition-all disabled:opacity-30"
                      style={
                        active
                          ? { background: "rgba(155,145,255,0.15)", border: "1.5px solid #9b91ff", color: "#9b91ff" }
                          : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#F0F2F7" }
                      }
                      data-testid={`time-${t.replace(/[:\s]/g, "")}`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {step === "where" && (
          <>
            <h2 className="text-3xl font-extrabold tracking-tight mb-1">Pick a&nbsp;
              <span style={{
                background: "linear-gradient(90deg,#FF1B8D,#00CFFF)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}>spot</span>
            </h2>
            <p className="text-sm text-icebreaker-muted mb-5">
              {bookingDate.toLocaleDateString("en-IN", { weekday: "long", month: "short", day: "numeric" })} • {time}
            </p>
            <div className="space-y-2.5">
              {(venues || []).slice(0, 8).map((v: any) => {
                const active = v.id === venueId;
                return (
                  <button
                    key={v.id}
                    onClick={() => setVenueId(v.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all active:scale-[0.99]"
                    style={
                      active
                        ? { background: "rgba(255,27,141,0.08)", border: "1.5px solid #FF1B8D", boxShadow: "0 4px 20px rgba(255,27,141,0.2)" }
                        : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }
                    }
                    data-testid={`venue-${v.id}`}
                  >
                    {v.imageUrl ? (
                      <img src={v.imageUrl} alt={v.name} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                           style={{ background: "linear-gradient(135deg, rgba(255,27,141,0.4),rgba(0,207,255,0.3))" }}>
                        <MapPin className="w-5 h-5 text-white" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-extrabold text-sm truncate">{v.name}</div>
                      <div className="flex items-center gap-1 text-[11px] text-icebreaker-muted truncate">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{v.area || v.address || "Bangalore"}</span>
                      </div>
                    </div>
                    {active ? (
                      <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                           style={{ background: "#FF1B8D" }}>
                        <Check className="w-3.5 h-3.5 text-white" strokeWidth={4} />
                      </div>
                    ) : (
                      <ChevronRight className="w-4 h-4 text-icebreaker-muted flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {step === "confirm" && (
          <>
            <h2 className="text-3xl font-extrabold tracking-tight mb-1">
              Ready to break&nbsp;
              <span style={{
                background: "linear-gradient(90deg,#FF1B8D,#00CFFF)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}>the ice?</span>
            </h2>
            <p className="text-sm text-icebreaker-muted mb-5">Review your date plan before sending.</p>

            <div
              className="rounded-3xl overflow-hidden"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              {/* Venue image header */}
              <div className="relative h-40">
                {selectedVenue?.imageUrl ? (
                  <img src={selectedVenue.imageUrl} alt={selectedVenue.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full"
                       style={{ background: "linear-gradient(135deg, rgba(255,27,141,0.4), rgba(0,207,255,0.3))" }} />
                )}
                <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85), transparent 60%)" }} />
                <button
                  onClick={() => setStep("where")}
                  className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-white"
                  style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(10px)" }}
                  data-testid="button-edit"
                >
                  <Edit2 className="w-3 h-3" /> Edit
                </button>
                <div className="absolute bottom-3 left-3 flex items-center gap-2">
                  <div className="relative">
                    {other?.photos?.[0] ? (
                      <img src={other.photos[0]} alt={other.name}
                           className="w-10 h-10 rounded-full object-cover"
                           style={{ border: "2px solid #FF1B8D" }} />
                    ) : (
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-extrabold text-white"
                           style={{ background: "linear-gradient(135deg,#FF1B8D,#00CFFF)", border: "2px solid #FF1B8D" }}>
                        {other?.name?.[0] ?? "?"}
                      </div>
                    )}
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400 border border-black" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold tracking-widest text-white/70">ASKING</div>
                    <div className="text-base font-extrabold text-white">{other?.name}</div>
                  </div>
                </div>
              </div>

              <div className="p-4 space-y-4">
                <div>
                  <div className="text-[10px] font-bold tracking-widest text-icebreaker-coral mb-1">WHERE</div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-extrabold">{selectedVenue?.name}</h3>
                    <span className="text-base">🍸</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-icebreaker-muted">
                    <MapPin className="w-3 h-3" />
                    <span>{selectedVenue?.area || selectedVenue?.address || "Bangalore"}</span>
                  </div>
                </div>

                <div className="h-px" style={{ background: "rgba(255,255,255,0.06)" }} />

                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-[10px] font-bold tracking-widest text-icebreaker-coral mb-1">WHEN</div>
                    <div className="text-xl font-extrabold">
                      {bookingDate.toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" })}
                    </div>
                    <div className="text-sm text-white/80 mt-0.5">{time}</div>
                  </div>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center"
                       style={{ background: "rgba(0,207,255,0.15)" }}>
                    {isNight ? <Moon className="w-4 h-4 text-icebreaker-teal" /> : <Sun className="w-4 h-4 text-icebreaker-teal" />}
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setSafety(!safety)}
              className="w-full flex items-center justify-between mt-4 p-4 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
              data-testid="toggle-safety"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                     style={{ background: "rgba(255,27,141,0.15)" }}>
                  <ShieldCheck className="w-4 h-4 text-icebreaker-coral" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-extrabold">Safety Check</div>
                  <div className="text-[11px] text-icebreaker-muted">Share with trusted contact</div>
                </div>
              </div>
              <div className="w-12 h-7 rounded-full relative transition-colors"
                   style={{ background: safety ? "#FF1B8D" : "rgba(255,255,255,0.15)" }}>
                <span className="absolute top-0.5 w-6 h-6 rounded-full bg-white transition-all"
                      style={{ left: safety ? "22px" : "2px" }} />
              </div>
            </button>
          </>
        )}
      </div>

      {/* Sticky CTA */}
      <div
        className="fixed bottom-0 left-0 right-0 px-4 pb-7 pt-3"
        style={{ background: "linear-gradient(to top,#0A0A0C 65%, transparent)" }}
      >
        {step === "when" && (
          <button
            onClick={() => setStep("where")}
            className="w-full h-14 rounded-full font-bold text-white text-base flex items-center justify-center gap-2 active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg,#FF1B8D,#d6007a)", boxShadow: "0 0 30px rgba(255,27,141,0.4)" }}
            data-testid="button-next-where"
          >
            Next Step <ChevronRight className="w-5 h-5" />
          </button>
        )}
        {step === "where" && (
          <button
            disabled={venueId == null}
            onClick={() => setStep("confirm")}
            className="w-full h-14 rounded-full font-bold text-white text-base flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-40"
            style={{ background: "linear-gradient(135deg,#FF1B8D,#d6007a)", boxShadow: "0 0 30px rgba(255,27,141,0.4)" }}
            data-testid="button-next-confirm"
          >
            Review <ChevronRight className="w-5 h-5" />
          </button>
        )}
        {step === "confirm" && (
          <>
            <button
              onClick={() => propose.mutate()}
              disabled={propose.isPending || !venueId}
              className="w-full h-14 rounded-full font-bold text-white text-base flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
              style={{ background: "linear-gradient(135deg,#FF1B8D,#d6007a)", boxShadow: "0 0 30px rgba(255,27,141,0.4)" }}
              data-testid="button-send-invite"
            >
              {propose.isPending ? "Sending…" : <>SEND INVITE <Send className="w-4 h-4" /></>}
            </button>
            <div className="text-center text-[11px] text-icebreaker-muted mt-2 flex items-center justify-center gap-1.5">
              <Sparkles className="w-3 h-3" />
              You won't be charged until they accept.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
