import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { chromium } from "@playwright/test";
import { launch } from "chrome-launcher";
import lighthouse from "lighthouse";
import desktopConfig from "lighthouse/core/config/desktop-config.js";

const origin = process.env.QA_ORIGIN ?? "https://kileni-seo.ru";
const outputDir = resolve(
  process.cwd(),
  process.env.QA_OUTPUT_DIR
    ?? "docs/user-audit-evidence/kileni-full-audit-2026-09-04/lighthouse",
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
  ...(process.env.QA_AUDIT_RESULT_PATH ? [["audit-result", process.env.QA_AUDIT_RESULT_PATH]] : []),
];
const requestedRouteNames = new Set(
  (process.env.QA_LIGHTHOUSE_ROUTES ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
);
const routes = requestedRouteNames.size
  ? allRoutes.filter(([name]) => requestedRouteNames.has(name))
  : allRoutes;
if (!routes.length) throw new Error("QA_LIGHTHOUSE_ROUTES did not match a configured route");
const profiles = (process.env.QA_LIGHTHOUSE_PROFILES ?? "mobile,desktop")
  .split(",")
  .map((value) => value.trim())
  .filter((value) => value === "mobile" || value === "desktop");
const runs = Number(process.env.QA_LIGHTHOUSE_RUNS ?? 3);

await mkdir(outputDir, { recursive: true });
const chrome = await launch({
  chromePath: process.env.LIGHTHOUSE_CHROME_PATH || chromium.executablePath(),
  chromeFlags: [
    "--headless=new",
    "--disable-dev-shm-usage",
    "--no-first-run",
    "--no-default-browser-check",
  ],
});

const results = [];
try {
  for (const [name, path] of routes) {
    for (const profile of profiles) {
      for (let runNumber = 1; runNumber <= runs; runNumber += 1) {
        const url = new URL(path, origin).href;
        const flags = {
          port: chrome.port,
          logLevel: "silent",
          output: "json",
          onlyCategories: ["performance"],
          maxWaitForLoad: 45_000,
          throttlingMethod: "simulate",
        };
        // Lighthouse's `formFactor` flag affects scoring but does not switch
        // network/CPU emulation. The official desktop config is required for
        // a valid desktop comparison.
        const result = await lighthouse(url, flags, profile === "desktop" ? desktopConfig : undefined);
        if (!result?.lhr) throw new Error(`Lighthouse returned no report for ${url}`);
        const lhr = result.lhr;
        const file = `${name}-${profile}-run-${runNumber}.json`;
        await writeFile(resolve(outputDir, file), `${JSON.stringify(lhr)}\n`, "utf8");
        if (result.artifacts?.traces) {
          await writeFile(resolve(outputDir, `${name}-${profile}-run-${runNumber}.trace.json`), JSON.stringify(result.artifacts.traces));
        }
        if (result.artifacts?.devtoolsLogs) {
          await writeFile(resolve(outputDir, `${name}-${profile}-run-${runNumber}.devtools.json`), JSON.stringify(result.artifacts.devtoolsLogs));
        }
        const row = {
          name,
          path,
          url,
          profile,
          run: runNumber,
          fetchedAt: lhr.fetchTime,
          lighthouseVersion: lhr.lighthouseVersion,
          score: metric(lhr.categories.performance?.score, 100),
          fcpMs: metric(lhr.audits["first-contentful-paint"]?.numericValue),
          lcpMs: metric(lhr.audits["largest-contentful-paint"]?.numericValue),
          cls: metric(lhr.audits["cumulative-layout-shift"]?.numericValue),
          tbtMs: metric(lhr.audits["total-blocking-time"]?.numericValue),
          speedIndexMs: metric(lhr.audits["speed-index"]?.numericValue),
          interactiveMs: metric(lhr.audits.interactive?.numericValue),
          mainThreadWorkMs: metric(lhr.audits["mainthread-work-breakdown"]?.numericValue),
          bootupTimeMs: metric(lhr.audits["bootup-time"]?.numericValue),
          totalByteWeight: metric(lhr.audits["total-byte-weight"]?.numericValue),
          longTaskCount: Array.isArray(lhr.audits["long-tasks"]?.details?.items)
            ? lhr.audits["long-tasks"].details.items.length
            : null,
          json: file,
        };
        results.push(row);
        console.log(`${name} ${profile} ${runNumber}/${runs}: ${row.score ?? "n/a"}, TBT ${row.tbtMs ?? "n/a"} ms`);
      }
    }
  }
} finally {
  await chrome.kill();
}

const medians = [];
for (const [name, path] of routes) {
  for (const profile of profiles) {
    const group = results.filter((row) => row.name === name && row.profile === profile);
    medians.push({
      name,
      path,
      profile,
      runs: group.length,
      score: median(group.map((row) => row.score)),
      fcpMs: median(group.map((row) => row.fcpMs)),
      lcpMs: median(group.map((row) => row.lcpMs)),
      cls: median(group.map((row) => row.cls)),
      tbtMs: median(group.map((row) => row.tbtMs)),
      speedIndexMs: median(group.map((row) => row.speedIndexMs)),
      interactiveMs: median(group.map((row) => row.interactiveMs)),
      mainThreadWorkMs: median(group.map((row) => row.mainThreadWorkMs)),
      bootupTimeMs: median(group.map((row) => row.bootupTimeMs)),
      totalByteWeight: median(group.map((row) => row.totalByteWeight)),
      confirmedPerformanceConcern: group.filter((row) => (row.score ?? 100) < 90).length >= 2,
      confirmedTbtConcern: group.filter((row) => (row.tbtMs ?? 0) > 200).length >= 2,
    });
  }
}
await writeFile(resolve(outputDir, "runs.json"), `${JSON.stringify(results, null, 2)}\n`, "utf8");
await writeFile(resolve(outputDir, "medians.json"), `${JSON.stringify(medians, null, 2)}\n`, "utf8");
console.log(JSON.stringify(medians, null, 2));

function metric(value, multiplier = 1) {
  return typeof value === "number" && Number.isFinite(value) ? Math.round(value * multiplier * 100) / 100 : null;
}

function median(values) {
  const available = values.filter((value) => typeof value === "number" && Number.isFinite(value)).sort((a, b) => a - b);
  if (!available.length) return null;
  const middle = Math.floor(available.length / 2);
  return available.length % 2 ? available[middle] : (available[middle - 1] + available[middle]) / 2;
}
