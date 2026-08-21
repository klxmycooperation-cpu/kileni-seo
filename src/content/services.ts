import type { Locale } from "../config/site";
import { priceLabel } from "../config/price-labels";
import { additionalServices } from "./service-additions";

export type ServicePackage = { name: string; priceKey: string; description: string; limit: string; features: string[]; duration?: string; featured?: boolean };
export type ServiceVisual = {
  kind: "audit-matrix" | "growth-loop" | "card-stack" | "build-system" | "campaign-funnel";
  label: string;
  summary: string;
  signals: Array<{ label: string; value: string }>;
};
export type ServiceContent = {
  eyebrow: string; title: string; lead: string; problem: string; diagnosis: string[]; fit: string[]; work: string[]; deliverables: string[];
  duration: string; exclusions: string[]; outcomes: string[]; packages: ServicePackage[]; caseLink?: string;
  faq: Array<{ q: string; a: string }>; visual: ServiceVisual;
  buyerQuestions: Array<{ question: string; answer: string }>;
};

export type RawServiceContent = Omit<ServiceContent, "diagnosis" | "visual" | "buyerQuestions">;

const ru: Record<string, RawServiceContent> = {
  "seo-audit": {
    eyebrow: "SEO-аудит", title: "Проверим сайт и составим список работ", lead: "Покажем ошибки на конкретных страницах, расставим их по важности и напишем, как проверить исправления.",
    problem: "Сайт может открываться для людей, но оставаться неудобным для поисковых систем: важные страницы закрыты, похожие страницы конкурируют между собой, а шаблоны создают сотни повторов.",
    fit: ["Сайт не появляется в поиске или теряет видимость", "Текущий подрядчик присылает непонятные отчёты", "Планируется перенос, редизайн или крупное обновление", "Нужно оценить качество сайта перед продвижением"],
    work: ["Проверяем, видят ли Яндекс и Google важные страницы — это называется индексацией", "Проверяем файл robots.txt, карту сайта (sitemap) и основной адрес страницы (canonical)", "Проверяем названия и описания страниц, заголовки, дубли и внутренние ссылки", "Оцениваем мобильную скорость, данные для поисковых систем (JSON-LD), формы и базовые защитные заголовки"],
    deliverables: ["Отчёт с понятным резюме", "Таблица проблем с доказательствами", "Приоритетный план исправлений", "Техническое задание для разработчика", "Консультация по результату"],
    duration: "От 2 рабочих дней для короткого аудита до 7–10 дней для аудита с планом.",
    exclusions: ["Доступы и закрытые разделы без согласования", "Внедрение, если выбран только аудит", "Активное сканирование уязвимостей", "Гарантия позиций или продаж"],
    outcomes: ["Список найденных ошибок", "Примеры проблемных страниц", "Задачи по приоритету", "Критерии повторной проверки"],
    packages: [
      { name: "Автопроверка", priceKey: "audit-preliminary", description: "Покажет общую оценку и основные группы проблем.", limit: "Автоматически до 10 публичных страниц", features: ["Публичные страницы", "Общая оценка", "Основные группы проблем", "Ссылка на результат"] },
      { name: "Короткий аудит", priceKey: "audit-express", description: "Главные ошибки и порядок исправления без длинного отчёта.", limit: "До 30 страниц · 2 рабочих дня", features: ["До 10 главных проблем", "Короткий отчёт", "Порядок исправления", "Созвон 30 минут"], duration: "2 рабочих дня" },
      { name: "Полный аудит", priceKey: "audit-full", description: "Проверка технической части, шаблонов и скорости.", limit: "До 200 страниц · 5 рабочих дней", features: ["Обход страниц", "Проверка шаблонов", "Лабораторный замер скорости", "Список задач"], duration: "5 рабочих дней", featured: true },
      { name: "Аудит + план", priceKey: "audit-strategy", description: "Полный аудит и рабочий план продвижения на три месяца.", limit: "До 500 страниц · 7–10 рабочих дней", features: ["Поисковый спрос", "Конкуренты", "Новые страницы", "План на 3 месяца"], duration: "7–10 рабочих дней" },
      { name: "Аудит с исправлениями", priceKey: "audit-implementation", description: "Проверка, согласованные правки и повторный контроль.", limit: "Аудит + до 12 часов правок", features: ["Резервная копия", "До 12 часов правок", "Список изменений", "Повторная проверка"] },
    ], caseLink: "/cases/eco-santeh",
    faq: [
      { q: "Бесплатная проверка заменяет аудит?", a: "Нет. Она анализирует только публичные сигналы и показывает направления риска. Полный аудит включает доказательства, конкретные URL, доступы и план внедрения." },
      { q: "Можно заказать только исправления?", a: "Сначала нужна диагностика. Если уже есть качественный аудит, мы изучим его и отдельно оценим внедрение." },
      { q: "Почему цена ограничена количеством страниц?", a: "Объём сайта влияет на время обхода, проверку шаблонов, дублей и приоритизацию. Для крупных проектов состав работ согласуется отдельно." },
    ],
  },
  "seo-promotion": {
    eyebrow: "SEO-продвижение", title: "Исправляем сайт и добавляем полезные страницы каждый месяц", lead: "Заранее фиксируем объём: какие страницы проверим, что исправим и какие материалы подготовим.",
    problem: "Продвижение останавливается, когда меняют только тексты или только техническую часть. Поиску нужны доступные страницы, понятная структура, полезные материалы и регулярные исправления.",
    fit: ["Есть сайт и устойчивый спрос на услуги", "Нужно расширять видимость по релевантным запросам", "Технические задачи и контент требуют одного координатора", "Нужна прозрачность ежемесячных работ"],
    work: ["Контролируем индексирование и техническое состояние", "Собираем реальные запросы клиентов и распределяем их по страницам", "Улучшаем существующие страницы и создаём новые материалы", "Анализируем конкурентов, внутренние ссылки и пользовательский путь", "Фиксируем изменения и результат в отчёте"],
    deliverables: ["План на месяц", "Обновлённые страницы и материалы", "Технические задачи и внедрения в согласованном объёме", "Отчёт с объяснением динамики", "План следующего месяца"],
    duration: "Минимальный разумный горизонт — 3–6 месяцев. Первые технические результаты видны раньше, поисковый эффект требует повторного обхода и статистики.",
    exclusions: ["Рекламный бюджет", "Платные размещения", "Сложная разработка вне тарифа", "Гарантированные позиции и число заявок"],
    outcomes: ["Исправленные страницы", "Новые страницы под спрос", "Понятный список сделанного", "План работ на следующий месяц"],
    packages: [
      { name: "Старт", priceKey: "seo-base", description: "Для небольшого сайта услуг в одном регионе.", limit: "1 регион · 5 страниц · 1 материал", features: ["Проверка сайта", "5 приоритетных страниц", "1 материал в месяц", "До 3 часов правок"] },
      { name: "Развитие", priceKey: "seo-growth", description: "Для регулярного улучшения страниц и расширения спроса.", limit: "До 2 регионов · 10 страниц · 2 материала", features: ["10 приоритетных страниц", "2 материала в месяц", "До 6 часов правок", "Встреча раз в месяц"], featured: true },
      { name: "Команда", priceKey: "seo-full", description: "Для нескольких направлений с постоянными задачами по сайту.", limit: "До 3 регионов · 20 страниц · 4 материала", features: ["20 приоритетных страниц", "4 материала в месяц", "До 10 часов правок", "Статус раз в неделю"] },
      { name: "Статья", priceKey: "content-article", description: "Один самостоятельный материал для сайта без ежемесячного сопровождения.", limit: "До 8 000 знаков · 1 раунд правок", features: ["План статьи", "Текст", "Title и description", "Проверка фактов по материалам клиента"] },
    ], caseLink: "/cases/zasorservice",
    faq: [
      { q: "Когда появится результат?", a: "Исправления можно подтвердить сразу повторной проверкой. Позиции и трафик меняются после обхода поисковых систем и зависят от рынка, поэтому точную дату обещать некорректно." },
      { q: "Нужна ли Яндекс Реклама?", a: "Не всегда. Реклама может быстро проверить спрос и дополнять SEO, но её бюджет и ведение считаются отдельно." },
      { q: "Кто пишет и публикует материалы?", a: "Состав зависит от тарифа. Мы заранее фиксируем, кто готовит текст, изображения, согласование и публикацию." },
    ],
  },
  marketplaces: {
    eyebrow: "Wildberries и Ozon", title: "Карточка, которую легко понять покупателю и найти в каталоге", lead: "Работаем с поисковыми запросами, текстом, характеристиками, визуальной подачей и регулярной аналитикой. Без бессмысленного повторения ключевых слов.",
    problem: "Карточка теряет показы и доверие, когда заголовок перегружен, характеристики заполнены неполно, изображения не отвечают на вопросы, а обновления делаются без измеримого плана.",
    fit: ["Новая карточка готовится к запуску", "Есть показы, но карточка выглядит слабее конкурентов", "Нужно обновить несколько или десятки артикулов", "Требуется регулярное сопровождение магазина"],
    work: ["Изучаем выдачу и карточки конкурентов", "Собираем запросы и распределяем их естественно", "Готовим заголовки, описания и характеристики", "Проектируем изображения, инфографику, карусель и видео", "Отслеживаем динамику по согласованным фразам"],
    deliverables: ["Таблица запросов", "Готовые тексты и характеристики", "Файлы изображений и видео в выбранном пакете", "План публикации", "Отчёт по динамике при сопровождении"],
    duration: "От 3 рабочих дней для одной карточки. Пакеты и сопровождение планируются по календарю публикаций.",
    exclusions: ["Доступ к кабинету без отдельного согласования", "Изменение карточек самим сайтом KILENI", "Гарантия позиции в каталоге", "Рекламный бюджет маркетплейса"],
    outcomes: ["Понятное предложение", "Релевантные поисковые формулировки", "Цельная визуальная упаковка", "Контролируемый процесс обновлений"],
    packages: [
      { name: "Разбор карточки", priceKey: "mp-audit", description: "Проверим карточку и покажем, что исправить сначала.", limit: "1 артикул", features: ["Карточка и конкуренты", "Главные проблемы", "Список правок"] },
      { name: "Текст и SEO", priceKey: "mp-optimization", description: "Запросы, название, описание и свойства товара.", limit: "1 артикул · 1 раунд правок", features: ["Запросы", "Название", "Описание", "Характеристики"] },
      { name: "Карточка с инфографикой", priceKey: "mp-turnkey", description: "Текст и до шести кадров из материалов клиента.", limit: "1 артикул · до 6 кадров", features: ["Текст и SEO", "Изображения", "Инфографика", "Порядок кадров"], featured: true },
      { name: "10 карточек", priceKey: "mp-pack", description: "Тексты и свойства для одной товарной категории.", limit: "До 10 артикулов · без визуалов", features: ["Одна категория", "Общий сбор запросов", "Тексты", "Характеристики"] },
      { name: "Магазин", priceKey: "mp-support", description: "Плановые обновления карточек на одной площадке.", limit: "1 площадка · до 20 SKU · 4 обновления", features: ["Правки карточек", "Публикационный план", "Проверка показателей", "Отчёт"] },
    ],
    faq: [
      { q: "Вы сами публикуете изменения?", a: "Только по согласованию и с предоставленным доступом. Без разрешения клиента карточки не меняем." },
      { q: "Можно заказать только изображения?", a: "Да. Дополнительные изображения, инфографика и видео оцениваются по техническому заданию." },
      { q: "Почему нельзя гарантировать позицию?", a: "На выдачу влияют цена, наличие, рейтинг, логистика, реклама и алгоритмы площадки, а не только текст карточки." },
    ],
  },
  "web-development": {
    eyebrow: "Разработка", title: "Спроектируем и сделаем сайт, готовый к рекламе и поиску", lead: "Согласуем структуру, нарисуем ключевые экраны, соберём мобильную версию, подключим формы и аналитику.",
    problem: "Красивый макет не решает задачу, если сайт медленный, неудобный на телефоне, не готов к аналитике, поиску, обновлениям и дальнейшему развитию.",
    fit: ["Нужен новый лендинг или корпоративный сайт", "Каталог вырос из текущей платформы", "Нужен интернет-магазин, кабинет или внутренний сервис", "Старый сайт ограничивает рекламу и SEO"],
    work: ["Проводим брифинг и анализируем бизнес", "Проектируем структуру и прототип", "Создаём оригинальную визуальную систему", "Разрабатываем мобильную версию, формы и интеграции", "Настраиваем аналитику и базовую SEO-подготовку", "Передаём репозиторий, инструкцию, резервное копирование и систему обновлений"],
    deliverables: ["Структура и прототип", "Дизайн-макеты ключевых состояний", "Рабочий сайт и репозиторий", "Настроенные формы и аналитика", "Инструкция и схема поддержки"],
    duration: "Лендинг обычно занимает 5–7 недель. Более крупные сайты оцениваются после брифа.",
    exclusions: ["Домен, хостинг и платные сервисы", "Контент вне согласованного объёма", "Неописанные интеграции", "Бессрочная поддержка"],
    outcomes: ["Рабочая мобильная версия", "Подключённые формы и аналитика", "Базовая подготовка к поиску", "Исходники и инструкция"],
    packages: [
      { name: "Лендинг", priceKey: "dev-landing", description: "Одна страница для одной услуги или предложения.", limit: "До 7 блоков · 1 форма", features: ["Структура", "Дизайн", "Адаптивная разработка", "Аналитика и базовое SEO"] },
      { name: "Корпоративный сайт", priceKey: "dev-corporate", description: "Сайт услуг с понятной системой страниц.", limit: "До 5 шаблонов · 10 готовых страниц", features: ["Прототип", "Дизайн", "Разработка", "Система управления"], featured: true },
      { name: "Каталог или магазин", priceKey: "dev-commerce", description: "Каталог, фильтры и корзина для товарного проекта.", limit: "До 100 товаров · интеграции отдельно", features: ["Каталог", "Фильтры", "Корзина", "Базовая загрузка товаров"] },
      { name: "Индивидуальная система", priceKey: "individual", description: "Личный кабинет или внутренний сервис после оценки требований.", limit: "Состав и срок после короткого брифа", features: ["Требования", "Прототип", "Разработка", "Поддержка"] },
    ],
    faq: [
      { q: "На какой технологии вы разрабатываете?", a: "Технологию выбираем после задачи. Не ограничиваем проекты одной CMS и заранее учитываем поддержку, нагрузку и будущие интеграции." },
      { q: "Можно начать с прототипа?", a: "Да. Для сложных проектов исследование и прототип можно выделить в самостоятельный оплачиваемый этап." },
      { q: "SEO входит в разработку?", a: "Входит техническая база: структура, метаданные, скорость, sitemap, robots и аналитика. Полное продвижение — отдельная работа." },
    ],
  },
  "yandex-ads": {
    eyebrow: "Яндекс Реклама", title: "Настроим рекламу и покажем, куда уходит бюджет", lead: "Разделим запросы по смыслу, подготовим объявления, проверим цели и отдельно укажем стоимость работ и рекламный бюджет.",
    problem: "Реклама становится дорогой, когда запросы смешаны, посадочная страница не отвечает объявлению, цели не настроены, а решения принимаются только по кликам.",
    fit: ["Нужно проверить спрос быстрее, чем сработает SEO", "Запускается новая услуга или регион", "Требуется независимая оценка действующих кампаний", "SEO и реклама должны работать по общей структуре"],
    work: ["Проверяем сайт и цели", "Собираем и разделяем запросы", "Готовим кампании и объявления", "Настраиваем исключения и аналитику", "Регулярно анализируем не только клики, но и целевые действия"],
    deliverables: ["Структура кампаний", "Объявления и список запросов", "Настроенные цели", "Журнал изменений", "Отчёт и рекомендации"],
    duration: "Настройка — обычно 7–10 рабочих дней после получения доступов и материалов.",
    exclusions: ["Рекламный бюджет Яндекса", "Гарантия цены заявки", "Переделка сайта вне согласованного объёма", "Скрытые комиссии"],
    outcomes: ["Кампании по отдельным услугам", "Настроенные цели", "Список расходов и изменений", "Данные по обращениям"],
    packages: [
      { name: "Запуск", priceKey: "ads-setup", description: "Соберём и запустим рекламу одной услуги.", limit: "1 услуга · 1 регион · до 3 кампаний", features: ["До 100 фраз", "Объявления", "Цели", "Запуск"], featured: true },
      { name: "Ведение", priceKey: "ads-support", description: "Ежемесячные правки кампаний без рекламного бюджета.", limit: "До 5 кампаний · бюджет до 150 000 ₽", features: ["Контроль расходов", "Минус-слова", "Правки объявлений", "Отчёт"] },
    ],
    faq: [
      { q: "Рекламный бюджет входит в цену?", a: "Нет. Бюджет оплачивается Яндексу отдельно, а стоимость KILENI покрывает настройку и управление." },
      { q: "Реклама обязательна для SEO?", a: "Нет. Она может дополнять SEO и быстрее проверять спрос, но решение зависит от задачи и бюджета." },
      { q: "Можно заказать аудит рекламы?", a: "Да. Изучим структуру, цели и посадочные страницы и отдельно оценим дальнейшую работу." },
    ],
  },
};

