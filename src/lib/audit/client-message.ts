import type { AuditClientIssue, AuditClientPresentation } from "./client-presentation";

type GenerateAuditClientMessageInput = {
  domain: string;
  presentation: AuditClientPresentation;
  variant?: number;
};

type MessageIssue = Pick<AuditClientIssue, "title" | "whatFound" | "whyImportant" | "nextStep">;

const introductions = [
  (domain: string, checked: number, selected: number) =>
    `Здравствуйте! Провели аудит ${checked} из ${selected} выбранных публичных страниц сайта ${domain}.`,
  (domain: string, checked: number, selected: number) =>
    `Здравствуйте! Завершили аудит ${checked} из ${selected} выбранных публичных страниц сайта ${domain}.`,
  (domain: string, checked: number, selected: number) =>
    `Здравствуйте! По результатам аудита проверено ${checked} из ${selected} выбранных публичных страниц сайта ${domain}.`,
] as const;

const scopeNote = "Аудит Kileni SEO основан на проверке выбранных публичных страниц сайта. Для более полной оценки SEO рекомендуется также учитывать данные систем веб-аналитики и панелей вебмастеров.";

export function generateAuditClientMessage({
  domain,
  presentation,
  variant = 0,
}: GenerateAuditClientMessageInput): string {
  const safeVariant = Number.isFinite(variant) ? Math.abs(Math.trunc(variant)) % introductions.length : 0;
  const safeDomain = clean(domain) || "проверенного сайта";
  const checked = nonNegativeInteger(presentation.summary.checked);
  const selected = Math.max(checked, nonNegativeInteger(presentation.summary.selected));
  const issues = prioritizedIssues(presentation.issues);
  const paragraphs = [introductions[safeVariant](safeDomain, checked, selected)];

  if (!issues.length) {
    if (!checked) {
      paragraphs.push("Не удалось завершить проверку выбранных страниц. Данных недостаточно, чтобы оценить наличие или отсутствие замечаний. Рекомендуем проверить доступность страниц и повторить аудит.");
      paragraphs.push(scopeNote);
      return paragraphs.join("\n\n");
    }
    paragraphs.push("Критичных и существенных замечаний в рамках проведённой проверки не обнаружено.");
    const strength = clean(presentation.strengths[0]);
    if (strength) paragraphs.push(`Что уже в порядке: ${sentence(strength)}`);
    paragraphs.push("По сохранённому результату нет рекомендаций, требующих первоочередного внедрения. Если появятся новые важные страницы или изменения шаблонов, их целесообразно проверить отдельно.");
    paragraphs.push(scopeNote);
    return paragraphs.join("\n\n");
  }

  paragraphs.push(issues.every((issue) => issue.kind === "optional")
    ? "Критичных и существенных замечаний в рамках проведённой проверки не обнаружено. Ниже — рекомендации по улучшению:"
    : "В первую очередь рекомендуем обратить внимание на следующие моменты:");
  paragraphs.push(issues.map((issue, index) => issueParagraph(issue, index + 1)).join("\n\n"));
  paragraphs.push(scopeNote);
  return paragraphs.join("\n\n");
}

function prioritizedIssues(issues: readonly AuditClientIssue[]): AuditClientIssue[] {
  const order = { critical: 0, review: 1, optional: 2 } as const;
  return [...issues]
    .sort((left, right) => order[left.kind] - order[right.kind]);
}

function issueParagraph(issue: AuditClientIssue, index: number): string {
  const copy = copyForIssue(issue);
  const urls = [...new Set([issue.url, ...issue.affectedUrls].map(clean).filter(Boolean))];
  const location = urls.length ? `\nАдреса: ${urls.join(", ")}` : "";
  return `${index}. ${copy.title}\nЧто обнаружено: ${sentence(copy.whatFound)}${location}\nПочему это важно: ${sentence(copy.whyImportant)}\nЧто рекомендуем сделать: ${withRepeatCheck(copy.nextStep)}`;
}

