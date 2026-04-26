import {
  useLayoutEffect2
} from "./chunk-WQO7IIEA.js";
import {
  require_react
} from "./chunk-C4EOH56T.js";
import {
  __toESM
} from "./chunk-V4OQ3NZ2.js";

// node_modules/.bun/@radix-ui+react-id@1.1.1+0e2fb8dbc083adda/node_modules/@radix-ui/react-id/dist/index.mjs
var React = __toESM(require_react(), 1);
var useReactId = React[" useId ".trim().toString()] || (() => void 0);
var count = 0;
function useId(deterministicId) {
  const [id, setId] = React.useState(useReactId());
  useLayoutEffect2(() => {
    if (!deterministicId) setId((reactId) => reactId ?? String(count++));
  }, [deterministicId]);
  return deterministicId || (id ? `radix-${id}` : "");
}

export {
  useId
};
//# sourceMappingURL=chunk-PHZVOGYL.js.map
