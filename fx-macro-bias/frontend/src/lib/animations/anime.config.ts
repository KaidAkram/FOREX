/**
 * Anime.js micro-interaction helpers — FX Macro Bias
 * Used for lightweight UI interactions: button glows, badge pop-ins, hover states.
 */
import anime from "animejs";


// ── KPI number count-up animation ────────────────────────
export function animateCountUp(
  el: Element,
  from: number,
  to: number,
  duration = 1200
) {
  const obj = { value: from };
  return anime({
    targets: obj,
    value: to,
    duration,
    easing: "easeOutExpo",
    round: 1,
    update() {
      if (el) el.textContent = obj.value.toLocaleString();
    },
  });
}

// ── Bias pill pop-in animation ───────────────────────────
export function animatePillPopIn(el: Element) {
  return anime({
    targets: el,
    scale: [0.7, 1.08, 1],
    opacity: [0, 1],
    duration: 400,
    easing: "easeOutElastic(1, 0.6)",
  });
}

// ── Button glow pulse on hover ──────────────────────────
export function startButtonGlow(el: Element, color: string) {
  return anime({
    targets: el,
    boxShadow: [
      `0 0 0 0 ${color}00`,
      `0 0 12px 3px ${color}40`,
      `0 0 0 0 ${color}00`,
    ],
    duration: 800,
    loop: false,
    easing: "easeInOutSine",
  });
}

// ── Score cell flash on data change ─────────────────────
export function flashCell(el: Element, color = "#00E5FF") {
  return anime({
    targets: el,
    backgroundColor: [
      { value: `${color}22`, duration: 100 },
      { value: "transparent", duration: 400 },
    ],
    easing: "easeOutQuad",
  });
}
