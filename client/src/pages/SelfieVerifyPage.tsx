import { useEffect, useRef, useState } from "react";
import { ArrowRight, MessageSquare, DoorOpen, Wine, Lock, ShieldCheck, Zap, CheckCircle2, Camera, X, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import verifyHero from "@assets/verifiyselfie_1779114539715.png";

type Stage = "intro" | "camera" | "verifying" | "done";

export default function SelfieVerifyPage({ onDone }: { onDone: () => void }) {
  const [stage, setStage] = useState<Stage>("intro");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const { toast } = useToast();

  // Start camera when entering camera stage
  useEffect(() => {
    if (stage !== "camera") return;
    let cancelled = false;
    let raf = 0;
    let detector: any = null;
    let holdStart: number | null = null;

    (async () => {
      try {
        // Front camera ONLY
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "user" }, width: { ideal: 720 }, height: { ideal: 960 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }

        // Try native FaceDetector; fallback to brightness heuristic
        const FD = (window as any).FaceDetector;
        if (FD) {
          try {
            detector = new FD({ fastMode: true, maxDetectedFaces: 1 });
          } catch {
            detector = null;
          }
        }

        const tick = async () => {
          if (cancelled || !videoRef.current) return;
          let hasFace = false;
          try {
            if (detector && videoRef.current.readyState >= 2) {
              const faces = await detector.detect(videoRef.current);
              hasFace = faces && faces.length > 0;
            } else {
              hasFace = brightnessHeuristic(videoRef.current);
            }
          } catch {
            hasFace = brightnessHeuristic(videoRef.current);
          }
          setFaceDetected(hasFace);

          if (hasFace) {
            if (holdStart === null) holdStart = performance.now();
            const elapsed = performance.now() - holdStart;
            const pct = Math.min(1, elapsed / 1800);
            setHoldProgress(pct);
            if (pct >= 1) {
              capture();
              return;
            }
          } else {
            holdStart = null;
            setHoldProgress(0);
          }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } catch (err: any) {
        setCameraError(
          err?.name === "NotAllowedError"
            ? "Camera permission denied. Please allow camera access to verify your selfie."
            : "Couldn't access front camera. Please use a device with a front-facing camera."
        );
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [stage]);

  // Simple brightness/variance heuristic — face = enough light + variance in center region
  const brightnessHeuristic = (video: HTMLVideoElement): boolean => {
    if (video.readyState < 2) return false;
    const c = canvasRef.current;
    if (!c) return false;
    const w = (c.width = 80);
    const h = (c.height = 100);
    const ctx = c.getContext("2d", { willReadFrequently: true });
    if (!ctx) return false;
    ctx.drawImage(video, 0, 0, w, h);
    const data = ctx.getImageData(w * 0.25, h * 0.2, w * 0.5, h * 0.6).data;
    let sum = 0, sqSum = 0, n = 0;
    for (let i = 0; i < data.length; i += 16) {
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      sum += lum;
      sqSum += lum * lum;
      n++;
    }
    const mean = sum / n;
    const variance = sqSum / n - mean * mean;
    return mean > 35 && mean < 235 && variance > 250;
  };

  const capture = async () => {
    if (!videoRef.current) return;
    const v = videoRef.current;
    const c = document.createElement("canvas");
    c.width = v.videoWidth || 480;
    c.height = v.videoHeight || 640;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    // Mirror so the captured image matches what user sees
    ctx.translate(c.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(v, 0, 0, c.width, c.height);
    const dataUrl = c.toDataURL("image/jpeg", 0.8);

    // Stop the stream immediately after capture
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    setStage("verifying");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/user/verify-selfie", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ selfie: dataUrl }),
      });
      if (!res.ok) throw new Error("verify failed");
      // small celebration delay
      setTimeout(() => setStage("done"), 900);
    } catch {
      toast({ title: "Verification failed", description: "Please try again.", variant: "destructive" });
      setStage("camera");
    }
  };

  // ============ INTRO ============
  if (stage === "intro") {
    return (
      <div
        className="min-h-screen flex flex-col items-center px-6 pt-10 pb-8 relative overflow-hidden"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(255,27,141,0.28) 0%, transparent 55%), #1a0814",
        }}
      >
        {/* Hero icon */}
        <div className="relative mb-6 mt-2">
          <div
            className="absolute inset-0 rounded-full animate-pulse"
            style={{ background: "radial-gradient(circle, rgba(255,27,141,0.35), transparent 70%)", transform: "scale(1.6)" }}
          />
          <div className="relative">
            <img
              src={verifyHero}
              alt=""
              className="w-44 h-44 object-contain"
              style={{ filter: "drop-shadow(0 0 24px rgba(255,27,141,0.5))" }}
            />
          </div>
        </div>

        <h1 className="text-3xl font-extrabold text-white text-center leading-tight mb-2">
          Selfie Verification
          <br />
          <span style={{ color: "#FF1B8D" }}>Required</span>
        </h1>
        <p className="text-icebreaker-muted text-sm text-center max-w-xs mb-6">
          To keep Icebreaker safe and real, we need to verify it's really you.
        </p>

        {/* Benefits card */}
        <div
          className="w-full max-w-sm rounded-3xl p-5 mb-8"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div
            className="flex items-center justify-center gap-2 mx-auto w-fit px-4 py-2 rounded-full mb-5"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <Zap className="w-3.5 h-3.5" style={{ color: "#FFD700" }} />
            <span className="text-white text-xs font-bold">
              Complete for <span style={{ color: "#FF1B8D" }}>+50 XP</span> & 1 Cube
            </span>
          </div>

          {[
            { Icon: MessageSquare, title: "Send your first message", sub: "Start connecting instantly" },
            { Icon: DoorOpen, title: "Join exclusive rooms", sub: "Unlock VIP room access" },
            { Icon: Wine, title: "Gift a drink", sub: "Send virtual gifts to others" },
          ].map(({ Icon, title, sub }, idx) => (
            <div key={idx} className="flex items-center gap-3 py-2.5">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(255,27,141,0.12)", border: "1px solid rgba(255,27,141,0.2)" }}
              >
                <Icon className="w-4 h-4" style={{ color: "#FF1B8D" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-bold leading-tight">{title}</p>
                <p className="text-icebreaker-muted text-xs">{sub}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => setStage("camera")}
          className="w-full max-w-sm h-14 rounded-full font-extrabold text-white text-sm flex items-center justify-center gap-2 mb-3"
          style={{
            background: "linear-gradient(135deg, #FF1B8D 0%, #d6007a 100%)",
            boxShadow: "0 0 30px rgba(255,27,141,0.5)",
          }}
          data-testid="button-verify-now"
        >
          Verify My Selfie Now <ArrowRight className="w-4 h-4" />
        </button>
        <button
          onClick={onDone}
          className="text-icebreaker-muted text-sm font-semibold py-2"
          data-testid="button-maybe-later"
        >
          Maybe Later
        </button>

        <div className="flex items-center gap-1.5 mt-4">
          <Lock className="w-3 h-3 text-icebreaker-muted" />
          <span className="text-[10px] text-icebreaker-muted font-bold tracking-widest">
            PRIVATE & SECURE VERIFICATION
          </span>
        </div>
      </div>
    );
  }

  // ============ CAMERA ============
  if (stage === "camera") {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "#0A0A0C" }}>
        <div className="flex items-center justify-between px-4 pt-5 pb-3">
          <button
            onClick={() => setStage("intro")}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.06)" }}
            data-testid="button-close-camera"
          >
            <X className="w-4 h-4 text-white" />
          </button>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" style={{ color: "#00CFFF" }} />
            <span className="text-xs font-bold text-icebreaker-teal tracking-wide">Front camera only</span>
          </div>
          <div className="w-9" />
        </div>

        <h2 className="text-2xl font-extrabold text-white text-center px-6 mb-1">
          Center your face
        </h2>
        <p className="text-icebreaker-muted text-sm text-center mb-5">
          Hold steady — we'll capture automatically.
        </p>

        {/* Camera viewport */}
        <div className="flex-1 flex flex-col items-center px-6">
          <div
            className="relative w-full max-w-xs aspect-[3/4] rounded-[2rem] overflow-hidden"
            style={{
              background: "#000",
              border: `3px solid ${faceDetected ? "#00CFFF" : "rgba(255,27,141,0.5)"}`,
              boxShadow: faceDetected
                ? "0 0 40px rgba(0,207,255,0.5)"
                : "0 0 30px rgba(255,27,141,0.3)",
              transition: "border-color 200ms, box-shadow 200ms",
            }}
          >
            {cameraError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 gap-3">
                <AlertCircle className="w-10 h-10 text-icebreaker-coral" />
                <p className="text-white text-sm font-semibold">{cameraError}</p>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ transform: "scaleX(-1)" }}
                />
                {/* Face oval guide */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 133" preserveAspectRatio="none">
                  <defs>
                    <mask id="oval-mask">
                      <rect width="100" height="133" fill="white" />
                      <ellipse cx="50" cy="60" rx="32" ry="42" fill="black" />
                    </mask>
                  </defs>
                  <rect width="100" height="133" fill="rgba(0,0,0,0.45)" mask="url(#oval-mask)" />
                  <ellipse
                    cx="50"
                    cy="60"
                    rx="32"
                    ry="42"
                    fill="none"
                    stroke={faceDetected ? "#00CFFF" : "rgba(255,255,255,0.4)"}
                    strokeWidth="0.6"
                    strokeDasharray={faceDetected ? "0" : "2 2"}
                  />
                </svg>
                {/* Hold progress ring */}
                {faceDetected && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-full"
                    style={{ background: "rgba(0,207,255,0.18)", border: "1px solid rgba(0,207,255,0.5)" }}>
                    <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "#00CFFF" }} />
                    <span className="text-xs font-bold text-icebreaker-teal">
                      Hold still… {Math.round(holdProgress * 100)}%
                    </span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Status pill */}
          <div className="mt-5 mb-3">
            {!cameraError && !faceDetected && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: "rgba(255,27,141,0.1)", border: "1px solid rgba(255,27,141,0.3)" }}>
                <Camera className="w-3.5 h-3.5" style={{ color: "#FF1B8D" }} />
                <span className="text-xs font-bold" style={{ color: "#FF1B8D" }}>Looking for a face…</span>
              </div>
            )}
          </div>

          <canvas ref={canvasRef} className="hidden" />
        </div>

        <p className="text-[10px] text-icebreaker-muted text-center pb-6 px-8">
          🔒 Your selfie is processed securely and used only to verify your identity. No one else sees it.
        </p>
      </div>
    );
  }

  // ============ VERIFYING ============
  if (stage === "verifying") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 gap-4" style={{ background: "#0A0A0C" }}>
        <Loader2 className="w-10 h-10 animate-spin text-icebreaker-coral" />
        <p className="text-white text-base font-bold">Verifying your selfie…</p>
        <p className="text-icebreaker-muted text-xs text-center max-w-xs">Running face check. This takes just a moment.</p>
      </div>
    );
  }

  // ============ DONE ============
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 gap-5"
      style={{
        background:
          "radial-gradient(ellipse at 50% 40%, rgba(0,207,255,0.18) 0%, transparent 55%), #0A0A0C",
      }}
    >
      <div
        className="w-24 h-24 rounded-full flex items-center justify-center"
        style={{
          background: "linear-gradient(135deg, #00CFFF, #0099cc)",
          boxShadow: "0 0 40px rgba(0,207,255,0.6)",
        }}
      >
        <CheckCircle2 className="w-12 h-12 text-white" strokeWidth={2.5} />
      </div>
      <div className="text-center">
        <h1 className="text-3xl font-extrabold text-white mb-2">You're verified!</h1>
        <p className="text-icebreaker-muted text-sm max-w-xs">
          +50 XP and 1 Cube added to your wallet. Welcome to Icebreaker.
        </p>
      </div>
      <button
        onClick={onDone}
        className="w-full max-w-sm h-14 rounded-full font-extrabold text-white text-sm flex items-center justify-center gap-2"
        style={{
          background: "linear-gradient(135deg, #FF1B8D 0%, #d6007a 100%)",
          boxShadow: "0 0 30px rgba(255,27,141,0.4)",
        }}
        data-testid="button-enter-app"
      >
        Enter Icebreaker <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}
