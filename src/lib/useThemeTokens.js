import { useEffect, useState } from "react";

/**
 * Resolved values of theme.css custom properties, kept in step with the
 * appearance.
 *
 * Recharts paints into SVG through props, not classes, so it cannot read the
 * palette the way the rest of the app does — the chart colours were literal
 * hexes and would have stayed light-theme greys on a dark card. This reads them
 * off the live `.divic` element instead, and re-reads when the system flips.
 *
 * Pass a module-level array: a fresh one each render would resubscribe forever.
 */
export function useThemeTokens(names) {
  const read = () => {
    const el = typeof document !== "undefined" && document.querySelector(".divic");
    if (!el) return {};
    const cs = getComputedStyle(el);
    return Object.fromEntries(names.map((n) => [n, cs.getPropertyValue("--" + n).trim()]));
  };

  const [tokens, setTokens] = useState(read);

  useEffect(() => {
    setTokens(read());          // .divic exists by now even if it did not at first render
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setTokens(read());
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [names]);

  return tokens;
}
