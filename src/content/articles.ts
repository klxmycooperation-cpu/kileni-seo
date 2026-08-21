import type { Locale } from "../config/site";
import { additionalEnArticles, additionalRuArticles } from "./articles-expansion";

export type ArticleCallout = { title: string; text: string; tone?: "note" | "warning" | "action" };
export type ArticleDefinition = { term: string; definition: string };
export type ArticleComparison = {
  columns: [string, string, string];
  rows: Array<{ label: string; left: string; right: string }>;
};
export type ArticleSection = {
  id: string;
  heading: string;
  paragraphs: string[];
  bullets?: string[];
  callout?: ArticleCallout;
  definitions?: ArticleDefinition[];
  comparison?: ArticleComparison;
};
export type Article = {
  slug: string;
  title: string;
  description: string;
  readerOutcome: string;
  date: "2026-08-15";
  author: "KILENI";
  readingMinutes: number;
  searchIntent: { label: string; primaryQuery: string; relatedQueries: string[] };
  hero: {
    src: string;
    alt: string;
    credit: string;
    sourceUrl?: string;
    license: string;
    licenseUrl?: string;
  };
  toc: Array<{ id: string; title: string }>;
  sections: ArticleSection[];
  faq: Array<{ question: string; answer: string }>;
  cta: { title: string; text: string; label: string; href: string };
  related: string[];
  sources: Array<{ title: string; url: string }>;
};

const covers = {
  audit: [
    "/editorial/seo-audit-system.svg",
    "KILENI",
    "",
    "Схема SEO-аудита: страницы, проверки и подтверждённый результат",
    "SEO audit map: pages, checks and confirmed outcomes",
  ],
  indexing: [
    "/editorial/search-indexing-gates.svg",
    "KILENI",
    "",
    "Схема прохождения страницы от обхода до индексации",
    "A page moving through crawling and indexing gates",
  ],
  channels: [
    "/editorial/seo-ads-dual-engine.svg",
    "KILENI",
    "",
    "Сравнение SEO и рекламы как двух разных каналов привлечения",
    "SEO and paid advertising shown as two acquisition systems",
  ],
  marketplace: [
    "/editorial/marketplace-card-layers.svg",
    "KILENI",
    "",
    "Слои карточки товара: запрос, характеристики, текст и медиа",
    "Product card layers: query, attributes, copy and media",
  ],
} as const;

function hero(key: keyof typeof covers, locale: Locale): Article["hero"] {
  const [src, creator, sourceUrl, ruAlt, enAlt] = covers[key];
  return {
    src,
    alt: locale === "ru" ? ruAlt : enAlt,
    credit: locale === "ru" ? `Иллюстрация: ${creator}` : `Illustration: ${creator}`,
    sourceUrl: sourceUrl || undefined,
    license: locale === "ru" ? "Оригинальная иллюстрация KILENI" : "Original KILENI illustration",
  };
}

