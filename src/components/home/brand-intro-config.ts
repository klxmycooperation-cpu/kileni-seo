/** Maximum time the normal intro itself occupies the page after it starts. */
export const INTRO_DURATION_MS = 5_000;
/** Absolute safety cap, including video loading and hydration readiness. */
export const INTRO_MAX_BLOCK_MS = 8_000;
export const INTRO_FINISH_MS = 240;
/** A final static frame for visitors who enabled reduced motion. */
export const INTRO_REDUCED_MS = 300;
/** Remember this video's completion independently of the previous SVG intro. */
export const INTRO_SESSION_KEY = "kileni:intro:welcome:v1";
export const INTRO_FINISHED_EVENT = "kileni:intro-finished";

/**
 * Runs before React so the intro is reserved before the page can flash. The
 * component renders the supplied video; this small controller owns the lifecycle
 * and tears its listeners down as soon as the scene is complete.
 */
export const INTRO_BOOTSTRAP = `(() => {
  const root = document.documentElement;
  let timer;
  let readinessTimer;
  let timerStartedAt = 0;
  let remainingTime = 0;
  let timerCallback;
  let done = false;
  const isHome = () => window.location.pathname === "/";
  const forceReplay = () => new URLSearchParams(window.location.search).get("intro") === "1";
  const seenThisSession = () => {
    // Refreshing the homepage is an explicit new viewing; keep ordinary
    // navigation between pages free of another intro.
    if (forceReplay() || performance.getEntriesByType("navigation")[0]?.type === "reload") return false;
    try { return window.sessionStorage.getItem("${INTRO_SESSION_KEY}") === "1"; } catch { return false; }
  };

  // Reserve the overlay before the body is parsed. Starting the CSS timeline
  // only after the video is ready prevents the loading time from cutting it short.
  if (isHome()) {
    // Opening the site again is a new viewing, even in the same browser session.
    root.dataset.kileniIntro = "pending";
  }

  const removeListeners = () => {
    document.removeEventListener("visibilitychange", syncVisibility);
    window.removeEventListener("pointerdown", controlledFinish, true);
    window.removeEventListener("wheel", controlledFinish, true);
    window.removeEventListener("touchstart", controlledFinish, true);
    window.removeEventListener("keydown", controlledFinish, true);
    window.removeEventListener("click", controlledFinish, true);
  };

  const addListeners = () => {
    document.addEventListener("visibilitychange", syncVisibility);
    window.addEventListener("pointerdown", controlledFinish, { capture: true, passive: true });
    window.addEventListener("wheel", controlledFinish, { capture: true, passive: true });
    window.addEventListener("touchstart", controlledFinish, { capture: true, passive: true });
    window.addEventListener("keydown", controlledFinish, true);
    window.addEventListener("click", controlledFinish, true);
  };

  const schedule = (callback, duration) => {
    window.clearTimeout(timer);
    timerCallback = callback;
    remainingTime = duration;
    timerStartedAt = performance.now();
    timer = window.setTimeout(callback, duration);
  };

  const waitForReadiness = () => {
    window.clearTimeout(readinessTimer);
    if (document.visibilityState === "visible" && root.dataset.kileniIntro === "pending") {
      readinessTimer = window.setTimeout(complete, ${INTRO_MAX_BLOCK_MS});
    }
  };

  const syncVisibility = () => {
    if (document.visibilityState !== "visible") {
      window.clearTimeout(readinessTimer);
      if (timer !== undefined) remainingTime = Math.max(0, remainingTime - (performance.now() - timerStartedAt));
      window.clearTimeout(timer);
      timer = undefined;
      return;
    }
    if (root.dataset.kileniIntro === "pending") {
      waitForReadiness();
      start();
    } else if (timerCallback && !done) schedule(timerCallback, remainingTime);
  };

  const complete = () => {
    if (done) return;
    done = true;
    const restoreFirstTabFocus = root.dataset.kileniIntroFocus === "tab";
    window.clearTimeout(timer);
    window.clearTimeout(readinessTimer);
    removeListeners();
    try { window.sessionStorage.setItem("${INTRO_SESSION_KEY}", "1"); } catch {}
    root.dataset.kileniIntroLastCompletedAt = String(performance.now());
    root.dataset.kileniIntro = "done";
    delete root.dataset.kileniIntroStartedAt;
    window.dispatchEvent(new Event("${INTRO_FINISHED_EVENT}"));
    if (restoreFirstTabFocus) {
      window.requestAnimationFrame(() => document.querySelector(".skip-link")?.focus({ preventScroll: true }));
    }
  };

  const beginControlledFinish = () => {
    if (done || root.dataset.kileniIntro === "finishing") return;
    window.clearTimeout(timer);
    window.clearTimeout(readinessTimer);
    removeListeners();
    root.dataset.kileniIntroLastFinishStartedAt = String(performance.now());
    root.dataset.kileniIntro = "finishing";
    timer = window.setTimeout(complete, ${INTRO_FINISH_MS});
  };

  const controlledFinish = (event) => {
    if (done || root.dataset.kileniIntro === "finishing") return;
    if (event?.target instanceof Element && event.target.closest("[data-kileni-intro-sound]")) return;
    if (event?.target instanceof Element && event.target.closest("[data-kileni-intro-skip]") && event.type !== "click") return;
    if (event?.type === "keydown" && !event.isTrusted) return;
    // Safari may skip an off-screen skip-link and jump into the page. Record
    // the intent so completion can restore the expected first Tab target.
    if (event?.type === "keydown" && event.key === "Tab") root.dataset.kileniIntroFocus = "tab";
    else delete root.dataset.kileniIntroFocus;
    beginControlledFinish();
  };

  const start = () => {
    // Safari suspends background video. Do not finish an unseen intro before
    // the visitor actually opens its tab.
    if (!isHome() || document.visibilityState !== "visible") return;
    if (root.dataset.kileniIntro === "play" || root.dataset.kileniIntro === "reduced" || root.dataset.kileniIntro === "finishing") return;

    done = false;
    delete root.dataset.kileniIntroFocus;
    delete root.dataset.kileniIntroLastCompletedAt;
    delete root.dataset.kileniIntroLastFinishStartedAt;
    delete root.dataset.kileniIntroEHoldReached;
    delete root.dataset.kileniIntroSeoFormingReached;
    delete root.dataset.kileniIntroEHoldTransform;
    delete root.dataset.kileniIntroEHoldSOpacity;
    delete root.dataset.kileniIntroSeoFormingTransform;
    delete root.dataset.kileniIntroSeoFormingSOpacity;
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const effectiveType = connection?.effectiveType || "";
    const constrained = connection?.saveData === true
      || effectiveType === "slow-2g"
      || effectiveType === "2g"
      || (typeof navigator.hardwareConcurrency === "number" && navigator.hardwareConcurrency <= 2)
      || (typeof navigator.deviceMemory === "number" && navigator.deviceMemory <= 2);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Reduced-motion visitors still see the KILENI identity, but only as a
    // short static frame instead of the video sequence.
    if (reduced || constrained) {
      if (!window.__kileniBrandIntroReady) return;
      window.clearTimeout(readinessTimer);
      if (constrained) root.dataset.kileniIntroMode = "lite";
      else delete root.dataset.kileniIntroMode;
      root.dataset.kileniIntro = "reduced";
      schedule(complete, ${INTRO_REDUCED_MS});
      return;
    }
    delete root.dataset.kileniIntroMode;
    if (!window.__kileniBrandIntroReady) return;
    window.clearTimeout(readinessTimer);
    if (root.dataset.kileniIntro !== "pending" && seenThisSession()) {
      complete();
      return;
    }

    root.dataset.kileniIntroStartedAt = String(performance.now());
    root.dataset.kileniIntroLastStartedAt = root.dataset.kileniIntroStartedAt;
    root.dataset.kileniIntro = "play";
    // The video normally finishes through its ended event. Allow a small
    // decoding margin, then release the page even if playback has stalled.
    schedule(beginControlledFinish, ${INTRO_DURATION_MS + 500});
    addListeners();
  };

  window.__kileniStartBrandIntro = start;
  window.__kileniFinishBrandIntro = beginControlledFinish;
  // Never leave the page locked if video loading or hydration fails.
  if (root.dataset.kileniIntro === "pending") {
    addListeners();
    waitForReadiness();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();`;
