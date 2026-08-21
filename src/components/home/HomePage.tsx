import Image from "next/image";
import Link from "next/link";
import type { Locale } from "../../config/site";
import { localizedPath } from "../../config/site";
import { getArticles } from "../../content/articles";
import { getCases } from "../../content/cases";
import { getDictionary } from "../../content/dictionary";
import { PublicShell } from "../layout/PublicShell";
import { Faq } from "../pages/Faq";
import { HeroScan } from "./HeroScan";
import { HomeCaseExplorer } from "./HomeCaseExplorer";
import { HomeDecisionRoute } from "./HomeDecisionRoute";
import { HomeProcessSteps } from "./HomeProcessSteps";

export function HomePage({ locale }: { locale: Locale }) {
  const d = getDictionary(locale);
  const ru = locale === "ru";
  const cases = getCases(locale);
  const articles = getArticles(locale).slice(0, 3);
  const process = ru
    ? [
        { title: "Проверяем", text: "Проводим бесплатную экспресс-проверку до 10 ключевых страниц: доступность, индексирование и очевидные технические риски.", result: "Понимаем: есть ли системные ограничения роста" },
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
        { q: "Что покажет бесплатная проверка?", a: "Общую SEO-оценку, число найденных и проверенных страниц и основные зоны риска. Точные адреса проблем и инструкции не публикуются в открытом результате." },
        { q: "Нужен доступ к сайту?", a: "Нет. Бесплатная проверка работает только с публичной частью и учитывает ограничения robots.txt." },
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

        <section className="section home-deliverables" id="home-deliverables" aria-labelledby="home-deliverables-title">
          <div className="shell home-deliverables-grid">
            <div className="home-section-heading">
              <p>{ru ? "Что вы получите" : "What you receive"}</p>
              <h2 id="home-deliverables-title">{ru ? "Очередь работ, которую можно принять" : "A work queue you can verify"}</h2>
              <p className="warm-lead">{ru ? "Причина, приоритет, действие и критерий повторной проверки — без списка терминов ради объёма." : "Cause, priority, action and a follow-up check — without jargon added for volume."}</p>
              <Link className="button button-primary" href={localizedPath(locale, "seo-audit")}>{ru ? "Что входит в аудит" : "What the audit includes"}<span>↗</span></Link>
            </div>
            <ol className="home-deliverable-list">
              {(ru
                ? ["Краткое резюме для принятия решения", "Таблица приоритетных работ", "Критерии для разработчика", "Повторная проверка согласованных изменений"]
                : ["Decision-ready summary", "Prioritised work table", "Developer acceptance criteria", "Follow-up check of agreed changes"]
              ).map((item, index) => <li key={item}><span>{String(index + 1).padStart(2, "0")}</span><strong>{item}</strong></li>)}
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

        <section className="section home-articles" id="home-articles" aria-labelledby="home-articles-title">
          <div className="shell">
            <div className="home-section-heading home-section-heading--row"><div><p>{ru ? "Блог" : "Blog"}</p><h2 id="home-articles-title">{ru ? "Разбираем работу на понятных примерах" : "Practical explanations with clear examples"}</h2></div><Link className="warm-text-link" href={localizedPath(locale, "blog")}>{ru ? "Все материалы" : "All guides"} <span>↗</span></Link></div>
            <div className="warm-article-list">
              {articles.map((article, index) => <Link key={article.slug} href={localizedPath(locale, `blog/${article.slug}`)}><figure><Image src={article.hero.src} alt={article.hero.alt} width={720} height={450} sizes="(max-width: 820px) 100vw, 31vw"/></figure><div className="warm-article-meta"><span>0{index + 1}</span><small>{article.readingMinutes} {ru ? "мин" : "min"}</small></div><h3>{article.title}</h3><p>{article.readerOutcome}</p><b aria-hidden="true">↗</b></Link>)}
            </div>
          </div>
        </section>

        <Faq title={ru ? "Перед началом работы" : "Before the work starts"} items={faq}/>
        <section className="section warm-final-cta"><div className="shell"><p>{ru ? "Первый шаг" : "First step"}</p><h2>{ru ? "Начнём с бесплатной проверки сайта" : "Start with a free website check"}</h2><Link className="button button-light" href={localizedPath(locale, "free-audit")}>{d.auditForm.submit}<span>↗</span></Link></div></section>
      </div>
    </PublicShell>
  );
}
