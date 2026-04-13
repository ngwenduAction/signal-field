// src/systems/fieldSystem.js
import * as THREE from "three";
import { CONFIG } from "../config.js";
import fieldVertexShader from "../shaders/field.vert";
import fieldFragmentShader from "../shaders/field.frag";

/**
 * FieldSystem — Phase 4: GPU-Driven Animation
 *
 * What changed from Phase 2/3:
 *   - Material is now ShaderMaterial with custom vertex/fragment shaders
 *   - Animation runs entirely on the GPU (vertex shader)
 *   - CPU update() only sets uniform values — no per-instance loop
 *   - Added per-instance aPhase attribute
 *   - populateField() no longer needs to update matrices per frame
 *
 * What DID NOT change:
 *   - Constructor signature
 *   - init() / dispose() lifecycle
 *   - update(delta, elapsed, scrollState) signature
 *   - main.js is completely unchanged
 */
export class FieldSystem {
  constructor(scene, options = {}) {
    this.scene = scene;

    this.params = {
      count: options.count ?? CONFIG.field.count,
      spread: options.spread ?? CONFIG.field.spread,
      baseSize: options.baseSize ?? CONFIG.field.baseSize,
    };

    this.animation = {
      driftSpeed: options.driftSpeed ?? 0.3,
      driftAmplitude: options.driftAmplitude ?? 0.8,
      breathSpeed: options.breathSpeed ?? 0.5,
      breathAmplitude: options.breathAmplitude ?? 0.15,
    };

    this.geometry = null;
    this.material = null;
    this.mesh = null;

    // Phase 4: typed arrays still needed for initial population
    this.initialPositions = null;
    this.initialScales = null;
    this.phases = null;

    this._dummy = new THREE.Object3D();
    this._color = new THREE.Color();
  }

  init() {
    this.allocateStateArrays();
    this.createGeometry();
    this.createMaterial();
    this.createMesh();
    this.populateField();
    this.attachPhaseAttribute();

    this.scene.add(this.mesh);

    console.log(
      `✦ FieldSystem initialized: ${this.params.count} instances, ` +
        `spread: ${this.params.spread}, size: ${this.params.baseSize}`,
    );

    return this;
  }

  allocateStateArrays() {
    const { count } = this.params;
    this.initialPositions = new Float32Array(count * 3);
    this.initialScales = new Float32Array(count);
    this.phases = new Float32Array(count);
  }

  createGeometry() {
    this.geometry = new THREE.IcosahedronGeometry(this.params.baseSize, 0);
  }

  /**
   * ShaderMaterial — full control over vertex and fragment stages.
   *
   * Key properties:
   *
   * transparent: true — enables alpha blending. Without this,
   *   gl_FragColor.a is ignored and everything is fully opaque.
   *
   * depthWrite: false — transparent objects should not write to
   *   the depth buffer. If they do, particles behind a semi-transparent
   *   particle get z-culled entirely instead of blending through.
   *
   * blending: AdditiveBlending — overlapping particles ADD their color
   *   together instead of occluding. This creates the glowing,
   *   luminous look of particle fields. Dense areas glow brighter
   *   naturally because more particles contribute light.
   */
  createMaterial() {
    this.material = new THREE.ShaderMaterial({
      vertexShader: fieldVertexShader,
      fragmentShader: fieldFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uProgress: { value: 0 },
        uVelocity: { value: 0 },
        uDriftSpeed: { value: this.animation.driftSpeed },
        uDriftAmplitude: { value: this.animation.driftAmplitude },
        uBreathSpeed: { value: this.animation.breathSpeed },
        uBreathAmplitude: { value: this.animation.breathAmplitude },
        uFieldSpread: { value: this.params.spread },
        uTintColor: { value: new THREE.Color(1, 1, 1) }, // white default
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: true,
    });
  }

  createMesh() {
    this.mesh = new THREE.InstancedMesh(
      this.geometry,
      this.material,
      this.params.count,
    );
    this.mesh.frustumCulled = false;
    this.mesh.name = "signal-field";
  }

