# Технический QA / stress-test production KILENI

Дата проверки: 30 августа 2026 года, 16:04–16:40 MSK  
Проверенный production: `https://kileni-seo.ru`  
Режим: read-only. Код, production-конфигурация, цены, записи и пользовательские данные не изменялись. Реальные заявки и новые audit jobs не создавались.

## Release verdict

**FAIL — отдавать эту сборку заказчику как технически принятую пока нельзя.**

Подтверждено: **0 P0, 15 P1 и 15 P2**. Отдельно перечислены сценарии, которые нельзя было безопасно пройти без QA-среды или создания production-записей.

P0-блокеров уровня «сайт целиком недоступен» не найдено: публичные страницы, HTTPS, sitemap, базовая навигация, реальные переходы из pricing в brief и сохранённый audit result открываются. Однако найдены P1-дефекты в ключевом продукте бесплатного аудита, мобильной навигации, адаптивности, доступности и первом входе:

- результат аудита противоречит собственным данным и не объясняет итоговый балл;
- заявленные 30 проверок нельзя проверить как 30 отдельных результатов;
- выборка из 10 URL занята пятью парами RU/EN;
- pricing после переключения услуги продолжает показывать SEO-заголовок;
- fixed-price пакет в brief одновременно назван фиксированным и «уточняемым после ответов»;
- audit result имеет горизонтальный overflow на планшете;
- мобильное меню не блокирует фон и не удерживает фокус;
- на 320/360 px распадается счётчик `1 379` (P2);
- в нескольких утверждённых темах Axe подтверждает серьёзно недостаточный контраст;
- на Slow 4G фирменное вступление откладывает реальный hero примерно до 6,6 секунды, после чего экран перекрывается cookie-диалогом.

Главный E2E от запуска нового аудита до заявки в admin **не получил PASS**: условия запрещали создавать production jobs/лиды, а отдельная QA-среда, разрешённый QA-домен и disposable admin account не были предоставлены.

### Зафиксированная среда

| Параметр | Фактическое значение |
|---|---|
| Дата | 30.08.2026 |
| Исходный URL | `https://kileni-seo.ru` |
| Фактический origin после загрузки | `https://kileni-seo.ru` |
| Браузер | Playwright Chromium / HeadlessChrome `151.0.7922.34` |
| Desktop | 1440×900 для product-flow/audit; 1280×800 и 1440×1000 для общей UI-матрицы |
| Mobile / tablet | 320×720, 360×800, 390×844, 430×932, 768×1024, 1024×768 |
| Locale | `ru-RU`; automated integrity отдельно проверила RU/EN |
| Темы | Dark → Signal → Light; новая сессия — Dark |
| Сеть | без throttling; отдельно Slow 4G: RTT 150 мс, 1,6 Мбит/с down, 750 Кбит/с up, CPU 4× |
| WebKit / Safari | **NOT TESTED**: Playwright WebKit runtime на машине отсутствует; Safari не заявляется проверенным |

Основные артефакты:

- `../output/technical-qa-2026-08-30/audit-contracts/`
- `../output/technical-qa-2026-08-30/ui-matrix/`
- `../output/technical-qa-2026-08-30/performance/`
- `../output/technical-qa-2026-08-30/intro-cookies/`
- `../output/technical-qa-2026-08-30/root/`

## P0

Подтверждённых P0 не найдено. Это не означает PASS: перечисленные ниже P1 затрагивают доверие к основному продукту, мобильные сценарии и доступность.

## P1

### Завершённые 10/10 ошибочно названы «раньше запланированного лимита»

**Severity:** P1  
**URL:** `https://kileni-seo.ru/audit/<PUBLIC_TOKEN>` и соответствующий PDF  
**Browser:** Chromium 151  
**Viewport:** 1440×900  
**Theme:** Dark  

**Steps:**  
1. Открыть сохранённый публичный результат.
2. Сравнить `pageLimit`, `plannedPages`, `checkedPages`, `coverage.ratio` из API с текстом web/PDF.
3. Проверить формулировку причины частичного результата.

**Expected:** при лимите 10, плане 10, проверенных 10 и `coverage.ratio=1` написано, что лимит 10 страниц достигнут, а остальные URL не входили в бесплатную выборку.  

**Actual:** API одновременно отдаёт `terminal:true`, `status:"partial"`, `coverage 10/10`, а web/PDF пишут «Проверка завершена раньше запланированного лимита».  

**Evidence:** `../output/technical-qa-2026-08-30/audit-contracts/audit-contract-browser.json`, `audit-result-visible.txt`, `audit-report-page-1.png`.  

**Likely area:** преобразование terminal/partial state в пользовательский текст; это предположение, а не подтверждённая root cause.

### Итоговую оценку 97/100 нельзя восстановить из опубликованных данных

**Severity:** P1  
**URL:** `https://kileni-seo.ru/audit/<PUBLIC_TOKEN>`  
**Browser:** Chromium 151  
**Viewport:** 1440×900  
**Theme:** Dark  

**Steps:**  
1. Сравнить score с `issueCounts`, categories, публичными проверками и фактами по страницам.
2. Найти опубликованное основание каждого снятого балла.
3. Сравнить web/API/PDF.

**Expected:** из публичных фактов можно объяснить, почему оценка равна именно 97, либо отображается явный breakdown.  

**Actual:** score равен 97, замечаний 0, все пять категорий имеют `checked/low`, четыре показанных проверки — `10/10`, fail/warning отсутствуют. Источник снятых трёх баллов не опубликован.  

**Evidence:** `../output/technical-qa-2026-08-30/audit-contracts/audit-contract-browser.json`, `audit-result-visible.txt`, `audit-report.txt`.  

**Likely area:** формула score или сериализация breakdown; точная причина без внутренних данных не подтверждена.

### Заявленные 30 проверок не имеют проверяемого result contract

**Severity:** P1  
**URL:** `https://kileni-seo.ru/free-audit`, `/checks`, `/audit/<PUBLIC_TOKEN>`, `/api/audits/<PUBLIC_TOKEN>`  
**Browser:** Chromium 151 / API  
**Viewport:** 1440×900  
**Theme:** Dark  

**Steps:**  
1. Открыть методику «30 проверок».
2. Открыть API, public result и PDF завершённого аудита.
3. Сопоставить каждую заявленную проверку с ID и статусом.

**Expected:** каждая проверка имеет стабильный ID и статус `pass`, `fail`, `warning`, `not_run` или `insufficient_data`.  

