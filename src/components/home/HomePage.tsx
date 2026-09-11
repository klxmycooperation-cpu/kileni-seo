import Link from "next/link";
import type { Locale } from "../../config/site";
import { localizedPath } from "../../config/site";
import { getArticles } from "../../content/articles";
import { getCases } from "../../content/cases";
import { getDictionary } from "../../content/dictionary";
import { PublicShell } from "../layout/PublicShell";
import { Faq } from "../pages/Faq";
import { BrandIntro } from "./BrandIntro";
import { HeroScan } from "./HeroScan";
import { HomeCaseExplorer } from "./HomeCaseExplorer";
import { HomeArticleCarousel } from "./HomeArticleCarousel";
import { HomeDecisionRoute } from "./HomeDecisionRoute";
import { HomeCheckCategories, HomeMobileDisclosure, HomeProcessSteps } from "./HomeProcessSteps";

export function HomePage({ locale }: { locale: Locale }) {
  const d = getDictionary(locale);
  const ru = locale === "ru";
  const cases = getCases(locale);
  const articles = getArticles(locale);
  const process = ru
    ? [
        { title: "Проверяем", text: "Проверяем до 10 выбранных публичных страниц: ответы сервера, ограничения индексации и технические настройки.", result: "Сохраняем найденные замечания по страницам" },
        { title: "Объясняем", text: "Показываем результаты проверки и отделяем критичные технические замечания от рекомендаций, которые можно запланировать позже.", result: "Фиксируем порядок следующих действий" },
        { title: "Исправляем", text: "Согласуем объём и по этапам внедряем нужные изменения: от структуры до контента и скорости.", result: "Фиксируем выполненные изменения" },
        { title: "Перепроверяем", text: "После внедрения повторяем те же проверки и фиксируем, что действительно изменилось.", result: "Сохраняем результат повторной проверки" },
      ]
    : [
        { title: "Check", text: "We check up to 10 selected public pages: server responses, indexing restrictions and technical settings.", result: "You receive the findings for the checked pages" },
        { title: "Explain", text: "We explain the findings and separate critical technical issues from recommendations that can be scheduled later.", result: "We record the next actions in priority order" },
        { title: "Implement", text: "We agree the scope and implement the necessary changes in stages: structure, content and speed.", result: "We record the completed changes" },
        { title: "Recheck", text: "After implementation, we repeat the same checks and record what actually changed.", result: "We save the follow-up check result" },
      ];
  const directions = ru
    ? [
        { title: "SEO-продвижение", text: "Технические исправления, структура и новые страницы по плану.", href: "seo-promotion" },
        { title: "Wildberries и Ozon", text: "Карточки, тексты и визуальная упаковка товара.", href: "marketplaces" },
        { title: "Разработка", text: "Лендинги, корпоративные сайты и каталоги.", href: "web-development" },
        { title: "Яндекс Реклама", text: "Настройка и ведение кампаний с заранее согласованным объёмом работ.", href: "yandex-ads" },
      ]
    : [
        { title: "SEO support", text: "Technical improvements, structure and planned new pages.", href: "seo-promotion" },
        { title: "Wildberries and Ozon", text: "Product listings, copy and visual presentation.", href: "marketplaces" },
        { title: "Web development", text: "Landing pages, corporate websites and catalogues.", href: "web-development" },
        { title: "Yandex Ads", text: "Campaign setup and management with clear boundaries.", href: "yandex-ads" },
      ];
  const checkCategories = ru
    ? [
        { title: "Индексация", text: "Проверяем, может ли важная страница попасть в поиск и не закрыта ли она от обхода.", href: localizedPath(locale, "glossary/indexing") },
        { title: "Структура", text: "Смотрим, точно ли заголовки, адреса и ссылки описывают содержание страниц.", href: localizedPath(locale, "glossary/on-page") },
        { title: "Производительность", text: "Если лабораторный тест доступен, показываем итоговую оценку и отдельные параметры без предположений о причине.", href: localizedPath(locale, "glossary/core-web-vitals") },
        { title: "Оптимизация", text: "Распределяем замечания по приоритету: что исправить сейчас, а что может подождать.", href: localizedPath(locale, "glossary/seo-audit") },
      ]
    : [
        { title: "Indexing", text: "We check whether important pages can enter search results and are open to crawling.", href: localizedPath(locale, "glossary/indexing") },
        { title: "Structure", text: "We check whether headings, URLs and page relationships are clear to visitors and search systems.", href: localizedPath(locale, "glossary/on-page") },
        { title: "Performance", text: "When a laboratory test is available, we show its score and separate metrics without guessing the cause.", href: localizedPath(locale, "glossary/core-web-vitals") },
        { title: "Optimisation", text: "We turn the findings into a clear order: what to fix now and what can wait.", href: localizedPath(locale, "glossary/seo-audit") },
      ];
  const faq = ru
    ? [
        { q: "Что покажет бесплатная проверка?", a: "Число найденных и проверенных страниц, статусы выполненных проверок, конкретные замечания по выбранным адресам и порядок исправлений." },
        { q: "Нужен доступ к сайту?", a: "Нет. Проверка видит только те страницы, которые доступны обычному посетителю, и соблюдает правила сайта для поисковых систем." },
        { q: "Можно проверить большой сайт?", a: "Бесплатно проверяем до 10 ключевых публичных страниц. Для более крупного сайта покажем, какие разделы стоит разобрать отдельно." },
        { q: "Можно заказать исправления?", a: "Да. Сначала отдельно согласуем состав, срок, стоимость и критерии повторной проверки." },
        { q: "Вы гарантируете позиции?", a: "Нет. Позиции зависят от спроса, конкурентов, поисковых систем и самого предложения. Мы отвечаем за согласованный объём и проверяемые изменения." },
      ]
    : [
        { q: "What does the free check show?", a: "Discovered and checked page counts, statuses for the completed checks, concrete findings tied to the selected URLs, and clear next steps." },
        { q: "Do you need website access?", a: "No. The free check uses public pages only and respects robots.txt restrictions." },
        { q: "Can you check a large website?", a: "The free check covers up to 10 key public pages. For larger websites, we will show which sections need a separate review." },
        { q: "Can you implement the fixes?", a: "Yes. Scope, timing, price and recheck criteria are agreed separately before implementation." },
        { q: "Do you guarantee rankings?", a: "No. Rankings depend on demand, competitors, search engines and the offer itself. We are accountable for the agreed scope and verifiable changes." },
      ];

  return (
    <PublicShell locale={locale}>
      <BrandIntro />
      <div className="home-content home-redesign home-10">
        <HeroScan locale={locale}/>

        <nav className="home-mobile-section-nav" aria-label={ru ? "По разделам главной" : "Home page sections"} data-mobile-section-nav>
          <a href="#free-check">{ru ? "Проверка" : "Check"}</a>
          <a href="#home-process">{ru ? "Как работаем" : "Process"}</a>
          <a href="#home-formats">{ru ? "Форматы" : "Formats"}</a>
          <a href="#home-cases">{ru ? "Кейсы" : "Cases"}</a>
        </nav>

        <HomeCheckCategories locale={locale} items={checkCategories} />

        <section className="home-entry-route" id="home-tasks" aria-labelledby="home-task-routes-title">
          <div className="shell">
            <div className="home-entry-route__heading">
              <p>{ru ? "С чего начать" : "Where to start"}</p>
              <h2 id="home-task-routes-title">{ru ? "Выберите ближайшую задачу" : "Choose the closest goal"}</h2>
              <span>{ru ? "На следующей странице будут состав, ограничения и следующий шаг." : "The next page explains the scope, boundaries and next step."}</span>
            </div>
            <HomeMobileDisclosure label={ru ? "Показать задачи" : "Show client goals"} className="home-entry-route__disclosure">
              <nav className="home-entry-route__list" aria-label={ru ? "Задачи клиентов" : "Client goals"}>
                {d.scenarios.map((item, index) => (
                  <Link key={item.code} href={localizedPath(locale, item.href)}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <div><strong>{item.title}</strong><small>{item.text}</small></div>
                    <b aria-hidden="true">↗</b>
                  </Link>
                ))}
              </nav>
            </HomeMobileDisclosure>
          </div>
        </section>

        <section className="home-process-section" id="home-process" aria-labelledby="home-process-title">
          <div className="shell">
            <div className="home-section-heading home-section-heading--light">
              <p>{ru ? "Как проходит работа" : "How the work runs"}</p>
              <h2 id="home-process-title">{ru ? "От бесплатной проверки до контрольного результата" : "From the free check to a verified result"}</h2>
              <span>{ru ? "Сначала находим причину, затем согласуем исправления и повторяем ту же проверку." : "We first confirm the cause, then agree the fixes and repeat the same check."}</span>
            </div>
            <HomeProcessSteps steps={process} />
          </div>
        </section>

        <HomeDecisionRoute locale={locale} />

        <HomeCaseExplorer locale={locale} cases={cases} />

        <section className="section home-articles" id="home-articles" aria-labelledby="home-articles-title">
          <div className="shell">
            <div className="home-section-heading home-section-heading--row"><div><p>{ru ? "Блог" : "Blog"}</p><h2 id="home-articles-title">{ru ? "Новые разборы — прямо на главной" : "Latest practical guides on the home page"}</h2></div><Link className="warm-text-link" href={localizedPath(locale, "blog")}>{ru ? "Весь блог" : "All guides"} <span>↗</span></Link></div>
            <HomeMobileDisclosure label={ru ? "Показать разборы" : "Show practical guides"} className="home-articles__disclosure">
              <HomeArticleCarousel locale={locale} articles={articles} />
            </HomeMobileDisclosure>
          </div>
        </section>

        <section className="section home-deliverables" id="home-deliverables" aria-labelledby="home-deliverables-title">
          <div className="shell home-deliverables-grid">
            <div className="home-section-heading">
              <p>{ru ? "Что вы получите" : "What you receive"}</p>
              <h2 id="home-deliverables-title">{ru ? "Как замечание превращается в проверенное исправление" : "How a finding becomes a verified fix"}</h2>
              <p className="warm-lead">{ru ? "Показываем весь путь на одном замечании: от найденной причины до результата повторной проверки." : "Follow one finding from the confirmed cause to the result of the follow-up check."}</p>
              <Link className="button button-primary" href={localizedPath(locale, "seo-audit")}>{ru ? "Что входит в аудит" : "What the audit includes"}<span>↗</span></Link>
            </div>
            <div className="home-fix-board">
              <header>
                <div><span>{ru ? "Индексация страницы" : "Page indexing"}</span><strong>{ru ? "От запрета — к проверенному исправлению" : "From a restriction to a verified fix"}</strong></div>
                <span className="home-fix-example">{ru ? "Пример исправления" : "Example fix"}</span>
              </header>
              <div className="home-fix-comparison">
                <div className="home-fix-before">
                  <span className="home-fix-state"><i aria-hidden="true">!</i>{ru ? "До исправления" : "Before the fix"}</span>
                  <strong>{ru ? "Найден запрет" : "Restriction found"}</strong>
                  <code>{'<meta name="robots"'}<br />{'content="'}<mark>noindex</mark>{'">'}</code>
                  <p>{ru ? "Директива просит поисковую систему не включать страницу в выдачу." : "The directive tells search engines not to include the page in results."}</p>
                </div>
                <span className="home-fix-transition" aria-hidden="true">→</span>
                <div className="home-fix-after">
                  <span className="home-fix-state"><i aria-hidden="true">✓</i>{ru ? "После согласования" : "After approval"}</span>
                  <strong>{ru ? "Запрет снят" : "Restriction removed"}</strong>
                  <div className="home-fix-check"><span aria-hidden="true">✓</span><code>{ru ? "noindex не найден" : "noindex not found"}</code></div>
                  <p>{ru ? "Повторяем проверку и подтверждаем, что директива удалена." : "We repeat the check to confirm that the directive has been removed."}</p>
                </div>
              </div>
              <ol className="home-fix-flow">
                {(ru
                  ? [["НАШЛИ", "Найдена директива noindex"], ["ОБЪЯСНИЛИ", "Показываем директиву noindex и адрес страницы"], ["ИСПРАВИЛИ", "Убираем запрет после согласования"], ["ПРОВЕРИЛИ", "Повторный тест подтверждает отсутствие noindex"]]
                  : [["FOUND", "A noindex directive is present"], ["EXPLAINED", "We show the noindex directive and the affected URL"], ["FIXED", "We remove the block after approval"], ["VERIFIED", "The follow-up check confirms that noindex is absent"]]
                ).map(([title, text], index, items) => <li key={title}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{title}</strong><small>{text}</small></div><b aria-hidden="true">{index === items.length - 1 ? "✓" : "→"}</b></li>)}
              </ol>
              <footer>
                <div><span>{ru ? "Контроль после исправления" : "Check after the fix"}</span><strong>{ru ? "Директива noindex удалена" : "The noindex directive has been removed"}</strong></div>
                <b><span aria-hidden="true">✓</span>{ru ? "Проверено" : "Verified"}</b>
              </footer>
              <p className="home-fix-scope">{ru ? "Отсутствие noindex само по себе не подтверждает появление страницы в поиске." : "The absence of noindex does not by itself confirm that a page appears in search."}</p>
            </div>
          </div>
        </section>

        <section className="section home-directions" id="home-directions" aria-labelledby="home-directions-title">
          <div className="shell">
            <div className="home-section-heading"><p>{ru ? "Другие направления" : "Other directions"}</p><h2 id="home-directions-title">{ru ? "Когда одной проверки недостаточно" : "When a check is not enough"}</h2></div>
            <nav className="home-mobile-directory" aria-label={ru ? "Основные разделы" : "Main sections"}>
              <Link href={localizedPath(locale, "services")}>{ru ? "Услуги" : "Services"}<span aria-hidden="true">↗</span></Link>
              <Link href={localizedPath(locale, "pricing")}>{ru ? "Цены" : "Pricing"}<span aria-hidden="true">↗</span></Link>
              <Link href={localizedPath(locale, "blog")}>{ru ? "Статьи" : "Guides"}<span aria-hidden="true">↗</span></Link>
              <Link href={localizedPath(locale, "glossary")}>{ru ? "Термины" : "Glossary"}<span aria-hidden="true">↗</span></Link>
            </nav>
            <HomeMobileDisclosure label={ru ? "Показать все направления" : "Show every direction"} className="home-directions__disclosure">
              <div className="home-direction-list">
                {directions.map((item, index) => <Link key={item.href} href={localizedPath(locale, item.href)}><span>{String(index + 1).padStart(2, "0")}</span><div><h3>{item.title}</h3><p>{item.text}</p></div><b aria-hidden="true">↗</b></Link>)}
              </div>
              <Link className="warm-text-link" href={localizedPath(locale, "pricing")}>{ru ? "Посмотреть цены и ограничения" : "See prices and limits"} <span>↗</span></Link>
            </HomeMobileDisclosure>
          </div>
        </section>

        <Faq title={ru ? "Перед началом работы" : "Before the work starts"} items={faq}/>
        <section className="section warm-final-cta"><div className="shell"><p>{ru ? "Первый шаг" : "First step"}</p><h2>{ru ? "Начнём с бесплатной проверки сайта" : "Start with a free website check"}</h2><Link className="button button-light" href="#free-check">{ru ? "Проверить сайт" : "Check your website"}<span>↗</span></Link></div></section>
      </div>
    </PublicShell>
  );
}
