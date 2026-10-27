"use client";
import { useCallback, useRef } from "react";

// CHECKLIST #11 & SECTION 5: 120FPS Weightless Micro-Interaction Physics
export const SPRING_WEIGHTLESS = {
  type: "spring" as const,
  stiffness: 520,
  damping: 38,
  mass: 0.3,
};

// CHECKLIST #19: Idempotency Key Generator + Double-Click Lock
export function useIdempotentAction<T extends (...args: any[]) => Promise<any>>(action: T) {
  const inFlightRef = useRef<boolean>(false);

  return useCallback(
    async (...args: Parameters<T>) => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      const idempotencyKey =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `idemp-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      try {
        return await action(...args, { headers: { "X-Idempotency-Key": idempotencyKey } });
      } finally {
        setTimeout(() => {
          inFlightRef.current = false;
        }, 250);
      }
    },
    [action]
  );
}

// CHECKLIST #9: Hardware-Accelerated View Transition Wrapper
export function runWithViewTransition(updateCb: () => void) {
  if (typeof document !== "undefined" && "startViewTransition" in document) {
    (document as any).startViewTransition(() => {
      updateCb();
    });
  } else {
    updateCb();
  }
}

// CHECKLIST #20: Amazon Safe Triangle Point-in-Triangle Geometry Check
export function isCursorInSafeTriangle(
  cursor: { x: number; y: number },
  prevCursor: { x: number; y: number },
  submenuTop: { x: number; y: number },
  submenuBottom: { x: number; y: number }
): boolean {
  const sign = (
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    p3: { x: number; y: number }
  ) => (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);

  const d1 = sign(cursor, prevCursor, submenuTop);
  const d2 = sign(cursor, submenuTop, submenuBottom);
  const d3 = sign(cursor, submenuBottom, prevCursor);

  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}

// CHECKLIST #5: Interactive Undo Toast Event Dispatcher
export function dispatchUndoToast(message: string, onUndo: () => void) {
  if (typeof window === "undefined") return;
  const event = new CustomEvent("shiftfx-undo-toast", {
    detail: { message, onUndo, timestamp: Date.now() },
  });
  window.dispatchEvent(event);
}
