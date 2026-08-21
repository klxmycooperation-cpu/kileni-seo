"use client";

import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import { useRef } from "react";
import { usePrefersReducedMotion } from "@/src/lib/use-prefers-reduced-motion";

/**
 * Opening scroll scene for the home page.
 *
 * The section height and sticky positioning are intentionally owned by CSS so
 * they can be tuned at each breakpoint without changing the animation model.
 */
export function IntroReveal() {
  const sectionRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    mass: 0.3,
    restDelta: 0.001,
  });
  const progress = prefersReducedMotion ? scrollYProgress : smoothProgress;

  const wordScale = useTransform(
    progress,
    [0, 0.18, 0.42, 0.74, 1],
    prefersReducedMotion ? [1, 1, 1, 1, 1] : [1, 1, 1.055, 0.86, 0.7],
  );
  const wordY = useTransform(
    progress,
    [0, 0.5, 0.82, 1],
    prefersReducedMotion
      ? ["0svh", "0svh", "0svh", "0svh"]
      : ["0svh", "0svh", "-2svh", "-10svh"],
  );
  const wordOpacity = useTransform(
    scrollYProgress,
    [0, 0.68, 0.86, 0.94],
    prefersReducedMotion ? [1, 1, 1, 1] : [1, 1, 0.34, 0],
  );
  const wordScaleX = useTransform(
    progress,
    [0, 0.24, 0.68, 1],
    prefersReducedMotion ? [1, 1, 1, 1] : [1, 1, 1.035, 1.1],
  );
  const leftHalfX = useTransform(
    progress,
    [0, 0.38, 0.7, 0.94, 1],
    prefersReducedMotion
      ? ["0vw", "0vw", "0vw", "0vw", "0vw"]
      : ["0vw", "0vw", "-2vw", "-17vw", "-22vw"],
  );
  const rightHalfX = useTransform(
    progress,
    [0, 0.38, 0.7, 0.94, 1],
    prefersReducedMotion
      ? ["0vw", "0vw", "0vw", "0vw", "0vw"]
      : ["0vw", "0vw", "2vw", "17vw", "22vw"],
  );

  const ghostOpacity = useTransform(
    scrollYProgress,
    [0, 0.24, 0.38, 0.72, 0.88, 0.94],
    prefersReducedMotion ? [0, 0, 0, 0, 0, 0] : [0, 0, 0.17, 0.14, 0.04, 0],
  );
  const topGhostX = useTransform(
    progress,
    [0.24, 0.9],
    prefersReducedMotion ? ["0vw", "0vw"] : ["-17vw", "14vw"],
  );
  const bottomGhostX = useTransform(
    progress,
    [0.24, 0.9],
    prefersReducedMotion ? ["0vw", "0vw"] : ["17vw", "-14vw"],
  );

  const frameScale = useTransform(
    progress,
    [0, 0.52, 0.92, 1],
    prefersReducedMotion ? [1, 1, 1, 1] : [1, 1, 0.965, 0.94],
  );
  const frameOpacity = useTransform(
    scrollYProgress,
    [0, 0.16, 0.32, 0.72, 0.95],
    prefersReducedMotion ? [0, 0, 0, 0, 0] : [0, 0, 1, 0.72, 0],
  );
  const portalScaleY = useTransform(
    scrollYProgress,
    [0, 0.68, 0.9, 0.94],
    prefersReducedMotion ? [0, 0, 0, 0] : [0, 0, 1, 1],
  );
  const axisOpacity = useTransform(
    scrollYProgress,
    [0, 0.43, 0.58, 0.88, 0.95],
    prefersReducedMotion ? [0, 0, 0, 0, 0] : [0, 0, 1, 1, 0],
  );
  const axisY = useTransform(
    progress,
    [0.43, 0.72, 1],
    prefersReducedMotion ? [0, 0, 0] : [20, 0, -18],
  );

  const captionOpacity = useTransform(
    scrollYProgress,
    [0, 0.58, 0.72, 0.88, 0.95],
    prefersReducedMotion ? [0, 0, 0, 0, 0] : [0, 0, 1, 1, 0],
  );
  const captionY = useTransform(
    progress,
    [0.6, 0.76, 1],
    prefersReducedMotion ? [0, 0, 0] : [24, 0, -12],
  );
  const ruleScale = useTransform(
    progress,
    [0.64, 0.82],
    prefersReducedMotion ? [0, 0] : [0, 1],
  );

  return (
    <section
      ref={sectionRef}
      className="intro-reveal"
      aria-label="Вступление KILENI"
    >
      <div className="intro-reveal__sticky">
        <motion.div
          className="intro-reveal__portal"
          style={{ scaleY: portalScaleY }}
          aria-hidden="true"
        />
        <motion.span
          className="intro-reveal__frame"
          style={{ scale: frameScale, opacity: frameOpacity }}
          aria-hidden="true"
        />

        <motion.p
          className="intro-reveal__ghost intro-reveal__ghost--top"
          style={{ opacity: ghostOpacity, x: topGhostX }}
          aria-hidden="true"
        >
          KILENI
        </motion.p>
        <motion.p
          className="intro-reveal__ghost intro-reveal__ghost--bottom"
          style={{ opacity: ghostOpacity, x: bottomGhostX }}
          aria-hidden="true"
        >
          KILENI
        </motion.p>

        <motion.p
          className="intro-reveal__word"
          style={{
            scale: wordScale,
            scaleX: wordScaleX,
            y: wordY,
            opacity: wordOpacity,
          }}
        >
          <motion.span className="intro-reveal__word-half" style={{ x: leftHalfX }}>
            KIL
          </motion.span>
          <motion.span className="intro-reveal__word-half" style={{ x: rightHalfX }}>
            ENI
          </motion.span>
        </motion.p>

        <motion.div
          className="intro-reveal__axis"
          style={{ opacity: axisOpacity, y: axisY }}
          aria-hidden="true"
        >
          <span>001</span>
          <span>KILENI / КАТАЛОГ</span>
        </motion.div>

        <motion.div
          className="intro-reveal__transition"
          style={{ opacity: captionOpacity, y: captionY }}
        >
          <motion.span
            className="intro-reveal__rule"
            style={{ scaleX: ruleScale }}
            aria-hidden="true"
          />
          <p className="intro-reveal__label">Каталог ароматов</p>
          <p className="intro-reveal__hint">
            Продолжайте прокрутку
            <span aria-hidden="true">↓</span>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
