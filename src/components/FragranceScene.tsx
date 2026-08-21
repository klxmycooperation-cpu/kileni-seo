"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";
import type { Fragrance } from "@/src/content/fragrances";

type FragranceSceneProps = {
  items: Fragrance[];
  cursor: number;
  reducedMotion: boolean;
  direction: -1 | 1;
  onPrevious: () => void;
  onNext: () => void;
};

function modulo(value: number, length: number) {
  return ((value % length) + length) % length;
}

export function FragranceScene({
  items,
  cursor,
  reducedMotion,
  direction,
  onPrevious,
  onNext,
}: FragranceSceneProps) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const wheelTotal = useRef(0);
  const wheelCommitted = useRef(false);
  const wheelIdleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeIndex = modulo(cursor, items.length);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const handleWheel = (event: WheelEvent) => {
      const horizontalGesture = Math.abs(event.deltaX) > Math.abs(event.deltaY) * 1.15;
      if (!horizontalGesture && !event.shiftKey) return;
      event.preventDefault();

      const delta = horizontalGesture ? event.deltaX : event.deltaY;
      if (!wheelCommitted.current) {
        wheelTotal.current += delta;
        if (Math.abs(wheelTotal.current) >= 42) {
          wheelCommitted.current = true;
          if (wheelTotal.current > 0) onNext();
          else onPrevious();
        }
      }

      if (wheelIdleTimer.current) clearTimeout(wheelIdleTimer.current);
      wheelIdleTimer.current = setTimeout(() => {
        wheelTotal.current = 0;
        wheelCommitted.current = false;
      }, 160);
    };

    scene.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      scene.removeEventListener("wheel", handleWheel);
      if (wheelIdleTimer.current) clearTimeout(wheelIdleTimer.current);
    };
  }, [onNext, onPrevious]);

  return (
    <motion.div
      ref={sceneRef}
      className="fragrance-scene"
      role="group"
      tabIndex={0}
      aria-roledescription="карусель ароматов"
      aria-label={`Каталог KILENI. Выбран аромат ${items[activeIndex].id}`}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          onPrevious();
        }
        if (event.key === "ArrowRight") {
          event.preventDefault();
          onNext();
        }
      }}
      onPointerDown={(event) => {
        if (event.pointerType === "mouse" && event.button !== 0) return;
        window.getSelection()?.removeAllRanges();
      }}
    >
      <motion.div
        className="fragrance-scene__drag"
        drag={reducedMotion ? false : "x"}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.28}
        dragMomentum={false}
        dragTransition={{ bounceStiffness: 520, bounceDamping: 36 }}
        onDragStart={() => window.getSelection()?.removeAllRanges()}
        onDragEnd={(_, info) => {
          const shouldMove = Math.abs(info.offset.x) > 48 || Math.abs(info.velocity.x) > 460;
          if (!shouldMove) return;
          if (info.offset.x < 0 || info.velocity.x < -460) onNext();
          else onPrevious();
        }}
      >
        <AnimatePresence initial={false} custom={direction} mode="sync">
          {[cursor - 1, cursor, cursor + 1].map((virtualIndex) => {
            const itemIndex = modulo(virtualIndex, items.length);
            const item = items[itemIndex];
            const position = (virtualIndex - cursor) as -1 | 0 | 1;
            const active = position === 0;

            return (
              <motion.figure
                key={virtualIndex}
                className={`fragrance-scene__frame fragrance-scene__frame--${
                  active ? "active" : position < 0 ? "left" : "right"
                }`}
                initial={{
                  opacity: 0,
                  x: reducedMotion
                    ? position === 0 ? "0%" : position < 0 ? "-80%" : "80%"
                    : position === 0 ? "0%" : position < 0 ? "-98%" : "98%",
                  y: 0,
                  scale: active ? 1 : 0.72,
                }}
                animate={{
                  opacity: active ? 1 : 0.44,
                  x: position === 0 ? "0%" : position < 0 ? "-80%" : "80%",
                  y: position === 0 ? "0%" : "4%",
                  scale: active ? 1 : 0.7,
                }}
                exit={{
                  opacity: 0,
                  x: direction > 0 ? "-112%" : "112%",
                  scale: 0.64,
                }}
                transition={
                  reducedMotion
                    ? { duration: 0 }
                    : {
                        x: { duration: 0.56, ease: [0.22, 1, 0.36, 1] },
                        y: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
                        scale: { duration: 0.52, ease: [0.22, 1, 0.36, 1] },
                        opacity: { duration: 0.3 },
                      }
                }
                style={{ zIndex: active ? 3 : position < 0 ? 1 : 2 }}
                aria-hidden={!active}
                onDragStart={(event) => event.preventDefault()}
              >
                <div className="fragrance-scene__image">
                  <Image
                    src={item.image}
                    alt={active ? item.imageAlt : ""}
                    unoptimized
                    fill
                    priority={active && itemIndex === 0}
                    draggable={false}
                    sizes="(max-width: 640px) 68vw, (max-width: 1024px) 46vw, 36vw"
                    className="object-contain"
                  />
                </div>
                <figcaption className="sr-only">Аромат KILENI {item.id}</figcaption>
              </motion.figure>
            );
          })}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
