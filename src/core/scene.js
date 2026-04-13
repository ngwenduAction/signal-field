// src/core/scene.js
import * as THREE from "three";

/**
 * Creates the scene graph root.
 *
 * This may look trivially simple — and it is, intentionally.
 * The scene module exists as a separate file for two reasons:
 *
 * 1. Separation of concerns: scene configuration (fog, background,
 *    environment maps) lives here, not scattered across main.js.
 *    When we add fog later to fade distant particles, this is where
 *    it goes.
 *
 * 2. Importability: any system can import the scene to add/remove
 *    objects without needing a reference passed through 5 function calls.
 *    Though we'll use explicit dependency injection for testability,
 *    having a clear module boundary matters.
 */
export function createScene() {
  const scene = new THREE.Scene();

  // We'll add fog here later to naturally fade distant field particles:
  // scene.fog = new THREE.FogExp2(0x000000, 0.015)

  return scene;
}
