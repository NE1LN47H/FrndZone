import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [showSplash, setShowSplash] = useState(true);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check initial theme
    const checkTheme = () => {
      const stored = localStorage.getItem("theme") || "system";
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const shouldDark = stored === "dark" || (stored === "system" && prefersDark);
      setIsDark(shouldDark);
    };

    checkTheme();

    // Listen for theme changes
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handleThemeChange = () => {
      checkTheme();
    };

    mq.addEventListener("change", handleThemeChange);

    // Also listen for storage changes (when user changes theme in app)
    const handleStorageChange = () => {
      checkTheme();
    };

    window.addEventListener("storage", handleStorageChange);

    // Check theme periodically (for same-tab theme changes)
    const themeInterval = setInterval(checkTheme, 100);

    return () => {
      mq.removeEventListener("change", handleThemeChange);
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(themeInterval);
    };
  }, []);

  useEffect(() => {
    // Hide splash after animation completes (2.5 seconds)
    const timer = setTimeout(() => {
      setShowSplash(false);
      // Call onComplete after fade out animation
      setTimeout(() => {
        onComplete();
      }, 500);
    }, 2500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {showSplash && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-background"
        >
          <div className="text-center">
            {/* Animated FrndZone text - adapts to theme */}
            <motion.h1
              className={`text-6xl md:text-8xl font-bold ${isDark ? "text-white" : "text-foreground"}`}
              initial={{ opacity: 0, scale: 0.5, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{
                duration: 0.8,
                ease: [0.34, 1.56, 0.64, 1], // Custom easing for bounce effect
              }}
            >
              <motion.span
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
              >
                Frnd
              </motion.span>
              <motion.span
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
              >
                Zone
              </motion.span>
            </motion.h1>

            {/* Subtitle with fade in */}
            <motion.p
              className="mt-4 text-lg md:text-xl text-muted-foreground"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.6 }}
            >
              Share What's Happening Near You
            </motion.p>

            {/* Loading dots animation - adapts to theme */}
            <motion.div
              className="flex justify-center gap-2 mt-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2, duration: 0.4 }}
            >
              {[0, 1, 2].map((index) => (
                <motion.div
                  key={index}
                  className={`w-2 h-2 rounded-full ${isDark ? "bg-white" : "bg-foreground"}`}
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    delay: index * 0.2,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </motion.div>
          </div>

          {/* Developer name at the bottom */}
          <motion.div
            className="absolute bottom-8 left-0 right-0 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.4, duration: 0.6 }}
          >
            <p className="text-sm text-muted-foreground">
              Developed by <span className="font-semibold text-foreground">Neilnath</span>
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;

