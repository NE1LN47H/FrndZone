import { motion } from "framer-motion";
import { Users, MapPin } from "lucide-react";

type FeedType = "nearby" | "friends";

interface FeedToggleProps {
  feedType: FeedType;
  onChange: (type: FeedType) => void;
}

export const FeedToggle = ({ feedType, onChange }: FeedToggleProps) => {
  return (
    <div className="flex gap-2 bg-secondary p-1 rounded-lg w-full max-w-sm mx-auto">
      <button
        onClick={() => onChange("nearby")}
        className="flex-1 relative py-2 px-4 rounded-md text-sm font-medium transition-colors"
      >
        {feedType === "nearby" && (
          <motion.div
            layoutId="active-feed"
            className="absolute inset-0 bg-primary rounded-md"
            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
          />
        )}
        <span
          className={`relative z-10 flex items-center justify-center gap-2 ${
            feedType === "nearby" ? "text-primary-foreground" : "text-muted-foreground"
          }`}
        >
          <MapPin className="h-4 w-4" />
          Nearby
        </span>
      </button>

      <button
        onClick={() => onChange("friends")}
        className="flex-1 relative py-2 px-4 rounded-md text-sm font-medium transition-colors"
      >
        {feedType === "friends" && (
          <motion.div
            layoutId="active-feed"
            className="absolute inset-0 bg-primary rounded-md"
            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
          />
        )}
        <span
          className={`relative z-10 flex items-center justify-center gap-2 ${
            feedType === "friends" ? "text-primary-foreground" : "text-muted-foreground"
          }`}
        >
          <Users className="h-4 w-4" />
          Friends
        </span>
      </button>
    </div>
  );
};