**Actual:** sitemap содержит 30 страниц методики, но result API не содержит массива checks; пять категорий не имеют ID и детальных checks; UI показывает четыре агрегированных строки. Отсутствующую проверку нельзя отличить от pass/not_run/insufficient_data.  

**Evidence:** `../output/technical-qa-2026-08-30/audit-contracts/sitemap.xml`, `crawl-integrity.json`, `audit-contract-browser.json`, `audit-result-visible.txt`.  

**Likely area:** audit result schema и presentation mapping; точная root cause не подтверждена.

### Выборка 10 страниц занята пятью RU/EN-парами

**Severity:** P1  
**URL:** `https://kileni-seo.ru/audit/<PUBLIC_TOKEN>`  
**Browser:** Chromium 151 / API  
**Viewport:** 1440×900  
**Theme:** Dark  

**Steps:**  
1. Прочитать `result.checkedPages`.
2. Сгруппировать URL по шаблонам и языковым версиям.
3. Повторить GET сохранённого результата.

**Expected:** лимит охватывает разные важные шаблоны либо явно объясняет, почему языковые зеркала приоритетнее остальных страниц.  

**Actual:** проверены `/`+`/en`, `/services`+EN, `/seo-audit`+EN, `/seo-promotion`+EN, `/marketplaces`+EN. Pricing, cases, development, platform pages и blog не вошли. Выборка стабильна, но структурно узкая.  

**Evidence:** `../output/technical-qa-2026-08-30/audit-contracts/audit-repeat-consistency.json`, `audit-contract-browser.json`.  

**Likely area:** приоритеты page sampling; точная причина без алгоритма не подтверждена.

### При нуле замечаний web/PDF предлагают исправлять найденное

**Severity:** P1  
**URL:** `https://kileni-seo.ru/audit/<PUBLIC_TOKEN>` и PDF  
**Browser:** Chromium 151  
**Viewport:** 1440×900  
**Theme:** Dark  

**Steps:**  
1. Проверить `issueCounts.total` и раздел замечаний.
2. Дойти до следующего шага в web.
3. Сравнить его с последней страницей PDF.

**Expected:** при нуле замечаний предлагается расширить охват или проверить оставшиеся страницы.  

**Actual:** PDF пишет «Сначала исправьте замечания высокого приоритета», web — «Исправить найденное», хотя отчёт одновременно сообщает, что замечаний нет.  

**Evidence:** `../output/technical-qa-2026-08-30/audit-contracts/audit-result-visible.txt`, `audit-report-page-4.png`.  

**Likely area:** условный текст CTA/next step; точная root cause не подтверждена.

### Pricing сохраняет SEO-заголовок при выборе другой услуги

**Severity:** P1  
**URL:** `https://kileni-seo.ru/pricing`  
**Browser:** Chromium 151  
**Viewport:** 1440×900  
**Theme:** Dark  

**Steps:**  
1. Открыть pricing.
2. По очереди выбрать SEO-продвижение, Разработку, Яндекс Рекламу, Тексты и другую задачу.
3. Сравнить выбранную карточку с eyebrow, H1 и пояснением наверху.

**Expected:** весь контекст страницы соответствует выбранной категории; текст предыдущей категории исчезает.  

**Actual:** карточки и цены меняются, но верх страницы всегда остаётся «Стоимость SEO-аудита», «Сколько страниц нужно проверить?» и «Объём определяет глубину проверки».  

**Evidence:** `../output/technical-qa-2026-08-30/root/product-flows.json`, `pricing-разработка.png`, `pricing-яндекс-реклама.png`, `pricing-тексты-и-материалы.png`.  

**Likely area:** верхний контент pricing не связан с активным состоянием selector; точная реализация не исследовалась.

### Fixed-price пакет в brief одновременно назван фиксированным и уточняемым

**Severity:** P1  
**URL:** `https://kileni-seo.ru/brief?offer=seo-audit-50`, `seo-audit-200`, `seo-audit-500`  
**Browser:** Chromium 151  
**Viewport:** 1440×900  
**Theme:** Dark  

**Steps:**  
1. На pricing выбрать SEO-аудит с фиксированной ценой.
2. Перейти в brief.
3. Сверить package title, price, scope и пояснение под summary.
4. Reload, Back, Forward.

**Expected:** фиксированная цена остаётся фиксированной; уточняются только дополнительные работы или входные данные.  

**Actual:** summary правильно показывает 24 900 / 39 900 / 69 900 ₽ и сохраняется в истории, но рядом написано «Точный состав и цена — после ответов».  

**Evidence:** `../output/technical-qa-2026-08-30/root/handoff-history.json`, `offer-persistence.json`, `brief-from-pricing.png`.  

**Likely area:** общий текст brief применяется и к фиксированным offers; точная root cause не подтверждена.

### На 768 px audit result шире viewport

**Severity:** P1  
**URL:** `https://kileni-seo.ru/audit/<PUBLIC_TOKEN>`  
**Browser:** Chromium 151  
**Viewport:** 768×1024  
**Theme:** Dark, Signal, Light  

**Steps:**  
1. Открыть сохранённый audit result на ширине 768 px.
2. Переключить три темы.
3. Сравнить `documentElement.scrollWidth` и `clientWidth`.

**Expected:** `scrollWidth` не превышает 768, важные блоки не требуют горизонтальной прокрутки всей страницы.  

**Actual:** `scrollWidth=891`, `clientWidth=768` во всех трёх темах.  

**Evidence:** `../output/technical-qa-2026-08-30/ui-matrix/matrix-results-corrected.json`, `matrix-audit-result-768x1024-тeмная.png` и соседние theme screenshots.  

**Likely area:** min-width/grid/table внутри audit result; конкретный элемент требует локализации в DOM перед исправлением.

### Страница продолжает прокручиваться под открытым мобильным меню

**Severity:** P1  
**URL:** `https://kileni-seo.ru/`  
**Browser:** Chromium 151  
**Viewport:** 390×844  
**Theme:** Dark  

**Steps:**  
1. Прокрутить страницу до `scrollY=700`.
2. Открыть mobile menu.
3. Выполнить wheel/scroll, не закрывая меню.

**Expected:** фон заблокирован; `scrollY` не меняется.  

**Actual:** при открытом меню `body/html overflow=visible`, фон прокручивается с 700 до 1300.  

**Evidence:** `../output/technical-qa-2026-08-30/ui-matrix/navigation-scrolllock.json`, `navigation-results.json`, `navigation-mobile-scrolllock.png`.  

