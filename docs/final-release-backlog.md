# Единый арбитражный backlog KILENI

**Production:** `https://kileni-seo.ru`  
**Дата арбитража:** 30 августа 2026 года  
**Источники:** `user-audit.md`, `seo-expert-audit.md`, `cro-ux-audit.md`, `technical-qa-audit.md`, `competitor-attack-audit.md`  
**Режим:** только сведение уже собранных доказательств. Новый crawl, новые формы, код и production не использовались и не изменялись.

Статусы в документе:

- `CONFIRMED` — подтверждено наблюдением или измерением;
- `CURRENTLY FIXED` — поздняя проверка подтвердила исправленное состояние;
- `HYPOTHESIS` — обоснованное предположение без данных о фактическом влиянии;
- `NOT TESTED` — сценарий не проходился в допустимой среде;
- `DEFER` — полезно, но не входит в ближайший релиз;
- `DO NOT CHANGE` — подтверждённое решение, которое нельзя случайно сломать.

Приоритеты:

- `P1 / RELEASE BLOCKER` — мешает технической приёмке текущей сборки;
- `P2 / BEFORE PAID TRAFFIC` — нужно закончить до масштабного привлечения трафика;
- `P3 / NEXT PRODUCT ITERATION` — улучшение следующего продуктового цикла;
- `STRATEGIC` — долгосрочная система, не релизный патч.

# Executive verdict

**Сейчас передавать сайт заказчику как технически принятый релиз рано.** P0-дефектов нет: production доступен по HTTPS, 210/210 sitemap URL отвечают `200`, RU/EN canonical и hreflang согласованы, основной HTML доступен без JavaScript, бесплатный результат, PDF, бриф и админка существуют как связанный продукт. Но центральный продукт — бесплатный аудит — противоречит собственным данным, не позволяет воспроизвести score и не показывает обещанные 30 проверок как 30 результатов. Дополнительно подтверждены release-дефекты планшетной адаптации, мобильного меню, клавиатурной доступности, контраста и первого входа на слабой сети.

Нужен не новый редизайн, а исправление общих контрактов и затем их единое отображение. Ключевой порядок:

```text
Audit schema
→ score breakdown
→ web result
→ PDF
→ admin
→ case evidence

Offer catalog
→ pricing
→ brief
→ summary / admin / письмо
```

Коммерчески KILENI сейчас наиболее убедителен для малого и среднего бизнеса, которому нужен понятный технический подрядчик с контролируемым бюджетом. Не следует изображать enterprise-агентство, обещать SLA 24/7, резерв из сотен сотрудников или широкую отраслевую экспертизу, пока этого нет в реальных данных.

Решение по внутренним score кейсов: **вариант B**. Воспроизводимые факты должны быть главным доказательством; внутренний индекс можно оставить вторичным, только с явной пометкой «внутренняя шкала, не показатель поисковой системы» и ссылкой на версию методики. Пока формулы нет, `35→93` и `37→80` не должны быть главным числом кейса.

# Already fixed

Эти пункты не возвращать в открытый backlog без нового воспроизводимого доказательства.

| ID | Что было в раннем отчёте | Позднее подтверждённое состояние | Решение |
|---|---|---|---|
| `FIX-01` | Аудит 39 900 ₽ превращался в брифе в 24 900 ₽ | Поздний CRO и технический QA подтвердили: точный offer ID, название, цена, срок и scope сохраняются через Reload, Back и Forward | `CURRENTLY FIXED`; открыт только неверный текст «точная цена после ответов» |
| `FIX-02` | `/free-audit` и header обрезались на 320 px | Поздняя матрица не воспроизвела общий page overflow; прежние снимки остаются историческим доказательством | `CURRENTLY FIXED`, но оставить узкий visual regression на внутренний clip |
| `FIX-03` | `/custom-task` обещал уже указанную цену, хотя был индивидуальный расчёт | Поздний CRO подтверждает, что фиксированная цена больше не обещана | `CURRENTLY FIXED`; остаётся только microcopy одной карточки под заголовком «Варианты» |
| `FIX-04` | График не был обозначен как демонстрация | Подпись «пример визуализации, не результат конкретного сайта» уже присутствует | `CURRENTLY FIXED`; визуальную иерархию подписи оценивать отдельно |
| `FIX-05` | В словаре не было быстрого поиска | Поиск словаря и фильтр блога работают мгновенно | `CURRENTLY FIXED`; открыт только смешанный RU/EN алфавит |
| `FIX-06` | Светлый текст на светлом фоне в `/custom-task` | В Light и Dark на 320 px проблема не воспроизведена | `CURRENTLY FIXED` |
| `FIX-07` | Cookies могли считаться сломанными | Технический QA подтвердил правильную последовательность, storage и отсутствие сторонних запросов до consent | `CURRENTLY FIXED`; это защищённый regression baseline |
| `FIX-08` | Reduced motion был непроверен | Технический QA подтвердил: лишнее движение отключается, H1, текст и CTA остаются | `CURRENTLY FIXED`; не ломать |
| `FIX-09` | Early skip мог выглядеть доступным до готовности | Один CRO-tap не сработал до полной загрузки, но более широкий технический тест не воспроизвёл состояние «кнопка видна и игнорирует действие»; click, wheel, Escape, Tab, touch и skip во время `play` работают | Не держать отдельным blocker; readiness включить в performance regression |
| `FIX-10` | Сомнение в базовой индексируемости сайта | 210/210 sitemap URL отвечают `200`; массовых `noindex`, пустого SSR, canonical/hreflang ошибок нет | `CURRENTLY FIXED` как техническая база; фактический индекс Яндекса/Google без кабинетов всё ещё `NOT TESTED` |

# Release blockers

## `AUDIT-01` — Audit Result Contract v2

**Problem.** Один корень объединяет жалобы на `97/100`, неясные минус 3 балла, отсутствие 30 строк результатов, ошибочный текст при 10/10 и смешение разных категорий качества. Сейчас отсутствие строки нельзя отличить от `pass`, `not_run` или `insufficient_data`.

**Why now.** Бесплатный аудит — главный продукт входа. Невоспроизводимый score разрушает основное обещание «сначала факты» и даёт конкуренту самый простой аргумент: «цифры назначены системой».

**Affected routes.** `/free-audit`, `/checks`, `/checks/*`, `/audit/{token}`, `/api/audits/{token}`, `/api/audits/{token}/report.pdf`, audit details в `/admin/audits/*`.

**Evidence.** `seo-expert-audit.md` P1.1–P1.2; `technical-qa-audit.md` P1 «10/10», «97/100», «30 проверок»; `cro-ux-audit.md` P1.6; `competitor-attack-audit.md` high-risk attack №3.

**Normative contract.** Каждая версия движка должна иметь реестр реально существующих проверок. Для каждой строки результата:

```text
checkId
checkVersion
category
status
value
expected
severity
scoreImpact
urlEvidence
explanation
automationLimit
```

Допустимые статусы:

```text
pass
warning
fail
not_run
insufficient_data
```

Сводка результата:

```text
pagesDiscovered
pagesSelected
pagesChecked
pagesNotChecked
selectionReason
coverageStatus
score
scoreBreakdown
engineVersion
```

Обязательная семантика:

- отсутствующая строка не считается `pass`;
- `not_run` означает, что проверка не запускалась;
- `insufficient_data` означает, что проверки публичной части недостаточно для вывода;
- оба статуса по умолчанию не штрафуют score; если политика другая, штраф должен быть видимым и объяснённым;
- `scoreBreakdown` содержит стартовое значение, каждое списание, check ID, вес и URL-доказательство;
- общий score остаётся вторичной сводкой после категорий и конкретных замечаний;
- состояние запуска и покрытие инвентаря разделяются: `sample_complete` при `pagesChecked = pagesSelected`, даже если на сайте найдено больше URL; `sample_partial` — только если выбранная выборка не завершена;
- web, API, PDF и admin читают один immutable snapshot результата.

**Decision on «30 проверок».** Формулировку можно сохранить, потому что в текущей методике реально опубликованы 30 проверок. Условие: каждый результат показывает все 30 утверждённых check ID и их фактический статус. Если версия движка запускает другое число методик, число в интерфейсе должно браться из versioned registry, а не быть жёстким слоганом.

**Exact acceptance criteria.**

- В API присутствует ровно полный реестр проверок текущей `engineVersion`; нет неявных pass.
- Пользователь может пересчитать итоговый score по опубликованному breakdown до целого балла.
- При 10/10 написано «бесплатный лимит достигнут»; текст «завершено раньше лимита» не появляется.
- `not_run` и `insufficient_data` явно видны и объяснены простыми словами.
- Web, PDF и admin показывают одинаковый score, статусы, coverage и версию.

**Regression tests.** Fixtures: all-pass, warning, fail, `not_run`, `insufficient_data`, 10/10, 4/10, terminal error; schema test полного registry; автоматическая проверка `score = public formula`; parity web/API/PDF/admin.

**Dependencies.** Реальная scoring policy от владельца; versioned check registry; затем presentation mapping.

## `AUDIT-02` — детерминированная выборка 10 URL

**Problem.** Текущие 10 URL заняты пятью RU/EN-парами и представляют лишь пять шаблонов. Пользователь не видит, почему выбраны именно они.

**Why now.** Формально лимит выполнен, но продукт выглядит поверхностнее обещания. Формулу score нельзя честно исправить, не определив, что именно оценивалось.

**Affected routes.** Audit crawler/sampler, `/audit/{token}`, PDF, admin audit details.

**Evidence.** В выборку вошли `/`+`/en`, `/services`+EN, `/seo-audit`+EN, `/seo-promotion`+EN, `/marketplaces`+EN; pricing, cases, blog, platform detail и development не попали.

**Deterministic sampling policy.** Сначала классифицировать URL по типу страницы и сигнатуре шаблона, затем выбирать по фиксированному порядку:

1. homepage;
2. ключевая коммерческая страница;
3. вторая коммерческая страница другого шаблона;
4. pricing/contact или другая conversion-support page;
5. category/hub;
6. detail/product/service/platform page;
7. case;
8. blog/article;
9. уникальный для сайта шаблон — каталог, карточка, калькулятор и т.п.;
10. одна alternate-locale/control page, только после покрытия разных шаблонов.

Это не список жёстких URL. Классификация использует sitemap, навигационную глубину, schema/type, URL pattern и template signature. RU/EN alternate сначала входят в одну template family. При отсутствии десяти типов свободные места заполняются следующими важными URL по стабильной сортировке.

**Exact acceptance criteria.**

- Для одного неизменного инвентаря повторный запуск даёт тот же набор и порядок.
- Разные шаблоны выбираются раньше языковых дублей.
- У каждого выбранного URL есть `pageType` и `selectionReason`.
- Отчёт отдельно показывает найденные, выбранные, проверенные и не вошедшие URL.
- Для лендинга с 1–9 URL алгоритм не создаёт ложную «неполноту».

**Regression tests.** Fixtures на 1/4/10/>10 URL; multilingual site; sitemap с ошибками; e-commerce/catalog; повторяемость; ручной expected set для KILENI-like inventory.

**Dependencies.** `AUDIT-01`; классификатор типов страниц; решение, допускаются ли пользовательские приоритетные URL в бесплатном формате.

## `AUDIT-03` — единый web/PDF/admin результат и печатный отчёт

**Problem.** При нуле проблем CTA предлагает «Исправить найденное»; PDF повторяет неверный следующий шаг, имеет коллизию текста и плохой page break; API молча усекает unchecked URLs; на 768 px web-result имеет ширину 891 px.

**Why now.** Это прямой артефакт, по которому пользователь судит о качестве платного аудита. PDF сейчас технически скачивается, но визуально и смыслово не принят.

**Affected routes.** `/audit/{token}`, `/api/audits/{token}`, `/api/audits/{token}/report.pdf`, `/admin/audits/{id}`.

**Evidence.** Technical QA: PDF page 1 overlap, запись №5 разорвана между страницами 2–3; `scrollWidth=891` при 768; 208 unchecked URL, API возвращает 25 без contract-флага; web/PDF CTA противоречит нулю замечаний.

**Exact acceptance criteria.**

- При `issues=0` следующий шаг — «Проверить остальные страницы» или «Получить полный аудит», а не «исправить найденное».
- При warning/fail CTA соответствует фактическому приоритету и ведёт к релевантному продукту.
- `pagesNotChecked` сообщает `total`, `returned`, `truncated` и список/пагинацию; UI не выдаёт показанные 25 за полный перечень.
- PDF не содержит пересечений, orphan-heading и разрыва карточки сразу после заголовка.
- Web-result не создаёт page overflow на 320–1440 px в Dark/Signal/Light.
- PDF и web используют один снимок, одинаковые понятные термины и не содержат PII/internal paths.

**Regression tests.** PDF-to-PNG snapshots всех страниц; text extraction; 0/low/high issues; 0/25/26/200+ unchecked; responsive/theme matrix; сравнение сериализованного snapshot между web/PDF/admin.

**Dependencies.** `AUDIT-01`, затем общий report presenter; PDF pagination.

## `PRODUCT-01` — единый каталог предложений и SEO-архитектура

**Problem.** Формат работы и объём смешаны; `/seo` воспринимается как общий SEO-hub, но ведёт в продвижение; marketplace отсутствует в общей цене; неизвестный offer молча превращается в generic brief.

**Why now.** Пользователь должен понимать, что он покупает, до заполнения формы. Сейчас логика существует, но разбросана между `/services`, `/seo-audit`, `/seo-promotion`, `/pricing` и `/brief`.

**Affected routes.** Header, `/services`, `/seo`, `/seo-audit`, `/seo-promotion`, `/pricing`, `/brief*`, `/marketplaces*`.

**Evidence.** `cro-ux-audit.md` фиксирует несоответствие hero выбранной категории и отсутствие marketplace в общем ценовом пути; `technical-qa-audit.md` подтверждает молчаливый fallback неизвестного `offer`; `user-audit.md` и `competitor-attack-audit.md` независимо отмечают смешение аудита, продвижения и объёма работ.

