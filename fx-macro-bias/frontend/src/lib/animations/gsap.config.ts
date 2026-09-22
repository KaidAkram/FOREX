/**
 * GSAP configuration — FX Macro Bias
 * Registers plugins and exports shared timeline presets.
 * Import this ONCE in layout.tsx or a top-level component.
 */
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Only register on client
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

// ── Shared easing presets ──────────────────────────────────
export const EASE_SPRING = "back.out(1.7)";
export const EASE_SMOOTH = "power3.out";
export const EASE_ELASTIC = "elastic.out(1, 0.4)";

// ── Staggered table row reveal ─────────────────────────────
/**
 * Animate tbody rows into view with a stagger.
 * Call after data loads and DOM updates.
 * @param rows - NodeList or array of TR elements
 */
export function animateTableRows(rows: Element[] | NodeListOf<Element>) {
  return gsap.fromTo(
    rows,
    { opacity: 0, y: 10 },
    {
      opacity: 1,
      y: 0,
      duration: 0.35,
      ease: EASE_SMOOTH,
      stagger: 0.04,
      clearProps: "all",
    }
  );
}

// ── Modal entrance ────────────────────────────────────────
export function animateModalIn(el: Element) {
  return gsap.fromTo(
    el,
    { opacity: 0, scale: 0.95, y: 8 },
    { opacity: 1, scale: 1, y: 0, duration: 0.3, ease: EASE_SPRING }
  );
}

export function animateModalOut(el: Element, onComplete?: () => void) {
  return gsap.to(el, {
    opacity: 0,
    scale: 0.97,
    y: 4,
    duration: 0.2,
    ease: "power2.in",
    onComplete,
  });
}

// ── Slide-in drawer (Final Score drilldown) ───────────────
export function animateDrawerIn(el: Element) {
  return gsap.fromTo(
    el,
    { x: "100%" },
    { x: "0%", duration: 0.35, ease: EASE_SMOOTH }
  );
}

export function animateDrawerOut(el: Element, onComplete?: () => void) {
  return gsap.to(el, {
    x: "100%",
    duration: 0.25,
    ease: "power2.in",
    onComplete,
  });
}

// ── Page section reveal ──────────────────────────────────
export function animateSectionIn(els: Element[]) {
  return gsap.fromTo(
    els,
    { opacity: 0, y: 20 },
    {
      opacity: 1,
      y: 0,
      duration: 0.5,
      ease: EASE_SMOOTH,
      stagger: 0.1,
      clearProps: "all",
    }
  );
}

export { gsap };
