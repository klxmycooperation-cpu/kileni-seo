# Диагностическая сверка sitemap и выборки production-аудита

Дата снимка: 2026-09-03T22:25:57.714Z.
Audit ID: `-PT6rbtFQvPyf_ndAtMPk9wcRKGvjNNypzw19VQ2tiw`.
Целевой адрес: https://kileni-seo.ru/.

## Вывод

В sitemap реально прочитано 216 адресов. Из них предварительно просмотрено 100, а 116 не загружались из-за технического лимита обхода. Поэтому клиентская формулировка — «Предварительно просмотрено адресов: 100», а не «На сайте найдено 100 HTML-страниц».

Не загруженные адреса не названы HTML, документами или перенаправлениями: их тип невозможно достоверно установить без HTTP-ответа и содержимого.

## Арифметика sitemap

| Состояние | Количество |
|---|---:|
| Адресов в sitemap | 216 |
| Загружено | 100 |
| Не загружено | 116 |
| Определено как HTML | 100 |
| Перенаправления | 0 |
| Документы | 0 |
| Технические ресурсы | 0 |
| Ошибки HTTP | 0 |
| Пропущено из-за технического лимита | 116 |

Проверка равенства: 216 = 100 загруженных + 116 не загруженных.

## Арифметика выборки

- 100 обработанных HTML-страниц = 99 подходящих + 1 исключённая.
- 99 подходящих = 10 выбранных + 89 не вошедших.
- 10 выбранных = 10 проверенных + 0 незавершённых.

Фактически исключена `/consent`. `/privacy` в этом запуске относится к 116 незагруженным адресам и потому не была классифицирована и не учитывается как исключённая страница.

## Итоговые 10 URL

| № | URL | pageType | businessPriority | Причина выбора |
|---:|---|---|---|---|
| 1 | https://kileni-seo.ru/ | homepage | введённый адрес / главная (0) | введённый пользователем URL |
| 2 | https://kileni-seo.ru/services | category | раздел услуг (1) | раздел услуг |
| 3 | https://kileni-seo.ru/seo | service | основная услуга (2) | основная коммерческая страница |
| 4 | https://kileni-seo.ru/pricing | pricing | цены (3) | конверсионная страница |
| 5 | https://kileni-seo.ru/free-audit | commercial | бесплатная проверка (4) | конверсионная страница |
| 6 | https://kileni-seo.ru/brief | conversion_support | форма обращения / бриф (5) | конверсионная страница |
| 7 | https://kileni-seo.ru/contacts | contact | контакты (6) | конверсионная страница |
| 8 | https://kileni-seo.ru/cases/eco-santeh | case | кейс (7) | кейс |
| 9 | https://kileni-seo.ru/blog/seo-audit-when-you-need-it | article | статья (8) | один представитель статьи |
| 10 | https://kileni-seo.ru/about | about | о компании (10) | дополнительный важный тип |

## Почему выбраны `/free-audit`, `/services` и `/brief`

- `/free-audit`: pageType `commercial`, приоритет «бесплатная проверка» (4), выбран №5: конверсионная страница.
- `/services`: pageType `category`, приоритет «раздел услуг» (1), выбран №2: раздел услуг.
- `/brief`: pageType `conversion_support`, приоритет «форма обращения / бриф» (5), выбран №6: конверсионная страница.

Эти три страницы расположены выше glossary и других информационных разделов не по имени домена и не по жёстко заданным URL KILENI, а по общим ролям: раздел услуг, бесплатная проверка и форма обращения.

## Полный список обработанных HTML-кандидатов

`pageType` ниже — значение, сохранённое после загрузки страницы. Если оно осталось `unknown`, sampler использовал общую роль URL, отражённую в `businessPriority`; это не меняет сохранённый классификатор задним числом.

