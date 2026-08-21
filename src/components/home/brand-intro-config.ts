export const INTRO_DURATION_MS = 4_400;
export const REPEAT_DURATION_MS = 320;
export const INTRO_SESSION_KEY = "kileni:intro:v3";

export const INTRO_BOOTSTRAP = `(() => {
  if (!/^\\/(?:en\\/?)?$/.test(window.location.pathname)) return;
  const root = document.documentElement;
  window.__kileniIntroBootstrapRan = true;
  let timer;
  const cleanup = () => {
    window.clearTimeout(timer);
    window.removeEventListener("pointerdown", finish, true);
    window.removeEventListener("keydown", finish, true);
    window.removeEventListener("wheel", finish, true);
    window.removeEventListener("focusin", finish, true);
    delete window.__kileniIntroCleanup;
  };
  const finish = () => {
    if (root.dataset.kileniIntro !== "play" && root.dataset.kileniIntro !== "repeat") {
      cleanup();
      return;
    }
    root.dataset.kileniIntro = "done";
    delete root.dataset.kileniIntroStartedAt;
    try { window.sessionStorage.setItem("${INTRO_SESSION_KEY}", "1"); } catch {}
    cleanup();
  };
  const start = (mode, duration) => {
    root.dataset.kileniIntroStartedAt = String(performance.now());
    root.dataset.kileniIntro = mode;
    timer = window.setTimeout(finish, duration);
    window.addEventListener("pointerdown", finish, { capture: true, passive: true });
    window.addEventListener("keydown", finish, true);
    window.addEventListener("wheel", finish, { capture: true, passive: true });
    window.addEventListener("focusin", finish, true);
    window.__kileniIntroCleanup = cleanup;
  };
  try {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      root.dataset.kileniIntro = "done";
      delete root.dataset.kileniIntroStartedAt;
      return;
    }
    const seen = window.sessionStorage.getItem("${INTRO_SESSION_KEY}") === "1";
    start(seen ? "repeat" : "play", seen ? ${REPEAT_DURATION_MS} : ${INTRO_DURATION_MS});
  } catch {
    start("play", ${INTRO_DURATION_MS});
  }
})();`;
