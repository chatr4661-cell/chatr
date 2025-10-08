import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// PWA setup moved to after React initialization
setTimeout(() => {
  import("./utils/pwaUtils").then(({ registerServiceWorker, setupInstallPrompt }) => {
    registerServiceWorker();
    setupInstallPrompt();
  });
}, 100);
