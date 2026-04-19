import React from "react";
import { motion } from "framer-motion";

interface DashboardLoadingProps {
  className?: string;
  style?: React.CSSProperties;
  title?: string;
  description?: string;
  durationSec?: number;
}

export default function DashboardLoading({
  className = "",
  style = {} as React.CSSProperties,
  title = "Preparing dashboard",
  description = "Please wait while we update your dashboard...",
  durationSec = 10,
}: DashboardLoadingProps) {
  return (
    <div className={`flex items-center justify-center h-full ${className}`} style={style}>
      <motion.div
        className="flex flex-col items-center gap-5 p-8 w-72"
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.05 }}
        >
          <img src="/logo-watermark.png" alt="Morpheus" className="w-12 h-12 object-contain" />
        </motion.div>

        {/* Title + description */}
        <div className="text-center">
          <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-border/30 rounded-full h-1 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-[#ff5600] to-[#ff8c42] rounded-full"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: durationSec, ease: "linear" }}
          />
        </div>

        {/* Pulsing dots */}
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-[#ff5600]"
              animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
              transition={{
                repeat: Infinity,
                duration: 1.2,
                delay: i * 0.2,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