const baseRu: Article[] = [
  {
    slug: "seo-audit-when-you-need-it",
    title: "SEO-аудит сайта: когда нужен и что должен дать",
    description: "Проверяем не число ошибок в отчёте, а решения, которые можно оценить, внедрить и принять.",
    readerOutcome: "Поймёте, когда заказывать аудит, что запросить у исполнителя и как принять результат.",
    date: "2026-08-15",
    author: "KILENI",
    readingMinutes: 8,
    searchIntent: {
      label: "Проверка сайта",
      primaryQuery: "SEO-аудит сайта",
      relatedQueries: ["что входит в SEO-аудит сайта", "технический SEO-аудит", "SEO-аудит сайта цена", "заказать SEO-аудит", "бесплатный SEO-аудит сайта"],
    },
    hero: hero("audit", "ru"),
    toc: [
      { id: "result", title: "Какой результат должен дать аудит" },
      { id: "when", title: "Когда аудит оправдан" },
      { id: "evidence", title: "Что показали два проекта" },
      { id: "acceptance", title: "Как принять работу" },
    ],
    sections: [
      {
        id: "result",
        heading: "Аудит нужен ради решений, а не списка ошибок",
        paragraphs: [
          "SEO-аудит сайта должен отвечать на три вопроса: что мешает важным страницам работать в поиске, какие изменения нужны и как проверить их после публикации. Выгрузка сканера с сотнями предупреждений этого не делает. В рабочем документе каждое существенное замечание связано с URL, причиной, масштабом, приоритетом и ожидаемым состоянием после исправления.",
          "Начинают с маршрута страницы: робот должен обнаружить адрес, получить стабильный ответ, увидеть основной контент и понять, какая версия каноническая. Затем проверяют соответствие запросу и пользовательскому сценарию. Цвет кнопки или длина title не должны получать высокий приоритет, пока раздел закрыт от обхода, отдаёт 5xx или теряет контент после загрузки JavaScript.",
          "Отчёт разделяет факт, гипотезу и рекомендацию. Факт можно повторить на конкретном URL. Гипотеза объясняет возможное влияние. Рекомендация задаёт действие и критерий приёмки. Такая структура позволяет разработчику оценить работу, а владельцу — понять, за какой проверяемый результат он платит.",
        ],
        callout: { title: "Минимальный полезный результат", text: "Резюме, таблица задач с примерами URL, порядок внедрения и повторная проверка тех же условий после релиза.", tone: "note" },
      },
      {
        id: "when",
        heading: "Когда аудит оправдан",
        paragraphs: [
          "Аудит полезен перед миграцией, сменой CMS, редизайном или запуском большого раздела. Он фиксирует контрольные URL и правила переноса до релиза, а после проверяет ответы сервера, редиректы, robots.txt, sitemap, canonical, внутренние ссылки и отображение содержания. Это дешевле, чем восстанавливать причину после потери видимости.",
          "Второй сценарий — важные страницы не индексируются или трафик изменился, а команда не может назвать подтверждённую причину. Нужны данные Search Console, Яндекс Вебмастера, аналитики и обхода. Если сайт только опубликован, состоит из нескольких страниц и системных сигналов нет, сначала достаточно бесплатной проверки основных URL и настройки измерения.",
          "Формат выбирают по решению. Экспресс-проверка подтверждает один симптом; полный аудит охватывает шаблоны и данные; аудит с внедрением добавляет публикацию и контроль. Сравнивать их только по цене нельзя: до оплаты должны быть видны границы, материалы и ответственный за следующий шаг.",
        ],
      },
      {
        id: "evidence",
        heading: "Что показали два проекта KILENI",
        paragraphs: [
          "На eco-santeh.ru после исправления шаблонов мы повторно обошли финальный список: 509/509 страниц открылись без ошибки, а в контрольной выгрузке не осталось пропусков основных тегов и точных дублей метаданных. Мобильный лабораторный Lighthouse изменился с 36 → 57. Это результат конкретного теста, а не обещание позиции или продаж.",
          "На засорсервис.рф главный экран заметно сдвигался при загрузке. После исправления CLS в двух контрольных тестах изменился с 0,519 → 0,0001. Повторный обход подтвердил, что 575/575 URL из финального sitemap открываются. В обоих случаях доказательство строилось одинаково: зафиксировать состояние, изменить шаблон и повторить тот же тест.",
          "Эти цифры нельзя переносить на другой сайт как прогноз. Они показывают стандарт: исполнитель называет метод, выборку и ограничение измерения. Процент роста без периода, источника и исходного значения клиент проверить не сможет.",
        ],
      },
      {
        id: "acceptance",
        heading: "Как принять аудит и перейти к внедрению",
        paragraphs: [
          "Попросите показать список шаблонов, примеры URL, доказательство каждого критичного вывода, порядок работ и критерий готовности. Формулировка «исправить дубли» слишком общая. Задачу «убрать параметрические URL из sitemap, поставить canonical на чистый адрес и повторно проверить десять примеров» уже можно оценить и принять.",
          "Сначала исправляют блокировки обхода и массовые ошибки шаблонов, затем локальные проблемы страниц. Изменения выпускают небольшими пакетами и после каждого повторяют обход, ручную проверку контрольных URL и пользовательский сценарий. Индексация требует времени, но техническую корректность можно подтвердить сразу после релиза.",
          "Стоимость сравнивают вместе с объёмом: число шаблонов и URL, доступ к панелям, ручная проверка JavaScript, техническое задание, внедрение и повторный контроль. Дешёвая выгрузка и аудит с внедрением — разные продукты. Клиент должен заранее видеть, какой результат останется у него.",
        ],
        callout: { title: "Правило приёмки", text: "Не принимайте формулировку, которую нельзя проверить на конкретном URL до и после изменения.", tone: "action" },
      },
    ],
    faq: [
      { question: "Гарантирует ли аудит рост позиций?", answer: "Нет. Он подтверждает препятствия и качество исправлений; позиции также зависят от спроса, содержания, конкурентов и поисковой системы." },
      { question: "Можно ли начать бесплатно?", answer: "Да. Бесплатная проверка подтверждает основные симптомы и показывает, оправдан ли полный аудит, но не охватывает все шаблоны и закрытые данные." },
      { question: "Нужен ли аудит каждый год?", answer: "Фиксированного срока нет. Он нужен после существенных релизов, миграции, нового симптома или роста числа шаблонов." },
    ],
    cta: { title: "Начните с контрольных URL", text: "Покажем подтверждённые проблемы и объясним объём до платной работы.", label: "Проверить сайт", href: "/free-audit" },
    related: ["why-website-is-not-in-search", "seo-vs-yandex-ads"],
    sources: [
      { title: "Google Search Central: Do you need an SEO?", url: "https://developers.google.com/search/docs/fundamentals/do-i-need-seo" },
      { title: "Google Search Central: Helpful content", url: "https://developers.google.com/search/docs/fundamentals/creating-helpful-content" },
      { title: "Яндекс Вебмастер: Анализ индексирования", url: "https://yandex.ru/support/webmaster/ru/site-indexing/page-indexing-analysis" },
    ],
  },
  {
    slug: "wildberries-ozon-product-card",
    title: "Как оформить карточку товара на Wildberries и Ozon",
    description: "Название, характеристики, описание и фото — в порядке, который помогает покупателю выбрать.",
    readerOutcome: "Соберёте карточку из проверяемых фактов и увидите, что нельзя переносить между площадками вслепую.",
    date: "2026-08-15",
    author: "KILENI",
    readingMinutes: 8,
    searchIntent: {
      label: "Маркетплейсы",
      primaryQuery: "как оформить карточку товара",
      relatedQueries: ["как оформить карточку товара Wildberries", "как создать карточку товара Ozon", "описание карточки товара пример", "название карточки товара", "SEO карточки товара маркетплейс"],
    },
    hero: hero("marketplace", "ru"),
    toc: [
      { id: "record", title: "Сначала паспорт товара" },
      { id: "fields", title: "Категория, название и характеристики" },
      { id: "media", title: "Описание и фотографии" },
      { id: "iteration", title: "Проверка и обновление" },
    ],
    sections: [
      {
        id: "record",
        heading: "Начните не с текста, а с фактов",
        paragraphs: [
          "Чтобы понять, как оформить карточку товара, сначала соберите паспорт продукта: точное название, модель, состав, размеры, совместимость, комплект, ограничения, документы и условия использования. Эти данные должны совпадать на упаковке, в характеристиках, описании и изображениях. Красивый текст не компенсирует неверный размер или отсутствующую комплектацию.",
          "Затем соберите язык покупателей из аналитики площадки, вопросов, отзывов и авторизованного Вордстата с выбранным регионом и периодом. Разделите формулировки по намерению: тип товара, задача, характеристика, совместимость и сценарий. Частотность нельзя переносить из чужой таблицы без даты и настроек, а нерелевантные популярные слова нельзя добавлять ради охвата.",
          "Сопоставьте каждый кластер с подтверждённым свойством. Если запрос нельзя доказать характеристикой, документом или фотографией, он не должен превращаться в обещание. Такой фильтр защищает карточку от переспама, претензий покупателя и противоречий между полями.",
        ],
        callout: { title: "Источник правды", text: "Одна таблица фактов: значение, единица измерения, подтверждение и поле карточки, где оно используется.", tone: "note" },
      },
      {
        id: "fields",
        heading: "Категория и характеристики важнее длинного описания",
        paragraphs: [
          "Выберите точную категорию: от неё зависят характеристики, фильтры и ожидания покупателя. Заполните обязательные и значимые поля конкретными значениями. Цвет, размер, материал, объём и совместимость должны находиться в предназначенных атрибутах, чтобы пользователь мог отфильтровать товар и сравнить его с альтернативами.",
          "Название быстро идентифицирует товар. Укажите тип, бренд или модель и одну-две отличительные характеристики, если правила площадки это допускают. Не повторяйте синонимы, не добавляйте чужие бренды и не заполняйте заголовок поисковыми хвостами. Конструкция должна читаться человеком целиком на мобильном экране.",
          "Wildberries и Ozon по-разному задают категории, поля и медиатребования. Храните единый паспорт продукта, но собирайте карточку под текущие правила каждой площадки. Перед загрузкой сверяйтесь с официальной инструкцией продавца: интерфейс меняется быстрее универсальных статей.",
        ],
        bullets: ["точная категория", "заполненные характеристики", "название без повторов", "согласованные варианты", "одинаковые факты во всех полях"],
      },
      {
        id: "media",
        heading: "Описание объясняет выбор, фотографии его доказывают",
        paragraphs: [
          "Описание отвечает на вопросы, которые не помещаются в характеристиках: кому подходит товар, как использовать, что входит в комплект и какое ограничение важно до покупки. Первый абзац должен дать суть без вступления. Далее используйте короткие блоки по сценариям и не повторяйте один набор слов в каждом предложении.",
          "Главная фотография ясно показывает товар, а серия — масштаб, детали, комплект, текстуру и использование. Инфографика помогает сравнить размер или показать порядок действий, но не должна закрывать продукт и дублировать текст. Доказательство полезнее абстрактного значка: покажите разъём, шкалу, шов или упаковку крупно.",
          "Проверяйте карточку на небольшом экране: видны ли ключевое отличие, цена, вариант и следующий важный кадр без увеличения. Не подменяйте реальную съёмку одинаковыми рендерами, если покупателю важны материал, цвет или масштаб.",
        ],
      },
      {
        id: "iteration",
        heading: "Меняйте по одной гипотезе и фиксируйте результат",
        paragraphs: [
          "Перед публикацией проверьте карточку как покупатель: соответствует ли вариант фотографии, совпадает ли комплект, понятны ли сроки и ограничения, нет ли противоречий в единицах. После публикации наблюдайте показы, переходы, корзину, заказы, возвраты, вопросы и отзывы. Один показатель не объясняет весь путь.",
          "Если карточку видят, но редко открывают, проверяйте категорию, главную фотографию, название и цену. Если открывают, но не покупают, изучайте доказательства, варианты, доставку и доверие. Если растут возвраты, проблема может быть в ожидании, даже когда конверсия высокая. Не меняйте название, фото и цену одновременно.",
          "Ведите журнал версий: дата, изменённый элемент, гипотеза, период оценки и наблюдение. Он предотвращает переписывание по вкусу и показывает клиенту, за какую работу он платит. Обещать можно корректность данных, соблюдение требований и прозрачный тест; конкретную позицию или число продаж — нельзя.",
        ],
        callout: { title: "Порядок улучшения", text: "Факты → категория → характеристики → название → фото → описание → один измеримый тест.", tone: "action" },
      },
    ],
    faq: [
      { question: "Сколько ключевых слов нужно?", answer: "Фиксированного числа нет. Используйте релевантные формулировки, которые соответствуют товару и помогают заполнить поле или понятное описание." },
      { question: "Можно ли копировать карточку между площадками?", answer: "Паспорт товара переиспользуют, но категорию, поля, название и медиа адаптируют под требования Wildberries и Ozon." },
      { question: "Можно ли гарантировать рост продаж?", answer: "Нет. На продажи также влияют цена, наличие, доставка, рейтинг, реклама и конкуренты. Можно гарантировать точность и проверку изменений." },
    ],
    cta: { title: "Соберём карточку из доказуемых преимуществ", text: "Подготовим паспорт товара, тексты и план реальных фотографий.", label: "Обсудить карточки", href: "/marketplaces" },
    related: ["seo-vs-yandex-ads", "seo-audit-when-you-need-it"],
    sources: [
      { title: "Wildberries: Как оптимизировать карточку", url: "https://seller.wildberries.ru/instructions/ru/ru/material/how-to-optimize-the-product-profile" },
      { title: "Wildberries: Как создать карточку", url: "https://seller.wildberries.ru/instructions/ru/ru/material/how-to-create-card" },
      { title: "Ozon: Управление товарами", url: "https://docs.ozon.com/global/ozon-seller-app/product-management/" },
      { title: "Яндекс Вордстат: операторы", url: "https://yandex.ru/support2/wordstat/ru/content/operators" },
    ],
  },
  {
    slug: "why-website-is-not-in-search",
    title: "Почему сайт не индексируется: проверка по шагам",
    description: "Отделяем проблему сервера, запрет индексации и неверные ожидания по запросу.",
    readerOutcome: "Получите порядок проверки одного URL — от HTTP-ответа до выбранной поиском версии.",
    date: "2026-08-15",
    author: "KILENI",
    readingMinutes: 8,
    searchIntent: {
      label: "Индексация",
      primaryQuery: "почему сайт не индексируется",
      relatedQueries: ["сайт не индексируется в Яндексе", "сайт не отображается в поиске", "как проверить индексацию сайта", "страница не попадает в индекс Google", "robots.txt закрывает сайт"],
    },
    hero: hero("indexing", "ru"),
    toc: [
      { id: "define", title: "Что именно не индексируется" },
      { id: "route", title: "Порядок технической проверки" },
      { id: "system", title: "Как найти системную причину" },
      { id: "after", title: "Что делать после исправления" },
    ],
    sections: [
      {
        id: "define",
        heading: "Сначала уточните симптом",
        paragraphs: [
          "Запрос «почему сайт не индексируется» часто объединяет три ситуации. Поисковая система может не знать URL, знать его, но исключить из индекса, либо индексировать страницу, но не показывать по выбранной фразе. Проверять домен одним оператором site: недостаточно: главная может быть в поиске, пока карточки закрыты шаблонным noindex.",
          "Возьмите один канонический URL проблемного типа. Проверьте его в Google Search Console и Яндекс Вебмастере: известен ли адрес, разрешён ли обход, какой canonical выбрала система и какую причину исключения сообщает. Затем откройте страницу без авторизации на мобильном и десктопе. Так жалоба превращается в повторяемый диагноз.",
          "Индексирование не равно позиции. Если панели подтверждают включение URL, следующий вопрос — отвечает ли страница запросу, соответствует ли региону и содержит ли самостоятельную ценность. Повторение ключевой фразы не исправит техническую блокировку и не сделает слабую страницу полезнее.",
        ],
        definitions: [
          { term: "Обход", definition: "Робот обнаруживает URL и загружает ответ сервера." },
          { term: "Индексирование", definition: "Система обрабатывает страницу и решает, хранить ли её как возможный результат." },
          { term: "Ранжирование", definition: "Индексированные документы выбираются для конкретного запроса и контекста." },
        ],
      },
      {
        id: "route",
        heading: "Проверьте технический маршрут в одном порядке",
        paragraphs: [
          "Сначала сервер: целевая страница стабильно отвечает 200, перенесённая — одним постоянным редиректом, удалённая — 404 или 410. Тайм-ауты, 5xx, неверный сертификат и защита CDN способны мешать роботу, даже когда страница открывается владельцу из сохранённой сессии. Отдельно проверьте мягкую 404: ответ 200 с пустым содержанием или сообщением об отсутствии товара.",
          "Затем правила доступа и выбора версии. Robots.txt управляет обходом пути, meta robots и X-Robots-Tag — индексированием доступного ответа. Если закрыть страницу в robots.txt, робот может не увидеть размещённый внутри noindex. Canonical, sitemap, редиректы и внутренние ссылки должны указывать на одну основную версию.",
          "Для JavaScript-сайта сравните исходный и отрисованный HTML. Заголовок, текст, ссылки и статус товара должны появляться без клика и прокрутки. Проверьте заблокированные скрипты, ошибки браузера и пустой контейнер до ответа API. Если технический путь чист, оценивайте дубли, качество и соответствие поисковому намерению.",
        ],
        bullets: ["HTTP-ответ и редиректы", "robots.txt и noindex", "canonical, sitemap и внутренние ссылки", "отрисованный основной контент", "дубли и соответствие запросу"],
      },
      {
        id: "system",
        heading: "От одного URL переходите к шаблону",
        paragraphs: [
          "После подтверждения причины проверьте соседние страницы того же типа. Если один noindex, canonical или пустой блок повторяется во всей выборке, исправлять нужно шаблон, а не записи CMS. Разные симптомы разделяйте: массовая проблема фильтра не должна смешиваться с единично удалённой карточкой.",
          "KILENI использует повторный обход как доказательство реализации. На eco-santeh.ru финальная проверка дала 509/509 успешных ответов, отсутствие пропусков основных тегов в контрольной выгрузке и Lighthouse 36 → 57. На засорсервис.рф 575/575 URL открылись, а CLS в двух тестах изменился с 0,519 → 0,0001. Это не прогноз индексации.",
          "Сохраняйте метод и дату измерения. В отчёте должны остаться исходный ответ, исправленный ответ, выборка URL и ограничение теста. Для индексации дополнительно фиксируйте статус в панелях вебмастеров: успешный обход собственного сканера не доказывает включение страницы поисковой системой.",
        ],
      },
      {
        id: "after",
        heading: "Исправьте причину, затем запросите переобход",
        paragraphs: [
          "Не меняйте robots.txt, canonical и sitemap одновременно наугад. Исправьте подтверждённую первопричину, разверните изменение на контрольной группе и повторите тот же тест. Если результат стабилен, распространите исправление на шаблон. Такой выпуск проще принять и откатить, чем пакет несвязанных настроек.",
          "После релиза отправьте приоритетные URL на переобход через официальные инструменты и наблюдайте отчёты. Повторная отправка не гарантирует немедленного индексирования. Системе нужно заново загрузить и обработать документ; срок зависит от сайта и изменения. Техническую готовность подтверждают сразу, поисковый результат — после обработки.",
          "Если URL уже индексирован, вернитесь к намерению. Сравните страницу с тем, что человек ожидает по запросу: услугу, инструкцию, категорию или карточку. Уточните регион, наличие, цену, доказательства и следующий шаг. Не расширяйте текст ради объёма — добавляйте факты, которые помогают выбрать или выполнить действие.",
        ],
        callout: { title: "Короткое правило", text: "Сначала живой URL и согласованные сигналы, затем переобход, после — наблюдение индексации и показов.", tone: "action" },
      },
    ],
    faq: [
      { question: "Сколько ждать индексации?", answer: "Единого срока нет. Обеспечьте внутренние ссылки, корректный sitemap и доступный ответ, затем наблюдайте URL в панелях вебмастеров." },
      { question: "Почему URL есть в sitemap, но нет в индексе?", answer: "Sitemap сообщает о предпочтительном адресе, но не гарантирует включение. Проверьте ответ, доступ, noindex, canonical, рендеринг, дубли и ценность страницы." },
      { question: "Поможет ли больше ключевых слов?", answer: "Нет при технической блокировке. После проверки пишите естественно под задачу пользователя, а не под плотность фраз." },
    ],
    cta: { title: "Найдём причину на конкретных URL", text: "Проверим путь страницы и дадим задачу с понятной приёмкой.", label: "Заказать проверку", href: "/seo-audit" },
    related: ["seo-audit-when-you-need-it", "seo-vs-yandex-ads"],
    sources: [
      { title: "Google Search Central: Crawling and indexing", url: "https://developers.google.com/search/docs/crawling-indexing" },
      { title: "Google Search Central: Block indexing with noindex", url: "https://developers.google.com/search/docs/crawling-indexing/block-indexing" },
      { title: "Google Search Central: JavaScript search problems", url: "https://developers.google.com/search/docs/crawling-indexing/javascript/fix-search-javascript" },
      { title: "Яндекс Вебмастер: Доступность сайта", url: "https://yandex.ru/support/webmaster/ru/robot-workings/availability" },
    ],
  },
  {
    slug: "seo-vs-yandex-ads",
    title: "SEO или контекстная реклама: что выбрать бизнесу",
    description: "Выбор по сроку, спросу, готовности сайта и стоимости квалифицированной заявки.",
    readerOutcome: "Сопоставите задачу бизнеса с каналом и соберёте план первого теста без двойного бюджета.",
    date: "2026-08-15",
    author: "KILENI",
    readingMinutes: 8,
    searchIntent: {
      label: "Выбор канала",
      primaryQuery: "SEO или контекстная реклама",
      relatedQueries: ["что лучше SEO или контекстная реклама", "SEO или Яндекс Реклама", "SEO продвижение или реклама", "когда выбирать SEO", "как сравнить SEO и рекламу"],
    },
    hero: hero("channels", "ru"),
    toc: [
      { id: "difference", title: "Что делает каждый канал" },
      { id: "choice", title: "Как выбрать первый канал" },
      { id: "economics", title: "Как сравнить экономику" },
      { id: "together", title: "Когда запускать вместе" },
    ],
    sections: [
      {
        id: "difference",
        heading: "Каналы решают разные задачи",
        paragraphs: [
          "Вопрос «SEO или контекстная реклама» нельзя решить сравнением цены клика. Яндекс Реклама покупает управляемый показ и быстро даёт данные о спросе, объявлении и посадочной странице. SEO улучшает сайт: структуру, страницы, внутренние связи, доступность и содержание. Эффект накапливается медленнее, зато выполненная работа остаётся после остановки медиабюджета.",
          "Реклама не исправит страницу, где непонятно предложение, сломана форма или отсутствует цена. SEO не даст мгновенный поток заявок на новый продукт, если спрос ещё не подтверждён. До выбора проверьте четыре ограничения: когда нужен результат, стабилен ли спрос, готова ли посадочная и сколько компания может платить за квалифицированное обращение.",
          "Фразы группируют по намерению: заказать, сравнить, узнать цену или решить проблему самостоятельно. Вордстат показывает динамику, регионы и топы запросов авторизованному пользователю; результат зависит от периода, региона, устройства и операторов. Список без этих настроек и даты нельзя выдавать за точный прогноз рынка.",
        ],
      },
      {
        id: "choice",
        heading: "Выберите первый канал по главному ограничению",
        paragraphs: [
          "Начните с рекламы, если предложение новое, заявки нужны в ближайшие недели и есть бюджет на тест. Ограничьте географию и одну услугу, подготовьте отдельную страницу и определите целевое действие. Первый запуск нужен, чтобы проверить язык спроса, качество обращений и слабые места страницы, а не масштабироваться любой ценой.",
          "Начните с SEO, если люди системно ищут категории и услуги, сайт может содержать отдельные полезные страницы, а бизнес готов работать несколько месяцев. Это подходит каталогу, региональной сети и повторяющимся услугам. Сначала устраните блокировки индексации и выберите небольшой кластер вместо попытки оптимизировать весь домен.",
          "Если посадочная не готова, первым вложением должно стать исправление сценария. Проверьте заголовок, цену или принцип расчёта, доказательства, сроки, ограничения и форму. Оба канала усиливают существующее предложение, но не заменяют ясную упаковку услуги.",
        ],
        comparison: {
          columns: ["Ситуация", "Первый шаг", "Почему"],
          rows: [
            { label: "Новый спрос", left: "Ограниченный рекламный тест", right: "Быстро проверяет запрос и предложение" },
            { label: "Стабильная категория", left: "SEO-кластер страниц", right: "Создаёт долгосрочный поисковый актив" },
            { label: "Слабая посадочная", left: "Исправить страницу", right: "Иначе оба канала теряют обращения" },
          ],
        },
      },
      {
        id: "economics",
        heading: "Сравнивайте стоимость результата, а не трафика",
        paragraphs: [
          "Для рекламы считайте расход, клики, обращения, квалифицированные обращения и продажи. Для SEO учитывайте аудит, разработку, содержание, сопровождение и время команды. Сведите оба канала к одному событию, например оплаченному заказу, и используйте одинаковое окно атрибуции. Иначе дешёвый клик будет спорить с дорогой, но ценной заявкой.",
          "Отдельно считайте стоимость обучения. Рекламный тест показывает, какие запросы приводят нецелевые обращения и какое обещание повышает конверсию. SEO-данные показывают, какие страницы получают показы и где спрос шире рекламной группы. Эти выводы полезны, даже если канал пока не масштабируют.",
          "Не прогнозируйте SEO как фиксированную стоимость позиции и не оценивайте рекламу по чужой цене клика. Конкуренция, регион, сезон, аккаунт и сайт меняют результат. Зафиксируйте исходные данные, бюджет теста и правило остановки до запуска.",
        ],
      },
      {
        id: "together",
        heading: "Совмещайте каналы после первого измеренного цикла",
        paragraphs: [
          "Совместный запуск полезен, когда у каждого канала своя роль. Реклама проверяет коммерческие формулировки и поддерживает приоритетные запросы сейчас. SEO создаёт страницы устойчивого спроса, исправляет технические ограничения и отвечает на вопросы до покупки. Данные рекламы помогают выбрать темы, но запросы нельзя автоматически копировать в текст.",
          "Начните с одной услуги и региона. Соберите карту намерений, подготовьте страницу, настройте цели, запустите ограниченную кампанию и параллельно проверьте индексирование. Через согласованный период оцените качество обращений, затем решите, что масштабировать, переписать и выделить в отдельную страницу.",
          "Клиент должен заранее видеть состав работ: какие страницы появятся, какие кампании и цели настроят, кто готовит материалы и когда принимаются решения. Это превращает «продвижение» из бесконечной услуги в последовательность проверяемых этапов с понятной ценой.",
        ],
        callout: { title: "Рабочая схема", text: "Одна услуга → одна посадочная → измерение обращения → рекламный тест → SEO-страницы по подтверждённому спросу.", tone: "action" },
      },
    ],
    faq: [
      { question: "Что даст заявки быстрее?", answer: "Обычно реклама запускается быстрее, но только готовая страница и измерение показывают окупаемость. SEO требует времени на создание и обработку страниц." },
      { question: "Можно ли выключить рекламу после роста SEO?", answer: "Можно перераспределить бюджет после сравнения продаж и маржи. Реклама останется полезной для сезонности, тестов и приоритетных запросов." },
      { question: "Нужно ли переносить рекламные ключи в SEO-текст?", answer: "Нет. Их группируют по намерению и пишут для задачи пользователя, а не повторяют механически." },
    ],
    cta: { title: "Определим первый измеримый этап", text: "Сопоставим спрос, сайт, срок и бюджет — затем назовём состав работ.", label: "Заполнить бриф", href: "/brief" },
    related: ["seo-audit-when-you-need-it", "wildberries-ozon-product-card"],
    sources: [
      { title: "Яндекс Вордстат: интерфейс и данные", url: "https://yandex.ru/support2/wordstat/ru/interface/new" },
      { title: "Яндекс Вордстат: операторы запросов", url: "https://yandex.ru/support2/wordstat/ru/content/operators" },
      { title: "Google Search Central: SEO Starter Guide", url: "https://developers.google.com/search/docs/fundamentals/seo-starter-guide" },
    ],
  },
];

