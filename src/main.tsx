import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// REMOVED StrictMode to resolve React instance conflict
// Force rebuild timestamp: 2025-10-10T11:25:00Z

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