**Product architecture.** Две независимые оси:

```text
WHAT = формат работы

Бесплатная проверка
↓
SEO-аудит
↓
Аудит + согласованные исправления
↓
SEO-продвижение

HOW MUCH = объём платного аудита

50 / 200 / 500 URL
```

Объём не должен выглядеть новым типом услуги. Аудит с исправлениями — формат, который добавляет разрешённые работы и их предел к выбранному объёму аудита. SEO-продвижение — отдельный ежемесячный продукт с собственными единицами, не четвёртый объём аудита.

**Exact acceptance criteria.**

- Существует один offer registry со стабильным ID, названием, `priceType`, ценой, сроком, лимитом и scope.
- Меню и `/services` прямо разделяют «SEO-аудит» и «SEO-продвижение».
- `/seo` либо становится компактным hub с двумя понятными CTA, либо серверно ведёт на один явно названный продукт без промежуточной двусмысленности.
- Одинаковый offer в service page, pricing, brief, summary, admin и письме имеет одинаковые данные.
- Marketplace CTA ведёт к реальной цене/offer, а не назад к уже просмотренным карточкам.
- Unknown offer получает явную ошибку или поддержанный alias; молчаливого generic fallback нет.

**Regression tests.** Matrix всех offer ID; RU/EN; direct URL, reload, copied URL, Back/Forward; legacy alias/unknown ID; marketplace handoff; internal link crawler без новых redirect targets.

**Dependencies.** Канонический каталог и реальные бизнес-правила владельца.

## `PRODUCT-02` — контекст цен и fixed/from контракт в брифе

**Problem.** При выборе разработки, рекламы или текстов pricing продолжает говорить об SEO-аудите. Фиксированный SEO-пакет корректно передаётся, но рядом написано «Точный состав и цена — после ответов». Категория не сохраняется в URL.

**Why now.** Это заметно за первые минуты и создаёт сомнение именно перед заявкой.

**Affected routes.** `/pricing`, `/brief?offer=*`, summary/admin/email выбранного предложения.

**Evidence.** Поздние CRO/technical тесты подтвердили сохранение точного offer, но одновременно зафиксировали SEO-текст после переключения других категорий, отсутствие shareable category state и фразу «Точный состав и цена — после ответов» у fixed-offer.

**Rules.**

```text
FIXED:
цена и scope фиксированы;
дополнительные работы — только после отдельного согласования.

FROM:
рядом перечислены конкретные факторы, влияющие на итог.

CUSTOM:
нет обещания заранее известной цены;
показывается результат первого этапа оценки.
```

**Exact acceptance criteria.**

- Eyebrow, H1, пояснение и единица объёма меняются вместе с активной категорией.
- Выбранная категория кодируется в shareable URL и переживает reload/Back/Forward.
- Для fixed-offer отображается: «Тариф и цена зафиксированы. Дополнительные работы — только после согласования».
- Для from-offer видны 2–4 реальных фактора цены.
- Внутренние slug не показываются пользователю; есть «Изменить тариф» с возвратом в нужную категорию без потери ответов.

**Regression tests.** Все категории/offer types на desktop/mobile; keyboard/mouse; history; summary parity; selected tab centering на 320 px.

**Dependencies.** `PRODUCT-01`; реальные priceType и price factors.

## `TECH-01` — критическая адаптивность без изменения дизайна

**Problem.** Audit result шире viewport на 768 px; счётчик `1 379` распадается на 320/360 px; на `/about` ломается слово «Перепроверяем». Старый clip формы не воспроизведён, но должен остаться regression case.

**Why now.** Это видимые дефекты на обычных размерах и в первом доказательном сценарии.

**Affected routes.** `/`, `/free-audit`, `/about`, `/audit/{token}`.

**Evidence.** `technical-qa-audit.md`: `scrollWidth=891` при viewport 768 и перенос счётчика `1 379` на 320/360 во всех темах; `cro-ux-audit.md`: плохой перенос «Перепроверяем». Старый clip `/free-audit` поздняя матрица не воспроизвела.

**Exact acceptance criteria.**

- На 320–1440 px `documentElement.scrollWidth <= clientWidth`, кроме явно обозначенных локальных carousel regions.
- `1 379` остаётся одной визуальной единицей во всех темах и при увеличенном шрифте.
- Карточка бесплатной проверки, поле, consent и CTA полностью помещаются на 320 px без внутреннего clip.
- Этапы `/about` не разрывают слова посередине.
- Audit result не требует горизонтальной прокрутки страницы на 768 px.

**Regression tests.** Screenshots/DOM 320, 360, 390, 430, 768, 1024, 1280, 1440 × три темы; 200% text zoom; локальный overflow inventory.

**Dependencies.** `AUDIT-03` для новой структуры результата; responsive tokens.

## `A11Y-01` — мобильное меню как настоящий modal drawer

**Problem.** Фон прокручивается под открытым меню; Tab выходит на CTA и SVG графика за overlay. Escape и возврат фокуса на opener уже работают.

**Why now.** Подтверждённая release-поломка навигации с клавиатуры и на touch.

**Affected routes.** Общий mobile header на всех публичных страницах.

**Evidence.** `technical-qa-audit.md`: при открытом drawer `scrollY` изменился с 700 до 1300; Tab ушёл за overlay. Escape и возврат focus opener прошли, поэтому они остаются regression baseline, а не открытым дефектом.

**Exact acceptance criteria.**

- При открытом drawer wheel/touch не меняют исходный scroll position.
- Tab и Shift+Tab циклически остаются внутри drawer.
- Фон исключён из accessibility tree/interaction через `inert` или эквивалент.
- Escape, click outside, выбор ссылки и route change закрывают drawer, снимают lock и возвращают фокус предсказуемо.

**Regression tests.** Mobile 320/390/430; wheel/touch; Tab loop в обе стороны; Escape; resize; navigation; повторное открытие после Back.

**Dependencies.** Общий header/drawer primitive.

## `A11Y-02` — корректный keyboard flow: skip-link и hero graph

**Problem.** Skip-link меняет hash, но оставляет focus на `BODY`; 13 SVG-точек создают невидимые Tab stops, а scrollable graph region не keyboard-focusable.

**Why now.** Пользователь застревает в длинном невидимом порядке навигации на первом экране.

**Affected routes.** Общий layout и `/`.

**Evidence.** `technical-qa-audit.md`: после skip-link hash изменился, но `activeElement` остался `BODY`; в line graph обнаружено 13 невидимых SVG tab stops, а прокручиваемый region не имел keyboard focus.

**Exact acceptance criteria.**

- После активации skip-link `activeElement` — `main#main-content`; следующий Tab идёт по основному содержимому.
- Если точки декоративные, они исключены из Tab-order и accessibility tree.
- Если точки интерактивные, каждая имеет роль, понятное имя, клавиатурное действие и видимый focus.
- Scrollable graph container доступен клавиатурой только если пользователю действительно нужно им управлять.
- Основная композиция line graph не меняется.

