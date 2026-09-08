# Диагностика выборки бесплатного аудита

## Источник и контрольные числа

Документ фиксирует состояние **до изменения алгоритма**. Данные прочитаны 3 сентября 2026 года из сохранённого immutable snapshot аудита `Jo4f5giQ6JZIsHfjPFnxKS81maSMM0AGonsIzEzJpD0`; production использовался только как read-only источник.

- Найдено HTML-страниц: **69**.
- Подходят для выборки: **60**.
- Исключено до выборки: **9**.
- Выбрано: **10**.
- Подходят, но не выбраны: **50**.
- Арифметика снимка: **69 = 60 + 9**; **60 = 10 + 50**.

## Что видно до исправления

Факт: семь записей с причиной `duplicate_template` — это варианты одного маршрута `/brief` с query-параметрами. Страницы с одинаковым `templateFamily`, но разными путями — например, два кейса и серия статей — в текущем снимке не исключены и остаются eligible.

Вывод для последующего исправления: причина `duplicate_template` в этом снимке названа неверно. Для семи вариантов `/brief?...` воспроизводимое основание — URL с параметрами, а не само совпадение шаблона. Алгоритм на момент создания этого документа не изменён.

## Все 69 HTML-страниц

| № | URL | Язык | pageType | templateFamily | eligible | exclusionReason | selected | selectionReason | Порядок |
|---:|---|---|---|---|:---:|---|:---:|---|---:|
| 1 | `https://kileni-seo.ru/` | `ru` | `homepage` | `homepage:dom-div.a.div.script.script.script-nav7-main1-article4-aside0-form1-table0` | да | — | да | `user_target` | 1 |
| 2 | `https://kileni-seo.ru/about` | `ru` | `about` | `about:dom-div.a.div.script.script.script-nav5-main1-article2-aside0-form0-table0` | да | — | нет | `not_selected_within_limit` | — |
| 3 | `https://kileni-seo.ru/blog/seo-audit-when-you-need-it` | `ru` | `article` | `article:dom-div.a.div.script.script.script-nav6-main1-article1-aside3-form0-table0` | да | — | нет | `not_selected_within_limit` | — |
| 4 | `https://kileni-seo.ru/blog/seo-ecommerce-promotion` | `ru` | `article` | `article:dom-div.a.div.script.script.script-nav6-main1-article1-aside3-form0-table1` | да | — | нет | `not_selected_within_limit` | — |
| 5 | `https://kileni-seo.ru/blog/seo-promotion-cost` | `ru` | `article` | `article:dom-div.a.div.script.script.script-nav6-main1-article1-aside3-form0-table1` | да | — | нет | `not_selected_within_limit` | — |
| 6 | `https://kileni-seo.ru/blog/seo-vs-yandex-ads` | `ru` | `article` | `article:dom-div.a.div.script.script.script-nav6-main1-article1-aside2-form0-table1` | да | — | нет | `not_selected_within_limit` | — |
| 7 | `https://kileni-seo.ru/blog/website-speed-loading` | `ru` | `article` | `article:dom-div.a.div.script.script.script-nav6-main1-article1-aside3-form0-table0` | да | — | нет | `not_selected_within_limit` | — |
| 8 | `https://kileni-seo.ru/blog/why-website-is-not-in-search` | `ru` | `article` | `article:dom-div.a.div.script.script.script-nav6-main1-article1-aside2-form0-table0` | да | — | нет | `not_selected_within_limit` | — |
| 9 | `https://kileni-seo.ru/blog/wildberries-ozon-product-card` | `ru` | `article` | `article:dom-div.a.div.script.script.script-nav6-main1-article1-aside3-form0-table0` | да | — | нет | `not_selected_within_limit` | — |
| 10 | `https://kileni-seo.ru/brief` | `ru` | `unknown` | `unknown:dom-div.a.div.script.script.div.script.script.script-nav6-main1-article0-aside1-form0-table0` | да | — | да | `conversion_support` | 7 |
| 11 | `https://kileni-seo.ru/brief?offer=seo-audit-implementation` | `ru` | `unknown` | `unknown:dom-div.a.div.script.script.div.script.script.script-nav6-main1-article0-aside1-form0-table0` | нет | `duplicate_template` | нет | — | — |
| 12 | `https://kileni-seo.ru/brief?service=content-materials` | `ru` | `unknown` | `unknown:dom-div.a.div.script.script.div.script.script.script-nav6-main1-article0-aside1-form0-table0` | нет | `duplicate_template` | нет | — | — |
| 13 | `https://kileni-seo.ru/brief?service=custom-task` | `ru` | `unknown` | `unknown:dom-div.a.div.script.script.div.script.script.script-nav6-main1-article0-aside1-form0-table0` | нет | `duplicate_template` | нет | — | — |
| 14 | `https://kileni-seo.ru/brief?service=seo-audit` | `ru` | `unknown` | `unknown:dom-div.a.div.script.script.div.script.script.script-nav6-main1-article0-aside1-form0-table0` | нет | `duplicate_template` | нет | — | — |
| 15 | `https://kileni-seo.ru/brief?service=seo-promotion` | `ru` | `unknown` | `unknown:dom-div.a.div.script.script.div.script.script.script-nav6-main1-article0-aside1-form0-table0` | нет | `duplicate_template` | нет | — | — |
| 16 | `https://kileni-seo.ru/brief?service=web-development` | `ru` | `unknown` | `unknown:dom-div.a.div.script.script.div.script.script.script-nav6-main1-article0-aside1-form0-table0` | нет | `duplicate_template` | нет | — | — |
| 17 | `https://kileni-seo.ru/brief?service=yandex-ads` | `ru` | `unknown` | `unknown:dom-div.a.div.script.script.div.script.script.script-nav6-main1-article0-aside1-form0-table0` | нет | `duplicate_template` | нет | — | — |
| 18 | `https://kileni-seo.ru/cases/eco-santeh` | `ru` | `case` | `case:dom-div.a.div.script.script.script-nav5-main1-article0-aside0-form0-table0` | да | — | да | `case_page` | 9 |
| 19 | `https://kileni-seo.ru/cases/zasorservice` | `ru` | `case` | `case:dom-div.a.div.script.script.script-nav5-main1-article0-aside0-form0-table0` | да | — | нет | `not_selected_within_limit` | — |
| 20 | `https://kileni-seo.ru/checks/canonical-url` | `ru` | `article` | `article:dom-div.a.div.script.script.script-nav5-main1-article7-aside0-form0-table0` | да | — | нет | `not_selected_within_limit` | — |
| 21 | `https://kileni-seo.ru/checks/cumulative-layout-shift` | `ru` | `article` | `article:dom-div.a.div.script.script.script-nav5-main1-article7-aside0-form0-table0` | да | — | нет | `not_selected_within_limit` | — |
| 22 | `https://kileni-seo.ru/checks/document-charset` | `ru` | `article` | `article:dom-div.a.div.script.script.script-nav5-main1-article7-aside0-form0-table0` | да | — | нет | `not_selected_within_limit` | — |
| 23 | `https://kileni-seo.ru/checks/first-contentful-paint` | `ru` | `article` | `article:dom-div.a.div.script.script.script-nav5-main1-article7-aside0-form0-table0` | да | — | нет | `not_selected_within_limit` | — |
| 24 | `https://kileni-seo.ru/checks/heading-hierarchy` | `ru` | `article` | `article:dom-div.a.div.script.script.script-nav5-main1-article7-aside0-form0-table0` | да | — | нет | `not_selected_within_limit` | — |
| 25 | `https://kileni-seo.ru/checks/html-language` | `ru` | `article` | `article:dom-div.a.div.script.script.script-nav5-main1-article7-aside0-form0-table0` | да | — | нет | `not_selected_within_limit` | — |
| 26 | `https://kileni-seo.ru/checks/http-status` | `ru` | `article` | `article:dom-div.a.div.script.script.script-nav5-main1-article7-aside0-form0-table0` | да | — | нет | `not_selected_within_limit` | — |
| 27 | `https://kileni-seo.ru/checks/https` | `ru` | `article` | `article:dom-div.a.div.script.script.script-nav5-main1-article7-aside0-form0-table0` | да | — | нет | `not_selected_within_limit` | — |
| 28 | `https://kileni-seo.ru/checks/image-alt-text` | `ru` | `article` | `article:dom-div.a.div.script.script.script-nav5-main1-article7-aside0-form0-table0` | да | — | нет | `not_selected_within_limit` | — |
| 29 | `https://kileni-seo.ru/checks/image-dimensions` | `ru` | `article` | `article:dom-div.a.div.script.script.script-nav5-main1-article7-aside0-form0-table0` | да | — | нет | `not_selected_within_limit` | — |
| 30 | `https://kileni-seo.ru/checks/indexability` | `ru` | `article` | `article:dom-div.a.div.script.script.script-nav5-main1-article7-aside0-form0-table0` | да | — | нет | `not_selected_within_limit` | — |
| 31 | `https://kileni-seo.ru/checks/internal-link-presence` | `ru` | `article` | `article:dom-div.a.div.script.script.script-nav5-main1-article7-aside0-form0-table0` | да | — | нет | `not_selected_within_limit` | — |
| 32 | `https://kileni-seo.ru/checks/largest-contentful-paint` | `ru` | `article` | `article:dom-div.a.div.script.script.script-nav5-main1-article7-aside0-form0-table0` | да | — | нет | `not_selected_within_limit` | — |
| 33 | `https://kileni-seo.ru/checks/lighthouse-accessibility` | `ru` | `article` | `article:dom-div.a.div.script.script.script-nav5-main1-article7-aside0-form0-table0` | да | — | нет | `not_selected_within_limit` | — |
| 34 | `https://kileni-seo.ru/checks/lighthouse-performance` | `ru` | `article` | `article:dom-div.a.div.script.script.script-nav5-main1-article7-aside0-form0-table0` | да | — | нет | `not_selected_within_limit` | — |
| 35 | `https://kileni-seo.ru/checks/meta-description` | `ru` | `article` | `article:dom-div.a.div.script.script.script-nav5-main1-article7-aside0-form0-table0` | да | — | нет | `not_selected_within_limit` | — |
| 36 | `https://kileni-seo.ru/checks/mixed-content` | `ru` | `article` | `article:dom-div.a.div.script.script.script-nav5-main1-article7-aside0-form0-table0` | да | — | нет | `not_selected_within_limit` | — |
| 37 | `https://kileni-seo.ru/checks/mobile-viewport` | `ru` | `article` | `article:dom-div.a.div.script.script.script-nav5-main1-article7-aside0-form0-table0` | да | — | нет | `not_selected_within_limit` | — |
| 38 | `https://kileni-seo.ru/checks/open-graph` | `ru` | `article` | `article:dom-div.a.div.script.script.script-nav5-main1-article7-aside0-form0-table0` | да | — | нет | `not_selected_within_limit` | — |
| 39 | `https://kileni-seo.ru/checks/page-title` | `ru` | `article` | `article:dom-div.a.div.script.script.script-nav5-main1-article7-aside0-form0-table0` | да | — | нет | `not_selected_within_limit` | — |
| 40 | `https://kileni-seo.ru/checks/robots-root-access` | `ru` | `article` | `article:dom-div.a.div.script.script.script-nav5-main1-article7-aside0-form0-table0` | да | — | нет | `not_selected_within_limit` | — |
| 41 | `https://kileni-seo.ru/checks/robots-txt` | `ru` | `article` | `article:dom-div.a.div.script.script.script-nav5-main1-article7-aside0-form0-table0` | да | — | нет | `not_selected_within_limit` | — |
| 42 | `https://kileni-seo.ru/checks/security-headers` | `ru` | `article` | `article:dom-div.a.div.script.script.script-nav5-main1-article7-aside0-form0-table0` | да | — | нет | `not_selected_within_limit` | — |
| 43 | `https://kileni-seo.ru/checks/single-h1` | `ru` | `article` | `article:dom-div.a.div.script.script.script-nav5-main1-article7-aside0-form0-table0` | да | — | нет | `not_selected_within_limit` | — |
| 44 | `https://kileni-seo.ru/checks/structured-data` | `ru` | `article` | `article:dom-div.a.div.script.script.script-nav5-main1-article7-aside0-form0-table0` | да | — | нет | `not_selected_within_limit` | — |
| 45 | `https://kileni-seo.ru/checks/total-blocking-time` | `ru` | `article` | `article:dom-div.a.div.script.script.script-nav5-main1-article7-aside0-form0-table0` | да | — | нет | `not_selected_within_limit` | — |
| 46 | `https://kileni-seo.ru/checks/unique-page-titles` | `ru` | `article` | `article:dom-div.a.div.script.script.script-nav5-main1-article7-aside0-form0-table0` | да | — | нет | `not_selected_within_limit` | — |
| 47 | `https://kileni-seo.ru/checks/useful-content-depth` | `ru` | `article` | `article:dom-div.a.div.script.script.script-nav5-main1-article7-aside0-form0-table0` | да | — | нет | `not_selected_within_limit` | — |
| 48 | `https://kileni-seo.ru/checks/working-internal-links` | `ru` | `article` | `article:dom-div.a.div.script.script.script-nav5-main1-article7-aside0-form0-table0` | да | — | нет | `not_selected_within_limit` | — |
| 49 | `https://kileni-seo.ru/checks/xml-sitemap` | `ru` | `article` | `article:dom-div.a.div.script.script.script-nav5-main1-article7-aside0-form0-table0` | да | — | нет | `not_selected_within_limit` | — |
| 50 | `https://kileni-seo.ru/consent` | `ru` | `legal` | `legal:dom-div.a.div.script.script.script-nav5-main1-article1-aside0-form0-table0` | нет | `service_url` | нет | — | — |
| 51 | `https://kileni-seo.ru/contacts` | `ru` | `contact` | `contact:dom-div.a.div.script.script.script-nav5-main1-article0-aside0-form1-table0` | да | — | да | `conversion_support` | 6 |
| 52 | `https://kileni-seo.ru/en` | `en` | `homepage` | `homepage:dom-div.a.div.script.script.script-nav7-main1-article4-aside0-form1-table0` | да | — | да | `alternate_locale_control` | 10 |
| 53 | `https://kileni-seo.ru/en/about` | `en` | `about` | `about:dom-div.a.div.script.script.script-nav5-main1-article2-aside0-form0-table0` | да | — | нет | `not_selected_within_limit` | — |
| 54 | `https://kileni-seo.ru/en/brief?offer=seo-audit-implementation` | `en` | `unknown` | `unknown:dom-div.a.div.script.script.div.script.script.script-nav6-main1-article0-aside1-form0-table0` | да | — | нет | `not_selected_within_limit` | — |
| 55 | `https://kileni-seo.ru/en/contacts` | `en` | `contact` | `contact:dom-div.a.div.script.script.script-nav5-main1-article0-aside0-form1-table0` | да | — | нет | `not_selected_within_limit` | — |
| 56 | `https://kileni-seo.ru/en/pricing` | `en` | `pricing` | `pricing:dom-div.a.div.script.script.script-nav5-main1-article1-aside0-form1-table0` | да | — | нет | `not_selected_within_limit` | — |
| 57 | `https://kileni-seo.ru/en/services` | `en` | `service` | `service:dom-div.a.div.script.script.script-nav4-main1-article1-aside0-form0-table0` | да | — | нет | `not_selected_within_limit` | — |
| 58 | `https://kileni-seo.ru/en/yandex-ads` | `en` | `unknown` | `unknown:dom-div.a.div.script.script.script-nav6-main1-article8-aside1-form1-table0` | да | — | да | `primary_commercial` | 4 |
| 59 | `https://kileni-seo.ru/glossary/ab-testing` | `ru` | `unknown` | `unknown:dom-div.a.div.script.script.script-nav5-main1-article6-aside0-form0-table0` | да | — | нет | `not_selected_within_limit` | — |
| 60 | `https://kileni-seo.ru/glossary/acceptance-criterion` | `ru` | `unknown` | `unknown:dom-div.a.div.script.script.script-nav5-main1-article3-aside0-form0-table0` | да | — | нет | `not_selected_within_limit` | — |
| 61 | `https://kileni-seo.ru/glossary/canonical` | `ru` | `unknown` | `unknown:dom-div.a.div.script.script.script-nav5-main1-article6-aside0-form0-table0` | да | — | нет | `not_selected_within_limit` | — |
| 62 | `https://kileni-seo.ru/glossary/core-web-vitals` | `ru` | `unknown` | `unknown:dom-div.a.div.script.script.script-nav5-main1-article6-aside0-form0-table0` | да | — | нет | `not_selected_within_limit` | — |
| 63 | `https://kileni-seo.ru/glossary/indexing` | `ru` | `unknown` | `unknown:dom-div.a.div.script.script.script-nav5-main1-article6-aside0-form0-table0` | да | — | нет | `not_selected_within_limit` | — |
| 64 | `https://kileni-seo.ru/glossary/on-page` | `ru` | `unknown` | `unknown:dom-div.a.div.script.script.script-nav5-main1-article6-aside0-form0-table0` | да | — | нет | `not_selected_within_limit` | — |
| 65 | `https://kileni-seo.ru/glossary/seo-audit` | `ru` | `unknown` | `unknown:dom-div.a.div.script.script.script-nav5-main1-article6-aside0-form0-table0` | да | — | да | `detail_page` | 8 |
| 66 | `https://kileni-seo.ru/pricing` | `ru` | `pricing` | `pricing:dom-div.a.div.script.script.script-nav5-main1-article1-aside0-form1-table0` | да | — | да | `conversion_support` | 5 |
| 67 | `https://kileni-seo.ru/privacy` | `ru` | `legal` | `legal:dom-div.a.div.script.script.script-nav5-main1-article1-aside0-form0-table0` | нет | `service_url` | нет | — | — |
| 68 | `https://kileni-seo.ru/seo` | `ru` | `service` | `service:dom-div.a.div.script.script.script-nav5-main1-article2-aside0-form0-table0` | да | — | да | `primary_commercial` | 2 |
| 69 | `https://kileni-seo.ru/services` | `ru` | `service` | `service:dom-div.a.div.script.script.script-nav4-main1-article1-aside0-form0-table0` | да | — | да | `commercial_different_template` | 3 |

