// src/config.js

/**
 * Centralized configuration.
 *
 * In production, DEBUG would be driven by environment variables:
 *   const DEBUG = import.meta.env.DEV
 *
 * We keep it explicit here so you can toggle it in deployed previews too.
 */

export const DEBUG = true;

export const CONFIG = {
  renderer: {
    maxPixelRatio: 2,
    antialias: true,
    clearColor: 0x000000,
    clearAlpha: 1,
    toneMapping: "ACESFilmic",
    toneMappingExposure: 1.0,
  },
  camera: {
    fov: 60,
    near: 0.1,
    far: 200,
    position: { x: 0, y: 0, z: 30 },
  },
  field: {
    count: 10000,
    spread: 50,
    baseSize: 0.05,
  },
};
