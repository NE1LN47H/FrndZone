import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { Send } from "lucide-react";
import { toast } from "sonner";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  parent_comment_id: string | null;
  profile?: any;
  replies?: Comment[];
}

interface CommentsSectionProps {
  postId: string;
  onCommentAdded: () => void;
}

export const CommentsSection = ({ postId, onCommentAdded }: CommentsSectionProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadComments();
  }, [postId]);

  const loadComments = async () => {
    const { data, error } = await supabase
      .from("comments")
      .select(`
        *,
        profile:profiles(username, avatar_url)
      `)
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading comments:", error);
      return;
    }

    // Organize comments into threaded structure
    const topLevel = data.filter((c) => !c.parent_comment_id);
    const threaded = topLevel.map((comment) => ({
      ...comment,
      replies: data.filter((c) => c.parent_comment_id === comment.id),
    }));

    setComments(threaded);
  };

  const handleSubmit = async () => {
    if (!newComment.trim()) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("comments").insert({
        post_id: postId,
        user_id: user.id,
        content: newComment.trim(),
        parent_comment_id: replyTo,
      });

      if (error) throw error;

      setNewComment("");
      setReplyTo(null);
      loadComments();
      onCommentAdded();
    } catch (error: any) {
      toast.error(error.message || "Failed to post comment");
    } finally {
      setLoading(false);
    }
  };

  const renderComment = (comment: Comment, isReply = false) => (
    <div
      key={comment.id}
      className={`${isReply ? "ml-8 mt-2" : "mt-3"} animate-fade-in`}
    >
      <div className="flex gap-2">
        <Avatar className="h-8 w-8">
          <AvatarImage src={comment.profile?.avatar_url} />
          <AvatarFallback>
            {comment.profile?.username?.[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 bg-secondary rounded-lg p-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-foreground">
              {comment.profile?.username}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
            </span>
          </div>
          <p className="text-sm text-foreground">{comment.content}</p>
          {!isReply && (
            <button
              onClick={() => setReplyTo(comment.id)}
              className="text-xs text-muted-foreground hover:text-foreground mt-1"
            >
              Reply
            </button>
          )}
        </div>
      </div>
      {comment.replies?.map((reply) => renderComment(reply, true))}
    </div>
  );

  return (
    <div className="border-t border-border pt-3">
      <div className="flex gap-2 mb-3">
        <Input
          placeholder={replyTo ? "Write a reply..." : "Add a comment..."}
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSubmit()}
          maxLength={300}
        />
        <Button
          onClick={handleSubmit}
          disabled={loading || !newComment.trim()}
          size="icon"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {replyTo && (
        <div className="mb-2 text-xs text-muted-foreground">
          Replying to comment{" "}
          <button
            onClick={() => setReplyTo(null)}
            className="text-primary hover:underline"
          >
            Cancel
          </button>
        </div>
      )}

      <div className="space-y-1">
        {comments.map((comment) => renderComment(comment))}
      </div>
    </div>
  );
};
