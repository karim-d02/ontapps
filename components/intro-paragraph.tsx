"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";

export function IntroParagraph({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "start center"],
  });
  const opacity = useTransform(scrollYProgress, [0, 1], [0.2, 1]);

  return (
    <motion.p
      ref={ref}
      className="mt-section-sm max-w-xl text-body text-muted-foreground"
      style={prefersReducedMotion ? undefined : { opacity }}
    >
      {children}
    </motion.p>
  );
}
