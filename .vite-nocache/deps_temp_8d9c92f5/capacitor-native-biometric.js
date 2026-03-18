import {
  registerPlugin
} from "./chunk-Q25MWJJA.js";
import "./chunk-V4OQ3NZ2.js";

// node_modules/capacitor-native-biometric/dist/esm/definitions.js
var BiometryType;
(function(BiometryType2) {
  BiometryType2[BiometryType2["NONE"] = 0] = "NONE";
  BiometryType2[BiometryType2["TOUCH_ID"] = 1] = "TOUCH_ID";
  BiometryType2[BiometryType2["FACE_ID"] = 2] = "FACE_ID";
  BiometryType2[BiometryType2["FINGERPRINT"] = 3] = "FINGERPRINT";
  BiometryType2[BiometryType2["FACE_AUTHENTICATION"] = 4] = "FACE_AUTHENTICATION";
  BiometryType2[BiometryType2["IRIS_AUTHENTICATION"] = 5] = "IRIS_AUTHENTICATION";
  BiometryType2[BiometryType2["MULTIPLE"] = 6] = "MULTIPLE";
})(BiometryType || (BiometryType = {}));
var BiometricAuthError;
(function(BiometricAuthError2) {
  BiometricAuthError2[BiometricAuthError2["UNKNOWN_ERROR"] = 0] = "UNKNOWN_ERROR";
  BiometricAuthError2[BiometricAuthError2["BIOMETRICS_UNAVAILABLE"] = 1] = "BIOMETRICS_UNAVAILABLE";
  BiometricAuthError2[BiometricAuthError2["USER_LOCKOUT"] = 2] = "USER_LOCKOUT";
  BiometricAuthError2[BiometricAuthError2["BIOMETRICS_NOT_ENROLLED"] = 3] = "BIOMETRICS_NOT_ENROLLED";
  BiometricAuthError2[BiometricAuthError2["USER_TEMPORARY_LOCKOUT"] = 4] = "USER_TEMPORARY_LOCKOUT";
  BiometricAuthError2[BiometricAuthError2["AUTHENTICATION_FAILED"] = 10] = "AUTHENTICATION_FAILED";
  BiometricAuthError2[BiometricAuthError2["APP_CANCEL"] = 11] = "APP_CANCEL";
  BiometricAuthError2[BiometricAuthError2["INVALID_CONTEXT"] = 12] = "INVALID_CONTEXT";
  BiometricAuthError2[BiometricAuthError2["NOT_INTERACTIVE"] = 13] = "NOT_INTERACTIVE";
  BiometricAuthError2[BiometricAuthError2["PASSCODE_NOT_SET"] = 14] = "PASSCODE_NOT_SET";
  BiometricAuthError2[BiometricAuthError2["SYSTEM_CANCEL"] = 15] = "SYSTEM_CANCEL";
  BiometricAuthError2[BiometricAuthError2["USER_CANCEL"] = 16] = "USER_CANCEL";
  BiometricAuthError2[BiometricAuthError2["USER_FALLBACK"] = 17] = "USER_FALLBACK";
})(BiometricAuthError || (BiometricAuthError = {}));

// node_modules/capacitor-native-biometric/dist/esm/index.js
var NativeBiometric = registerPlugin("NativeBiometric", {
  web: () => import("./web-75GB5YXW.js").then((m) => new m.NativeBiometricWeb())
});
export {
  BiometricAuthError,
  BiometryType,
  NativeBiometric
};
//# sourceMappingURL=capacitor-native-biometric.js.map
