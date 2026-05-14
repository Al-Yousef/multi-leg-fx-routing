import { lazy, Suspense, useState, type ReactElement } from "react";
import type { RoutingNetwork3DProps } from "./RoutingNetwork3DScene";

const RoutingNetwork3DScene = lazy(() => import("./RoutingNetwork3DScene"));

/**
 * SDM-inspired 3D routing network. The heavy three.js scene is loaded on
 * demand so the initial bundle stays small. A static SVG renders during load
 * and for users with prefers-reduced-motion.
 */
export function RoutingNetwork3D(props: RoutingNetwork3DProps): ReactElement {
  const [enabled] = useState(() => {
    if (typeof window === "undefined") return false;
    return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  if (!enabled) {
    return (
      <div className="network-3d network-3d--static" aria-hidden="true">
        <NetworkFallback />
      </div>
    );
  }

  return (
    <div className="network-3d" aria-hidden="true">
      <Suspense
        fallback={
          <div className="network-3d__loading">
            <NetworkFallback />
          </div>
        }
      >
        <RoutingNetwork3DScene {...props} />
      </Suspense>
    </div>
  );
}

function NetworkFallback() {
  return (
    <svg viewBox="0 0 320 320" className="network-3d__fallback">
      <defs>
        <radialGradient id="ring" cx="50%" cy="50%" r="50%">
          <stop offset="80%" stopColor="rgba(255,204,54,0)" />
          <stop offset="100%" stopColor="rgba(255,204,54,0.18)" />
        </radialGradient>
      </defs>
      <circle cx="160" cy="160" r="140" fill="none" stroke="rgba(255,255,255,0.06)" />
      <circle cx="160" cy="160" r="100" fill="none" stroke="rgba(255,255,255,0.05)" />
      <circle cx="160" cy="160" r="60" fill="none" stroke="rgba(255,204,54,0.4)" />
      <circle cx="160" cy="160" r="160" fill="url(#ring)" />
    </svg>
  );
}