**Likely area:** mobile drawer не применяет scroll lock; точная root cause не подтверждена.

### Фокус клавиатуры выходит из открытого мобильного меню

**Severity:** P1  
**URL:** `https://kileni-seo.ru/`  
**Browser:** Chromium 151  
**Viewport:** 390×844  
**Theme:** Dark  

**Steps:**  
1. Открыть мобильное меню кнопкой.
2. Нажимать Tab после последней ссылки меню.
3. Закрыть меню клавишей Escape.

**Expected:** пока меню открыто, фокус остаётся внутри drawer; Escape закрывает меню и возвращает фокус на opener.  

**Actual:** после пунктов menu фокус переходит на CTA основного контента, затем на SVG-точки графика за overlay. Escape и возврат фокуса на opener работают.  

**Evidence:** `../output/technical-qa-2026-08-30/ui-matrix/navigation-results.json`, `navigation-mobile-390x844.png`.  

**Likely area:** в mobile drawer отсутствует focus trap; точная root cause не подтверждена.

### Skip-link меняет URL, но не переносит фокус в main

**Severity:** P1  
**URL:** `https://kileni-seo.ru/`  
**Browser:** Chromium 151  
**Viewport:** 390×844 и 1280×800  
**Theme:** Dark  

**Steps:**  
1. После загрузки нажать Tab: появляется «Перейти к содержимому».
2. Нажать Enter.
3. Проверить `document.activeElement` и продолжение Tab-порядка.

**Expected:** фокус перемещается на `#main-content`, и пользователь продолжает навигацию с основного содержимого.  

**Actual:** URL получает `#main-content`, но `activeElement` остаётся `BODY` без `:focus-visible` в обоих размерах.  

**Evidence:** `../output/technical-qa-2026-08-30/ui-matrix/focus-results-corrected.json`, `focus-corrected-first-390.png`, `focus-corrected-first-1280.png`.  

**Likely area:** target `#main-content` не получает программный фокус; точная root cause не подтверждена.

### В утверждённых темах есть серьёзно недостаточный контраст

**Severity:** P1  
**URL:** `/services`, `/brief`, `/about`, `/audit/<PUBLIC_TOKEN>`  
**Browser:** Chromium 151 + Axe  
**Viewport:** 390×844 и matrix viewports  
**Theme:** Dark / Signal / Light в зависимости от страницы  

**Steps:**  
1. Открыть указанные страницы в трёх темах.
2. Запустить Axe после стабилизации страницы.
3. Проверить метки, muted text, номера и подпись MAX.

**Expected:** обычный текст соответствует минимум WCAG AA 4.5:1; крупный — 3:1.  

**Actual:** Axe подтверждает serious `color-contrast`: `/services` Dark — 9 nodes и Signal — 2 nodes; `/brief` Signal — 4 nodes; `/about` Light — 1 node. Audit result: на 390 px Dark/Signal/Light — 21/21/11 nodes, на 1440 px — 10/10/10. Минимальные отношения: 1.41:1 у light partial badge, примерно 2.2:1 у eyebrow labels, 2.65:1 у подписи MAX, 2.93:1 у signal SEO-link; mono labels — 3.62–4.33:1.  

**Evidence:** `../output/technical-qa-2026-08-30/ui-matrix/matrix-results.json`, `audit-result-mobile-themes.json`, соответствующие screenshots.  

**Likely area:** theme tokens для muted/mono/accent text; конкретные переменные требуют проверки по исходникам.

### График добавляет 13 неочевидных Tab-остановок без видимого фокуса

**Severity:** P1  
**URL:** `https://kileni-seo.ru/`  
**Browser:** Chromium 151  
**Viewport:** 390×844 и 1280×800  
**Theme:** Dark  

**Steps:**  
1. Пройти страницу клавишей Tab от hero CTA.
2. Наблюдать последовательность фокуса на SVG-графике.
3. Проверить focus indicator и доступность scrollable region с клавиатуры.

**Expected:** график читается screen reader без десятков скрытых tab stops; интерактивные точки имеют видимый фокус; горизонтально прокручиваемая область доступна с клавиатуры.  

**Actual:** 13 SVG `<g>`-точек входят в Tab-порядок, но не показывают outline; scrollable graph region не получает клавиатурный фокус. Это создаёт длинный «невидимый» участок навигации.  

**Evidence:** `../output/technical-qa-2026-08-30/ui-matrix/focus-results-corrected.json`, `focus-corrected-first-390.png`.  

**Likely area:** `tabindex`/role для SVG points и focus style графика; точная root cause не подтверждена.

### Первый полезный экран на Slow 4G появляется слишком поздно

**Severity:** P1  
**URL:** `https://kileni-seo.ru/` и прямой вход на `/blog`  
**Browser:** Chromium 151  
**Viewport:** 390×844  
**Theme:** Dark  

**Steps:**  
1. Открыть чистый context без cookie choice.
2. Включить Slow 4G и CPU 4×.
3. Перейти на главную или прямую внутреннюю страницу.
4. Не взаимодействовать до появления hero и cookie dialog.

**Expected:** смысл страницы и основной следующий шаг доступны примерно за 2.5–3 секунды; декоративное intro не блокирует deep link.  

**Actual:** FCP 1.94 с показывает заставку. Реальный hero определяется примерно на 6.59 с и почти сразу перекрывается cookie-диалогом около 6.81 с. После этого доступ зависит от действия пользователя.  

**Evidence:** `../output/technical-qa-2026-08-30/performance/slow4g-summary.json`, `slow4g-before-cookie-choice.png`, `normal-first-frame-1200ms.png`, `blog-film-*.jpg`.  

**Likely area:** блокирующая длительность intro и последовательность показа consent UI; точная root cause не подтверждена.

### Intro создаёт длинные layout/script операции и пропуски кадров

**Severity:** P1  
**URL:** `https://kileni-seo.ru/`  
**Browser:** Chromium 151  
**Viewport:** 390×844  
**Theme:** Dark  

**Steps:**  
1. Включить Slow 4G + CPU 4×.
2. Начать performance trace до навигации.
3. Не взаимодействовать до завершения intro и появления cookie dialog.

**Expected:** motion использует compositor-friendly transform/opacity и не держит main thread задачами более 50 мс.  

**Actual:** trace содержит Layout 298 и 121 мс, EvaluateScript 111 мс, UpdateLayoutTree 51 мс, long task 113 мс и 94 dropped-frame markers; 70 пришлись на 1–3 секунды.  

