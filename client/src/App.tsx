import { Route, Switch, useLocation, Link } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { useEffect, useState } from "react";
import { Home, MessageCircle, User, Radio } from "lucide-react";

// Pages
import AuthPage from "./pages/AuthPage";
import IntroPage from "./pages/IntroPage";
import SelfieVerifyPage from "./pages/SelfieVerifyPage";
import OnboardingPage from "./pages/OnboardingPage";
import TutorialPage from "./pages/TutorialPage";
import HomePage from "./pages/HomePage";
import VenuesPage from "./pages/VenuesPage";
import VenueDetailPage from "./pages/VenueDetailPage";
import RoomsPage from "./pages/RoomsPage";
import RoomDiscoveryPage from "./pages/RoomDiscoveryPage";
import RoomEntryPage from "./pages/RoomEntryPage";
import MatchesPage from "./pages/MatchesPage";
import ChatPage from "./pages/ChatPage";
import EventsPage from "./pages/EventsPage";
import ProfilePage from "./pages/ProfilePage";
import QuestsPage from "./pages/QuestsPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import MutualMatchPage from "./pages/MutualMatchPage";
import IcebreakerGamePage from "./pages/IcebreakerGamePage";
import GiftDrinkPage from "./pages/GiftDrinkPage";
import PaymentPage from "./pages/PaymentPage";
import ConfirmPurchasePage from "./pages/ConfirmPurchasePage";
import TrustSafetyPage from "./pages/TrustSafetyPage";
import NotFoundPage from "./pages/not-found";

const HIDE_NAV_ROUTES = [
  "/auth", "/onboarding", "/tutorial",
  "/match/", "/game/", "/gift/", "/payment", "/safety"
];

const NAV_ITEMS = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/rooms", icon: Radio, label: "Live" },
  { href: "/matches", icon: MessageCircle, label: "Chats" },
  { href: "/profile", icon: User, label: "Profile" },
];

function BottomNav() {
  const [location] = useLocation();
  const hide = HIDE_NAV_ROUTES.some(r => location.startsWith(r)) ||
    location.startsWith("/chat/") || location.startsWith("/game/");

  if (hide) return null;

  return (
    <nav className="bottom-nav safe-area-bottom" data-testid="bottom-nav">
      <div className="flex items-center justify-around max-w-lg mx-auto px-2">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const isActive = location === href || (href !== "/" && location.startsWith(href));
          return (
            <Link key={href} href={href}>
              <div className={`bottom-nav-item ${isActive ? "active" : ""}`} data-testid={`nav-${label.toLowerCase()}`}>
                {isActive && href === "/rooms" ? (
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #FF1B8D, #d6007a)", boxShadow: "0 0 16px rgba(255,27,141,0.5)" }}>
                    <Icon className="w-5 h-5 text-white" strokeWidth={2.5} />
                  </div>
                ) : (
                  <Icon className={`nav-icon w-5 h-5 ${isActive ? "text-icebreaker-coral" : "text-icebreaker-muted"}`} strokeWidth={isActive ? 2.5 : 1.8} />
                )}
                <span className={isActive ? "text-icebreaker-coral" : ""}>{label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [seenIntro, setSeenIntro] = useState(true);
  const [needsSelfie, setNeedsSelfie] = useState(false);
  const [checkingVerified, setCheckingVerified] = useState(false);

  const checkVerification = async () => {
    setCheckingVerified(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/user/me", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        const user = data?.user || data;
        if (user) localStorage.setItem("user", JSON.stringify(user));
        setNeedsSelfie(!user?.verified);
      }
    } catch {}
    setCheckingVerified(false);
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsAuthenticated(!!token);
    setSeenIntro(!!localStorage.getItem("seenIntro"));
    setIsLoading(false);
    if (token) checkVerification();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0A0A0C" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl animate-pulse" style={{ background: "linear-gradient(135deg, #FF1B8D, #00CFFF)" }} />
          <span className="text-icebreaker-muted text-sm font-semibold">Loading…</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <QueryClientProvider client={queryClient}>
        {!seenIntro ? (
          <IntroPage onDone={() => setSeenIntro(true)} />
        ) : (
          <AuthPage
            onAuth={() => {
              setIsAuthenticated(true);
              checkVerification();
            }}
          />
        )}
        <Toaster />
      </QueryClientProvider>
    );
  }

  if (needsSelfie) {
    return (
      <QueryClientProvider client={queryClient}>
        <SelfieVerifyPage onDone={() => setNeedsSelfie(false)} />
        <Toaster />
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-icebreaker-bg text-icebreaker-text">
        <Switch>
          <Route path="/" component={HomePage} />
          <Route path="/tutorial" component={TutorialPage} />
          <Route path="/onboarding" component={OnboardingPage} />
          <Route path="/venues" component={VenuesPage} />
          <Route path="/venues/:id" component={VenueDetailPage} />
          <Route path="/rooms" component={RoomsPage} />
          <Route path="/rooms/:id/entry" component={RoomEntryPage} />
          <Route path="/rooms/:id" component={RoomDiscoveryPage} />
          <Route path="/matches" component={MatchesPage} />
          <Route path="/chat/:id" component={ChatPage} />
          <Route path="/events" component={EventsPage} />
          <Route path="/profile" component={ProfilePage} />
          <Route path="/quests" component={QuestsPage} />
          <Route path="/leaderboard" component={LeaderboardPage} />
          <Route path="/match/:matchId" component={MutualMatchPage} />
          <Route path="/game/:matchId" component={IcebreakerGamePage} />
          <Route path="/gift/:userId" component={GiftDrinkPage} />
          <Route path="/payment" component={PaymentPage} />
          <Route path="/payment/confirm" component={ConfirmPurchasePage} />
          <Route path="/safety" component={TrustSafetyPage} />
          <Route component={NotFoundPage} />
        </Switch>
        <BottomNav />
      </div>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
