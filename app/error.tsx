"use client";
import { Logo } from "@/src/components/brand/Logo";
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) { return <main id="main-content" className="error-page"><Logo locale="ru" inverted/><p className="mono">ERROR · 500</p><h1>Не удалось открыть страницу</h1><p>Состояние сохранено. Попробуйте повторить запрос.</p><button className="button button-light" onClick={reset}>Повторить</button></main>; }
