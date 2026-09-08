import type { Article } from "./articles";

const covers = {
  speed: [
    "/editorial/website-speed-loading-v2.webp",
    "Диагностика загрузки страницы: этапы, найденное узкое место, оптимизация и повторная проверка",
    "Page-load diagnosis showing stages, a confirmed bottleneck, optimisation and repeat verification",
  ],
  ecommerce: [
    "/editorial/seo-ecommerce-promotion-v2.webp",
    "Структура интернет-магазина: категории, полезные фильтры, карточки товаров и исключённые дубли",
    "Ecommerce structure with categories, useful filters, product cards and excluded duplicate paths",
  ],
  price: [
    "/editorial/seo-promotion-cost-v2.webp",
    "Прозрачный состав SEO-работ: аудит, исправления, материалы, внедрение и контроль результата",
    "Transparent SEO scope covering audit, fixes, content, implementation and result verification",
  ],
} as const;

function hero(key: keyof typeof covers, locale: "ru" | "en"): Article["hero"] {
  const [src, ruAlt, enAlt] = covers[key];
  return {
    src,
    alt: locale === "ru" ? ruAlt : enAlt,
    credit: locale === "ru" ? "Иллюстрация: KILENI" : "Illustration: KILENI",
    license: "KILENI editorial",
  };
}

