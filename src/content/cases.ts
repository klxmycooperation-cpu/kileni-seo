import type { Locale } from "../config/site";

export type CaseFact = { value: string; label: string };

export type CaseStudy = {
  slug: string;
  domain: string;
  title: string;
  period: string;
  before: number;
  after: number;
  journey?: number[];
  previewFacts: CaseFact[];
  lead: string;
  task: string;
  checks: string[];
  fixes: string[];
  actions: string[];
  evidence: Array<{ metric: string; before?: string; after: string; note?: string }>;
  remaining: string[];
  caveat: string;
};

const ru: Record<string, CaseStudy> = {
  "eco-santeh": {
    slug: "eco-santeh",
    domain: "eco-santeh.ru",
    title: "Исправили шаблоны и повторно проверили 509 страниц eco-santeh.ru",
    period: "25–29 июля 2026",
    before: 35,
    after: 93,
    previewFacts: [
      { value: "509/509", label: "страниц открылись без ошибки" },
      { value: "36 → 57", label: "автоматический тест скорости на телефоне (Lighthouse)" },
      { value: "99/100", label: "автоматический тест скорости на компьютере (Lighthouse)" },
      { value: "35 → 93", label: "внутренняя оценка KILENI — не показатель поисковика" },
    ],
    lead: "В финальном списке 509 из 509 страниц открылись без ошибки; повторная проверка не нашла пропущенных названий, описаний и точных повторов.",
    task: "Проверить большой набор страниц, исправить повторяющиеся ошибки в шаблонах и убедиться, что изменения действительно появились на сайте.",
    checks: [
      "Сопоставили исходный и финальный обходы страниц",
      "Проверили ответы сервера, основные данные страниц, точные дубли, формы и скорость главной",
      "Повторили проверку после публикации изменений",
    ],
    fixes: [
      "Исправили названия, описания, главные заголовки и основные адреса страниц",
      "Добавили данные для поиска и предпросмотра ссылок в соцсетях",
      "Повторно проверили точные повторы названий и описаний в итоговом списке страниц",
      "Усилили обработку форм и учёт успешной отправки в аналитике",
    ],
    actions: [
      "Исправили названия, описания, главные заголовки и основные адреса страниц",
      "Добавили данные для поиска и предпросмотра ссылок в соцсетях",
      "Проверили точные повторы названий и описаний",
      "Усилили обработку форм и учёт успешной отправки в аналитике",
      "Повторно проверили страницы и запустили тест скорости",
    ],
    evidence: [
      { metric: "Страницы открылись без ошибки", before: "—", after: "509 из 509", note: "Итоговый список страниц" },
      { metric: "Основные данные страниц заполнены", before: "Были системные пропуски", after: "509 из 509", note: "Итоговый список страниц" },
      { metric: "Скорость на телефоне", before: "36", after: "57", note: "Лабораторный тест одной страницы" },
      { metric: "Скорость на компьютере", before: "—", after: "99", note: "Лабораторный тест одной страницы" },
      { metric: "Доступность / подготовка к поиску", before: "—", after: "100 / 100", note: "Телефон и компьютер" },
      { metric: "Внутренняя проверка по чек-листу", before: "35/100", after: "93/100", note: "Не балл Google или Яндекса" },
    ],
    remaining: [
      "В первый обход вошло 596 страниц, в финальный — 509, поэтому это не один и тот же набор URL",
      "На телефоне остался заметный сдвиг страницы при загрузке — эту проблему не успели исправить",
      "Доставку реальной тестовой заявки не проверяли от формы до получателя",
      "Изменение позиций, трафика и заявок требует отдельного периода наблюдения",
    ],
    caveat: "Тест скорости показывает один лабораторный запуск одной страницы, а не скорость у реальных посетителей. Внутренняя оценка нужна только для сравнения этапов этой работы.",
  },
  zasorservice: {
    slug: "zasorservice",
    domain: "засорсервис.рф",
    title: "Убрали сдвиг главного экрана и проверили 575 страниц засорсервис.рф",
    period: "июль 2026",
    before: 37,
    after: 80,
    journey: [37, 66, 72, 76, 80],
    previewFacts: [
      { value: "575/575", label: "страниц открылись без ошибки" },
      { value: "0,519 → 0,0001", label: "сдвиг главного экрана (CLS) в двух тестах" },
      { value: "37 → 80", label: "внутренняя оценка KILENI — не показатель поисковика" },
    ],
    lead: "Главный экран перестал заметно сдвигаться при загрузке, а повторный обход подтвердил финальное состояние всех URL из sitemap.",
    task: "Исправить повторяющиеся ошибки на однотипных страницах, стабилизировать первый экран на мобильных устройствах и повторно проверить весь финальный список URL.",
    checks: [
      "Сравнили исходный и финальный обходы страниц",
      "Проверили ответы сервера, основные данные страниц, изображения и данные для поисковых систем",
      "Дважды запустили автоматический тест скорости главной страницы на телефоне (Lighthouse)",
    ],
    fixes: [
      "Исправили пропуски title, description, основного адреса страницы (canonical) и H1",
      "Опубликовали данные для поисковых систем (JSON-LD) и хлебные крошки",
      "Устранили причину сдвига главного слайдера",
      "Добавили серверную проверку форм, ограничение частоты и безопасную обработку вложений",
    ],
    actions: [
      "Исправили пропуски title, description, основного адреса страницы (canonical) и H1",
      "Опубликовали данные для поисковых систем (JSON-LD) и хлебные крошки",
      "Устранили причину сдвига главного слайдера",
      "Добавили серверную проверку форм, ограничение частоты и безопасную обработку вложений",
      "Повторно обошли 575 URL и сравнили два мобильных запуска Lighthouse",
    ],
    evidence: [
      { metric: "Страницы с ответом HTTP 200", before: "—", after: "575 из 575", note: "Ошибок обхода — 0" },
      { metric: "CLS главной", before: "0,519", after: "0,0001", note: "Два мобильных лабораторных запуска" },
      { metric: "Страницы с данными для поисковых систем (JSON-LD)", before: "0 из 606", after: "575 из 575", note: "Исходный и финальный обходы содержали разные списки URL" },
      { metric: "BreadcrumbList", before: "—", after: "574 страницы", note: "Все внутренние страницы финального списка" },
      { metric: "Изображения без размеров", before: "20 314", after: "25", note: "Сравнение этапов P1 и P4" },
      { metric: "Внутренняя проверка по чек-листу", before: "37/100", after: "80/100", note: "Не балл Google или Яндекса" },
    ],
    remaining: [
      "Performance менялся от 53 до 72, LCP — от 2,74 до 3,79 секунды между лабораторными запусками",
      "В первый аудит вошло 606 страниц, в финальный — 575, поэтому это не один и тот же набор URL",
      "Фактическую доставку тестовой заявки не проверяли",
      "Изменение позиций, трафика и заявок требует отдельного периода наблюдения",
    ],
    caveat: "CLS подтверждён двумя лабораторными тестами главной страницы. Оценки 66, 72 и 76 появились только в итоговом отчёте, поэтому крупно показываем подтверждённые начальную и финальную точки.",
  },
};

