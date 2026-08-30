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
    const configured = document.body.dataset.turnstileSiteKey?.trim();
    setSiteKey(configured || null);
    if (!configured) onToken("turnstile-disabled");
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

  if (!siteKey) return null;
  return (
    <div className="turnstile-field" aria-label="Human verification">
      <Script id="cloudflare-turnstile" src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onLoad={() => { setLoadError(false); render(); }} onError={() => { setLoadError(true); onToken(undefined); }}/>
      <div id={elementId}/>
      {loadError && <p className="turnstile-field__error" role="alert">Не удалось загрузить защиту формы. Отключите блокировщик для этой страницы и <button type="button" onClick={() => window.location.reload()}>повторите</button>.</p>}
    </div>
  );
}