function copyForIssue(issue: AuditClientIssue): MessageIssue {
  if (isNoindexIssue(issue)) return noindexCopy(issue);
  switch (issue.checkId) {
    case "performance":
      return performanceCopy(issue);
    case "lcp":
      return {
        title: "LCP: отображение основного содержимого",
        whatFound: fact(issue),
        whyImportant: "LCP показывает скорость появления крупнейшего содержательного элемента. По результатам теста показатель требует внимания, но сам по себе не объясняет причину задержки",
        nextStep: "Определите LCP-элемент в повторном измерении и проверьте только ресурсы, серверный ответ и критические стили, которые действительно влияют на его отображение",
      };
    case "cls":
      return {
        title: "CLS: визуальные смещения элементов",
        whatFound: fact(issue),
        whyImportant: "CLS показывает, смещаются ли элементы после появления на экране. Значение требует внимания, поскольку такие изменения могут мешать чтению и нажатию на элементы страницы",
        nextStep: "Проверьте размеры изображений, динамические блоки и загрузку шрифтов; исправляйте только источник смещения, подтверждённый повторным тестом",
      };
    case "tbt":
      return {
        title: "TBT: занятость основного потока",
        whatFound: fact(issue),
        whyImportant: "TBT показывает суммарное время блокировки основного потока длительными задачами в лабораторном тесте. Такие задержки могут мешать странице отвечать на действия во время загрузки; это не измерение опыта реальных посетителей",
        nextStep: "В записи производительности найдите задачи JavaScript, которые занимают основной поток, и оцените необходимость их выполнения до первого взаимодействия",
      };
    case "title":
    case "titles":
      return metadataCopy(issue, "title");
    case "description":
    case "descriptions":
      return metadataCopy(issue, "description");
    case "h1":
      return headingCopy(issue);
    case "canonical":
      return {
        title: "Canonical: основной адрес страницы",
        whatFound: fact(issue),
        whyImportant: "Canonical помогает поисковому роботу понять предпочтительный адрес среди похожих URL. Проверка canonical не подтверждает фактическое наличие страницы в индексе",
        nextStep: "Проверьте, соответствует ли canonical запланированному публичному адресу страницы, исправьте его только при расхождении и повторите проверку",
      };
    case "page-http":
    case "status":
    case "site-access":
      return httpCopy(issue);
    default:
      return {
        title: clean(issue.title) || "Замечание по странице",
        whatFound: fact(issue),
        whyImportant: clean(issue.whyImportant) || "Результат автоматической проверки требует внимания и не заменяет ручную оценку страницы",
        nextStep: clean(issue.nextStep) || "Сверьте найденный факт с опубликованной страницей и внесите только необходимое изменение",
      };
  }
}

function performanceCopy(issue: AuditClientIssue): MessageIssue {
  const scoreDetail = issue.details?.find((detail) => /(?:оценка.*производительност|performance score)/iu.test(detail.label));
  const score = performanceScore(issue.whatFound) ?? (scoreDetail ? performanceScore(scoreDetail.value) : null);
  const page = isHomepage(issue.url) ? "главной страницы" : "проверенной страницы";
  return {
    title: `Мобильная производительность ${page}`,
    whatFound: score
      ? `Мобильная производительность ${page} — ${score}/100`
      : "В сохранённом результате есть замечание к мобильной производительности, но числовая оценка не указана",
    whyImportant: "По результатам теста показатель требует внимания. Сам по себе итоговый балл не указывает на конкретную причину снижения производительности",
    nextStep: "Повторите измерение 2–3 раза в одинаковых условиях. Если результат остаётся примерно тем же, изучите отдельные показатели и рекомендации теста. После оптимизации повторите измерение в тех же условиях",
  };
}

function metadataCopy(issue: AuditClientIssue, tag: "title" | "description"): MessageIssue {
  const finding = issue.whatFound;
  const missing = /(?:не\s*(?:найден|заполнен|содержит)|отсутств|(?:^|\s)нет\s)/iu.test(finding);
  const duplicate = /дубл|повторя|одинаков/iu.test(finding);
  const lengthMatch = finding.match(/длина\s*:?\s*(\d+)|(?:title|description)\s*:\s*(\d+)\s*символ/iu);
  const length = lengthMatch ? Number(lengthMatch[1] ?? lengthMatch[2]) : undefined;
  const long = /длинн/iu.test(finding) || (length !== undefined && length > (tag === "title" ? 60 : 160));
  const short = /коротк/iu.test(finding) || (length !== undefined && length < (tag === "title" ? 30 : 70));
  const nextStep = missing
    ? tag === "description"
      ? "Добавьте краткое description по содержанию страницы, затем проверьте результат"
      : "Добавьте title, который точно описывает содержание страницы, затем проверьте результат"
    : duplicate
      ? `Сравните страницы с одинаковым ${tag}. Для самостоятельных страниц подготовьте разные формулировки по их содержанию; если это версии одной страницы, проверьте выбор основного адреса`
      : long && !short
        ? `Сократите ${tag}: сохраните тему страницы и важные для посетителя сведения, уберите повторы. Ориентир длины не является строгим лимитом поисковой системы`
        : short && !long
          ? `Дополните ${tag} конкретными сведениями о содержании страницы. Не увеличивайте длину ради количества символов`
          : `Сверьте ${tag} с содержанием страницы и уточните формулировку по найденному замечанию`;
  return {
    title: tag === "title" ? "Title: название страницы для поисковой выдачи" : "Description: описание страницы для поисковой выдачи",
    whatFound: fact(issue),
    whyImportant: tag === "title"
      ? "Title помогает поисковым системам и посетителю понять тему страницы в результатах поиска. Поисковая система может сформировать собственный заголовок"
      : "Description помогает кратко представить содержание страницы в результатах поиска. Поисковая система может сформировать собственное описание",
    nextStep,
  };
}

