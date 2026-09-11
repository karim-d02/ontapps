"use client";

/**
 * Landing-page stats grid — layout and 3D tilt-hover mechanic adapted from
 * Kokonut UI's bento-grid (installed via `npx shadcn add @kokonutui/bento-grid`),
 * stripped of its AI-demo content, brand icons, gradients, and entrance
 * animation to fit this site's monochrome token system. Renders a fixed set
 * of Card + Stat tiles instead of Kokonut's feature renderers.
 */

import { motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { Stat } from "@/components/ui/stat";

export interface BentoStatItem {
  value: ReactNode;
  label: string;
}

function BentoTile({ item }: { item: BentoStatItem }) {
  const prefersReducedMotion = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-100, 100], [2, -2]);
  const rotateY = useTransform(x, [-100, 100], [-2, 2]);

  function handleMouseMove(event: React.MouseEvent<HTMLDivElement>) {
    if (prefersReducedMotion) return;
    const rect = event.currentTarget.getBoundingClientRect();
    x.set(((event.clientX - rect.left) / rect.width - 0.5) * 100);
    y.set(((event.clientY - rect.top) / rect.height - 0.5) * 100);
  }

  function handleMouseLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.div
      className="h-full"
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      style={prefersReducedMotion ? undefined : { rotateX, rotateY, transformStyle: "preserve-3d" }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <Card interactive className="flex h-full items-center justify-center py-8 text-center">
        <Stat value={item.value} label={item.label} size="lg" />
      </Card>
    </motion.div>
  );
}

export function BentoGrid({ items }: { items: BentoStatItem[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {items.map((item) => (
        <BentoTile key={item.label} item={item} />
      ))}
    </div>
  );
}
