import { Route, Switch } from "wouter";
  import { QueryClientProvider } from "@tanstack/react-query";
  import { queryClient } from "./lib/queryClient";
  import { Toaster } from "@/components/ui/toaster";
  import { useEffect, useState } from "react";

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
          <div className="text-icebreaker-text">Loading...</div>
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
        </div>
        <Toaster />
      </QueryClientProvider>
    );
  }

  export default App;
  