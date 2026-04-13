// src/systems/scrollSystem.js
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * ScrollSystem — Revised
 *
 * Previous approach failed because:
 *   1. html overflow:hidden blocked all scroll events globally
 *   2. The scroll container was pointer-events:none with z-index:-1,
 *      which some browsers ignore for scroll detection
 *   3. Setting body height alone isn't enough — we need actual
 *      scrollable content that ScrollTrigger can measure
 *
 * Revised approach:
 *   - Create a tall spacer div as a direct body child
 *   - The spacer has real height that makes the body scrollable
 *   - ScrollTrigger tracks the spacer's passage through the viewport
 *   - Canvas is position:fixed so it doesn't move
 *   - The ONLY thing that scrolls is the invisible spacer
 */
export class ScrollSystem {
  constructor(options = {}) {
    this.state = {
      progress: 0,
      direction: 1,
      velocity: 0,
    };

    this.scrollLength = options.scrollLength ?? 5000;
    this.spacer = null;
    this.trigger = null;
  }

  init() {
    this.createSpacer();
    this.createScrollTrigger();

    console.log(
      `✦ ScrollSystem initialized: ${this.scrollLength}px virtual scroll`,
    );
    return this;
  }

  /**
   * Create a spacer element that gives the page real height.
   *
   * This is different from the previous approach:
   *   - No pointer-events:none (browser needs to detect it for scroll)
   *   - No negative z-index
   *   - It's a real block-level element that the body flows around
   *   - The canvas is fixed on top of it, so it's invisible
   *   - But the browser knows the page is 5000px tall and allows scrolling
   */
  createSpacer() {
    this.spacer = document.createElement("div");
    this.spacer.id = "scroll-spacer";

    Object.assign(this.spacer.style, {
      width: "100%",
      height: `${this.scrollLength}px`,
      // Visually invisible but physically present in the document flow
      position: "relative",
      background: "transparent",
    });

    document.body.appendChild(this.spacer);
  }

  /**
   * ScrollTrigger watches the spacer element scroll through the viewport.
   *
   * start: "top top" — trigger activates when spacer's top hits viewport top
   * end: "bottom bottom" — trigger ends when spacer's bottom hits viewport bottom
   *
   * This means progress 0→1 maps exactly to scrolling from the
   * top of the page to the bottom of the spacer.
   */
  createScrollTrigger() {
    this.trigger = ScrollTrigger.create({
      trigger: this.spacer,
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      onUpdate: (self) => {
        this.state.progress = self.progress;
        this.state.direction = self.direction;

        const rawVelocity = Math.abs(self.getVelocity());
        this.state.velocity = Math.min(rawVelocity / 1000, 1.0);
      },
    });
  }

  update(_delta) {
    // Future: velocity damping
  }

  dispose() {
    if (this.trigger) {
      this.trigger.kill();
      this.trigger = null;
    }

    if (this.spacer) {
      this.spacer.remove();
      this.spacer = null;
    }

    console.log("✦ ScrollSystem disposed");
  }
}
