"use client";

import { Canvas } from "@react-three/fiber";
import { View } from "@react-three/drei";

/**
 * Single full-screen R3F Canvas for the whole landing page. Every 3D
 * component on the landing (main arena window, builder-desk visual) renders
 * its scene into a drei <View> that portals to this <View.Port />, so the
 * entire landing uses exactly ONE WebGL context.
 *
 * Without this, each 3D component spawns its own Canvas. Two WebGL contexts
 * on one page is flaky by design — browsers will kill a context under
 * GPU/memory pressure (especially bad under dev HMR) and the loser goes
 * permanently blank.
 *
 * Positioned fixed + transparent + pointerEvents:none so it acts as a
 * decal layer: views render at their tracked DOM element's bounds, and
 * the rest of the viewport is transparent pass-through for DOM clicks.
 */
export default function LandingR3FHost() {
  // `position: sticky` wrapper instead of `position: fixed` Canvas. Sticky
  // elements are compositor-driven (same thread as the browser's scroll),
  // so Canvas pixels stay in lock-step with the DOM. Fixed Canvas renders
  // on main-thread rAF and lags the compositor-scrolled DOM by 1–3 frames,
  // which shows up as visible jitter at the View bounds.
  //
  // Must be rendered as the FIRST child of its scroll container so the
  // sticky wrapper starts at viewport top. `marginBottom: -100vh` pulls
  // the next siblings up by one viewport height so the wrapper doesn't
  // push the rest of the page down.
  return (
    <div
      aria-hidden
      style={{
        position: "sticky",
        top: 0,
        left: 0,
        width: "100%",
        height: "100vh",
        marginBottom: "-100vh",
        pointerEvents: "none",
        zIndex: 1,
      }}
    >
      <Canvas
        style={{ width: "100%", height: "100%" }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        dpr={[2.5, 3]}
      >
        <View.Port />
      </Canvas>
    </div>
  );
}
