// src/main.js
import * as THREE from "three";
import { createRenderer, resizeRenderer } from "./core/renderer.js";
import { createCamera } from "./core/camera.js";
import { createScene } from "./core/scene.js";
import { FieldSystem } from "./systems/fieldSystem.js";
import { ScrollSystem } from "./systems/scrollSystem.js";
import { PostProcessing } from "./effects/postprocessing.js";
import { DEBUG } from "./config.js";

class App {
  constructor() {
    this.canvas = document.getElementById("signal-canvas");
    this.renderer = createRenderer(this.canvas);
    this.camera = createCamera();
    this.scene = createScene();
    this.timer = new THREE.Timer();

    this.stats = null;
    this.gui = null;

    this.fieldSystem = null;
    this.scrollSystem = null;
    this.postProcessing = null;

    this.init();
  }

  async init() {
    if (DEBUG) {
      await this.initDebug();
    }

    this.scrollSystem = new ScrollSystem();
    this.scrollSystem.init();

    this.fieldSystem = new FieldSystem(this.scene);
    this.fieldSystem.init();

    // PostProcessing must init AFTER scene is populated
    // so the render pass has something to draw.
    this.postProcessing = new PostProcessing(
      this.renderer,
      this.scene,
      this.camera,
    );
    this.postProcessing.init();

    if (DEBUG && this.gui) {
      this.initFieldGUI();
      this.initScrollGUI();
      this.initBloomGUI();
    }

    window.addEventListener("resize", this.onResize.bind(this));
    this.animate();

    console.log("✦ Signal Field initialized");
  }

  async initDebug() {
    const [{ default: Stats }] = await Promise.all([import("stats-gl")]);

    this.stats = new Stats({
      trackGPU: false,
      trackHz: true,
      trackCPT: true,
    });
    document.body.appendChild(this.stats.dom || this.stats.container);

    const { GUI } = await import("lil-gui");
    this.gui = new GUI({ title: "⚡ Signal Field" });
  }

  initFieldGUI() {
    const folder = this.gui.addFolder("Field");

    // --- Color tint (real-time via shader uniform) ---
    const colorParams = { color: "#ffffff" };
    folder
      .addColor(colorParams, "color")
      .name("Color")
      .onChange((value) => {
        if (this.fieldSystem?.material?.uniforms?.uTintColor) {
          this.fieldSystem.material.uniforms.uTintColor.value.set(value);
        }
      });

    // --- Structural changes (require rebuild) ---
    const rebuildParams = {
      count: this.fieldSystem.params.count,
      spread: this.fieldSystem.params.spread,
      baseSize: this.fieldSystem.params.baseSize,
    };

    const rebuild = () => {
      this.fieldSystem.dispose();
      this.fieldSystem = new FieldSystem(this.scene, {
        count: rebuildParams.count,
        spread: rebuildParams.spread,
        baseSize: rebuildParams.baseSize,
      });
      this.fieldSystem.init();
    };

    folder
      .add(rebuildParams, "count", 1000, 50000, 1000)
      .name("Count")
      .onFinishChange(rebuild);
    folder
      .add(rebuildParams, "spread", 10, 100, 1)
      .name("Spread")
      .onFinishChange(rebuild);
    folder
      .add(rebuildParams, "baseSize", 0.01, 0.2, 0.01)
      .name("Size")
      .onFinishChange(rebuild);

    // --- Animation controls ---
    const animFolder = this.gui.addFolder("Animation");
    animFolder
      .add(this.fieldSystem.animation, "driftSpeed", 0.0, 2.0, 0.01)
      .name("Drift Speed");
    animFolder
      .add(this.fieldSystem.animation, "driftAmplitude", 0.0, 3.0, 0.01)
      .name("Drift Range");
    animFolder
      .add(this.fieldSystem.animation, "breathSpeed", 0.0, 2.0, 0.01)
      .name("Breath Speed");
    animFolder
      .add(this.fieldSystem.animation, "breathAmplitude", 0.0, 0.5, 0.01)
      .name("Breath Range");
  }

  initScrollGUI() {
    const scrollFolder = this.gui.addFolder("Scroll State");
    scrollFolder
      .add(this.scrollSystem.state, "progress", 0, 1)
      .name("Progress")
      .listen()
      .disable();
    scrollFolder
      .add(this.scrollSystem.state, "direction", -1, 1, 1)
      .name("Direction")
      .listen()
      .disable();
    scrollFolder
      .add(this.scrollSystem.state, "velocity", 0, 1)
      .name("Velocity")
      .listen()
      .disable();
  }

  /**
   * Bloom controls — tweak the glow in real time.
   */
  initBloomGUI() {
    const bloomFolder = this.gui.addFolder("Bloom");
    const bp = this.postProcessing;

    bloomFolder
      .add(bp.params, "strength", 0.0, 3.0, 0.01)
      .name("Strength")
      .onChange((v) => {
        bp.bloomPass.strength = v;
      });
    bloomFolder
      .add(bp.params, "radius", 0.0, 2.0, 0.01)
      .name("Radius")
      .onChange((v) => {
        bp.bloomPass.radius = v;
      });
    bloomFolder
      .add(bp.params, "threshold", 0.0, 1.0, 0.01)
      .name("Threshold")
      .onChange((v) => {
        bp.bloomPass.threshold = v;
      });
  }

  onResize() {
    resizeRenderer(this.renderer, this.camera);
    if (this.fieldSystem) this.fieldSystem.resize();
    // PostProcessing must resize too — framebuffer dimensions must match
    if (this.postProcessing) {
      this.postProcessing.resize(window.innerWidth, window.innerHeight);
    }
  }

  animate() {
    this.renderer.setAnimationLoop((timestamp) => this.tick(timestamp));
  }

  tick(timestamp) {
    this.timer.update(timestamp);

    const delta = this.timer.getDelta();
    const elapsed = this.timer.getElapsed();

    if (this.stats) this.stats.update();

    if (this.scrollSystem) this.scrollSystem.update(delta);

    if (this.fieldSystem) {
      this.fieldSystem.update(delta, elapsed, this.scrollSystem?.state);
    }

    // --- Render through post-processing pipeline ---
    // This replaces: this.renderer.render(this.scene, this.camera)
    // The composer handles rendering internally via RenderPass.
    if (this.postProcessing) {
      this.postProcessing.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }
}

const app = new App();

if (DEBUG) {
  window.__app = app;
}
