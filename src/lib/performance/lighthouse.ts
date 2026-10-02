import { launch } from "chrome-launcher";
import lighthouse from "lighthouse";

import type { PerformanceAuditInput } from "../audit/types";
import { normalizeLighthouseObservation } from "../audit/lighthouse-observation";
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
    return {
      performance: normalizeLighthouseObservation({ status: "not_requested", source: "lighthouse" }),
      pagesAttempted: 0,
      pagesChecked: 0,
    };
  }
  if (options.signal?.aborted) {
    return {
      performance: normalizeLighthouseObservation({
        status: "timed_out",
        source: "lighthouse",
        errorCode: "AUDIT_ABORTED",
      }),
      pagesAttempted: targets.length,
      pagesChecked: 0,
    };
  }
  const setupStarted = Date.now();
  let proxy: Awaited<ReturnType<typeof createSafeAuditProxy>>;
  try {
    proxy = await createSafeAuditProxy();
  } catch {
    const completedAt = new Date();
    return {
      performance: normalizeLighthouseObservation({
        status: "failed",
        source: "lighthouse",
        startedAt: new Date(setupStarted).toISOString(),
        completedAt: completedAt.toISOString(),
        durationMs: completedAt.getTime() - setupStarted,
        errorCode: "SAFE_PROXY_START_FAILED",
        errorMessage: "Lighthouse proxy could not start",
      }),
      pagesAttempted: targets.length,
      pagesChecked: 0,
    };
  }
  const observations: PerformanceAuditInput[] = [];
  const failures: PerformanceAuditInput[] = [];
  try {
    for (const url of targets) {
      if (options.signal?.aborted) break;
      const startedAt = new Date();
      try {
        const observation = await auditPage(url, proxy.url, options.timeoutMs ?? DEFAULT_PAGE_TIMEOUT_MS, options.signal);
        if (observation) observations.push(observation);
      } catch (error) {
        const completedAt = new Date();
        const code = lighthouseErrorCode(error);
        failures.push(normalizeLighthouseObservation({
          status: code === "LIGHTHOUSE_TIMEOUT" || code === "LIGHTHOUSE_ABORTED" ? "timed_out" : "failed",
          source: "lighthouse",
          finalUrl: url,
          strategy: "mobile",
          profile: "mobile",
          startedAt: startedAt.toISOString(),
          completedAt: completedAt.toISOString(),
          durationMs: completedAt.getTime() - startedAt.getTime(),
          errorCode: code,
          errorMessage: code === "LIGHTHOUSE_TIMEOUT" || code === "LIGHTHOUSE_ABORTED"
            ? "Lighthouse did not finish within the allowed time"
            : "Lighthouse execution failed",
        }));
        if (options.signal?.aborted) break;
      }
    }
  } finally {
    await proxy.close();
  }
  return {
    performance: aggregate(observations) ?? aggregateFailures(failures),
    pagesAttempted: targets.length,
    pagesChecked: observations.length,
  };
}

