import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen pb-16" style={{ background: "#0A0A0C" }}>
      <div className="sticky top-0 z-10 px-4 py-3 flex items-center gap-3" style={{ background: "rgba(10,10,12,0.95)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <Link href="/">
          <button className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }} data-testid="button-back-privacy">
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>
        </Link>
        <h1 className="font-extrabold text-base">Privacy Policy</h1>
      </div>

      <div className="max-w-2xl mx-auto px-5 py-6 space-y-5 text-sm text-icebreaker-text leading-relaxed">
        <p className="text-xs text-icebreaker-muted">Last updated: 24 May 2026</p>
        <p>This Privacy Policy explains how Icebreaker collects, uses, and protects your personal information.</p>

        <h2 className="font-extrabold text-base mt-4">Information we collect</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Account data:</strong> phone number, name, date of birth, gender, city, pronouns.</li>
          <li><strong>Profile data:</strong> bio, photos, interests, who you want to meet.</li>
          <li><strong>Usage data:</strong> swipes, matches, check-ins, room presence, messages you send.</li>
          <li><strong>Payment data:</strong> handled by our payment partner; we only store payment status and a reference ID.</li>
          <li><strong>Device data:</strong> IP address, device type, and approximate location (only when you opt in).</li>
        </ul>

        <h2 className="font-extrabold text-base mt-4">How we use it</h2>
        <p>To operate the Service, match you with other users, prevent abuse, comply with law, and improve the product. We do not sell your personal information.</p>

        <h2 className="font-extrabold text-base mt-4">Who we share with</h2>
        <p>Service providers (hosting, SMS, payments), other users (only the information you choose to display), and authorities when required by law.</p>

        <h2 className="font-extrabold text-base mt-4">Your rights</h2>
        <p>You can access, correct, export, or delete your data from Settings or by emailing <a className="text-icebreaker-coral underline" href="mailto:privacy@icebreaker.app">privacy@icebreaker.app</a>.</p>

        <h2 className="font-extrabold text-base mt-4">Security</h2>
        <p>We use industry-standard safeguards including TLS, JWT-based authentication, rate-limiting, and selfie verification. No system is 100% secure — please report incidents to <a className="text-icebreaker-coral underline" href="mailto:security@icebreaker.app">security@icebreaker.app</a>.</p>

        <h2 className="font-extrabold text-base mt-4">Retention</h2>
        <p>We keep your data while your account is active. After deletion we retain limited records (e.g. payment receipts) as required by law.</p>

        <h2 className="font-extrabold text-base mt-4">Children</h2>
        <p>Icebreaker is strictly for adults aged 18+. We do not knowingly collect data from minors.</p>

        <h2 className="font-extrabold text-base mt-4">Contact</h2>
        <p>For privacy questions: <a className="text-icebreaker-coral underline" href="mailto:privacy@icebreaker.app">privacy@icebreaker.app</a>. For complaints see our <Link href="/grievance"><span className="text-icebreaker-coral underline">Grievance Officer</span></Link>.</p>
      </div>
    </div>
  );
}
