"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { INTRO_FINISHED_EVENT, INTRO_SESSION_KEY } from "./brand-intro-config";

declare global {
  interface Window {
    __kileniStartBrandIntro?: () => void;
    __kileniFinishBrandIntro?: () => void;
    __kileniBrandIntroReady?: boolean;
  }
}

const PORTRAIT_MEDIA = "(orientation: portrait)";
const DESKTOP_VIDEO = "/brand/kileni-welcome-desktop.mp4";
const MOBILE_VIDEO = "/brand/kileni-welcome-mobile.mp4";

export function BrandIntro({ locale }: { locale: "ru" | "en" }) {
  const [visible, setVisible] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [staticPoster, setStaticPoster] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const staticReadyRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    const viewport = window.visualViewport;
    const syncViewportHeight = () => root.style.setProperty(
      "--kileni-intro-viewport-height",
      `${Math.round(viewport?.height ?? window.innerHeight)}px`,
    );
    syncViewportHeight();
    viewport?.addEventListener("resize", syncViewportHeight);
    window.addEventListener("resize", syncViewportHeight);
    return () => {
      viewport?.removeEventListener("resize", syncViewportHeight);
      window.removeEventListener("resize", syncViewportHeight);
      root.style.removeProperty("--kileni-intro-viewport-height");
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const video = videoRef.current;
    if (!visible || !video) return;
    const forced = new URLSearchParams(window.location.search).get("intro") === "1"
      || (performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined)?.type === "reload";
    const reserved = ["pending", "preview", "play", "reduced", "finishing"].includes(root.dataset.kileniIntro ?? "");
    let seen = false;
    try { seen = !forced && !reserved && sessionStorage.getItem(INTRO_SESSION_KEY) === "1"; } catch {}
    if (seen || root.dataset.kileniIntro === "done") {
      root.dataset.kileniIntro = "done";
      setVisible(false);
      return;
    }
    if (!["pending", "preview", "play", "reduced", "finishing"].includes(root.dataset.kileniIntro ?? "")) {
      root.dataset.kileniIntro = "pending";
    }

    const portrait = window.matchMedia(PORTRAIT_MEDIA);
    let resumeTime = 0;
    let disposed = false;
    let playbackAttempt = 0;
    const finish = () => window.__kileniFinishBrandIntro?.();
    const play = () => {
      if (document.visibilityState !== "visible") return;
      if (!video.paused || video.ended) return;
      const attempt = ++playbackAttempt;
      void video.play().catch(() => {
        // A background pause or orientation change can abort our own pending
        // play request. Its rejection must not close the resumed intro.
        if (!disposed && attempt === playbackAttempt && document.visibilityState === "visible") finish();
      });
    };
    const syncState = () => {
      if (root.dataset.kileniIntro === "done") {
        playbackAttempt++;
        video.pause();
        const active = document.activeElement;
        if (root.dataset.kileniIntroFocus !== "tab" && (active === document.body || active === root)) {
          const main = document.getElementById("main-content");
          main?.setAttribute("tabindex", "-1");
          main?.focus({ preventScroll: true });
        }
        setVisible(false);
      } else if (root.dataset.kileniIntro === "play" && document.visibilityState === "visible") play();
      else {
        playbackAttempt++;
        video.pause();
      }
    };
    const ready = () => {
      if (disposed || root.dataset.kileniIntro === "done") return;
      if (resumeTime > 0) video.currentTime = Math.min(resumeTime, video.duration - .05);
      resumeTime = 0;
      window.__kileniBrandIntroReady = true;
      root.dataset.kileniIntroReady = "true";
      window.__kileniStartBrandIntro?.();
      syncState();
    };
    const loadSource = () => {
      if (disposed || ["done", "finishing"].includes(root.dataset.kileniIntro ?? "")) return;
      const src = portrait.matches ? MOBILE_VIDEO : DESKTOP_VIDEO;
      if (video.getAttribute("src") === src) return;
      // Keep the same point in the animation when the phone is rotated.
      resumeTime = video.currentTime;
      playbackAttempt++;
      video.src = src;
      video.preload = "auto";
      video.load();
    };
    const observer = new MutationObserver(syncState);
    observer.observe(root, { attributes: true, attributeFilter: ["data-kileni-intro"] });
    window.addEventListener(INTRO_FINISHED_EVENT, syncState);
    document.addEventListener("visibilitychange", syncState);
    video.addEventListener("loadeddata", ready);
    video.addEventListener("ended", finish);
    video.addEventListener("error", finish);

    const connection = (navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
      deviceMemory?: number;
    }).connection;
    const lite = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      || connection?.saveData === true || ["slow-2g", "2g"].includes(connection?.effectiveType ?? "")
      || navigator.hardwareConcurrency <= 2
      || (typeof (navigator as Navigator & { deviceMemory?: number }).deviceMemory === "number"
        && (navigator as Navigator & { deviceMemory: number }).deviceMemory <= 2);
    if (lite || root.dataset.kileniIntro === "preview") {
      // A finished logo must never be part of the normal video's first paint.
      // Static visitors start their short display only after this image loads.
      staticReadyRef.current = ready;
      setStaticPoster(true);
    }
    else {
      loadSource();
      portrait.addEventListener("change", loadSource);
    }

    return () => {
      disposed = true;
      staticReadyRef.current = null;
      video.pause();
      observer.disconnect();
      portrait.removeEventListener("change", loadSource);
      window.removeEventListener(INTRO_FINISHED_EVENT, syncState);
      document.removeEventListener("visibilitychange", syncState);
      video.removeEventListener("loadeddata", ready);
      video.removeEventListener("ended", finish);
      video.removeEventListener("error", finish);
      window.__kileniBrandIntroReady = false;
      delete root.dataset.kileniIntroReady;
    };
  }, [visible]);

  const enableSound = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    void video.play().then(() => setSoundEnabled(true)).catch(() => {
      video.muted = true;
      setSoundEnabled(false);
    });
  };
  const copy = locale === "en"
    ? { aria: "KILENI intro", sound: "Turn sound on", skip: "Skip intro" }
    : { aria: "Заставка KILENI", sound: "Включить звук", skip: "Пропустить заставку" };

  if (!visible) return null;
  return (
    <div className="brand-intro brand-intro-v9 brand-intro-video" role="region" aria-label={copy.aria}>
      <picture className="brand-intro-video__start">
        <source media={PORTRAIT_MEDIA} srcSet="/brand/kileni-welcome-mobile-start.webp" />
        <Image src="/brand/kileni-welcome-desktop-start.webp" alt="" fill unoptimized sizes="100vw" loading="eager" fetchPriority="high" />
      </picture>
      {staticPoster ? <picture className="brand-intro-video__poster">
        <source media={PORTRAIT_MEDIA} srcSet="/brand/kileni-welcome-mobile-poster.png" />
        <Image src="/brand/kileni-welcome-desktop-poster.png" alt="" fill unoptimized sizes="100vw" loading="eager"
          onLoad={() => staticReadyRef.current?.()}
          onError={() => window.__kileniFinishBrandIntro?.()} />
      </picture> : null}
      <video ref={videoRef} className="brand-intro-v9__scene" muted playsInline preload="none" aria-hidden="true" />
      <div className="brand-intro-v9__controls">
        {!soundEnabled ? <button type="button" className="brand-intro-v9__sound" data-kileni-intro-sound onClick={enableSound}>{copy.sound}</button> : null}
        <button type="button" className="brand-intro-v9__skip" data-kileni-intro-skip onClick={() => window.__kileniFinishBrandIntro?.()}>{copy.skip}</button>
      </div>
    </div>
  );
}