**Evidence:** `../output/technical-qa-2026-08-30/performance/home-slow4g-trace.json`, `aggregated-results.json`, `slow4g-summary.json`.  

**Likely area:** layout measurements/DOM-SVG initialization во вступлении; minified trace не позволяет честно назвать конкретную функцию.

## P2

### Счётчик `1 379` ломается на две строки

**Severity:** P2  
**URL:** `https://kileni-seo.ru/`  
**Browser:** Chromium 151  
**Viewport:** 320×720 и 360×800  
**Theme:** Dark, Signal, Light  

**Steps:**  
1. Открыть главную после intro на 320 px.
2. Проверить числовой счётчик под фразой «Сначала факты».
3. Повторить на 360 px и в трёх темах.

**Expected:** значение `1 379` остаётся одной визуальной единицей.  

**Actual:** на первой строке видно `1 37`, последняя `9` переносится отдельно во всех трёх темах на обеих ширинах.  

**Evidence:** `../output/technical-qa-2026-08-30/ui-matrix/matrix-home-320x720-тeмная.png`, `matrix-home-360x800-тeмная.png` и варианты тем.  

**Likely area:** отсутствие `white-space: nowrap`/недостаточная ширина счётчика; это только вероятная область.

### PDF имеет коллизию текста и неудачный page break

**Severity:** P2  
**URL:** `https://kileni-seo.ru/api/audits/<PUBLIC_TOKEN>/report.pdf`  
**Browser:** PDF renderer / Poppler  
**Viewport:** A4  
**Theme:** n/a  

**Steps:**  
1. Скачать PDF завершённого результата.
2. Просмотреть страницы 1–3.
3. Сравнить заголовки и границы карточек.

**Expected:** подписи не пересекаются; карточка одной страницы не разрывается сразу после заголовка.  

**Actual:** «Техническая оценка выборки» сталкивается с `97/100 · A`; запись №5 начинается внизу страницы 2 и почти полностью продолжается на странице 3.  

**Evidence:** `../output/technical-qa-2026-08-30/audit-contracts/audit-report-page-1.png`, `audit-report-page-2.png`, `audit-report-page-3.png`.  

**Likely area:** PDF layout widths и keep-together pagination; точная root cause не подтверждена.

### Неизвестный audit token возвращает soft 404

**Severity:** P2  
**URL:** `https://kileni-seo.ru/audit/<UNKNOWN_VALID_FORMAT_TOKEN>`  
**Browser:** Chromium 151  
**Viewport:** 1440×900  
**Theme:** Dark  

**Steps:**  
1. Открыть неизвестный токен корректного формата.
2. Проверить UI и HTTP status HTML navigation.
3. Сравнить с API/PDF endpoints.

**Expected:** понятная error page и HTTP 404.  

**Actual:** UI показывает «Проверка не найдена», API/PDF возвращают 404, но HTML route отвечает 200. `x-robots-tag:noindex` снижает SEO-риск, но status неверен.  

**Evidence:** `../output/technical-qa-2026-08-30/audit-contracts/audit-invalid-token.png`, `audit-contract-browser.json`, `security-sanity.json`.  

**Likely area:** client-side not-found вместо server 404; точная root cause не подтверждена.

### API усекает unchecked URLs без явного contract-флага

**Severity:** P2  
**URL:** `https://kileni-seo.ru/api/audits/<PUBLIC_TOKEN>`  
**Browser:** API  
**Viewport:** n/a  
**Theme:** n/a  

**Steps:**  
1. Сравнить `pagesDiscovered-pagesChecked` с длиной `uncheckedUrls`.
2. Найти поля total/returned/truncated.

**Expected:** API явно сообщает об усечении или возвращает полный список.  

**Actual:** при 208 непроверенных URL массив содержит 25 без `uncheckedUrlsTotal`/`uncheckedUrlsTruncated`; web знает, что «25 показано», внешний consumer обязан догадываться.  

**Evidence:** `../output/technical-qa-2026-08-30/audit-contracts/audit-contract-browser.json`, `audit-result-visible.txt`.  

**Likely area:** public API schema; точная root cause не подтверждена.

### Внутренние ссылки `/seo` добавляют лишний 308

**Severity:** P2  
**URL:** `https://kileni-seo.ru/services`, `/en/services`  
**Browser:** HTTP crawler  
**Viewport:** n/a  
**Theme:** n/a  

**Steps:**  
1. Просканировать внутренние href.
2. Открыть ссылку «Перейти к SEO» в RU и EN.
3. Проверить redirect chain.

**Expected:** внутренняя ссылка сразу ведёт на конечный route.  

**Actual:** `/seo` → 308 `/seo-promotion`; EN аналогично. Redirect корректный, но лишний переход остаётся.  

**Evidence:** `../output/technical-qa-2026-08-30/audit-contracts/crawl-integrity.json`.  

**Likely area:** конфигурация links на services page; точная root cause не подтверждена.

### Выбор pricing не сохраняется в URL и сбрасывается после reload

**Severity:** P2  
**URL:** `https://kileni-seo.ru/pricing`  
**Browser:** Chromium 151  
**Viewport:** 1440×900  
**Theme:** Dark  

**Steps:**  
1. Выбрать SEO-продвижение или Разработку.
2. Скопировать URL и выполнить reload.
3. Проверить selected category.

**Expected:** выбранную категорию можно сохранить/расшарить, reload не меняет состояние.  

**Actual:** URL не меняется; после reload выбранное состояние сбрасывается на SEO-аудит.  

**Evidence:** `../output/technical-qa-2026-08-30/root/product-flows.json`.  

**Likely area:** pricing selection хранится только в component state; точная root cause не подтверждена.

### Неизвестный offer ID молча подменяется общим brief

**Severity:** P2  
**URL:** `https://kileni-seo.ru/brief?offer=web-business`  
**Browser:** Chromium 151  
**Viewport:** 1440×900  
**Theme:** Dark  

**Steps:**  
1. Открыть legacy/unknown offer `web-business`.
2. Проверить summary и URL.
3. Reload.

**Expected:** явное сообщение «пакет не найден» либо поддержанный alias на актуальный `development-business`.  

**Actual:** URL сохраняет `web-business`, но summary молча становится общим «Разработка сайта / Стоимость после короткого брифа». Актуальные production links используют `development-business` и работают.  

**Evidence:** `../output/technical-qa-2026-08-30/root/offer-persistence.json`, `pricing-offer-links.json`, `offer-web-business.png`.  

