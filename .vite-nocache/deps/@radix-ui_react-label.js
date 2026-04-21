"use client";
import {
  Primitive
} from "./chunk-FSSL7ANS.js";
import "./chunk-IO3QSIT2.js";
import {
  require_jsx_runtime
} from "./chunk-EE3VTZNT.js";
import "./chunk-3TXNNTJU.js";
import {
  require_react
} from "./chunk-C4EOH56T.js";
import {
  __toESM
} from "./chunk-V4OQ3NZ2.js";

// node_modules/.bun/@radix-ui+react-label@2.1.7+b41f8805ee63d2ff/node_modules/@radix-ui/react-label/dist/index.mjs
var React = __toESM(require_react(), 1);
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
var NAME = "Label";
var Label = React.forwardRef((props, forwardedRef) => {
  return (0, import_jsx_runtime.jsx)(
    Primitive.label,
    {
      ...props,
      ref: forwardedRef,
      onMouseDown: (event) => {
        const target = event.target;
        if (target.closest("button, input, select, textarea")) return;
        props.onMouseDown?.(event);
        if (!event.defaultPrevented && event.detail > 1) event.preventDefault();
      }
    }
  );
});
Label.displayName = NAME;
var Root = Label;
export {
  Label,
  Root
};
//# sourceMappingURL=@radix-ui_react-label.js.map
