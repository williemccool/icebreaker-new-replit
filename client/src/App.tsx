import { Route, Switch, useLocation, Link } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { useEffect, useState } from "react";
import { Home, Compass, MapPin, MessageCircle, User } from "lucide-react";

// Pages
import AuthPage from "./pages/AuthPage";
import OnboardingPage from "./pages/OnboardingPage";
import HomePage from "./pages/HomePage";
import DiscoverPage from "./pages/DiscoverPage";
import VenuesPage from "./pages/VenuesPage";
import VenueDetailPage from "./pages/VenueDetailPage";
import RoomsPage from "./pages/RoomsPage";
import MatchesPage from "./pages/MatchesPage";
import ChatPage from "./pages/ChatPage";
import EventsPage from "./pages/EventsPage";
import ProfilePage from "./pages/ProfilePage";
import QuestsPage from "./pages/QuestsPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import NotFoundPage from "./pages/not-found";

const NAV_ITEMS = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/discover", icon: Compass, label: "Discover" },
  { href: "/venues", icon: MapPin, label: "Venues" },
  { href: "/matches", icon: MessageCircle, label: "Matches" },
  { href: "/profile", icon: User, label: "Profile" },
];

function BottomNav() {
  const [location] = useLocation();

  return (
    <nav className="bottom-nav safe-area-bottom" data-testid="bottom-nav">
      <div className="flex items-center justify-around max-w-lg mx-auto px-2">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const isActive = location === href || (href !== "/" && location.startsWith(href));
          return (
            <Link key={href} href={href}>
              <div
                className={`bottom-nav-item ${isActive ? "active" : ""}`}
                data-testid={`nav-${label.toLowerCase()}`}
              >
                <Icon className={`nav-icon w-5 h-5 ${isActive ? "text-icebreaker-coral" : "text-icebreaker-muted"}`} strokeWidth={isActive ? 2.5 : 1.8} />
                <span>{label}</span>
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

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsAuthenticated(!!token);
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-icebreaker-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-coral-orchid animate-pulse" />
          <span className="text-icebreaker-muted text-sm font-semibold">Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthPage onAuth={() => setIsAuthenticated(true)} />
        <Toaster />
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-icebreaker-bg text-icebreaker-text">
        <Switch>
          <Route path="/" component={HomePage} />
          <Route path="/onboarding" component={OnboardingPage} />
          <Route path="/discover" component={DiscoverPage} />
          <Route path="/venues" component={VenuesPage} />
          <Route path="/venues/:id" component={VenueDetailPage} />
          <Route path="/rooms" component={RoomsPage} />
          <Route path="/matches" component={MatchesPage} />
          <Route path="/chat/:id" component={ChatPage} />
          <Route path="/events" component={EventsPage} />
          <Route path="/profile" component={ProfilePage} />
          <Route path="/quests" component={QuestsPage} />
          <Route path="/leaderboard" component={LeaderboardPage} />
          <Route component={NotFoundPage} />
        </Switch>
        <BottomNav />
      </div>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