**Likely area:** fallback unknown offer; точная root cause не подтверждена.

### Бесконечные декоративные анимации не паузятся вне viewport

**Severity:** P2  
**URL:** `https://kileni-seo.ru/`  
**Browser:** Chromium 151  
**Viewport:** desktop  
**Theme:** Dark  

**Steps:**  
1. Завершить intro и выбрать необходимые cookies.
2. Снять Web Animations inventory в hero.
3. Прокрутить до `scrollY=4200`, подождать 2 секунды и вернуться.

**Expected:** бесконечные декоративные эффекты паузятся вне viewport.  

**Actual:** те же три infinite animations продолжили работать, включая `kileni-social-pulse` и `kileni-process-scan`; scanline оставался вне viewport. На обычном desktop видимой потери плавности steady-state не подтверждено.  

**Evidence:** `../output/technical-qa-2026-08-30/performance/animation-lifecycle.json`, `animations-offscreen.png`.  

**Likely area:** отсутствует lifecycle pause через visibility/IntersectionObserver; точная root cause не подтверждена.

### Dropdown услуг подкачивает несколько невыбранных направлений

**Severity:** P2  
**URL:** `https://kileni-seo.ru/` → `/services`  
**Browser:** Chromium 151  
**Viewport:** desktop  
**Theme:** Dark  

**Steps:**  
1. На Slow 4G раскрыть dropdown «Услуги».
2. Выбрать SEO.
3. Записать requests до появления H1.

**Expected:** критический сетевой путь приоритизирует выбранный route.  

**Actual:** одновременно отправлены RSC GET на `/services`, `/marketplaces`, `/custom-task`; H1 выбранной страницы всё же появился за 809 мс.  

**Evidence:** `../output/technical-qa-2026-08-30/performance/navigation-slow4g.json`, `slow4g-services-after-nav.png`.  

**Likely area:** Next Link prefetch скрытых dropdown links; точная конфигурация не проверялась.

### Публичный HTML глобально отдаётся с `no-store`

**Severity:** P2  
**URL:** `/`, `/blog`, `/services` и другие публичные routes  
**Browser:** Chromium 151 / HTTP  
**Viewport:** desktop  
**Theme:** Dark  

**Steps:**  
1. Проверить response headers публичного HTML.
2. Пройти `/services` → `/pricing` → Back.
3. Проверить Navigation Timing/BFCache reason.

**Expected:** публичный маркетинговый HTML допускает безопасную static/revalidation cache policy; приватные routes остаются `no-store`.  

**Actual:** HTML отвечает `private, no-cache, no-store, max-age=0, must-revalidate`. Хэшированные assets кэшируются правильно. BFCache также был ограничен test runtime, поэтому его неприменение нельзя приписать только заголовку, но `no-store` подтверждён независимо.  

**Evidence:** `../output/technical-qa-2026-08-30/performance/bfcache-check.json`, Lighthouse raw JSON.  

**Likely area:** глобальная dynamic/no-store политика Next.js; точная root cause не подтверждена.

### Accessible name footer links не включает видимый текст

**Severity:** P2  
**URL:** `https://kileni-seo.ru/`, footer  
**Browser:** Chromium 151 / Lighthouse Accessibility  
**Viewport:** mobile profile  
**Theme:** Dark  

**Steps:**  
1. Запустить Lighthouse accessibility.
2. Открыть unweighted audit `label-content-name-mismatch`.
3. Проверить logo, phone, Telegram, MAX и email links.

**Expected:** accessible name включает точный видимый текст, чтобы voice control и screen reader называли один объект одинаково.  

**Actual:** общий Lighthouse score равен 100, но unweighted audit фиксирует mismatch у перечисленных links.  

**Evidence:** `../output/technical-qa-2026-08-30/performance/lighthouse/home.json`.  

**Likely area:** избыточные `aria-label`; точная root cause не подтверждена.

### На мобильном audit result нельзя переключить тему

**Severity:** P2  
**URL:** `https://kileni-seo.ru/audit/<PUBLIC_TOKEN>`  
**Browser:** Chromium 151  
**Viewport:** 320–430 px  
**Theme:** Dark / Signal / Light  

**Steps:**  
1. Открыть audit result на 320, 360, 390 и 430 px.
2. Проверить наличие theme control.
3. Установить тему до перехода и повторить.

**Expected:** пользователь может сменить тему на самой странице результата либо получает доступный общий mobile menu.  

**Actual:** выбранная ранее тема наследуется и визуально применяется, но theme button на result page скрыт на mobile.  

**Evidence:** `../output/technical-qa-2026-08-30/ui-matrix/audit-result-mobile-themes.json`, `audit-result-mobile-320-*.png`.  

**Likely area:** responsive visibility controls result header; точная root cause не подтверждена.

### 404 без JavaScript отображается пустой страницей

**Severity:** P2  
**URL:** `https://kileni-seo.ru/qa-definitely-missing-20260830`  
**Browser:** Chromium 151, JavaScript disabled  
**Viewport:** 390×844  
**Theme:** Dark/default  

**Steps:**  
1. Отключить JavaScript.
2. Открыть неизвестный публичный route.
3. Проверить HTTP status, H1, main и путь назад.

**Expected:** SSR 404 с понятным текстом и ссылкой на главную.  

**Actual:** HTTP 404 честный, но страница визуально пустая: нет H1, main и links. С JavaScript обычная 404 работает корректно.  

**Evidence:** `../output/technical-qa-2026-08-30/ui-matrix/404-no-js-390x844.png`, `error-page-results.json`.  

**Likely area:** not-found контент скрыт до client hydration/animation completion; точная root cause не подтверждена.

### Megamarket остаётся в production marketplace structure

**Severity:** P2  
**URL:** `https://kileni-seo.ru/marketplaces`  
**Browser:** Chromium 151  
**Viewport:** 1440×900 и mobile matrix  
**Theme:** Dark  

**Steps:**  
1. Открыть marketplace hub.
2. Просмотреть доступные площадки.
3. Сравнить с текущей утверждённой структурой из тестового задания.

**Expected:** WB, Ozon и Яндекс Маркет; либо Megamarket явно подтверждён как актуальный.  

**Actual:** в production дополнительно существует Megamarket. Функциональной поломки не доказано; это расхождение продуктовой структуры, которое требуется подтвердить отдельно.  

**Evidence:** `../output/technical-qa-2026-08-30/root/marketplace-hub.png`, `../output/technical-qa-2026-08-30/ui-matrix/matrix-marketplaces-390x844-тeмная.png`.  

