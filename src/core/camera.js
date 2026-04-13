import * as THREE from "three";
import { CONFIG } from "../config.js";

/**
 * Creates the perspective camera.
 *
 * Why PerspectiveCamera and not OrthographicCamera?
 * We want depth. Particles further from the camera should appear smaller.
 * Parallax creates the illusion of a 3D field that responds to scroll.
 * Orthographic kills that completely — it's for UI overlays and 2D games.
 *
 * FOV of 60 is a moderate wide angle — enough to see a broad field without
 * the barrel distortion you get at 90+. It's close to human peripheral vision
 * when focused on a screen.
 *
 * Near/far planes:
 * - near: 0.1 is tight enough to avoid z-fighting artifacts near the camera
 * - far: 200 gives us room for deep particle fields without wasting
 *   depth buffer precision on empty space at 10000+
 *
 * The depth buffer has finite precision (typically 24-bit). The ratio
 * far/near determines how that precision is distributed. A ratio of
 * 200/0.1 = 2000 is reasonable. A ratio of 10000/0.001 = 10,000,000
 * would cause z-fighting everywhere.
 */
export function createCamera() {
  const { fov, near, far, position } = CONFIG.camera;

  const camera = new THREE.PerspectiveCamera(
    fov,
    window.innerWidth / window.innerHeight,
    near,
    far,
  );

  camera.position.set(position.x, position.y, position.z);

  return camera;
}
