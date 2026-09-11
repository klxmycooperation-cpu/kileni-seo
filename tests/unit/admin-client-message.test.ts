import { describe, expect, it } from "vitest";

import { generateAuditClientMessage } from "@/src/lib/audit/client-message";
import type { AuditClientIssue, AuditClientPresentation } from "@/src/lib/audit/client-presentation";

function presentation(overrides: Partial<AuditClientPresentation> = {}): AuditClientPresentation {
  return {
    summary: {
      htmlFound: 12,
      scopeLabel: "Найдено HTML-страниц",
      scopeValue: 12,
      checkedLabel: "Подробно проверено страниц",
      findingsLabel: "2 замечания",
      eligible: 10,
      excluded: 2,
      selected: 4,
      checked: 4,
      notCompleted: 0,
      outsideSample: 6,
      critical: 1,
      review: 1,
      optional: 0,
    },
    exclusions: [],
    issues: [
      {
        checkId: "robots-noindex",
        kind: "critical",
        title: "Страница закрыта от поиска",
        url: "https://example.ru/catalog",
        affectedUrls: ["https://example.ru/catalog"],
        whatFound: "На странице найден запрет noindex.",
        whyImportant: "Поисковые системы не смогут добавить страницу в результаты поиска.",
        howChecked: "Проверен meta robots в HTML страницы.",
        reliability: "Подтверждено автоматически",
        nextStep: "Уберите noindex, если страница должна участвовать в поиске.",
      },
      {
        checkId: "title",
        kind: "review",
        title: "Не заполнено название страницы",
        url: "https://example.ru/services",
        affectedUrls: ["https://example.ru/services"],
        whatFound: "В HTML нет title.",
        whyImportant: "Название помогает поиску и посетителю понять содержание страницы.",
        howChecked: "Проверен элемент title.",
        reliability: "Подтверждено автоматически",
        nextStep: "Добавьте краткое название страницы.",
      },
    ],
    strengths: ["Все четыре выбранные страницы открываются без ошибки сервера."],
    pages: [],
    publicTechnicalResources: [],
    additionalFiles: 0,
    additionalDocuments: 0,
    additionalFilesBasis: "classified_resources",
    nextStep: {
      primary: "Получить полный аудит сайта",
      secondary: "Повторить бесплатную проверку",
      note: "Повторная проверка ограничена выборкой.",
    },
    limitations: ["Проверена выборка страниц."],
    disclaimer: "Автоматическая проверка публичной части сайта.",
    ...overrides,
  };
}

