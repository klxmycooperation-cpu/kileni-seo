import type { Locale } from "../config/site";

export const serviceResultExampleSlugs = [
  "seo-audit",
  "seo-promotion",
  "web-development",
  "yandex-ads",
  "content-materials",
  "custom-task",
] as const;

export type ServiceResultExampleSlug = (typeof serviceResultExampleSlugs)[number];

export type ServiceResultFragmentRow = {
  key: string;
  label: string;
  value: string;
};

export type ServiceResultExample = {
  slug: ServiceResultExampleSlug;
  eyebrow: string;
  title: string;
  lead: string;
  fragment: {
    title: string;
    caption: string;
    rows: ServiceResultFragmentRow[];
  };
  beforeAfter: {
    title: string;
    before: { label: string; title: string; items: string[] };
    after: { label: string; title: string; items: string[] };
  };
  whyThisOptionTitle: string;
  whyThisOption: string[];
  whyKileniTitle: string;
  whyKileni: string[];
  disclaimer: string;
};

const ru: Record<ServiceResultExampleSlug, ServiceResultExample> = {
  "seo-audit": {
    slug: "seo-audit",
    eyebrow: "Пример результата",
    title: "Одна строка аудита должна объяснять проблему и способ приёмки",
    lead: "Не обезличенный список предупреждений, а рабочая запись, которую можно передать разработчику и проверить повторно.",
    fragment: {
      title: "Фрагмент таблицы аудита",
      caption: "Обезличенный пример формата одной находки.",
      rows: [
        { key: "problem", label: "Проблема", value: "Основной адрес страницы ведёт на адрес с перенаправлением" },
        { key: "priority", label: "Приоритет", value: "Высокий: затрагивает основной адрес страницы" },
        { key: "url", label: "Страница", value: "/catalog/example — обезличенный адрес" },
        { key: "evidence", label: "Доказательство", value: "Указанный основной адрес отличается от конечного адреса после перенаправления" },
        { key: "explanation", label: "Почему это важно", value: "Поисковой системе приходится выбирать между двумя вариантами адреса" },
        { key: "recommendation", label: "Что изменить", value: "Указать конечный адрес как основной и использовать его во внутренних ссылках" },
        { key: "repeat-check", label: "Повторная проверка", value: "Открыть страницу, сверить основной адрес и убедиться, что он открывается без перенаправления" },
      ],
    },
    beforeAfter: {
      title: "Что было и что изменится",
      before: {
        label: "Без рабочего аудита",
        title: "Замечания без адресов, причин и приоритета",
        items: ["Неясно, какие страницы затронуты", "Нет порядка исправления", "Нельзя однозначно принять работу"],
      },
      after: {
        label: "После согласованного аудита",
        title: "Задачи с доказательствами",
        items: ["У каждой находки есть URL и подтверждение", "Приоритет объяснён через влияние на сайт", "Для правки указан способ повторной проверки"],
      },
    },
    whyThisOptionTitle: "Почему этот вариант",
    whyThisOption: [
      "Нужна независимая картина до продвижения, переноса или редизайна",
      "Команде требуется единый порядок технических и контентных задач",
      "Результат должен быть проверяемым, а не сводиться к оценке одним числом",
    ],
    whyKileniTitle: "Почему KILENI",
    whyKileni: [
      "Показываем доказательство на конкретной странице",
      "Отделяем подтверждённую проблему от наблюдения, которое требует данных",
      "Передаём критерий приёмки и остаёмся в согласованных границах проверки",
    ],
    disclaimer: "Это пример структуры результата, а не находка на сайте клиента. Фактический состав зависит от доступных страниц, данных и согласованной глубины проверки.",
  },
  "seo-promotion": {
    slug: "seo-promotion",
    eyebrow: "Пример результата",
    title: "Ежемесячная работа видна по журналу изменений и следующему плану",
    lead: "Отчёт связывает выполненные задачи, затронутые страницы, ограничения данных и решения на следующий период.",
    fragment: {
      title: "Фрагмент ежемесячного отчёта",
      caption: "Структура без вымышленных показателей и попыток приписать результат одной работе.",
      rows: [
        { key: "scope", label: "Согласованный объём", value: "Технические исправления, приоритетные страницы и один связанный материал" },
        { key: "changed-pages", label: "Изменённые страницы", value: "Список адресов страниц с датой и кратким описанием каждого изменения" },
        { key: "materials", label: "Материалы", value: "Что подготовлено, согласовано, опубликовано или ожидает входных данных" },
        { key: "measurement", label: "Динамика", value: "Направление изменения только по согласованным источникам данных" },
        { key: "constraints", label: "Ограничения", value: "Что пока нельзя интерпретировать из-за срока наблюдения, сезонности или отсутствия данных" },
        { key: "next", label: "Следующий период", value: "Очередь задач с причиной выбора и зависимостями" },
      ],
    },
    beforeAfter: {
      title: "Что было и что изменится",
      before: {
        label: "Без управляемого процесса",
        title: "Работы не связаны между собой",
        items: ["Правки не привязаны к базовой точке", "Неясно, какие страницы действительно изменили", "Новый месяц начинается без принятого решения"],
      },
      after: {
        label: "При регулярной работе",
        title: "Изменения можно проследить",
        items: ["Есть план, журнал и статус каждой задачи", "Факты отделены от выводов", "Следующий объём выбран с учётом найденных ограничений"],
      },
    },
    whyThisOptionTitle: "Почему этот вариант",
    whyThisOption: [
      "Одного технического исправления недостаточно и нужен повторяемый цикл",
      "Структура сайта и материалы должны развиваться в одном порядке",
      "Команде важен понятный объём на период, а не неопределённое сопровождение",
    ],
    whyKileniTitle: "Почему KILENI",
    whyKileni: [
      "Фиксируем, что изменили, где и на основании какого решения",
      "Не приписываем работе динамику, которую нельзя подтвердить данными",
      "Показываем ограничения и согласуем следующий объём до его выполнения",
    ],
    disclaimer: "Пример показывает формат отчётности. Направление и глубина работ определяются после диагностики, а поисковая динамика оценивается только по доступным данным.",
  },
  "web-development": {
    slug: "web-development",
    eyebrow: "Пример результата",
    title: "Разработка идёт от задачи к передаваемому рабочему сайту",
    lead: "После каждого этапа остаётся конкретный результат и понятный способ его проверить.",
    fragment: {
      title: "Карта передачи проекта",
      caption: "Пример состава без привязки к конкретной платформе.",
      rows: [
        { key: "brief", label: "Бриф", value: "Задача, аудитория, главное действие и обязательные ограничения" },
        { key: "sitemap", label: "Карта сайта", value: "Страницы, их роли и переходы между ключевыми сценариями" },
        { key: "prototype", label: "Схема экранов", value: "Содержание, состояния и поведение форм до визуального дизайна" },
        { key: "design", label: "Дизайн", value: "Компоненты, ключевые экраны и правила адаптации" },
        { key: "development", label: "Разработка", value: "Рабочая адаптивная версия с согласованными интеграциями" },
        { key: "testing", label: "Тестирование", value: "Сценарии, найденные замечания и статус исправлений" },
        { key: "launch", label: "Запуск", value: "Согласованный порядок публикации и проверка обязательных условий" },
        { key: "handover", label: "Передача", value: "Доступы, исходники, инструкция и границы поддержки" },
      ],
    },
    beforeAfter: {
      title: "Что было и что изменится",
      before: {
        label: "До постановки проекта",
        title: "Пожелания без критериев",
        items: ["Не определено главное действие посетителя", "Макеты не учитывают состояния и мобильный сценарий", "Неясно, кто принимает и поддерживает результат"],
      },
      after: {
        label: "После выполнения согласованного объёма",
        title: "Рабочий продукт с передачей",
        items: ["Структура связана с задачами посетителя", "Ключевые состояния проверяются по сценарию", "Исходники, доступы и правила поддержки переданы"],
      },
    },
    whyThisOptionTitle: "Почему этот вариант",
    whyThisOption: [
      "Нужен новый интерфейс, а не набор несвязанных экранов",
      "Формы, аналитика и поисковая база должны войти в единый запуск",
      "Проект важно принять по этапам и передать без зависимости от одного исполнителя",
    ],
    whyKileniTitle: "Почему KILENI",
    whyKileni: [
      "Начинаем со структуры и сценариев до визуальной полировки",
      "Проверяем мобильные состояния, формы и обязательные условия запуска",
      "Заранее фиксируем интеграции, исключения и состав передачи",
    ],
    disclaimer: "Это пример состава проекта. Технология, количество экранов, интеграции и срок определяются только после согласования задачи и входных материалов.",
  },
  "yandex-ads": {
    slug: "yandex-ads",
    eyebrow: "Пример результата",
    title: "Кампания связывает запрос, сообщение, страницу и измеримое действие",
    lead: "Настройка объясняет, почему запрос попал в группу, какое сообщение увидит человек и куда ведёт объявление.",
    fragment: {
      title: "Фрагмент карты кампании",
      caption: "Обезличенный пример логики настройки, не прогноз результата.",
      rows: [
        { key: "query", label: "Группа запросов", value: "Формулировки с одной услугой и сопоставимым намерением" },
        { key: "intent", label: "Намерение", value: "Пользователь выбирает исполнителя, а не ищет справочную информацию" },
        { key: "message", label: "Сообщение", value: "Отражает конкретную услугу и условие, подтверждённое на странице" },
        { key: "landing", label: "Посадочная страница", value: "Раздел с тем же предложением, ограничениями и следующим действием" },
        { key: "goal", label: "Цель", value: "Отправка валидной формы или другое согласованное обращение" },
        { key: "exclusions", label: "Исключения", value: "Нерелевантные намерения и площадки фиксируются в журнале изменений" },
        { key: "decision-log", label: "Решение", value: "Причина запуска, остановки или изменения группы сохраняется в отчёте" },
      ],
    },
    beforeAfter: {
      title: "Что было и что изменится",
      before: {
        label: "Без структуры",
        title: "Клики нельзя объяснить",
        items: ["Разные намерения смешаны в одной группе", "Объявление и страница говорят о разном", "Цель не отделяет обращение от случайного действия"],
      },
      after: {
        label: "После согласованной настройки",
        title: "Решения прослеживаются",
        items: ["Запросы разделены по услуге и намерению", "Сообщение подтверждается посадочной страницей", "Изменения и ограничения записаны отдельно от рекламного бюджета"],
      },
    },
    whyThisOptionTitle: "Почему этот вариант",
    whyThisOption: [
      "Спрос нужно проверить быстрее, чем это позволяет органический поиск",
      "Услуги или регионы требуют отдельных сообщений и страниц",
      "Нужна прозрачная связь между настройкой и данными об обращениях",
    ],
    whyKileniTitle: "Почему KILENI",
    whyKileni: [
      "Проверяем не только кабинет, но и соответствие посадочной страницы",
      "Отделяем стоимость работы от бюджета рекламной системы",
      "Фиксируем логику изменений и не подменяем обращения кликами",
    ],
    disclaimer: "Фрагмент иллюстрирует структуру настройки. Стоимость обращения и объём спроса зависят от рынка, страницы, бюджета и периода наблюдения.",
  },
  "content-materials": {
    slug: "content-materials",
    eyebrow: "Пример результата",
    title: "Материал начинается с вопроса читателя и проверяемых фактов",
    lead: "До написания фиксируются роль страницы, источники, ограничения и критерии редакторской приёмки.",
    fragment: {
      title: "Фрагмент редакторского брифа",
      caption: "Пример структуры для одной страницы или статьи.",
      rows: [
        { key: "reader-question", label: "Вопрос читателя", value: "Как понять, подходит ли услуга для моей ситуации" },
        { key: "page-role", label: "Роль страницы", value: "Объяснить выбор и привести к следующему осмысленному шагу" },
        { key: "sources", label: "Источники", value: "Материалы клиента, правила площадки и согласованные первичные документы" },
        { key: "outline", label: "Структура", value: "Ответ, ограничения, процесс, результат, приёмка и следующий шаг" },
        { key: "claims", label: "Утверждения", value: "Факты подтверждаются источником; предположения отмечаются как предположения" },
        { key: "metadata", label: "Метаданные", value: "Title и description соответствуют вопросу и содержанию страницы" },
        { key: "handover", label: "Передача", value: "Текст, ссылки, вопросы на проверку и список согласованных правок" },
      ],
    },
    beforeAfter: {
      title: "Что было и что изменится",
      before: {
        label: "Без редакторского брифа",
        title: "Текст существует сам по себе",
        items: ["Неясно, на какой вопрос отвечает страница", "Утверждения не связаны с источниками", "Материал повторяет соседние страницы"],
      },
      after: {
        label: "После согласованной работы",
        title: "Материал занимает понятное место",
        items: ["Есть один читательский вопрос и роль страницы", "Факты, источники и предположения разделены", "Текст, название и описание страницы передаются вместе со способом проверки"],
      },
    },
    whyThisOptionTitle: "Почему этот вариант",
    whyThisOption: [
      "Нужна новая страница, обновление старой или связанная серия материалов",
      "Команде не хватает структуры и редакторской проверки, а не объёма текста",
      "Материал должен учитывать соседние страницы и реальный вопрос читателя",
    ],
    whyKileniTitle: "Почему KILENI",
    whyKileni: [
      "Сначала определяем роль материала, затем пишем",
      "Отделяем факты клиента от редакторских допущений",
      "Убираем повторы и передаём понятный список вопросов на согласование",
    ],
    disclaimer: "Это демонстрация редакторской структуры. Темы, источники и глубина материала определяются после брифа и проверки доступных фактов.",
  },
  "custom-task": {
    slug: "custom-task",
    eyebrow: "Пример результата",
    title: "Сначала уточняем нестандартную задачу и критерий готовности",
    lead: "Вместо преждевременной сметы появляется проверяемый первый этап с известными входными данными и зависимостями.",
    fragment: {
      title: "Фрагмент постановки задачи",
      caption: "Пример документа до оценки и начала работы.",
      rows: [
        { key: "current-state", label: "Текущее состояние", value: "Что уже работает, где возникает проблема и какие данные доступны" },
        { key: "desired-outcome", label: "Нужный результат", value: "Что должно стать возможным после первого самостоятельного этапа" },
        { key: "unknowns", label: "Неизвестные", value: "Вопросы, без ответа на которые нельзя честно определить состав" },
        { key: "assumptions", label: "Допущения", value: "Условия, на которых строится предварительное решение" },
        { key: "boundaries", label: "Состав этапа", value: "Что входит в этап, что исключено и от кого зависят входные данные" },
        { key: "artifact", label: "Готовый результат", value: "Документ, прототип, интеграция или другой заранее названный результат" },
        { key: "acceptance", label: "Как проверяем", value: "Набор проверок, подтверждающих завершение согласованного этапа" },
      ],
    },
    beforeAfter: {
      title: "Что было и что изменится",
      before: {
        label: "До разбора",
        title: "Запрос описывает решение, но не задачу",
        items: ["Цель смешана со способом реализации", "Не названы доступы и зависимости", "Нельзя определить момент завершения"],
      },
      after: {
        label: "После постановки",
        title: "Первый этап можно оценить и принять",
        items: ["Текущее и нужное состояние разделены", "Неизвестные и допущения записаны", "Результат первого этапа, ограничения и способ проверки согласованы"],
      },
    },
    whyThisOptionTitle: "Почему этот вариант",
    whyThisOption: [
      "Ни одна типовая услуга не описывает задачу без существенных исключений",
      "Сначала нужно проверить гипотезу или зависимость",
      "Проект можно безопасно разделить на самостоятельные этапы",
    ],
    whyKileniTitle: "Почему KILENI",
    whyKileni: [
      "Не выдаём способ реализации за подтверждённую задачу",
      "Показываем неизвестные, риски и зависимости до оценки",
      "Предлагаем первый самостоятельный результат с явной приёмкой",
    ],
    disclaimer: "Пример показывает способ постановки нестандартной задачи. Реальный состав, срок и цена появляются только после проверки входных данных и согласования работ.",
  },
};

