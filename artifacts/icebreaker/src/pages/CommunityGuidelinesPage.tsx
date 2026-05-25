import { Link } from "wouter";
import { ArrowLeft, Shield, Heart, Ban, AlertTriangle } from "lucide-react";

export default function CommunityGuidelinesPage() {
  return (
    <div className="min-h-screen pb-16" style={{ background: "#0A0A0C" }}>
      <div className="sticky top-0 z-10 px-4 py-3 flex items-center gap-3" style={{ background: "rgba(10,10,12,0.95)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <Link href="/">
          <button className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }} data-testid="button-back-cg">
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>
        </Link>
        <h1 className="font-extrabold text-base">Community Guidelines</h1>
      </div>

      <div className="max-w-2xl mx-auto px-5 py-6 space-y-5 text-sm leading-relaxed">
        <p className="text-icebreaker-muted">Icebreaker is built for adults who want to meet IRL in Bangalore. Be kind, be real, be safe.</p>

        <div className="rounded-2xl p-4 space-y-2" style={{ background: "rgba(255,27,141,0.08)", border: "1px solid rgba(255,27,141,0.25)" }}>
          <div className="flex items-center gap-2 font-extrabold"><Heart className="w-4 h-4 text-icebreaker-coral" /> What we love</div>
          <ul className="list-disc pl-5 text-icebreaker-text/90 space-y-1">
            <li>Showing up as the real you — photos that look like you today.</li>
            <li>Asking clearly, listening carefully, accepting “no” gracefully.</li>
            <li>Meeting in public venues, sharing your plans with a friend.</li>
          </ul>
        </div>

        <div className="rounded-2xl p-4 space-y-2" style={{ background: "rgba(255,80,80,0.08)", border: "1px solid rgba(255,80,80,0.25)" }}>
          <div className="flex items-center gap-2 font-extrabold"><Ban className="w-4 h-4" style={{ color: "#FF5050" }} /> Zero tolerance</div>
          <ul className="list-disc pl-5 space-y-1">
            <li>Harassment, threats, hate speech, or stalking.</li>
            <li>Nudity, sexual content involving minors, or non-consensual content.</li>
            <li>Fake profiles, impersonation, catfishing, scams.</li>
            <li>Solicitation, prostitution, or any illegal activity.</li>
          </ul>
        </div>

        <div className="rounded-2xl p-4 space-y-2" style={{ background: "rgba(0,207,255,0.08)", border: "1px solid rgba(0,207,255,0.25)" }}>
          <div className="flex items-center gap-2 font-extrabold"><Shield className="w-4 h-4 text-icebreaker-teal" /> Safety tools</div>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Block</strong> anyone, anytime — they vanish from your matches, rooms, and search.</li>
            <li><strong>Report</strong> a profile, message, or photo and we will review within 24 hours.</li>
            <li><strong>Selfie verification</strong> keeps bots out and helps you spot the real ones.</li>
          </ul>
        </div>

        <div className="rounded-2xl p-4 space-y-2" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="flex items-center gap-2 font-extrabold"><AlertTriangle className="w-4 h-4 text-yellow-400" /> If something goes wrong</div>
          <p>If you ever feel unsafe in person, call <strong>112</strong> (India emergency). To report someone on Icebreaker, tap the ⋯ button on their profile or message. For urgent safety concerns: <a className="text-icebreaker-coral underline" href="mailto:safety@icebreaker.app">safety@icebreaker.app</a>.</p>
        </div>
      </div>
    </div>
  );
}