const en: Record<string, RawServiceContent> = {
  "seo-audit": { ...ru["seo-audit"], eyebrow: "SEO audit", title: "We check the website and prepare a work list", lead: "You receive page examples, priorities and a clear way to verify each fix.", problem: "A website may work for visitors while remaining confusing for search engines: essential pages can be blocked, near-duplicates compete and templates create repeated signals.", fit: ["Your website is missing from search", "Existing reports do not explain what was actually done", "A redesign or migration is planned", "You need an independent baseline before SEO"], work: ["Check whether search engines can reach and index important pages", "Review robots.txt, sitemaps and canonical signals", "Inspect titles, descriptions, headings, duplicates and internal links", "Assess mobile performance, structured data, forms and baseline security headers"], deliverables: ["Executive summary", "Evidence-based issue register", "Prioritized remediation plan", "Developer specification", "Results call"], duration: "From 2 business days for a short audit to 7–10 days for an audit with a plan.", exclusions: ["Private systems without agreed access", "Implementation when an audit-only package is chosen", "Active vulnerability scanning", "Ranking or sales guarantees"], outcomes: ["Issue list", "Affected page examples", "Prioritised tasks", "Checks for completed fixes"], packages: [
    { name: "Automated check", priceKey: "audit-preliminary", description: "An overall score and the main issue groups.", limit: "Automatically checks up to 10 public pages", features: ["Public pages", "Overall score", "Main issue groups", "Shareable result"] },
    { name: "Short audit", priceKey: "audit-express", description: "The main problems and the order to fix them.", limit: "Up to 30 pages · 2 business days", features: ["Up to 10 key problems", "Short report", "Order of work", "30-minute call"] },
    { name: "Full audit", priceKey: "audit-full", description: "Technical, template and performance review.", limit: "Up to 200 pages · 5 business days", features: ["Page crawl", "Template review", "Laboratory performance test", "Task list"], featured: true },
    { name: "Audit + plan", priceKey: "audit-strategy", description: "Full audit plus a practical three-month plan.", limit: "Up to 500 pages · 7–10 business days", features: ["Search demand", "Competitors", "New pages", "Three-month plan"] },
    { name: "Audit + fixes", priceKey: "audit-implementation", description: "Review, agreed fixes and a second check.", limit: "Audit + up to 12 hours of fixes", features: ["Backup", "Up to 12 hours of fixes", "Change list", "Second check"] },
  ], faq: [{ q: "Does the free check replace a full audit?", a: "No. It reviews public signals and risk areas. A full audit includes evidence, exact URLs, access-based checks and an implementation plan." }, { q: "Can you implement an existing audit?", a: "Yes, after we review its evidence and scope the work." }, { q: "Why does page count matter?", a: "It changes crawl time, template analysis and duplicate review. Larger sites require an individual estimate." }] },
  "seo-promotion": { ...ru["seo-promotion"], eyebrow: "SEO support", title: "Website fixes and useful new pages every month", lead: "The monthly scope says which pages we review, what we fix and which materials we prepare.", problem: "SEO stalls when a supplier works on content or technical issues in isolation. Useful progress needs accessible pages, a clear structure, helpful content and regular fixes.", fit: ["There is proven demand for your services", "You need broader visibility for relevant queries", "Technical and content work needs one owner", "Monthly delivery must be transparent"], work: ["Monitor indexing and technical health", "Map customer queries to the right pages", "Improve existing pages and create new material", "Review competitors, internal links and user journeys", "Document changes and evidence"], deliverables: ["Monthly plan", "Updated pages and content", "Agreed technical implementation", "Plain-language report", "Next-month roadmap"], duration: "A practical horizon is 3–6 months. Technical fixes are verifiable earlier; search impact requires recrawling and data.", exclusions: ["Media budget", "Paid placements", "Large development outside the package", "Guaranteed rankings or leads"], outcomes: ["Fixed pages", "New pages for relevant demand", "List of completed work", "Next-month plan"], packages: [
    { name: "Starter", priceKey: "seo-base", description: "For a small service website in one region.", limit: "1 region · 5 pages · 1 content item", features: ["Website review", "5 priority pages", "1 content item a month", "Up to 3 hours of fixes"] },
    { name: "Growth", priceKey: "seo-growth", description: "For regular page improvements and broader demand.", limit: "Up to 2 regions · 10 pages · 2 content items", features: ["10 priority pages", "2 content items a month", "Up to 6 hours of fixes", "Monthly call"], featured: true },
    { name: "Team", priceKey: "seo-full", description: "For several service lines with ongoing website work.", limit: "Up to 3 regions · 20 pages · 4 content items", features: ["20 priority pages", "4 content items a month", "Up to 10 hours of fixes", "Weekly status"] },
    { name: "Article", priceKey: "content-article", description: "One standalone website article without a monthly retainer.", limit: "Up to 8,000 characters · 1 revision round", features: ["Article outline", "Copy", "Title and description", "Fact-check against client materials"] },
  ], faq: [{ q: "When will we see results?", a: "Implementation can be verified immediately. Rankings and traffic change after search recrawls and depend on the market, so an exact date would be misleading." }, { q: "Do we need Yandex Ads?", a: "Not always. Ads can validate demand quickly, but management and media spend are separate." }, { q: "Who publishes content?", a: "The package states who writes, designs, approves and publishes each asset." }] },
  marketplaces: { ...ru.marketplaces, eyebrow: "Wildberries and Ozon", title: "Product cards people understand and marketplace search can classify", lead: "We combine query research, copy, attributes, visual storytelling and recurring analysis — without keyword stuffing.", problem: "A card loses visibility and trust when the title is overloaded, attributes are incomplete, images fail to answer questions and updates have no measurement plan.", fit: ["A new product is launching", "The card underperforms stronger competitors", "A product range needs a coherent update", "The store needs ongoing support"], work: ["Review search results and competitors", "Map queries naturally", "Write titles, descriptions and attributes", "Design images, infographics, carousels and video", "Track agreed search phrases"], deliverables: ["Query map", "Ready-to-publish copy", "Image and video files in selected scope", "Publishing schedule", "Performance report for retainers"], duration: "From 3 business days for one card. Larger batches follow an agreed calendar.", exclusions: ["Account access without approval", "Automatic editing through this website", "Guaranteed marketplace ranking", "Marketplace ad spend"], outcomes: ["Clearer proposition", "Relevant search language", "Consistent visual packaging", "Controlled update cycle"], packages: [
    { name: "Card review", priceKey: "mp-audit", description: "We review one listing and show what to fix first.", limit: "1 SKU", features: ["Listing and competitors", "Main problems", "Fix list"] },
    { name: "Copy + SEO", priceKey: "mp-optimization", description: "Queries, title, description and product attributes.", limit: "1 SKU · 1 revision round", features: ["Queries", "Title", "Description", "Attributes"] },
    { name: "Card + infographics", priceKey: "mp-turnkey", description: "Copy and up to six frames based on client materials.", limit: "1 SKU · up to 6 frames", features: ["Copy and SEO", "Images", "Infographics", "Frame order"], featured: true },
    { name: "10 cards", priceKey: "mp-pack", description: "Copy and attributes for one product category.", limit: "Up to 10 SKUs · visuals excluded", features: ["One category", "Shared query research", "Copy", "Attributes"] },
    { name: "Store", priceKey: "mp-support", description: "Scheduled listing updates on one marketplace.", limit: "1 marketplace · up to 20 SKUs · 4 updates", features: ["Listing edits", "Publishing plan", "Metric review", "Report"] },
  ], faq: [{ q: "Do you edit cards automatically?", a: "No. This is an agency service, not a SaaS platform. Publishing only follows an agreed process and authorized access." }, { q: "Can we order visuals only?", a: "Yes. Images, infographics and video are estimated from a clear brief." }, { q: "Why is ranking not guaranteed?", a: "Price, stock, ratings, logistics, advertising and platform algorithms all contribute." }] },
  "web-development": { ...ru["web-development"], eyebrow: "Web development", title: "A website ready for advertising and search", lead: "We agree the structure, design key screens, build the mobile version and connect forms and analytics.", problem: "A polished mockup still fails when the website is slow, weak on mobile, missing analytics, difficult to update or unprepared for search.", fit: ["You need a landing page or corporate website", "The current platform restricts your catalogue", "You need commerce, an account or an internal service", "The existing site blocks acquisition"], work: ["Business discovery", "Information architecture and prototype", "Original visual system", "Responsive development, forms and integrations", "Analytics and baseline SEO", "Repository, backups, updates and handover"], deliverables: ["Structure and prototype", "Key-state designs", "Working website and repository", "Forms and analytics", "Handover guide"], duration: "A landing page typically takes 5–7 weeks. Larger websites are estimated after a brief.", exclusions: ["Domain, hosting and paid services", "Content outside the scope", "Unspecified integrations", "Unlimited support"], outcomes: ["Working mobile version", "Connected forms and analytics", "Basic search preparation", "Source files and handover guide"], packages: [
    { name: "Landing page", priceKey: "dev-landing", description: "One page for one service or offer.", limit: "Up to 7 sections · 1 form", features: ["Structure", "Design", "Responsive build", "Analytics and basic SEO"] },
    { name: "Company website", priceKey: "dev-corporate", description: "A clear set of pages for a service business.", limit: "Up to 5 templates · 10 completed pages", features: ["Prototype", "Design", "Development", "Content management"], featured: true },
    { name: "Catalogue or shop", priceKey: "dev-commerce", description: "Catalogue, filters and cart for a product business.", limit: "Up to 100 products · integrations separate", features: ["Catalogue", "Filters", "Cart", "Initial product import"] },
    { name: "Custom system", priceKey: "individual", description: "An account or internal tool scoped after a short brief.", limit: "Scope and schedule after a short brief", features: ["Requirements", "Prototype", "Development", "Support"] },
  ], faq: [{ q: "Which technology do you use?", a: "We select it after discovery and consider support, load and future integrations instead of forcing one CMS." }, { q: "Can we begin with a prototype?", a: "Yes. For complex products, discovery and prototyping can be a separate paid phase." }, { q: "Is SEO included?", a: "Technical foundations are included. Ongoing growth is a separate service." }] },
  "yandex-ads": { ...ru["yandex-ads"], eyebrow: "Yandex Ads", title: "We set up the ads and show where the budget goes", lead: "Queries are separated by intent, goals are checked, and service fees stay separate from media spend.", problem: "Advertising becomes expensive when queries are mixed, pages do not match the message and decisions rely on clicks rather than meaningful actions.", fit: ["Demand needs fast validation", "A new service or region is launching", "Existing campaigns need an independent review", "SEO and paid acquisition need one structure"], work: ["Review pages and goals", "Segment queries", "Create campaigns and messages", "Configure exclusions and measurement", "Optimize for meaningful actions"], deliverables: ["Campaign structure", "Messages and query list", "Configured goals", "Change log", "Report and recommendations"], duration: "Setup usually takes 7–10 business days after access and materials are received.", exclusions: ["Yandex media spend", "Guaranteed lead price", "Unscoped web rebuilds", "Hidden commissions"], outcomes: ["Campaigns separated by service", "Configured goals", "Spend and change list", "Enquiry data"], packages: [
    { name: "Launch", priceKey: "ads-setup", description: "We build and launch ads for one service.", limit: "1 service · 1 region · up to 3 campaigns", features: ["Up to 100 queries", "Ads", "Goals", "Launch"], featured: true },
    { name: "Management", priceKey: "ads-support", description: "Monthly campaign work excluding media spend.", limit: "Up to 5 campaigns · media spend up to 150,000 RUB", features: ["Spend review", "Negative keywords", "Ad edits", "Report"] },
  ], faq: [{ q: "Is media spend included?", a: "No. It is paid to Yandex directly; KILENI fees cover setup and management." }, { q: "Are ads required for SEO?", a: "No. They can validate demand faster, but the decision depends on the task and budget." }, { q: "Can you audit existing campaigns?", a: "Yes. We review structure, goals and landing pages, then scope further work." }] },
};