**Likely area:** marketplace content configuration; не техническая root cause.

### Заставка игнорирует фактическую тему Dark по умолчанию

**Severity:** P2  
**URL:** `https://kileni-seo.ru/`  
**Browser:** Chromium 151  
**Viewport:** 1440×900 и 390×844  
**Theme:** чистая сессия, фактическая тема Dark  

**Steps:**  
1. Открыть главную в новом чистом browser context.
2. Не взаимодействовать с заставкой.
3. Сравнить её фон с уже установленными `data-kileni-theme` и `color-scheme`, затем дождаться hero.

**Expected:** при заявленной теме Dark по умолчанию заставка использует согласованную тёмную палитру либо явно является независимым фирменным экраном без резкого визуального скачка.  

**Actual:** заставка заполняет экран светлым фоном `rgb(243, 245, 248)`, хотя в этот момент уже активны `data-kileni-theme="dark"` и `color-scheme: dark`; после неё фон резко меняется на `rgb(7, 17, 31)`.  

**Evidence:** `../output/technical-qa-2026-08-30/intro-cookies/intro-desktop-initial.png`, `intro-mobile-initial.png`, `theme-only.json`, `summary.md`.  

**Likely area:** палитра v9 intro / стили `.brand-intro-v9__scene`; точная root cause по production bundle не подтверждена.

## Performance

Все числа ниже — лабораторные Lighthouse/trace measurements, а не CrUX, RUM или полевые Core Web Vitals. INP не измерялся; TBT — только лабораторный proxy. Нагрузочный тест production-сервера намеренно не выполнялся.

| URL | Performance | Accessibility | Best Practices | SEO | FCP | LCP | CLS | TBT | Speed Index |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `/` | 94 | 100 | 100 | 100 | 1.67 с | 2.90 с | 0 | 54 мс | 3.20 с |
| `/free-audit` | 99 | 100 | 100 | 100 | 1.36 с | 1.66 с | 0 | 46 мс | 3.34 с |
| `/seo-audit` | 99 | 100 | 100 | 100 | 1.50 с | 1.80 с | 0 | 29 мс | 2.64 с |
| `/pricing` | 98 | 100 | 100 | 100 | 1.49 с | 1.94 с | 0 | 23 мс | 3.07 с |
| `/services` | 99 | 100 | 100 | 100 | 1.17 с | 1.63 с | 0 | 26 мс | 2.46 с |
| `/blog` | 94 | 100 | 100 | 100 | 1.64 с | 1.79 с | 0 | 26 мс | 5.48 с |

Повтор главной три раза: Performance 91–95, LCP 2.85–3.00 с, Speed Index 2.59–4.54 с, TBT 43–54 мс. Главная не достигает лабораторного ориентира LCP ≤2.5 с. `/blog` имеет хороший LCP, но SI 5.48 с из-за first-visit intro/cookie flow.

Положительно:

- CLS во всех шести Lighthouse runs равен 0;
- TBT низкий: 23–54 мс;
- steady-state desktop не показал интервалов кадров >32 мс;
- hashed JS/CSS имеют `public, max-age=31536000, immutable`;
- `prefers-reduced-motion: reduce` реально убирает animations и оставляет контент доступным;
- внутренние страницы имеют лабораторный LCP 1.63–1.94 с.

Raw evidence: `../output/technical-qa-2026-08-30/performance/`.

## Responsive matrix

Автоматическая screenshot/DOM-матрица прошла восемь routes (`/`, `/free-audit`, `/pricing`, `/services`, `/about`, `/brief`, `/marketplaces`, audit result) в трёх темах. Использованы 320×720, 360×800, 390×844, 430×932, 768×1024, 1024×768, 1280×800, 1440×1000. Отдельные product flows выполнены на 1440×900.

| Viewport | Реально проверено | Результат |
|---|---|---|
| 320×720 | 8 routes × 3 themes | FAIL: счётчик переносится; audit theme control скрыт; contrast issues |
| 360×800 | 8 routes × 3 themes | FAIL: счётчик переносится; audit theme control скрыт |
| 390×844 | 8 routes × 3 themes + mobile nav/focus | FAIL: menu scroll/focus, graph tab stops, contrast |
| 430×932 | 8 routes × 3 themes | FAIL: audit theme control скрыт |
| 768×1024 | 8 routes × 3 themes | FAIL: audit result 891 px шириной при viewport 768 |
| 1024×768 | 8 routes × 3 themes | PASS по общему overflow; отдельные a11y defects остаются |
| 1280×800 | 8 routes × 3 themes + desktop nav | PASS по layout/navigation; pricing context FAIL |
| 1440×900 | product/pricing/brief/audit flows | PASS по основным переходам; pricing/brief/audit content FAIL |
| 1440×1000 | 8 routes × 3 themes | PASS по общему layout |

`matrix-results.json` содержит исходную 192-combination матрицу; `matrix-results-corrected.json` — повторную проверку спорных tablet flags. Offscreen элементы горизонтального carousel не считались общим page overflow без ручного подтверждения.

## Browser matrix

| Browser | Статус | Комментарий |
|---|---|---|
| Chromium 151, desktop | TESTED | 1280×800, 1440×900; общая matrix также 1440×1000 |
| Chromium 151, mobile emulation | TESTED | 320, 360, 390, 430 px |
| Chromium 151, tablet | TESTED | 768×1024, 1024×768 |
| Playwright WebKit | NOT TESTED | Runtime отсутствует |
| Реальный Safari | NOT TESTED | Не был доступен; Safari-pass не заявляется |

Console/network: в root product/brief/marketplace flows нет `console.error`, uncaught exceptions или неожиданных ≥400 responses. Aborted Next RSC prefetch requests отдельно не считались дефектом.

## Intro и cookies

Проверка выполнена в чистых contexts на 1440×900 и 390×844, Chromium 151.

### Intro

- Обычный desktop: состояние `pending` примерно до 1.97 с, `play` около 2.07 с, `done` около 6.05 с.
- Обычный mobile: `play` около 1.81 с, `done` около 5.88 с.
- `prefers-reduced-motion: reduce`: состояние `reduced` около 1.77 с, `done` около 2.08 с; важный контент доступен.
- Во время `play` generic click, wheel, Escape, Tab, явная skip-button и touch реально завершают intro; cookie dialog появляется в пределах примерно 0.55–0.76 с после input. Не подтверждено состояние, где skip выглядит рабочим, но игнорирует действие.
- После завершения устанавливается только session marker `kileni:intro:v9=1`; refresh и Back/Forward не переигрывают заставку в той же вкладке.
- `?intro=1` принудительно запускает повтор.
- Новый browser session/context без marker снова показывает intro.
- Cookie panel появляется после завершения/пропуска intro, что соответствует требованию «cookies после анимации».