export const additionalRuArticles: Article[] = [
  {
    slug: "website-speed-loading",
    title: "Скорость загрузки сайта: как найти причину и ускорить важные страницы",
    description: "Разбираем, какие измерения нужны, как отличить симптом от причины и что проверять после релиза.",
    readerOutcome: "Соберёте короткий план проверки скорости без гонки за одной красивой цифрой.",
    date: "2026-08-15",
    author: "Редакция KILENI",
    readingMinutes: 9,
    searchIntent: {
      label: "Скорость сайта",
      primaryQuery: "скорость загрузки сайта",
      relatedQueries: ["скорость загрузки сайта проверить", "скорость загрузки сайта онлайн", "скорость загрузки сайта google page speed", "как ускорить загрузку сайта", "проверить скорость загрузки сайта"],
    },
    hero: hero("speed", "ru"),
    toc: [
      { id: "measure", title: "Сначала измерить сценарий" },
      { id: "find", title: "Найти причину, а не симптом" },
      { id: "fix", title: "Исправлять по влиянию" },
      { id: "accept", title: "Как принять ускорение" },
    ],
    sections: [
      {
        id: "measure",
        heading: "Скорость загрузки сайта измеряют на конкретной странице и устройстве",
        paragraphs: [
          "Скорость загрузки сайта нельзя оценить одной цифрой с главной страницы. Пользователь может ждать первый экран услуги, фильтр каталога или форму заявки; у каждого сценария разный набор изображений, скриптов и ответов сервера. Для начала выберите три–пять URL, которые действительно ведут к обращению, и зафиксируйте устройство, сеть, регион запуска и дату проверки.",
          "Лабораторный тест помогает воспроизвести загрузку в одинаковых условиях, а полевые данные показывают опыт реальных посетителей. Эти измерения нельзя подменять друг другом. Лабораторный результат удобен для приёмки конкретного изменения, но один удачный прогон не доказывает, что все посетители увидели ту же скорость.",
        ],
        callout: { title: "Контрольный набор", text: "Главная, страница услуги, карточка или категория, форма и любой URL с тяжёлым фильтром или галереей.", tone: "note" },
      },
      {
        id: "find",
        heading: "Причина задержки обычно находится в цепочке, а не в одном показателе",
        paragraphs: [
          "Разберите загрузку по этапам: ответ сервера, HTML, критические стили, изображения первого экрана, шрифты и JavaScript. Медленный Largest Contentful Paint может появиться из-за ответа сервера, большого изображения, блокирующего скрипта или элемента, который рисуется только после выполнения кода. Ускорять всё подряд бессмысленно: сначала нужна наблюдаемая причина на конкретном URL.",
          "Отдельно проверьте нестабильность макета. Если баннер, шрифт или изображение меняют размеры после первого отображения, посетитель может промахнуться по кнопке, даже когда страница формально загрузилась быстро. Для каждого изменения сохраните исходный кадр, размер ресурса и путь в браузерной сети — разработчику будет понятно, что именно менять.",
        ],
        definitions: [
          { term: "Ответ сервера", definition: "Время до первого байта HTML. Оно показывает, как быстро приложение начинает отвечать." },
          { term: "Первый экран", definition: "Содержимое, которое видно до прокрутки и влияет на первое впечатление о странице." },
          { term: "Сдвиг макета", definition: "Изменение положения уже показанных элементов во время загрузки." },
        ],
      },
      {
        id: "fix",
        heading: "Исправления выбирают по влиянию на сценарий пользователя",
        paragraphs: [
          "Начните с повторяющихся причин: изображения без заданного размера, один тяжёлый виджет на всех страницах, шрифт, который блокирует первый экран, или шаблон с лишними запросами. После этого переходите к отдельным страницам. Уменьшение файла на странице без трафика может выглядеть красиво в отчёте, но не изменит путь до заявки.",
          "Не заменяйте содержание пустым плейсхолдером ради скорости. На первом экране должны остаться предложение, цена или понятный способ расчёта, доказательство и следующий шаг. Хорошее ускорение сокращает ожидание, не превращая страницу в неполную версию сайта.",
        ],
        bullets: [
          "Задать фактические размеры изображениям и отложить медиа ниже первого экрана.",
          "Убрать или перенести скрипты, которые не нужны для первого действия посетителя.",
          "Проверить кэширование, сжатие и стабильность ответа сервера.",
          "Сравнить один и тот же URL до и после изменения на мобильном устройстве.",
        ],
      },
      {
        id: "accept",
        heading: "Ускорение принимают повторной проверкой, а не обещанием балла",
        paragraphs: [
          "Перед работой согласуйте порог и метод: например, страница услуги на мобильном профиле, без сдвига главной кнопки и с подтверждённым отображением формы. После релиза повторите тот же тест, вручную пройдите путь пользователя и проверьте, что аналитика, форма и важный контент остались на месте.",
          "В кейсе KILENI для eco-santeh.ru мобильный лабораторный Performance на главной изменился с 36 до 57, а десктопный результат составил 99. Это не универсальный прогноз для другого домена: цифры относятся к одному URL и условиям запуска. Полезный вывод другой — результат должен иметь выборку, метод и ограничение.",
          "Для контроля сохраните ссылку на тест, дату, устройство и список выпущенных изменений. Если после ускорения упало число отправок формы, исчезла цена или сломалась навигация, задача не принята: техническая метрика не важнее рабочего сценария. Такой журнал делает повторную проверку быстрой и позволяет не спорить о том, что именно изменилось. Сравните также число запросов, общий вес страницы и путь до целевого действия: они помогают увидеть побочные эффекты раньше отчёта за месяц. Для нестабильных результатов сделайте несколько запусков в одинаковом профиле и фиксируйте медиану, а не выбирайте лучший кадр. Затем подтвердите итог на обычном мобильном устройстве и сохраните короткую видеозапись всего сценария сразу.",
        ],
        callout: { title: "Критерий готовности", text: "Изменение считается готовым, когда одинаковый URL быстрее открывается и по-прежнему позволяет выполнить целевое действие.", tone: "action" },
      },
    ],
    faq: [
      { question: "Нужен ли максимальный балл PageSpeed?", answer: "Нет. Нужны быстрый первый экран, стабильная вёрстка и работающие важные страницы. Балл помогает найти проблему, но сам по себе не является целью." },
      { question: "Почему мобильный тест хуже десктопного?", answer: "Мобильные устройства и сети обычно слабее. Тяжёлые изображения, скрипты и нестабильные блоки проявляются на них сильнее." },
      { question: "Можно ли проверить скорость бесплатно?", answer: "Да. Бесплатные инструменты покажут симптомы; для исправления обычно нужно сопоставить их с шаблонами, кодом и бизнес-сценарием страницы." },
    ],
    cta: { title: "Проверить важные страницы", text: "Бесплатная проверка покажет, какие проблемы можно подтвердить по открытым страницам сайта.", label: "Проверить сайт", href: "/free-audit" },
    related: ["seo-audit-when-you-need-it", "why-website-is-not-in-search", "seo-ecommerce-promotion"],
    sources: [
      { title: "Google: About PageSpeed Insights", url: "https://developers.google.com/speed/docs/insights/v5/about" },
      { title: "web.dev: Core Web Vitals", url: "https://web.dev/articles/vitals" },
      { title: "Яндекс Вебмастер: Проверка мобильной версии", url: "https://yandex.ru/support/webmaster/ru/diagnostics/mobile-friendly" },
    ],
  },
  {
    slug: "seo-ecommerce-promotion",
    title: "SEO-продвижение интернет-магазина: с каких страниц начать",
    description: "Выбираем категории, карточки и фильтры по спросу, а не по числу URL в каталоге.",
    readerOutcome: "Поймёте, какие страницы магазина нужны покупателю и поиску, а какие создают дубли и путаницу.",
    date: "2026-08-15",
    author: "Редакция KILENI",
    readingMinutes: 10,
    searchIntent: {
      label: "Интернет-магазин",
      primaryQuery: "SEO-продвижение интернет-магазина",
      relatedQueries: ["seo продвижение интернет магазина заказать", "seo продвижение магазина", "продвижение интернет магазинов seo yandex", "seo для интернет-магазина", "оптимизация интернет-магазина"],
    },
    hero: hero("ecommerce", "ru"),
    toc: [
      { id: "map", title: "Карта спроса до структуры" },
      { id: "pages", title: "Роль категорий и карточек" },
      { id: "filters", title: "Фильтры без массовых дублей" },
      { id: "control", title: "Контроль после публикации" },
    ],
    sections: [
      {
        id: "map",
        heading: "SEO-продвижение интернет-магазина начинается с карты задач покупателя",
        paragraphs: [
          "SEO-продвижение интернет-магазина не равно публикации сотен текстов на каждый товар. Сначала разделите спрос: купить категорию, выбрать по характеристике, сравнить модели, найти совместимый аксессуар или узнать условия доставки. Каждой группе нужен свой тип страницы и понятный путь до покупки.",
          "Формулировки собирают в авторизованном Вордстате с заданными регионом, периодом и операторами, затем сверяют с поисковыми подсказками, вопросами покупателей и данными самого магазина. Числа без даты и региона не подскажут, какая категория важнее. Для новой страницы важнее связь запроса с ассортиментом, маржой и наличием товара.",
        ],
        callout: { title: "Один кластер — одно решение", text: "Если покупатель ищет категорию, не ведите его на карточку одного товара. Если ищет модель, не заставляйте искать её внутри общей категории.", tone: "note" },
      },
      {
        id: "pages",
        heading: "Категория объясняет выбор, а карточка подтверждает товар",
        paragraphs: [
          "Страница категории должна быстро отвечать: что здесь продаётся, по каким признакам можно выбрать и как сузить ассортимент. Карточка товара подтверждает конкретную модель: характеристики, комплектацию, размеры, совместимость, цену, остаток, доставку и реальные изображения. Переносить описание категории в каждую карточку не нужно — это размывает различия между товарами.",
          "Если товар временно отсутствует, решение зависит от спроса и замены. Страницу не стоит молча удалять, если на неё есть переходы и есть близкие варианты: объясните статус, предложите замену и оставьте корректный адрес. Если модели больше нет и замены нет, используйте согласованный сценарий 404 или перенаправления, а не пустую страницу с кодом 200.",
        ],
        comparison: {
          columns: ["Страница", "Главная задача", "Что подтвердить"],
          rows: [
            { label: "Категория", left: "Помочь выбрать тип товара", right: "Ассортимент, фильтры, условия выбора" },
            { label: "Карточка", left: "Подтвердить конкретную модель", right: "Характеристики, цена, наличие, комплект" },
            { label: "Материал", left: "Ответить на вопрос до покупки", right: "Проверяемая польза и ссылка на товары" },
          ],
        },
      },
      {
        id: "filters",
        heading: "Фильтры полезны, пока не создают бесконечные варианты одного каталога",
        paragraphs: [
          "Комбинации фильтров могут помочь покупателю, но для поиска нужны только устойчивые посадочные, где есть ассортимент и понятный спрос. Случайные параметры сортировки, пустые сочетания и десятки одинаковых URL расходуют обход и размывают основные страницы. До индексации каждой комбинации определите, кому она нужна и чем отличается от родительской категории.",
          "Техническая часть должна согласовать внутренние ссылки, canonical, sitemap, параметры и ответ пустых результатов. Не закрывайте проблему только метатегом: робот всё равно может находить тысячи ссылок в фильтрах. Сначала приведите в порядок генерацию адресов и навигацию, затем подтвердите, что в карту сайта попали только выбранные страницы.",
        ],
        bullets: [
          "Оставить индексируемыми только посадочные с ассортиментом и отдельным намерением.",
          "Исключить из sitemap сортировки, пустые выдачи и технические параметры.",
          "Проверить, куда ведут canonical у фильтров и страниц пагинации.",
          "Показать пользователю понятный сценарий, когда товаров по фильтру нет.",
        ],
      },
      {
        id: "control",
        heading: "После публикации магазин проверяют как покупатель и как робот",
        paragraphs: [
          "Выберите контрольные URL для каждой группы: главная категория, фильтр, карточка в наличии, карточка без наличия и страница пагинации. Проверьте код ответа, основное содержимое без входа в аккаунт, адрес в canonical, ссылки, микроразметку товара и путь до корзины. Отдельно смотрите, не исчезли ли цена и характеристики после JavaScript.",
          "Не обещайте рост позиций по одному новому шаблону. Сначала подтвердите качество публикации и доступность страниц, затем наблюдайте показы, клики, запросы, добавления в корзину и заказы. Такой порядок позволяет отличить техническую ошибку от слабого спроса или ассортимента.",
          "Запускайте изменения небольшими очередями и оставляйте контрольную группу без правок, когда это возможно. Так понятнее, повлияли ли на результат новая структура, сезонный спрос, цена или остатки. Для каждой очереди полезно сохранить дату публикации, перечень URL и решение: расширить, доработать или остановить гипотезу. Не смешивайте в одном выпуске новую навигацию, цену, рекламную кампанию и переработку каталога: тогда у результата останется понятная причина. Этот порядок помогает команде быстрее увидеть ошибку публикации и вернуться к работающему варианту без потери всего каталога. Новые шаблоны сначала открывают для небольшой, управляемой группы URL, а не для всего каталога сразу, включая основные категории.",
        ],
        callout: { title: "Приёмка магазина", text: "Каждая новая группа страниц должна иметь список URL, правило индексации и измеримый путь пользователя до товара.", tone: "action" },
      },
    ],
    faq: [
      { question: "Нужен ли отдельный текст на каждую категорию?", answer: "Нужен только там, где он помогает выбрать товар или отвечает на реальный вопрос. Шаблонный текст ради ключей не создаёт ценности." },
      { question: "Все ли фильтры нужно открывать для поиска?", answer: "Нет. Открывают только устойчивые комбинации с ассортиментом и отдельным пользовательским намерением." },
      { question: "Подходит ли один шаблон карточки для всех товаров?", answer: "Базовый шаблон полезен, но данные и изображения должны отражать конкретную модель. Иначе карточки становятся неразличимыми." },
    ],
    cta: { title: "Собрать план для каталога", text: "Опишите ассортимент и задачу — определим первую группу страниц и способ проверки.", label: "Заполнить бриф", href: "/brief" },
    related: ["wildberries-ozon-product-card", "website-speed-loading", "seo-audit-when-you-need-it"],
    sources: [
      { title: "Google Search Central: E-commerce sites", url: "https://developers.google.com/search/docs/specialty/ecommerce" },
      { title: "Google Search Central: Product structured data", url: "https://developers.google.com/search/docs/appearance/structured-data/product" },
      { title: "Яндекс Вебмастер: Анализ индексирования", url: "https://yandex.ru/support/webmaster/ru/site-indexing/page-indexing-analysis" },
    ],
  },
  {
    slug: "seo-promotion-cost",
    title: "Сколько стоит SEO-продвижение сайта и из чего складывается цена",
    description: "Разбираем, что сравнивать в предложениях по SEO, чтобы не купить отчёт вместо работ на сайте.",
    readerOutcome: "Сможете сопоставить объём, границы и способ проверки до того, как согласуете бюджет.",
    date: "2026-08-15",
    author: "Редакция KILENI",
    readingMinutes: 8,
    searchIntent: {
      label: "Стоимость SEO",
      primaryQuery: "сколько стоит SEO-продвижение сайта",
      relatedQueries: ["сколько стоит seo продвижение сайта в месяц", "seo продвижение сайта цена", "услуги seo продвижение сайта цена", "seo продвижение и раскрутка сайта цена", "продвижение сайта в яндексе цена"],
    },
    hero: hero("price", "ru"),
    toc: [
      { id: "scope", title: "Сначала сравнить состав" },
      { id: "cost", title: "Что влияет на стоимость" },
      { id: "offer", title: "Как читать коммерческое предложение" },
      { id: "control", title: "Как контролировать работу" },
    ],
    sections: [
      {
        id: "scope",
        heading: "Вопрос «сколько стоит SEO-продвижение сайта» начинается с границ работы",
        paragraphs: [
          "На вопрос «сколько стоит SEO-продвижение сайта» нельзя честно ответить только суммой в месяц. Один подрядчик включает диагностику, исправления, контент и контроль; другой продаёт мониторинг позиций и отчёт. Это разные продукты, даже если в названии обоих есть SEO. Сначала зафиксируйте тип сайта, число шаблонов, регионы, языки, доступы к данным и того, кто внедряет изменения.",
          "Для небольшого сайта услуг стартом может быть аудит и один пакет исправлений. Для каталога или интернет-магазина добавляются категории, фильтры, карточки, остатки, структурированные данные и контроль тысяч URL. Ежемесячное сопровождение имеет смысл, когда есть согласованный план: что обновляется, какие материалы нужны от клиента и как подтверждается выпуск.",
        ],
        callout: { title: "Сравнивайте единицу работы", text: "Не «месяц SEO», а конкретные страницы, шаблоны, задачи, владелец внедрения и повторная проверка.", tone: "note" },
      },
      {
        id: "cost",
        heading: "На стоимость влияют масштаб, доступ и ответственность за внедрение",
        paragraphs: [
          "Цена растёт не из-за красивого названия услуги, а из-за объёма проверки и изменений. Важны число типов страниц, технический стек, частота обновления ассортимента, качество исходных данных, наличие разработчика, региональные версии, согласование контента и необходимость повторного обхода. Если один шаблон управляет тысячей URL, сначала оценивают риск и проверку этого шаблона, а не каждую страницу вручную.",
          "Отдельно укажите работы вне SEO-бюджета: фото, дизайн, разработка, реклама, закупка медиа, перевод и юридическое согласование. Так клиент понимает, что входит в предложение, а исполнитель не маскирует доплаты под неопределённым словом «доработки».",
        ],
        comparison: {
          columns: ["Вопрос до старта", "Почему важен", "Как зафиксировать"],
          rows: [
            { label: "Какие страницы", left: "Определяет масштаб и типы страниц", right: "Список адресов и типов страниц" },
            { label: "Кто внедряет", left: "Меняет сроки и ответственность", right: "Роли, доступы и формат задания" },
            { label: "Как проверяем", left: "Исключает отчёт без результата", right: "Контрольные URL и критерии приёмки" },
          ],
        },
      },
      {
        id: "offer",
        heading: "Коммерческое предложение должно объяснять следующий оплачиваемый результат",
        paragraphs: [
          "Хорошее предложение называет не только тариф, но и первую очередь работ: какие ошибки проверят, какие страницы изменят, что требуется от клиента и когда будет повторный контроль. Формулировка «оптимизация сайта» слишком широкая, если нельзя увидеть ни объём, ни примеры, ни способ принять работу.",
          "Осторожно относитесь к гарантии позиции, фиксированного числа заявок или «секретной методики». Поисковый результат зависит от спроса, конкурентов, сезона, предложения и самого сайта. Ответственный исполнитель гарантирует свой процесс: согласованный объём, качество публикации, прозрачность данных и проверку сделанных изменений.",
        ],
        bullets: [
          "Попросить пример таблицы задач без чужих данных.",
          "Уточнить, входит ли внедрение или только рекомендация.",
          "Зафиксировать срок ответа клиента и зависимость от разработчика.",
          "Определить дату контрольной проверки и формат отчёта.",
        ],
      },
      {
        id: "control",
        heading: "Контроль идёт через выполненные изменения и проверяемые данные",
        paragraphs: [
          "Каждый период работы должен завершаться коротким списком: что изменили, на каких URL, что осталось в работе и чем подтвердили результат. Для технических задач это ответы сервера, canonical, sitemap, шаблоны и контрольные страницы. Для контента — опубликованный материал, его роль в структуре и путь пользователя к услуге или товару.",
          "Цена становится понятной, когда клиент видит последовательность решений, а не бесконечный список активностей. Если после аудита требуются отдельные исправления, их оценивают по зафиксированной задаче и могут выполнить поэтапно. Это честнее, чем включать неизвестный объём в абонентскую плату.",
          "Перед стартом согласуйте, какие доступы и материалы предоставляет клиент, сколько итераций правок включено и что считается вне рамок. Если задача меняется после обнаружения новых шаблонов или интеграций, сначала обновляют оценку и срок. Это сохраняет управляемый бюджет и не превращает ежемесячную услугу в обязательство без понятного результата. В итоговом отчёте должны оставаться ссылки на опубликованные страницы и контрольные проверки, а не только сводная презентация. Если измерения недоступны, это нужно прямо отметить вместе с причиной, а не заменять данными предположение. Такой формат позволяет клиенту сопоставить цену с выполненной работой, а исполнителю — закрыть этап по понятным критериям, а не по общему количеству проведённых часов в проекте.",
        ],
        callout: { title: "Перед оплатой", text: "До оплаты должны быть понятны состав и ограничения работ, срок, ответственный и способ повторной проверки каждого этапа.", tone: "action" },
      },
    ],
    faq: [
      { question: "Почему у двух агентств так различается цена?", answer: "Они могут предлагать разный объём: аудит, внедрение, контент, контроль, работу с каталогом или только отчётность. Сравнивайте состав, а не название тарифа." },
      { question: "Можно ли сначала заказать только аудит?", answer: "Да. Аудит помогает зафиксировать задачи и отдельно оценить внедрение, если масштаб ещё неизвестен." },
      { question: "Нужно ли платить за SEO каждый месяц?", answer: "Только если есть повторяющийся согласованный объём: новые страницы, технический контроль, развитие структуры и измерение результата." },
    ],
    cta: { title: "Зафиксировать понятный первый этап", text: "Опишите сайт и задачу — назовём объём до начала работ.", label: "Заполнить бриф", href: "/brief" },
    related: ["seo-audit-when-you-need-it", "seo-vs-yandex-ads", "seo-ecommerce-promotion"],
    sources: [
      { title: "Яндекс Вордстат: данные и настройки", url: "https://yandex.ru/support2/wordstat/ru/" },
      { title: "Яндекс Вордстат: операторы", url: "https://yandex.ru/support2/wordstat/ru/content/operators" },
      { title: "Google Search Central: Do you need an SEO?", url: "https://developers.google.com/search/docs/fundamentals/do-i-need-seo" },
    ],
  },
];

