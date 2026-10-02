"use client";

import Script from "next/script";
import { useCallback, useEffect, useId, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

export function TurnstileField({ onToken, resetKey = 0 }: { onToken: (token: string | undefined) => void; resetKey?: number }) {
  const elementId = `turnstile-${useId().replace(/:/gu, "")}`;
  const widgetId = useRef<string | undefined>(undefined);
  const [siteKey, setSiteKey] = useState<string | null>();
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    // Static pages cannot carry configuration added when a Docker image starts.
    // Fetch only the public key at runtime and keep submission blocked on error.
    const controller = new AbortController();
    let active = true;
    const timer = window.setTimeout(() => controller.abort(), 8_000);
    onToken(undefined);
    void fetch("/api/public/turnstile-key", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Verification configuration unavailable");
        const config: unknown = await response.json();
        if (!config || typeof config !== "object" || !("siteKey" in config)
          || (config.siteKey !== null && typeof config.siteKey !== "string")) {
          throw new Error("Invalid verification configuration");
        }
        if (!active) return;
        const configured = typeof config.siteKey === "string" ? config.siteKey.trim() : null;
        if (config.siteKey !== null && !configured) throw new Error("Empty verification key");
        setSiteKey(configured);
        if (!configured) onToken("turnstile-disabled");
      })
      .catch(() => {
        if (active) {
          setLoadError(true);
          onToken(undefined);
        }
      })
      .finally(() => window.clearTimeout(timer));
    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [onToken]);

  const render = useCallback(() => {
    if (!siteKey || !window.turnstile || widgetId.current) return;
    widgetId.current = window.turnstile.render(`#${elementId}`, {
      sitekey: siteKey,
      action: "submit",
      appearance: "interaction-only",
      size: "flexible",
      callback: (token: string) => onToken(token),
      "expired-callback": () => onToken(undefined),
      "error-callback": () => onToken(undefined),
    });
  }, [elementId, onToken, siteKey]);

  useEffect(() => {
    render();
    return () => {
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      widgetId.current = undefined;
    };
  }, [render]);

  useEffect(() => {
    if (!siteKey || widgetId.current) return;
    const timer = window.setTimeout(() => {
      if (!widgetId.current) setLoadError(true);
    }, 12_000);
    return () => window.clearTimeout(timer);
  }, [siteKey]);

  useEffect(() => {
    if (!resetKey || !widgetId.current || !window.turnstile) return;
    window.turnstile.reset(widgetId.current);
    onToken(undefined);
  }, [onToken, resetKey]);

  if (!siteKey && !loadError) return null;
  return (
    <div className="turnstile-field" aria-label="Human verification">
      {siteKey && <Script id="cloudflare-turnstile" src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onLoad={() => { setLoadError(false); render(); }} onError={() => { setLoadError(true); onToken(undefined); }}/>}
      {siteKey && <div id={elementId}/>}
      {loadError && <p className="turnstile-field__error" role="alert">Не удалось загрузить защиту формы. Отключите блокировщик для этой страницы и <button type="button" onClick={() => window.location.reload()}>повторите</button>.</p>}
    </div>
  );
}
