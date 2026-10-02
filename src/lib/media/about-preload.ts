export const aboutPlanetVideo = "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260912_104036_bd6924f6-3c8e-417e-8465-6d03c8c2e9e6.mp4";
export const aboutPlanetPoster = "https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/82e7eb75-c65f-490a-99b5-f3d1cad54200.webp";

let preloader: HTMLVideoElement | undefined;
let poster: HTMLImageElement | undefined;

export function releaseAboutPlanetPreload(): void {
  if (!preloader) return;
  // Safari cannot consistently reuse an in-flight range request across players.
  // Stop the detached player when the visible hero takes over the download.
  preloader.pause();
  preloader.removeAttribute("src");
  preloader.load();
  preloader = undefined;
}

/** Warm the poster and MP4 metadata once; the hero keeps the original quality. */
export function warmAboutPlanet(intent = false): void {
  if (!poster) {
    poster = new Image();
    poster.decoding = "async";
    poster.src = aboutPlanetPoster;
  }
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (!preloader) {
    preloader = document.createElement("video");
    preloader.muted = true;
    preloader.playsInline = true;
    preloader.preload = intent ? "auto" : "metadata";
    preloader.src = aboutPlanetVideo;
    preloader.load();
  } else if (intent && preloader.preload !== "auto") {
    preloader.preload = "auto";
    preloader.load();
  }
}