  /**
   * Populate field — same as Phase 2 but matrices are set ONCE.
   *
   * In Phase 2, we updated matrices every frame (CPU).
   * Now the vertex shader handles animation, so matrices are static —
   * they store the initial position and scale, which the shader reads
   * and offsets with drift + noise + scroll.
   *
   * This means populateField() runs once at init and NEVER again.
   * The CPU cost of the field drops to essentially zero per frame.
   */
  populateField() {
    const { count, spread } = this.params;
    const half = spread / 2;

    for (let i = 0; i < count; i++) {
      const x = Math.random() * spread - half;
      const y = Math.random() * spread - half;
      const z = Math.random() * spread - half;

      const i3 = i * 3;
      this.initialPositions[i3] = x;
      this.initialPositions[i3 + 1] = y;
      this.initialPositions[i3 + 2] = z;

      const scale = 0.5 + Math.random() * 1.0;
      this.initialScales[i] = scale;

      this.phases[i] = Math.random() * Math.PI * 2;

      this._dummy.position.set(x, y, z);
      this._dummy.scale.setScalar(scale);
      this._dummy.rotation.set(0, 0, 0);
      this._dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this._dummy.matrix);

      const brightness = 0.3 + Math.random() * 0.7;
      this._color.setRGB(brightness, brightness, brightness);
      this.mesh.setColorAt(i, this._color);
    }

    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) {
      this.mesh.instanceColor.needsUpdate = true;
    }
  }

  /**
   * Attach per-instance phase attribute to the geometry.
   *
   * Three.js InstancedMesh automatically handles instanceMatrix
   * and instanceColor as instanced attributes. For custom
   * per-instance data, we use InstancedBufferAttribute.
   *
   * This tells the GPU: "for each instance, read one float from
   * this buffer and make it available as `aPhase` in the vertex shader."
   *
   * Why attach to geometry and not mesh?
   *   Because attributes live on the geometry in Three.js's abstraction.
   *   InstancedBufferAttribute signals to Three.js that the attribute
   *   advances once per instance, not once per vertex.
   */
  attachPhaseAttribute() {
    const phaseAttribute = new THREE.InstancedBufferAttribute(this.phases, 1);
    this.geometry.setAttribute("aPhase", phaseAttribute);
  }

  /**
   * Per-frame update — Phase 4 version.
   *
   * THIS IS THE PAYOFF.
   *
   * Phase 2 update(): 10,000 iterations, trig calls, matrix updates.
   * Phase 4 update(): Set 7 uniform values. That's it.
   *
   * The GPU handles the rest in parallel. This is why we moved to shaders.
   * CPU per-frame cost is now effectively zero for the field system.
   */
  update(
    _delta,
    elapsed,
    scrollState = { progress: 0, direction: 1, velocity: 0 },
  ) {
    if (!this.material) return;

    const uniforms = this.material.uniforms;

    // --- Time ---
    uniforms.uTime.value = elapsed;

    // --- Scroll state ---
    uniforms.uProgress.value = scrollState.progress;
    uniforms.uVelocity.value = scrollState.velocity;

    // --- Animation parameters (driven by GUI) ---
    uniforms.uDriftSpeed.value = this.animation.driftSpeed;
    uniforms.uDriftAmplitude.value = this.animation.driftAmplitude;
    uniforms.uBreathSpeed.value = this.animation.breathSpeed;
    uniforms.uBreathAmplitude.value = this.animation.breathAmplitude;
  }

  resize() {
    // Future: adjust field based on viewport
  }

  dispose() {
    if (this.mesh) {
      this.scene.remove(this.mesh);
    }

    if (this.geometry) {
      this.geometry.dispose();
      this.geometry = null;
    }

    if (this.material) {
      this.material.dispose();
      this.material = null;
    }

    if (this.mesh) {
      this.mesh.dispose();
      this.mesh = null;
    }

    this.initialPositions = null;
    this.initialScales = null;
    this.phases = null;

    console.log("✦ FieldSystem disposed");
  }
}
