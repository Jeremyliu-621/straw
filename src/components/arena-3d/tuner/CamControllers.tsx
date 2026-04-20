"use client";

import { useEffect, useRef, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { toWorld } from "../core/geometry";
import type { RenderAgentState } from "../useArenaGameLoop";

export type CamMode = "off" | "follow";

/**
 * Follow cam — ported from Claw3D's FollowCamController. Swaps the scene
 * camera from orthographic iso to a fresh perspective camera parked in
 * spherical coords around the followed agent.
 *
 * Controls while active:
 *   - Left-drag to orbit (theta / phi)
 *   - Wheel to zoom (radius)
 */
export function FollowCamController({
  mode,
  agentIdx,
  agentRef,
}: {
  mode: CamMode;
  agentIdx: number;
  agentRef: RefObject<RenderAgentState[]>;
}) {
  const { camera, set, size, gl } = useThree();
  const perspectiveCameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const originalCameraRef = useRef<THREE.Camera | null>(null);
  const wasFollowingRef = useRef(false);
  const lastAgentIdxRef = useRef<number>(-1);
  // `thetaOffsetRef` is the user's drag offset from "directly behind the
  // agent." Each frame we compute effective theta = agent.facing + π +
  // offset, so the camera stays behind the agent as they turn, while
  // respecting the user's orbit drag.
  const thetaOffsetRef = useRef(0);
  const phiRef = useRef(Math.PI / 3);
  const radiusRef = useRef(4.5);
  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const desiredPosRef = useRef(new THREE.Vector3());
  const currentPosRef = useRef(new THREE.Vector3());
  const desiredLookRef = useRef(new THREE.Vector3());
  const currentLookRef = useRef(new THREE.Vector3());

  // Stash the original (ortho iso) camera once, so we can restore it on exit.
  useEffect(() => {
    if (!originalCameraRef.current) originalCameraRef.current = camera;
  }, [camera]);

  // Mouse + wheel handlers — only act when follow mode is the active cam.
  useEffect(() => {
    const element = gl.domElement;

    const handleMouseDown = (event: MouseEvent) => {
      if (mode !== "follow" || event.button !== 0) return;
      isDraggingRef.current = true;
      lastMouseRef.current = { x: event.clientX, y: event.clientY };
    };
    const handleMouseMove = (event: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = event.clientX - lastMouseRef.current.x;
      const dy = event.clientY - lastMouseRef.current.y;
      lastMouseRef.current = { x: event.clientX, y: event.clientY };
      thetaOffsetRef.current -= dx * 0.006;
      phiRef.current = Math.max(
        0.05,
        Math.min(Math.PI / 2.2, phiRef.current + dy * 0.006),
      );
    };
    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };
    const handleWheel = (event: WheelEvent) => {
      if (mode !== "follow") return;
      radiusRef.current = Math.max(
        0.8,
        Math.min(25, radiusRef.current + event.deltaY * 0.01),
      );
    };

    element.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    element.addEventListener("wheel", handleWheel, { passive: true });

    return () => {
      element.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      element.removeEventListener("wheel", handleWheel);
    };
  }, [gl, mode]);

  useFrame(() => {
    const isFollowing = mode === "follow";

    // Enter follow mode: create a perspective camera, swap it in, seed the
    // theta offset to 0 so we sit directly behind the agent.
    if (isFollowing && !wasFollowingRef.current) {
      const agent = agentRef.current[agentIdx];
      if (!agent) return;
      if (!perspectiveCameraRef.current) {
        perspectiveCameraRef.current = new THREE.PerspectiveCamera(
          65,
          size.width / size.height,
          0.1,
          100,
        );
      }
      thetaOffsetRef.current = 0;
      lastAgentIdxRef.current = agentIdx;
      // Snap the smoothed position + lookAt to the immediate target so
      // follow-entry doesn't visibly slide in from the scene origin.
      const [wx0, , wz0] = toWorld(agent.x, agent.y);
      const theta0 = agent.facing + Math.PI;
      const phi0 = phiRef.current;
      const r0 = radiusRef.current;
      currentPosRef.current.set(
        wx0 + r0 * Math.sin(phi0) * Math.sin(theta0),
        0.4 + r0 * Math.cos(phi0),
        wz0 + r0 * Math.sin(phi0) * Math.cos(theta0),
      );
      currentLookRef.current.set(wx0, 0.5, wz0);
      set({ camera: perspectiveCameraRef.current });
      wasFollowingRef.current = true;
    }

    // Exit follow mode: restore the original ortho iso camera.
    if (!isFollowing && wasFollowingRef.current) {
      if (originalCameraRef.current) {
        set({ camera: originalCameraRef.current as THREE.PerspectiveCamera });
      }
      wasFollowingRef.current = false;
      return;
    }

    if (!isFollowing || !perspectiveCameraRef.current) return;

    const agent = agentRef.current[agentIdx];
    if (!agent) return;

    // Agent changed while following — reset the drag offset so we sit
    // directly behind the new agent.
    if (agentIdx !== lastAgentIdxRef.current) {
      thetaOffsetRef.current = 0;
      lastAgentIdxRef.current = agentIdx;
    }

    const [wx, , wz] = toWorld(agent.x, agent.y);
    const radius = radiusRef.current;
    // Effective theta = agent's facing + π (behind them) + user drag offset.
    // This keeps the camera pinned behind the agent as they turn, while
    // respecting any orbit dragging the user has done.
    const theta = agent.facing + Math.PI + thetaOffsetRef.current;
    const phi = phiRef.current;

    desiredPosRef.current.set(
      wx + radius * Math.sin(phi) * Math.sin(theta),
      0.4 + radius * Math.cos(phi),
      wz + radius * Math.sin(phi) * Math.cos(theta),
    );
    desiredLookRef.current.set(wx, 0.5, wz);

    // Lerp both camera position and lookAt target toward their desired
    // values so the camera eases the agent's snappier facing/position
    // changes. ~0.12 per 60fps frame → ~92% of the way in ~180ms.
    currentPosRef.current.lerp(desiredPosRef.current, 0.12);
    currentLookRef.current.lerp(desiredLookRef.current, 0.12);

    perspectiveCameraRef.current.position.copy(currentPosRef.current);
    perspectiveCameraRef.current.lookAt(currentLookRef.current);
    perspectiveCameraRef.current.aspect = size.width / size.height;
    // Reset zoom to 1 every frame. CameraRig's useEffect writes the
    // orthographic cameraZoom (e.g. 42 for seats) onto whatever camera
    // useThree returns — when we swap the perspective cam in, that write
    // lands on it and magnifies everything 42x. Stomp it back to 1 here.
    perspectiveCameraRef.current.zoom = 1;
    perspectiveCameraRef.current.updateProjectionMatrix();
  });

  return null;
}
