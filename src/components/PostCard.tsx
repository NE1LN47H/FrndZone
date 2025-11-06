import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, MapPin, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import { CommentsSection } from "./CommentsSection";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface PostCardProps {
  post: any;
  onUpdate: () => void;
}

export const PostCard = ({ post, onUpdate }: PostCardProps) => {
  const [profile, setProfile] = useState<any>(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadProfile();
    checkLikeStatus();
    loadLikeCount();
    loadCommentCount();
    loadCurrentUser();
  }, [post.id]);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
  };

  const loadProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", post.user_id)
      .single();
    setProfile(data);
  };

  const checkLikeStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("post_likes")
      .select("*")
      .eq("post_id", post.id)
      .eq("user_id", user.id)
      .single();

    setLiked(!!data);
  };

  const loadLikeCount = async () => {
    const { count } = await supabase
      .from("post_likes")
      .select("*", { count: "exact", head: true })
      .eq("post_id", post.id);
    setLikeCount(count || 0);
  };

  const loadCommentCount = async () => {
    const { count } = await supabase
      .from("comments")
      .select("*", { count: "exact", head: true })
      .eq("post_id", post.id);
    setCommentCount(count || 0);
  };

  const handleLike = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (liked) {
      await supabase
        .from("post_likes")
        .delete()
        .eq("post_id", post.id)
        .eq("user_id", user.id);
      setLiked(false);
      setLikeCount((prev) => prev - 1);
    } else {
      await supabase
        .from("post_likes")
        .insert({ post_id: post.id, user_id: user.id });
      setLiked(true);
      setLikeCount((prev) => prev + 1);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      // Delete image from storage if exists
      if (post.image_url) {
        const path = post.image_url.split('/').pop();
        if (path) {
          await supabase.storage.from('post-images').remove([`${post.user_id}/${path}`]);
        }
      }

      // Delete post
      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", post.id);

      if (error) throw error;

      toast.success("Post deleted successfully");
      onUpdate();
    } catch (error) {
      console.error("Error deleting post:", error);
      toast.error("Failed to delete post");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!profile) return null;

  const hasDistance = typeof post.distance_km === "number" && !Number.isNaN(post.distance_km);

  return (
    <Card className="p-4 bg-card border-border">
      <div className="flex items-start gap-3 mb-3">
        <Avatar>
          <AvatarImage src={profile.avatar_url} />
          <AvatarFallback>{profile.username?.[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-foreground">{profile.username}</p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {hasDistance ? `${post.distance_km.toFixed(1)}km away` : `${post.radius_km}km radius`}
              </div>
              {currentUser?.id === post.user_id && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      disabled={isDeleting}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete post?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your post.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        </div>
      </div>

      {post.image_url && (
        <img
          src={post.image_url}
          alt="Post"
          className="w-full rounded-lg mb-3 object-cover max-h-96"
        />
      )}

      <p className="text-foreground mb-3">{post.content}</p>

      <div className="flex items-center gap-4 mb-3">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleLike}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Heart
            className={`h-5 w-5 ${liked ? "fill-red-500 text-red-500" : ""}`}
          />
          <span className="text-sm">{likeCount}</span>
        </motion.button>

        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <MessageCircle className="h-5 w-5" />
          <span className="text-sm">{commentCount}</span>
        </button>
      </div>

      {showComments && (
        <CommentsSection postId={post.id} onCommentAdded={loadCommentCount} />
      )}
    </Card>
  );
};