describe("текст для заказчика по завершённому аудиту", () => {
  it("использует только факты текущего аудита и ставит критичную проблему первой", () => {
    const message = generateAuditClientMessage({
      domain: "example.ru",
      presentation: presentation(),
      variant: 0,
    });

    expect(message).toContain("example.ru");
    expect(message).toContain("Провели аудит 4 из 4 выбранных публичных страниц сайта example.ru");
    expect(message).toContain("Директива noindex");
    expect(message).toContain("Что обнаружено:");
    expect(message).toContain("Почему это важно:");
    expect(message).toContain("Что рекомендуем сделать:");
    expect(message).toContain("Проверьте, нужна ли директива noindex");
    expect(message).toContain("Title: название страницы для поисковой выдачи");
    expect(message.indexOf("Директива noindex"))
      .toBeLessThan(message.indexOf("Title: название страницы для поисковой выдачи"));
    expect(message).not.toMatch(/позици|трафик вырос|гарантир|пользователи уходят/iu);
    expect(message).toContain("Аудит Kileni SEO основан на проверке выбранных публичных страниц сайта");
  });

  it("не придумывает проблему, когда в сохранённом результате её нет", () => {
    const message = generateAuditClientMessage({
      domain: "clean.example",
      presentation: presentation({
        issues: [],
        summary: { ...presentation().summary, critical: 0, review: 0, optional: 0 },
      }),
      variant: 1,
    });

    expect(message).toContain("Критичных и существенных замечаний в рамках проведённой проверки не обнаружено");
    expect(message).not.toContain("noindex");
    expect(message).not.toContain("title");
  });

  it("меняет подачу при повторной генерации, сохраняя те же факты", () => {
    const first = generateAuditClientMessage({ domain: "example.ru", presentation: presentation(), variant: 0 });
    const second = generateAuditClientMessage({ domain: "example.ru", presentation: presentation(), variant: 1 });

    expect(second).not.toBe(first);
    for (const fact of ["example.ru", "Директива noindex", "Проверьте, нужна ли директива noindex"]) {
      expect(first).toContain(fact);
      expect(second).toContain(fact);
    }
  });

  it("ставит необязательные улучшения после критичных и существенных замечаний", () => {
    const optional: AuditClientIssue = {
      ...issue("breadcrumbs", "Цепочка разделов", "На странице не найдена разметка BreadcrumbList."),
      kind: "optional",
      whyImportant: "Разметка может помочь поисковой системе понять место страницы в структуре сайта.",
      nextStep: "Добавьте разметку только при наличии реальной иерархии разделов.",
    };
    const message = generateAuditClientMessage({
      domain: "example.ru",
      presentation: presentation({ issues: [...presentation().issues, optional] }),
    });

    expect(message.indexOf("Директива noindex")).toBeLessThan(message.indexOf("Title: название страницы для поисковой выдачи"));
    expect(message.indexOf("Title: название страницы для поисковой выдачи")).toBeLessThan(message.indexOf("Цепочка разделов"));
  });

  it("не выводит причину низкого Performance Score без отдельной метрики", () => {
    const performanceIssue: AuditClientIssue = {
      checkId: "performance",
      kind: "review",
      title: "Скорость главной страницы",
      url: "https://example.ru/",
      affectedUrls: ["https://example.ru/"],
      whatFound: "В лабораторном мобильном тесте главная страница получила 74 из 100.",
      whyImportant: "Если основное содержимое появляется долго, часть посетителей может уйти.",
      howChecked: "Один запуск Lighthouse.",
      reliability: "Предварительный результат.",
      nextStep: "Проверьте тяжёлые изображения, шрифты и скрипты первого экрана.",
      details: [
        { label: "Профиль", value: "Мобильный" },
        { label: "Количество запусков", value: "1" },
      ],
    };

    const message = generateAuditClientMessage({
      domain: "example.ru",
      presentation: presentation({ issues: [performanceIssue] }),
    });

    expect(message).toContain("Мобильная производительность главной страницы — 74/100");
    expect(message).toContain("Сам по себе итоговый балл не указывает на конкретную причину");
    expect(message).toContain("Повторите измерение 2–3 раза в одинаковых условиях");
    expect(message).not.toMatch(/основное содержимое|тяж[её]л.*(?:изображ|шрифт|скрипт)|страница загружается медленно/iu);
  });

  it("подбирает разные рекомендации для LCP, CLS, TBT, метаданных, H1, canonical, noindex и HTTP-кода", () => {
    const issues: AuditClientIssue[] = [
      issue("lcp", "LCP — появление основного содержимого", "LCP: 4,20 с."),
      issue("cls", "CLS — смещения элементов", "CLS: 0,28."),
      issue("tbt", "TBT — блокировка основного потока", "TBT: 640 мс."),
      issue("title", "Title страницы", "Title отсутствует."),
      issue("description", "Description страницы", "Meta description отсутствует."),
      issue("h1", "Главный заголовок", "H1: 10."),
      issue("canonical", "Canonical", "Canonical: https://example.ru/old."),
      issue("indexability", "Доступность для поиска", "На странице найден запрет noindex."),
      issue("page-http", "Ответ страницы", "Код ответа сервера 404."),
    ];

    const message = generateAuditClientMessage({ domain: "example.ru", presentation: presentation({ issues }) });

    expect(message).toContain("скорость появления крупнейшего содержательного элемента");
    expect(message).toContain("размеры изображений, динамические блоки и загрузку шрифтов");
    expect(message).toContain("задачи JavaScript, которые занимают основной поток");
    expect(message).toContain("Добавьте title, который точно описывает содержание страницы");
    expect(message).toContain("Добавьте краткое description по содержанию страницы");
    expect(message).toContain("оставьте один главный H1");
    expect(message).toContain("не подтверждает фактическое наличие страницы в индексе");
    expect(message).toContain("Проверьте, нужна ли директива noindex");
    expect(message).toContain("страница была недоступна по указанному адресу");
  });

  it("не превращает ограничение robots.txt в найденную директиву noindex", () => {
    const blocked = {
      ...issue("indexability", "Загрузка страницы ограничена", "Правила robots.txt запрещают обход страницы."),
      whyImportant: "Ограничение может мешать поисковому роботу загружать страницу.",
      nextStep: "Проверьте, намеренно ли ограничен обход этого адреса в robots.txt.",
    };
    const message = generateAuditClientMessage({ domain: "example.ru", presentation: presentation({ issues: [blocked] }) });

    expect(message).toContain("Правила robots.txt запрещают обход страницы");
    expect(message).not.toContain("noindex");
  });

  it("рекомендует добавить H1 при явно измеренном нулевом количестве", () => {
    const message = generateAuditClientMessage({
      domain: "example.ru",
      presentation: presentation({ issues: [issue("h1", "Главный заголовок", "H1: 0.")] }),
    });

    expect(message).toMatch(/Добавьте[^.\n]*H1/iu);
    expect(message).not.toContain("единственный H1");
  });

  it.each(["title", "description"] as const)("различает дублирование, избыточную и недостаточную длину %s", (tag) => {
    const recommendationFor = (finding: string) => generateAuditClientMessage({
      domain: "example.ru",
      presentation: presentation({ issues: [issue(tag, tag, finding)] }),
    }).split("Что рекомендуем сделать: ")[1]?.split("\n\n")[0] ?? "";

    const duplicate = recommendationFor(`${tag} повторяется на двух проверенных страницах.`);
    const long = recommendationFor(`${tag} слишком длинный: 240 символов.`);
    const short = recommendationFor(`${tag} слишком короткий: 8 символов.`);

    expect(duplicate).toMatch(/уникальн|различ|разные|отдельн/iu);
    expect(long).toMatch(/сократ|уберите.*(?:повтор|лишн)|длин/iu);
    expect(short).toMatch(/дополн|раскро|уточн|корот/iu);
    expect(new Set([duplicate, long, short]).size).toBe(3);
  });

  it("представляет только необязательные рекомендации без срочности", () => {
    const optional: AuditClientIssue = {
      ...issue("breadcrumbs", "Цепочка разделов", "Разметка BreadcrumbList не найдена."),
      kind: "optional",
      whyImportant: "Разметка может помочь понять структуру разделов.",
      nextStep: "Добавьте разметку, если на странице есть цепочка разделов.",
    };
    const message = generateAuditClientMessage({
      domain: "example.ru",
      presentation: presentation({ issues: [optional], summary: { ...presentation().summary, critical: 0, review: 0, optional: 1 } }),
    });

    expect(message).toMatch(/Критичных[^.]*не обнаружено/iu);
    expect(message).toContain("Цепочка разделов");
    expect(message).not.toContain("В первую очередь");
  });

  it("не объявляет отсутствие замечаний, если не удалось проверить ни одну страницу", () => {
    const message = generateAuditClientMessage({
      domain: "example.ru",
      presentation: presentation({
        issues: [],
        strengths: [],
        summary: { ...presentation().summary, checked: 0, notCompleted: 4, critical: 0, review: 0, optional: 0 },
      }),
    });

    expect(message).toContain("0 из 4");
    expect(message).not.toMatch(/замечаний[^.]*не обнаружено|нет рекомендаций, требующих/iu);
    expect(message).toMatch(/не удалось|недостаточно данных|недостаточно.*результат/iu);
  });

  it("рекомендует повторить измерение Performance после оптимизации, а не только до неё", () => {
    const message = generateAuditClientMessage({
      domain: "example.ru",
      presentation: presentation({ issues: [issue("performance", "Мобильная производительность", "Оценка производительности 74/100.")] }),
    });

    expect(message).toMatch(/После (?:оптимизации|изменений|исправлений)[^.\n]*(?:повтор|провер)/iu);
  });

  it("указывает адреса, к которым относится найденная проблема", () => {
    const duplicate = {
      ...issue("title", "Повторяющийся title", "Title одинаковый на двух проверенных страницах."),
      url: "https://example.ru/catalog/red",
      affectedUrls: ["https://example.ru/catalog/red", "https://example.ru/catalog/blue"],
    };
    const message = generateAuditClientMessage({ domain: "example.ru", presentation: presentation({ issues: [duplicate] }) });

    expect(message).toContain("https://example.ru/catalog/red");
    expect(message).toContain("https://example.ru/catalog/blue");
  });

  it("понимает формулировки количества H1 и длины метаданных из реального реестра проверок", () => {
    const message = generateAuditClientMessage({ domain: "example.ru", presentation: presentation({ issues: [
      issue("h1", "Главный заголовок", "Главных заголовков: 3"),
      issue("title", "Title", "title есть, длина: 90"),
      issue("description", "Description", "description есть, длина: 12"),
    ] }) });
    expect(message).toContain("оставьте один главный H1");
    expect(message).toContain("Сократите title");
    expect(message).toContain("Дополните description");
  });

  it("не принимает отсутствие noindex за запрет и HTTP 304 за перенаправление", () => {
    const message = generateAuditClientMessage({ domain: "example.ru", presentation: presentation({ issues: [
      issue("indexability", "Требуется проверка доступности", "В HTML не найден запрет noindex. Данных о доступности недостаточно."),
      issue("page-http", "Ответ страницы", "HTTP 304"),
    ] }) });
    expect(message).not.toContain("Проверьте, нужна ли директива noindex");
    expect(message).not.toContain("перенаправление");
  });
});

function issue(checkId: string, title: string, whatFound: string): AuditClientIssue {
  return {
    checkId,
    kind: "review",
    title,
    url: "https://example.ru/page",
    affectedUrls: ["https://example.ru/page"],
    whatFound,
    whyImportant: "Шаблонное объяснение, которое не должно попасть в итоговый текст.",
    howChecked: "Проверка сохранённых данных.",
    reliability: "Предварительный результат.",
    nextStep: "Шаблонная рекомендация, которую не следует использовать.",
  };
}
