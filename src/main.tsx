import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerServiceWorker, setupInstallPrompt } from "./utils/pwaUtils";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(<App />);

// Register service worker for PWA support
registerServiceWorker();

// Setup install prompt handler
setupInstallPrompt();
