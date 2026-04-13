# Signal Field

A GPU-driven procedural WebGL field built with Three.js and custom GLSL shaders.

Signal Field explores how user input can act as *energy within a system*, rather than direct control. Instead of moving a camera through space, scroll interaction modulates motion, depth, and luminosity inside a reactive volumetric field.

---

## ✨ Overview

Signal Field renders a dense cloud of instanced geometry that drifts, pulses, and intensifies in response to scroll.

The project is designed as a **shader-driven system**, where:
- The CPU seeds initial state
- The GPU handles animation and transformation
- User input feeds directly into shader uniforms

This results in a responsive, real-time visual experience that feels organic and alive.

---

## 🧠 Concept

> What if interaction didn’t move the viewer—but changed the behavior of space itself?

Instead of camera movement:
- Scroll → controls energy and motion
- Velocity → affects brightness and turbulence
- Progress → shifts the field through depth

The scene becomes a **dynamic signal field**, not just a visual composition.

---

## ⚙️ Tech Stack

- Three.js (WebGL abstraction)
- GLSL (custom vertex + fragment shaders)
- InstancedMesh (efficient large-scale rendering)
- GSAP ScrollTrigger (scroll state handling)
- Vite (build tool)
- Post-processing (UnrealBloomPass)

---

## 🎨 Features

- GPU-driven animation (no per-instance CPU updates)
- Shader-based procedural motion (noise + trigonometry)
- Scroll-reactive interaction system
- Additive blending + bloom for luminous effects
- Modular architecture (core / systems / shaders / effects)

---

## 🧩 Architecture 

src/
├── core/ # Renderer, camera, scene setup
├── systems/ # Field system, scroll system
├── shaders/ # GLSL (vertex + fragment)
├── effects/ # Post-processing pipeline
└── utils/ # Helpers and configuration


- **Core** handles initialization
- **Systems** manage behavior and state
- **Shaders** define all visual logic
- **Effects** handle post-processing

---

## 🚀 Getting Started

### Install dependencies

```bash ```
npm install

### Run development server

```bash ```
npm run dev

### Build for production

```bash ```
npm run build

🌐 Live Demo


⚡ Performance Notes
- Uses InstancedMesh to render thousands of objects efficiently
- Animation runs on the GPU via shaders
- CPU only updates a small set of uniforms per frame
- DPR is capped to balance quality and performance

Potential bottlenecks:
- Transparent additive rendering (overdraw)
- Bloom post-processing cost
- Disabled frustum culling
  
🧪 Future Improvements
- Adaptive quality scaling for mobile devices
- Improved frustum culling / spatial optimization
- Enhanced shader effects (e.g. soft particle falloff)
- Multi-pass rendering or GPGPU-based systems
- Expanded interaction models beyond scroll
  
📚 What I Learned
- Designing GPU-first rendering systems
- Writing and structuring GLSL shaders
- Using instancing for scalable real-time scenes
- Procedural motion using coherent noise
- Treating user input as a continuous signal
- Balancing visual fidelity with performance

👨‍💻 Author
Built as part of my transition into:
- WebGL Engineering
- Creative Development
- Technical Art
