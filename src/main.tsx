// CRITICAL: self-heal stale deploys (missing JS chunks) before anything else
import { installChunkRecovery } from './utils/chunkRecovery';
installChunkRecovery();

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

// Organic acquisition attribution: records only real referrer/UTM signals.
import('./utils/seoAttribution')
  .then(({ captureAcquisition }) => captureAcquisition())
  .catch(() => {/* attribution is best-effort and never user-visible */});