function headingCopy(issue: AuditClientIssue): MessageIssue {
  const h1Count = issue.whatFound.match(/(?:\bH1|главных заголовков)\s*:\s*(\d+)/iu)?.[1];
  const missing = /(?:не\s*(?:найден|заполнен)|отсутств|(?:^|\s)нет\s)/iu.test(issue.whatFound) || h1Count === "0";
  const several = /нескольк/iu.test(issue.whatFound) || (h1Count !== undefined && Number(h1Count) > 1);
  return {
    title: "H1: главный заголовок страницы",
    whatFound: fact(issue),
    whyImportant: "Главный заголовок помогает посетителю и поисковой системе понять основную тему страницы. Важно, чтобы он отражал содержание, а не был формальной подписью",
    nextStep: missing
      ? "Добавьте один видимый главный H1, который прямо называет тему страницы"
      : several
        ? "Проверьте структуру заголовков и оставьте один главный H1; остальные смысловые разделы оформите подзаголовками"
        : "Проверьте, что единственный H1 точно называет тему страницы и соответствует её содержанию",
  };
}

function isNoindexIssue(issue: AuditClientIssue): boolean {
  return issue.checkId === "robots-noindex"
    || (/\bnoindex\b/iu.test(issue.whatFound)
      && !/(?:noindex\s+(?:не найден|отсутствует)|(?:нет|без)\s+noindex|не найден[^.]{0,40}\bnoindex)/iu.test(issue.whatFound));
}

function noindexCopy(issue: AuditClientIssue): MessageIssue {
  return {
    title: "Директива noindex",
    whatFound: fact(issue),
    whyImportant: "Директива noindex сообщает поисковым системам, что страницу не следует добавлять в результаты поиска. Это может быть корректным решением для служебной или закрытой страницы",
    nextStep: "Проверьте, нужна ли директива noindex для этой страницы. Убирайте её только если страница должна участвовать в поиске",
  };
}

function httpCopy(issue: AuditClientIssue): MessageIssue {
  const status = issue.whatFound.match(/\b([1-5]\d\d)\b/u)?.[1];
  if (status === "404") {
    return {
      title: "HTTP 404: страница не найдена",
      whatFound: fact(issue),
      whyImportant: "По результатам теста страница была недоступна по указанному адресу. Это требует внимания, если на неё ведут ссылки, она нужна посетителям или должна оставаться доступной поисковым системам",
      nextStep: "Проверьте адрес, внутренние ссылки и назначение страницы. Восстановите её либо настройте перенаправление на релевантную замену, если такая замена есть",
    };
  }
  if (status?.startsWith("5")) {
    return {
      title: `HTTP ${status}: ошибка сервера`,
      whatFound: fact(issue),
      whyImportant: "Во время проверки сервер не смог корректно обработать запрос к странице. Повторный тест поможет отличить разовую ошибку от воспроизводимой проблемы",
      nextStep: "Повторите запрос и, если ошибка сохраняется, проверьте журналы сервера, приложение и зависимые сервисы для этого адреса",
    };
  }
  if (status && ["301", "302", "303", "307", "308"].includes(status)) {
    return {
      title: `HTTP ${status}: перенаправление`,
      whatFound: fact(issue),
      whyImportant: "Перенаправление не обязательно является ошибкой, но целевой адрес и цепочка переходов должны соответствовать назначению страницы",
      nextStep: "Проверьте конечный адрес и убедитесь, что перенаправление не образует лишнюю цепочку и ведёт на релевантную страницу",
    };
  }
  return {
    title: clean(issue.title) || "HTTP-ответ страницы",
    whatFound: fact(issue),
    whyImportant: "Код ответа показывает, как сервер обработал запрос к странице во время проверки. Для корректной интерпретации важно сопоставить его с назначением URL",
    nextStep: "Сверьте код ответа с назначением страницы и повторите проверку после необходимой корректировки",
  };
}

function fact(issue: AuditClientIssue): string {
  return clean(issue.whatFound) || "В сохранённом результате нет подробного описания этого замечания";
}

function performanceScore(value: string): string | null {
  const match = clean(value).match(/\b(\d{1,3})\s*(?:из|out of|of|\/)\s*100\b/iu);
  if (!match) return null;
  const score = Number(match[1]);
  return Number.isInteger(score) && score >= 0 && score <= 100 ? String(score) : null;
}

function isHomepage(value: string): boolean {
  try {
    return new URL(value).pathname.replace(/\/+$/u, "") === "";
  } catch {
    return false;
  }
}

function withRepeatCheck(value: string): string {
  const recommendation = sentence(clean(value) || "Сверьте найденный факт с опубликованной страницей и внесите только необходимое изменение");
  return /повторн|повторите|повторную/iu.test(recommendation)
    ? recommendation
    : `${recommendation} После изменения повторите эту же проверку.`;
}

function clean(value: string | undefined): string {
  return (value ?? "").replace(/\s+/gu, " ").trim().slice(0, 2_000);
}

function sentence(value: string): string {
  if (!value) return "";
  return /[.!?…]$/u.test(value) ? value : `${value}.`;
}

function nonNegativeInteger(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}
