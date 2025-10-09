import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";
import "./index.css";

// Force rebuild - React config updated 2025-01-09

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

const root = createRoot(rootElement);
root.render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
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
