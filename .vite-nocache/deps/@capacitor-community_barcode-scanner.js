import {
  CameraDirection,
  SupportedFormat
} from "./chunk-OBGKVE3F.js";
import {
  registerPlugin
} from "./chunk-VYAGUGCM.js";
import "./chunk-V4OQ3NZ2.js";

// node_modules/.bun/@capacitor-community+barcode-scanner@4.0.1+1d43a6a1837411c8/node_modules/@capacitor-community/barcode-scanner/dist/esm/index.js
var BarcodeScanner = registerPlugin("BarcodeScanner", {
  web: () => import("./web-KJFAVGRH.js").then((m) => new m.BarcodeScannerWeb())
});
export {
  BarcodeScanner,
  CameraDirection,
  SupportedFormat
};
//# sourceMappingURL=@capacitor-community_barcode-scanner.js.map
