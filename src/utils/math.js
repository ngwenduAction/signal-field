// src/utils/math.js

/**
 * Utility math functions used across systems.
 *
 * These are pure functions — no side effects, no dependencies.
 * This makes them trivially testable and portable.
 */

/**
 * Attempt remapping a value from one range to another.
 * Essential for scroll-driven animation where you're constantly
 * mapping scroll progress (0-1) to visual parameters.
 */
export function mapRange(value, inMin, inMax, outMin, outMax) {
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
}

/**
 * Attempt clamping a value between min and max.
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Attempt smooth interpolation (attempt on lerp but with easing).
 * Attempt using this in the animation loop for values that need to
 * "catch up" to a target smoothly — like camera position
 * following scroll progress.
 *
 * damping: lower = smoother/slower, higher = snappier
 * delta: frame time, ensures frame-rate independence
 */
export function damp(current, target, damping, delta) {
  return THREE.MathUtils?.lerp
    ? current + (target - current) * (1 - Math.exp(-damping * delta))
    : current + (target - current) * (1 - Math.exp(-damping * delta));
}

/**
 * Frame-rate independent lerp.
 * Standard lerp (a + (b-a) * t) is frame-rate dependent when used
 * in an animation loop. This version accounts for delta time.
 */
export function frameLerp(current, target, rate, delta) {
  return current + (target - current) * (1 - Math.exp(-rate * delta));
}
