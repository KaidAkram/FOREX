"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export function QuantumRouteProgress() {
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    // Whenever pathname changes, trigger a rapid 250ms laser beam sweep
    setIsNavigating(true);
    const timer = setTimeout(() => {
      setIsNavigating(false);
    }, 280);
    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <AnimatePresence>
      {isNavigating && (
        <div className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none h-[2.5px] overflow-hidden">
          <motion.div
            initial={{ x: "-100%", opacity: 1 }}
            animate={{ x: "0%", opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.24,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="w-full h-full bg-gradient-to-r from-emerald-500 via-[#D4FF00] to-teal-300 shadow-[0_0_14px_rgba(212,255,0,0.85),0_0_28px_rgba(16,185,129,0.5)]"
          />
        </div>
      )}
    </AnimatePresence>
  );
}
