"use client";
import React, { useEffect, useRef } from "react";

/**
 * Optical Halftone Dot-Matrix Wave Shader (Inspired by the 'miracle' reference)
 * Renders a GPU-smooth interactive halftone light wave on an HTML5 Canvas.
 * Ideal for Login, 404, Support Hero, and Brand Splash Screens.
 */
export function HalftoneMotionCanvas({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener("resize", resize);

    const spacing = 11; // Halftone grid spacing in px

    const render = () => {
      time += 0.018;
      const width = canvas.offsetWidth;
      const height = canvas.offsetHeight;

      ctx.fillStyle = "#06070A";
      ctx.fillRect(0, 0, width, height);

      const cols = Math.ceil(width / spacing);
      const rows = Math.ceil(height / spacing);

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = i * spacing;
          const y = j * spacing;

          // Normalize coordinates (-1 to 1)
          const nx = (x / width) * 2 - 1;
          const ny = (y / height) * 2 - 1;

          // Flowing diagonal ribbon wave equation (like image_242fde)
          const wave1 = Math.sin(nx * 2.8 + ny * 2.2 - time);
          const wave2 = Math.cos(nx * 1.6 - ny * 3.1 + time * 0.7);
          const intensity = Math.max(0, (wave1 + wave2) * 0.5);

          const radius = 0.6 + Math.pow(intensity, 1.8) * 3.2;

          if (intensity > 0.15) {
            const alpha = Math.min(0.85, Math.pow(intensity, 1.6) * 0.75);
            // Blend between Warm Pearl White, Acid Lime, and Deep Teal
            if (intensity > 0.72) {
              ctx.fillStyle = `rgba(248, 250, 252, ${alpha})`;
            } else if (intensity > 0.45) {
              ctx.fillStyle = `rgba(212, 255, 0, ${alpha * 0.75})`;
            } else {
              ctx.fillStyle = `rgba(56, 189, 248, ${alpha * 0.45})`;
            }

            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className={`w-full h-full block ${className}`} />;
}
