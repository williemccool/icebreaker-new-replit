import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen pb-16" style={{ background: "#0A0A0C" }}>
      <div className="sticky top-0 z-10 px-4 py-3 flex items-center gap-3" style={{ background: "rgba(10,10,12,0.95)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <Link href="/">
          <button className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }} data-testid="button-back-terms">
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>
        </Link>
        <h1 className="font-extrabold text-base">Terms & Conditions</h1>
      </div>

      <div className="max-w-2xl mx-auto px-5 py-6 space-y-5 text-sm text-icebreaker-text leading-relaxed">
        <p className="text-xs text-icebreaker-muted">Last updated: 24 May 2026</p>
        <p>Welcome to Icebreaker (“we”, “us”). These Terms govern your use of the Icebreaker mobile app and website (the “Service”). By creating an account or using the Service, you agree to be bound by these Terms.</p>

        <h2 className="font-extrabold text-base mt-4">1. Eligibility</h2>
        <p>You must be at least <strong>18 years of age</strong> to use Icebreaker. You represent that the information you provide is accurate and that you have the legal capacity to enter into this agreement.</p>

        <h2 className="font-extrabold text-base mt-4">2. Your account</h2>
        <p>You are responsible for everything that happens under your account, including OTPs, devices, and any content you submit. Keep your phone secure. Do not share your account with anyone.</p>

        <h2 className="font-extrabold text-base mt-4">3. Acceptable use</h2>
        <p>You agree not to: harass, threaten, dox, impersonate, send unsolicited commercial messages, share content that is illegal, sexually explicit, hateful, or involves minors, or use the Service for any commercial activity without our written permission. We may remove content and suspend or terminate accounts that violate these Terms.</p>

        <h2 className="font-extrabold text-base mt-4">4. Payments & virtual goods</h2>
        <p>Prices are shown in Indian Rupees (INR) including applicable taxes. Cubes, Season Pass, and God Mode are virtual entitlements with no cash value. Payments are processed by a licensed payment partner. All purchases are final except where required by law.</p>

        <h2 className="font-extrabold text-base mt-4">5. Safety</h2>
        <p>Meeting people from the internet involves risk. Always meet in public, tell a friend where you are, and trust your instincts. We do not perform background checks on users.</p>

        <h2 className="font-extrabold text-base mt-4">6. Intellectual property</h2>
        <p>The Service, including all software, design, brand and content, is owned by us. You retain ownership of your profile content but grant us a worldwide, royalty-free licence to host and display it for the purpose of operating the Service.</p>

        <h2 className="font-extrabold text-base mt-4">7. Termination</h2>
        <p>You may delete your account at any time from Settings. We may suspend or terminate your account if you violate these Terms or applicable law.</p>

        <h2 className="font-extrabold text-base mt-4">8. Liability</h2>
        <p>To the maximum extent permitted by law, our aggregate liability to you in connection with the Service is limited to the amounts you paid us in the 12 months before the claim.</p>

        <h2 className="font-extrabold text-base mt-4">9. Governing law</h2>
        <p>These Terms are governed by the laws of India. Courts at Bengaluru, Karnataka shall have exclusive jurisdiction.</p>

        <h2 className="font-extrabold text-base mt-4">10. Contact</h2>
        <p>Questions? Email <a className="text-icebreaker-coral underline" href="mailto:hello@icebreaker.app">hello@icebreaker.app</a>. For grievances see our <Link href="/grievance"><span className="text-icebreaker-coral underline">Grievance Officer</span></Link> page.</p>
      </div>
    </div>
  );
}
