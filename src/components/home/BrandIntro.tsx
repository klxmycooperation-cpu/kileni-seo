"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  INTRO_DURATION_MS,
  INTRO_FINISHED_EVENT,
  INTRO_SCENE_DURATION_MS,
  INTRO_SESSION_KEY,
} from "./brand-intro-config";

declare global {
  interface Window {
    __kileniStartBrandIntro?: () => void;
    __kileniFinishBrandIntro?: () => void;
    __kileniBrandIntroReady?: boolean;
  }
}

type Geometry = {
  baseline: number;
  kilX: number;
  kilWidth: number;
  eX: number;
  niX: number;
  niWidth: number;
  sX: number;
  oX: number;
  oWidth: number;
  finalCenterShift: number;
};

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const progress = (time: number, start: number, end: number) => clamp((time - start) / (end - start));
const lerp = (from: number, to: number, amount: number) => from + (to - from) * amount;
const easeInQuad = (x: number) => x * x;
const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);
const easeOutQuint = (x: number) => 1 - Math.pow(1 - x, 5);
const easeInOutCubic = (x: number) => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const smooth = (x: number) => x * x * (3 - 2 * x);
// The animation is rendered on the 7-second scene timeline but played in a
// shorter wall-clock interval. Keep diagnostic phase markers on that same
// timeline so Safari does not record the "E only" frame after S has appeared.
const sceneToWallClockMs = (sceneMs: number) => Math.round((sceneMs / INTRO_SCENE_DURATION_MS) * INTRO_DURATION_MS);
const INTRO_E_HOLD_SIGNAL_MS = sceneToWallClockMs(2_700);
const INTRO_SEO_FORMING_SIGNAL_MS = sceneToWallClockMs(3_340);
const setOpacity = (element: SVGElement | null, value: number) => element?.setAttribute("opacity", String(clamp(value)));
const transformAt = (x: number, y: number, rotation = 0, scale = 1, originX = x, originY = y - 80) =>
  `translate(${x} ${y}) rotate(${rotation} ${originX - x} ${originY - y}) scale(${scale})`;

