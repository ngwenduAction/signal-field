// vite.config.js
import { defineConfig } from "vite";
import glsl from "vite-plugin-glsl";

export default defineConfig({
  plugins: [
    glsl(), // enables importing .glsl, .vert, .frag files as strings
  ],
  server: {
    open: true, // auto-open browser on dev start
    port: 3000,
  },
  build: {
    target: "esnext", // we want modern JS — no transpilation overhead
    sourcemap: true, // always keep sourcemaps for debugging production builds
  },
});
