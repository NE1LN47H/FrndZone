import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, MapPin, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const UserProfile = () => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isFriend, setIsFriend] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState<null | "sent" | "received">(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { userId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      setCurrentUserId(authData.user?.id || null);

      if (!userId) {
        navigate("/");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;
      setProfile(data);

      if (authData.user?.id && userId) {
        // Correct friendship check: (current->viewed) OR (viewed->current)
        const { data: friendData, error: friendError } = await supabase
          .from("friends")
          .select("id")
          .or(
            `and(user_id.eq.${authData.user.id},friend_id.eq.${userId}),and(user_id.eq.${userId},friend_id.eq.${authData.user.id})`
          )
          .limit(1);
        if (friendError) {
          console.error("Friend check error:", friendError);
        }
        setIsFriend(!!(friendData && friendData.length > 0));

        // Check pending friend requests in either direction
        const { data: pending } = await supabase
          .from("friend_requests")
          .select("sender_id, receiver_id, status")
          .or(
            `and(sender_id.eq.${authData.user.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${authData.user.id})`
          )
          .eq("status", "pending");

        if (pending && pending.length > 0) {
          const req = pending[0];
          setHasPendingRequest(req.sender_id === authData.user.id ? "sent" : "received");
        } else {
          setHasPendingRequest(null);
        }
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      toast.error("Failed to load profile");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const sendFriendRequest = async () => {
    if (!currentUserId || !userId) return;
    if (currentUserId === userId) return;

    setSending(true);
    try {
      const { error } = await supabase.from("friend_requests").insert({
        sender_id: currentUserId,
        receiver_id: userId,
      });
      if (error) throw error;
      toast.success("Friend request sent");
      setHasPendingRequest("sent");
    } catch (error: any) {
      toast.error(error.message || "Failed to send request");
    } finally {
      setSending(false);
    }
  };

  const acceptFriendRequest = async () => {
    if (!currentUserId || !userId) return;
    if (currentUserId === userId) return;

    setSending(true);
    try {
      // Find the friend request
      const { data: request, error: findError } = await supabase
        .from("friend_requests")
        .select("id, sender_id")
        .eq("sender_id", userId)
        .eq("receiver_id", currentUserId)
        .eq("status", "pending")
        .single();

      if (findError || !request) {
        throw new Error("Friend request not found");
      }

      // Check if friendship already exists
      const { data: existingFriend } = await supabase
        .from("friends")
        .select("id")
        .or(
          `and(user_id.eq.${currentUserId},friend_id.eq.${userId}),and(user_id.eq.${userId},friend_id.eq.${currentUserId})`
        )
        .limit(1);

      // Create friendship (bidirectional) if it doesn't exist
      if (!existingFriend || existingFriend.length === 0) {
        const { error: friendError } = await supabase.from("friends").insert([
          { user_id: currentUserId, friend_id: userId },
          { user_id: userId, friend_id: currentUserId },
        ]);

        if (friendError) throw friendError;
      }

      // Update request status to accepted
      const { error: updateError } = await supabase
        .from("friend_requests")
        .update({ status: "accepted" })
        .eq("id", request.id);

      if (updateError) throw updateError;

      toast.success("Friend request accepted!");
      setIsFriend(true);
      setHasPendingRequest(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to accept request");
    } finally {
      setSending(false);
    }
  };

  const rejectFriendRequest = async () => {
    if (!currentUserId || !userId) return;
    if (currentUserId === userId) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from("friend_requests")
        .update({ status: "rejected" })
        .eq("sender_id", userId)
        .eq("receiver_id", currentUserId)
        .eq("status", "pending");

      if (error) throw error;
      toast.success("Friend request declined");
      setHasPendingRequest(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to decline request");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  const isOwnProfile = currentUserId === userId;

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-2xl mx-auto p-4">
        <div className="flex items-center gap-4 mb-6">
          <Button
            onClick={() => navigate(-1)}
            variant="ghost"
            size="icon"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Profile</h1>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <Card className="p-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profile?.avatar_url} />
                <AvatarFallback className="text-3xl">
                  {profile?.username?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div>
                <h2 className="text-2xl font-bold text-foreground">
                  @{profile?.username}
                </h2>
                {profile?.full_name && (
                  <p className="text-lg text-muted-foreground mt-1">
                    {profile.full_name}
                  </p>
                )}
              </div>

              {profile?.location && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>Location shared</span>
                </div>
              )}

              {/* Friend request button */}
              {!isOwnProfile && (
                <div className="pt-2">
                  {isFriend ? (
                    <Button disabled variant="secondary" className="min-w-[180px]">
                      Friends
                    </Button>
                  ) : hasPendingRequest === "sent" ? (
                    <Button disabled variant="secondary" className="min-w-[180px]">
                      Request Sent
                    </Button>
                  ) : hasPendingRequest === "received" ? (
                    <div className="flex gap-2">
                      <Button
                        onClick={acceptFriendRequest}
                        disabled={sending}
                        className="min-w-[180px]"
                      >
                        Accept
                      </Button>
                      <Button
                        onClick={rejectFriendRequest}
                        disabled={sending}
                        variant="outline"
                        size="sm"
                      >
                        Decline
                      </Button>
                    </div>
                  ) : (
                    <Button onClick={sendFriendRequest} disabled={sending} className="min-w-[180px]">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Friend
                    </Button>
                  )}
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      </div>

      <BottomNav />
    </div>
  );
};

export default UserProfile;
