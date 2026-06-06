import "./polyfills";
import { createRoot } from "react-dom/client";
import { Profiler } from "react";
import App from "./App";
import "./index.css";
import { onReactRender } from "@/utils/renderInstrumentation";
import { nativeMarkWebViewReady } from "./services/calling/nativeRtcService";

(window as any).START_TIME = performance.now();
console.log("🚀 [Main] Starting React mount...");
nativeMarkWebViewReady("");

const rootElement = document.getElementById("root");

if (!rootElement) {
  console.error("❌ [Main] Root element not found!");
  throw new Error("Root element not found");
}

console.log("🚀 [Main] Root element found, rendering App...");
createRoot(rootElement).render(
  <Profiler id="CHATR" onRender={onReactRender}>
    <App />
  </Profiler>
);
console.log("🚀 [Main] Render call completed");