**Regression tests.** Полный Tab-order mobile/desktop; Shift+Tab; visible focus; Axe; screen-reader smoke позже на физическом устройстве.

**Dependencies.** Продуктовое решение «декоративные или интерактивные точки»; общий focus token.

## `A11Y-03` — WCAG AA через semantic theme tokens

**Problem.** Axe подтвердил serious contrast violations на `/services`, `/brief`, `/about`, audit result; минимальные отношения доходят до 1.41:1. Footer accessible names не включают видимый текст; theme control результата скрыт на mobile.

**Why now.** Пользователь отдельно требует читаемость во всех темах; это измеренный дефект, не вкусовщина.

**Affected routes.** `/services`, `/brief`, `/about`, `/audit/{token}`, footer и общие theme controls.

**Evidence.** Axe-прогоны из `technical-qa-audit.md` зафиксировали serious contrast violations с минимумом 1.41:1; там же подтверждены несовпадение accessible name footer links и отсутствие доступного mobile theme control на audit result.

**Exact acceptance criteria.**

- Обычный текст ≥4.5:1, крупный ≥3:1 во всех трёх темах и состояниях.
- Исправляются semantic tokens muted/mono/accent/badge, а не десятки локальных цветов.
- Accessible name logo/phone/Telegram/MAX/email включает видимый текст.
- На audit result тема доступна на 320–430 px через кнопку или общее mobile menu.

**Regression tests.** Axe + ручной contrast check на указанных routes, 320/390/768/1440 × Dark/Signal/Light; accessibility tree footer; theme switch/reload.

**Dependencies.** Stable semantic token map; `AUDIT-03`.

## `PERF-01` — фирменное intro в измеримом performance budget

**Problem.** На Slow 4G реальный hero появляется около 6.59 с, cookies — около 6.81 с; trace содержит Layout 298/121 мс, long task 113 мс и 94 dropped-frame markers. Intro начинается светлым экраном при уже активной Dark theme.

**Why now.** Первый полезный экран задерживается не сетью контента, а фирменным входом. Удалять анимацию нельзя; требуется исправить lifecycle и реализацию.

**Affected routes.** Первый вход на `/` и deep links, cookie sequencing.

**Evidence.** `technical-qa-audit.md`: Slow 4G filmstrip — hero около 6.59 с, cookie UI около 6.81 с; trace — Layout 298/121 мс, long task 113 мс и 94 dropped-frame markers. `cro-ux-audit.md` отмечает воспринимаемую задержку, а theme test — светлый первый кадр при активной Dark theme.

**Protected visual.** Сохраняются `KILENI → E → SEO`, текущий характер и line/motion language. Это не разрешение на новый creative concept.

**Exact acceptance criteria.** Target budget:

- бренд видим <500 мс на нормальном mobile;
- skip готов к действию с момента, когда выглядит активным;
- hero и основной CTA доступны ≤3 с на нормальном mobile и ≤4 с в согласованном Slow 4G profile;
- `prefers-reduced-motion` приходит в финальное состояние ≤700 мс после появления интерфейса;
- intro не создаёт main-thread tasks >50 мс;
- transform/opacity выполняют основную анимацию без повторных дорогих layout;
- текущая модель «один раз за browser session, `?intro=1` для принудительного повтора» сохраняется до отдельного решения владельца;
- cookie panel появляется только после завершения или пропуска intro.

**Regression tests.** Normal/Slow 4G filmstrip and trace; click/wheel/Escape/Tab/touch/skip; session refresh/Back/Forward/new context; reduced motion; first frame в Dark/Signal/Light; cookie appearance timing.

**Dependencies.** Motion implementation; cookie sequencing защищено и не должно меняться.

# Before paid traffic

## `PRODUCT-03` — короткие scope contracts всех платных продуктов

Сначала зафиксировать границы, а не автоматически повышать цену. На карточке сразу показывать: `price type`, цену, срок, главный результат, основной предел и ключевое исключение. Детали раскрывать через «Границы тарифа».

| Продукт | Сразу | В «Границах тарифа» |
|---|---|---|
| SEO-аудит | 50/200/500 URL, срок, deliverable, повторная проверка | число ручных шаблонов, источники, поисковые кабинеты, регион, конкуренты, JS/log review, встречи, exclusions |
| Аудит + исправления | объём аудита, часы/предел правок, цена fixed/from | допустимые системы и типы правок, staging/access, release/rollback, QA, цена сверх лимита |
| SEO-продвижение | регион, число страниц/материалов/часов, период | что считается страницей и материалом, публикация, источники отчёта, контроль индексации, excluded work |
| Разработка | тип продукта, число шаблонов, цена, срок | integrations, states, revision count, deployment, repository, ownership, warranty/support boundary |
| Marketplaces | площадка, SKU, число кадров, цена, срок | source files, variants, publication, moderation, revisions, пакетный объём |
| Яндекс Реклама | число услуг/регионов/кампаний, цена настройки и ведения | groups/ads/goals, analytics QA, optimization frequency, ad budget, exclusions |
| Тексты и материалы | тип и объём материала, цена, срок | фактчек, интервью, источники, metadata, публикация, rounds of edits |

**Acceptance.** Fixed-offer не содержит скрытой переоценки; from-offer объясняет факторы; все единицы имеют простое определение; те же границы попадают в brief/admin.

## `TRUST-01` — Evidence Pack v1 для двух существующих кейсов

Не придумывать новые результаты и не выдавать техническую приёмку за рост бизнеса.

```text
caseVersion
period
originalUrlSet
finalUrlSet
intersection / difference
beforeEvidence
afterEvidence
rawCrawlExport
lighthouseReports
measurementEnvironment
remainingIssues
methodologyVersion
responsibleReviewer
limitations
```

Публично показывать безопасную часть: даты, объём и различие выборок, обезличенные examples, Lighthouse JSON/PDF без PII, условия замера, остаточные проблемы, версию и ответственного. Internal paths, secrets, PII и данные клиента без разрешения не публиковать.

Главный экран кейса: воспроизводимые `509/509`, `575/575`, конкретные типы исправлений и ограничения. Внутренний score — вторичный либо скрыт до появления формулы. Lighthouse — 3–5 одинаковых запусков до/после, медиана и диапазон; не подменять им полевые CWV.

## `TRUST-02` — минимальная честная accountability

Не рисовать fake team. Если отвечает один человек — один реальный человек лучше восьми абстрактных функций.

Минимум:

```text
Кто принимает проект
Кто ведёт проект
Кто проверяет результат
Куда эскалировать вопрос
Юридический исполнитель
Обычный срок ответа
```

Пока данных нет, в задачах оставить `TODO REQUIRES OWNER INPUT`. Не публиковать имена, опыт, backup или срок ответа без подтверждения.

## `TRUST-03` — единый бренд и рабочий контактный контур

Функциональная часть и восприятие разделяются:

