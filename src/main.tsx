import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerServiceWorker, setupInstallPrompt } from "./utils/pwaUtils";

createRoot(document.getElementById("root")!).render(<App />);

// Register service worker for PWA support
registerServiceWorker();

// Setup install prompt handler
setupInstallPrompt();
