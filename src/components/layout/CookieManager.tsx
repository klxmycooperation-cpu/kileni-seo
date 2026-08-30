"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Locale } from "../../config/site";
import { INTRO_FINISHED_EVENT } from "../home/brand-intro-config";

const STORAGE_KEY = "kileni-cookie-preferences:v2";
// Increment whenever the inventory or legal wording materially changes so a
// previously stored choice cannot silently suppress the updated notice.
const CONSENT_VERSION = "2026-08-23.2";
const OPEN_EVENT = "kileni:open-cookie-settings";
const POST_INTRO_DELAY_MS = 160;

type Preferences = { essential: true; analytics: boolean; marketing: boolean; version?: string; savedAt?: string };
const defaults: Preferences = { essential: true, analytics: false, marketing: false };
const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "summary",
  "[contenteditable='true']",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function getFocusableElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((element) => (
    element.getAttribute("aria-hidden") !== "true" && element.getClientRects().length > 0
  ));
}

export function CookieManager({ locale }: { locale: Locale }) {
  const ru = locale === "ru";
  const [open, setOpen] = useState(false);
  const [configuring, setConfiguring] = useState(false);
  const [preferences, setPreferences] = useState<Preferences>(defaults);
  const layerRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const persistedPreferencesRef = useRef<Preferences>(defaults);
  const dismissOnEscapeRef = useRef(false);

  useEffect(() => {
    let revealTimer: number | undefined;
    let safetyTimer: number | undefined;
    let introObserver: MutationObserver | undefined;

    const stopWaitingForIntro = () => {
      window.removeEventListener(INTRO_FINISHED_EVENT, revealAfterIntro);
      introObserver?.disconnect();
      introObserver = undefined;
    };

    const revealAfterIntro = () => {
      stopWaitingForIntro();
      window.clearTimeout(revealTimer);
      window.clearTimeout(safetyTimer);
      revealTimer = window.setTimeout(() => {
        dismissOnEscapeRef.current = false;
        setOpen(true);
      }, POST_INTRO_DELAY_MS);
    };

    const revealWhenPageIsReady = () => {
      const state = document.documentElement.dataset.kileniIntro;
      if (!state || state === "done") {
        revealAfterIntro();
        return;
      }

      window.addEventListener(INTRO_FINISHED_EVENT, revealAfterIntro, { once: true });
      introObserver = new MutationObserver(() => {
        if (document.documentElement.dataset.kileniIntro === "done") revealAfterIntro();
      });
      introObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-kileni-intro"] });
      safetyTimer = window.setTimeout(revealAfterIntro, 10_000);
    };

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Preferences>;
        if (parsed.version === CONSENT_VERSION) {
          const storedPreferences = { essential: true, analytics: Boolean(parsed.analytics), marketing: Boolean(parsed.marketing), version: CONSENT_VERSION, savedAt: parsed.savedAt } satisfies Preferences;
          persistedPreferencesRef.current = storedPreferences;
          setPreferences(storedPreferences);
        } else revealWhenPageIsReady();
      } else revealWhenPageIsReady();
    } catch {
      revealWhenPageIsReady();
    }
    const show = () => {
      stopWaitingForIntro();
      window.clearTimeout(revealTimer);
      window.clearTimeout(safetyTimer);
      dismissOnEscapeRef.current = true;
      setConfiguring(true);
      setOpen(true);
    };
    window.addEventListener(OPEN_EVENT, show);
    return () => {
      stopWaitingForIntro();
      window.clearTimeout(revealTimer);
      window.clearTimeout(safetyTimer);
      window.removeEventListener(OPEN_EVENT, show);
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    const layer = layerRef.current;
    const dialog = dialogRef.current;
    if (!layer || !dialog) return;

    const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const returnTarget = activeElement && activeElement !== document.body && activeElement !== document.documentElement
      ? activeElement
      : document.getElementById("main-content");

    titleRef.current?.focus({ preventScroll: true });

    const backgroundElements = Array.from(layer.parentElement?.children ?? [])
      .filter((element): element is HTMLElement => element instanceof HTMLElement && element !== layer)
      .map((element) => ({
        element,
        hadInert: element.hasAttribute("inert"),
        ariaHidden: element.getAttribute("aria-hidden"),
      }));

    for (const { element } of backgroundElements) {
      element.setAttribute("inert", "");
      element.setAttribute("aria-hidden", "true");
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && dismissOnEscapeRef.current) {
        event.preventDefault();
        event.stopPropagation();
        dismissOnEscapeRef.current = false;
        setPreferences(persistedPreferencesRef.current);
        setConfiguring(false);
        setOpen(false);
        return;
      }

      if (event.key !== "Tab") return;
      const focusableElements = getFocusableElements(dialog);
      if (focusableElements.length === 0) {
        event.preventDefault();
        titleRef.current?.focus({ preventScroll: true });
        return;
      }

      const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const activeIndex = active ? focusableElements.indexOf(active) : -1;
      const first = focusableElements[0];
      const last = focusableElements.at(-1);

      if (event.shiftKey && activeIndex <= 0) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && (activeIndex === -1 || activeIndex === focusableElements.length - 1)) {
        event.preventDefault();
        first?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      for (const { element, hadInert, ariaHidden } of backgroundElements) {
        if (!hadInert) element.removeAttribute("inert");
        if (ariaHidden === null) element.removeAttribute("aria-hidden");
        else element.setAttribute("aria-hidden", ariaHidden);
      }
      if (returnTarget?.isConnected) returnTarget.focus({ preventScroll: true });
    };
  }, [open]);

  const save = (next: Preferences) => {
    const recorded = { ...next, version: CONSENT_VERSION, savedAt: new Date().toISOString() };
    persistedPreferencesRef.current = recorded;
    dismissOnEscapeRef.current = false;
    setPreferences(recorded);
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(recorded)); } catch {}
    setConfiguring(false);
    setOpen(false);
  };

  if (!open) return null;
  return (
    <div ref={layerRef} className="cookie-layer" role="presentation">
      <section ref={dialogRef} className={`cookie-manager${configuring ? " cookie-manager--settings" : " cookie-manager--compact"}`} role="dialog" aria-modal="true" aria-labelledby="cookie-title">
        <div className="cookie-manager__intro">
          <p className="section-kicker">{ru ? "Настройки данных" : "Data settings"}</p>
          <h2 ref={titleRef} id="cookie-title" tabIndex={-1}>{ru ? "Cookies и локальные настройки" : "Cookies and local preferences"}</h2>
          <p>{ru ? "Обязательные данные нужны для защиты форм, темы, черновика брифа и результата проверки. Аналитические и маркетинговые инструменты сейчас не подключены." : "Essential storage protects forms and keeps theme, brief drafts and audit results. Analytics and marketing tools are not currently connected."}</p>
        </div>
        {configuring ? (
          <div className="cookie-manager__categories">
            <CookieCategory
              checked
              disabled
              title={ru ? "Необходимые" : "Essential"}
              summary={ru ? "Защита форм, выбранная тема и черновик брифа" : "Form protection, selected theme and brief draft"}
              details={ru ? (
                <StorageInventory locale="ru" />
              ) : (
                <StorageInventory locale="en" />
              )}
            />
            <CookieCategory
              checked={preferences.analytics}
              onChange={(checked) => setPreferences((current) => ({ ...current, analytics: checked }))}
              title={ru ? "Аналитика" : "Analytics"}
              summary={ru ? "Аналитические инструменты сейчас не подключены" : "No analytics tools are currently connected"}
              details={ru ? "Поставщика и срока хранения нет. Согласие сохраняется локально и само по себе ничего не загружает." : "There is no provider or retention period. Consent is stored locally and does not load anything by itself."}
            />
            <CookieCategory
              checked={preferences.marketing}
              onChange={(checked) => setPreferences((current) => ({ ...current, marketing: checked }))}
              title={ru ? "Маркетинг" : "Marketing"}
              summary={ru ? "Маркетинговые инструменты сейчас не подключены" : "No marketing tools are currently connected"}
              details={ru ? "Поставщика и срока хранения нет. Согласие сохраняется локально и само по себе ничего не загружает." : "There is no provider or retention period. Consent is stored locally and does not load anything by itself."}
            />
          </div>
        ) : null}
        <div className="cookie-manager__actions">
          <button type="button" className="button button-primary" onClick={() => save({ essential: true, analytics: true, marketing: true })}>{ru ? "Принять все" : "Accept all"}</button>
          <button type="button" className="button" onClick={() => save(defaults)}>{ru ? "Только необходимые" : "Essential only"}</button>
          {configuring ? (
            <button type="button" className="text-link" onClick={() => save(preferences)}>{ru ? "Сохранить выбор" : "Save selection"}</button>
          ) : (
            <button type="button" className="text-link" onClick={() => setConfiguring(true)}>{ru ? "Настроить" : "Configure"}</button>
          )}
        </div>
      </section>
    </div>
  );
}