Performance-дефекты блокирующей длительности и dropped frames описаны в P1 выше.

### Cookies и фактический storage/network

- До выбора consent localStorage пуст. Единственная cookie — first-party `kileni_csrf`, `HttpOnly`, `Secure`, `SameSite=Strict`, path `/`; она используется как обязательная защита форм.
- До согласия зафиксированы requests только к `kileni-seo.ru`; сторонних analytics/marketing hosts и запросов нет.
- «Принять все» сохраняет `kileni-cookie-preferences:v2` с `essential/analytics/marketing=true`; выбор переживает reload и новую вкладку того же browser context.
- «Только необходимые» сохраняет `analytics=false`, `marketing=false`; после reload значение сохраняется, внешних запросов нет.
- «Настроить» позволяет сохранить, например, analytics=true/marketing=false. Footer-кнопка повторно открывает panel, чекбоксы отражают выбор; изменение на analytics=false/marketing=true сохраняется после reload.
- Поскольку аналитика и маркетинговые инструменты сейчас фактически не подключены, даже «Принять все» не создаёт external requests. Это соответствует тексту panel; consent не следует трактовать как доказательство загрузки аналитики.
- Новая чистая session снова получает panel. Default theme при чистом context — Dark даже при системной Light; theme cycle сохраняется в `kileni:theme:v1` и переживает reload.

Итог cookies: **PASS** для текущей конфигурации без подключённой аналитики/маркетинга. При будущем подключении Яндекс Метрики/другого tracker нужна повторная проверка pre-consent network.

Evidence: `../output/technical-qa-2026-08-30/intro-cookies/results.json`, `focused-checks.json`, screenshots и `summary.md`.

## E2E matrix

| Сценарий | Статус | Фактический результат / ограничение |
|---|---|---|
| Production origin | PASS | Фактический origin `https://kileni-seo.ru` |
| Home → Free audit | PASS | Link/form доступны; пустое поле блокируется |
| Intro обычный/skip/input/reduced/session | PASS с performance P1 | Все inputs завершают intro; session persistence работает; обычная длительность слишком велика на слабой сети |
| Cookie consent/storage/network | PASS для текущей конфигурации | До consent только first-party necessary CSRF; third-party analytics/marketing отсутствуют; выборы и footer reopening работают |
| Empty URL validation | PASS | POST/job не создаётся, видимое «Укажите адрес сайта» |
| URL matrix + SSRF | NOT TESTED | Нужен POST; production job создавать запрещено |
| Fixture 1/4/10/>10/sitemap/errors | NOT TESTED | Нет отдельной QA crawler environment |
| Start audit → job → fullscreen/progress | NOT TESTED | Новая production job не создавалась |
| SSE reconnect/fallback/offline | NOT TESTED | Требуется активная безопасная QA job |
| Saved audit result refresh | PASS | Relevant API contract стабилен на трёх GET |
| Score consistency web/API/PDF | FAIL | Значение совпадает, но его нельзя объяснить фактами |
| 30 checks data contract | FAIL | Нет массива 30 checks с ID/status |
| Page sample stability | PASS/FAIL | Stable при повторных GET, но выборка структурно узкая |
| PDF HTTP/MIME/open/Cyrillic/PII | PASS | 200, `application/pdf`, читается, PII/internal data не найдено |
| PDF layout/content | FAIL | Overlap, page break, противоречивый next step |
| Email accepted/delivered/bounced | NOT TESTED | Нет разрешённого QA send/mailbox/provider delivery status |
| Pricing: все 6 categories | FAIL | Cards меняются, H1/context остаётся SEO |
| Pricing → actual offer → brief | PASS | Реальный click и URL `offer=seo-audit-50` прошли |
| Brief Back/Forward/Reload | PASS | Offer/price/duration/scope сохраняются |
| Fixed price wording | FAIL | «Точный состав и цена — после ответов» |
| Legacy `web-business` | FAIL | Молча падает в generic summary |
| Marketplace hub → Ozon → Back/Forward | PASS | URL/DOM/state согласованы |
| WB/Yandex marketplace paid handoff | NOT TESTED | Не выполнялся полный real-click flow каждого offer |
| Desktop dropdown/Escape/outside/keyboard | PASS | Open/close/Enter/Tab работают |
| Mobile menu | FAIL | Нет background scroll lock/focus trap |
| Theme switch/reload/new tab | PASS | Default Dark; порядок и применение тем подтверждены matrix; `kileni:theme:v1` сохраняется после reload |
| RU/EN automated integrity | PASS | 105 RU + 105 EN, hreflang reciprocal, lang/canonical clean |
| No-JS main pages | PASS | Home/services/SEO/pricing/case/article имеют H1/text/links |
| No-JS 404 | FAIL | HTTP 404, но визуально пусто |
| Public crawl | PASS с P2 | 210/210 sitemap URL 200; 0 broken targets/anchors; 2 internal 308 |
| Admin public guard/noindex | PASS | Без session → 307 login; admin исключён из sitemap/robots |
| Admin login/rate-limit/logout/session | NOT TESTED | Нет disposable QA account; нельзя мутировать production limiter/session |
| Admin audits/leads/briefs/details/notes/status/export | NOT TESTED | Требует authorized isolated QA mode; notes/status — production mutation |
| Contact/custom/calculator real submit | NOT TESTED | Реальные лиды создавать запрещено |
| Duplicate click/500/429/retry | NOT TESTED | Нужна QA backend environment |
| Полный final release flow до admin | NOT TESTED | Нельзя честно поставить общий PASS без QA environment |

## Accessibility

Подтверждено:

- Axe `serious color-contrast` на `/services` Dark/Signal, `/brief` Signal, `/about` Light и audit result во всех темах.
- На audit result отдельные muted labels имеют около 2.2:1; blue mono labels — 3.62–3.85:1 вместо 4.5:1.
- 13 SVG points попадают в Tab-порядок без видимого focus ring; scrollable region графика не keyboard-focusable.
- Mobile menu не является полноценным modal drawer: Tab выходит на фон.
- Lighthouse score 100 не отменяет unweighted `label-content-name-mismatch` у footer links.

