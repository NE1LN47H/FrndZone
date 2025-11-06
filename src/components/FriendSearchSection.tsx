import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface FriendSearchSectionProps {
  userLocation: { lat: number; lng: number } | null;
}

export const FriendSearchSection = ({ userLocation }: FriendSearchSectionProps) => {
  const [searchUsername, setSearchUsername] = useState("");
  const [searchDistance, setSearchDistance] = useState([10]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [usernameSuggestions, setUsernameSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Initialize distance from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("friendSearchKm");
    if (saved) {
      const num = Number(saved);
      if (!Number.isNaN(num) && num >= 1 && num <= 60) {
        setSearchDistance([num]);
      }
    }
  }, []);

  // Persist distance to localStorage on change
  useEffect(() => {
    if (Array.isArray(searchDistance) && typeof searchDistance[0] === "number") {
      localStorage.setItem("friendSearchKm", String(searchDistance[0]));
    }
  }, [searchDistance]);

  // Real-time username search suggestions
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchUsername.length < 2) {
        setUsernameSuggestions([]);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, username, avatar_url, full_name")
          .ilike("username", `%${searchUsername}%`)
          .limit(5);

        if (error) throw error;
        setUsernameSuggestions(data || []);
      } catch (error) {
        console.error("Error fetching suggestions:", error);
      }
    };

    const timeoutId = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timeoutId);
  }, [searchUsername]);

  // Real-time distance-based search
  const searchNearbyUsers = useCallback(async () => {
    if (!userLocation) {
      toast.error("Enable location to search nearby users");
      return;
    }

    try {
      const { data, error } = await supabase.rpc("get_nearby_profiles", {
        user_lat: userLocation.lat,
        user_lng: userLocation.lng,
        max_distance_km: searchDistance[0],
        search_term: searchUsername.trim() || null,
      });

      if (error) throw error;
      setSearchResults((data as any[]) || []);
    } catch (error: any) {
      console.error("Error searching users:", error);
      toast.error(error.message || "Failed to search users");
    }
  }, [userLocation, searchDistance, searchUsername]);

  // Auto-search when distance changes
  useEffect(() => {
    if (userLocation) {
      searchNearbyUsers();
    }
  }, [searchDistance, userLocation, searchNearbyUsers]);

  const sendFriendRequest = async (friendId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("friend_requests").insert({
        sender_id: user.id,
        receiver_id: friendId,
      });

      if (error) throw error;
      toast.success("Friend request sent!");
    } catch (error: any) {
      toast.error(error.message || "Failed to send request");
    }
  };

  const handleSuggestionClick = (username: string) => {
    setSearchUsername(username);
    setShowSuggestions(false);
    searchNearbyUsers();
  };

  return (
    <Card className="mt-4 p-4">
      <h3 className="text-lg font-bold text-foreground mb-4">
        Find Friends Nearby
      </h3>
      
      <div className="mb-4">
        <label className="text-sm font-medium text-foreground mb-2 block">
          Search within: {searchDistance[0]}km
        </label>
        <Slider
          value={searchDistance}
          onValueChange={setSearchDistance}
          min={1}
          max={60}
          step={1}
          className="w-full"
        />
      </div>

      <div className="relative mb-4">
        <Input
          placeholder="Search username..."
          value={searchUsername}
          onChange={(e) => {
            setSearchUsername(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        />
        
        <AnimatePresence>
          {showSuggestions && usernameSuggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden"
            >
              {usernameSuggestions.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleSuggestionClick(user.username)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-secondary transition-colors"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatar_url} />
                    <AvatarFallback>
                      {user.username?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left">
                    <p className="font-semibold text-foreground text-sm">
                      @{user.username}
                    </p>
                    {user.full_name && (
                      <p className="text-xs text-muted-foreground">
                        {user.full_name}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="space-y-2">
        <AnimatePresence>
          {searchResults.map((user) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex items-center justify-between p-3 bg-secondary rounded-lg"
            >
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={user.avatar_url} />
                  <AvatarFallback>
                    {user.username?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-foreground">
                    @{user.username}
                  </p>
                  {user.full_name && (
                    <p className="text-sm text-muted-foreground">
                      {user.full_name}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {user.distance_km.toFixed(1)}km away
                  </p>
                </div>
              </div>
              <Button
                onClick={() => sendFriendRequest(user.id)}
                size="sm"
                variant="outline"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Card>
  );
};