import { launch } from "chrome-launcher";
import lighthouse from "lighthouse";

import type { PerformanceAuditInput } from "../audit/types";
import { createSafeAuditProxy } from "./safe-proxy";

const MAX_PAGES = 3;
const DEFAULT_PAGE_TIMEOUT_MS = 30_000;

export interface LighthouseRunResult {
  readonly performance: PerformanceAuditInput | null;
  readonly pagesAttempted: number;
  readonly pagesChecked: number;
}

export async function runMobileLighthouse(
  urls: readonly string[],
  options: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<LighthouseRunResult> {
  const targets = [...new Set(urls)].slice(0, MAX_PAGES);
  if (process.env.LIGHTHOUSE_ENABLED === "false" || targets.length === 0) {
    return { performance: null, pagesAttempted: 0, pagesChecked: 0 };
  }
  const proxy = await createSafeAuditProxy();
  const observations: PerformanceAuditInput[] = [];
  try {
    for (const url of targets) {
      if (options.signal?.aborted) break;
      try {
        const observation = await auditPage(url, proxy.url, options.timeoutMs ?? DEFAULT_PAGE_TIMEOUT_MS, options.signal);
        if (observation) observations.push(observation);
      } catch {
        if (options.signal?.aborted) break;
      }
    }
  } finally {
    await proxy.close();
  }
  return {
    performance: aggregate(observations),
    pagesAttempted: targets.length,
    pagesChecked: observations.length,
  };
}

async function auditPage(url: string, proxyUrl: string, timeoutMs: number, signal?: AbortSignal): Promise<PerformanceAuditInput | null> {
  const chrome = await launch({
    chromePath: process.env.LIGHTHOUSE_CHROME_PATH || undefined,
    chromeFlags: [
      "--headless=new",
      "--disable-dev-shm-usage",
      "--no-first-run",
      "--no-default-browser-check",
      `--proxy-server=${proxyUrl}`,
      "--proxy-bypass-list=<-loopback>",
      ...(process.env.LIGHTHOUSE_NO_SANDBOX === "true" ? ["--no-sandbox"] : []),
    ],
  });
  try {
    const run = lighthouse(url, {
      port: chrome.port,
      logLevel: "silent",
      output: "json",
      onlyCategories: ["performance", "accessibility"],
      formFactor: "mobile",
      maxWaitForLoad: Math.min(timeoutMs, 30_000),
    });
    const result = await raceWithTimeout(run, timeoutMs, signal);
    const lhr = result?.lhr;
    if (!lhr) return null;
    return {
      performance: score(lhr.categories.performance?.score),
      accessibility: score(lhr.categories.accessibility?.score),
      fcpMs: metric(lhr.audits["first-contentful-paint"]?.numericValue),
      lcpMs: metric(lhr.audits["largest-contentful-paint"]?.numericValue),
      cls: metric(lhr.audits["cumulative-layout-shift"]?.numericValue),
      tbtMs: metric(lhr.audits["total-blocking-time"]?.numericValue),
    };
  } finally {
    await chrome.kill();
  }
}

async function raceWithTimeout<T>(promise: Promise<T>, timeoutMs: number, signal?: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("LIGHTHOUSE_TIMEOUT")), timeoutMs);
    const abort = () => reject(new Error("LIGHTHOUSE_ABORTED"));
    signal?.addEventListener("abort", abort, { once: true });
    promise.then(resolve, reject).finally(() => {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", abort);
    });
  });
}

function aggregate(observations: readonly PerformanceAuditInput[]): PerformanceAuditInput | null {
  if (observations.length === 0) return null;
  return {
    performance: median(observations.map((item) => item.performance)),
    accessibility: median(observations.map((item) => item.accessibility)),
    fcpMs: median(observations.map((item) => item.fcpMs)),
    lcpMs: median(observations.map((item) => item.lcpMs)),
    cls: median(observations.map((item) => item.cls)),
    tbtMs: median(observations.map((item) => item.tbtMs)),
  };
}

function median(values: readonly (number | null | undefined)[]): number | null {
  const available = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value)).sort((a, b) => a - b);
  if (available.length === 0) return null;
  const middle = Math.floor(available.length / 2);
  return available.length % 2 ? available[middle] ?? null : ((available[middle - 1] ?? 0) + (available[middle] ?? 0)) / 2;
}

function score(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value * 100 : null;
}

function metric(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