export const additionalEnArticles: Article[] = [
  {
    slug: "website-speed-loading",
    title: "Website loading speed: how to find the cause and improve key pages",
    description: "A practical way to measure loading, isolate the bottleneck and verify the release without chasing one score.",
    readerOutcome: "Build a short speed-review plan focused on pages that lead to an enquiry or purchase.",
    date: "2026-08-15",
    author: "KILENI Editorial",
    readingMinutes: 9,
    searchIntent: { label: "Website speed", primaryQuery: "website loading speed", relatedQueries: ["website loading speed test", "check website loading speed", "website speed test online", "how to improve website speed", "google page speed test"] },
    hero: hero("speed", "en"),
    toc: [{ id: "measure", title: "Measure the user journey" }, { id: "find", title: "Find the cause" }, { id: "fix", title: "Fix by impact" }, { id: "accept", title: "Accept the change" }],
    sections: [
      { id: "measure", heading: "Website loading speed belongs to a page and a device", paragraphs: ["Website loading speed is not one number for a home page. A visitor may wait for a service page, a catalogue filter or a form, and each journey uses different images, scripts and server responses. Select three to five pages that can lead to a real business action, then record the device, network profile, location and date for every test.", "Laboratory tests reproduce a page in controlled conditions; field data describes the experience of actual visitors. They answer different questions. A laboratory run is useful when accepting a defined change, but one favourable run does not prove the same experience for every visitor."], callout: { title: "Control set", text: "Use the home page, a service page, a category or product, a form, and any URL with a heavy gallery or filter.", tone: "note" } },
      { id: "find", heading: "A delay usually has a chain of causes", paragraphs: ["Break a load into server response, HTML, critical styles, first-screen images, fonts and JavaScript. A slow largest element can come from the server, an oversized image, a blocking script or a component that appears only after code runs. Fixing every warning is wasteful; first identify the observable cause on the actual URL.", "Check layout stability separately. A banner, font or image that changes size after appearing can move a button while a visitor is about to use it. Preserve the before state, resource size and browser-network path for each issue so a developer can reproduce the change."], definitions: [{ term: "Server response", definition: "The time before the browser receives the first byte of HTML." }, { term: "First screen", definition: "The content visible before scrolling, which forms the first page impression." }, { term: "Layout shift", definition: "A movement of already visible elements during loading." }] },
      { id: "fix", heading: "Choose fixes by user impact", paragraphs: ["Start with repeated causes: images with no fixed dimensions, a heavy widget on every page, a font blocking the first screen, or a template making unnecessary requests. Then move to individual pages. Saving bytes on a page with no traffic can look good in a report without improving the route to an enquiry.", "Do not replace useful content with an empty placeholder to make a score look better. A first screen still needs the offer, price or calculation method, proof and next step. Good optimisation removes waiting without making the page incomplete."], bullets: ["Set real image dimensions and defer media below the first screen.", "Move scripts that are not needed for the visitor’s first action.", "Check caching, compression and stable server response.", "Compare the same URL before and after on a mobile profile."] },
      { id: "accept", heading: "Accept faster loading with the same test, not a promised score", paragraphs: ["Agree the method before work starts: for example, a service page on a mobile profile, no shift of the main action and a working form. After release, repeat that test, walk through the user journey and confirm that analytics, the form and essential content still work.", "On eco-santeh.ru, KILENI’s mobile laboratory Performance on the home page changed from 36 to 57 and the desktop result reached 99. These numbers belong to one URL and test conditions, not a forecast for another domain. The useful standard is a result with a sample, method and limitation.", "Keep the test link, date, device profile and the released change list. A score improvement is not accepted if form submission, pricing or navigation stops working. This record makes the follow-up check fast and gives the team a reliable explanation of what changed. Compare the request count, page weight and path to the intended action too, because they reveal a regression before the monthly report."], callout: { title: "Acceptance criterion", text: "A fix is ready when the same URL opens faster and still lets a visitor complete the important action.", tone: "action" } },
    ],
    faq: [{ question: "Do we need a maximum PageSpeed score?", answer: "No. A fast first screen, stable layout and working user journey matter more than a single diagnostic score." }, { question: "Why is mobile often worse than desktop?", answer: "Mobile devices and networks are usually weaker, so heavy images, scripts and unstable elements have a larger impact." }, { question: "Can speed be checked for free?", answer: "Yes. Free tools show symptoms; fixing them usually needs the page template, code and business journey to be considered together." }],
    cta: { title: "Check the important pages", text: "The free check confirms what can be observed on the public part of a website.", label: "Check website", href: "/free-audit" },
    related: ["seo-audit-when-you-need-it", "why-website-is-not-in-search", "seo-ecommerce-promotion"],
    sources: [{ title: "Google: About PageSpeed Insights", url: "https://developers.google.com/speed/docs/insights/v5/about" }, { title: "web.dev: Core Web Vitals", url: "https://web.dev/articles/vitals" }, { title: "Yandex Webmaster: Mobile-friendly check", url: "https://yandex.ru/support/webmaster/ru/diagnostics/mobile-friendly" }],
  },
  {
    slug: "seo-ecommerce-promotion",
    title: "E-commerce SEO: which pages to build first",
    description: "Choose categories, product pages and filters by customer demand instead of publishing every possible URL.",
    readerOutcome: "Know which store pages answer a real search task and which ones create duplicates and confusion.",
    date: "2026-08-15",
    author: "KILENI Editorial",
    readingMinutes: 10,
    searchIntent: { label: "E-commerce", primaryQuery: "e-commerce SEO", relatedQueries: ["e-commerce SEO strategy", "online store SEO", "SEO for product category pages", "e-commerce product page SEO", "online store technical SEO"] },
    hero: hero("ecommerce", "en"),
    toc: [{ id: "map", title: "Map demand before structure" }, { id: "pages", title: "Categories and product pages" }, { id: "filters", title: "Filters without duplicate pages" }, { id: "control", title: "Check after publishing" }],
    sections: [
      { id: "map", heading: "E-commerce SEO begins with a map of customer tasks", paragraphs: ["E-commerce SEO is not publishing hundreds of paragraphs for every product. Separate the search tasks first: buying a category, choosing by a property, comparing models, finding a compatible accessory or understanding delivery. Each group needs its own page type and an obvious route to purchase.", "Query wording can be collected in an authorised Wordstat account with region, period and operators defined, then checked against search suggestions, buyer questions and the store’s own data. Numbers with no date or region do not identify the important category. For a new page, the link between a query, actual stock, margin and purchase intent matters more."], callout: { title: "One cluster, one decision", text: "A category query should not lead to a single-product page; a model query should not make the visitor search a broad category.", tone: "note" } },
      { id: "pages", heading: "A category helps choose; a product page proves the product", paragraphs: ["A category should explain what is available, how to choose and how to narrow the range. A product page confirms a specific model: specifications, package contents, dimensions, compatibility, price, stock, delivery and real images. Copying category text into every product page removes the difference between products.", "When a product is temporarily unavailable, the treatment depends on demand and available replacements. Do not silently delete a page that has visits and viable alternatives: explain the status and offer a close option. If a model is permanently gone with no replacement, use an agreed 404 or redirect rather than a blank 200 page."], comparison: { columns: ["Page", "Main task", "What to prove"], rows: [{ label: "Category", left: "Help choose a product type", right: "Range, filters and selection criteria" }, { label: "Product page", left: "Prove a specific model", right: "Specification, price, stock and package" }, { label: "Guide", left: "Answer a pre-purchase question", right: "Useful evidence and route to products" }] } },
      { id: "filters", heading: "Filters help until they create endless versions of the same catalogue", paragraphs: ["Filter combinations can serve customers, but search needs only stable landing pages with stock and a clear intent. Random sort orders, empty combinations and thousands of near-identical URLs consume crawl resources and dilute the main pages. Before opening a combination to search, define who needs it and how it differs from the parent category.", "The technical implementation must align internal links, canonicals, sitemaps, parameters and empty-result responses. A single meta tag does not solve a navigation system that exposes thousands of links. Fix URL generation and navigation first, then confirm that the sitemap contains only chosen pages."], bullets: ["Index only landings with stock and distinct demand.", "Keep sorts, empty results and technical parameters out of the sitemap.", "Check canonicals for filters and pagination.", "Give a visitor a clear route when a filter has no products."] },
      { id: "control", heading: "Check the store as a buyer and as a crawler", paragraphs: ["Choose control URLs for each page group: main category, filter, in-stock product, unavailable product and pagination. Check status code, main content without an account, canonical, links, product structured data and route to the basket. Confirm that price and specifications do not disappear after JavaScript runs.", "Do not promise ranking growth from one template change. Confirm publication quality and availability first, then watch impressions, clicks, queries, basket additions and orders. This separates a technical fault from weak demand or limited inventory.", "Release changes in small groups and retain an unchanged control group when the catalogue allows it. That makes it easier to separate the effect of structure from seasonality, price or stock. Record the publish date, URL set and decision for each group: extend, revise or stop the hypothesis. Avoid bundling navigation, pricing, advertising and catalogue changes in one release; then the observed result still has a useful cause. This discipline also lets a team catch a publication error quickly and return to a working catalogue state."], callout: { title: "Store acceptance", text: "Every page group needs a URL list, an indexing rule and a measurable visitor path to a product.", tone: "action" } },
    ],
    faq: [{ question: "Does every category need unique copy?", answer: "Only when it helps choose a product or answers a real question. Template copy for keywords alone has little value." }, { question: "Should every filter be indexable?", answer: "No. Open only stable combinations with stock and a distinct customer intent." }, { question: "Can every product use one page template?", answer: "A shared template is useful, but the data and images must prove the specific model." }],
    cta: { title: "Plan the first store page group", text: "Describe the range and goal; we will define the first page group and its check method.", label: "Complete the brief", href: "/brief" },
    related: ["wildberries-ozon-product-card", "website-speed-loading", "seo-audit-when-you-need-it"],
    sources: [{ title: "Google Search Central: E-commerce sites", url: "https://developers.google.com/search/docs/specialty/ecommerce" }, { title: "Google Search Central: Product structured data", url: "https://developers.google.com/search/docs/appearance/structured-data/product" }, { title: "Yandex Webmaster: Indexing analysis", url: "https://yandex.ru/support/webmaster/ru/site-indexing/page-indexing-analysis" }],
  },
  {
    slug: "seo-promotion-cost",
    title: "How much does SEO cost and what the price includes",
    description: "Compare SEO offers by scope, responsibility and verification instead of a monthly figure alone.",
    readerOutcome: "Know how to compare the work limits and acceptance method before agreeing a budget.",
    date: "2026-08-15",
    author: "KILENI Editorial",
    readingMinutes: 8,
    searchIntent: { label: "SEO cost", primaryQuery: "how much does SEO cost", relatedQueries: ["SEO monthly cost", "SEO pricing", "SEO agency pricing", "what is included in SEO", "SEO cost for small business"] },
    hero: hero("price", "en"),
    toc: [{ id: "scope", title: "Compare scope first" }, { id: "cost", title: "What affects cost" }, { id: "offer", title: "Read the proposal" }, { id: "control", title: "Control the work" }],
    sections: [
      { id: "scope", heading: "How much does SEO cost depends on the boundaries of the work", paragraphs: ["The question ‘how much does SEO cost’ cannot be answered honestly by a monthly figure alone. One supplier includes diagnosis, implementation, content and follow-up; another sells rank monitoring and a report. Those are different products even when both use the word SEO. Define the site type, template count, regions, languages, data access and who implements changes first.", "A small service website may begin with an audit and one implementation package. A catalogue or store adds categories, filters, product pages, stock data, structured data and control of many URLs. Ongoing work is useful when there is an agreed plan: what changes, what the client supplies and how publication is verified."], callout: { title: "Compare the unit of work", text: "Not ‘a month of SEO’, but concrete pages, templates, tasks, implementation owner and repeat check.", tone: "note" } },
      { id: "cost", heading: "Scale, access and implementation responsibility shape the price", paragraphs: ["Cost rises with the review and implementation volume, not with a decorative service name. Relevant factors include page types, technical stack, catalogue update rate, source-data quality, developer availability, regional variants, content approval and the need for a repeat crawl. When one template controls thousands of URLs, assess the risk and the template check before considering manual page work.", "List work outside the SEO budget separately: photography, design, development, advertising, media buying, translation and legal approval. That way the client sees what is included and the supplier does not hide additional scope under an undefined word such as ‘improvements’."], comparison: { columns: ["Question before start", "Why it matters", "How to record it"], rows: [{ label: "Which pages", left: "Defines scale and templates", right: "URL list and page types" }, { label: "Who implements", left: "Changes timing and ownership", right: "Roles, access and task format" }, { label: "How it is checked", left: "Prevents a report without an outcome", right: "Control URLs and acceptance criteria" }] } },
      { id: "offer", heading: "A proposal should explain the next paid outcome", paragraphs: ["A useful proposal names more than a plan name. It identifies the first work queue: issues to check, pages to change, material required from the client and the follow-up point. ‘Website optimisation’ is too broad when neither the scope, examples nor acceptance method can be seen.", "Be cautious about guaranteed rankings, fixed lead numbers or a secret method. Search performance also depends on demand, competitors, season, the offer and the site itself. A responsible supplier can commit to its process: agreed scope, quality of publication, transparent data and verification of completed changes."], bullets: ["Request a redacted example task table.", "Confirm whether implementation or recommendations only are included.", "Record client-response and developer dependencies.", "Set a date for the follow-up check and report format."] },
      { id: "control", heading: "Control SEO through completed changes and checkable evidence", paragraphs: ["Each work period should end with a short list: what changed, on which URLs, what remains and how the result was confirmed. Technical work can be checked through server responses, canonicals, sitemap, templates and control pages. Content work needs the published material, its structural role and a visitor path to the service or product.", "Price becomes clear when the client sees a sequence of decisions rather than an endless activity list. If an audit reveals separate implementation work, it can be estimated as a defined task and delivered in stages. That is clearer than hiding an unknown volume in a monthly fee.", "Before the work starts, agree the client inputs, revision rounds and boundaries. If new templates or integrations change the task after discovery, update the estimate and timing first. This keeps a budget controllable and prevents a monthly engagement from becoming an open-ended obligation. The final record should keep links to published pages and control checks, not only a summary presentation."], callout: { title: "Before paying", text: "Every paid stage should show its scope, limit, timing, owner and repeat-check method.", tone: "action" } },
    ],
    faq: [{ question: "Why do two agencies quote very different prices?", answer: "They may include different work: audit, implementation, content, store control or only reporting. Compare scope, not the tariff name." }, { question: "Can we start with an audit only?", answer: "Yes. An audit fixes the task list and lets implementation be estimated separately when scope is not yet known." }, { question: "Must SEO be paid monthly?", answer: "Only if there is recurring agreed work: new pages, technical control, structural development and measurement." }],
    cta: { title: "Define a clear first stage", text: "Describe the website and task; we will name the scope before work starts.", label: "Complete the brief", href: "/brief" },
    related: ["seo-audit-when-you-need-it", "seo-vs-yandex-ads", "seo-ecommerce-promotion"],
    sources: [{ title: "Yandex Wordstat: data and settings", url: "https://yandex.ru/support2/wordstat/en/" }, { title: "Yandex Wordstat: query operators", url: "https://yandex.ru/support2/wordstat/en/content/operators" }, { title: "Google Search Central: Do you need an SEO?", url: "https://developers.google.com/search/docs/fundamentals/do-i-need-seo" }],
  },
];
