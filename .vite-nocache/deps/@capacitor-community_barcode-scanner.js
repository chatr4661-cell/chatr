import {
  CameraDirection,
  SupportedFormat
} from "./chunk-NGV7EVWM.js";
import {
  registerPlugin
} from "./chunk-S7OKNGPJ.js";
import "./chunk-V4OQ3NZ2.js";

// node_modules/@capacitor-community/barcode-scanner/dist/esm/index.js
var BarcodeScanner = registerPlugin("BarcodeScanner", {
  web: () => import("./web-H3G27O67.js").then((m) => new m.BarcodeScannerWeb())
});
export {
  BarcodeScanner,
  CameraDirection,
  SupportedFormat
};
//# sourceMappingURL=@capacitor-community_barcode-scanner.js.map
