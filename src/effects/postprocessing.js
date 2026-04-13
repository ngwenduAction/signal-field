// src/effects/postprocessing.js
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import * as THREE from "three";

/**
 * PostProcessing — Bloom effect pipeline.
 *
 * Why bloom?
 * Our particles use additive blending — where they overlap,
 * they're brighter. Bloom takes those bright areas and bleeds
 * light outward, simulating how real bright light sources look
 * to the human eye (or a camera lens). It's the difference
 * between "white dots on black" and "luminous particles floating
 * in space."
 *
 * Pipeline:
 *   RenderPass → renders the scene normally
 *   UnrealBloomPass → extracts bright areas, blurs them, composites
 *   OutputPass → applies tone mapping and color space conversion
 *
 * Why OutputPass at the end?
 *   Post-processing happens in linear color space. Without OutputPass,
 *   the final image would look washed out because the browser expects
 *   sRGB-encoded values. OutputPass handles the conversion.
 */
export class PostProcessing {
  /**
   * @param {THREE.WebGLRenderer} renderer
   * @param {THREE.Scene} scene
   * @param {THREE.Camera} camera
   * @param {object} [options]
   */
  constructor(renderer, scene, camera, options = {}) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;

    this.params = {
      strength: options.strength ?? 1.2,
      radius: options.radius ?? 0.6,
      threshold: options.threshold ?? 0.1,
    };

    this.composer = null;
    this.bloomPass = null;
  }

  init() {
    const size = new THREE.Vector2();
    this.renderer.getSize(size);

    // EffectComposer manages the chain of post-processing passes.
    // It renders to its own framebuffer, not directly to screen,
    // then each pass reads the previous result and writes a new one.
    this.composer = new EffectComposer(this.renderer);

    // Pass 1: Render the scene normally
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    // Pass 2: Bloom
    // Resolution should match render target size for sharp bloom.
    // strength: how bright the bloom glow is
    // radius: how far the bloom spreads (blur radius)
    // threshold: brightness level that triggers bloom (0 = everything blooms)
    this.bloomPass = new UnrealBloomPass(
      size,
      this.params.strength,
      this.params.radius,
      this.params.threshold,
    );
    this.composer.addPass(this.bloomPass);

    // Pass 3: Output — tone mapping + color space
    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);

    console.log("✦ PostProcessing initialized: bloom enabled");

    return this;
  }

  /**
   * Render the post-processed frame.
   * Replaces renderer.render(scene, camera) in the main loop.
   */
  render() {
    this.composer.render();
  }

  /**
   * Handle viewport resize.
   * The composer's internal framebuffers must match the new viewport size.
   */
  resize(width, height) {
    if (this.composer) {
      this.composer.setSize(width, height);
    }
  }

  dispose() {
    // EffectComposer doesn't have a built-in dispose,
    // but we can release the render targets
    if (this.composer) {
      this.composer.renderTarget1.dispose();
      this.composer.renderTarget2.dispose();
      this.composer = null;
    }
    this.bloomPass = null;

    console.log("✦ PostProcessing disposed");
  }
}
