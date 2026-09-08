# Разбор и исправление 24 скриншотов от 6 сентября 2026 года

## Итог

Статус локального release candidate: **PASS**.

- Ветка: `release/final-handoff-qa`
- Базовый commit: `b9bd487`
- Проверенная среда: локальная изолированная сборка проекта
- Production: `https://kileni-seo.ru` не изменялся
- P0 после regression: 0
- P1 в области этих 24 скриншотов: 0

Каждое замечание со скриншотов найдено в интерфейсе, исправлено и повторно проверено в браузере. В таблице ниже указано, как понято замечание, что изменено и где лежит итоговый кадр.

## Отчёт по каждому скриншоту

| № | Скриншот | Страница и состояние | Как понято замечание | Что исправлено | Проверка и доказательство | Статус |
|---:|---|---|---|---|---|---|
| 1 | 18.47.04 | `/marketplaces/wildberries`, выбранный вариант | У трёх тарифов расходятся вертикальные уровни; выбранная карточка получает лишнее действие | Карточки переведены на общую сетку строк. Цена, сведения об объёме и кнопки стоят на одинаковых уровнях. У выбранного тарифа оставлена одна кнопка перехода в бриф | [Карточки desktop](./user-audit-evidence/screenshot-corrections-2026-09-06/screenshots/01-wildberries-offers-selected-light-1440x1000.jpg), [заголовки и цены](./user-audit-evidence/screenshot-corrections-2026-09-06/screenshots/01-wildberries-offers-header-selected-light-1440x1000.jpg), [mobile 390 px](./user-audit-evidence/screenshot-corrections-2026-09-06/screenshots/01-02-wildberries-offers-cards-mobile-stable-light-390x844.jpg) | PASS |
| 2 | 18.45.30 | `/marketplaces/wildberries`, пример результата | Подпись раздела стоит слишком близко к краю, а заголовок и содержимое не собраны по одной оси | Подпись, заголовок, пояснение и пример результата привязаны к одной колонке и получили одинаковый внутренний отступ | [Выровненный раздел](./user-audit-evidence/screenshot-corrections-2026-09-06/screenshots/02-wildberries-result-aligned-light-1440x1000.jpg) | PASS |
| 3 | 18.44.20 | `/web-development`, карточка Start | Техническая подпись «ПРЕДЕЛ» и фраза «Одна услуга · один язык» звучат как внутренняя схема, а не как текст для клиента | Подпись заменена на «Объём тарифа», формулировка — на «Одна услуга на одном языке». Аналогичные подписи исправлены в остальных тарифах | [Карточки после правки](./user-audit-evidence/screenshot-corrections-2026-09-06/screenshots/01-04-web-development-cards-dark-1440x1000.jpg) | PASS |
| 4 | 18.42.25 | `/web-development`, три тарифа | У карточек разная высота смысловых зон; галочки прижаты к краю; кнопки не образуют ровную линию | Для карточек заданы одинаковые строки описания, объёма, цены, списка и действия. У маркеров увеличен левый отступ, кнопки выровнены по нижней границе | [Верх карточек](./user-audit-evidence/screenshot-corrections-2026-09-06/screenshots/04-web-development-variants-dark-1440x1000.jpg), [полные карточки](./user-audit-evidence/screenshot-corrections-2026-09-06/screenshots/01-04-web-development-cards-dark-1440x1000.jpg), [тема Signal](./user-audit-evidence/screenshot-corrections-2026-09-06/screenshots/themes-signal-web-development-1440x1000.jpg) | PASS |
| 5 | 18.42.03 | `/web-development`, первый экран | Заголовок переносится на неудачных местах и занимает почти весь экран | Ограничены ширина и максимальный размер заголовка, включён смысловой перенос. На desktop заголовок укладывается в три читаемые строки без обрезания | [Первый экран Dark](./user-audit-evidence/screenshot-corrections-2026-09-06/screenshots/05-web-development-hero-dark-1440x1000.jpg) | PASS |
| 6 | 18.39.58 | `/seo-audit`, тарифы | Цена, блок объёма и списки начинаются на разных уровнях; галочки слишком близко к краю | Применена общая вертикальная сетка карточек и одинаковые внутренние отступы. Кнопки выровнены по одной нижней линии | [Верх карточек](./user-audit-evidence/screenshot-corrections-2026-09-06/screenshots/06-seo-audit-cards-light-1440x1000.jpg), [низ карточек](./user-audit-evidence/screenshot-corrections-2026-09-06/screenshots/06-seo-audit-cards-bottom-light-1440x1000.jpg) | PASS |
| 7 | 18.38.59 | `/seo`, Light | Заголовки первого и следующего разделов чрезмерно крупные и создают пустые области | Размеры H1 и H2 ограничены для desktop и tablet, ширина текста согласована с сеткой страницы | [Light](./user-audit-evidence/screenshot-corrections-2026-09-06/screenshots/07-12-seo-hero-light-1440x1000.jpg) | PASS |
| 8 | 18.38.13 | `/cases/eco-santeh`, доказательства | Составной блок выглядит как таблица с острыми внешними углами, хотя остальные поверхности скруглены | Внешний контейнер и вложенные секции получили согласованный радиус 20 px и корректное обрезание фона по углам | [Блок доказательств](./user-audit-evidence/screenshot-corrections-2026-09-06/screenshots/08-case-evidence-rounded-dark-1440x1000.jpg) | PASS |
| 9 | 18.36.10 | `/cases/eco-santeh`, задача / находки / работа | Нарушена структура: номер 01 визуально оторван, внутри следующих колонок появляется второй ряд нумерации | Три этапа собраны в последовательность «Задача → Что нашли → Что сделали». Вложенные конкурирующие номера удалены, разделители и отступы выровнены | [Полная последовательность](./user-audit-evidence/screenshot-corrections-2026-09-06/screenshots/09-case-story-sequence-dark-1440x1000.jpg), [пара 02–03](./user-audit-evidence/screenshot-corrections-2026-09-06/screenshots/09-case-story-structure-dark-1440x1000.jpg) | PASS |
| 10 | 18.34.52 | `/cases/eco-santeh`, первый экран | Карточки показателей имеют острые углы и выбиваются из системы поверхностей | Все четыре карточки показателей получили одинаковый радиус 20 px и одинаковое внутреннее построение | [Показатели кейса](./user-audit-evidence/screenshot-corrections-2026-09-06/screenshots/10-case-hero-rounded-dark-1440x1000.jpg) | PASS |
| 11 | 18.33.06 | `/cases`, две карточки | Вложенные тёмные блоки и основные карточки скруглены по-разному; основные CTA стоят на разных уровнях | Основные карточки и вложенные результаты используют один радиус. Обе карточки имеют одинаковую высоту, основные кнопки стоят на одной линии | [Карточки](./user-audit-evidence/screenshot-corrections-2026-09-06/screenshots/11-cases-cards-rounded-dark-1440x1000.jpg), [выравнивание CTA](./user-audit-evidence/screenshot-corrections-2026-09-06/screenshots/11-cases-cta-aligned-dark-1440x1000.jpg) | PASS |
| 12 | 18.30.00 | `/seo`, Dark | Та же проблема чрезмерного H1 в тёмной теме | Ограничения размера и ширины применены во всех темах, а не только в Light | [Dark](./user-audit-evidence/screenshot-corrections-2026-09-06/screenshots/07-12-seo-hero-dark-1440x1000.jpg) | PASS |
| 13 | 18.29.40 | `/`, выбор формата | Нажатие на вкладки 1, 2 и 3 визуально не меняет содержание | Исправлен конфликт CSS: неактивные панели с атрибутом `hidden` теперь действительно скрываются. Состояния переключаются, выбранная вкладка и содержимое совпадают | [Выбран «Аудит и внедрение»](./user-audit-evidence/screenshot-corrections-2026-09-06/screenshots/13-home-format-tabs-fixed-light-1440x1000.jpg) | PASS |
| 14 | 18.29.29 | `/`, карусель блога | Изображения не загружены, первая карточка обрезана слева | Карточкам назначены существующие редакционные изображения. Начальное смещение карусели сброшено, первая карточка полностью попадает в область просмотра, все URL изображений отвечают 200 | [Карусель после загрузки](./user-audit-evidence/screenshot-corrections-2026-09-06/screenshots/14-home-articles-images-light-1440x1000.jpg) | PASS |
| 15 | 18.29.19 | `/`, «Что вы получите» | Текст обещает четыре состояния, но сетка показывает только три и оставляет пустую ячейку | Добавлен четвёртый законченный этап «Повторно проверяем» с понятным пояснением. Пустая ячейка устранена | [Четыре этапа](./user-audit-evidence/screenshot-corrections-2026-09-06/screenshots/15-home-deliverables-four-steps-light-1440x1000.jpg) | PASS |
| 16 | 19.13.32 | `/brief`, скачиваемые формы | Нужно убедиться, что офлайн-формы повторяют реальный бриф, а не являются упрощённой памяткой | Пересобраны 24 файла: шесть направлений, два языка, DOCX и PDF. Сохранены реальные вопросы, варианты ответов, многострочные поля и согласие. В DOCX используются элементы управления Word, в PDF — интерактивные поля | [Список файлов в интерфейсе](./user-audit-evidence/screenshot-corrections-2026-09-06/screenshots/16-brief-downloads-open-light-1440x1000.jpg), [визуальная проверка 94 страниц](./user-audit-evidence/screenshot-corrections-2026-09-06/documents-approved-24/) | PASS |
| 17 | 19.13.01 | `/custom-task` и `/brief?service=custom-task`, mobile | Название услуги распадается по отдельным слогам и буквам | Убраны агрессивные `overflow-wrap` и `word-break`; мобильные блоки переведены в одну колонку. Слова переносятся только по естественным границам | [Страница услуги 390 px](./user-audit-evidence/screenshot-corrections-2026-09-06/screenshots/17-22-custom-task-mobile-dark-390x844.jpg), [выбранная услуга в брифе](./user-audit-evidence/screenshot-corrections-2026-09-06/screenshots/17-brief-custom-mobile-dark-390x844.jpg) | PASS |
| 18 | 19.12.22 | `/brief`, первый экран | Правая карточка выглядит как отдельный технический виджет и не объясняет результат брифа | Блок переписан и перестроен: теперь он сообщает, что клиент получит после отправки — состав работ, порядок этапов, стоимость с границами и список нужных материалов | [Первый экран брифа](./user-audit-evidence/screenshot-corrections-2026-09-06/screenshots/18-brief-hero-light-1440x1000.jpg) | PASS |
| 19 | 19.11.40 | `/about`, гарантии | Заголовок не совпадает по левой оси с двухколоночным блоком | Заголовок и карточки привязаны к одной границе контейнера; отступы двух колонок симметричны | [Раздел гарантий](./user-audit-evidence/screenshot-corrections-2026-09-06/screenshots/19-about-boundaries-aligned-section-light-1440x1000.jpg) | PASS |
| 20 | 19.10.41 | `/pricing`, категории и варианты | Все продукты показаны одним длинным столбцом, категории трудно сравнивать | Цены сгруппированы по направлениям. В каждый момент показана одна выбранная категория и её варианты; число вариантов подписывается с правильным склонением. Переключение анимировано и отключается при `prefers-reduced-motion` | [Категория «Тексты и материалы»](./user-audit-evidence/screenshot-corrections-2026-09-06/screenshots/20-pricing-category-layout-light-1440x1000.jpg) | PASS |
| 21 | 19.09.50 | `/pricing`, раскрытые границы тарифа | Первые буквы строк заходят под декоративные маркеры; раскрытая поверхность имеет острые углы | Маркеры вынесены в отдельную колонку, текст больше не перекрывается. Раскрытый блок получил радиус 16 px и корректное обрезание содержимого | [Раскрытые границы](./user-audit-evidence/screenshot-corrections-2026-09-06/screenshots/21-pricing-boundaries-rounded-light-1440x1000.jpg) | PASS |
| 22 | 19.09.24 | `/custom-task`, процесс | «Контекст → рамки → этап → проверка» и «Понятная граница первого этапа» звучат как внутренняя схема и не объясняют работу клиенту | Блок полностью переписан нормальными фразами: описать задачу, определить нужный результат, составить план и согласовать первую проверяемую часть работы | [Новый процесс, mobile](./user-audit-evidence/screenshot-corrections-2026-09-06/screenshots/22-custom-task-path-dark-390x844.jpg), [английская версия](./user-audit-evidence/screenshot-corrections-2026-09-06/screenshots/copy-en-custom-task-light-1440x1000.jpg) | PASS |
| 23 | 19.08.56 | `/marketplaces/wildberries`, навигация по странице | Пункты собраны слева, полоса не использует доступную ширину; нужен понятный active state | Пять пунктов распределены равными колонками по всей ширине. Активный пункт обновляется по текущему разделу; на mobile полоса остаётся локально прокручиваемой без горизонтального переполнения страницы | [Навигация и следующие блоки](./user-audit-evidence/screenshot-corrections-2026-09-06/screenshots/23-24-wildberries-toc-docs-stable-light-1440x1000.jpg), [mobile без переполнения](./user-audit-evidence/screenshot-corrections-2026-09-06/screenshots/01-02-wildberries-offers-mobile-light-390x844.jpg) | PASS |
| 24 | 19.08.22 | `/marketplaces/wildberries`, правила и CTA | Два крупных блока имеют разное внутреннее выравнивание и выглядят несвязанными | Для блока официальных правил и CTA задана одна горизонтальная сетка, одинаковые внутренние отступы и радиус 20 px | [Оба блока](./user-audit-evidence/screenshot-corrections-2026-09-06/screenshots/23-24-wildberries-toc-docs-stable-light-1440x1000.jpg) | PASS |