## Девять исключённых страниц до исправления

1. `https://kileni-seo.ru/brief?offer=seo-audit-implementation` — `duplicate_template`.
2. `https://kileni-seo.ru/brief?service=content-materials` — `duplicate_template`.
3. `https://kileni-seo.ru/brief?service=custom-task` — `duplicate_template`.
4. `https://kileni-seo.ru/brief?service=seo-audit` — `duplicate_template`.
5. `https://kileni-seo.ru/brief?service=seo-promotion` — `duplicate_template`.
6. `https://kileni-seo.ru/brief?service=web-development` — `duplicate_template`.
7. `https://kileni-seo.ru/brief?service=yandex-ads` — `duplicate_template`.
8. `https://kileni-seo.ru/consent` — `service_url`.
9. `https://kileni-seo.ru/privacy` — `service_url`.

## Пятьдесят подходящих, но не выбранных страниц

1. `https://kileni-seo.ru/about` — `about`, `about:dom-div.a.div.script.script.script-nav5-main1-article2-aside0-form0-table0`.
2. `https://kileni-seo.ru/blog/seo-audit-when-you-need-it` — `article`, `article:dom-div.a.div.script.script.script-nav6-main1-article1-aside3-form0-table0`.
3. `https://kileni-seo.ru/blog/seo-ecommerce-promotion` — `article`, `article:dom-div.a.div.script.script.script-nav6-main1-article1-aside3-form0-table1`.
4. `https://kileni-seo.ru/blog/seo-promotion-cost` — `article`, `article:dom-div.a.div.script.script.script-nav6-main1-article1-aside3-form0-table1`.
5. `https://kileni-seo.ru/blog/seo-vs-yandex-ads` — `article`, `article:dom-div.a.div.script.script.script-nav6-main1-article1-aside2-form0-table1`.
6. `https://kileni-seo.ru/blog/website-speed-loading` — `article`, `article:dom-div.a.div.script.script.script-nav6-main1-article1-aside3-form0-table0`.
7. `https://kileni-seo.ru/blog/why-website-is-not-in-search` — `article`, `article:dom-div.a.div.script.script.script-nav6-main1-article1-aside2-form0-table0`.
8. `https://kileni-seo.ru/blog/wildberries-ozon-product-card` — `article`, `article:dom-div.a.div.script.script.script-nav6-main1-article1-aside3-form0-table0`.
9. `https://kileni-seo.ru/cases/zasorservice` — `case`, `case:dom-div.a.div.script.script.script-nav5-main1-article0-aside0-form0-table0`.
10. `https://kileni-seo.ru/checks/canonical-url` — `article`, `article:dom-div.a.div.script.script.script-nav5-main1-article7-aside0-form0-table0`.
11. `https://kileni-seo.ru/checks/cumulative-layout-shift` — `article`, `article:dom-div.a.div.script.script.script-nav5-main1-article7-aside0-form0-table0`.
12. `https://kileni-seo.ru/checks/document-charset` — `article`, `article:dom-div.a.div.script.script.script-nav5-main1-article7-aside0-form0-table0`.
13. `https://kileni-seo.ru/checks/first-contentful-paint` — `article`, `article:dom-div.a.div.script.script.script-nav5-main1-article7-aside0-form0-table0`.
14. `https://kileni-seo.ru/checks/heading-hierarchy` — `article`, `article:dom-div.a.div.script.script.script-nav5-main1-article7-aside0-form0-table0`.
15. `https://kileni-seo.ru/checks/html-language` — `article`, `article:dom-div.a.div.script.script.script-nav5-main1-article7-aside0-form0-table0`.
16. `https://kileni-seo.ru/checks/http-status` — `article`, `article:dom-div.a.div.script.script.script-nav5-main1-article7-aside0-form0-table0`.
17. `https://kileni-seo.ru/checks/https` — `article`, `article:dom-div.a.div.script.script.script-nav5-main1-article7-aside0-form0-table0`.
18. `https://kileni-seo.ru/checks/image-alt-text` — `article`, `article:dom-div.a.div.script.script.script-nav5-main1-article7-aside0-form0-table0`.
19. `https://kileni-seo.ru/checks/image-dimensions` — `article`, `article:dom-div.a.div.script.script.script-nav5-main1-article7-aside0-form0-table0`.
20. `https://kileni-seo.ru/checks/indexability` — `article`, `article:dom-div.a.div.script.script.script-nav5-main1-article7-aside0-form0-table0`.
21. `https://kileni-seo.ru/checks/internal-link-presence` — `article`, `article:dom-div.a.div.script.script.script-nav5-main1-article7-aside0-form0-table0`.
22. `https://kileni-seo.ru/checks/largest-contentful-paint` — `article`, `article:dom-div.a.div.script.script.script-nav5-main1-article7-aside0-form0-table0`.
23. `https://kileni-seo.ru/checks/lighthouse-accessibility` — `article`, `article:dom-div.a.div.script.script.script-nav5-main1-article7-aside0-form0-table0`.
24. `https://kileni-seo.ru/checks/lighthouse-performance` — `article`, `article:dom-div.a.div.script.script.script-nav5-main1-article7-aside0-form0-table0`.
25. `https://kileni-seo.ru/checks/meta-description` — `article`, `article:dom-div.a.div.script.script.script-nav5-main1-article7-aside0-form0-table0`.
26. `https://kileni-seo.ru/checks/mixed-content` — `article`, `article:dom-div.a.div.script.script.script-nav5-main1-article7-aside0-form0-table0`.
27. `https://kileni-seo.ru/checks/mobile-viewport` — `article`, `article:dom-div.a.div.script.script.script-nav5-main1-article7-aside0-form0-table0`.
28. `https://kileni-seo.ru/checks/open-graph` — `article`, `article:dom-div.a.div.script.script.script-nav5-main1-article7-aside0-form0-table0`.
29. `https://kileni-seo.ru/checks/page-title` — `article`, `article:dom-div.a.div.script.script.script-nav5-main1-article7-aside0-form0-table0`.
30. `https://kileni-seo.ru/checks/robots-root-access` — `article`, `article:dom-div.a.div.script.script.script-nav5-main1-article7-aside0-form0-table0`.
31. `https://kileni-seo.ru/checks/robots-txt` — `article`, `article:dom-div.a.div.script.script.script-nav5-main1-article7-aside0-form0-table0`.
32. `https://kileni-seo.ru/checks/security-headers` — `article`, `article:dom-div.a.div.script.script.script-nav5-main1-article7-aside0-form0-table0`.
33. `https://kileni-seo.ru/checks/single-h1` — `article`, `article:dom-div.a.div.script.script.script-nav5-main1-article7-aside0-form0-table0`.
34. `https://kileni-seo.ru/checks/structured-data` — `article`, `article:dom-div.a.div.script.script.script-nav5-main1-article7-aside0-form0-table0`.
35. `https://kileni-seo.ru/checks/total-blocking-time` — `article`, `article:dom-div.a.div.script.script.script-nav5-main1-article7-aside0-form0-table0`.
36. `https://kileni-seo.ru/checks/unique-page-titles` — `article`, `article:dom-div.a.div.script.script.script-nav5-main1-article7-aside0-form0-table0`.
37. `https://kileni-seo.ru/checks/useful-content-depth` — `article`, `article:dom-div.a.div.script.script.script-nav5-main1-article7-aside0-form0-table0`.
38. `https://kileni-seo.ru/checks/working-internal-links` — `article`, `article:dom-div.a.div.script.script.script-nav5-main1-article7-aside0-form0-table0`.
39. `https://kileni-seo.ru/checks/xml-sitemap` — `article`, `article:dom-div.a.div.script.script.script-nav5-main1-article7-aside0-form0-table0`.
40. `https://kileni-seo.ru/en/about` — `about`, `about:dom-div.a.div.script.script.script-nav5-main1-article2-aside0-form0-table0`.
41. `https://kileni-seo.ru/en/brief?offer=seo-audit-implementation` — `unknown`, `unknown:dom-div.a.div.script.script.div.script.script.script-nav6-main1-article0-aside1-form0-table0`.
42. `https://kileni-seo.ru/en/contacts` — `contact`, `contact:dom-div.a.div.script.script.script-nav5-main1-article0-aside0-form1-table0`.
43. `https://kileni-seo.ru/en/pricing` — `pricing`, `pricing:dom-div.a.div.script.script.script-nav5-main1-article1-aside0-form1-table0`.
44. `https://kileni-seo.ru/en/services` — `service`, `service:dom-div.a.div.script.script.script-nav4-main1-article1-aside0-form0-table0`.
45. `https://kileni-seo.ru/glossary/ab-testing` — `unknown`, `unknown:dom-div.a.div.script.script.script-nav5-main1-article6-aside0-form0-table0`.
46. `https://kileni-seo.ru/glossary/acceptance-criterion` — `unknown`, `unknown:dom-div.a.div.script.script.script-nav5-main1-article3-aside0-form0-table0`.
47. `https://kileni-seo.ru/glossary/canonical` — `unknown`, `unknown:dom-div.a.div.script.script.script-nav5-main1-article6-aside0-form0-table0`.
48. `https://kileni-seo.ru/glossary/core-web-vitals` — `unknown`, `unknown:dom-div.a.div.script.script.script-nav5-main1-article6-aside0-form0-table0`.
49. `https://kileni-seo.ru/glossary/indexing` — `unknown`, `unknown:dom-div.a.div.script.script.script-nav5-main1-article6-aside0-form0-table0`.
50. `https://kileni-seo.ru/glossary/on-page` — `unknown`, `unknown:dom-div.a.div.script.script.script-nav5-main1-article6-aside0-form0-table0`.