async function auditPage(url: string, proxyUrl: string, timeoutMs: number, signal?: AbortSignal): Promise<PerformanceAuditInput | null> {
  const startedAt = new Date();
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
    const completedAt = new Date();
    return normalizeLighthouseObservation({
      status: "completed",
      performance: score(lhr.categories.performance?.score),
      accessibility: score(lhr.categories.accessibility?.score),
      fcpMs: metric(lhr.audits["first-contentful-paint"]?.numericValue),
      lcpMs: metric(lhr.audits["largest-contentful-paint"]?.numericValue),
      cls: metric(lhr.audits["cumulative-layout-shift"]?.numericValue),
      tbtMs: metric(lhr.audits["total-blocking-time"]?.numericValue),
      speedIndexMs: metric(lhr.audits["speed-index"]?.numericValue),
      profile: "mobile",
      strategy: "mobile",
      deviceProfile: "mobile",
      finalUrl: typeof lhr.finalDisplayedUrl === "string" ? lhr.finalDisplayedUrl : typeof lhr.finalUrl === "string" ? lhr.finalUrl : undefined,
      capturedAt: new Date().toISOString(),
      startedAt: startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      durationMs: completedAt.getTime() - startedAt.getTime(),
      lighthouseVersion: typeof lhr.lighthouseVersion === "string" ? lhr.lighthouseVersion : undefined,
      source: "lighthouse",
      networkProfile: "Lighthouse mobile default",
      runCount: 1,
      runs: [{
        status: "completed",
        finalUrl: typeof lhr.finalDisplayedUrl === "string" ? lhr.finalDisplayedUrl : typeof lhr.finalUrl === "string" ? lhr.finalUrl : undefined,
        startedAt: startedAt.toISOString(),
        completedAt: completedAt.toISOString(),
        capturedAt: completedAt.toISOString(),
        durationMs: completedAt.getTime() - startedAt.getTime(),
        performance: score(lhr.categories.performance?.score),
        fcpMs: metric(lhr.audits["first-contentful-paint"]?.numericValue),
        lcpMs: metric(lhr.audits["largest-contentful-paint"]?.numericValue),
        cls: metric(lhr.audits["cumulative-layout-shift"]?.numericValue),
        tbtMs: metric(lhr.audits["total-blocking-time"]?.numericValue),
        speedIndexMs: metric(lhr.audits["speed-index"]?.numericValue),
      }],
    });
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
  const startedAt = observations.map((item) => item.startedAt).filter((value): value is string => Boolean(value)).sort().at(0);
  const completedAt = observations.map((item) => item.completedAt).filter((value): value is string => Boolean(value)).sort().at(-1);
  return normalizeLighthouseObservation({
    status: "completed",
    performance: median(observations.map((item) => item.performance)),
    accessibility: median(observations.map((item) => item.accessibility)),
    fcpMs: median(observations.map((item) => item.fcpMs)),
    lcpMs: median(observations.map((item) => item.lcpMs)),
    cls: median(observations.map((item) => item.cls)),
    tbtMs: median(observations.map((item) => item.tbtMs)),
    speedIndexMs: median(observations.map((item) => item.speedIndexMs)),
    profile: observations.every((item) => item.profile === observations[0]?.profile) ? observations[0]?.profile : undefined,
    capturedAt: observations.map((item) => item.capturedAt).filter((value): value is string => Boolean(value)).sort().at(-1),
    startedAt,
    completedAt,
    durationMs: startedAt && completedAt ? Math.max(0, Date.parse(completedAt) - Date.parse(startedAt)) : undefined,
    lighthouseVersion: observations.every((item) => item.lighthouseVersion === observations[0]?.lighthouseVersion) ? observations[0]?.lighthouseVersion : undefined,
    runCount: observations.reduce((sum, item) => sum + Math.max(1, item.runCount ?? 1), 0),
    finalUrl: observations.at(-1)?.finalUrl,
    strategy: observations.every((item) => item.strategy === observations[0]?.strategy) ? observations[0]?.strategy : undefined,
    deviceProfile: observations.every((item) => item.deviceProfile === observations[0]?.deviceProfile) ? observations[0]?.deviceProfile : undefined,
    networkProfile: observations.every((item) => item.networkProfile === observations[0]?.networkProfile) ? observations[0]?.networkProfile : undefined,
    source: "lighthouse",
    runs: observations.flatMap((item) => item.runs ?? []),
  });
}

function aggregateFailures(failures: readonly PerformanceAuditInput[]): PerformanceAuditInput {
  if (failures.length === 0) return normalizeLighthouseObservation({ status: "failed", source: "lighthouse", errorCode: "NO_RESULT" });
  const timedOut = failures.every((item) => item.status === "timed_out");
  const startedAt = failures.map((item) => item.startedAt).filter((value): value is string => Boolean(value)).sort().at(0);
  const completedAt = failures.map((item) => item.completedAt).filter((value): value is string => Boolean(value)).sort().at(-1);
  return normalizeLighthouseObservation({
    status: timedOut ? "timed_out" : "failed",
    source: "lighthouse",
    strategy: "mobile",
    profile: "mobile",
    startedAt,
    completedAt,
    durationMs: startedAt && completedAt ? Math.max(0, Date.parse(completedAt) - Date.parse(startedAt)) : undefined,
    errorCode: failures.find((item) => item.status !== "timed_out")?.errorCode ?? failures[0]?.errorCode ?? "LIGHTHOUSE_FAILED",
    errorMessage: timedOut ? "Lighthouse did not finish within the allowed time" : "Lighthouse execution failed",
  });
}

function lighthouseErrorCode(error: unknown): string {
  if (error instanceof Error && ["LIGHTHOUSE_TIMEOUT", "LIGHTHOUSE_ABORTED"].includes(error.message)) return error.message;
  if (error && typeof error === "object" && "code" in error && typeof error.code === "string") {
    return error.code.toUpperCase().replace(/[^A-Z0-9_-]/gu, "_").slice(0, 80) || "LIGHTHOUSE_FAILED";
  }
  return "LIGHTHOUSE_FAILED";
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