const serviceEnhancements: Record<Locale, Record<string, Pick<ServiceContent, "diagnosis" | "visual">>> = {
  ru: {
    "seo-audit": {
      diagnosis: ["Сопоставляем карту сайта и реально доступные страницы", "Проверяем шаблоны, индексацию, метаданные и скорость", "Группируем находки по риску и стоимости исправления", "Фиксируем критерий, по которому правку можно принять"],
      visual: { kind: "audit-matrix", label: "Карта проверки", summary: "Из множества сигналов — в короткий порядок исправлений", signals: [{ label: "доступ", value: "HTTP" }, { label: "страницы", value: "INDEX" }, { label: "шаблоны", value: "META" }, { label: "скорость", value: "CWV" }] },
    },
    "seo-promotion": {
      diagnosis: ["Сверяем спрос с текущей структурой сайта", "Находим страницы, которые мешают друг другу", "Отделяем технические задачи от контентных", "Выбираем измеримый объём на ближайший месяц"],
      visual: { kind: "growth-loop", label: "Цикл роста", summary: "Проверка → приоритет → внедрение → повторный замер", signals: [{ label: "спрос", value: "01" }, { label: "страницы", value: "02" }, { label: "изменения", value: "03" }, { label: "контроль", value: "04" }] },
    },
    marketplaces: {
      diagnosis: ["Сравниваем карточку с выдачей и сильными конкурентами", "Разделяем поисковую семантику и аргументы для покупателя", "Проверяем свойства, фото и порядок кадров", "Фиксируем состав материалов до производства"],
      visual: { kind: "card-stack", label: "Система карточки", summary: "Запрос, свойство и визуальный аргумент работают вместе", signals: [{ label: "поиск", value: "QUERY" }, { label: "свойства", value: "DATA" }, { label: "кадры", value: "MEDIA" }, { label: "публикация", value: "LIVE" }] },
    },
    "web-development": {
      diagnosis: ["Определяем бизнес-задачу и главное действие посетителя", "Собираем структуру и состояния до визуального дизайна", "Проверяем ограничения интеграций и контента", "Закладываем мобильную версию, аналитику и поисковую базу"],
      visual: { kind: "build-system", label: "Система сайта", summary: "От задачи — к структуре, интерфейсу и рабочему продукту", signals: [{ label: "задача", value: "BRIEF" }, { label: "структура", value: "FLOW" }, { label: "интерфейс", value: "UI" }, { label: "запуск", value: "SHIP" }] },
    },
    "yandex-ads": {
      diagnosis: ["Проверяем предложение и посадочную страницу", "Разделяем запросы по услугам и намерению", "Настраиваем измеримые целевые действия", "Отделяем плату за работу от рекламного бюджета"],
      visual: { kind: "campaign-funnel", label: "Контур кампании", summary: "Запрос → объявление → страница → измеримое обращение", signals: [{ label: "запрос", value: "Q" }, { label: "объявление", value: "AD" }, { label: "страница", value: "LP" }, { label: "цель", value: "GOAL" }] },
    },
  },
  en: {
    "seo-audit": {
      diagnosis: ["Compare submitted and actually reachable pages", "Review templates, indexation, metadata and performance", "Group evidence by risk and implementation cost", "Define how every completed fix will be verified"],
      visual: { kind: "audit-matrix", label: "Audit map", summary: "Many technical signals become a short order of work", signals: [{ label: "access", value: "HTTP" }, { label: "pages", value: "INDEX" }, { label: "templates", value: "META" }, { label: "speed", value: "CWV" }] },
    },
    "seo-promotion": {
      diagnosis: ["Match search demand to the current site structure", "Find pages competing for the same intent", "Separate technical and content tasks", "Choose a measurable delivery scope for the next month"],
      visual: { kind: "growth-loop", label: "Growth loop", summary: "Review → prioritise → implement → measure again", signals: [{ label: "demand", value: "01" }, { label: "pages", value: "02" }, { label: "changes", value: "03" }, { label: "measure", value: "04" }] },
    },
    marketplaces: {
      diagnosis: ["Compare the listing with search results and strong competitors", "Separate marketplace queries from buyer arguments", "Review attributes, images and frame order", "Agree the exact asset scope before production"],
      visual: { kind: "card-stack", label: "Listing system", summary: "Query, product data and visual proof work together", signals: [{ label: "search", value: "QUERY" }, { label: "attributes", value: "DATA" }, { label: "frames", value: "MEDIA" }, { label: "publish", value: "LIVE" }] },
    },
    "web-development": {
      diagnosis: ["Define the business job and the visitor's primary action", "Map structure and states before visual design", "Confirm integration and content constraints", "Plan mobile delivery, analytics and search foundations"],
      visual: { kind: "build-system", label: "Website system", summary: "From business task to structure, interface and working product", signals: [{ label: "task", value: "BRIEF" }, { label: "structure", value: "FLOW" }, { label: "interface", value: "UI" }, { label: "launch", value: "SHIP" }] },
    },
    "yandex-ads": {
      diagnosis: ["Review the offer and landing page", "Separate queries by service and intent", "Configure measurable conversion actions", "Keep agency fees separate from media spend"],
      visual: { kind: "campaign-funnel", label: "Campaign path", summary: "Query → message → landing page → measured enquiry", signals: [{ label: "query", value: "Q" }, { label: "message", value: "AD" }, { label: "page", value: "LP" }, { label: "goal", value: "GOAL" }] },
    },
  },
};

