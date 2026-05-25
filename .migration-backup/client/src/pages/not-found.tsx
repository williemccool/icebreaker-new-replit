import { Link } from "wouter";
import { Flame } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-icebreaker-bg">
      <div className="text-center max-w-xs">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: "linear-gradient(135deg, rgba(255,27,141,0.2) 0%, rgba(0,207,255,0.2) 100%)", border: "1px solid rgba(255,27,141,0.3)" }}>
          <Flame className="w-8 h-8 text-icebreaker-coral" />
        </div>
        <h1 className="text-5xl font-extrabold text-icebreaker-coral mb-2">404</h1>
        <p className="font-bold text-lg mb-1">Page not found</p>
        <p className="text-sm text-icebreaker-muted mb-6">This page doesn't exist or has been moved.</p>
        <Link href="/">
          <button className="btn-coral text-sm">Back to Home</button>
        </Link>
      </div>
    </div>
  );
}
