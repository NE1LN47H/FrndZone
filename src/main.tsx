import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Suppress deprecation warnings from dev tools (React DevTools, Vite inspector)
if (import.meta.env.DEV) {
  const originalWarn = console.warn;
  console.warn = (...args: any[]) => {
    const message = args[0]?.toString() || "";
    // Filter out unload event listener deprecation warnings from dev tools
    if (
      message.includes("Unload event listeners are deprecated") ||
      message.includes("Deprecated feature used")
    ) {
      return;
    }
    originalWarn.apply(console, args);
  };
}

createRoot(document.getElementById("root")!).render(<App />);
