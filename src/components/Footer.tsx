import Link from "next/link";
import { navigation } from "@/src/content/site";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__top">
        <Link className="site-footer__brand" href="/">
          KILENI
        </Link>
        <nav className="site-footer__nav" aria-label="Навигация в подвале">
          {navigation.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
          <Link href="/privacy">Политика конфиденциальности</Link>
        </nav>
        <p className="site-footer__note">
          KILENI / КАТАЛОГ АРОМАТОВ
          <br />
          Официальный сайт бренда
        </p>
      </div>
      <div className="site-footer__line" />
      <div className="site-footer__meta">
        <span>© {new Date().getFullYear()} KILENI</span>
        <span>Ароматы KILENI</span>
      </div>
      <div className="site-footer__word" aria-hidden="true">
        KILENI
      </div>
    </footer>
  );
}
