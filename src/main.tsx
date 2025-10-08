import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Verify React is loaded
if (!React || typeof React.createElement !== 'function') {
  throw new Error('React failed to load properly');
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
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