export const serviceSlugs: string[] = ["seo-audit", "seo-promotion", "web-development", "yandex-ads", "content-materials", "custom-task"];

export function getService(locale: Locale, slug: string): ServiceContent | undefined {
  const extra = additionalServices[locale][slug];
  const content = extra?.content ?? (locale === "ru" ? ru : en)[slug];
  const enhancement = extra ?? serviceEnhancements[locale][slug];
  if (!content || !enhancement) return undefined;
  const packages = slug === "yandex-ads" && content.packages.length < 3
    ? [...content.packages, locale === "ru"
      ? { name: "Аудит кампаний", priceKey: "individual", description: "Проверим структуру, цели и посадочные страницы.", limit: "Объём после короткого брифа", features: ["Структура", "Цели", "Запросы", "Список правок"] }
      : { name: "Campaign audit", priceKey: "individual", description: "Review campaign structure, goals and landing pages.", limit: "Scope confirmed after a short brief", features: ["Structure", "Goals", "Queries", "Fix list"] }]
    : content.packages;
  return {
    ...content,
    ...enhancement,
    packages,
    buyerQuestions: buildBuyerQuestions(locale, { ...content, packages, diagnosis: enhancement.diagnosis }),
  };
}

function buildBuyerQuestions(
  locale: Locale,
  service: RawServiceContent & Pick<ServiceContent, "diagnosis">,
): ServiceContent["buyerQuestions"] {
  const ruLocale = locale === "ru";
  const packagePrices = service.packages.map((item) => {
    const price = priceLabel(item.priceKey, locale);
    const note = price.note ? ` ${price.note}` : "";
    return `${item.name} — ${price.current}${note} (${item.limit})`;
  }).join("; ");
  const answers = [
    service.problem,
    service.diagnosis.join("; "),
    service.work.join("; "),
    service.deliverables.join("; "),
    ruLocale
      ? `Принимаем результат по заранее согласованным критериям: ${service.outcomes.join("; ")}.`
      : `Accept the result against the criteria agreed upfront: ${service.outcomes.join("; ")}.`,
    service.duration,
    packagePrices,
    service.exclusions.join("; "),
    service.packages.map((item) => `${item.name}: ${item.description}`).join(" "),
    ruLocale
      ? `До старта фиксируем исходное состояние, состав, срок, цену и критерии приёмки. По этой услуге передаём: ${service.deliverables.slice(0, 3).join("; ")}.`
      : `Before starting, we record the baseline, scope, timing, price and acceptance criteria. For this service, the handover includes: ${service.deliverables.slice(0, 3).join("; ")}.`,
    ruLocale
      ? `Заполните короткий бриф по направлению «${service.eyebrow}». Если вариант неясен, отметьте «не уверен» — начнём с границ задачи.`
      : `Complete the short brief for “${service.eyebrow}”. If the option is unclear, choose “Not sure” and we will start by defining the task boundaries.`,
  ];
  const questions = ruLocale
    ? ["Что у меня сейчас не так?", "Как KILENI это проверит?", "Что конкретно будет сделано?", "Что я получу?", "Как я приму результат?", "Какой срок?", "Какая цена?", "Что не входит?", "Почему выбрать этот вариант?", "Почему KILENI?", "Что делать дальше?"]
    : ["What is wrong right now?", "How will KILENI check it?", "What exactly will be done?", "What will I receive?", "How do I accept the result?", "How long will it take?", "What does it cost?", "What is not included?", "Why choose this option?", "Why KILENI?", "What happens next?"];
  return questions.map((question, index) => ({ question, answer: answers[index] }));
}