function CookieCategory({ checked, disabled = false, title, summary, details, onChange }: {
  checked: boolean;
  disabled?: boolean;
  title: string;
  summary: string;
  details: ReactNode;
  onChange?: (checked: boolean) => void;
}) {
  return (
    <div className="cookie-manager__category">
      <label>
        <span><strong>{title}</strong><small>{summary}</small></span>
        <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange?.(event.target.checked)} />
      </label>
      <details><summary>{title}</summary><div className="cookie-manager__details">{details}</div></details>
    </div>
  );
}

function StorageInventory({ locale }: { locale: Locale }) {
  const ru = locale === "ru";
  const items = ru
    ? [
        ["CSRF cookie", "Защищает отправку форм", "2 часа", "KILENI"],
        ["Тема", "Запоминает Light, Dark или Signal", "До удаления данных сайта", "KILENI · localStorage"],
        ["Черновик брифа", "Сохраняет незавершённые ответы", "До отправки брифа или удаления данных", "KILENI · localStorage"],
        ["Связка аудита", "Передаёт имя и контакт в бриф только в этом браузере", "24 часа", "KILENI · sessionStorage"],
        ["Выбор cookies", "Запоминает этот выбор", "До удаления данных сайта", "KILENI · localStorage"],
      ]
    : [
        ["CSRF cookie", "Protects form submissions", "2 hours", "KILENI"],
        ["Theme", "Remembers Light, Dark or Signal", "Until site data is removed", "KILENI · localStorage"],
        ["Brief draft", "Keeps unfinished answers", "Until submission or data removal", "KILENI · localStorage"],
        ["Audit handoff", "Passes name and contact to the brief in this browser only", "24 hours", "KILENI · sessionStorage"],
        ["Cookie choice", "Remembers this selection", "Until site data is removed", "KILENI · localStorage"],
      ];

  return (
    <>
      <p>{ru ? "Эти данные нужны только для работы сайта. SMTP и Telegram используются на сервере для доставки отправленных форм и не устанавливают браузерные трекеры." : "This storage is required for the site to work. SMTP and Telegram are used server-side to deliver submitted forms and do not install browser trackers."}</p>
      <ul>
        {items.map(([name, purpose, duration, provider]) => (
          <li key={name}>
            <strong>{name}</strong>
            <span>{purpose}</span>
            <small>{ru ? "Срок" : "Duration"}: {duration} · {ru ? "Поставщик" : "Provider"}: {provider}</small>
          </li>
        ))}
      </ul>
    </>
  );
}

export function CookieSettingsButton({ locale }: { locale: Locale }) {
  return <button type="button" className="footer-cookie-button" onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}>{locale === "ru" ? "Настройки cookies" : "Cookie settings"}</button>;
}
