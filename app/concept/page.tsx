import type { Metadata } from "next";
import Link from "next/link";
import styles from "./concept.module.css";

export const metadata: Metadata = {
  title: "Концепт главной",
  robots: { index: false, follow: false },
};

const directions = [
  {
    number: "01",
    title: "Доступность страниц",
    text: "Проверяем, открываются ли важные страницы и может ли их увидеть поиск.",
    kind: "arc",
  },
  {
    number: "02",
    title: "Связи внутри сайта",
    text: "Смотрим, не теряются ли страницы между разделами, ссылками и заголовками.",
    kind: "orbit",
  },
  {
    number: "03",
    title: "Порядок исправлений",
    text: "Отделяем то, что мешает сайту сейчас, от задач, которые могут подождать.",
    kind: "points",
  },
] as const;

function CeramicOrb() {
  return (
    <div className={styles.orbScene} aria-label="Вращающаяся схема проверки сайта">
      <svg className={styles.orbits} viewBox="0 0 600 600" aria-hidden="true">
        <ellipse data-concept-orbit cx="300" cy="300" rx="248" ry="105" />
        <ellipse data-concept-orbit cx="300" cy="300" rx="224" ry="144" transform="rotate(58 300 300)" />
        <ellipse data-concept-orbit cx="300" cy="300" rx="224" ry="144" transform="rotate(-58 300 300)" />
        <circle cx="84" cy="300" r="5" />
        <circle cx="481" cy="189" r="5" />
        <circle cx="474" cy="430" r="5" />
      </svg>
      <div className={styles.orbShadow} />
      <div className={styles.orb} data-concept-orb aria-hidden="true">
        <div className={styles.orbHalo} />
        <div className={styles.orbCap} />
        <div className={styles.orbCore}>
          <svg viewBox="0 0 320 320">
            <defs>
              <pattern id="concept-maze" width="32" height="32" patternUnits="userSpaceOnUse">
                <path d="M3 3h21v9H13v17h16M29 5v20H18v-8H5" fill="none" stroke="currentColor" strokeWidth="3" />
                <circle cx="5" cy="5" r="2" fill="currentColor" />
              </pattern>
              <clipPath id="concept-orb-clip"><circle cx="160" cy="160" r="137" /></clipPath>
            </defs>
            <circle cx="160" cy="160" r="144" fill="url(#concept-maze)" opacity=".72" clipPath="url(#concept-orb-clip)" />
            <path d="M42 184c43 28 193 30 236-7" fill="none" stroke="currentColor" strokeWidth="3" opacity=".32" />
            <circle cx="160" cy="160" r="137" fill="none" stroke="currentColor" strokeWidth="2" opacity=".5" />
          </svg>
        </div>
        <div className={styles.orbBand} />
        <div className={styles.orbGlow} />
      </div>
      <span className={`${styles.satellite} ${styles.satelliteOne}`} aria-hidden="true" />
      <span className={`${styles.satellite} ${styles.satelliteTwo}`} aria-hidden="true" />
    </div>
  );
}

function Diagram({ kind }: { kind: (typeof directions)[number]["kind"] }) {
  if (kind === "arc") {
    return <svg data-concept-diagram viewBox="0 0 240 120" aria-hidden="true"><path d="M20 98C42 25 92 25 121 98S190 164 220 32"/><path d="M20 98H220" className={styles.diagramGuide}/><circle cx="20" cy="98" r="4"/><circle cx="121" cy="98" r="4"/><circle cx="220" cy="32" r="4"/></svg>;
  }
  if (kind === "orbit") {
    return <svg data-concept-diagram viewBox="0 0 240 120" aria-hidden="true"><circle cx="120" cy="60" r="24"/><ellipse cx="120" cy="60" rx="83" ry="28"/><ellipse cx="120" cy="60" rx="58" ry="30" transform="rotate(70 120 60)"/><circle cx="42" cy="60" r="4"/><circle cx="173" cy="34" r="4"/></svg>;
  }
  return <svg data-concept-diagram viewBox="0 0 240 120" aria-hidden="true"><path d="M18 22V102M48 40V84M78 14V108M108 54V76M138 29V95M168 47V81M198 20V105M222 63V80" className={styles.diagramGuide}/><path d="M18 62 48 49 78 66 108 40 138 55 168 34 198 44 222 23"/><circle cx="18" cy="62" r="4"/><circle cx="48" cy="49" r="4"/><circle cx="78" cy="66" r="4"/><circle cx="108" cy="40" r="4"/><circle cx="138" cy="55" r="4"/><circle cx="168" cy="34" r="4"/><circle cx="198" cy="44" r="4"/><circle cx="222" cy="23" r="4"/></svg>;
}

export default function ConceptPage() {
  return (
    <main className={styles.conceptHome}>
      <section className={styles.hero}>
        <header className={styles.header}>
          <Link className={styles.brand} href="/" aria-label="KILENI — действующая главная">KILENI<span>seo</span></Link>
          <nav aria-label="Разделы концепта"><a href="#approach">Подход</a><Link href="/cases">Кейсы</Link><Link href="/pricing">Цены</Link></nav>
          <Link className={styles.headerLink} href="/brief">Обсудить задачу <span aria-hidden="true">↗</span></Link>
        </header>

        <div className={styles.heroGrid}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>SEO-проверка и продвижение</p>
            <h1>Сайт есть.<br />Пора сделать так, чтобы его находили.</h1>
            <p className={styles.lead}>Проверим, что мешает важным страницам появляться в поиске, и объясним порядок исправлений без технического шума.</p>
            <div className={styles.actions}>
              <Link className={styles.primaryAction} href="/free-audit">Начать бесплатную проверку <span aria-hidden="true">↗</span></Link>
              <Link className={styles.secondaryAction} href="/cases">Посмотреть проверенные кейсы</Link>
            </div>
          </div>
          <CeramicOrb />
        </div>
        <p className={styles.heroNote}>Концепт первого экрана · локальная версия</p>
      </section>

      <section className={styles.approach} id="approach" aria-labelledby="concept-approach-title">
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>Как читаем сайт</p>
          <h2 id="concept-approach-title">Смотрим не на отдельные цифры, а на связи между ними.</h2>
        </div>
        <div className={styles.directionGrid}>
          {directions.map(({ number, title, text, kind }) => (
            <article className={styles.direction} key={number}>
              <div className={styles.directionTop}><span>{number}</span><Diagram kind={kind}/></div>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.closing}>
        <p className={styles.eyebrow}>Первый шаг</p>
        <h2>Начнём с того, что уже можно проверить.</h2>
        <Link className={styles.primaryAction} href="/free-audit">Проверить сайт <span aria-hidden="true">↗</span></Link>
      </section>
    </main>
  );
}
