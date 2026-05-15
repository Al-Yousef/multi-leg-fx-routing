import { lazy, Suspense, useState, type ReactElement } from "react";
import type { RoutingNetwork3DProps } from "./RoutingNetwork3DScene";

const RoutingNetwork3DScene = lazy(() => import("./RoutingNetwork3DScene"));

export type RoutingNetwork3DComponentProps = RoutingNetwork3DProps & {
  /** Skip WebGL and show the static SVG (user preference or performance). */
  forceStatic?: boolean;
};

/**
 * SDM-inspired 3D routing network. The heavy three.js scene is loaded on
 * demand so the initial bundle stays small. A static SVG renders during load
 * and for users with prefers-reduced-motion.
 */
export function RoutingNetwork3D({
  forceStatic = false,
  ...sceneProps
}: RoutingNetwork3DComponentProps): ReactElement {
  const [enabled] = useState(() => {
    if (typeof window === "undefined") return false;
    return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  if (!enabled || forceStatic) {
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
        <RoutingNetwork3DScene {...sceneProps} />
      </Suspense>
    </div>
  );
}

function NetworkFallback() {
  return (
    <svg viewBox="0 0 320 320" className="network-3d__fallback">
      <defs>
        <radialGradient id="ring" cx="50%" cy="50%" r="50%">
          <stop offset="80%" stopColor="rgba(212,168,83,0)" />
          <stop offset="100%" stopColor="rgba(212,168,83,0.2)" />
        </radialGradient>
      </defs>
      <circle cx="160" cy="160" r="140" fill="none" stroke="rgba(255,255,255,0.06)" />
      <circle cx="160" cy="160" r="100" fill="none" stroke="rgba(255,255,255,0.05)" />
      <circle cx="160" cy="160" r="60" fill="none" stroke="rgba(212,168,83,0.45)" />
      <circle cx="160" cy="160" r="160" fill="url(#ring)" />
    </svg>
  );
}
