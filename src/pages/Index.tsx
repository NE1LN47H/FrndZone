// Update this page (the content is just a fallback if you fail to update the page)

import { useEffect } from "react";

const Index = () => {
  useEffect(() => {
    const stored = (localStorage.getItem("theme") as "light" | "dark" | "system" | null) || "system";
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldDark = stored === "dark" || (stored === "system" && prefersDark);
    document.documentElement.classList.toggle("dark", shouldDark);
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">Welcome to Your Blank App</h1>
        <p className="text-xl text-muted-foreground">Start building your amazing project here!</p>
      </div>
    </div>
  );
};

export default Index;
