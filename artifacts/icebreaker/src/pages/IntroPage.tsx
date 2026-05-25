import { useState } from "react";
import onb1 from "@assets/onb1_1779114539714.png";
import onb2 from "@assets/onb2_1779114539714.png";
import onb3 from "@assets/onb3_1779114539715.png";

const SLIDES = [onb1, onb2, onb3];

export default function IntroPage({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
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
    <div
      className="min-h-screen w-full flex items-center justify-center"
      style={{ background: "#000" }}
    >
      <div
        className="relative w-full max-w-md mx-auto"
        style={{ aspectRatio: "9 / 19.5", maxHeight: "100vh", background: "#0A0A0C" }}
      >
        <img
          src={SLIDES[i]}
          alt={`Onboarding step ${i + 1}`}
          className="absolute inset-0 w-full h-full object-cover select-none"
          draggable={false}
          data-testid={`intro-slide-${i}`}
        />

        {/* Invisible tap target over baked SKIP (top-right) — hidden on last slide where the design has no SKIP */}
        {!isLast && (
          <button
            onClick={skip}
            aria-label="Skip onboarding"
            className="absolute"
            style={{ top: "3.5%", right: "4%", width: "22%", height: "5%" }}
            data-testid="button-skip-intro"
          />
        )}

        {/* Invisible tap target over baked NEXT / GET STARTED CTA */}
        <button
          onClick={next}
          aria-label={isLast ? "Get Started" : "Next"}
          className="absolute active:opacity-80 transition-opacity"
          style={{ bottom: "4%", left: "5%", right: "5%", height: "9%" }}
          data-testid={`button-intro-${isLast ? "start" : "next"}`}
        />

        {/* Optional: allow swiping the image area to advance */}
        <button
          onClick={next}
          aria-label="Advance"
          className="absolute"
          style={{ top: "10%", left: 0, right: 0, height: "55%", background: "transparent" }}
          tabIndex={-1}
        />
      </div>
    </div>
  );
}
