"use client";

import { useEffect, useRef, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { toWorld } from "../core/geometry";
import type { RenderAgentState } from "../useArenaGameLoop";

export type CamMode = "off" | "chase" | "follow";

/**
 * Chase cam — keeps the existing orthographic iso camera, but lerps its
 * lookAt target toward the selected agent each frame so the scene slides
 * to follow them. Low complexity, consistent with the scene's flat look.
 */
export function ChaseCamController({
  mode,
  agentIdx,
  agentRef,
}: {
  mode: CamMode;
  agentIdx: number;
  agentRef: RefObject<RenderAgentState[]>;
}) {
  const { camera } = useThree();
  const lookTargetRef = useRef(new THREE.Vector3(0, 0.55, 0));
  const desiredTargetRef = useRef(new THREE.Vector3(0, 0.55, 0));

  useFrame(() => {
    if (mode !== "chase") return;
    const agent = agentRef.current[agentIdx];
    if (!agent) return;
    const [wx, , wz] = toWorld(agent.x, agent.y);
    desiredTargetRef.current.set(wx, 0.55, wz);
    lookTargetRef.current.lerp(desiredTargetRef.current, 0.12);
    camera.lookAt(lookTargetRef.current);
    camera.updateMatrixWorld();
  });

  // When chase mode turns off, reset the camera to look at scene origin.
  useEffect(() => {
    if (mode === "off") {
      camera.lookAt(0, 0.55, 0);
      camera.updateMatrixWorld();
      lookTargetRef.current.set(0, 0.55, 0);
    }
  }, [mode, camera]);

  return null;
}

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
  const thetaRef = useRef(0);
  const phiRef = useRef(Math.PI / 6);
  const radiusRef = useRef(2.0);
  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const cameraPositionRef = useRef(new THREE.Vector3());
  const lookAtRef = useRef(new THREE.Vector3());

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
      thetaRef.current -= dx * 0.006;
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
        Math.min(10, radiusRef.current + event.deltaY * 0.005),
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

    // Enter follow mode: create a perspective camera, swap it in, seed theta
    // from the agent's facing so the camera starts behind them.
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
      thetaRef.current = agent.facing + Math.PI;
      lastAgentIdxRef.current = agentIdx;
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

    // Agent changed while following — re-seed theta to be behind them.
    if (agentIdx !== lastAgentIdxRef.current) {
      thetaRef.current = agent.facing + Math.PI;
      lastAgentIdxRef.current = agentIdx;
    }

    const [wx, , wz] = toWorld(agent.x, agent.y);
    const radius = radiusRef.current;
    const theta = thetaRef.current;
    const phi = phiRef.current;

    cameraPositionRef.current.set(
      wx + radius * Math.sin(phi) * Math.sin(theta),
      0.4 + radius * Math.cos(phi),
      wz + radius * Math.sin(phi) * Math.cos(theta),
    );
    perspectiveCameraRef.current.position.copy(cameraPositionRef.current);

    lookAtRef.current.set(wx, 0.5, wz);
    perspectiveCameraRef.current.lookAt(lookAtRef.current);
    perspectiveCameraRef.current.aspect = size.width / size.height;
    perspectiveCameraRef.current.updateProjectionMatrix();
  });

  return null;
}