- телефон, Telegram, MAX и текущие ссылки не объявлять неработающими без теста;
- `support@kileni-seo.ru` уже использовался в QA и SMTP принял отправку, но фактическое получение во входящих не подтверждено;
- сделать его публичным можно только после подтверждения, что ящик существует, принимает письма и регулярно контролируется;
- небрандовый `K-TRANS-DIR@MAIL.RU` не удалять, пока не подтверждён рабочий заменяющий канал;
- унифицировать написание `KILENI`, `KILENI seo`, `KILENI SEO`, `KILENI · SEO` по утверждённой бренд-схеме.

## `CONTENT-01` — реальные факты раньше демонстрационного dashboard

Hero graph сохраняет композицию, line graph и visual language. Не заменять его другим dashboard.

Нужно:

- сделать `Демонстрационный пример — не результат клиента` заметным до/рядом с цифрами;
- объяснить значения человеческими словами;
- не выдавать `68%`, `+24%`, `92/100`, `−28%` за факты без домена, периода и источника;
- реальный кейс/evidence link показать раньше декоративной схемы;
- регулярный replay и сокращение вторичных метрик оставить как CRO-гипотезу, а не обязательный редизайн;
- offscreen эффекты паузить, но видимый график и утверждённую скорость не убирать;
- reduced motion сохранить.

## `UX-01` — горячее действие бесплатной проверки выше fold

На `/free-audit` поле URL и кнопка должны помещаться в первом viewport после H1; подробности — ниже. «Что именно проверяется?» ведёт на конкретный `#checks` или `/checks`, а не на ту же позицию. Email остаётся необязательным, назначение письма объясняется одной короткой фразой. Подтверждение отношения к сайту сохраняется как защита от злоупотреблений.

## `SEO-01` — системная on-page и semantic hygiene

- заменить две внутренние ссылки `/seo` и `/en/seo` конечными URL, сохранив redirect для внешней совместимости;
- добавить breadcrumbs и `BreadcrumbList` на marketplace detail pages;
- точнее назвать H1 коммерческих страниц без keyword stuffing;
- использовать `Organization`, если реальной публичной точки для `ProfessionalService` нет;
- не задавать одному `WebSite @id` разные `inLanguage`; язык держать на WebPage/Article;
- исправить доступные имена footer links вместе с `A11Y-03`.

## `CONTENT-02` — редакционная provenance без разрушения `/checks`

Не ломать единый шаблон `/checks`: повторяемость здесь является достоинством методики. Для статей и glossary нужны реальные author/reviewer, updated date, methodology/source, практический пример и changelog там, где менялась методика. Не утверждать, что контент создан AI: подтверждена только шаблонность.

Отдельная системная задача — 141 meta description, обрезанный посередине фразы: хранить законченные RU/EN descriptions, не резать основной текст механически. Уточнить категоричное определение каннибализации через критерий реального негативного эффекта.

## `TECH-02` — корректные error states

- неизвестный audit token: HTML/API/PDF возвращают 404, malformed token — согласованный 400;
- 404 без JavaScript содержит SSR H1, объяснение и ссылку на главную;
- unknown offer обрабатывается через registry/alias из `PRODUCT-01`, а не молчаливый generic brief.

# Next product iteration

## `PRODUCT-04` — принятые критерии нового `/services`

Решение о полной пересборке страницы уже принято; этот backlog не проектирует её заново. Acceptance нового варианта:

- направления видны быстро;
- SEO не смешивает аудит и продвижение;
- функциональный selector находится выше;
- меньше пустого пространства;
- нет серой плиты и card wall;
- proof появляется раньше декоративного visual;
- mobile action появляется раньше;
- готовые услуги не удаляются только из-за малого числа кейсов.

## `UX-02` — навигация по длинным разделам и понятный brief

- поднять online-start брифа, первый материал блога и рабочий selector functional pages;
- для разработки заменить обязательное свободное «Какой сайт нужен?» на понятные варианты + необязательный комментарий;
- для marketplace добавить «Карточек ещё нет», делать ссылки/артикулы условными;
- разделить RU/EN буквы в glossary; саму длину справочника дефектом не считать;
- mobile pricing card wall и compact alternatives тестировать, а не объявлять доказанной причиной падения конверсии.

## `PERF-02` — animation lifecycle, prefetch и caching

- паузить только невидимые infinite decorations через viewport/page visibility; после возврата корректно продолжать;
- не удалять видимую анимацию и не ускорять её радикально;
- не подкачивать все скрытые routes dropdown на критическом пути Slow 4G;
- расследовать глобальный `no-store` публичного HTML и перейти на безопасную static/revalidation policy только для публичных страниц; audit API/PDF/admin должны остаться `no-store`;
- сохранить immutable cache hashed assets.

## `ADMIN-01` — админка как операционный инструмент

В detail аудита показывать engine/scoring version, 30 check statuses, выбранные URL и selection reasons, coverage, email attempt time и provider status. `sent` подписывать «передано почтовому серверу», пока нет delivery confirmation. QA-записи помечать и архивировать отдельно. Rate limit считать в первую очередь по ошибочным попыткам; успешный вход должен сбрасывать счётчик. Реальные заявки/брифы должны иметь связанный offer snapshot и историю статусов.

## `SEO-02` — управлять SEO-инвентарём, а не наращивать URL

142 из 210 sitemap URL относятся к checks/glossary. Это не подтверждённая проблема: страницы содержательны и доступны. Не создавать новые URL ради числа «200». После доступа к Яндекс Вебмастеру/Search Console оценивать показы, индекс, клики и полезность; только затем объединять, дорабатывать или исключать страницы.

## `TRUST-04` — proof maturity портфеля

Внутренний статус, не обязательный badge для пользователя:

| Направление | Сейчас | Что нужно для следующего уровня |
|---|---|---|
| Technical SEO / audit | `SUPPORTED` | Evidence Pack v1 и прозрачный Audit Result Contract → `PROVEN` |
| SEO-продвижение | `SUPPORTED` | Периодический кейс с измеримыми страницами/запросами и ограничениями |
| Development | `EARLY` | Реальный repository/deployment/acceptance artifact или кейс |
| Marketplaces | `EARLY` | Карточка до/после, source files, moderation/result artifact |
| Yandex Ads | `EARLY` | Campaign structure, goals QA и периодический result artifact |
| Content/custom | `EARLY` | Пример deliverable и критерий приёмки |

Не удалять услуги только потому, что proof слабее. Но SEO остаётся главным клином, пока другие направления не получили собственные доказательства.

# Strategic moat

## `STRATEGIC-01` — Audit Evidence System

Это не релизный blocker и не повод задерживать мобильное меню.

```text
check
→ evidence
→ task
→ implementation
→ acceptance
→ recheck
→ case evidence
```

Каждый вывод получает check ID/version, URL, дату, источник факта, границу автоматического вывода и ответственную проверку. После согласования он превращается в задачу с критерием приёмки, записью внедрения и повторным измерением. Разрешённая обезличенная часть формирует evidence library и кейсы. Именно история воспроизводимых доказательств, а не слово «AI» и не новый dashboard, может стать защищаемым преимуществом KILENI.

# Protected decisions — не менять