## Десять выбранных страниц

1. `https://kileni-seo.ru/` — язык `ru`, тип `homepage`, причина `user_target`.
2. `https://kileni-seo.ru/seo` — язык `ru`, тип `service`, причина `primary_commercial`.
3. `https://kileni-seo.ru/services` — язык `ru`, тип `service`, причина `commercial_different_template`.
4. `https://kileni-seo.ru/en/yandex-ads` — язык `en`, тип `unknown`, причина `primary_commercial`.
5. `https://kileni-seo.ru/pricing` — язык `ru`, тип `pricing`, причина `conversion_support`.
6. `https://kileni-seo.ru/contacts` — язык `ru`, тип `contact`, причина `conversion_support`.
7. `https://kileni-seo.ru/brief` — язык `ru`, тип `unknown`, причина `conversion_support`.
8. `https://kileni-seo.ru/glossary/seo-audit` — язык `ru`, тип `unknown`, причина `detail_page`.
9. `https://kileni-seo.ru/cases/eco-santeh` — язык `ru`, тип `case`, причина `case_page`.
10. `https://kileni-seo.ru/en` — язык `en`, тип `homepage`, причина `alternate_locale_control`.

## Повторный расчёт после исправления

Ниже тот же неизменяемый набор из 69 HTML-адресов пересчитан новым алгоритмом. Это позволяет сравнить семантику до и после без влияния повторного обхода сайта.

