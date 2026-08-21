"use client";

import { useLayoutEffect, useState } from "react";
import { INTRO_DURATION_MS, INTRO_SESSION_KEY, REPEAT_DURATION_MS } from "./brand-intro-config";

/**
 * A first-visit brand reveal that never owns pointer or keyboard input.
 * The inline bootstrap runs before the overlay markup is parsed, preventing a
 * repeat-visit flash while keeping the finished hero as the no-JS fallback.
 */
export function BrandIntro() {
  const [visible, setVisible] = useState(true);

  useLayoutEffect(() => {
    const root = document.documentElement;
    const bootstrapWindow = window as Window & {
      __kileniIntroBootstrapRan?: boolean;
      __kileniIntroCleanup?: () => void;
      __kileniIntroReactMountedOnce?: boolean;
    };
    const mountedBefore = bootstrapWindow.__kileniIntroReactMountedOnce === true;
    bootstrapWindow.__kileniIntroReactMountedOnce = true;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let mode = root.dataset.kileniIntro;

    const bootstrapAlreadyFinished = mode === "done"
      && bootstrapWindow.__kileniIntroBootstrapRan === true
      && !mountedBefore;

    if (!reducedMotion && !bootstrapAlreadyFinished && mode !== "play" && mode !== "repeat") {
      let seen = false;
      try {
        seen = window.sessionStorage.getItem(INTRO_SESSION_KEY) === "1";
      } catch {
        // A private context can disable session storage.
      }
      mode = seen ? "repeat" : "play";
      root.dataset.kileniIntroStartedAt = String(performance.now());
      root.dataset.kileniIntro = mode;
    }

    bootstrapWindow.__kileniIntroCleanup?.();
    const shouldAnimate = !reducedMotion && (mode === "play" || mode === "repeat");

    if (!shouldAnimate) {
      root.dataset.kileniIntro = "done";
      delete root.dataset.kileniIntroStartedAt;
      setVisible(false);
      return;
    }

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      root.dataset.kileniIntro = "done";
      delete root.dataset.kileniIntroStartedAt;
      try {
        window.sessionStorage.setItem(INTRO_SESSION_KEY, "1");
      } catch {
        // Storage can be unavailable in strict privacy modes.
      }
      setVisible(false);
    };

    const duration = mode === "repeat" ? REPEAT_DURATION_MS : INTRO_DURATION_MS;
    const startedAt = Number(root.dataset.kileniIntroStartedAt);
    const elapsed = Number.isFinite(startedAt) ? performance.now() - startedAt : 0;
    const timer = window.setTimeout(finish, Math.max(0, duration - elapsed));
    const capture = { capture: true } as const;
    const passiveCapture = { capture: true, passive: true } as const;

    window.addEventListener("pointerdown", finish, passiveCapture);
    window.addEventListener("keydown", finish, capture);
    window.addEventListener("wheel", finish, passiveCapture);
    window.addEventListener("focusin", finish, capture);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", finish, capture);
      window.removeEventListener("keydown", finish, capture);
      window.removeEventListener("wheel", finish, capture);
      window.removeEventListener("focusin", finish, capture);
    };
  }, []);

  return (
    visible ? (
      <div className="brand-intro" aria-hidden="true">
        <div className="brand-intro__sequence">
          <span className="brand-intro__initial">KILENI</span>
          <span className="brand-intro__split" aria-hidden="true">
            <span className="brand-intro__split-kil">KIL</span>
            <span className="brand-intro__split-e">E</span>
            <span className="brand-intro__split-ni">NI</span>
          </span>
          <span className="brand-intro__seo" aria-hidden="true">
            <span className="brand-intro__seo-letter--s">S</span>
            <span className="brand-intro__seo-letter--e">E</span>
            <span className="brand-intro__seo-letter--o">O</span>
          </span>
          <span className="brand-intro__slogan">Разбираем по буквам</span>
        </div>
      </div>
    ) : null
  );
}