const ru: Article[] = [...baseRu, ...additionalRuArticles];

const baseEn: Article[] = [
  {
    slug: "seo-audit-when-you-need-it",
    title: "SEO audit: when you need one and what it should deliver",
    description: "Judge an audit by the decisions it supports, not by the warning count in an export.",
    readerOutcome: "Know when to commission an audit, what evidence to request, and how to accept the work.",
    date: "2026-08-15",
    author: "KILENI",
    readingMinutes: 8,
    searchIntent: {
      label: "Website review",
      primaryQuery: "SEO audit",
      relatedQueries: ["technical SEO audit", "what is included in an SEO audit", "SEO audit cost", "website SEO audit", "free SEO audit"],
    },
    hero: hero("audit", "en"),
    toc: [
      { id: "result", title: "What an audit should deliver" },
      { id: "when", title: "When an audit is justified" },
      { id: "evidence", title: "Evidence from two projects" },
      { id: "acceptance", title: "How to accept the work" },
    ],
    sections: [
      {
        id: "result",
        heading: "An audit exists to prepare decisions",
        paragraphs: [
          "An SEO audit should answer three questions: what prevents important pages from working in search, what needs to change, and how the team will verify the change after release. A crawler export with hundreds of warnings does not answer them. Each material finding needs an example URL, a cause, affected scope, priority, and a testable target state.",
          "Start with the page route. A crawler must discover the address, receive a stable response, see the primary content, and understand which version is canonical. Only then assess query fit and the user journey. Button colour and title length should not outrank a section blocked from crawling, returning 5xx, or losing content during JavaScript rendering.",
          "A useful report separates observation, interpretation, and recommendation. An observation is repeatable on a URL. The interpretation explains possible impact. The recommendation specifies a change and acceptance criterion. This structure lets a developer estimate the job and shows the client exactly what result they are paying for.",
        ],
        callout: { title: "Minimum useful output", text: "A decision summary, evidence-led task register, implementation order, and the same checks repeated after release.", tone: "note" },
      },
      {
        id: "when",
        heading: "Commission an audit around risk or a confirmed symptom",
        paragraphs: [
          "An audit is most valuable before a migration, CMS change, redesign, or large section launch. It records control URLs and redirect rules before release, then checks server responses, robots.txt, sitemaps, canonicals, internal links, and rendered content afterwards. Finding failures before visibility changes is cheaper than reconstructing the cause later.",
          "The second case is a confirmed symptom: important pages are excluded, traffic changed, or the team cannot explain differences between sections. Diagnosis should combine Search Console, Yandex Webmaster, analytics, and a crawl. A newly published five-page website without a systemic signal may only need a free review of key URLs and measurement setup first.",
          "Choose the format by the decision. A quick check confirms one symptom; a full audit covers templates and data; an implementation audit adds release and follow-up testing. Price alone cannot compare these products. Scope, deliverables, and ownership need to be visible before payment.",
        ],
      },
      {
        id: "evidence",
        heading: "What KILENI verified on two live projects",
        paragraphs: [
          "For eco-santeh.ru, a second crawl after template changes confirmed that 509/509 final URLs opened successfully and the checked set no longer contained missing primary tags or exact metadata duplicates. The mobile Lighthouse laboratory score moved from 36 → 57. That is a controlled test result, not a promise of ranking or sales.",
          "For засорсервис.рф, the opening screen shifted during load. After the fix, CLS in two control runs moved from 0.519 to 0.0001, while 575/575 sitemap URLs opened in the final crawl. Both projects used the same proof pattern: record the starting state, change the template, and repeat the identical test.",
          "Do not transfer these numbers to another website as a forecast. They demonstrate an evidence standard: state the method, sample, and limitation. A percentage increase without a date range, source, or baseline cannot be checked or attributed to a specific piece of work.",
        ],
      },
      {
        id: "acceptance",
        heading: "Accept the audit as a set of testable tasks",
        paragraphs: [
          "Ask for the templates checked, example URLs, evidence for each critical finding, implementation order, and a definition of done. “Fix duplicates” is not enough. “Remove parameter URLs from the sitemap, canonicalise them to clean addresses, and retest ten examples” can be estimated and accepted.",
          "Resolve crawl blockers and repeated template faults before isolated page polish. Release small groups of changes so regressions remain visible and reversible. After each group, repeat the crawl, inspect control URLs, and complete the user journey. Engines need time to reprocess documents, but technical correctness can be checked immediately.",
          "Compare prices only with scope attached: templates and URLs, webmaster-tool access, manual JavaScript checks, developer requirements, implementation, and follow-up testing. A cheap crawler export and an audit with implementation are different products. The client should know what they keep after delivery.",
        ],
        callout: { title: "Acceptance rule", text: "Do not accept a recommendation that cannot be retested on a specific URL before and after the change.", tone: "action" },
      },
    ],
    faq: [
      { question: "Can an audit guarantee ranking growth?", answer: "No. It can verify obstacles and implementation quality; demand, competition, content, and search-engine decisions also affect ranking." },
      { question: "Can we begin with a free review?", answer: "Yes. It can confirm primary symptoms and whether deeper work is justified, but it does not cover every template or private data source." },
      { question: "Should an audit run every year?", answer: "There is no universal interval. Repeat it after material releases, migrations, new symptoms, or substantial template growth." },
    ],
    cta: { title: "Begin with a control set of URLs", text: "We will show confirmed problems and explain scope before paid work starts.", label: "Check my website", href: "/free-audit" },
    related: ["why-website-is-not-in-search", "seo-vs-yandex-ads"],
    sources: [
      { title: "Google Search Central: Do you need an SEO?", url: "https://developers.google.com/search/docs/fundamentals/do-i-need-seo" },
      { title: "Google Search Central: Helpful content", url: "https://developers.google.com/search/docs/fundamentals/creating-helpful-content" },
      { title: "Yandex Webmaster: Page indexing analysis", url: "https://yandex.com/support/webmaster/en/site-indexing/page-indexing-analysis" },
    ],
  },
  {
    slug: "wildberries-ozon-product-card",
    title: "How to create a product listing for Wildberries and Ozon",
    description: "Build the category, attributes, title, copy, and photographs from verified product facts.",
    readerOutcome: "Create an evidence-led listing and know which fields must be adapted for each marketplace.",
    date: "2026-08-15",
    author: "KILENI",
    readingMinutes: 8,
    searchIntent: {
      label: "Marketplaces",
      primaryQuery: "how to create a product listing",
      relatedQueries: ["Wildberries product listing", "Ozon product listing", "product listing description example", "marketplace product title", "product listing SEO"],
    },
    hero: hero("marketplace", "en"),
    toc: [
      { id: "record", title: "Build the product record" },
      { id: "fields", title: "Choose category and attributes" },
      { id: "media", title: "Write and photograph for the buyer" },
      { id: "iteration", title: "Test one change at a time" },
    ],
    sections: [
      {
        id: "record",
        heading: "Start with verified product facts",
        paragraphs: [
          "To learn how to create a product listing, begin with a product record rather than promotional copy. Record the exact model, material, measurements, compatibility, package contents, certification, limitations, and usage conditions. The packaging, attribute fields, description, and photographs must agree. A stylish headline cannot repair an incorrect size or an omitted component.",
          "Collect customer language from marketplace analytics, questions, reviews, and an authenticated Wordstat session with the region and period recorded. Sort phrases by intent: product type, task, feature, compatibility, and use case. Do not copy a frequency number from an undated spreadsheet. Popular wording that does not describe the product creates poor traffic and avoidable returns.",
          "Match every phrase to evidence. A claim should be supported by a specification, document, demonstration, or photograph. If the seller cannot prove it, it should not become a promise. This filter keeps copy readable, reduces keyword repetition, and gives the client a clear reason for every field that is prepared.",
        ],
      },
      {
        id: "fields",
        heading: "Category and attributes determine where the product can appear",
        paragraphs: [
          "Select the narrowest correct category before writing the title. Category choice controls available attributes, filters, documents, and sometimes commission or delivery rules. Wildberries and Ozon use different taxonomies, so a category that fits one platform must be checked again on the other instead of transferred automatically.",
          "Complete structured attributes with source data, not keyword variations. Brand, colour, dimensions, material, model, audience, and compatibility help a buyer filter and compare. A missing attribute cannot reliably be replaced by repeating it in the description. Use the platform vocabulary where it is accurate and keep measurement units consistent.",
          "Write the title as identification: product type, distinctive model or feature, and a necessary compatibility marker. Remove seller slogans, duplicate synonyms, delivery promises, and claims that belong in another field. Read the title on a mobile width; the useful distinction should appear before truncation without turning the line into a list of search phrases.",
        ],
      },
      {
        id: "media",
        heading: "Description and photographs should answer purchase questions",
        paragraphs: [
          "Use the description for decisions that attributes cannot settle: how the item is used, what it fits, what arrives in the box, how it should be cared for, and when it is unsuitable. Put the most important limitation next to the relevant benefit. Short labelled sections are easier to scan than one block written only to include phrases.",
          "Plan photographs from real buyer questions. Show the product alone, scale, texture, key details, packaging, package contents, and a realistic use case. Add diagrams only for measurements or compatibility that the camera cannot make clear. Keep text readable on a phone and do not hide essential information solely inside an image.",
          "Use original product photographs when possible. They prove the actual colour, finish, and packaging and distinguish the listing from supplier duplicates. File names and alt-like internal labels help the production team manage assets, but marketplace visibility depends more on category accuracy, attributes, customer response, price, availability, and delivery than on decorative metadata.",
        ],
      },
      {
        id: "iteration",
        heading: "Publish a complete baseline, then change one element",
        paragraphs: [
          "Before publication, compare the listing against the physical product and the current seller documentation for each platform. Check mandatory fields, prohibited claims, spelling, units, first image, mobile crop, and package contents. Save the approved source record so future edits do not introduce contradictions between marketplaces.",
          "After publication, monitor impressions, card opens, add-to-cart events, orders, returns, questions, and review themes where the platform exposes them. These stages diagnose different problems. Low opens may point to category, title, price, or the first image; returns may expose inaccurate sizing or an expectation that the copy failed to set.",
          "Change one material element and define the observation period before editing. Keep a log with the date, hypothesis, changed field, and result. KILENI can promise accurate source data, compliance checks, and a transparent testing record; no responsible listing specialist can promise a fixed ranking or sales count because availability, price, competition, advertising, and delivery also influence demand.",
        ],
        callout: { title: "Production order", text: "Facts → category → attributes → title → photographs → description → one measurable test.", tone: "action" },
      },
    ],
    faq: [
      { question: "How many keywords should a listing contain?", answer: "There is no fixed number. Use only relevant language that describes the product and helps complete a field or answer a buyer question." },
      { question: "Can one listing be copied between Wildberries and Ozon?", answer: "Reuse the verified product record, but recheck category, required attributes, title rules, and media for each platform." },
      { question: "Can listing work guarantee sales growth?", answer: "No. Sales also depend on price, stock, delivery, rating, advertising, and competitors. Accuracy and a controlled test can be guaranteed." },
    ],
    cta: { title: "Build a listing from provable advantages", text: "We will prepare the product record, copy, and a plan for original photographs.", label: "Discuss product listings", href: "/marketplaces" },
    related: ["seo-vs-yandex-ads", "seo-audit-when-you-need-it"],
    sources: [
      { title: "Wildberries: How to optimise a product card", url: "https://seller.wildberries.ru/instructions/ru/ru/material/how-to-optimize-the-product-profile" },
      { title: "Wildberries: How to create a product card", url: "https://seller.wildberries.ru/instructions/ru/ru/material/how-to-create-card" },
      { title: "Ozon: Product management", url: "https://docs.ozon.com/global/ozon-seller-app/product-management/" },
      { title: "Yandex Wordstat: Query operators", url: "https://yandex.ru/support2/wordstat/en/content/operators" },
    ],
  },
  {
    slug: "why-website-is-not-in-search",
    title: "Why a website is not indexed: a step-by-step check",
    description: "Separate server failure, indexing directives, canonical conflicts, and a mismatch with the query.",
    readerOutcome: "Follow one URL from its HTTP response to the canonical version selected by search engines.",
    date: "2026-08-15",
    author: "KILENI",
    readingMinutes: 8,
    searchIntent: {
      label: "Indexing",
      primaryQuery: "why a website is not indexed",
      relatedQueries: ["website not showing in Google", "check website indexing", "page excluded from index", "robots.txt blocks website", "website not indexed by Yandex"],
    },
    hero: hero("indexing", "en"),
    toc: [
      { id: "define", title: "Define the symptom" },
      { id: "route", title: "Check the technical route" },
      { id: "system", title: "Find the systemic cause" },
      { id: "after", title: "Retest after the fix" },
    ],
    sections: [
      {
        id: "define",
        heading: "Define what is actually missing",
        paragraphs: [
          "The question “why a website is not indexed” often describes three states. A search engine may not know the URL, may know it but exclude it, or may index it without showing it for the chosen phrase. A domain-wide site: check cannot distinguish them: the home page may appear while every product page carries a template-level noindex.",
          "Choose one canonical URL from the affected template. Inspect it in Google Search Console and Yandex Webmaster: is it known, can it be crawled, which canonical did the system select, and what exclusion reason is reported? Open the same page without authentication on mobile and desktop. This turns an abstract complaint into a repeatable diagnosis.",
          "Indexing does not equal ranking. If the tools confirm inclusion, ask whether the page satisfies the query, matches the target region, and provides standalone value. Repeating a keyword cannot repair a technical block and cannot make a weak page useful.",
        ],
        definitions: [
          { term: "Crawling", definition: "A search crawler discovers a URL and downloads the server response." },
          { term: "Indexing", definition: "The engine processes a page and decides whether to store it as a possible result." },
          { term: "Ranking", definition: "Indexed documents are selected for a specific query and context." },
        ],
      },
      {
        id: "route",
        heading: "Check the technical route in a fixed order",
        paragraphs: [
          "Begin with the server. A target page should consistently return 200, a moved page should use one permanent redirect, and a removed page should return 404 or 410. Timeouts, 5xx, certificate errors, and CDN protection can block crawlers even when an owner opens a cached session. Watch for soft 404s: a 200 response containing an empty page or unavailable-product message.",
          "Then inspect access and consolidation. Robots.txt controls crawling, while meta robots and X-Robots-Tag control indexing of a response that can be loaded. If robots.txt blocks the URL, the crawler may never see its noindex. Canonicals, sitemaps, redirects, and internal links should identify the same preferred version.",
          "For JavaScript websites, compare source and rendered HTML. The heading, body copy, links, and product state must be available after rendering without a click or scroll. Check blocked scripts, browser errors, and empty API containers. If this route is clean, investigate duplicates, page value, and search intent.",
        ],
        bullets: ["HTTP status and redirects", "robots.txt and noindex", "canonical, sitemap, and links", "rendered primary content", "duplicates and query fit"],
      },
      {
        id: "system",
        heading: "Move from one URL to its template",
        paragraphs: [
          "Once the cause is confirmed, inspect neighbouring pages of the same type. A repeated noindex, canonical, or empty block is a template problem, not a list of CMS edits. If symptoms differ, separate them: a site-wide filter fault should not be bundled with one intentionally removed product.",
          "KILENI uses follow-up crawls as implementation evidence. On eco-santeh.ru, 509/509 final URLs responded successfully, the checked export no longer showed missing primary tags, and Lighthouse moved from 36 → 57. On засорсервис.рф, 575/575 sitemap URLs opened and CLS moved from 0.519 to 0.0001 in two tests. These numbers do not forecast indexing.",
          "Record the method and date. Keep the original response, corrected response, URL sample, and test limitation. For indexing, retain the status reported by webmaster tools because a successful private crawl does not prove inclusion by a search engine.",
        ],
      },
      {
        id: "after",
        heading: "Fix the cause before requesting another crawl",
        paragraphs: [
          "Do not change robots.txt, canonicals, and the sitemap together as a guess. Correct the confirmed root cause, release it to a control group, and repeat the same test. If stable, apply the template change broadly. This release is easier to accept and reverse than unrelated SEO settings.",
          "After deployment, request recrawling through official tools and monitor their reports. Submission does not guarantee immediate indexing. Engines must fetch and process the document again, and timing varies by website and change type. Technical readiness can be verified immediately; search results only after processing.",
          "If the URL is indexed, return to intent. Compare the page with what the searcher expects: a service, guide, category, or product. Clarify region, availability, price, evidence, and next action. Do not add paragraphs to meet a length target; add facts that help someone choose or complete a task.",
        ],
        callout: { title: "Short rule", text: "First a live URL and consistent signals, then recrawling, then observation of indexing and impressions.", tone: "action" },
      },
    ],
    faq: [
      { question: "How long does indexing take?", answer: "There is no universal duration. Provide links, a correct sitemap, and an accessible response, then monitor the URL in webmaster tools." },
      { question: "Why is a sitemap URL not indexed?", answer: "A sitemap identifies a preferred URL but does not guarantee inclusion. Check response, noindex, canonical, rendering, duplicates, and value." },
      { question: "Will more keywords help?", answer: "Not when the page cannot be processed. After technical checks, use natural language that answers the searcher's task." },
    ],
    cta: { title: "Find the cause on specific URLs", text: "We will inspect the page route and write an acceptance-ready task.", label: "Order a review", href: "/seo-audit" },
    related: ["seo-audit-when-you-need-it", "seo-vs-yandex-ads"],
    sources: [
      { title: "Google Search Central: Crawling and indexing", url: "https://developers.google.com/search/docs/crawling-indexing" },
      { title: "Google Search Central: Block indexing with noindex", url: "https://developers.google.com/search/docs/crawling-indexing/block-indexing" },
      { title: "Google Search Central: JavaScript search problems", url: "https://developers.google.com/search/docs/crawling-indexing/javascript/fix-search-javascript" },
      { title: "Yandex Webmaster: Site availability", url: "https://yandex.com/support/webmaster/en/robot-workings/availability" },
    ],
  },
  {
    slug: "seo-vs-yandex-ads",
    title: "SEO or Yandex Ads: which should a business choose?",
    description: "Choose by timing, proven demand, landing-page readiness, and the cost of a qualified enquiry.",
    readerOutcome: "Match the business constraint to a channel and design a first test without funding two vague programmes.",
    date: "2026-08-15",
    author: "KILENI",
    readingMinutes: 8,
    searchIntent: {
      label: "Channel choice",
      primaryQuery: "SEO or Yandex Ads",
      relatedQueries: ["SEO or paid search", "SEO versus Yandex Direct", "when to choose SEO", "when to use search advertising", "compare SEO and ads"],
    },
    hero: hero("channels", "en"),
    toc: [
      { id: "difference", title: "What each channel does" },
      { id: "choice", title: "Choose the first channel" },
      { id: "economics", title: "Compare business outcomes" },
      { id: "together", title: "Combine channels deliberately" },
    ],
    sections: [
      {
        id: "difference",
        heading: "The channels solve different problems",
        paragraphs: [
          "The choice between SEO or Yandex Ads cannot be settled by comparing click prices. Advertising buys controllable exposure and produces early evidence about demand, messaging, and the landing page. SEO improves the website: its structure, pages, internal links, accessibility, and information. Its effect is slower to evaluate, while published work can continue after media spend stops.",
          "Advertising cannot repair a confusing offer, a broken form, or an absent price. SEO cannot create an immediate stream of orders for an untested product. Before choosing, name the binding constraint: when the result is needed, whether search demand is stable, whether the landing page is ready, and what the business can pay for a qualified enquiry.",
          "Group queries by intent—buy, compare, request a price, or solve a problem independently. Authenticated Wordstat reports dynamics, regions, top queries, and related queries, but the result changes with period, region, device, and operators. A keyword list without those settings and a collection date is not a market forecast.",
        ],
      },
      {
        id: "choice",
        heading: "Choose the first channel by the main constraint",
        paragraphs: [
          "Begin with advertising when the offer is new, enquiries are needed within weeks, and there is a defined test budget. Restrict the geography, service, and landing page. Configure one meaningful conversion. The first campaign should test the language of demand and the quality of enquiries rather than maximise traffic at any cost.",
          "Begin with SEO when people repeatedly search for the category, the website can support distinct useful pages, and the business can work over several months. This suits catalogues, regional services, and recurring needs. Remove indexing barriers first, then build one coherent query cluster rather than attempting to optimise the entire domain at once.",
          "If the landing page is not ready, fix the user journey before scaling either channel. State the offer, pricing or calculation method, evidence, timing, limitations, and next step. Both channels amplify an existing proposition; neither replaces a clear reason to choose the service.",
        ],
        comparison: {
          columns: ["Situation", "First step", "Reason"],
          rows: [
            { label: "New demand", left: "Limited advertising test", right: "Tests the query and proposition quickly" },
            { label: "Stable category", left: "One SEO page cluster", right: "Builds a durable search asset" },
            { label: "Weak landing page", left: "Repair the page", right: "Otherwise both channels lose enquiries" },
          ],
        },
      },
      {
        id: "economics",
        heading: "Compare the cost of a business result",
        paragraphs: [
          "For advertising, record spend, clicks, enquiries, qualified enquiries, and sales. For SEO, include review, development, content, maintenance, and internal team time. Bring both channels back to one event such as a paid order and use the same attribution window. Otherwise a cheap click will be compared with an expensive but valuable lead.",
          "Measure the value of learning separately. A campaign reveals which phrases attract irrelevant enquiries and which promise improves the page. Search-performance data shows which pages receive impressions and where demand extends beyond an ad group. These findings remain useful even if the channel is not yet scaled.",
          "Do not forecast SEO as a fixed price for a ranking or judge a campaign by someone else's click cost. Competition, location, season, account history, and the website change results. Record the baseline, the test budget, and a stop rule before launch so the client knows what decision the test must support.",
        ],
      },
      {
        id: "together",
        heading: "Combine channels after one measured cycle",
        paragraphs: [
          "A combined programme works when each channel has a distinct role. Advertising tests commercial wording and supports priority queries now. SEO creates pages for durable demand, removes technical barriers, and answers questions before purchase. Campaign data can inform topic selection, but search terms should never be pasted mechanically into page copy.",
          "Start with one service and one region. Map search intentions, prepare the page, configure conversion measurement, run a limited campaign, and check indexing in parallel. At the agreed review point, compare qualified enquiries and customer objections, then decide what to scale, rewrite, or separate into another page.",
          "Show the scope before payment: which pages will be produced, which campaigns and goals will be configured, who supplies evidence, and when decisions occur. This changes an indefinite promise of promotion into a sequence of testable stages with a visible price, owner, and acceptance point.",
        ],
        callout: { title: "A practical sequence", text: "One service → one landing page → enquiry measurement → advertising test → SEO pages for confirmed demand.", tone: "action" },
      },
    ],
    faq: [
      { question: "Which channel can produce enquiries sooner?", answer: "Advertising usually launches sooner, but only a ready page and conversion measurement show whether it pays back. SEO needs time for publishing and processing." },
      { question: "Can advertising stop after SEO improves?", answer: "Budget can be reallocated after comparing sales and margin. Ads can still support seasonal periods, experiments, and priority queries." },
      { question: "Should campaign keywords be copied into SEO text?", answer: "No. Group them by intent and write for the customer's task instead of repeating phrases mechanically." },
    ],
    cta: { title: "Define the first measurable stage", text: "We will match demand, website, timing, and budget before naming the scope.", label: "Complete the brief", href: "/brief" },
    related: ["seo-audit-when-you-need-it", "wildberries-ozon-product-card"],
    sources: [
      { title: "Yandex Wordstat: Interface and available data", url: "https://yandex.ru/support2/wordstat/en/interface/new" },
      { title: "Yandex Wordstat: Query operators", url: "https://yandex.ru/support2/wordstat/en/content/operators" },
      { title: "Google Search Central: SEO Starter Guide", url: "https://developers.google.com/search/docs/fundamentals/seo-starter-guide" },
    ],
  },
];

const en: Article[] = [...baseEn, ...additionalEnArticles];

export const articleSlugs = ru.map((article) => article.slug);
export const articlesByLocale: Record<Locale, readonly Article[]> = { ru, en };
export function getArticles(locale: Locale): readonly Article[] { return articlesByLocale[locale]; }
export function getArticle(locale: Locale, slug: string): Article | undefined { return articlesByLocale[locale].find((article) => article.slug === slug); }
