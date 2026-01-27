// CRITICAL: Import hybrid optimizations FIRST for instant skeleton
import './utils/hybridAppOptimizations';

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

// Clear the instant skeleton and mount React
createRoot(rootElement).render(<App />);
