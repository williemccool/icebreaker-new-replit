import { useState } from "react";
import { ArrowRight, Rocket } from "lucide-react";
import onb1 from "@assets/onb1_1779114539714.png";
import onb2 from "@assets/onb2_1779114539714.png";
import onb3 from "@assets/onb3_1779114539715.png";

const SLIDES = [
  {
    bg: onb1,
    title: ["MEET WHERE", "YOU GO OUT."],
    body: "Connect with people checking into the same venues tonight. See who's around before you even arrive.",
    cta: "NEXT",
  },
  {
    bg: onb2,
    title: ["PLAY", "ICEBREAKER", "GAMES."],
    body: "Skip the awkward small talk. Challenge your matches to fun, interactive mini-games that break the ice instantly.",
    cta: "NEXT",
  },
  {
    bg: onb3,
    title: ["SAFETY FIRST,", "ALWAYS."],
    body: "We prioritize your comfort with women-first controls, verified profiles, and instant SOS modes for peace of mind.",
    cta: "GET STARTED",
  },
];

export default function IntroPage({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const slide = SLIDES[i];
  const isLast = i === SLIDES.length - 1;

  const next = () => {
    if (isLast) {
      localStorage.setItem("seenIntro", "1");
      onDone();
    } else {
      setI(i + 1);
    }
  };

  const skip = () => {
    localStorage.setItem("seenIntro", "1");
    onDone();
  };

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: "#0A0A0C" }}>
      <img
        src={slide.bg}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        style={{ objectPosition: "center" }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(10,10,12,0.55) 0%, rgba(10,10,12,0.15) 35%, rgba(10,10,12,0.85) 100%)",
        }}
      />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 pt-6 z-10">
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #FF1B8D, #d6007a)" }}
          >
            <span className="text-white text-[10px] font-extrabold">✱</span>
          </div>
          <span className="text-white text-xs font-extrabold tracking-[0.3em]">ICEBREAKER</span>
        </div>
        {!isLast && (
          <button
            onClick={skip}
            className="flex items-center gap-1 text-icebreaker-teal text-xs font-bold tracking-widest"
            data-testid="button-skip-intro"
          >
            SKIP <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Glass card */}
      <div className="absolute left-4 right-4 bottom-28 z-10">
        <div
          className="rounded-3xl p-6"
          style={{
            background: "rgba(10,10,12,0.7)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <h1
            className="text-4xl font-extrabold text-white leading-[1.05] tracking-tight mb-4"
            data-testid={`intro-title-${i}`}
          >
            {slide.title.map((line, idx) => (
              <div key={idx}>{line}</div>
            ))}
          </h1>
          <p className="text-icebreaker-muted text-[15px] leading-relaxed mb-5">{slide.body}</p>
          <div className="flex items-center gap-1.5">
            {SLIDES.map((_, idx) => (
              <div
                key={idx}
                className="h-1 rounded-full transition-all"
                style={{
                  width: idx === i ? 28 : 8,
                  background: idx === i ? "#FF1B8D" : "rgba(255,255,255,0.18)",
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="absolute left-4 right-4 bottom-8 z-10">
        <button
          onClick={next}
          className="w-full h-14 rounded-full font-extrabold text-white text-sm tracking-[0.2em] flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          style={{
            background: "linear-gradient(135deg, #FF1B8D 0%, #d6007a 100%)",
            boxShadow: "0 0 30px rgba(255,27,141,0.4)",
          }}
          data-testid={`button-intro-${isLast ? "start" : "next"}`}
        >
          {slide.cta} {isLast ? <Rocket className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
