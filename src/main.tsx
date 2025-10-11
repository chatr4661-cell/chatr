import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Force complete cache clear - 2025-10-11T06:13:00Z
// Deleted useErrorReporting hook to resolve persistent cache issue

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(<App />);

// PWA setup - delayed to ensure React is fully initialized
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    import("./utils/pwaUtils").then(({ registerServiceWorker, setupInstallPrompt }) => {
      registerServiceWorker();
      setupInstallPrompt();
    });
  });
}