## Проверка текста

Тексты в затронутых экранах приведены к правилам из `AGENTS.md`:

- убраны технические ярлыки «ПРЕДЕЛ», «Контекст задачи», «Главный результат» и похожие формулировки;
- удалены искусственные конструкции с точками и короткими существительными там, где требовалось нормальное предложение;
- абстрактные маршруты заменены конкретными действиями и результатами;
- русская и английская версии нестандартной задачи переписаны одинаково по смыслу;
- добавлен автоматический запрет на возвращение уже найденных фраз;
- отдельно проверены естественные переносы на ширине 390 px.

Слово Signal осталось только в названии утверждённой темы. Технические имена CSS и переменных не являются пользовательским текстом.

## Browser QA

- Chromium: 21/21 проверок PASS
- Playwright WebKit: 21/21 проверок PASS
- Axe на затронутом брифе: serious/critical 0
- Горизонтальное переполнение на проверенных mobile-состояниях: 0
- Ошибки и предупреждения в браузерной консоли после визуального прохода: 0
- Проверены Light, Dark и Signal
- Проверены desktop 1440 × 1000 и mobile 390 × 844
- Реальный Safari в этой серии не заявляется: использован Playwright WebKit

## Автоматические проверки

| Проверка | Результат |
|---|---:|
| Vitest: тексты, цены, предложения, marketplace и договор офлайн-брифа | 58/58 PASS |
| Playwright: Chromium + WebKit | 42/42 PASS |
| ESLint | PASS |
| TypeScript, основной проект и worker | PASS |
| Production build, standalone assets и worker bundle | PASS |

