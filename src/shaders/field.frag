// field.frag — Fragment Shader for the Signal Field
//
// This shader runs ONCE PER PIXEL of every visible instance.
// It controls what each particle looks like on screen.
//
// Responsibilities:
//   1. Apply per-instance color
//   2. Depth-based fade (far = dim, near = bright)
//   3. Soft glow effect based on distance from geometry center
//   4. Velocity-driven intensity boost

uniform float uVelocity;
uniform float uTime;
uniform vec3 uTintColor;

varying vec3 vColor;
varying float vDepth;
varying float vScale;

void main() {
  // --- Depth fade ---
  // Particles far from camera fade out naturally.
  // This creates atmospheric depth without fog — cleaner look.
  // smoothstep(0.0, 1.0, depth) maps:
  //   depth 0 (near camera) → fade = 1.0 (fully visible)
  //   depth 1+ (far from camera) → fade = 0.0 (invisible)
  float depthFade = 1.0 - smoothstep(0.0, 1.0, vDepth);

  // --- Base brightness ---
  // Combine instance color with depth fade.
  // vColor already has brightness variation from populateField().
  // --- Base brightness with tint ---
  vec3 color = vColor * depthFade * uTintColor;
  
  // --- Velocity glow ---
  // When scrolling fast, particles get brighter — the field "lights up".
  // This is subtle but creates a strong sense of responsiveness.
  // uVelocity is 0 at rest, up to 1.0 during fast scroll.
  float velocityGlow = 1.0 + uVelocity * 0.8;
  color *= velocityGlow;

  // --- Subtle pulse ---
  // A very slow global brightness oscillation adds life even at rest.
  // sin(uTime * 0.5) is a 12.5-second cycle — barely perceptible 
  // consciously, but it prevents the field from ever feeling "dead".
  float pulse = 1.0 + sin(uTime * 0.5) * 0.05;
  color *= pulse;

  // --- Alpha: depth-based transparency ---
  // Near particles are fully opaque, far particles fade.
  // Combined with bloom post-processing, this creates a 
  // natural glow-to-fade gradient across the field depth.
  float alpha = depthFade * 0.9;

  // Discard fully transparent fragments — saves fill rate.
  // The GPU skips blending and depth writes for discarded fragments.
  if (alpha < 0.01) discard;

  gl_FragColor = vec4(color, alpha);
}