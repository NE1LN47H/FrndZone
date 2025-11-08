import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import { PostCard } from "@/components/PostCard";
import { CreatePost } from "@/components/CreatePost";
import { FeedToggle } from "@/components/FeedToggle";
import { FriendSearchSection } from "@/components/FriendSearchSection";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { MapPin, LogOut, User as UserIcon } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { useDeviceLocation } from "@/hooks/useDeviceLocation";

type FeedType = "nearby" | "friends";

const Feed = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isWaitingForAuth, setIsWaitingForAuth] = useState(false);
  const [feedType, setFeedType] = useState<FeedType>("nearby");
  const [maxDistance, setMaxDistance] = useState([10]);
  const navigate = useNavigate();
  const { location: userLocation, isLoading: locationLoading, error: locationError } = useDeviceLocation({
    highAccuracy: false,
    maximumAgeMs: 60_000,
    timeoutMs: 8_000,
  });
  const lastSyncedLocation = useRef<string | null>(null);

  // Initialize maxDistance from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("maxDistanceKm");
    if (saved) {
      const num = Number(saved);
      if (!Number.isNaN(num) && num >= 1 && num <= 100) {
        setMaxDistance([num]);
      }
    }
  }, []);

  // Persist maxDistance to localStorage whenever it changes
  useEffect(() => {
    if (Array.isArray(maxDistance) && typeof maxDistance[0] === "number") {
      localStorage.setItem("maxDistanceKm", String(maxDistance[0]));
    }
  }, [maxDistance]);

  useEffect(() => {
    let mounted = true;
    let authChecked = false;
    let redirectTimeout: NodeJS.Timeout | null = null;
    let currentUser: User | null = null;

    // First, check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      currentUser = session?.user ?? null;
      setUser(currentUser);
      authChecked = true;
      setIsCheckingAuth(false);
      if (!currentUser) {
        // If no session, wait a bit for onAuthStateChange to fire (user might have just logged in)
        setIsWaitingForAuth(true);
        redirectTimeout = setTimeout(() => {
          if (mounted && !currentUser) {
            setIsWaitingForAuth(false);
            navigate("/auth", { replace: true });
          }
        }, 2000);
      }
    });

    // Listen for auth state changes (this will fire when user logs in)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (redirectTimeout) {
        clearTimeout(redirectTimeout);
        redirectTimeout = null;
      }
      currentUser = session?.user ?? null;
      setUser(currentUser);
      setIsWaitingForAuth(false);
      if (!authChecked) {
        authChecked = true;
        setIsCheckingAuth(false);
      }
      if (!currentUser) {
        navigate("/auth", { replace: true });
        return;
      }
    });

    return () => {
      mounted = false;
      if (redirectTimeout) {
        clearTimeout(redirectTimeout);
      }
      subscription.unsubscribe();
    };
  }, [navigate]);

  useEffect(() => {
    if (!user || !userLocation) return;
    const rounded = `${userLocation.lat.toFixed(5)},${userLocation.lng.toFixed(5)}`;
    if (lastSyncedLocation.current === rounded) return;
    lastSyncedLocation.current = rounded;

    supabase
      .from("profiles")
      .update({ location: `POINT(${userLocation.lng} ${userLocation.lat})` })
      .eq("id", user.id)
      .then(({ error }) => {
        if (error) console.error("Error updating location:", error);
      });
  }, [user, userLocation]);

  useEffect(() => {
    if (locationError) {
      toast.error("Please enable location to see nearby posts");
    }
  }, [locationError]);

  const selectedKm = useMemo(() => Math.round(maxDistance[0]), [maxDistance]);

  const postsQuery = useQuery({
    queryKey: [
      "feed-posts",
      feedType,
      user?.id,
      feedType === "nearby" ? userLocation?.lat : null,
      feedType === "nearby" ? userLocation?.lng : null,
      feedType === "nearby" ? selectedKm : null,
    ],
    queryFn: async () => {
      if (!user) throw new Error("Not authenticated");

      if (feedType === "nearby") {
        if (!userLocation) throw new Error("Location unavailable");
        const { data, error } = await supabase.rpc("get_nearby_posts", {
          user_lat: userLocation.lat,
          user_lng: userLocation.lng,
          max_distance_km: selectedKm,
        });
        if (error) throw error;
        const raw = (data as any[]) || [];
        return raw.filter((p) =>
          typeof p.distance_km === "number" && !Number.isNaN(p.distance_km)
            ? Number(p.distance_km) <= selectedKm
            : false
        );
      }

      const { data, error } = await supabase.rpc("get_friend_posts", {
        requesting_user_id: user.id,
      });
      if (error) throw error;
      return data || [];
    },
    enabled:
      !!user &&
      (feedType === "friends" || (feedType === "nearby" && !!userLocation)),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
  });

  const posts = postsQuery.data ?? [];
  const postsLoading = postsQuery.isInitialLoading;
  const postsRefreshing = postsQuery.isFetching && !postsQuery.isInitialLoading;

  // Handle query errors
  useEffect(() => {
    if (postsQuery.error) {
      const message = postsQuery.error instanceof Error ? postsQuery.error.message : "Failed to load posts";
      toast.error(message);
    }
  }, [postsQuery.error]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  // Show loading while checking auth or waiting for auth state change
  if (isCheckingAuth || isWaitingForAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            {isCheckingAuth ? "Loading..." : "Loading session..."}
          </p>
        </div>
      </div>
    );
  }

  // If no user after checking auth and not waiting, redirect
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">FrndZone</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/map")}
            >
              <MapPin className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/profile")}
            >
              <UserIcon className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Feed Toggle */}
      <div className="max-w-2xl mx-auto px-4 py-4 relative z-10">
      <FeedToggle feedType={feedType} onChange={setFeedType} />
        
        {feedType === "nearby" && (
          <div className="mt-4">
            <label className="text-sm font-medium text-foreground mb-2 block">
              Show posts within: {maxDistance[0]}km
            </label>
            <Slider
              value={maxDistance}
              onValueChange={(val) => setMaxDistance(val)}
              min={1}
              max={100}
              step={1}
              className="w-full"
            />
          </div>
        )}
        
        {feedType === "friends" && (
          <FriendSearchSection userLocation={userLocation} />
        )}
      </div>

      {/* Create Post */}
      {feedType === "nearby" && (
        <div className="max-w-2xl mx-auto px-4 mb-6">
          <CreatePost
            onPostCreated={() => {
              void postsQuery.refetch();
            }}
            userLocation={userLocation}
          />
        </div>
      )}

      {/* Posts Feed */}
      <div className="max-w-2xl mx-auto px-4 space-y-4">
        {feedType === "nearby" && !userLocation && !locationLoading ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <p className="text-muted-foreground">
              Waiting for your location to load. Please enable location services to see nearby posts.
            </p>
          </motion.div>
        ) : postsLoading && (!Array.isArray(posts) || posts.length === 0) ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground mt-4">Loading posts...</p>
          </div>
        ) : Array.isArray(posts) && posts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <p className="text-muted-foreground">
              {feedType === "nearby"
                ? "No posts nearby yet. Be the first!"
                : "No posts from friends yet"}
            </p>
          </motion.div>
        ) : (
          Array.isArray(posts) ? posts.map((post, index) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <PostCard
                post={post}
                onUpdate={() => {
                  void postsQuery.refetch();
                }}
              />
            </motion.div>
          )) : null
        )}
      </div>

      {postsRefreshing && (
        <div className="fixed bottom-24 left-1/2 z-30 -translate-x-1/2 rounded-full bg-background/90 px-4 py-2 text-xs text-muted-foreground shadow-md">
          Refreshing feed...
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default Feed;