| № | URL | Язык | pageType snapshot | businessPriority | Eligible | Решение |
|---:|---|---|---|---|---:|---|
| 1 | https://kileni-seo.ru/ | ru | homepage | введённый адрес / главная (0) | да | выбран №1: введённый пользователем URL |
| 2 | https://kileni-seo.ru/services | ru | category | раздел услуг (1) | да | выбран №2: раздел услуг |
| 3 | https://kileni-seo.ru/seo | ru | service | основная услуга (2) | да | выбран №3: основная коммерческая страница |
| 4 | https://kileni-seo.ru/seo-audit | ru | unknown | основная услуга (2) | да | подходит; не вошёл в лимит 10 |
| 5 | https://kileni-seo.ru/seo-promotion | ru | unknown | основная услуга (2) | да | подходит; не вошёл в лимит 10 |
| 6 | https://kileni-seo.ru/pricing | ru | pricing | цены (3) | да | выбран №4: конверсионная страница |
| 7 | https://kileni-seo.ru/free-audit | ru | unknown | бесплатная проверка (4) | да | выбран №5: конверсионная страница |
| 8 | https://kileni-seo.ru/brief | ru | unknown | форма обращения / бриф (5) | да | выбран №6: конверсионная страница |
| 9 | https://kileni-seo.ru/contacts | ru | contact | контакты (6) | да | выбран №7: конверсионная страница |
| 10 | https://kileni-seo.ru/cases | ru | category | кейс (7) | да | подходит; не вошёл в лимит 10 |
| 11 | https://kileni-seo.ru/cases/eco-santeh | ru | case | кейс (7) | да | выбран №8: кейс |
| 12 | https://kileni-seo.ru/cases/zasorservice | ru | case | кейс (7) | да | подходит; похожий шаблон уже представлен |
| 13 | https://kileni-seo.ru/blog/seo-audit-when-you-need-it | ru | article | статья (8) | да | выбран №9: один представитель статьи |
| 14 | https://kileni-seo.ru/blog/seo-ecommerce-promotion | ru | article | статья (8) | да | подходит; не вошёл в лимит 10 |
| 15 | https://kileni-seo.ru/blog/seo-promotion-cost | ru | article | статья (8) | да | подходит; не вошёл в лимит 10 |
| 16 | https://kileni-seo.ru/blog/seo-vs-yandex-ads | ru | article | статья (8) | да | подходит; не вошёл в лимит 10 |
| 17 | https://kileni-seo.ru/blog/website-speed-loading | ru | article | статья (8) | да | подходит; похожий шаблон уже представлен |
| 18 | https://kileni-seo.ru/blog/why-website-is-not-in-search | ru | article | статья (8) | да | подходит; не вошёл в лимит 10 |
| 19 | https://kileni-seo.ru/blog/wildberries-ozon-product-card | ru | article | статья (8) | да | подходит; похожий шаблон уже представлен |
| 20 | https://kileni-seo.ru/checks/canonical-url | ru | article | статья (8) | да | подходит; не вошёл в лимит 10 |
| 21 | https://kileni-seo.ru/checks/cumulative-layout-shift | ru | article | статья (8) | да | подходит; не вошёл в лимит 10 |
| 22 | https://kileni-seo.ru/checks/document-charset | ru | article | статья (8) | да | подходит; не вошёл в лимит 10 |
| 23 | https://kileni-seo.ru/checks/first-contentful-paint | ru | article | статья (8) | да | подходит; не вошёл в лимит 10 |
| 24 | https://kileni-seo.ru/checks/heading-hierarchy | ru | article | статья (8) | да | подходит; не вошёл в лимит 10 |
| 25 | https://kileni-seo.ru/checks/html-language | ru | article | статья (8) | да | подходит; не вошёл в лимит 10 |
| 26 | https://kileni-seo.ru/checks/http-status | ru | article | статья (8) | да | подходит; не вошёл в лимит 10 |
| 27 | https://kileni-seo.ru/checks/https | ru | article | статья (8) | да | подходит; не вошёл в лимит 10 |
| 28 | https://kileni-seo.ru/checks/image-alt-text | ru | article | статья (8) | да | подходит; не вошёл в лимит 10 |
| 29 | https://kileni-seo.ru/checks/image-dimensions | ru | article | статья (8) | да | подходит; не вошёл в лимит 10 |
| 30 | https://kileni-seo.ru/checks/indexability | ru | article | статья (8) | да | подходит; не вошёл в лимит 10 |
| 31 | https://kileni-seo.ru/checks/internal-link-presence | ru | article | статья (8) | да | подходит; не вошёл в лимит 10 |
| 32 | https://kileni-seo.ru/checks/largest-contentful-paint | ru | article | статья (8) | да | подходит; не вошёл в лимит 10 |
| 33 | https://kileni-seo.ru/checks/lighthouse-accessibility | ru | article | статья (8) | да | подходит; не вошёл в лимит 10 |
| 34 | https://kileni-seo.ru/checks/lighthouse-performance | ru | article | статья (8) | да | подходит; не вошёл в лимит 10 |
| 35 | https://kileni-seo.ru/checks/meta-description | ru | article | статья (8) | да | подходит; не вошёл в лимит 10 |
| 36 | https://kileni-seo.ru/checks/mixed-content | ru | article | статья (8) | да | подходит; не вошёл в лимит 10 |
| 37 | https://kileni-seo.ru/checks/mobile-viewport | ru | article | статья (8) | да | подходит; не вошёл в лимит 10 |
| 38 | https://kileni-seo.ru/checks/open-graph | ru | article | статья (8) | да | подходит; не вошёл в лимит 10 |
| 39 | https://kileni-seo.ru/checks/page-title | ru | article | статья (8) | да | подходит; не вошёл в лимит 10 |
| 40 | https://kileni-seo.ru/checks/robots-root-access | ru | article | статья (8) | да | подходит; не вошёл в лимит 10 |
| 41 | https://kileni-seo.ru/checks/robots-txt | ru | article | статья (8) | да | подходит; не вошёл в лимит 10 |
| 42 | https://kileni-seo.ru/checks/security-headers | ru | article | статья (8) | да | подходит; не вошёл в лимит 10 |
| 43 | https://kileni-seo.ru/checks/single-h1 | ru | article | статья (8) | да | подходит; не вошёл в лимит 10 |
| 44 | https://kileni-seo.ru/checks/structured-data | ru | article | статья (8) | да | подходит; не вошёл в лимит 10 |
| 45 | https://kileni-seo.ru/checks/total-blocking-time | ru | article | статья (8) | да | подходит; не вошёл в лимит 10 |
| 46 | https://kileni-seo.ru/checks/unique-page-titles | ru | article | статья (8) | да | подходит; не вошёл в лимит 10 |
| 47 | https://kileni-seo.ru/checks/useful-content-depth | ru | article | статья (8) | да | подходит; не вошёл в лимит 10 |
| 48 | https://kileni-seo.ru/checks/working-internal-links | ru | article | статья (8) | да | подходит; не вошёл в лимит 10 |
| 49 | https://kileni-seo.ru/checks/xml-sitemap | ru | article | статья (8) | да | подходит; не вошёл в лимит 10 |
| 50 | https://kileni-seo.ru/about | ru | about | о компании (10) | да | выбран №10: дополнительный важный тип |
| 51 | https://kileni-seo.ru/blog | ru | category | информационный раздел (11) | да | подходит; не вошёл в лимит 10 |
| 52 | https://kileni-seo.ru/checks | ru | unknown | информационный раздел (11) | да | подходит; не вошёл в лимит 10 |
| 53 | https://kileni-seo.ru/glossary | ru | unknown | информационный раздел (11) | да | подходит; не вошёл в лимит 10 |
| 54 | https://kileni-seo.ru/glossary/ab-testing | ru | unknown | информационный раздел (11) | да | подходит; не вошёл в лимит 10 |
| 55 | https://kileni-seo.ru/glossary/acceptance-criterion | ru | unknown | информационный раздел (11) | да | подходит; не вошёл в лимит 10 |
| 56 | https://kileni-seo.ru/glossary/canonical | ru | unknown | информационный раздел (11) | да | подходит; не вошёл в лимит 10 |
| 57 | https://kileni-seo.ru/glossary/cls | ru | unknown | информационный раздел (11) | да | подходит; не вошёл в лимит 10 |
| 58 | https://kileni-seo.ru/glossary/conversion | ru | unknown | информационный раздел (11) | да | подходит; не вошёл в лимит 10 |
| 59 | https://kileni-seo.ru/glossary/core-web-vitals | ru | unknown | информационный раздел (11) | да | подходит; не вошёл в лимит 10 |
| 60 | https://kileni-seo.ru/glossary/crawling | ru | unknown | информационный раздел (11) | да | подходит; не вошёл в лимит 10 |
| 61 | https://kileni-seo.ru/glossary/ctr | ru | unknown | информационный раздел (11) | да | подходит; не вошёл в лимит 10 |
| 62 | https://kileni-seo.ru/glossary/description | ru | unknown | информационный раздел (11) | да | подходит; не вошёл в лимит 10 |
| 63 | https://kileni-seo.ru/glossary/duplicate-page | ru | unknown | информационный раздел (11) | да | подходит; не вошёл в лимит 10 |
| 64 | https://kileni-seo.ru/glossary/heading-h1 | ru | unknown | информационный раздел (11) | да | подходит; не вошёл в лимит 10 |
| 65 | https://kileni-seo.ru/glossary/http-404 | ru | unknown | информационный раздел (11) | да | подходит; не вошёл в лимит 10 |
| 66 | https://kileni-seo.ru/glossary/http-status | ru | unknown | информационный раздел (11) | да | подходит; не вошёл в лимит 10 |
| 67 | https://kileni-seo.ru/glossary/indexing | ru | unknown | информационный раздел (11) | да | подходит; не вошёл в лимит 10 |
| 68 | https://kileni-seo.ru/glossary/inp | ru | unknown | информационный раздел (11) | да | подходит; не вошёл в лимит 10 |
| 69 | https://kileni-seo.ru/glossary/internal-link | ru | unknown | информационный раздел (11) | да | подходит; не вошёл в лимит 10 |
| 70 | https://kileni-seo.ru/glossary/internal-linking | ru | unknown | информационный раздел (11) | да | подходит; не вошёл в лимит 10 |
| 71 | https://kileni-seo.ru/glossary/json-ld | ru | unknown | информационный раздел (11) | да | подходит; не вошёл в лимит 10 |
| 72 | https://kileni-seo.ru/glossary/landing-page | ru | unknown | информационный раздел (11) | да | подходит; не вошёл в лимит 10 |
| 73 | https://kileni-seo.ru/glossary/lcp | ru | unknown | информационный раздел (11) | да | подходит; не вошёл в лимит 10 |
| 74 | https://kileni-seo.ru/glossary/lighthouse | ru | unknown | информационный раздел (11) | да | подходит; не вошёл в лимит 10 |
| 75 | https://kileni-seo.ru/glossary/meta-tags | ru | unknown | информационный раздел (11) | да | подходит; не вошёл в лимит 10 |
| 76 | https://kileni-seo.ru/glossary/on-page | ru | unknown | информационный раздел (11) | да | подходит; не вошёл в лимит 10 |
| 77 | https://kileni-seo.ru/glossary/page-cannibalisation | ru | unknown | информационный раздел (11) | да | подходит; не вошёл в лимит 10 |
| 78 | https://kileni-seo.ru/glossary/product-attribute | ru | unknown | информационный раздел (11) | да | подходит; не вошёл в лимит 10 |
| 79 | https://kileni-seo.ru/glossary/product-card | ru | unknown | информационный раздел (11) | да | подходит; не вошёл в лимит 10 |
| 80 | https://kileni-seo.ru/glossary/product-feed | ru | unknown | информационный раздел (11) | да | подходит; не вошёл в лимит 10 |
| 81 | https://kileni-seo.ru/glossary/query-cluster | ru | unknown | информационный раздел (11) | да | подходит; не вошёл в лимит 10 |
| 82 | https://kileni-seo.ru/glossary/query-clustering | ru | unknown | информационный раздел (11) | да | подходит; не вошёл в лимит 10 |
| 83 | https://kileni-seo.ru/glossary/redirect | ru | unknown | информационный раздел (11) | да | подходит; не вошёл в лимит 10 |
| 84 | https://kileni-seo.ru/glossary/rich-content | ru | unknown | информационный раздел (11) | да | подходит; не вошёл в лимит 10 |
| 85 | https://kileni-seo.ru/glossary/robots-txt | ru | unknown | информационный раздел (11) | да | подходит; не вошёл в лимит 10 |
| 86 | https://kileni-seo.ru/glossary/schema-org | ru | unknown | информационный раздел (11) | да | подходит; не вошёл в лимит 10 |
| 87 | https://kileni-seo.ru/glossary/search-crawler | ru | unknown | информационный раздел (11) | да | подходит; не вошёл в лимит 10 |
| 88 | https://kileni-seo.ru/glossary/search-intent | ru | unknown | информационный раздел (11) | да | подходит; не вошёл в лимит 10 |
| 89 | https://kileni-seo.ru/glossary/search-semantics | ru | unknown | информационный раздел (11) | да | подходит; не вошёл в лимит 10 |
| 90 | https://kileni-seo.ru/glossary/semantic-core | ru | unknown | информационный раздел (11) | да | подходит; не вошёл в лимит 10 |
| 91 | https://kileni-seo.ru/glossary/seo-audit | ru | unknown | информационный раздел (11) | да | подходит; не вошёл в лимит 10 |
| 92 | https://kileni-seo.ru/glossary/sitemap | ru | unknown | информационный раздел (11) | да | подходит; не вошёл в лимит 10 |
| 93 | https://kileni-seo.ru/glossary/sku | ru | unknown | информационный раздел (11) | да | подходит; не вошёл в лимит 10 |
| 94 | https://kileni-seo.ru/glossary/structured-data | ru | unknown | информационный раздел (11) | да | подходит; не вошёл в лимит 10 |
| 95 | https://kileni-seo.ru/glossary/tbt | ru | unknown | информационный раздел (11) | да | подходит; не вошёл в лимит 10 |
| 96 | https://kileni-seo.ru/glossary/title | ru | unknown | информационный раздел (11) | да | подходит; не вошёл в лимит 10 |
| 97 | https://kileni-seo.ru/glossary/url | ru | unknown | информационный раздел (11) | да | подходит; не вошёл в лимит 10 |
| 98 | https://kileni-seo.ru/calculator | ru | unknown | прочее (13) | да | подходит; не вошёл в лимит 10 |
| 99 | https://kileni-seo.ru/consent | ru | legal | прочее (13) | нет | исключён до выборки: technical_page |
| 100 | https://kileni-seo.ru/content-materials | ru | unknown | прочее (13) | да | подходит; не вошёл в лимит 10 |

