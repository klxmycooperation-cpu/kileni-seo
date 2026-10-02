"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Locale } from "../../config/site";
import { localizedPath } from "../../config/site";

type HomeArticle = {
  slug: string;
  title: string;
  readerOutcome: string;
  readingMinutes: number;
  hero: { src: string; alt: string };
};

function carouselPosition(index: number, activeIndex: number, total: number) {
  const distance = (index - activeIndex + total) % total;
  return distance <= Math.floor(total / 2) ? distance : distance - total;
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function HomeArticleCarousel({ locale, articles }: { locale: Locale; articles: readonly HomeArticle[] }) {
  const ru = locale === "ru";
  const motionTimerRef = useRef<number | null>(null);
  const wheelLockRef = useRef(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [motion, setMotion] = useState<"previous" | "next" | null>(null);

  useEffect(() => () => {
    if (motionTimerRef.current !== null) window.clearTimeout(motionTimerRef.current);
  }, []);

  const move = (direction: "previous" | "next") => {
    if (articles.length < 2) return;
    const delta = direction === "next" ? 1 : -1;
    setActiveIndex((index) => (index + delta + articles.length) % articles.length);
    setMotion(direction);
    if (motionTimerRef.current !== null) window.clearTimeout(motionTimerRef.current);
    motionTimerRef.current = window.setTimeout(() => setMotion(null), prefersReducedMotion() ? 1 : 420);
  };

  const cycleOnWheel = (delta: number) => {
    if (wheelLockRef.current || Math.abs(delta) < 18) return;
    wheelLockRef.current = true;
    move(delta > 0 ? "next" : "previous");
    window.setTimeout(() => { wheelLockRef.current = false; }, 460);
  };

  return (
    <div
      className="home-article-carousel"
      aria-roledescription="carousel"
      aria-label={ru ? "Новые разборы" : "Latest practical guides"}
      data-active-index={activeIndex}
      data-carousel-motion={motion ?? undefined}
    >
      <div className="home-article-carousel__viewport" onWheel={(event) => cycleOnWheel(Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY)}>
        {articles.map((article, index) => {
          const position = carouselPosition(index, activeIndex, articles.length);
          const active = activeIndex === index;

          return (
            <Link
              className="home-article-carousel__card"
              data-article-card
              data-active={active ? "true" : undefined}
              data-carousel-position={position}
              href={localizedPath(locale, `blog/${article.slug}`)}
              key={article.slug}
              onClick={(event) => {
                if (active) return;
                event.preventDefault();
                move(position > 0 ? "next" : "previous");
              }}
            >
            <figure>
              <Image
                src={article.hero.src}
                alt={article.hero.alt}
                width={720}
                height={450}
                sizes="(max-width: 640px) 84vw, (max-width: 1100px) 58vw, 31vw"
                quality={60}
                loading="lazy"
              />
            </figure>
            <div className="home-article-carousel__body">
              <p className="home-article-carousel__meta">
                <span>{ru ? "Практический разбор" : "Practical guide"}</span>
                <span>{article.readingMinutes} {ru ? "минут чтения" : "min read"}</span>
              </p>
              <h3>{article.title}</h3>
              <p>{article.readerOutcome}</p>
              <span className="home-article-carousel__action">{ru ? "Открыть разбор" : "Open guide"} <b aria-hidden="true">↗</b></span>
            </div>
            </Link>
          );
        })}
      </div>
      <div className="home-article-carousel__controls" aria-label={ru ? "Прокрутка разборов" : "Guide navigation"}>
        <span className="home-article-carousel__progress" aria-live="polite">{String(activeIndex + 1).padStart(2, "0")} / {String(articles.length).padStart(2, "0")}</span>
        <div>
          <button type="button" onClick={() => move("previous")} disabled={articles.length < 2} aria-label={ru ? "Предыдущий разбор" : "Previous guide"}>←</button>
          <button type="button" onClick={() => move("next")} disabled={articles.length < 2} aria-label={ru ? "Следующий разбор" : "Next guide"}>→</button>
        </div>
      </div>
    </div>
  );
}
