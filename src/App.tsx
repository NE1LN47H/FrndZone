import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import { toast } from "sonner";
import SplashScreen from "@/components/SplashScreen";
import Auth from "./pages/Auth";
import Feed from "./pages/Feed";
import Map from "./pages/Map";
import Profile from "./pages/Profile";
import UserProfile from "./pages/UserProfile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [splashCompleted, setSplashCompleted] = useState(false);
  
  // Initialize theme on app load
  useEffect(() => {
    const applyTheme = () => {
      const stored = (localStorage.getItem("theme") as "light" | "dark" | "system" | null) || "system";
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const shouldDark = stored === "dark" || (stored === "system" && prefersDark);
      document.documentElement.classList.toggle("dark", shouldDark);
    };

    applyTheme();

    // Listen for system theme changes
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      const stored = localStorage.getItem("theme");
      if (stored === "system" || !stored) {
        applyTheme();
      }
    };
    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, []);

  // Show location toast after splash screen completes
  useEffect(() => {
    if (!splashCompleted) return;

    // Small delay to ensure app is fully loaded after splash screen
    const timer = setTimeout(() => {
      toast.info("Please turn on the location in order to use this app", {
        duration: 5000,
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [splashCompleted]);

  useEffect(() => {
    const ensureLocationPermission = async () => {
      if (!Capacitor.isNativePlatform()) {
        return;
      }

      try {
        const current = await Geolocation.checkPermissions();
        if (current.location === "granted") {
          return;
        }

        const permission = await Geolocation.requestPermissions();
        if (permission.location === "denied") {
          toast.error("Please enable location access to use the map features");
        }
      } catch (error) {
        console.error("Failed to request location permission:", error);
        toast.error("Unable to request location permission");
      }
    };

    ensureLocationPermission();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        {showSplash && (
          <SplashScreen onComplete={() => {
            setShowSplash(false);
            setSplashCompleted(true);
          }} />
        )}
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Feed />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/map" element={<Map />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/:userId" element={<UserProfile />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
