// CRITICAL: Import hybrid optimizations FIRST for instant skeleton
import './utils/hybridAppOptimizations';
import { warmIceCredentials } from './utils/iceTransportStrategy';
warmIceCredentials();

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

// Clear the instant skeleton and mount React
createRoot(rootElement).render(<App />);

// Stage 1.3: register durable event-store adapter + realtime broadcast (non-blocking)
import('./core/services/ServiceAdapters')
  .then(({ initServiceAdapters }) => initServiceAdapters())
  .catch((err) => console.error('[main] ServiceAdapters init failed:', err));
