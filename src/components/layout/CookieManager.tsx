"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { Locale } from "../../config/site";

const STORAGE_KEY = "kileni-cookie-preferences";
const OPEN_EVENT = "kileni:open-cookie-settings";

type Preferences = { essential: true; analytics: boolean; marketing: boolean };
const defaults: Preferences = { essential: true, analytics: false, marketing: false };

export function CookieManager({ locale }: { locale: Locale }) {
  const ru = locale === "ru";
  const [open, setOpen] = useState(false);
  const [configuring, setConfiguring] = useState(false);
  const [saved, setSaved] = useState(false);
  const [preferences, setPreferences] = useState<Preferences>(defaults);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Preferences>;
        setPreferences({ essential: true, analytics: Boolean(parsed.analytics), marketing: Boolean(parsed.marketing) });
        setSaved(true);
      } else setOpen(true);
    } catch {
      setOpen(true);
    }
    const show = () => {
      setConfiguring(true);
      setOpen(true);
    };
    window.addEventListener(OPEN_EVENT, show);
    return () => window.removeEventListener(OPEN_EVENT, show);
  }, []);

  const save = (next: Preferences) => {
    setPreferences(next);
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
    setSaved(true);
    setConfiguring(false);
    setOpen(false);
  };

  if (!open) return saved ? null : null;
  return (
    <div className="cookie-layer" role="presentation">
      <section className={`cookie-manager${configuring ? " cookie-manager--settings" : " cookie-manager--compact"}`} role="dialog" aria-modal="true" aria-labelledby="cookie-title">
        <div className="cookie-manager__intro">
          <p className="section-kicker">{ru ? "Настройки данных" : "Data settings"}</p>
          <h2 id="cookie-title">{ru ? "Cookies и локальные настройки" : "Cookies and local preferences"}</h2>
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
        ["Вступительная анимация", "Не повторяет длинное вступление в одной сессии", "До закрытия вкладки", "KILENI · sessionStorage"],
        ["Выбор cookies", "Запоминает этот выбор", "До удаления данных сайта", "KILENI · localStorage"],
      ]
    : [
        ["CSRF cookie", "Protects form submissions", "2 hours", "KILENI"],
        ["Theme", "Remembers Light, Dark or Signal", "Until site data is removed", "KILENI · localStorage"],
        ["Brief draft", "Keeps unfinished answers", "Until submission or data removal", "KILENI · localStorage"],
        ["Audit handoff", "Passes name and contact to the brief in this browser only", "24 hours", "KILENI · sessionStorage"],
        ["Intro animation", "Avoids replaying the long intro in one session", "Until the tab is closed", "KILENI · sessionStorage"],
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