/** The approved v9 scene, kept in one SVG coordinate space to prevent layout jumps. */
export function BrandIntro() {
  const [visible, setVisible] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [audioSourceEnabled, setAudioSourceEnabled] = useState(false);
  const rafRef = useRef<number | null>(null);
  const geometryRef = useRef<Geometry | null>(null);
  const masterRef = useRef<SVGGElement | null>(null);
  const kilRef = useRef<SVGGElement | null>(null);
  const niRef = useRef<SVGGElement | null>(null);
  const seoRef = useRef<SVGGElement | null>(null);
  const impactRef = useRef<SVGGElement | null>(null);
  const pairRef = useRef<SVGGElement | null>(null);
  const sRef = useRef<SVGGElement | null>(null);
  const eRef = useRef<SVGGElement | null>(null);
  const oRef = useRef<SVGGElement | null>(null);
  const kilTextRef = useRef<SVGTextElement | null>(null);
  const niTextRef = useRef<SVGTextElement | null>(null);
  const sTextRef = useRef<SVGTextElement | null>(null);
  const eTextRef = useRef<SVGTextElement | null>(null);
  const oTextRef = useRef<SVGTextElement | null>(null);
  const accentRef = useRef<SVGLineElement | null>(null);
  const sloganFirstRef = useRef<SVGGElement | null>(null);
  const sloganSecondRef = useRef<SVGGElement | null>(null);
  const sloganWindowFirstRef = useRef<SVGRectElement | null>(null);
  const sloganWindowSecondRef = useRef<SVGRectElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    const viewport = window.visualViewport;
    const syncViewportHeight = () => {
      root.style.setProperty(
        "--kileni-intro-viewport-height",
        `${Math.round(viewport?.height ?? window.innerHeight)}px`,
      );
    };

    syncViewportHeight();
    viewport?.addEventListener("resize", syncViewportHeight);
    window.addEventListener("resize", syncViewportHeight);
    return () => {
      viewport?.removeEventListener("resize", syncViewportHeight);
      window.removeEventListener("resize", syncViewportHeight);
      root.style.removeProperty("--kileni-intro-viewport-height");
    };
  }, []);

  const renderAt = useCallback((rawTime: number) => {
    const geometry = geometryRef.current;
    if (!geometry) return;
    const time = clamp(rawTime, 0, 7_000);
    const intro = easeOutCubic(progress(time, 160, 720));
    const exit = 1 - smooth(progress(time, 6_650, 7_000));
    const wordScale = lerp(0.985, 1, intro);
    const separation = easeInOutCubic(progress(time, 1_180, 1_430));
    const kilFallP = progress(time, 1_460, 2_220);
    const niFallP = progress(time, 1_680, 2_440);
    const kilX = geometry.kilX + lerp(0, -10, separation);
    const niX = geometry.niX + lerp(0, 10, separation);
    const kilY = geometry.baseline + lerp(0, 720, easeInQuad(kilFallP));
    const niY = geometry.baseline + lerp(0, 720, easeInQuad(niFallP));

    kilRef.current?.setAttribute("transform", transformAt(kilX, kilY, lerp(0, -2.7, easeInQuad(kilFallP)), wordScale, kilX + geometry.kilWidth / 2, kilY - 78));
    niRef.current?.setAttribute("transform", transformAt(niX, niY, lerp(0, 1.9, easeInQuad(niFallP)), wordScale, niX + geometry.niWidth / 2, niY - 78));
    setOpacity(kilRef.current, intro * (1 - smooth(progress(time, 2_130, 2_250))));
    setOpacity(niRef.current, intro * (1 - smooth(progress(time, 2_350, 2_470))));

    eRef.current?.setAttribute("transform", transformAt(geometry.eX, geometry.baseline, 0, wordScale));
    const eBlue = smooth(progress(time, 2_180, 2_700)) * (1 - smooth(progress(time, 4_040, 4_380)));
    if (eTextRef.current) {
      const theme = document.documentElement.dataset.kileniTheme;
      const darkSurface = theme === "dark" || theme === "signal";
      const red = Math.round(lerp(darkSurface ? 247 : 10, 65, eBlue));
      const green = Math.round(lerp(darkSurface ? 248 : 16, 100, eBlue));
      const blue = Math.round(lerp(darkSurface ? 252 : 32, 255, eBlue));
      eTextRef.current.style.fill = `rgb(${red} ${green} ${blue})`;
    }
    setOpacity(eRef.current, intro);

    seoRef.current?.setAttribute("transform", `translate(${geometry.finalCenterShift * smooth(progress(time, 2_700, 3_500))} 0)`);
    const sIn = easeOutQuint(progress(time, 3_060, 3_560));
    const sSettle = smooth(progress(time, 3_560, 3_710));
    const sX = geometry.sX + lerp(-132, 0, sIn) + Math.sin(sSettle * Math.PI) * 2;
    sRef.current?.setAttribute("transform", transformAt(sX, geometry.baseline, 0, wordScale));
    setOpacity(sRef.current, intro * smooth(progress(time, 3_060, 3_310)));

    const oIn = easeOutCubic(progress(time, 3_710, 4_300));
    const oImpactIn = easeOutCubic(progress(time, 4_300, 4_400));
    const oImpactOut = easeOutCubic(progress(time, 4_400, 4_680));
    let oTravel = lerp(600, -24, oIn);
    if (time >= 4_300) oTravel = lerp(-24, 10, oImpactIn);
    if (time >= 4_400) oTravel = lerp(10, 0, oImpactOut);
    oRef.current?.setAttribute("transform", `translate(${geometry.oX + oTravel} ${geometry.baseline}) rotate(${lerp(420, 0, oIn)} ${geometry.oWidth / 2} -78) scale(${wordScale})`);
    setOpacity(oRef.current, intro * smooth(progress(time, 3_710, 3_900)));

    const impactP = progress(time, 4_300, 4_680);
    const impactWave = Math.sin(impactP * Math.PI * 2.2) * Math.pow(1 - impactP, 2);
    impactRef.current?.setAttribute("transform", `translate(${-6 * impactWave} 0)`);
    pairRef.current?.setAttribute("transform", `translate(${-16 * impactWave} 0)`);

    const accentIn = easeOutCubic(progress(time, 4_680, 4_860));
    const accentHalf = lerp(0, 106, accentIn);
    accentRef.current?.setAttribute("x1", String(960 - accentHalf));
    accentRef.current?.setAttribute("x2", String(960 + accentHalf));
    setOpacity(accentRef.current, accentIn * 0.8 * exit);

    const sloganFirst = easeOutCubic(progress(time, 4_860, 5_220));
    const sloganSecond = easeOutCubic(progress(time, 5_080, 5_440));
    sloganWindowFirstRef.current?.setAttribute("y", String(lerp(700, 654, sloganFirst)));
    sloganWindowFirstRef.current?.setAttribute("height", String(lerp(0, 58, sloganFirst)));
    sloganWindowSecondRef.current?.setAttribute("y", String(lerp(758, 712, sloganSecond)));
    sloganWindowSecondRef.current?.setAttribute("height", String(lerp(0, 58, sloganSecond)));
    setOpacity(sloganFirstRef.current, sloganFirst);
    setOpacity(sloganSecondRef.current, sloganSecond);
    masterRef.current?.setAttribute("opacity", String(exit));
  }, []);

  useLayoutEffect(() => {
    const root = document.documentElement;
    const forced = new URLSearchParams(window.location.search).get("intro") === "1";
    let seenThisSession = false;
    try {
      seenThisSession = !forced && window.sessionStorage.getItem(INTRO_SESSION_KEY) === "1";
    } catch {}
    if (seenThisSession) {
      root.dataset.kileniIntro = "done";
      setVisible(false);
      return;
    }
    if (!["pending", "play", "finishing"].includes(root.dataset.kileniIntro ?? "")) {
      root.dataset.kileniIntro = "pending";
    }

    let cancelled = false;
    let measurementAttempts = 0;
    let measurementFrame: number | null = null;
    const applyGeometry = (kilWidth: number, eWidth: number, niWidth: number, sWidth: number, oWidth: number, sBoundsX: number, oBoundsX: number, oBoundsWidth: number) => {
      const join = -4;
      const left = 960 - (kilWidth + eWidth + niWidth + join * 2) / 2;
      const baseline = 570;
      const sX = left + kilWidth + join - sWidth - 14;
      const oX = left + kilWidth + eWidth + join + 14;
      geometryRef.current = {
        baseline,
        kilX: left,
        kilWidth,
        eX: left + kilWidth + join,
        niX: left + kilWidth + eWidth + join * 2,
        niWidth,
        sX,
        oX,
        oWidth,
        finalCenterShift: 960 - (sX + sBoundsX + oX + oBoundsX + oBoundsWidth) / 2,
      };
      const staticFrame = window.matchMedia("(prefers-reduced-motion: reduce)").matches
        || document.documentElement.dataset.kileniIntroMode === "lite";
      renderAt(staticFrame ? 5_600 : 0);
      window.__kileniBrandIntroReady = true;
      document.documentElement.dataset.kileniIntroReady = "true";
      window.__kileniStartBrandIntro?.();
    };
    const measure = () => {
      if (cancelled) return;
      const kilText = kilTextRef.current;
      const niText = niTextRef.current;
      const sText = sTextRef.current;
      const eText = eTextRef.current;
      const oText = oTextRef.current;
      if (!kilText || !niText || !sText || !eText || !oText) return;
      const kilWidth = kilText.getComputedTextLength();
      const eWidth = eText.getComputedTextLength();
      const niWidth = niText.getComputedTextLength();
      const sWidth = sText.getComputedTextLength();
      const oWidth = oText.getComputedTextLength();
      const sBounds = sText.getBBox();
      const oBounds = oText.getBBox();
      applyGeometry(kilWidth, eWidth, niWidth, sWidth, oWidth, sBounds.x, oBounds.x, oBounds.width);
    };

    const measureWhenStyled = () => {
      if (cancelled) return;
      const kilText = kilTextRef.current;
      const styled = kilText && Number.parseFloat(getComputedStyle(kilText).fontSize) >= 200;
      const measurable = kilText && kilText.getComputedTextLength() >= 200;
      if (!styled || !measurable) {
        measurementAttempts += 1;
        if (measurementAttempts >= 45) {
          // Safari can delay SVG font metrics. Approximate geometry is better
          // than keeping the whole page covered until the global safety cap.
          applyGeometry(360, 145, 245, 138, 166, 0, 0, 166);
          return;
        }
        measurementFrame = requestAnimationFrame(measureWhenStyled);
        return;
      }
      measure();
    };

    measurementFrame = requestAnimationFrame(measureWhenStyled);
    void document.fonts.ready.then(() => {
      if (!geometryRef.current && !cancelled) measurementFrame = requestAnimationFrame(measureWhenStyled);
    });
    return () => {
      cancelled = true;
      if (measurementFrame !== null) cancelAnimationFrame(measurementFrame);
      window.__kileniBrandIntroReady = false;
      delete document.documentElement.dataset.kileniIntroReady;
    };
  }, [renderAt]);

  useEffect(() => {
    const root = document.documentElement;
    const audio = audioRef.current;
    const stopAnimation = () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
    const frame = () => {
      const elapsed = performance.now() - Number(root.dataset.kileniIntroStartedAt || performance.now());
      renderAt((elapsed / INTRO_DURATION_MS) * INTRO_SCENE_DURATION_MS);
      if (elapsed >= INTRO_E_HOLD_SIGNAL_MS && root.dataset.kileniIntroEHoldReached !== "true") {
        root.dataset.kileniIntroEHoldTransform = eRef.current?.getAttribute("transform") ?? "";
        root.dataset.kileniIntroEHoldSOpacity = sRef.current?.getAttribute("opacity") ?? "0";
        root.dataset.kileniIntroEHoldReached = "true";
      }
      if (elapsed >= INTRO_SEO_FORMING_SIGNAL_MS && root.dataset.kileniIntroSeoFormingReached !== "true") {
        root.dataset.kileniIntroSeoFormingTransform = eRef.current?.getAttribute("transform") ?? "";
        root.dataset.kileniIntroSeoFormingSOpacity = sRef.current?.getAttribute("opacity") ?? "0";
        root.dataset.kileniIntroSeoFormingReached = "true";
      }
      if (root.dataset.kileniIntro === "play") rafRef.current = requestAnimationFrame(frame);
    };
    const begin = () => {
      stopAnimation();
      if (root.dataset.kileniIntro === "play") {
        rafRef.current = requestAnimationFrame(frame);
      }
    };
    const syncState = () => {
      if (root.dataset.kileniIntro === "done") {
        stopAnimation();
        audio?.pause();
        const active = document.activeElement;
        if (
          root.dataset.kileniIntroFocus !== "tab"
          && (active === document.body || active === document.documentElement)
        ) {
          const main = document.getElementById("main-content");
          if (main) {
            main.setAttribute("tabindex", "-1");
            main.focus({ preventScroll: true });
          }
        }
        setVisible(false);
      } else if (root.dataset.kileniIntro === "finishing") {
        stopAnimation();
        audio?.pause();
        renderAt(5_600);
      } else if (root.dataset.kileniIntro === "reduced") {
        stopAnimation();
        audio?.pause();
        renderAt(5_600);
      } else begin();
    };
    const observer = new MutationObserver(syncState);
    observer.observe(root, { attributes: true, attributeFilter: ["data-kileni-intro"] });
    window.addEventListener(INTRO_FINISHED_EVENT, syncState);
    syncState();
    return () => {
      stopAnimation();
      audio?.pause();
      observer.disconnect();
      window.removeEventListener(INTRO_FINISHED_EVENT, syncState);
    };
  }, [renderAt]);

  const enableSound = () => {
    const audio = audioRef.current;
    if (!audio) return;
    setAudioSourceEnabled(true);
    if (!audio.getAttribute("src")) {
      audio.src = "/brand/kileni-intro-foley-v9.m4a";
      audio.load();
    }
    audio.currentTime = 0;
    audio.playbackRate = Math.min(4, INTRO_SCENE_DURATION_MS / INTRO_DURATION_MS);
    void audio.play().then(() => setSoundEnabled(true)).catch(() => setSoundEnabled(false));
  };

  const skipIntro = () => window.__kileniFinishBrandIntro?.();

  if (!visible) return null;
  return (
    <div className="brand-intro brand-intro-v9" role="region" aria-label="Заставка KILENI">
      <svg className="brand-intro-v9__scene" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
        <defs>
          <clipPath id="kileni-v9-slogan-first"><rect ref={sloganWindowFirstRef} x="390" y="700" width="1140" height="0" /></clipPath>
          <clipPath id="kileni-v9-slogan-second"><rect ref={sloganWindowSecondRef} x="390" y="758" width="1140" height="0" /></clipPath>
        </defs>
        <g className="brand-intro-v9__fallback">
          <text className="brand-intro-v9__fallback-word" x="960" y="570" textAnchor="middle">KILENI</text>
        </g>
        <g className="brand-intro-v9__viewport">
          <g ref={masterRef}>
            <g ref={kilRef} className="brand-intro-v9__kil"><text ref={kilTextRef} className="brand-intro-v9__letter">KIL</text></g>
            <g ref={niRef} className="brand-intro-v9__ni"><text ref={niTextRef} className="brand-intro-v9__letter">NI</text></g>
            <g ref={seoRef} className="brand-intro-v9__seo"><g ref={impactRef}><g ref={pairRef}>
              <g ref={sRef} className="brand-intro-v9__s"><text ref={sTextRef} className="brand-intro-v9__letter">S</text></g>
              <g ref={eRef} className="brand-intro-v9__e"><text ref={eTextRef} className="brand-intro-v9__letter">E</text></g>
            </g><g ref={oRef} className="brand-intro-v9__o"><text ref={oTextRef} className="brand-intro-v9__letter">O</text></g></g></g>
            <line ref={accentRef} className="brand-intro-v9__accent" x1="960" x2="960" y1="640" y2="640" />
            <g ref={sloganFirstRef} clipPath="url(#kileni-v9-slogan-first)"><text className="brand-intro-v9__slogan" x="960" y="700" textAnchor="middle">Разбираем по буквам.</text></g>
            <g ref={sloganSecondRef} clipPath="url(#kileni-v9-slogan-second)"><text className="brand-intro-v9__slogan brand-intro-v9__slogan--blue" x="960" y="758" textAnchor="middle">Продвигаем по делу.</text></g>
          </g>
        </g>
      </svg>
      <audio ref={audioRef} preload="none" src={audioSourceEnabled ? "/brand/kileni-intro-foley-v9.m4a" : undefined} />
      <div className="brand-intro-v9__controls">
        {!soundEnabled ? <button type="button" className="brand-intro-v9__sound" data-kileni-intro-sound onClick={enableSound}>Включить звук</button> : null}
        <button type="button" className="brand-intro-v9__skip" data-kileni-intro-skip onClick={skipIntro}>Пропустить заставку</button>
      </div>
    </div>
  );
}
