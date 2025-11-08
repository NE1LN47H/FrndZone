import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";

import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";

interface CreatePostProps {
  onPostCreated: () => void;
  userLocation: { lat: number; lng: number } | null;
}

export const CreatePost = ({ onPostCreated, userLocation }: CreatePostProps) => {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const getFreshLocation = async (): Promise<{ lat: number; lng: number } | null> => {
    try {
      if (Capacitor.isNativePlatform()) {
        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 5_000,
          maximumAge: 0,
        });
        return {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
      }

      if (!("geolocation" in navigator)) return null;

      return await new Promise<{ lat: number; lng: number } | null>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) =>
            resolve({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            }),
          () => resolve(null),
          { enableHighAccuracy: true, timeout: 5_000, maximumAge: 0 }
        );
      });
    } catch (error) {
      console.error("Failed to get fresh location", error);
      return null;
    }
  };

  const handleSubmit = async () => {
    const hasContent = !!content.trim();
    const baseLoc = userLocation;
    if (!hasContent || !baseLoc) {
      toast.error("Please add content and enable location");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Try to get freshest live location; fallback to provided prop
      const fresh = await getFreshLocation();
      const loc = fresh || baseLoc;

      let imageUrl = null;

      // Upload image if present
      if (imageFile) {
        const fileExt = imageFile.name.split(".").pop();
        const fileName = `${user.id}/${Math.random()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("post-images")
          .upload(fileName, imageFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("post-images")
          .getPublicUrl(fileName);

        imageUrl = publicUrl;
      }

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      const { error } = await supabase.from("posts").insert({
        user_id: user.id,
        content: content.trim(),
        image_url: imageUrl,
        location: `POINT(${loc.lng} ${loc.lat})`,
        // radius_km omitted to use DB default and avoid coupling to viewer slider
        expires_at: expiresAt.toISOString(),
      });

      if (error) throw error;

      toast.success("Post shared!");
      setContent("");
      setImageFile(null);
      setImagePreview(null);
      onPostCreated();
    } catch (error: any) {
      toast.error(error.message || "Failed to create post");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="p-4 bg-card border-border">
        <Textarea
          placeholder="What's happening near you?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={500}
          className="mb-3 resize-none"
          rows={3}
        />

        {imagePreview && (
          <div className="relative mb-3">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-full rounded-lg max-h-64 object-cover"
            />
            <button
              onClick={() => {
                setImageFile(null);
                setImagePreview(null);
              }}
              className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70"
            >
              ✕
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="hidden"
            id="image-upload"
          />
          <label htmlFor="image-upload">
            <Button variant="outline" size="icon" type="button" asChild>
              <span className="cursor-pointer">
                <Camera className="h-4 w-4" />
              </span>
            </Button>
          </label>

          <Button
            onClick={handleSubmit}
            disabled={loading || !content.trim()}
            className="flex-1"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sharing...
              </>
            ) : (
              "Share Now"
            )}
          </Button>
        </div>
      </Card>
    </motion.div>
  );
};
