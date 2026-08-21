"use client";
import Image from "next/image";
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) { return <main id="main-content" className="error-page"><Image src="/brand/kileni-logo-dark.svg" alt="KILENI SEO" width={201} height={48}/><p className="mono">ERROR · 500</p><h1>Не удалось открыть страницу</h1><p>Состояние сохранено. Попробуйте повторить запрос.</p><button className="button button-light" onClick={reset}>Повторить</button></main>; }
