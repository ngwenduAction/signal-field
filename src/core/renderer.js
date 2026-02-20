// src/core/renderer.js
import * as THREE from "three";
import { CONFIG } from "../config.js";

/**
 * Creates and configures the WebGL renderer.
 *
 * Design decisions:
 *
 * 1. We accept the canvas element rather than letting Three.js create one.
 *    This gives us control over the DOM — critical for accessibility attributes,
 *    event listener management, and CSS layering.
 *
 * 2. Pixel ratio is capped at 2. Here's why:
 *    - A device with devicePixelRatio 3 (e.g., iPhone 15 Pro) renders
 *      9x the pixels of a 1x display for the SAME viewport size.
 *    - The visual difference between 2x and 3x is nearly imperceptible.
 *    - The performance cost is enormous: more fragments to shade, more
 *      memory for framebuffers, more bandwidth for post-processing passes.
 *    - This single line is the difference between 60fps and 30fps on mobile.
 *
 * 3. ACES Filmic tone mapping compresses HDR values into displayable range
 *    with a pleasing S-curve — highlights roll off naturally instead of clipping.
 *    This is the same curve used in film production.
 *
 * 4. SRGBColorSpace ensures textures and colors display correctly.
 *    Without this, everything looks washed out because the browser's display
 *    pipeline expects sRGB-encoded values, not linear.
 */
export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: CONFIG.renderer.antialias,
    powerPreference: "high-performance", // hint to use discrete GPU if available
    alpha: false, // no transparency — we own the background
  });

  // --- Performance guardrails ---
  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio, CONFIG.renderer.maxPixelRatio),
  );
  renderer.setSize(window.innerWidth, window.innerHeight);

  // --- Color science ---
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = CONFIG.renderer.toneMappingExposure;

  // --- Clear color ---
  renderer.setClearColor(
    CONFIG.renderer.clearColor,
    CONFIG.renderer.clearAlpha,
  );

  return renderer;
}

/**
 * Handles viewport resize.
 * Separated from creation so the resize handler can be registered
 * and torn down independently — important for cleanup in SPAs.
 */
export function resizeRenderer(renderer, camera) {
  const width = window.innerWidth;
  const height = window.innerHeight;

  renderer.setSize(width, height);
  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio, CONFIG.renderer.maxPixelRatio),
  );

  // Camera aspect must update too, or the scene will stretch/squash
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}
