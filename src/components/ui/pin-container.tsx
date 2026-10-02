"use client";

import { motion, useReducedMotion } from "framer-motion";
import { type ReactNode, useState } from "react";

type PinContainerProps = {
  children: ReactNode;
  href: string;
  ariaLabel: string;
  className?: string;
};

/** A single, standalone perspective CTA. It stays a normal link without JavaScript. */
export function PinContainer({ children, href, ariaLabel, className }: PinContainerProps) {
  const [active, setActive] = useState(false);
  const reduceMotion = useReducedMotion();

  return (
    <a
      className={["pin-container", className].filter(Boolean).join(" ")}
      href={href}
      aria-label={ariaLabel}
      data-active={active ? "true" : "false"}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      onFocus={() => setActive(true)}
      onBlur={() => setActive(false)}
    >
      <div className="pin-container__stage">
        <motion.div
          className="pin-container__surface"
          animate={reduceMotion ? undefined : { rotateX: active ? 34 : 0, scale: active ? 0.9 : 1 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          {children}
        </motion.div>

        <div className="pin-container__perspective" aria-hidden="true">
          <div className="pin-container__beam" />
          <div className="pin-container__beam pin-container__beam--soft" />
          <div className="pin-container__point" />
          <div className="pin-container__rings">
            {[0, 2, 4].map((delay) => (
              <motion.i
                key={delay}
                animate={reduceMotion ? undefined : { opacity: [0, 1, 0.45, 0], scale: [0, 1, 1, 1.12] }}
                transition={reduceMotion ? undefined : { duration: 6, repeat: Infinity, delay, ease: "easeOut" }}
              />
            ))}
          </div>
        </div>
      </div>
    </a>
  );
}