Что прошло:

- первый Tab открывает видимую skip link «Перейти к содержимому»;
- основные header/CTA controls имеют заметный focus outline;
- desktop services dropdown открывается Enter, первый Tab попадает на SEO, Escape/click-outside закрывают;
- reduced motion сохраняет H1, текст и CTA.

Не проверено полноценно: screen reader, VoiceOver, audit live-region announcements во время реальной job, modal semantics cookie settings во всех состояниях, физическая touch/assistive tech связка.

## Security sanity

Только безопасные проверки, без penetration test.

PASS:

- HTTP → HTTPS 308; `www` → apex 301;
- TLS 1.2/1.3 verify OK; сертификаты apex/www действительны до 21.11.2026;
- HSTS `max-age=31536000; includeSubDomains`;
- CSP, `frame-ancestors 'none'`, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy, COOP присутствуют;
- mixed content на публичных sitemap pages не найден;
- admin без session закрыт и noindex;
- audit result имеет `noindex,nofollow,noarchive`, API/PDF — `no-store`;
- audit/admin/API отсутствуют в sitemap;
- неизвестный корректно сформированный token: API/PDF 404; malformed token 400;
- до cookie-consent существует только first-party `kileni_csrf` с `HttpOnly`, `Secure`, `SameSite=Strict`, path `/`; сторонних analytics/marketing requests до и после выбора не зафиксировано, потому что такие инструменты сейчас не подключены.

Ограничения/риски:

- SSRF validation localhost/private IP/metadata IP **NOT TESTED**, потому что надёжная проверка потребовала бы POST/job;
- `script-src 'unsafe-inline'` ослабляет CSP, но exploit не проверялся и уязвимость не заявляется;
- auth/session cookie flags не проверялись без входа в admin; consent хранится в versioned `localStorage`, а не в cookie;
- brute force/rate-limit не выполнялись.

## SEO technical sanity

Automated integrity, без повторного контентного SEO-аудита:

- sitemap: **210/210 URL → HTTP 200**, без redirects;
- 105 RU + 105 EN;
- отсутствующие title/description/canonical: 0;
- canonical relative/mismatched: 0;
- страницы с H1 count ≠ 1: 0;
- noindex URL в sitemap: 0;
- lang mismatch: 0;
- mixed-content references: 0;
- hreflang `ru/en/x-default`: missing 0, non-reciprocal 0, unavailable target 0;
- 250 уникальных internal targets: broken links 0, broken anchors 0;
- два описанных internal 308 `/seo`.

Реальная индексация в Яндекс/Google и Search Console не проверялась.

## Что работает особенно хорошо

- Все 210 публичных sitemap URL отвечают 200; структура RU/EN, canonical и hreflang технически согласованы.
- HTTPS/TLS, закрытие admin, noindex audit/admin и базовые security headers настроены аккуратно.
- Actual pricing offer IDs передаются в brief, сохраняют price/duration/scope через reload и Back/Forward; internal slug не показывается пользователю.
- Marketplace Ozon real-click и browser history работают согласованно.
- PDF технически скачивается корректно: MIME, filename, A4, кириллица, отсутствие JavaScript/PII/internal data.
- Saved audit result стабилен на повторных GET и не меняет score/выборку после refresh.
- No-JS оставляет основной контент, цены первой категории, кейс, статью, ссылки и контакты на ключевых публичных routes.
- Reduced motion реализован реально, а не только декларативно: animations исчезают, важный контент остаётся.
- Внутренние страницы быстрые в лабораторном mobile Lighthouse; CLS 0 и TBT низкий.
- Desktop dropdown и обычные focus outlines работают предсказуемо.

## Непроверенные функции

Следующие функции нельзя считать прошедшими:

1. Создание audit job, URL/SSRF matrix и crawler fixtures.
2. Fullscreen/collapse/reopen, progress correctness, active elapsed time, SSE reconnect/polling, offline recovery.
3. Повторный запуск одного audit и защита от duplicate jobs.
4. Реальная отправка email: SMTP accepted, provider delivered, mailbox received, bounce.
5. Authenticated admin login, успешные/неуспешные попытки, 429 policy, logout/session expiry.
6. Admin details, notes, status changes, export и public link из авторизованной сессии.
7. Реальные submits contact/callback/brief/custom/calculator и защита от double submit/500/429/retry.
8. Полный final flow `Home → audit → result → PDF → paid audit → brief → submit → admin`.
9. Реальный Safari/WebKit.
10. Физические iOS/Android устройства, VoiceOver/TalkBack.
11. Server load/stress test и полевые Core Web Vitals/INP.
12. 500/error boundary fixture: безопасного production trigger не было.
13. Отдельная callback-форма не была найдена в публичном DOM; contact, custom-task, calculator и free-audit инвентаризированы структурно, но без реальной отправки.
14. Rapid spam для theme/language switch и параллельные повторные действия отдельно не автоматизировались; обычный theme cycle, reload и navigation прошли.

## Что может найти заказчик за первые 15 минут самостоятельного тыканья сайта?

С высокой вероятностью:

1. На pricing выбрать «Разработка» или «Яндекс Реклама» и увидеть сверху SEO-текст про количество проверяемых страниц.
2. Перейти из фиксированной цены в brief и прочитать, что «точная цена» появится только после ответов.
3. Открыть audit result и не понять, откуда взялось 97/100 при нуле замечаний и где результаты обещанных 30 проверок.
4. Увидеть, что отчёт говорит «завершён раньше лимита», хотя проверено 10/10.
5. Скачать PDF и заметить наложение текста/неудачный разрыв карточки.
6. На узком телефоне увидеть распавшийся счётчик `1 379`; на планшете — горизонтальную прокрутку audit result.
7. В мобильном меню прокрутить фон или уйти Tab-ом в скрытую страницу.
8. На слабой мобильной сети ждать hero около 6.6 секунды, а затем получить блокирующий cookie dialog.
9. В чистой сессии увидеть светлую заставку, которая резко переключается на фактическую тёмную тему сайта.

## Могу ли я рекомендовать отдавать эту сборку заказчику завтра?

**Нет.** Минимум перед передачей: исправить P1 по audit contract/copy, pricing context, fixed-price brief wording, mobile menu, audit tablet overflow, счётчик и контраст; затем повторить критический E2E в отдельной QA-среде с разрешённым доменом, почтовым ящиком и disposable admin account. После этого нужен короткий regression-run Chromium и реальный Safari/iPhone smoke-test.
