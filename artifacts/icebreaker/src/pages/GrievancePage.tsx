import { Link } from "wouter";
import { ArrowLeft, Mail, Phone, MapPin } from "lucide-react";

export default function GrievancePage() {
  return (
    <div className="min-h-screen pb-16" style={{ background: "#0A0A0C" }}>
      <div className="sticky top-0 z-10 px-4 py-3 flex items-center gap-3" style={{ background: "rgba(10,10,12,0.95)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <Link href="/">
          <button className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }} data-testid="button-back-grievance">
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>
        </Link>
        <h1 className="font-extrabold text-base">Grievance Officer</h1>
      </div>

      <div className="max-w-2xl mx-auto px-5 py-6 space-y-5 text-sm leading-relaxed">
        <p>In accordance with India's Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, the contact details of our Grievance Officer are below.</p>

        <div className="rounded-2xl p-5 space-y-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <p className="font-extrabold text-base">Icebreaker Grievance Officer</p>
          <div className="flex items-center gap-3"><Mail className="w-4 h-4 text-icebreaker-coral" /> <a className="underline" href="mailto:grievance@icebreaker.app">grievance@icebreaker.app</a></div>
          <div className="flex items-center gap-3"><Phone className="w-4 h-4 text-icebreaker-coral" /> <span>+91 80 4567 8900 (Mon–Fri, 10:00–18:00 IST)</span></div>
          <div className="flex items-start gap-3"><MapPin className="w-4 h-4 text-icebreaker-coral mt-1" /> <span>Icebreaker Technologies Pvt. Ltd.<br />Indiranagar, Bengaluru, Karnataka 560038, India</span></div>
        </div>

        <p>We acknowledge complaints within <strong>24 hours</strong> and resolve them within <strong>15 days</strong>. For child sexual abuse material we act within 24 hours.</p>

        <p>You may also contact India's Cyber Crime Helpline at <strong>1930</strong> or report online at <a className="text-icebreaker-coral underline" href="https://cybercrime.gov.in" target="_blank" rel="noreferrer">cybercrime.gov.in</a>.</p>
      </div>
    </div>
  );
}
