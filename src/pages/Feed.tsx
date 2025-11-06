import { useState, useEffect } from "react";
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

type FeedType = "nearby" | "friends";

const Feed = () => {
  const [user, setUser] = useState<User | null>(null);
  const [feedType, setFeedType] = useState<FeedType>("nearby");
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [maxDistance, setMaxDistance] = useState([10]);
  const navigate = useNavigate();

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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth");
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(location);
          
          // Update user's location in profile
          if (user) {
            try {
              await supabase
                .from("profiles")
                .update({
                  location: `POINT(${location.lng} ${location.lat})`,
                })
                .eq("id", user.id);
            } catch (error) {
              console.error("Error updating location:", error);
            }
          }
        },
        (error) => {
          toast.error("Please enable location to see nearby posts");
          console.error("Location error:", error);
        }
      );
    }
  }, [user]);

  // Clear posts immediately on filter changes to avoid stale items
  useEffect(() => {
    if (user && userLocation) {
      setPosts([]);
      loadPosts();
    }
  }, [user, feedType, userLocation, maxDistance]);

  const loadPosts = async () => {
    setLoading(true);
    try {
      if (feedType === "nearby" && userLocation) {
        const selectedKm = Math.round(maxDistance[0]);
        const { data, error } = await supabase.rpc("get_nearby_posts", {
          user_lat: userLocation.lat,
          user_lng: userLocation.lng,
          max_distance_km: selectedKm,
        });

        if (error) throw error;
        const raw = (data as any[]) || [];
        // Strict client-side filter: only show posts within or equal to selected distance
        // This is a safety net in case SQL returns any posts beyond the limit
        const filtered = raw.filter((p) => {
          if (typeof p.distance_km !== "number" || Number.isNaN(p.distance_km)) {
            console.warn("Post missing distance_km:", p.id);
            return false;
          }
          const dist = Number(p.distance_km);
          const shouldInclude = dist <= selectedKm;
          if (!shouldInclude) {
            console.warn(`Filtering out post ${p.id}: distance_km=${dist.toFixed(2)}km > selectedKm=${selectedKm}km`);
          }
          return shouldInclude;
        });
        console.log(`✅ Showing ${filtered.length} posts within ${selectedKm}km (filtered from ${raw.length} total)`);
        setPosts(filtered);
      } else if (feedType === "friends" && user) {
        const { data, error } = await supabase.rpc("get_friend_posts", {
          requesting_user_id: user.id,
        });

        if (error) throw error;
        setPosts(data || []);
      }
    } catch (error) {
      console.error("Error loading posts:", error);
      toast.error("Failed to load posts");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (!user) return null;

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
          <CreatePost onPostCreated={loadPosts} userLocation={userLocation} />
        </div>
      )}

      {/* Posts Feed */}
      <div className="max-w-2xl mx-auto px-4 space-y-4">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground mt-4">Loading posts...</p>
          </div>
        ) : posts.length === 0 ? (
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
          posts.map((post, index) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <PostCard post={post} onUpdate={loadPosts} />
            </motion.div>
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Feed;