const en: Record<ServiceResultExampleSlug, ServiceResultExample> = {
  "seo-audit": {
    slug: "seo-audit",
    eyebrow: "Result example",
    title: "Each audit row should explain the issue and how to accept the fix",
    lead: "Not an anonymous warning list, but a working record that can be handed to a developer and verified again.",
    fragment: {
      title: "Audit table fragment",
      caption: "An anonymised example of one finding.",
      rows: [
        { key: "problem", label: "Issue", value: "Canonical points to a redirecting address" },
        { key: "priority", label: "Priority", value: "High: it affects the page's primary address" },
        { key: "url", label: "URL", value: "/catalog/example — anonymised address" },
        { key: "evidence", label: "Evidence", value: "The canonical differs from the final address after redirection" },
        { key: "explanation", label: "Why it matters", value: "The search engine has to choose between two address variants" },
        { key: "recommendation", label: "Recommended change", value: "Use the final indexable address in the canonical and internal links" },
        { key: "repeat-check", label: "Repeat check", value: "Open the page, inspect the canonical and confirm that its target does not redirect" },
      ],
    },
    beforeAfter: {
      title: "Before → after",
      before: {
        label: "Without a working audit",
        title: "Signals without context",
        items: ["Affected pages are unknown", "There is no order of work", "Completion cannot be accepted consistently"],
      },
      after: {
        label: "After the agreed audit",
        title: "Tasks supported by evidence",
        items: ["Every finding has a URL and evidence", "Priority is explained through site impact", "Every fix includes a repeat-check method"],
      },
    },
    whyThisOptionTitle: "Why this option",
    whyThisOption: [
      "An independent baseline is needed before growth, migration or redesign",
      "The team needs one order for technical and content work",
      "The result must be verifiable rather than reduced to a single score",
    ],
    whyKileniTitle: "Why KILENI",
    whyKileni: [
      "Evidence is shown on a specific page",
      "Confirmed issues are separated from observations that need more data",
      "Acceptance criteria and the agreed audit boundary are documented",
    ],
    disclaimer: "This is a format example, not a finding from a client website. Actual scope depends on accessible pages, available data and the agreed audit depth.",
  },
  "seo-promotion": {
    slug: "seo-promotion",
    eyebrow: "Result example",
    title: "Monthly work is visible through a change log and the next decision",
    lead: "The report connects completed work, affected pages, data constraints and the plan for the next period.",
    fragment: {
      title: "Monthly report fragment",
      caption: "A reporting structure without invented metrics or attribution.",
      rows: [
        { key: "scope", label: "Agreed scope", value: "Technical fixes, priority pages and one connected content item" },
        { key: "changed-pages", label: "Changed pages", value: "A URL list with the date and a short description of every change" },
        { key: "materials", label: "Content", value: "What was drafted, approved, published or is waiting for inputs" },
        { key: "measurement", label: "Movement", value: "Direction of change only for agreed and available data sources" },
        { key: "constraints", label: "Constraints", value: "What cannot yet be interpreted because of timing, seasonality or missing data" },
        { key: "next", label: "Next period", value: "A task queue with selection reasons and dependencies" },
      ],
    },
    beforeAfter: {
      title: "Before → after",
      before: {
        label: "Without a managed process",
        title: "Activities are disconnected",
        items: ["Changes have no recorded baseline", "It is unclear which pages actually changed", "A new month starts without an accepted decision"],
      },
      after: {
        label: "With recurring work",
        title: "Changes can be traced",
        items: ["Every task has a plan, log and status", "Data is separated from interpretation", "The next scope follows confirmed constraints"],
      },
    },
    whyThisOptionTitle: "Why this option",
    whyThisOption: [
      "One technical fix is not enough and the site needs a repeatable cycle",
      "Site structure and content need one coordinated order",
      "The team needs a defined period scope rather than open-ended support",
    ],
    whyKileniTitle: "Why KILENI",
    whyKileni: [
      "We record what changed, where and on which decision",
      "We do not attribute movement that the available data cannot support",
      "Constraints are shown and the next scope is agreed before delivery",
    ],
    disclaimer: "This example shows the reporting format. Work depth follows diagnosis, while search movement is interpreted only from accessible and agreed data sources.",
  },
  "web-development": {
    slug: "web-development",
    eyebrow: "Result example",
    title: "Development moves from the task to a working product that can be handed over",
    lead: "Each stage leaves a clear artefact and an acceptance criterion for the next part of the work.",
    fragment: {
      title: "Project handover map",
      caption: "An example scope without tying the work to a specific platform.",
      rows: [
        { key: "brief", label: "Brief", value: "Task, audience, primary action and mandatory constraints" },
        { key: "sitemap", label: "Sitemap", value: "Pages, page roles and links between key journeys" },
        { key: "prototype", label: "Prototype", value: "Content, states and form behaviour before visual design" },
        { key: "design", label: "Design", value: "Components, key screens and responsive rules" },
        { key: "development", label: "Development", value: "A working responsive version with agreed integrations" },
        { key: "testing", label: "Testing", value: "Scenarios, findings and resolution status" },
        { key: "launch", label: "Launch", value: "Agreed publishing order and checks for mandatory signals" },
        { key: "handover", label: "Handover", value: "Access, source files, guidance and support boundaries" },
      ],
    },
    beforeAfter: {
      title: "Before → after",
      before: {
        label: "Before project framing",
        title: "Preferences without acceptance criteria",
        items: ["The visitor's primary action is undefined", "Layouts omit states and the mobile journey", "Ownership and support are unclear"],
      },
      after: {
        label: "After the agreed scope",
        title: "A working product with handover",
        items: ["Structure follows visitor tasks", "Key states are checked through scenarios", "Source files, access and support rules are handed over"],
      },
    },
    whyThisOptionTitle: "Why this option",
    whyThisOption: [
      "A new interface is needed rather than a set of disconnected screens",
      "Forms, analytics and search foundations should enter one launch scope",
      "The project needs staged acceptance and a handover without dependency on one contractor",
    ],
    whyKileniTitle: "Why KILENI",
    whyKileni: [
      "Structure and journeys are settled before visual polish",
      "Mobile states, forms and mandatory launch signals are tested",
      "Integrations, exclusions and handover contents are recorded in advance",
    ],
    disclaimer: "This is a project framework example. Technology, screen count, integrations and timing are confirmed only after the task and source materials are agreed.",
  },
  "yandex-ads": {
    slug: "yandex-ads",
    eyebrow: "Result example",
    title: "A campaign connects the query, message, landing page and measurable action",
    lead: "The setup explains why a query belongs in a group, what message is shown and where the ad leads.",
    fragment: {
      title: "Campaign map fragment",
      caption: "An anonymised configuration example, not a performance forecast.",
      rows: [
        { key: "query", label: "Query group", value: "Phrases for one service with comparable intent" },
        { key: "intent", label: "Intent", value: "The person is selecting a provider rather than seeking general information" },
        { key: "message", label: "Message", value: "A specific service and condition supported by the landing page" },
        { key: "landing", label: "Landing page", value: "A page with the same offer, constraints and next action" },
        { key: "goal", label: "Goal", value: "A valid form submission or another agreed enquiry action" },
        { key: "exclusions", label: "Exclusions", value: "Irrelevant intent and placements are recorded in the change log" },
        { key: "decision-log", label: "Decision", value: "The reason to launch, stop or change a group is kept in the report" },
      ],
    },
    beforeAfter: {
      title: "Before → after",
      before: {
        label: "Without structure",
        title: "Clicks cannot be explained",
        items: ["Different intents are mixed in one group", "The ad and page say different things", "The goal does not distinguish an enquiry from an incidental action"],
      },
      after: {
        label: "After the agreed setup",
        title: "Decisions can be traced",
        items: ["Queries are split by service and intent", "The landing page supports the message", "Changes and constraints are separated from media spend"],
      },
    },
    whyThisOptionTitle: "Why this option",
    whyThisOption: [
      "Demand needs to be tested faster than organic search allows",
      "Services or regions require separate messages and pages",
      "A transparent link between setup and enquiry data is required",
    ],
    whyKileniTitle: "Why KILENI",
    whyKileni: [
      "We review the landing-page match, not only the ad account",
      "Service fees stay separate from media spend",
      "The change logic is recorded and clicks are not presented as enquiries",
    ],
    disclaimer: "The fragment illustrates setup structure. Enquiry cost and demand volume depend on the market, landing page, media spend and observation period.",
  },
  "content-materials": {
    slug: "content-materials",
    eyebrow: "Result example",
    title: "Content starts with a reader question and verifiable evidence",
    lead: "Before writing, we record the page role, sources, constraints and editorial acceptance criteria.",
    fragment: {
      title: "Editorial brief fragment",
      caption: "An example structure for one page or article.",
      rows: [
        { key: "reader-question", label: "Reader question", value: "How do I know whether this service fits my situation" },
        { key: "page-role", label: "Page role", value: "Explain the choice and lead to a sensible next step" },
        { key: "sources", label: "Sources", value: "Client materials, platform rules and agreed primary documents" },
        { key: "outline", label: "Outline", value: "Answer, constraints, process, deliverable, acceptance and next step" },
        { key: "claims", label: "Claims", value: "Facts cite a source; assumptions are identified as assumptions" },
        { key: "metadata", label: "Metadata", value: "Title and description match the question and the page content" },
        { key: "handover", label: "Handover", value: "Copy, links, verification questions and an agreed edit list" },
      ],
    },
    beforeAfter: {
      title: "Before → after",
      before: {
        label: "Without an editorial brief",
        title: "Copy exists in isolation",
        items: ["The reader question is unclear", "Claims are not connected to sources", "The material repeats neighbouring pages"],
      },
      after: {
        label: "After the agreed work",
        title: "The material has a clear place",
        items: ["One reader question and page role are defined", "Facts, sources and assumptions are separated", "Copy and metadata include acceptance criteria"],
      },
    },
    whyThisOptionTitle: "Why this option",
    whyThisOption: [
      "A new page, substantive update or connected content series is needed",
      "The team needs structure and editorial verification rather than more words",
      "The material must account for neighbouring pages and the reader's real question",
    ],
    whyKileniTitle: "Why KILENI",
    whyKileni: [
      "The material's role is defined before drafting",
      "Client facts are separated from editorial assumptions",
      "Repetition is removed and verification questions are handed over clearly",
    ],
    disclaimer: "This demonstrates an editorial structure. Topics, sources and depth are confirmed after the brief and a review of accessible evidence.",
  },
  "custom-task": {
    slug: "custom-task",
    eyebrow: "Result example",
    title: "A non-standard task first receives boundaries and a definition of done",
    lead: "Instead of a premature estimate, the work starts with a verifiable first stage, known inputs and named dependencies.",
    fragment: {
      title: "Task-framing fragment",
      caption: "An example document used before estimation and delivery.",
      rows: [
        { key: "current-state", label: "Current state", value: "What works now, where the problem occurs and which data is available" },
        { key: "desired-outcome", label: "Required outcome", value: "What should become possible after the first independent stage" },
        { key: "unknowns", label: "Unknowns", value: "Questions that prevent an honest scope until answered" },
        { key: "assumptions", label: "Assumptions", value: "Conditions used to form a preliminary approach" },
        { key: "boundaries", label: "Boundaries", value: "What is included, excluded and dependent on external inputs" },
        { key: "artifact", label: "Artefact", value: "A document, prototype, integration or another named state" },
        { key: "acceptance", label: "Acceptance", value: "Checks that confirm completion of the agreed stage" },
      ],
    },
    beforeAfter: {
      title: "Before → after",
      before: {
        label: "Before task framing",
        title: "The request describes a solution, not the problem",
        items: ["The outcome is mixed with implementation", "Access and dependencies are unnamed", "Completion cannot be determined"],
      },
      after: {
        label: "After task framing",
        title: "The first stage can be estimated and accepted",
        items: ["Current and required states are separated", "Unknowns and assumptions are recorded", "The artefact, boundaries and acceptance check are agreed"],
      },
    },
    whyThisOptionTitle: "Why this option",
    whyThisOption: [
      "No standard service describes the task without substantial exceptions",
      "A hypothesis or dependency must be tested first",
      "The project can be separated into independent stages",
    ],
    whyKileniTitle: "Why KILENI",
    whyKileni: [
      "We do not present an implementation preference as a confirmed task",
      "Unknowns, risks and dependencies are shown before estimation",
      "The first independent result includes explicit acceptance criteria",
    ],
    disclaimer: "This example shows how a non-standard task is framed. Actual scope, timing and price appear only after input review and boundary agreement.",
  },
};

export const serviceResultExamples: Record<Locale, Record<ServiceResultExampleSlug, ServiceResultExample>> = {
  ru,
  en,
};

export function getServiceResultExample(locale: Locale, slug: string): ServiceResultExample | undefined {
  return serviceResultExamples[locale][slug as ServiceResultExampleSlug];
}
