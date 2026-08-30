"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Locale } from "../../config/site";
import { localizedPath } from "../../config/site";

type HomeArticle = {
  slug: string;
  title: string;
  readerOutcome: string;
  readingMinutes: number;
  hero: { src: string; alt: string };
};

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function HomeArticleCarousel({ locale, articles }: { locale: Locale; articles: readonly HomeArticle[] }) {
  const ru = locale === "ru";
  const viewportRef = useRef<HTMLDivElement>(null);
  const [canMove, setCanMove] = useState({ previous: false, next: true });

  const syncControls = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const threshold = 4;
    setCanMove({
      previous: viewport.scrollLeft > threshold,
      next: viewport.scrollLeft + viewport.clientWidth < viewport.scrollWidth - threshold,
    });
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    syncControls();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(syncControls);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [syncControls]);

  const move = (direction: "previous" | "next") => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const firstCard = viewport.querySelector<HTMLElement>("[data-article-card]");
    const step = firstCard ? firstCard.offsetWidth + 20 : viewport.clientWidth * 0.82;
    viewport.scrollBy({
      left: direction === "next" ? step : -step,
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  };

  return (
    <div className="home-article-carousel" aria-roledescription="carousel" aria-label={ru ? "Новые разборы" : "Latest practical guides"}>
      <div className="home-article-carousel__viewport" ref={viewportRef} onScroll={syncControls}>
        {articles.map((article, index) => (
          <Link className="home-article-carousel__card" data-article-card href={localizedPath(locale, `blog/${article.slug}`)} key={article.slug}>
            <figure>
              <Image
                src={article.hero.src}
                alt={article.hero.alt}
                width={720}
                height={450}
                sizes="(max-width: 640px) 84vw, (max-width: 1100px) 58vw, 31vw"
                loading={index === 0 ? "eager" : "lazy"}
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
        ))}
      </div>
      <div className="home-article-carousel__controls" aria-label={ru ? "Прокрутка разборов" : "Guide navigation"}>
        <span>{ru ? "Листайте разборы" : "Browse guides"}</span>
        <div>
          <button type="button" onClick={() => move("previous")} disabled={!canMove.previous} aria-label={ru ? "Предыдущий разбор" : "Previous guide"}>←</button>
          <button type="button" onClick={() => move("next")} disabled={!canMove.next} aria-label={ru ? "Следующий разбор" : "Next guide"}>→</button>
        </div>
      </div>
    </div>
  );
}
