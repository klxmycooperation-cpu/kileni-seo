"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import type { Locale } from "../../config/site";
import { localizedPath } from "../../config/site";
import { CanvasText } from "../ui/canvas-text";
import { AboutProductMotion, AboutWorkflow } from "./AboutMotion";
import { aboutPlanetPoster as storyPoster, aboutPlanetVideo as storyVideo } from "../../lib/media/about-preload";
import "../../../app/company-motion.css";


function StaggeredHeading({ id, children }: { id: string; children: string }) {
  return <h2 id={id} aria-label={children}><CanvasText text={children} className="about-v3-staggered-text about-v3-flowing-title">{children.split(/\s+/u).map((word, index) => <span key={`${word}-${index}`} style={{ "--word-index": index } as CSSProperties}>{word}</span>)}</CanvasText></h2>;
}

export function AboutStory({ locale, breadcrumbs }: { locale: Locale; breadcrumbs: ReactNode }) {
  const ru = locale === "ru";
  const conversationRef = useRef<HTMLDivElement>(null);
  const [conversationStarted, setConversationStarted] = useState(false);
  const [conversationReplay, setConversationReplay] = useState(0);
  const [motionPaused, setMotionPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const motionLabel = ru ? (motionPaused ? "Продолжить движение" : "Остановить движение") : (motionPaused ? "Resume motion" : "Pause motion");

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(preference.matches);
    updatePreference();
    preference.addEventListener("change", updatePreference);
    return () => preference.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    const scenes = Array.from(document.querySelectorAll<HTMLElement>(".about-v3-scene"));
    if (reducedMotion || window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      scenes.forEach((scene) => { scene.classList.add("is-visible"); scene.dataset.inView = "true"; });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => {
        (entry.target as HTMLElement).dataset.inView = String(entry.isIntersecting);
        if (entry.isIntersecting) entry.target.classList.add("is-visible");
      }),
      { threshold: 0.22 },
    );
    scenes.forEach((scene) => observer.observe(scene));
    return () => observer.disconnect();
  }, [reducedMotion]);

  useEffect(() => {
    const conversation = conversationRef.current;
    if (!conversation) return;

    if (reducedMotion || window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      setConversationStarted(true);
      return;
    }

    let observer: IntersectionObserver | undefined;
    let started = false;
    const observe = () => {
      if (started) return;
      observer?.disconnect();
      const availableHeight = Math.max(1, window.innerHeight - 96);
      // The threshold must remain reachable when a phone changes orientation.
      const visibleRatio = Math.min(.55, availableHeight * .65 / Math.max(1, conversation.offsetHeight));
      observer = new IntersectionObserver(([entry]) => {
        if (!entry?.isIntersecting || entry.intersectionRatio < visibleRatio) return;
        started = true;
        setConversationStarted(true);
        observer?.disconnect();
      }, { threshold: visibleRatio });
      observer.observe(conversation);
    };
    observe();
    window.addEventListener("resize", observe, { passive: true });
    return () => { observer?.disconnect(); window.removeEventListener("resize", observe); };
  }, [reducedMotion]);

  useEffect(() => {
    const videoA = document.getElementById("aboutVideoA") as HTMLVideoElement | null;
    const videoB = document.getElementById("aboutVideoB") as HTMLVideoElement | null;
    if (!videoA || !videoB) return;
    if (reducedMotion || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      videoA.autoplay = false;
      videoA.pause();
      videoB.pause();
      return;
    }
    if (motionPaused) {
      videoA.pause();
      videoB.pause();
      return;
    }
    videoA.classList.add("is-active");
    videoB.classList.remove("is-active");

    const fadeDuration = 0.78;
    let current = videoA;
    let next = videoB;
    let swapping = false;
    let playPending = false;
    let disposed = false;
    let swapTimer: number | undefined;
    const playCurrent = () => {
      if (document.hidden || !current.paused || playPending) return;
      playPending = true;
      void current.play().then(() => {
        if (disposed) { videoA.pause(); videoB.pause(); }
      }).catch(() => undefined).finally(() => { playPending = false; });
    };
    const prepareSecondVideo = () => {
      // Do not let a second large download starve the first seconds of playback.
      if (videoB.src || videoA.currentTime < 2 || !Number.isFinite(videoA.duration)
        || !videoA.buffered.length || videoA.buffered.end(videoA.buffered.length - 1) < Math.min(videoA.duration, 10)) return;
      videoB.src = storyVideo;
      videoB.preload = "auto";
      videoB.load();
    };
    const swap = () => {
      prepareSecondVideo();
      if (swapping || next.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !Number.isFinite(current.duration) || current.duration - current.currentTime > fadeDuration) return;
      swapping = true;
      const outgoing = current;
      next.currentTime = 0;
      void next.play().then(() => {
        if (disposed) { videoA.pause(); videoB.pause(); return; }
        next.classList.add("is-active");
        outgoing.classList.remove("is-active");
        [current, next] = [next, outgoing];
        swapTimer = window.setTimeout(() => {
          outgoing.pause();
          outgoing.currentTime = 0;
          swapping = false;
        }, (fadeDuration + 0.1) * 1000);
      }).catch(() => { swapping = false; });
    };

    videoA.addEventListener("loadeddata", playCurrent);
    videoA.addEventListener("canplay", playCurrent);
    videoA.addEventListener("progress", prepareSecondVideo);
    videoA.addEventListener("timeupdate", swap);
    videoB.addEventListener("timeupdate", swap);
    window.addEventListener("pageshow", playCurrent);
    document.addEventListener("visibilitychange", playCurrent);
    if (!videoA.paused) prepareSecondVideo();
    playCurrent();
    return () => {
      disposed = true;
      window.clearTimeout(swapTimer);
      videoA.pause();
      videoB.pause();
      videoA.removeEventListener("loadeddata", playCurrent);
      videoA.removeEventListener("canplay", playCurrent);
      videoA.removeEventListener("progress", prepareSecondVideo);
      videoA.removeEventListener("timeupdate", swap);
      videoB.removeEventListener("timeupdate", swap);
      window.removeEventListener("pageshow", playCurrent);
      document.removeEventListener("visibilitychange", playCurrent);
    };
  }, [motionPaused, reducedMotion]);



  return (
      <div className="about-v3" data-motion-paused={motionPaused}>
        <link rel="preload" as="image" href={storyPoster} fetchPriority="high" />
        <button className="about-motion-toggle" type="button" aria-label={motionLabel} title={motionLabel} aria-pressed={motionPaused} onClick={() => setMotionPaused((paused) => !paused)}><span aria-hidden="true">{motionPaused ? "▷" : "Ⅱ"}</span><span className="about-motion-toggle__text">{motionLabel}</span></button>
        <div className="about-v3-continuity" aria-hidden="true">
          <div className="about-v3-continuity__mist"/>
        </div>
        <section className="about-v3-scene about-v3-hero is-visible" aria-labelledby="about-story-title">
          <div className="about-v3-video-stage" aria-hidden="true">
            <video className="about-v3-video is-active" id="aboutVideoA" autoPlay={!motionPaused && !reducedMotion} muted loop playsInline preload="auto" disablePictureInPicture poster={storyPoster}><source src={storyVideo} type="video/mp4"/></video>
            <video className="about-v3-video" id="aboutVideoB" muted loop playsInline preload="none" disablePictureInPicture/>
            <div className="about-v3-cosmos"/>
          </div>
          <div className="about-v3-hero__veil" aria-hidden="true"/>
          {breadcrumbs}
          <div className="shell about-v3-hero__content">
            <p className="about-v3-eyebrow">{ru ? "Кто мы" : "Who we are"}</p>
            <div className="about-v3-brand" aria-label="KILENI SEO">
              <span className="about-v3-brand__name">KILENI</span><span className="about-v3-brand__seo">seo</span>
            </div>
            <h1 id="about-story-title" className="about-v3-hero__title"><CanvasText text={ru ? "Продвигаем сайты и создаём цифровые продукты, которые удобно развивать." : "We make websites easier to find and build digital products that can grow."} className="about-v3-flowing-title"/></h1>
            <p className="about-v3-hero__lead">{ru ? "Занимаемся SEO, карточками товаров для маркетплейсов и разработкой сайтов — от лендинга до многостраничного проекта." : "We work on SEO, marketplace product listings and websites — from a landing page to a multi-page project."}</p>
            <a className="about-v3-scroll-link" href="#about-seo">{ru ? "Посмотреть, чем занимаемся" : "See what we do"}<span aria-hidden="true">↓</span></a>
          </div>
        </section>

        <section className="about-v3-scene about-v3-seo" id="about-seo" aria-labelledby="about-seo-title">
          <div className="shell about-v3-split">
            <div className="about-v3-scene__number" aria-hidden="true">01</div>
            <div className="about-v3-scene__copy">
              <p className="about-v3-eyebrow">{ru ? "SEO и продвижение" : "SEO and growth"}</p>
              <StaggeredHeading id="about-seo-title">{ru ? "Находим, что мешает сайту появляться в поиске." : "We find what is preventing a website from appearing in search."}</StaggeredHeading>
              <p>{ru ? "Проверяем техническое состояние, структуру страниц, контент и скорость. Затем объясняем, что стоит исправить в первую очередь и как это проверить." : "We check technical condition, page structure, content and speed. Then we explain what should be fixed first and how to verify it."}</p>
              <p>{ru ? "В отчёте связываем замечания с конкретными страницами. Разделяем срочные ошибки и улучшения, чтобы бюджет шёл на задачи с понятным основанием. Если нужно внедрение, его объём согласуем отдельно или включаем в выбранный пакет." : "Each finding is tied to a page. We separate urgent errors from improvements so the budget goes to justified work. Implementation is agreed separately or included in the selected package."}</p>
              <ul className="about-story-details"><li>{ru ? "Примеры ошибок и объяснение причин" : "Error examples and explanations"}</li><li>{ru ? "Порядок исправлений и задания для внедрения" : "Priorities and implementation tasks"}</li><li>{ru ? "Повторная проверка согласованных изменений" : "Repeat checks of the agreed changes"}</li></ul>
              <Link className="about-story-link" href={localizedPath(locale, "seo-audit")}>{ru ? "Посмотреть состав аудита" : "Explore the audit scope"}<span aria-hidden="true">↗</span></Link>
            </div>
            <div className="about-v3-search-map" aria-hidden="true">
              <div className="about-v3-search-map__query"><span>⌕</span><b>{ru ? "Проверяем сайт" : "Checking the website"}</b><i/></div>
              <div className="about-v3-search-map__result about-v3-search-map__result--one"><span>01</span><b>{ru ? "Структура страниц" : "Page structure"}</b><i/></div>
              <div className="about-v3-search-map__result about-v3-search-map__result--two"><span>02</span><b>{ru ? "Техническая часть" : "Technical setup"}</b><i/></div>
              <div className="about-v3-search-map__result about-v3-search-map__result--three"><span>03</span><b>{ru ? "Скорость загрузки" : "Loading speed"}</b><i/></div>
            </div>
          </div>
        </section>

        <section className="about-v3-scene about-v3-marketplaces" aria-labelledby="about-marketplaces-title">
          <div className="shell about-v3-split about-v3-split--reverse">
            <div className="about-v3-scene__number" aria-hidden="true">02</div>
            <div className="about-v3-scene__copy">
              <p className="about-v3-eyebrow">{ru ? "Маркетплейсы" : "Marketplaces"}</p>
              <StaggeredHeading id="about-marketplaces-title">{ru ? "Делаем карточки товаров понятными для поиска и покупателя." : "We make product listings clear for search and for the buyer."}</StaggeredHeading>
              <p>{ru ? "Работаем с карточками на Wildberries, Ozon и Яндекс Маркете: собираем структуру, готовим контент и приводим описание к требованиям площадки." : "We work with Wildberries, Ozon and Yandex Market listings: structure the content and prepare product information for each platform."}</p>
              <p>{ru ? "Сначала разбираемся в товаре: кому он нужен, что важно при выборе и какие вопросы возникают до покупки. Из этого собираем содержание карточки, изображения и описание. Визуальная подача должна раскрывать свойства товара и помогать сравнить его с другими." : "We start with the product: who needs it, what matters when choosing it and which questions arise before buying. These answers shape the images and description. The presentation should explain the product and help the buyer compare it."}</p>
              <ul className="about-story-details"><li>{ru ? "Структура карточки и поисковые формулировки" : "Listing structure and search wording"}</li><li>{ru ? "Инфографика, описание и характеристики" : "Infographics, description and specifications"}</li><li>{ru ? "Проверка по требованиям выбранной площадки" : "Checks against the selected platform’s requirements"}</li></ul>
              <Link className="about-story-link" href={localizedPath(locale, "marketplaces")}>{ru ? "Посмотреть работу с карточками" : "Explore product listing services"}<span aria-hidden="true">↗</span></Link>
            </div>
            <div className="about-v3-marketplace-stage" aria-label={ru ? "Предметная сцена" : "Product scene"}>
              <AboutProductMotion locale={locale} paused={motionPaused} reducedMotion={reducedMotion}/>
              <span className="about-v3-marketplace-stage__beam" aria-hidden="true"/>

            </div>
          </div>
        </section>

        <section className="about-v3-scene about-v3-web" aria-labelledby="about-web-title">
          <div className="shell about-v3-split">
            <div className="about-v3-scene__number" aria-hidden="true">03</div>
            <div className="about-v3-scene__copy">
              <p className="about-v3-eyebrow">{ru ? "Сайты и интерфейсы" : "Websites and interfaces"}</p>
              <StaggeredHeading id="about-web-title">{ru ? "Создаём лендинги, многостраничные сайты и сервисные страницы." : "We build landing pages, multi-page websites and service pages."}</StaggeredHeading>
              <p>{ru ? "Проектируем структуру, пишем и собираем интерфейс, чтобы посетителю было легко понять предложение, а команде — развивать сайт дальше." : "We plan the structure and build the interface so visitors can understand the offer and the team can continue developing the website."}</p>
              <p>{ru ? "До сборки согласуем страницы, основные экраны и содержание. Проверяем мобильную версию, формы и переходы. Передаём готовый сайт и исходный код; подключение внешних сервисов и поддержку фиксируем в составе заказа." : "Before building, we agree on the pages, key screens and content. We check the mobile layout, forms and navigation. You receive the website and source code; integrations and support are defined in the order."}</p>
              <ul className="about-story-details"><li>{ru ? "Структура и макеты под задачу бизнеса" : "Structure and layouts for the business task"}</li><li>{ru ? "Адаптивные страницы, формы и базовая аналитика" : "Responsive pages, forms and basic analytics"}</li><li>{ru ? "Файлы проекта и объяснение дальнейшей работы" : "Project files and handover instructions"}</li></ul>
              <Link className="about-story-link" href={localizedPath(locale, "web-development")}>{ru ? "Выбрать формат сайта" : "Choose a website format"}<span aria-hidden="true">↗</span></Link>
            </div>
            <div className="about-v3-code-editor" aria-hidden="true">
              <div className="about-v3-code-editor__bar"><i/><i/><i/><span>{ru ? "От структуры к готовому сайту" : "From structure to a working website"}</span></div>
              <div className="about-website-preview"><div className="about-website-preview__nav"><b>{ru ? "Ваш бренд" : "Your brand"}</b><i/><i/></div><div className="about-website-preview__hero"><div><span>{ru ? "Понятное предложение" : "A clear offer"}</span><strong>{ru ? <>Сайт,<br/>с&nbsp;которым<br/>удобно<br/>работать</> : "A website that is easy to use"}</strong><i/></div><div className="about-website-preview__object"><i/><i/><i/></div></div><div className="about-website-preview__cards"><i/><i/><i/></div></div>
              <div className="about-website-phone"><i/><b>{ru ? "Ваш бренд" : "Your brand"}</b><span>{ru ? "Удобно и на телефоне" : "Works on your phone"}</span><div/><em/></div>
              <div className="about-website-viewport-label">{ru ? "Проверяем на компьютере и телефоне" : "Checked on desktop and mobile"}</div>
            </div>
          </div>
        </section>

        <AboutWorkflow locale={locale}/>

        <section className="about-v3-scene about-v3-final" aria-labelledby="about-final-title">
          <div className="shell about-v3-final__content">
            <div className="about-v3-scene__number" aria-hidden="true">04</div>
            <div className="about-v3-final__copy">
              <p className="about-v3-eyebrow">{ru ? "Следующий шаг" : "Next step"}</p>
              <StaggeredHeading id="about-final-title">{ru ? "Расскажите о задаче — соберём понятный план работы." : "Tell us about the task — we will put together a clear plan."}</StaggeredHeading>
              <p>{ru ? "Начнём с того, что уже есть: сайт, карточки товаров или идея нового проекта." : "We can start with what you already have: a website, product listings or an idea for a new project."}</p>
              <p>{ru ? "Пришлите ссылку или материалы и расскажите, что хотите изменить. Предложим подходящий формат, объясним границы работы и назовём условия до начала проекта." : "Share a link or materials and tell us what you want to change. We will recommend a suitable format and explain the scope and terms before the project starts."}</p>
              <Link className="about-story-link" href={localizedPath(locale, "cases")}>{ru ? "Посмотреть задачи и результаты проектов" : "Explore project tasks and results"}<span aria-hidden="true">↗</span></Link>
              <div className="about-v3-final__actions">
                <Link className="button button-primary" href={localizedPath(locale, "brief")}>{ru ? "Заполнить короткий бриф" : "Complete the short brief"}<span aria-hidden="true">↗</span></Link>
                <Link className="about-v3-audit-link" href={localizedPath(locale, "free-audit")}>{ru ? "Начать с бесплатной проверки" : "Start with a free check"}<span aria-hidden="true">↗</span></Link>
              </div>
            </div>
            <div ref={conversationRef} className="about-v3-conversation" data-playing={conversationStarted ? "true" : "false"} data-glossary-skip aria-label={ru ? "Пример переписки с KILENI" : "Example conversation with KILENI"}>
              <div className="about-v3-conversation__topbar">
                <span className="about-v3-conversation__avatar">K</span>
                <span><b>KILENI <i>seo</i></b><small>{ru ? "Пример переписки" : "Example conversation"}</small></span>
                <button className="about-chat-replay" type="button" aria-label={ru ? "Повторить диалог" : "Replay conversation"} onClick={() => { setConversationStarted(true); setConversationReplay((value) => value + 1); }}><span aria-hidden="true">↻</span></button>
              </div>
              <div key={conversationReplay} className="about-v3-conversation__timeline">
                <div className="about-chat-route" aria-hidden="true"><span>{ru ? "Обращение" : "Enquiry"}</span><i/><span>{ru ? "Проверка" : "Review"}</span><i/><span>{ru ? "План работ" : "Work plan"}</span></div>
                <div className="about-v3-conversation__message about-v3-conversation__message--client about-v3-conversation__message--opening">
                  <p>{ru ? "Мой сайт никто не видит. Помогите!" : "Nobody can find my website. Can you help?"}</p>
                  <time>12:41</time>
                </div>
                <div className="about-v3-conversation__typing about-v3-conversation__typing--first" aria-hidden="true"><i/><i/><i/></div>
                <div className="about-v3-conversation__message about-v3-conversation__message--kileni about-v3-conversation__message--answer">
                  <p><strong>{ru ? "Не проблема!" : "No problem!"}</strong> {ru ? "Сначала проверим, где сайт теряет видимость, и покажем, что исправить." : "First, we will find where the website loses visibility and show what to fix."}</p>
                  <time>12:42</time>
                </div>
                <div className="about-v3-conversation__message about-v3-conversation__message--client about-v3-conversation__message--question">
                  <p>{ru ? "С чего начнём?" : "Where do we start?"}</p>
                  <time>12:42</time>
                </div>
                <div className="about-v3-conversation__typing about-v3-conversation__typing--second" aria-hidden="true"><i/><i/><i/></div>
                <div className="about-v3-conversation__message about-v3-conversation__message--kileni about-v3-conversation__message--plan">
                  <p>{ru ? "Проверим индексацию, структуру и скорость. Затем расставим задачи по приоритету." : "We will check indexing, structure and speed, then prioritise the work."}</p>
                  <time>12:43</time>
                </div>
                <div className="about-v3-conversation__message about-v3-conversation__message--client about-v3-conversation__message--thanks">
                  <p>{ru ? "Отлично, спасибо!" : "Great, thank you!"}</p>
                  <time>12:43</time>
                </div>
                <div className="about-v3-conversation__results about-chat-report" aria-label={ru ? "Пример плана исправлений" : "An example improvement plan"}>
                  <div className="about-chat-report__header"><span aria-hidden="true">↗</span><div><small>{ru ? "После проверки" : "After the review"}</small><strong>{ru ? "План исправлений" : "Improvement plan"}</strong></div><b aria-hidden="true">K</b></div>
                  <ol>
                    <li><span aria-hidden="true">01</span>{ru ? "Проверить доступность страниц для поиска" : "Check that search engines can access the pages"}</li>
                    <li><span aria-hidden="true">02</span>{ru ? "Уточнить структуру и связи между страницами" : "Review the structure and links between pages"}</li>
                    <li><span aria-hidden="true">03</span>{ru ? "Разобрать скорость загрузки" : "Investigate loading speed"}</li>
                  </ol>
                  <div className="about-chat-report__footer"><i aria-hidden="true">✓</i>{ru ? "Задачи с пояснениями и приоритетами" : "Tasks with explanations and priorities"}</div>
                </div>
              </div>
              <p className="about-motion-example">{ru ? "Так может начаться работа над сайтом. Состав и условия согласуем после знакомства с вашей задачей." : "This is how a website project can begin. We agree on scope and terms after reviewing your task."}</p>
            </div>
          </div>
        </section>
      </div>
  );
}
