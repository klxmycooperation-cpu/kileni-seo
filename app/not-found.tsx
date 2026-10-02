import Link from "next/link";
import { Logo } from "@/src/components/brand/Logo";
export default function NotFound() { return <main id="main-content" className="error-page"><Logo locale="ru" inverted/><p className="mono">ERROR · 404</p><h1>Страница не найдена</h1><p>Адрес изменился или такой страницы не существует.</p><Link className="button button-light" href="/">Вернуться на главную</Link></main>; }
