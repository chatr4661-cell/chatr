import {
  useCallbackRef
} from "./chunk-T4SRIF5A.js";
import {
  useLayoutEffect2
} from "./chunk-WQO7IIEA.js";
import {
  Primitive
} from "./chunk-FSSL7ANS.js";
import {
  require_jsx_runtime
} from "./chunk-EE3VTZNT.js";
import {
  require_react_dom
} from "./chunk-3TXNNTJU.js";
import {
  require_react
} from "./chunk-C4EOH56T.js";
import {
  __toESM
} from "./chunk-V4OQ3NZ2.js";

// node_modules/.bun/@radix-ui+react-portal@1.1.9+b41f8805ee63d2ff/node_modules/@radix-ui/react-portal/dist/index.mjs
var React = __toESM(require_react(), 1);
var import_react_dom = __toESM(require_react_dom(), 1);
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
var PORTAL_NAME = "Portal";
var Portal = React.forwardRef((props, forwardedRef) => {
  const { container: containerProp, ...portalProps } = props;
  const [mounted, setMounted] = React.useState(false);
  useLayoutEffect2(() => setMounted(true), []);
  const container = containerProp || mounted && globalThis?.document?.body;
  return container ? import_react_dom.default.createPortal((0, import_jsx_runtime.jsx)(Primitive.div, { ...portalProps, ref: forwardedRef }), container) : null;
});
Portal.displayName = PORTAL_NAME;

// node_modules/.bun/@radix-ui+react-use-escape-keydown@1.1.1+0e2fb8dbc083adda/node_modules/@radix-ui/react-use-escape-keydown/dist/index.mjs
var React2 = __toESM(require_react(), 1);
function useEscapeKeydown(onEscapeKeyDownProp, ownerDocument = globalThis?.document) {
  const onEscapeKeyDown = useCallbackRef(onEscapeKeyDownProp);
  React2.useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onEscapeKeyDown(event);
      }
    };
    ownerDocument.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => ownerDocument.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [onEscapeKeyDown, ownerDocument]);
}

export {
  useEscapeKeydown,
  Portal
};
//# sourceMappingURL=chunk-NFGTZI7X.js.map
