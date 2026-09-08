import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { chromium } from "@playwright/test";

const origin = process.env.QA_ORIGIN ?? "https://kileni-seo.ru";
const outputDir = resolve(
  process.cwd(),
  process.env.QA_OUTPUT_DIR
    ?? "docs/user-audit-evidence/kileni-full-audit-2026-09-04/performance-trace",
);
const allRoutes = [
  ["home", "/"],
  ["services", "/services"],
  ["seo", "/seo"],
  ["pricing", "/pricing"],
  ["free-audit", "/free-audit"],
  ["brief", "/brief"],
  ["case", "/cases/eco-santeh"],
  ["article", "/blog/seo-audit-when-you-need-it"],
  ["glossary", "/glossary/lighthouse"],
];
const requestedRouteNames = new Set(
  (process.env.QA_TRACE_ROUTES ?? "home")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
);
const routes = allRoutes.filter(([name]) => requestedRouteNames.has(name));
if (!routes.length) throw new Error("QA_TRACE_ROUTES did not match a configured route");

await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
try {
  for (const [name, path] of routes) {
    if (name === "home") {
      await capture("home-mobile-first-visit", path, false);
      await capture("home-mobile-returning", path, true);
      continue;
    }
    await capture(`${name}-mobile`, path, true);
  }
} finally {
  await browser.close();
}

async function capture(label, path, introSeen) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await context.addInitScript(({ seen }) => {
    window.localStorage.setItem("kileni-cookie-preferences:v2", JSON.stringify({ essential: true, analytics: false, marketing: false, version: "2026-08-23.2" }));
    if (seen) window.sessionStorage.setItem("kileni:intro:v9", "1");
  }, { seen: introSeen });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  let traceComplete;
  const traceDone = new Promise((resolveTrace) => { traceComplete = resolveTrace; });
  cdp.on("Tracing.tracingComplete", ({ stream }) => traceComplete(stream));
  await cdp.send("Tracing.start", {
    categories: "devtools.timeline,disabled-by-default-devtools.timeline,v8,blink.user_timing,loading",
    transferMode: "ReturnAsStream",
  });
  const url = new URL(path, origin).href;
  await page.goto(url, { waitUntil: "networkidle", timeout: 45_000 });
  await page.waitForTimeout(introSeen ? 1_000 : 5_000);
  await cdp.send("Tracing.end");
  const stream = await traceDone;
  let trace = "";
  for (;;) {
    const chunk = await cdp.send("IO.read", { handle: stream });
    trace += chunk.data;
    if (chunk.eof) break;
  }
  await cdp.send("IO.close", { handle: stream });
  await writeFile(resolve(outputDir, `${label}-performance-trace.json`), trace, "utf8");
  await page.screenshot({ path: resolve(outputDir, `${label}-state.png`), animations: "disabled" });
  await writeFile(resolve(outputDir, `${label}-state.json`), `${JSON.stringify(await page.evaluate(() => ({
    introState: document.documentElement.dataset.kileniIntro ?? null,
    navigation: performance.getEntriesByType("navigation").map((entry) => ({
      duration: entry.duration,
      domContentLoaded: entry.domContentLoadedEventEnd,
      load: entry.loadEventEnd,
      transferSize: "transferSize" in entry ? entry.transferSize : null,
    })),
    resources: performance.getEntriesByType("resource")
      .map((entry) => ({ name: entry.name, duration: entry.duration, transferSize: "transferSize" in entry ? entry.transferSize : null }))
      .sort((left, right) => (right.transferSize ?? 0) - (left.transferSize ?? 0))
      .slice(0, 20),
  })), null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ label, traceBytes: Buffer.byteLength(trace), url }));
  await context.close();
}