const en: Record<string, CaseStudy> = {
  "eco-santeh": {
    ...ru["eco-santeh"],
    title: "Fixed shared templates and rechecked 509 pages on eco-santeh.ru",
    period: "25–29 July 2026",
    previewFacts: [
      { value: "509/509", label: "pages opened without an error" },
      { value: "36 → 57", label: "mobile Lighthouse laboratory test" },
      { value: "99/100", label: "desktop Lighthouse laboratory test" },
      { value: "35 → 93", label: "internal KILENI assessment — not a search-engine metric" },
    ],
    lead: "All 509 URLs in the final set opened without an error; its follow-up export showed no missing core tags or exact metadata duplicates.",
    task: "Review a large page set, fix repeated template problems and confirm that the changes were live on the website.",
    checks: [
      "Compared the initial and final page crawls",
      "Checked server responses, core page data, exact duplicates, forms and home-page speed",
      "Repeated the checks after the changes were published",
    ],
    fixes: [
      "Fixed title, description, H1 and canonical templates",
      "Added Open Graph and JSON-LD data for search engines",
      "Rechecked exact metadata duplicates in the final URL set",
      "Improved form handling and successful-submission analytics",
    ],
    actions: [
      "Fixed title, description, H1 and canonical templates",
      "Added Open Graph and JSON-LD structured data",
      "Checked exact metadata duplicates",
      "Improved form handling and successful-submission analytics",
      "Repeated the crawl and laboratory Lighthouse tests",
    ],
    evidence: [
      { metric: "Pages returning HTTP 200", before: "—", after: "509 of 509", note: "Final URL set" },
      { metric: "Titles, descriptions, H1, canonical, Open Graph and JSON-LD", before: "Repeated gaps", after: "509 of 509", note: "Final URL set" },
      { metric: "Mobile Performance", before: "36", after: "57", note: "Laboratory Lighthouse" },
      { metric: "Desktop Performance", before: "—", after: "99", note: "Laboratory Lighthouse" },
      { metric: "Accessibility / SEO", before: "—", after: "100 / 100", note: "Mobile and desktop" },
      { metric: "Internal checklist review", before: "35/100", after: "93/100", note: "Not a Google or Yandex score" },
    ],
    remaining: [
      "The first crawl covered 596 pages and the final crawl 509, so these were not the same URL set",
      "Mobile CLS remained at 0.537 and still needed work",
      "A real test lead was not followed from the form to its recipient",
      "Rankings, traffic and leads require a separate observation period",
    ],
    caveat: "Lighthouse is a laboratory test of one page, not field Core Web Vitals. The internal assessment compares stages of this project and is not a search-engine metric.",
  },
  zasorservice: {
    ...ru.zasorservice,
    title: "Removed the home-page shift and checked 575 pages on засорсервис.рф",
    period: "July 2026",
    previewFacts: [
      { value: "575/575", label: "pages opened without an error" },
      { value: "0.519 → 0.0001", label: "home-page CLS in two tests" },
      { value: "37 → 80", label: "internal KILENI assessment — not a search-engine metric" },
    ],
    lead: "The home page stopped shifting noticeably during loading, and a second crawl confirmed every URL in the final sitemap set.",
    task: "Fix repeated issues across templated pages, stabilise the first mobile screen and recheck the complete final URL set.",
    checks: [
      "Compared the initial and final page crawls",
      "Checked server responses, core page data, images and search-engine data",
      "Ran two mobile Lighthouse laboratory tests of the home page",
    ],
    fixes: [
      "Fixed missing titles, descriptions, canonicals and H1s",
      "Published JSON-LD data for search engines and breadcrumbs",
      "Removed the cause of the main slider shift",
      "Added server validation, rate limiting and safer attachment handling",
    ],
    actions: [
      "Fixed missing titles, descriptions, canonicals and H1s",
      "Published JSON-LD and breadcrumbs",
      "Removed the cause of the main slider shift",
      "Added server validation, rate limiting and safer attachment handling",
      "Recrawled 575 URLs and compared two mobile Lighthouse runs",
    ],
    evidence: [
      { metric: "Pages returning HTTP 200", before: "—", after: "575 of 575", note: "Zero crawl errors" },
      { metric: "Home-page CLS", before: "0.519", after: "0.0001", note: "Two mobile laboratory runs" },
      { metric: "Pages with JSON-LD", before: "0 of 606", after: "575 of 575", note: "The initial and final crawls contained different URL sets" },
      { metric: "BreadcrumbList", before: "—", after: "574 pages", note: "Every internal page in the final set" },
      { metric: "Images without dimensions", before: "20,314", after: "25", note: "P1 to P4 comparison" },
      { metric: "Internal checklist review", before: "37/100", after: "80/100", note: "Not a Google or Yandex score" },
    ],
    remaining: [
      "Performance ranged from 53 to 72 and LCP from 2.74 to 3.79 seconds between laboratory runs",
      "The first audit covered 606 pages and the final audit 575, so these were not the same URL set",
      "A real test lead was not delivered",
      "Rankings, traffic and leads require a separate observation period",
    ],
    caveat: "CLS was reproduced in two laboratory tests of the home page. Scores 66, 72 and 76 only appear in the final report, so the page highlights the supported start and end points.",
  },
};

export function getCase(locale: Locale, slug: string) {
  return (locale === "ru" ? ru : en)[slug];
}

export function getCases(locale: Locale) {
  return Object.values(locale === "ru" ? ru : en);
}