1. Не обещать top-1, позиции, продажи, трафик или фиксированное число лидов.
2. Email в бесплатной проверке остаётся необязательным; результат открывается в браузере.
3. Не добавлять fake reviews, fake team, клиентов, логотипы, награды и регалии.
4. Не скрывать разные исходные и финальные URL-наборы кейсов и ограничения измерений.
5. Открытые цены, рекламный бюджет, сторонние расходы и exclusions сохраняются.
6. Не вводить timer, fake scarcity и агрессивную срочность.
7. Методика `/checks` сохраняет единый каркас; к нему добавляются versioning и evidence.
8. `prefers-reduced-motion`, RU/EN, canonical/hreflang и legal transparency сохраняются.
9. Cookies остаются после intro; до consent нет сторонней аналитики; footer повторно открывает настройки.
10. Фирменное intro и утверждённый hero line graph не заменяются новым creative concept.
11. Видимая анимация сохраняется; пауза допустима только вне viewport/при reduced motion.
12. Прямая передача точного offer ID, цены, срока и scope в brief не регрессирует.
13. Не возвращать «Полный состав уровня» и бессмысленные таблицы ради объёма.
14. Не создавать SEO-страницы ради количества и не объявлять 210 URL уже проиндексированными.
15. Audit-token pages остаются `noindex`; API/PDF/admin и персональные данные остаются `no-store`.
16. Admin без сессии остаётся закрытым и исключённым из индексации.
17. Не притворяться enterprise-агентством и не добавлять SLA/24×7/capacity без реальных обязательств.
18. Marketplace content продолжает реально различать площадки и использовать официальные значки; вопрос Megamarket решает владелец продукта.

# Master issue map

