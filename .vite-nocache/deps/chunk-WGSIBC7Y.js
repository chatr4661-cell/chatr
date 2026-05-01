import {
  useLayoutEffect2
} from "./chunk-WQO7IIEA.js";
import {
  require_react
} from "./chunk-C4EOH56T.js";
import {
  __toESM
} from "./chunk-V4OQ3NZ2.js";

// node_modules/.bun/@radix-ui+react-use-size@1.1.1+0e2fb8dbc083adda/node_modules/@radix-ui/react-use-size/dist/index.mjs
var React = __toESM(require_react(), 1);
function useSize(element) {
  const [size, setSize] = React.useState(void 0);
  useLayoutEffect2(() => {
    if (element) {
      setSize({ width: element.offsetWidth, height: element.offsetHeight });
      const resizeObserver = new ResizeObserver((entries) => {
        if (!Array.isArray(entries)) {
          return;
        }
        if (!entries.length) {
          return;
        }
        const entry = entries[0];
        let width;
        let height;
        if ("borderBoxSize" in entry) {
          const borderSizeEntry = entry["borderBoxSize"];
          const borderSize = Array.isArray(borderSizeEntry) ? borderSizeEntry[0] : borderSizeEntry;
          width = borderSize["inlineSize"];
          height = borderSize["blockSize"];
        } else {
          width = element.offsetWidth;
          height = element.offsetHeight;
        }
        setSize({ width, height });
      });
      resizeObserver.observe(element, { box: "border-box" });
      return () => resizeObserver.unobserve(element);
    } else {
      setSize(void 0);
    }
  }, [element]);
  return size;
}

export {
  useSize
};
//# sourceMappingURL=chunk-WGSIBC7Y.js.map