- Найдено HTML-страниц: **69**.
- Подходят для выборки: **59**.
- Исключено до выборки: **10**.
- Выбрано: **10**.
- Подходят, но не выбраны: **49**.
- Арифметика: **69 = 59 + 10**; **59 = 10 + 49**.

Число исключений увеличилось на один адрес, потому что английский `/en/brief?offer=seo-audit-implementation` теперь корректно распознан как URL с параметрами. Совпадение `templateFamily` само по себе больше не исключает страницу: такие адреса остаются подходящими и получают меньший приоритет после выбора одного представителя похожего шаблона.

### Исключённые страницы после исправления

1. `https://kileni-seo.ru/brief?offer=seo-audit-implementation` — URL с параметрами.
2. `https://kileni-seo.ru/brief?service=content-materials` — URL с параметрами.
3. `https://kileni-seo.ru/brief?service=custom-task` — URL с параметрами.
4. `https://kileni-seo.ru/brief?service=seo-audit` — URL с параметрами.
5. `https://kileni-seo.ru/brief?service=seo-promotion` — URL с параметрами.
6. `https://kileni-seo.ru/brief?service=web-development` — URL с параметрами.
7. `https://kileni-seo.ru/brief?service=yandex-ads` — URL с параметрами.
8. `https://kileni-seo.ru/consent` — техническая страница.
9. `https://kileni-seo.ru/en/brief?offer=seo-audit-implementation` — URL с параметрами.
10. `https://kileni-seo.ru/privacy` — техническая страница.