| ID | Title | Status | Priority | Confidence | Source reports | Evidence | Affected routes | User/business impact | Recommended action | Dependencies | Regression risk |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `AUDIT-01` | Прозрачный и воспроизводимый score + 30 checks | `CONFIRMED` | P1 / RELEASE BLOCKER | High | SEO; Tech; CRO; Competitor | `97/100` не пересчитывается; нет 30 result rows; смешаны разные категории | audit web/API/PDF/admin, `/checks` | Центральный результат выглядит назначенным | Audit Result Contract v2, versioned registry, public breakdown | Owner scoring policy | High: меняет все consumers |
| `AUDIT-02` | Репрезентативная выборка 10 URL | `CONFIRMED` | P1 / RELEASE BLOCKER | High | Tech; SEO | В sample вошли 5 RU/EN template pairs | sampler, result, PDF, admin | Лимит формально выполнен, но охват узкий | Deterministic page-type sampling + reasons | `AUDIT-01` | High: score history/snapshots |
| `AUDIT-03` | Parity web/PDF/admin и печатный layout | `CONFIRMED` | P1 / RELEASE BLOCKER | High | Tech; CRO; SEO | Zero-issue CTA; PDF overlap/page break; 768 overflow; 25 из 208 unchecked без contract-флага | audit surfaces | Слабый deliverable снижает покупку платного аудита | Shared presenter, conditional CTA, pagination, responsive result | `AUDIT-01`, `AUDIT-02` | High: public tokens/PDF |
| `PRODUCT-01` | Единый offer registry и SEO ladder | `CONFIRMED` | P1 / RELEASE BLOCKER | High | User; CRO; Tech; Competitor | Смешаны формат/объём; нет marketplace price route; unknown offer → generic brief | services/SEO/pricing/brief/marketplaces | Клиент путает формат и объём | WHAT/HOW MUCH architecture, stable IDs, aliases | Owner catalog | High: all lead flows |
| `PRODUCT-02` | Контекст pricing и fixed/from copy | `CONFIRMED` | P1 / RELEASE BLOCKER | High | Tech; CRO | После смены категории остаётся SEO-контекст; fixed сопровождается «точная цена после ответов» | `/pricing`, `/brief` | Сомнение в актуальности и цене | Dynamic category context, priceType copy, deep link | `PRODUCT-01` | High: selected offer persistence |
| `PRODUCT-03` | Измеримые scope contracts | `CONFIRMED` | P2 / BEFORE PAID TRAFFIC | High | SEO; Competitor | Публично не определены единицы, пределы, deliverables и exclusions | all commercial pages | Нельзя сравнить глубину; цена кажется подозрительной | Compact limits + «Границы тарифа» | Owner scope facts | Medium |
| `PRODUCT-04` | Принятая пересборка `/services` и marketplace price route | `CONFIRMED` | P3 / NEXT ITERATION | High | User decision; CRO | Долгая ориентация, поздний selector и тупик marketplace→pricing | `/services`, `/marketplaces*` | Долгий/двусмысленный выбор | Реализовать утверждённые acceptance criteria, не новый concept | `PRODUCT-01` | Medium |
| `TECH-01` | Критическая responsive integrity | `CONFIRMED` | P1 / RELEASE BLOCKER | High | Tech; CRO | 768→`scrollWidth 891`; перенос `1 379` на 320/360; разрыв «Перепроверяем» | home/free-audit/about/audit | Очевидно сломанный вид на реальных размерах | Responsive tokens, no page overflow, nowrap numeric unit | `AUDIT-03` | Medium |
| `TECH-02` | Настоящие SSR/HTTP error states | `CONFIRMED` | P2 / BEFORE PAID TRAFFIC | High | Tech | Audit HTML soft-404=`200`; public no-JS 404 визуально пуст | audit/unknown public route | Ошибочный статус и пустой fallback | Server 404 + SSR content | Routing | Low–Medium |
| `TECH-03` | Внутренние redirect targets | `CONFIRMED` | P2 / BEFORE PAID TRAFFIC | High | SEO; Tech | Две внутренние ссылки ведут через `308` | `/services`, `/en/services` | Небольшая миграционная недочистка | Link directly, keep external redirect | `PRODUCT-01` | Low |
| `A11Y-01` | Scroll lock и focus trap mobile drawer | `CONFIRMED` | P1 / RELEASE BLOCKER | High | Tech | `scrollY 700→1300`; focus выходит за overlay | all mobile pages | Навигация не является modal | Shared drawer primitive | Header | Medium |
| `A11Y-02` | Skip focus и graph Tab order | `CONFIRMED` | P1 / RELEASE BLOCKER | High | Tech | Skip оставляет focus на BODY; 13 невидимых SVG tab stops | layout, home | Невидимый длинный Tab path | Focusable main; semantic graph | Product graph semantics | Medium |
| `A11Y-03` | Theme contrast и accessible names | `CONFIRMED` | P1 / RELEASE BLOCKER | High | Tech; User | Axe 1.41–4.33:1; footer name mismatch; скрыт mobile theme control результата | services/brief/about/audit/footer | Текст реально не читается во всех темах | Semantic tokens, names, mobile control | Design tokens | High: global theme |
| `PERF-01` | Intro budget и theme consistency | `CONFIRMED` | P1 / RELEASE BLOCKER | High | Tech; CRO; User | Slow 4G hero 6.59s; long task/dropped frames; light→dark flash | first entry/deep link | Два барьера до смысла | Preserve concept, optimize lifecycle and timing | Motion + cookies | High: brand entrance |
| `PERF-02` | Offscreen motion, hidden prefetch, public caching | `CONFIRMED` / `DEFER` | P3 / NEXT ITERATION | High for facts | Tech | Offscreen animations active; unselected RSC prefetch; public HTML `no-store` | home/header/public HTML | Лишняя работа и слабое cache behavior | Visibility pause, targeted prefetch, public revalidation review | `PERF-01`; routing | Medium–High |
| `UX-01` | Free-audit action above fold | `CONFIRMED` | P2 / BEFORE PAID TRAFFIC | High for placement | CRO | Поле начинается примерно на 1042 px desktop | `/free-audit` | Горячий пользователь вынужден снова читать | Form under H1, details below, valid anchor | Audit form | Medium |
| `UX-02` | Brief inputs, glossary alphabet, long functional pages | `CONFIRMED` / `HYPOTHESIS` | P3 / NEXT ITERATION | High for observed UI; Medium for CRO effect | CRO | Длинный выбор, смешанный RU/EN алфавит, слабая ориентация | brief/blog/glossary/pricing | Медленная ориентация | Conditional plain-language controls; RU/EN index | Content/brief schema | Medium |
| `TRUST-01` | Evidence Pack двух кейсов | `CONFIRMED` | P2 / BEFORE PAID TRAFFIC | High | SEO; Competitor | Нет безопасного raw crawl/Lighthouse/URL-set proof; внутренние score без формулы | home/cases | Большие числа нельзя независимо проверить | Evidence Pack v1; facts before internal score | Owner artifacts/permission | Medium: privacy |
| `TRUST-02` | Реальная accountability | `CONFIRMED` | P2 / BEFORE PAID TRAFFIC | High for absence | SEO; Competitor; CRO | Не названы owner/reviewer/escalation/обычный срок ответа | about/commercial/PDF | Непонятно, кто лично отвечает | Honest owner/reviewer/escalation block | Owner input | Low |
| `TRUST-03` | Брендовый рабочий contact contour | `CONFIRMED` / `NOT TESTED` | P2 / BEFORE PAID TRAFFIC | High for current copy; Medium for perception | CRO; QA mail test | Небрендовый public email; SMTP accepted для support, inbox receipt не доказан | contacts/footer/email/PDF | Премиальный интерфейс конфликтует с небрандовой почтой | Confirm monitored branded mailbox before replacement | Owner/mailbox | Medium: lost mail |
| `TRUST-04` | Proof maturity и честный сегмент | `CONFIRMED` | P3 / NEXT ITERATION | High for proof gap | Competitor | Два похожих technical SEO кейса не доказывают весь широкий menu | services/cases/about | Ширина меню опережает доказательства | SEO as main wedge; internal PROVEN/SUPPORTED/EARLY | `TRUST-01/02` | Low |
| `CONTENT-01` | Demo metrics clearly separated from proof | `CONFIRMED` | P2 / BEFORE PAID TRAFFIC | High for ambiguity | SEO; CRO; Competitor | Synthetic 68%, +17%, +24%, 92/100, −28% конкурируют с demo-label | home | «Сначала факты» спорит с synthetic metrics | Strong demo label + early real evidence | Case link | Low |
| `CONTENT-02` | Author/reviewer, meta descriptions, terminology | `CONFIRMED` / `HYPOTHESIS` | P2 / BEFORE PAID TRAFFIC | High for 141 descriptions; Medium for AI perception | SEO; Competitor | 141 descriptions обрываются; мало реальной provenance | blog/checks/glossary | Шаблонность и обрезанные snippets снижают trust | Real provenance, completed descriptions, precise definitions | Owner authors | Medium |
| `SEO-01` | H1/breadcrumb/schema/internal link hygiene | `CONFIRMED` | P2 / BEFORE PAID TRAFFIC | High for observed facts; Medium for schema choice | SEO; Tech | Неровная H1/breadcrumb/schema/link семантика при чистой индексной базе | services/pricing/marketplaces/global JSON-LD/footer | Не блокирует индекс, но расходится с технической аккуратностью | Targeted semantic fixes | Owner public-address fact | Medium |
| `SEO-02` | Search inventory monitoring | `HYPOTHESIS` / `DEFER` | P3 / NEXT ITERATION | Medium | SEO | 142/210 URL — checks+glossary; фактических данных поисковых кабинетов нет | sitemap/checks/glossary | Риск роста шаблонного инвентаря без спроса | Use Webmaster/GSC data; no pages for count | Search console access | Low |
| `ADMIN-01` | Audit/admin operational transparency | `CONFIRMED` / `NOT TESTED` | P3 / NEXT ITERATION | High for visible data gaps | SEO; Tech | В UI не хватает engine/reasons/history; auth/mutations не тестировались безопасно | `/admin/*`, email pipeline | Оператору не хватает версии/причин; sent≠delivered | Detail history, QA labels, delivery semantics, limiter review | QA environment | Medium–High |
| `STRATEGIC-01` | Audit Evidence System | `DEFER` | STRATEGIC | Medium | Competitor synthesis | Нет сквозного ledger «проверка→задача→перепроверка→кейс» | audit/tasks/admin/cases | Защищаемое преимущество ещё не накоплено | Evidence ledger end-to-end | Release contracts | High: cross-system |
| `FIX-01` | Exact offer persistence | `CURRENTLY FIXED` | — | High | Late CRO; Tech | Offer ID, price, duration и scope переживают reload/back/forward | pricing→brief | Старый баг закрыт | Keep regression only | `PRODUCT-01/02` | High if registry changes |
| `FIX-02` | Old 320 free-audit/header clip | `CURRENTLY FIXED` | — | Medium–High | Early User screenshots; late Tech | Поздняя no-overflow matrix не воспроизвела старый clip | home/free-audit | Не возвращать как факт текущей поломки | Retain visual regression | `TECH-01` | Medium |
| `FIX-03` | Cookies current behavior | `DO NOT CHANGE` | — | High | Tech | До consent нет third-party; preferences persist; footer reopen работает | global | Юридически и технически корректный baseline | Regression on any tracker change | Consent system | High |
| `PROTECT-01` | Честность и anti-slop decisions | `DO NOT CHANGE` | — | High | All five reports | Нет гарантий продаж/top-1, fake proof, timer/scarcity | global | Потеря главного отличия KILENI | Preserve protected list | All release work | High |

# Dependency graph

```text
OWNER FACTS
├─ scoring policy
├─ canonical offer catalog + real scope
├─ people / response time / public contacts
└─ permitted case artifacts

AUDIT-01 schema + registry
├─ AUDIT-02 sampling
├─ AUDIT-03 web/PDF/admin
│  └─ ADMIN-01
└─ TRUST-01 case evidence

PRODUCT-01 offer catalog
├─ PRODUCT-02 pricing + brief
├─ PRODUCT-03 scope contracts
├─ PRODUCT-04 services/marketplaces
└─ admin/email offer snapshot

GLOBAL UI FOUNDATIONS
├─ A11Y-03 semantic theme tokens
├─ A11Y-01 drawer primitive
├─ A11Y-02 focus/graph semantics
└─ TECH-01 responsive result

PERF-01 intro budget
└─ PERF-02 offscreen lifecycle / prefetch / cache review

TRUST-01 + TRUST-02 + TRUST-03
└─ TRUST-04 proof maturity
   └─ STRATEGIC-01 Audit Evidence System
```

