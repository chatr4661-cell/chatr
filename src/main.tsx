import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Force Vite rebuild - 2025-10-10T11:00:00Z

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// PWA setup - delayed to ensure React is fully initialized
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    import("./utils/pwaUtils").then(({ registerServiceWorker, setupInstallPrompt }) => {
      registerServiceWorker();
      setupInstallPrompt();
    });
  });
}
