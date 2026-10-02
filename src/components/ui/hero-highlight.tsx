"use client";

import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import { type MouseEvent, type ReactNode } from "react";

type HeroHighlightProps = {
  children: ReactNode;
  className?: string;
  containerClassName?: string;
};

const quietDots = `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='16' height='16' fill='none'%3E%3Ccircle fill='%23304763' cx='10' cy='10' r='2.2'/%3E%3C/svg%3E")`;
const activeDots = `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='16' height='16' fill='none'%3E%3Ccircle fill='%237e9cff' cx='10' cy='10' r='2.2'/%3E%3C/svg%3E")`;

/** A pointer-led dot field used once for the high-intent audit action. */
export function HeroHighlight({ children, className, containerClassName }: HeroHighlightProps) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const maskImage = useMotionTemplate`radial-gradient(190px circle at ${mouseX}px ${mouseY}px, black 0%, transparent 100%)`;

  const handleMouseMove = ({ currentTarget, clientX, clientY }: MouseEvent<HTMLDivElement>) => {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  };

  return (
    <div
      className={["hero-highlight", containerClassName].filter(Boolean).join(" ")}
      data-highlight-theme="kileni"
      onMouseMove={handleMouseMove}
    >
      <div className="hero-highlight__dots" aria-hidden="true" style={{ backgroundImage: quietDots }} />
      <motion.div
        className="hero-highlight__dots hero-highlight__dots--active"
        aria-hidden="true"
        style={{ backgroundImage: activeDots, WebkitMaskImage: maskImage, maskImage }}
      />
      <div className={["hero-highlight__content", className].filter(Boolean).join(" ")}>{children}</div>
    </div>
  );
}