Параллелить можно `PRODUCT-01` и `AUDIT-01` после утверждения owner facts; UI foundations можно делать параллельно с контрактами. Web-result и PDF нельзя проектировать отдельно до фиксации audit schema. Pricing, brief, admin summary и email нельзя патчить независимо до единого offer registry.

# Regression suite

## Release gate

1. **Audit contract:** registry completeness, status semantics, public score formula, 1/4/10/>10 coverage fixtures, multilingual sampling stability.
2. **Audit surfaces:** parity web/API/PDF/admin; 0/low/high issue CTA; PDF render snapshots; unchecked truncation contract; refresh immutability.
3. **Offer matrix:** все stable IDs и price types; service/pricing/brief/admin/email parity; reload/Back/Forward/copied URL; alias/unknown offer.
4. **Responsive/theme matrix:** 320, 360, 390, 430, 768, 1024, 1280, 1440 × Dark/Signal/Light; page overflow, counter, result layout, 200% text zoom.
5. **Keyboard/accessibility:** skip-link, drawer focus trap/scroll lock/Escape, graph Tab order, visible focus, Axe WCAG AA, footer names.
6. **Intro/cookies:** normal/Slow 4G trace and filmstrip; all skip inputs; session behavior; reduced motion; intro theme; cookie after intro; no external requests pre-consent.
7. **Errors/no-JS:** unknown/malformed audit token, public 404 SSR, main routes without JS.
8. **SEO safety:** 210 sitemap routes or актуальный registry, `200`, canonical, hreflang, noindex exclusions, zero internal redirect targets, structured-data validation.

## QA environment required before claiming full PASS

Нужна отдельная безопасная QA/staging-среда или явно разрешённые QA data/domain/account:

- запуск нового audit job, SSRF/URL matrix, 1/4/10/>10 crawler fixtures;
- progress, refresh/resume, SSE reconnect, offline/fallback, duplicate submit;
- реальная отправка письма: SMTP accepted → provider delivered → mailbox received/bounce;
- contact/brief/calculator submit → admin detail → status/note/export;
- admin login, failed-attempt limiter, successful reset, logout/session expiry;
- 500/error boundary;
- Safari/WebKit и один реальный iPhone smoke; Android/TalkBack — перед широким трафиком;
- полевые CWV/INP после накопления реального трафика, не лабораторная подмена.

## Cookie regression trigger

Текущий cookies-flow имеет PASS. При подключении Метрики, рекламного пикселя, embedded third-party или нового SDK PASS автоматически устаревает. Повторить network/storage test для `до consent`, `необходимые`, `все`, `custom`, `reopen`, `revoke`.

# Owner input required

1. **Scoring policy:** реальная формула, веса, штрафы, участие non-SEO категорий, версия и решение — нужен ли общий score вообще.
2. **Offer catalog:** канонические названия/ID, fixed/from/custom, 50/200/500, допустимые сочетания audit+fix, marketplace offers.
3. **Scope:** ручные шаблоны, источники/доступы, регион, конкуренты, deliverables, типы правок, сверхлимитная цена, определения страницы/материала/SKU/кадра.
4. **Accountability:** реальные имя/роль принимающего, ведущего и reviewer; юридический исполнитель; backup/escalation; обычный срок ответа. Не enterprise SLA, если его нет.
5. **Case artifacts:** что реально существует и что разрешено публиковать без PII/секретов; можно ли показать raw crawl/Lighthouse/examples.
6. **Public contact:** является ли `support@kileni-seo.ru` каноническим адресом, кто его контролирует и подтверждена ли доставка во входящие; когда можно заменить `K-TRANS-DIR@MAIL.RU`.
7. **Proof outside SEO:** реальные артефакты/кейсы development, marketplaces, ads и content. При отсутствии оставить статус `EARLY`.
8. **Business segment:** подтвердить SMB/mid-market как основной; не добавлять enterprise claims без реальной capacity.
9. **Megamarket:** актуальное направление или устаревшая карточка. Это продуктовый выбор, не техническая поломка.
10. **Intro session rule:** сохранить текущий один показ за browser session или сознательно показывать при каждом новом открытии. По умолчанию backlog сохраняет проверенный one-per-session, потому что повтор на каждом route ухудшает путь и не доказан как нужный.
11. **Public business location:** существует ли реальная публичная точка для `ProfessionalService`; если нет, использовать `Organization`.
12. **Search data:** доступ к Яндекс Вебмастеру/Search Console для фактической индексации и решения по checks/glossary; sitemap сам по себе индекс не доказывает.

# 10 вещей, которые нужно сделать первыми

1. **Зафиксировать owner facts:** scoring policy, канонический offer catalog, scope, реальные контакты/роли и разрешённые case artifacts.
2. **Ввести Audit Result Contract v2:** versioned 30-check registry, статусы, публичный score breakdown и правильную семантику 10/10.
3. **Заменить текущий sampler на детерминированную выборку разных типов страниц** с причинами выбора и честным coverage.
4. **Перевести web-result, PDF и admin на один snapshot:** исправить CTA, API truncation, печатный layout и tablet overflow.
5. **Собрать единый offer registry и SEO-ladder:** бесплатная проверка → аудит → аудит+правки → продвижение; 50/200/500 — отдельная ось объёма.
6. **Привести pricing и brief к fixed/from контракту:** динамический контекст, deep link категории, «Изменить тариф», no silent fallback, marketplace price route.
7. **Закрыть общий responsive/a11y release-pack:** mobile drawer scroll/focus, skip-link, graph Tab order, WCAG AA tokens, counter 320/360 и result 768.
8. **Вписать intro в performance budget без редизайна:** сохранить `KILENI → E → SEO`, ускорить только технически необходимое, убрать long tasks/theme flash и сохранить cookies после intro.
9. **Опубликовать Evidence Pack v1 и честную accountability:** реальные факты кейсов, ответственный/reviewer, контролируемый брендовый контакт; ничего не выдумывать.
10. **Пройти полный release regression в QA/staging и короткий Safari/iPhone smoke**, затем зафиксировать PASS с версиями audit engine и offer catalog.

## Ответ на финальный вопрос

**Да, условно.** Если эти десять пунктов выполнены полностью, owner input заполнен реальными данными и regression suite проходит, KILENI станет достаточно цельным, технически надёжным и убедительным для передачи заказчику и аккуратного привлечения первых клиентов в сегменте малого/среднего бизнеса.

Это ещё не делает KILENI enterprise-агентством и не означает готовность к масштабному paid traffic без наблюдения. Для активного роста после релиза нужно закончить оставшиеся `BEFORE PAID TRAFFIC` scope/content/semantic задачи и накопить proof по направлениям вне technical SEO. Но новый редизайн, новые обещания и увеличение числа страниц для начала не нужны.