### Выбранные страницы после исправления

1. `https://kileni-seo.ru/` — `ru`, главная, адрес пользователя.
2. `https://kileni-seo.ru/seo` — `ru`, страница услуги, основная коммерческая страница.
3. `https://kileni-seo.ru/about` — `ru`, страница о компании, важная страница основной локали.
4. `https://kileni-seo.ru/contacts` — `ru`, контакты, страница для связи.
5. `https://kileni-seo.ru/brief` — `ru`, страница для связи, точка обращения.
6. `https://kileni-seo.ru/pricing` — `ru`, цены, страница для принятия решения.
7. `https://kileni-seo.ru/glossary/seo-audit` — `ru`, детальная страница, пример отдельного материала.
8. `https://kileni-seo.ru/cases/eco-santeh` — `ru`, кейс, пример отдельного кейса.
9. `https://kileni-seo.ru/blog/seo-audit-when-you-need-it` — `ru`, статья, пример отдельной статьи.
10. `https://kileni-seo.ru/glossary/ab-testing` — `ru`, отдельный тип страницы.

В этой десятке нет английской страницы: десять разных полезных типов основной русской локали уже заполняют лимит. Если после покрытия типов основной локали останется место, алгоритм может добавить не более одной страницы другой локали для контроля перевода.

## Контроль после публикации

