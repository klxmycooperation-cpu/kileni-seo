"use client";

import Link from "next/link";
import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion";
import { useCallback, useRef, useState } from "react";
import { fragrances } from "@/src/content/fragrances";
import { siteContent } from "@/src/content/site";
import { usePrefersReducedMotion } from "@/src/lib/use-prefers-reduced-motion";
import { FragranceScene } from "./FragranceScene";
import { FragranceSwitcher } from "./FragranceSwitcher";

export function HeroSpectrum() {
  const [cursor, setCursor] = useState(0);
  const [direction, setDirection] = useState<-1 | 1>(1);
  const heroRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const activeIndex = ((cursor % fragrances.length) + fragrances.length) % fragrances.length;
  const active = fragrances[activeIndex];
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  const numberY = useTransform(scrollYProgress, [0, 1], [0, prefersReducedMotion ? 0 : 120]);
  const copyY = useTransform(scrollYProgress, [0, 0.72], [0, prefersReducedMotion ? 0 : -92]);
  const copyOpacity = useTransform(scrollYProgress, [0, 0.64], [1, prefersReducedMotion ? 1 : 0]);
  const sceneY = useTransform(scrollYProgress, [0, 1], [0, prefersReducedMotion ? 0 : 48]);

  const select = useCallback((index: number) => {
    const normalized = (index + fragrances.length) % fragrances.length;
    if (normalized === activeIndex) return;
    let delta = normalized - activeIndex;
    if (delta > fragrances.length / 2) delta -= fragrances.length;
    if (delta < -fragrances.length / 2) delta += fragrances.length;
    setDirection(delta > 0 ? 1 : -1);
    setCursor((current) => current + delta);
  }, [activeIndex]);
  const previous = useCallback(
    () => {
      setDirection(-1);
      setCursor((current) => current - 1);
    },
    [],
  );
  const next = useCallback(
    () => {
      setDirection(1);
      setCursor((current) => current + 1);
    },
    [],
  );

  return (
    <section
      ref={heroRef}
      className="hero-spectrum"
      aria-labelledby="hero-title"
      style={
        {
          "--hero-ink": active.palette.ink,
          "--hero-deep": active.palette.deep,
          "--hero-mid": active.palette.mid,
          "--hero-pale": active.palette.pale,
          "--hero-mist": active.palette.mist,
        } as React.CSSProperties
      }
    >
        <div className="hero-spectrum__wash" aria-hidden="true" />
        <motion.div
          className="hero-spectrum__brandmark"
          aria-hidden="true"
          initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 18 }}
          animate={{ opacity: 0.72, y: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.72, ease: "easeOut" }}
        >
          KILENI
        </motion.div>

        <motion.div className="hero-spectrum__number-wrap" style={{ y: numberY }} aria-hidden="true">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={active.id}
              className="hero-spectrum__number"
              initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 44 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: prefersReducedMotion ? 0 : -32 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.68, ease: [0.22, 1, 0.36, 1] }}
            >
              {active.id}
            </motion.span>
          </AnimatePresence>
        </motion.div>

        <motion.div className="hero-spectrum__scene-wrap" style={{ y: sceneY }}>
          <FragranceScene
            items={fragrances}
            cursor={cursor}
            reducedMotion={prefersReducedMotion}
            direction={direction}
            onPrevious={previous}
            onNext={next}
          />
        </motion.div>

        <motion.div
          className="hero-spectrum__copy"
          style={{ y: copyY, opacity: copyOpacity }}
          initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: prefersReducedMotion ? 0 : 0.72,
            delay: prefersReducedMotion ? 0 : 0.86,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <p className="eyebrow hero-spectrum__eyebrow">
            {siteContent.brand} <span>/</span> {siteContent.concept}
          </p>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={active.id}
              aria-live="polite"
              aria-atomic="true"
              initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: prefersReducedMotion ? 0 : -8 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.44 }}
            >
              <h1 id="hero-title">
                <span>Выбранный аромат / {active.id}</span>
                KILENI {active.id}
              </h1>
              <p className="hero-spectrum__phrase">{active.heroPhrase}</p>
            </motion.div>
          </AnimatePresence>
          <p className="hero-spectrum__collection-line">
            Позиция {activeIndex + 1} из {fragrances.length} в текущем каталоге
          </p>
          <div className="hero-spectrum__actions">
            <Link className="button button--dark" href={`/fragrance/${active.slug}`}>
              Страница аромата <span aria-hidden="true">↗</span>
            </Link>
            <Link className="button button--line" href="#collection">
              Весь каталог <span aria-hidden="true">↓</span>
            </Link>
          </div>
        </motion.div>

        <motion.div
          className="hero-spectrum__switcher"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.6, delay: prefersReducedMotion ? 0 : 0.94 }}
        >
          <div className="hero-spectrum__carousel-controls">
            <button
              className="hero-spectrum__carousel-button"
              type="button"
              aria-label="Предыдущий аромат"
              onClick={previous}
            >
              <span aria-hidden="true">←</span>
            </button>
            <p className="hero-spectrum__gesture-hint">
              ∞ Перетащите мышью · трекпад · свайп
            </p>
            <button
              className="hero-spectrum__carousel-button"
              type="button"
              aria-label="Следующий аромат"
              onClick={next}
            >
              <span aria-hidden="true">→</span>
            </button>
          </div>
          <FragranceSwitcher
            fragrances={fragrances}
            activeIndex={activeIndex}
            onSelect={select}
          />
        </motion.div>

        <div className="hero-spectrum__side-label" aria-hidden="true">
          <span>КАТАЛОГ / KILENI</span>
          <span>ЛИСТАЙТЕ</span>
        </div>
    </section>
  );
}