## Построчная сверка всех 216 URL из sitemap

«Не определено» означает только то, что URL не загружался. Это не утверждение о типе ресурса.

| № | URL | Загружен | HTTP | Категория | Результат |
|---:|---|---:|---:|---|---|
| 1 | https://kileni-seo.ru/ | да | 200 | HTML | HTML; выбран №1 |
| 2 | https://kileni-seo.ru/en | нет | — | не определено | не загружен: технический лимит обхода |
| 3 | https://kileni-seo.ru/services | да | 200 | HTML | HTML; выбран №2 |
| 4 | https://kileni-seo.ru/en/services | нет | — | не определено | не загружен: технический лимит обхода |
| 5 | https://kileni-seo.ru/seo | да | 200 | HTML | HTML; выбран №3 |
| 6 | https://kileni-seo.ru/en/seo | нет | — | не определено | не загружен: технический лимит обхода |
| 7 | https://kileni-seo.ru/seo-audit | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 8 | https://kileni-seo.ru/en/seo-audit | нет | — | не определено | не загружен: технический лимит обхода |
| 9 | https://kileni-seo.ru/seo-promotion | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 10 | https://kileni-seo.ru/en/seo-promotion | нет | — | не определено | не загружен: технический лимит обхода |
| 11 | https://kileni-seo.ru/marketplaces | нет | — | не определено | не загружен: технический лимит обхода |
| 12 | https://kileni-seo.ru/en/marketplaces | нет | — | не определено | не загружен: технический лимит обхода |
| 13 | https://kileni-seo.ru/marketplaces/wildberries | нет | — | не определено | не загружен: технический лимит обхода |
| 14 | https://kileni-seo.ru/en/marketplaces/wildberries | нет | — | не определено | не загружен: технический лимит обхода |
| 15 | https://kileni-seo.ru/marketplaces/ozon | нет | — | не определено | не загружен: технический лимит обхода |
| 16 | https://kileni-seo.ru/en/marketplaces/ozon | нет | — | не определено | не загружен: технический лимит обхода |
| 17 | https://kileni-seo.ru/marketplaces/yandex-market | нет | — | не определено | не загружен: технический лимит обхода |
| 18 | https://kileni-seo.ru/en/marketplaces/yandex-market | нет | — | не определено | не загружен: технический лимит обхода |
| 19 | https://kileni-seo.ru/web-development | нет | — | не определено | не загружен: технический лимит обхода |
| 20 | https://kileni-seo.ru/en/web-development | нет | — | не определено | не загружен: технический лимит обхода |
| 21 | https://kileni-seo.ru/yandex-ads | нет | — | не определено | не загружен: технический лимит обхода |
| 22 | https://kileni-seo.ru/en/yandex-ads | нет | — | не определено | не загружен: технический лимит обхода |
| 23 | https://kileni-seo.ru/content-materials | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 24 | https://kileni-seo.ru/en/content-materials | нет | — | не определено | не загружен: технический лимит обхода |
| 25 | https://kileni-seo.ru/custom-task | нет | — | не определено | не загружен: технический лимит обхода |
| 26 | https://kileni-seo.ru/en/custom-task | нет | — | не определено | не загружен: технический лимит обхода |
| 27 | https://kileni-seo.ru/pricing | да | 200 | HTML | HTML; выбран №4 |
| 28 | https://kileni-seo.ru/en/pricing | нет | — | не определено | не загружен: технический лимит обхода |
| 29 | https://kileni-seo.ru/calculator | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 30 | https://kileni-seo.ru/en/calculator | нет | — | не определено | не загружен: технический лимит обхода |
| 31 | https://kileni-seo.ru/cases | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 32 | https://kileni-seo.ru/en/cases | нет | — | не определено | не загружен: технический лимит обхода |
| 33 | https://kileni-seo.ru/cases/eco-santeh | да | 200 | HTML | HTML; выбран №8 |
| 34 | https://kileni-seo.ru/en/cases/eco-santeh | нет | — | не определено | не загружен: технический лимит обхода |
| 35 | https://kileni-seo.ru/cases/zasorservice | да | 200 | HTML | HTML; подходит, похожий шаблон уже представлен |
| 36 | https://kileni-seo.ru/en/cases/zasorservice | нет | — | не определено | не загружен: технический лимит обхода |
| 37 | https://kileni-seo.ru/brief | да | 200 | HTML | HTML; выбран №6 |
| 38 | https://kileni-seo.ru/en/brief | нет | — | не определено | не загружен: технический лимит обхода |
| 39 | https://kileni-seo.ru/blog | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 40 | https://kileni-seo.ru/en/blog | нет | — | не определено | не загружен: технический лимит обхода |
| 41 | https://kileni-seo.ru/glossary | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 42 | https://kileni-seo.ru/en/glossary | нет | — | не определено | не загружен: технический лимит обхода |
| 43 | https://kileni-seo.ru/about | да | 200 | HTML | HTML; выбран №10 |
| 44 | https://kileni-seo.ru/en/about | нет | — | не определено | не загружен: технический лимит обхода |
| 45 | https://kileni-seo.ru/contacts | да | 200 | HTML | HTML; выбран №7 |
| 46 | https://kileni-seo.ru/en/contacts | нет | — | не определено | не загружен: технический лимит обхода |
| 47 | https://kileni-seo.ru/privacy | нет | — | не определено | не загружен: технический лимит обхода |
| 48 | https://kileni-seo.ru/en/privacy | нет | — | не определено | не загружен: технический лимит обхода |
| 49 | https://kileni-seo.ru/consent | да | 200 | HTML | HTML; исключён до выборки |
| 50 | https://kileni-seo.ru/en/consent | нет | — | не определено | не загружен: технический лимит обхода |
| 51 | https://kileni-seo.ru/free-audit | да | 200 | HTML | HTML; выбран №5 |
| 52 | https://kileni-seo.ru/en/free-audit | нет | — | не определено | не загружен: технический лимит обхода |
| 53 | https://kileni-seo.ru/blog/seo-audit-when-you-need-it | да | 200 | HTML | HTML; выбран №9 |
| 54 | https://kileni-seo.ru/en/blog/seo-audit-when-you-need-it | нет | — | не определено | не загружен: технический лимит обхода |
| 55 | https://kileni-seo.ru/blog/wildberries-ozon-product-card | да | 200 | HTML | HTML; подходит, похожий шаблон уже представлен |
| 56 | https://kileni-seo.ru/en/blog/wildberries-ozon-product-card | нет | — | не определено | не загружен: технический лимит обхода |
| 57 | https://kileni-seo.ru/blog/why-website-is-not-in-search | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 58 | https://kileni-seo.ru/en/blog/why-website-is-not-in-search | нет | — | не определено | не загружен: технический лимит обхода |
| 59 | https://kileni-seo.ru/blog/seo-vs-yandex-ads | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 60 | https://kileni-seo.ru/en/blog/seo-vs-yandex-ads | нет | — | не определено | не загружен: технический лимит обхода |
| 61 | https://kileni-seo.ru/blog/website-speed-loading | да | 200 | HTML | HTML; подходит, похожий шаблон уже представлен |
| 62 | https://kileni-seo.ru/en/blog/website-speed-loading | нет | — | не определено | не загружен: технический лимит обхода |
| 63 | https://kileni-seo.ru/blog/seo-ecommerce-promotion | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 64 | https://kileni-seo.ru/en/blog/seo-ecommerce-promotion | нет | — | не определено | не загружен: технический лимит обхода |
| 65 | https://kileni-seo.ru/blog/seo-promotion-cost | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 66 | https://kileni-seo.ru/en/blog/seo-promotion-cost | нет | — | не определено | не загружен: технический лимит обхода |
| 67 | https://kileni-seo.ru/checks | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 68 | https://kileni-seo.ru/en/checks | нет | — | не определено | не загружен: технический лимит обхода |
| 69 | https://kileni-seo.ru/checks/http-status | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 70 | https://kileni-seo.ru/en/checks/http-status | нет | — | не определено | не загружен: технический лимит обхода |
| 71 | https://kileni-seo.ru/checks/indexability | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 72 | https://kileni-seo.ru/en/checks/indexability | нет | — | не определено | не загружен: технический лимит обхода |
| 73 | https://kileni-seo.ru/checks/canonical-url | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 74 | https://kileni-seo.ru/en/checks/canonical-url | нет | — | не определено | не загружен: технический лимит обхода |
| 75 | https://kileni-seo.ru/checks/robots-root-access | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 76 | https://kileni-seo.ru/en/checks/robots-root-access | нет | — | не определено | не загружен: технический лимит обхода |
| 77 | https://kileni-seo.ru/checks/robots-txt | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 78 | https://kileni-seo.ru/en/checks/robots-txt | нет | — | не определено | не загружен: технический лимит обхода |
| 79 | https://kileni-seo.ru/checks/xml-sitemap | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 80 | https://kileni-seo.ru/en/checks/xml-sitemap | нет | — | не определено | не загружен: технический лимит обхода |
| 81 | https://kileni-seo.ru/checks/document-charset | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 82 | https://kileni-seo.ru/en/checks/document-charset | нет | — | не определено | не загружен: технический лимит обхода |
| 83 | https://kileni-seo.ru/checks/page-title | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 84 | https://kileni-seo.ru/en/checks/page-title | нет | — | не определено | не загружен: технический лимит обхода |
| 85 | https://kileni-seo.ru/checks/unique-page-titles | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 86 | https://kileni-seo.ru/en/checks/unique-page-titles | нет | — | не определено | не загружен: технический лимит обхода |
| 87 | https://kileni-seo.ru/checks/single-h1 | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 88 | https://kileni-seo.ru/en/checks/single-h1 | нет | — | не определено | не загружен: технический лимит обхода |
| 89 | https://kileni-seo.ru/checks/heading-hierarchy | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 90 | https://kileni-seo.ru/en/checks/heading-hierarchy | нет | — | не определено | не загружен: технический лимит обхода |
| 91 | https://kileni-seo.ru/checks/internal-link-presence | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 92 | https://kileni-seo.ru/en/checks/internal-link-presence | нет | — | не определено | не загружен: технический лимит обхода |
| 93 | https://kileni-seo.ru/checks/working-internal-links | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 94 | https://kileni-seo.ru/en/checks/working-internal-links | нет | — | не определено | не загружен: технический лимит обхода |
| 95 | https://kileni-seo.ru/checks/html-language | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 96 | https://kileni-seo.ru/en/checks/html-language | нет | — | не определено | не загружен: технический лимит обхода |
| 97 | https://kileni-seo.ru/checks/lighthouse-performance | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 98 | https://kileni-seo.ru/en/checks/lighthouse-performance | нет | — | не определено | не загружен: технический лимит обхода |
| 99 | https://kileni-seo.ru/checks/first-contentful-paint | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 100 | https://kileni-seo.ru/en/checks/first-contentful-paint | нет | — | не определено | не загружен: технический лимит обхода |
| 101 | https://kileni-seo.ru/checks/largest-contentful-paint | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 102 | https://kileni-seo.ru/en/checks/largest-contentful-paint | нет | — | не определено | не загружен: технический лимит обхода |
| 103 | https://kileni-seo.ru/checks/cumulative-layout-shift | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 104 | https://kileni-seo.ru/en/checks/cumulative-layout-shift | нет | — | не определено | не загружен: технический лимит обхода |
| 105 | https://kileni-seo.ru/checks/total-blocking-time | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 106 | https://kileni-seo.ru/en/checks/total-blocking-time | нет | — | не определено | не загружен: технический лимит обхода |
| 107 | https://kileni-seo.ru/checks/lighthouse-accessibility | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 108 | https://kileni-seo.ru/en/checks/lighthouse-accessibility | нет | — | не определено | не загружен: технический лимит обхода |
| 109 | https://kileni-seo.ru/checks/mobile-viewport | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 110 | https://kileni-seo.ru/en/checks/mobile-viewport | нет | — | не определено | не загружен: технический лимит обхода |
| 111 | https://kileni-seo.ru/checks/https | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 112 | https://kileni-seo.ru/en/checks/https | нет | — | не определено | не загружен: технический лимит обхода |
| 113 | https://kileni-seo.ru/checks/mixed-content | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 114 | https://kileni-seo.ru/en/checks/mixed-content | нет | — | не определено | не загружен: технический лимит обхода |
| 115 | https://kileni-seo.ru/checks/security-headers | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 116 | https://kileni-seo.ru/en/checks/security-headers | нет | — | не определено | не загружен: технический лимит обхода |
| 117 | https://kileni-seo.ru/checks/structured-data | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 118 | https://kileni-seo.ru/en/checks/structured-data | нет | — | не определено | не загружен: технический лимит обхода |
| 119 | https://kileni-seo.ru/checks/open-graph | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 120 | https://kileni-seo.ru/en/checks/open-graph | нет | — | не определено | не загружен: технический лимит обхода |
| 121 | https://kileni-seo.ru/checks/meta-description | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 122 | https://kileni-seo.ru/en/checks/meta-description | нет | — | не определено | не загружен: технический лимит обхода |
| 123 | https://kileni-seo.ru/checks/useful-content-depth | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 124 | https://kileni-seo.ru/en/checks/useful-content-depth | нет | — | не определено | не загружен: технический лимит обхода |
| 125 | https://kileni-seo.ru/checks/image-alt-text | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 126 | https://kileni-seo.ru/en/checks/image-alt-text | нет | — | не определено | не загружен: технический лимит обхода |
| 127 | https://kileni-seo.ru/checks/image-dimensions | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 128 | https://kileni-seo.ru/en/checks/image-dimensions | нет | — | не определено | не загружен: технический лимит обхода |
| 129 | https://kileni-seo.ru/glossary/url | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 130 | https://kileni-seo.ru/en/glossary/url | нет | — | не определено | не загружен: технический лимит обхода |
| 131 | https://kileni-seo.ru/glossary/http-status | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 132 | https://kileni-seo.ru/en/glossary/http-status | нет | — | не определено | не загружен: технический лимит обхода |
| 133 | https://kileni-seo.ru/glossary/lighthouse | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 134 | https://kileni-seo.ru/en/glossary/lighthouse | нет | — | не определено | не загружен: технический лимит обхода |
| 135 | https://kileni-seo.ru/glossary/seo-audit | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 136 | https://kileni-seo.ru/en/glossary/seo-audit | нет | — | не определено | не загружен: технический лимит обхода |
| 137 | https://kileni-seo.ru/glossary/indexing | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 138 | https://kileni-seo.ru/en/glossary/indexing | нет | — | не определено | не загружен: технический лимит обхода |
| 139 | https://kileni-seo.ru/glossary/crawling | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 140 | https://kileni-seo.ru/en/glossary/crawling | нет | — | не определено | не загружен: технический лимит обхода |
| 141 | https://kileni-seo.ru/glossary/search-crawler | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 142 | https://kileni-seo.ru/en/glossary/search-crawler | нет | — | не определено | не загружен: технический лимит обхода |
| 143 | https://kileni-seo.ru/glossary/robots-txt | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 144 | https://kileni-seo.ru/en/glossary/robots-txt | нет | — | не определено | не загружен: технический лимит обхода |
| 145 | https://kileni-seo.ru/glossary/sitemap | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 146 | https://kileni-seo.ru/en/glossary/sitemap | нет | — | не определено | не загружен: технический лимит обхода |
| 147 | https://kileni-seo.ru/glossary/canonical | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 148 | https://kileni-seo.ru/en/glossary/canonical | нет | — | не определено | не загружен: технический лимит обхода |
| 149 | https://kileni-seo.ru/glossary/redirect | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 150 | https://kileni-seo.ru/en/glossary/redirect | нет | — | не определено | не загружен: технический лимит обхода |
| 151 | https://kileni-seo.ru/glossary/http-404 | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 152 | https://kileni-seo.ru/en/glossary/http-404 | нет | — | не определено | не загружен: технический лимит обхода |
| 153 | https://kileni-seo.ru/glossary/title | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 154 | https://kileni-seo.ru/en/glossary/title | нет | — | не определено | не загружен: технический лимит обхода |
| 155 | https://kileni-seo.ru/glossary/description | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 156 | https://kileni-seo.ru/en/glossary/description | нет | — | не определено | не загружен: технический лимит обхода |
| 157 | https://kileni-seo.ru/glossary/heading-h1 | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 158 | https://kileni-seo.ru/en/glossary/heading-h1 | нет | — | не определено | не загружен: технический лимит обхода |
| 159 | https://kileni-seo.ru/glossary/meta-tags | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 160 | https://kileni-seo.ru/en/glossary/meta-tags | нет | — | не определено | не загружен: технический лимит обхода |
| 161 | https://kileni-seo.ru/glossary/on-page | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 162 | https://kileni-seo.ru/en/glossary/on-page | нет | — | не определено | не загружен: технический лимит обхода |
| 163 | https://kileni-seo.ru/glossary/internal-link | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 164 | https://kileni-seo.ru/en/glossary/internal-link | нет | — | не определено | не загружен: технический лимит обхода |
| 165 | https://kileni-seo.ru/glossary/internal-linking | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 166 | https://kileni-seo.ru/en/glossary/internal-linking | нет | — | не определено | не загружен: технический лимит обхода |
| 167 | https://kileni-seo.ru/glossary/duplicate-page | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 168 | https://kileni-seo.ru/en/glossary/duplicate-page | нет | — | не определено | не загружен: технический лимит обхода |
| 169 | https://kileni-seo.ru/glossary/schema-org | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 170 | https://kileni-seo.ru/en/glossary/schema-org | нет | — | не определено | не загружен: технический лимит обхода |
| 171 | https://kileni-seo.ru/glossary/structured-data | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 172 | https://kileni-seo.ru/en/glossary/structured-data | нет | — | не определено | не загружен: технический лимит обхода |
| 173 | https://kileni-seo.ru/glossary/json-ld | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 174 | https://kileni-seo.ru/en/glossary/json-ld | нет | — | не определено | не загружен: технический лимит обхода |
| 175 | https://kileni-seo.ru/glossary/core-web-vitals | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 176 | https://kileni-seo.ru/en/glossary/core-web-vitals | нет | — | не определено | не загружен: технический лимит обхода |
| 177 | https://kileni-seo.ru/glossary/lcp | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 178 | https://kileni-seo.ru/en/glossary/lcp | нет | — | не определено | не загружен: технический лимит обхода |
| 179 | https://kileni-seo.ru/glossary/cls | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 180 | https://kileni-seo.ru/en/glossary/cls | нет | — | не определено | не загружен: технический лимит обхода |
| 181 | https://kileni-seo.ru/glossary/tbt | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 182 | https://kileni-seo.ru/en/glossary/tbt | нет | — | не определено | не загружен: технический лимит обхода |
| 183 | https://kileni-seo.ru/glossary/inp | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 184 | https://kileni-seo.ru/en/glossary/inp | нет | — | не определено | не загружен: технический лимит обхода |
| 185 | https://kileni-seo.ru/glossary/ctr | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 186 | https://kileni-seo.ru/en/glossary/ctr | нет | — | не определено | не загружен: технический лимит обхода |
| 187 | https://kileni-seo.ru/glossary/conversion | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 188 | https://kileni-seo.ru/en/glossary/conversion | нет | — | не определено | не загружен: технический лимит обхода |
| 189 | https://kileni-seo.ru/glossary/search-semantics | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 190 | https://kileni-seo.ru/en/glossary/search-semantics | нет | — | не определено | не загружен: технический лимит обхода |
| 191 | https://kileni-seo.ru/glossary/query-cluster | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 192 | https://kileni-seo.ru/en/glossary/query-cluster | нет | — | не определено | не загружен: технический лимит обхода |
| 193 | https://kileni-seo.ru/glossary/semantic-core | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 194 | https://kileni-seo.ru/en/glossary/semantic-core | нет | — | не определено | не загружен: технический лимит обхода |
| 195 | https://kileni-seo.ru/glossary/query-clustering | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 196 | https://kileni-seo.ru/en/glossary/query-clustering | нет | — | не определено | не загружен: технический лимит обхода |
| 197 | https://kileni-seo.ru/glossary/search-intent | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 198 | https://kileni-seo.ru/en/glossary/search-intent | нет | — | не определено | не загружен: технический лимит обхода |
| 199 | https://kileni-seo.ru/glossary/page-cannibalisation | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 200 | https://kileni-seo.ru/en/glossary/page-cannibalisation | нет | — | не определено | не загружен: технический лимит обхода |
| 201 | https://kileni-seo.ru/glossary/landing-page | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 202 | https://kileni-seo.ru/en/glossary/landing-page | нет | — | не определено | не загружен: технический лимит обхода |
| 203 | https://kileni-seo.ru/glossary/product-feed | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 204 | https://kileni-seo.ru/en/glossary/product-feed | нет | — | не определено | не загружен: технический лимит обхода |
| 205 | https://kileni-seo.ru/glossary/product-attribute | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 206 | https://kileni-seo.ru/en/glossary/product-attribute | нет | — | не определено | не загружен: технический лимит обхода |
| 207 | https://kileni-seo.ru/glossary/sku | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 208 | https://kileni-seo.ru/en/glossary/sku | нет | — | не определено | не загружен: технический лимит обхода |
| 209 | https://kileni-seo.ru/glossary/product-card | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 210 | https://kileni-seo.ru/en/glossary/product-card | нет | — | не определено | не загружен: технический лимит обхода |
| 211 | https://kileni-seo.ru/glossary/rich-content | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 212 | https://kileni-seo.ru/en/glossary/rich-content | нет | — | не определено | не загружен: технический лимит обхода |
| 213 | https://kileni-seo.ru/glossary/ab-testing | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 214 | https://kileni-seo.ru/en/glossary/ab-testing | нет | — | не определено | не загружен: технический лимит обхода |
| 215 | https://kileni-seo.ru/glossary/acceptance-criterion | да | 200 | HTML | HTML; подходит, не вошёл в лимит 10 |
| 216 | https://kileni-seo.ru/en/glossary/acceptance-criterion | нет | — | не определено | не загружен: технический лимит обхода |

## Findings и parity

В свежем production-снимке: 2 пункта — 1 «стоит проверить» и 1 необязательное улучшение; критических проблем — 0. Findings алгоритмом этой правки не изменялись.
- Скорость главной страницы: В одном лабораторном мобильном тесте главная страница получила 40 из 100.
- Подсказка о месте страницы в структуре сайта: На странице /services не найдена специальная разметка цепочки разделов (BreadcrumbList).

Отдельный reference-снимок с `/en/yandex-ads` подтверждает одинаковые итоговые строки в web и PDF:

- `Юридические и служебные страницы: 2`;
- `Англоязычная страница услуги`;
- `Выбрана как отдельный тип страницы; соответствующая страница основной локали не обнаружена.`

Свежий production-снимок англоязычную страницу не выбирал: все десять мест заняли разные полезные типы основной локали. Поэтому наличие этой строки в свежем PDF не утверждается; оно отдельно проверено на immutable reference-снимке и snapshot-тесте рендеров web/PDF/admin.
