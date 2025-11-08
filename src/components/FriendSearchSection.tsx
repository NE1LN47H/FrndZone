import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();
  const [searchUsername, setSearchUsername] = useState("");
  const [searchDistance, setSearchDistance] = useState([10]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [usernameSuggestions, setUsernameSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<Set<string>>(new Set());
  const [friends, setFriends] = useState<Set<string>>(new Set());
  const [friendsList, setFriendsList] = useState<any[]>([]);
  const [showFriendsList, setShowFriendsList] = useState(true);

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

  // Check friend requests and friendships for search results
  const checkFriendStatus = useCallback(async (userIds: string[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || userIds.length === 0) return;

      // Check pending friend requests (sent by current user)
      const { data: requests } = await supabase
        .from("friend_requests")
        .select("receiver_id")
        .eq("sender_id", user.id)
        .eq("status", "pending")
        .in("receiver_id", userIds);

      const pendingSet = new Set<string>();
      if (requests) {
        requests.forEach((req) => pendingSet.add(req.receiver_id));
      }
      setPendingRequests(pendingSet);

      // Check existing friendships
      if (userIds.length > 0) {
        const friendConditions = userIds.map((id) => 
          `and(user_id.eq.${user.id},friend_id.eq.${id}),and(user_id.eq.${id},friend_id.eq.${user.id})`
        ).join(",");
        
        const { data: friendData } = await supabase
          .from("friends")
          .select("user_id, friend_id")
          .or(friendConditions);

        const friendsSet = new Set<string>();
        if (friendData) {
          friendData.forEach((f) => {
            if (f.user_id === user.id) {
              friendsSet.add(f.friend_id);
            } else {
              friendsSet.add(f.user_id);
            }
          });
        }
        setFriends(friendsSet);
      }
    } catch (error) {
      console.error("Error checking friend status:", error);
    }
  }, []);

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
      const results = (data as any[]) || [];
      setSearchResults(results);
      
      // Check friend status for all results
      if (results.length > 0) {
        const userIds = results.map((u) => u.id);
        await checkFriendStatus(userIds);
      }
    } catch (error: any) {
      console.error("Error searching users:", error);
      toast.error(error.message || "Failed to search users");
    }
  }, [userLocation, searchDistance, searchUsername, checkFriendStatus]);

  // Auto-search when distance changes
  useEffect(() => {
    if (userLocation) {
      searchNearbyUsers();
    }
  }, [searchDistance, userLocation, searchNearbyUsers]);

  // Periodically refresh friend status to detect when requests are accepted
  useEffect(() => {
    if (searchResults.length === 0) return;

    const interval = setInterval(() => {
      const userIds = searchResults.map((u) => u.id);
      if (userIds.length > 0) {
        checkFriendStatus(userIds);
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [searchResults, checkFriendStatus]);

  // Load friends list
  const loadFriendsList = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get all friends (bidirectional)
      const { data: friendData, error } = await supabase
        .from("friends")
        .select("user_id, friend_id")
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

      if (error) throw error;

      if (!friendData || friendData.length === 0) {
        setFriendsList([]);
        return;
      }

      // Get friend IDs
      const friendIds = friendData.map((f) => 
        f.user_id === user.id ? f.friend_id : f.user_id
      );

      // Get friend profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, full_name")
        .in("id", friendIds);

      if (profilesError) throw profilesError;
      setFriendsList(profiles || []);
    } catch (error) {
      console.error("Error loading friends list:", error);
    }
  }, []);

  // Load friends list on mount and periodically refresh
  useEffect(() => {
    loadFriendsList();
    
    // Refresh friends list every 5 seconds to detect new friendships
    const interval = setInterval(() => {
      loadFriendsList();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [loadFriendsList]);

  const sendFriendRequest = async (friendId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("friend_requests").insert({
        sender_id: user.id,
        receiver_id: friendId,
      });

      if (error) throw error;
      
      // Update pending requests state
      setPendingRequests((prev) => new Set(prev).add(friendId));
      toast.success("Friend request sent!");
      
      // Refresh friends list in case request was accepted elsewhere
      setTimeout(() => {
        loadFriendsList();
      }, 1000);
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
    <div className="mt-4 space-y-4">
      {/* Friends List Section */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-foreground">
            My Friends ({friendsList.length})
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFriendsList(!showFriendsList)}
          >
            {showFriendsList ? "Hide" : "Show"}
          </Button>
        </div>
        
        {showFriendsList && (
          <div className="space-y-2">
            {friendsList.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No friends yet. Search for friends nearby!
              </p>
            ) : (
              <AnimatePresence>
                {friendsList.map((friend) => (
                  <motion.div
                    key={friend.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex items-center gap-3 p-3 bg-secondary rounded-lg cursor-pointer hover:bg-secondary/80 transition-colors"
                    onClick={() => navigate(`/profile/${friend.id}`)}
                  >
                    <Avatar>
                      <AvatarImage src={friend.avatar_url} />
                      <AvatarFallback>
                        {friend.username?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">
                        @{friend.username}
                      </p>
                      {friend.full_name && (
                        <p className="text-sm text-muted-foreground">
                          {friend.full_name}
                        </p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        )}
      </Card>

      {/* Find Friends Section */}
      <Card className="p-4">
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
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSuggestionClick(user.username);
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    navigate(`/profile/${user.id}`);
                  }}
                  className="w-full flex items-center gap-3 p-3 hover:bg-secondary transition-colors"
                  title="Double-click to view profile"
                >
                  <Avatar 
                    className="h-8 w-8 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/profile/${user.id}`);
                    }}
                  >
                    <AvatarImage src={user.avatar_url} />
                    <AvatarFallback>
                      {user.username?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left flex-1">
                    <p 
                      className="font-semibold text-foreground text-sm cursor-pointer hover:text-primary transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/profile/${user.id}`);
                      }}
                    >
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
              <div 
                className="flex items-center gap-3 flex-1 cursor-pointer"
                onClick={() => navigate(`/profile/${user.id}`)}
              >
                <Avatar className="cursor-pointer">
                  <AvatarImage src={user.avatar_url} />
                  <AvatarFallback>
                    {user.username?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p 
                    className="font-semibold text-foreground hover:text-primary transition-colors cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/profile/${user.id}`);
                    }}
                  >
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
              {friends.has(user.id) ? (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled
                >
                  Friends
                </Button>
              ) : pendingRequests.has(user.id) ? (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled
                >
                  Requested
                </Button>
              ) : (
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    sendFriendRequest(user.id);
                  }}
                  size="sm"
                  variant="outline"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      </Card>
    </div>
  );
};