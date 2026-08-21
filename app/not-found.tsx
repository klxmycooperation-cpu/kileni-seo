import Link from "next/link";
import Image from "next/image";
export default function NotFound() { return <main id="main-content" className="error-page"><Image src="/brand/kileni-logo-dark.svg" alt="KILENI SEO" width={201} height={48}/><p className="mono">ERROR · 404</p><h1>Страница не найдена</h1><p>Адрес изменился или такой страницы не существует.</p><Link className="button button-light" href="/">Вернуться на главную</Link></main>; }
