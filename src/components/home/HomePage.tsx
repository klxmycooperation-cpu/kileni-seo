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
import { HomeProcessSteps } from "./HomeProcessSteps";

export function HomePage({ locale }: { locale: Locale }) {
  const d = getDictionary(locale);
  const ru = locale === "ru";
  const cases = getCases(locale);
  const articles = getArticles(locale);
  const process = ru
    ? [
        { title: "Проверяем", text: "Проводим бесплатную проверку до 10 ключевых страниц: открываются ли они, доступны ли поиску и нет ли повторяющихся ошибок.", result: "Видим, что мешает сайту появляться в поиске" },
        { title: "Объясняем", text: "Показываем, где сайт теряет видимость и обращения, и отделяем критичное от того, что может подождать.", result: "Получаете приоритеты без технического шума" },
        { title: "Исправляем", text: "Согласуем объём и по этапам внедряем нужные изменения: от структуры до контента и скорости.", result: "Работы привязаны к понятному результату" },
        { title: "Перепроверяем", text: "После внедрения повторяем те же проверки и фиксируем, что действительно изменилось.", result: "Есть доказательство результата, а не просто отчёт" },
      ]
    : [
        { title: "Check", text: "We run a free express review of up to 10 key pages: access, indexing and visible technical risks.", result: "You see whether there are systemic growth constraints" },
        { title: "Explain", text: "We show where visibility and enquiries are being lost, separating critical work from what can wait.", result: "You receive priorities without technical noise" },
        { title: "Implement", text: "We agree the scope and implement the necessary changes in stages: structure, content and speed.", result: "Every action is tied to an understandable result" },
        { title: "Recheck", text: "After implementation, we repeat the same checks and record what actually changed.", result: "There is proof of the result, not just a report" },
      ];
  const directions = ru
    ? [
        { title: "SEO-продвижение", text: "Технические исправления, структура и новые страницы по плану.", href: "seo-promotion" },
        { title: "Wildberries и Ozon", text: "Карточки, тексты и визуальная упаковка товара.", href: "marketplaces" },
        { title: "Разработка", text: "Лендинги, корпоративные сайты и каталоги.", href: "web-development" },
        { title: "Яндекс Реклама", text: "Настройка и ведение кампаний с прозрачными границами.", href: "yandex-ads" },
      ]
    : [
        { title: "SEO support", text: "Technical improvements, structure and planned new pages.", href: "seo-promotion" },
        { title: "Wildberries and Ozon", text: "Product listings, copy and visual presentation.", href: "marketplaces" },
        { title: "Web development", text: "Landing pages, corporate websites and catalogues.", href: "web-development" },
        { title: "Yandex Ads", text: "Campaign setup and management with clear boundaries.", href: "yandex-ads" },
      ];
  const faq = ru
    ? [
        { q: "Что покажет бесплатная проверка?", a: "Общую оценку, число найденных и проверенных страниц, конкретные замечания по этим страницам и понятный порядок действий." },
        { q: "Нужен доступ к сайту?", a: "Нет. Проверка видит только те страницы, которые доступны обычному посетителю, и соблюдает правила сайта для поисковых систем." },
        { q: "Можно проверить большой сайт?", a: "Бесплатно проверяем до 10 ключевых публичных страниц. Для более крупного сайта покажем, какие разделы стоит разобрать отдельно." },
        { q: "Можно заказать исправления?", a: "Да. Сначала отдельно согласуем состав, срок, стоимость и критерии повторной проверки." },
        { q: "Вы гарантируете позиции?", a: "Нет. Позиции зависят от спроса, конкурентов, поисковых систем и самого предложения. Мы отвечаем за согласованный объём и проверяемые изменения." },
      ]
    : [
        { q: "What does the free check show?", a: "An overall SEO score, discovered and checked page counts, and the main risk areas. Exact problem URLs and implementation instructions are not public." },
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

        <section className="home-entry-route" id="home-tasks" aria-labelledby="home-task-routes-title">
          <div className="shell">
            <div className="home-entry-route__heading">
              <p>{ru ? "С чего начать" : "Where to start"}</p>
              <h2 id="home-task-routes-title">{ru ? "Выберите ближайшую задачу" : "Choose the closest goal"}</h2>
              <span>{ru ? "На следующей странице будут состав, границы и понятный следующий шаг." : "The next page explains the scope, boundaries and next step."}</span>
            </div>
            <nav className="home-entry-route__list" aria-label={ru ? "Задачи клиентов" : "Client goals"}>
              {d.scenarios.map((item, index) => (
                <Link key={item.code} href={localizedPath(locale, item.href)}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div><strong>{item.title}</strong><small>{item.text}</small></div>
                  <b aria-hidden="true">↗</b>
                </Link>
              ))}
            </nav>
          </div>
        </section>

        <section className="home-process-section" id="home-process" aria-labelledby="home-process-title">
          <div className="shell">
            <div className="home-section-heading home-section-heading--light">
              <p>{ru ? "Как проходит работа" : "How the work runs"}</p>
              <h2 id="home-process-title">{ru ? "От бесплатной проверки до контрольного результата" : "From the free check to a verified result"}</h2>
              <span>{ru ? "Один прозрачный маршрут: от первых наблюдений к исправлениям и повторной проверке." : "One transparent route: from first findings to implementation and a follow-up check."}</span>
            </div>
            <HomeProcessSteps steps={process} />
          </div>
        </section>

        <HomeDecisionRoute locale={locale} />

        <HomeCaseExplorer locale={locale} cases={cases} />

        <section className="section home-articles" id="home-articles" aria-labelledby="home-articles-title">
          <div className="shell">
            <div className="home-section-heading home-section-heading--row"><div><p>{ru ? "Блог" : "Blog"}</p><h2 id="home-articles-title">{ru ? "Новые разборы — прямо на главной" : "Latest practical guides on the home page"}</h2></div><Link className="warm-text-link" href={localizedPath(locale, "blog")}>{ru ? "Весь блог" : "All guides"} <span>↗</span></Link></div>
            <HomeArticleCarousel locale={locale} articles={articles} />
          </div>
        </section>

        <section className="section home-deliverables" id="home-deliverables" aria-labelledby="home-deliverables-title">
          <div className="shell home-deliverables-grid">
            <div className="home-section-heading">
              <p>{ru ? "Что вы получите" : "What you receive"}</p>
              <h2 id="home-deliverables-title">{ru ? "Понятный маршрут исправления" : "A clear route to a verified fix"}</h2>
              <p className="warm-lead">{ru ? "Каждая задача проходит четыре состояния — от найденной причины до повторной проверки." : "Each task moves through four states, from the confirmed cause to a repeat check."}</p>
              <Link className="button button-primary" href={localizedPath(locale, "seo-audit")}>{ru ? "Что входит в аудит" : "What the audit includes"}<span>↗</span></Link>
            </div>
            <ol className="home-deliverable-list">
              {(ru
                ? [["Находим", "Показываем проблему на конкретной странице"], ["Расставляем", "Объясняем приоритет и влияние"], ["Исправляем", "Передаём действие и критерий готовности"], ["Проверяем", "Повторяем замер и фиксируем результат"]]
                : [["Find", "Show the issue on a specific page"], ["Prioritise", "Explain impact and urgency"], ["Fix", "Define the action and acceptance check"], ["Verify", "Repeat the measurement and record the result"]]
              ).map(([title, text], index) => <li key={title}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{title}</strong><small>{text}</small></div><b aria-hidden="true">{index === 3 ? "✓" : "→"}</b></li>)}
            </ol>
          </div>
        </section>

        <section className="section home-directions" id="home-directions" aria-labelledby="home-directions-title">
          <div className="shell">
            <div className="home-section-heading"><p>{ru ? "Другие направления" : "Other directions"}</p><h2 id="home-directions-title">{ru ? "Когда одной проверки недостаточно" : "When a check is not enough"}</h2></div>
            <div className="home-direction-list">
              {directions.map((item, index) => <Link key={item.href} href={localizedPath(locale, item.href)}><span>{String(index + 1).padStart(2, "0")}</span><div><h3>{item.title}</h3><p>{item.text}</p></div><b aria-hidden="true">↗</b></Link>)}
            </div>
            <Link className="warm-text-link" href={localizedPath(locale, "pricing")}>{ru ? "Посмотреть цены и ограничения" : "See prices and limits"} <span>↗</span></Link>
          </div>
        </section>

        <Faq title={ru ? "Перед началом работы" : "Before the work starts"} items={faq}/>
        <section className="section warm-final-cta"><div className="shell"><p>{ru ? "Первый шаг" : "First step"}</p><h2>{ru ? "Начнём с бесплатной проверки сайта" : "Start with a free website check"}</h2><Link className="button button-light" href={localizedPath(locale, "free-audit")}>{d.auditForm.submit}<span>↗</span></Link></div></section>
      </div>
    </PublicShell>
  );
}
