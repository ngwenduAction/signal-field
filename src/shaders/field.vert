// field.vert — Vertex Shader for the Signal Field
//
// This shader runs ONCE PER VERTEX PER INSTANCE.
// With 10,000 instances × 12 vertices (icosahedron detail 0) = 120,000 invocations.
// The GPU handles this in parallel — typically in under 0.5ms.
//
// Responsibilities:
//   1. Apply instance transform (position, scale from instanceMatrix)
//   2. Add time-based drift animation (replaces CPU loop)
//   3. Add scroll-driven Z displacement
//   4. Pass data to fragment shader via varyings

// --- Uniforms: global values, same for all instances ---
uniform float uTime;
uniform float uProgress;
uniform float uVelocity;
uniform float uDriftSpeed;
uniform float uDriftAmplitude;
uniform float uBreathSpeed;
uniform float uBreathAmplitude;
uniform float uFieldSpread;

// --- Per-instance attribute ---
// Three.js automatically provides instanceMatrix and instanceColor.
// We add our own custom attribute for phase offset.
attribute float aPhase;

// --- Varyings: passed to fragment shader ---
varying vec3 vColor;
varying float vDepth;
varying float vScale;

//
// Simplex-style noise — a compact 3D noise function.
// Used for organic turbulence that sin/cos alone can't achieve.
// Sin/cos creates smooth periodic motion. Noise creates 
// unpredictable but continuous variation — like wind or water.
//
// This is a well-known GLSL hash-based noise. Not true Simplex
// (which requires more code), but visually convincing and fast.
//
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

void main() {
  // --- Extract instance position from the instance matrix ---
  // instanceMatrix is a 4x4 matrix. The translation is in column 3 (indices 12,13,14).
  // We read the position that was set during populateField().
  vec3 instancePos = vec3(
    instanceMatrix[3][0],
    instanceMatrix[3][1],
    instanceMatrix[3][2]
  );

  // --- Extract instance scale from the instance matrix ---
  // Scale is encoded in the length of each basis vector (columns 0,1,2).
  // For uniform scale (setScalar), all three are equal.
  float instanceScale = length(instanceMatrix[0].xyz);

  // --- Time-based animation (replaces CPU loop from Phase 2) ---
  float t = uTime * uDriftSpeed + aPhase;

  // Velocity boost — scroll speed adds energy
  float velocityBoost = 1.0 + uVelocity * 1.5;

  float amp = uDriftAmplitude * velocityBoost;

  // Sinusoidal drift — same logic as Phase 2 CPU version
  vec3 drift = vec3(
    sin(t) * amp,
    cos(t * 0.8) * amp,
    sin(t * 0.6) * amp * 0.5
  );

  // --- Noise turbulence ---
  // This is the upgrade over Phase 2. Noise adds organic, 
  // non-periodic variation that makes the field feel alive.
  // The noise input is the instance position (so nearby particles
  // move similarly — spatial coherence) plus time (so it evolves).
  //
  // Noise amplitude is scaled by velocity — fast scroll = turbulent,
  // still = calm. This creates a visceral connection between 
  // user input and visual response.
  float noiseScale = 0.05;
  float noiseAmp = 1.5 * velocityBoost;
  vec3 noiseInput = instancePos * noiseScale + uTime * 0.2;
  vec3 turbulence = vec3(
    snoise(noiseInput),
    snoise(noiseInput + 100.0),
    snoise(noiseInput + 200.0)
  ) * noiseAmp;

  // --- Scroll Z displacement ---
  float scrollZ = uProgress * uFieldSpread * 0.8;

  // --- Combine all offsets ---
  vec3 finalPos = instancePos + drift + turbulence;
  finalPos.z -= scrollZ;

  // --- Breathing scale ---
  float breathe = 1.0 + sin(uTime * uBreathSpeed * velocityBoost + aPhase) * uBreathAmplitude;
  float finalScale = instanceScale * breathe;

  // --- Apply to vertex position ---
  // `position` is the vertex position in the base geometry (icosahedron).
  // We scale it, then translate to the final world position.
  vec3 transformed = position * finalScale + finalPos;

  // --- Project to screen ---
  vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  // --- Pass to fragment shader ---
  // instanceColor is provided by Three.js InstancedMesh
  vColor = instanceColor.rgb;

  // Depth: how far from camera (normalized roughly to 0-1 range)
  // Used in fragment shader for depth-based fade
  vDepth = -mvPosition.z / 60.0;

  // Scale passed for size-based glow intensity
  vScale = finalScale;
}