3 сентября 2026 года после production deployment выполнена новая проверка без служебного обхода кеша. Создан новый immutable snapshot `-5QePcxBNMMpiyVUmdZHLMmMSJiJHNidZz-r59mHj6E` движком `audit-pipeline-v3.1.0`.

- Найдено HTML-страниц: **70**.
- Подходят для выборки: **68**.
- Исключено до выборки: **2**.
- Выбрано и проверено: **10**.
- Подходят, но не выбраны: **58**.
- Арифметика: **70 = 68 + 2**; **68 = 10 + 58**; **10 = 10 + 0**.

### Фактические исключения production

1. `https://kileni-seo.ru/consent` — техническая страница.
2. `https://kileni-seo.ru/privacy` — техническая страница.

Query-варианты `/brief?...` больше не занимают очередь обхода и не маскируются причиной «дубликат шаблона». Страницы с похожим `templateFamily`, но другим содержимым остаются подходящими и учитываются среди не вошедших в бесплатную десятку.

### Фактически выбранные страницы production

1. `https://kileni-seo.ru/` — `ru`, главная, адрес пользователя.
2. `https://kileni-seo.ru/seo` — `ru`, страница услуги, основная коммерческая страница.
3. `https://kileni-seo.ru/about` — `ru`, страница о компании, важная страница основной локали.
4. `https://kileni-seo.ru/contacts` — `ru`, контакты, страница для связи.
5. `https://kileni-seo.ru/pricing` — `ru`, страница с ценами, страница для принятия решения.
6. `https://kileni-seo.ru/blog` — `ru`, раздел блога.
7. `https://kileni-seo.ru/cases/eco-santeh` — `ru`, кейс.
8. `https://kileni-seo.ru/blog/seo-audit-when-you-need-it` — `ru`, статья.
9. `https://kileni-seo.ru/glossary/core-web-vitals` — `ru`, отдельный тип страницы.
10. `https://kileni-seo.ru/en/yandex-ads` — `en`, единственная контрольная страница другой локали; основная русская страница этого типа не обнаружена.

Полная машиночитаемая сводка этого же снимка сохранена в `docs/user-audit-evidence/audit-final-2026-09-03/production/parity-summary.json`.