## DOCX и PDF

- Сгенерировано 24 клиентских файла: 12 DOCX и 12 PDF.
- Отрендерено и просмотрено 94 страницы: 44 страницы DOCX и 50 страниц PDF.
- Обрезанного текста, сломанных символов и пустых страниц не найдено.
- Поля PDF проверены программно как `PDFTextField`, `PDFDropdown` и `PDFCheckBox`.
- Поля DOCX проверены как настоящие элементы управления Word, включая выпадающие списки и многострочные поля.

Доказательства: [documents-approved-24](./user-audit-evidence/screenshot-corrections-2026-09-06/documents-approved-24/).

## Основные изменённые части

- визуальные правила: `app/final-ui-corrections.css`, `app/seo-hub.css`, `app/service-pricing-brief-10.css`, `app/brief-refinement.css`;
- страницы и интерактивные состояния: `HomeDecisionRoute`, `HomeArticleCarousel`, `ServiceTierSelection`, `MarketplaceOfferSelector`, `PricingCategorySelector`, `BriefPage`, `CasesPage`, `StaticPages`;
- тексты и состав услуг: `src/content/services.ts`, `src/content/service-directions.ts`, `src/config/offers.ts`, `src/config/marketplace-offers.ts`;
- генератор офлайн-брифов: `scripts/generate-briefs.mjs` и `public/downloads/generated/`;
- защита от регрессии: `tests/e2e/screenshot-corrections.spec.ts`, `tests/unit/public-copy.test.ts`, `tests/unit/offline-brief-contract.test.ts`, `tests/unit/pricing-option-count.test.ts`.

## Ограничение публикации

Эта работа проверена как локальный release candidate. Commit, push и deploy не выполнялись. Production остаётся на прежней версии до отдельного разрешения владельца.
