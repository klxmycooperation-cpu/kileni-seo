# Проверка предварительного выбора URL

Дата контрольного запуска: 4 сентября 2026 года. Цель запуска: проверить выбор 100 адресов для лёгкого предварительного просмотра из 216 адресов sitemap до подробной проверки 10 страниц.

## Итог

- В sitemap: **216 URL**.
- Предварительно выбрано: **100 URL**.
- Не загружено из-за лимита предварительного просмотра: **116 URL**.
- С буквальными первыми 100 строками sitemap совпали только **49 URL**.
- Выбрано за пределами первых 100 строк sitemap: **51 URL**.
- Из буквальных первых 100 строк sitemap пропущено: **51 URL**.
- Предварительная сотня состоит из **99 приоритетных адресов + 1 контрольного адреса исключения**.
- Среди 116 пропущенных нет URL с локалью/бизнес-приоритетом выше границы 99 приоритетных слотов: **0**.
- На самой границе осталось адресов с тем же приоритетом: **7**; они относятся к уже представленным справочным семействам.
- Контрольно загружено предполагаемых исключений: **1** (https://kileni-seo.ru/consent).
- Подходят для выборки после проверки исключения: **99 URL**; после подробной десятки не вошло: **89 URL**.
- Итоговая подробная выборка сохранила принятые 10 URL: **10 из 10**.

Вывод: предварительный выбор не зависит только от позиции адреса в sitemap. Сначала учитываются основная локаль, предполагаемый тип и коммерческая значимость пути, наличие и порядок первой внутренней ссылки на главной странице, разнообразие прокси-семейств шаблонов и глубина URL. Порядок URL используется только как последний стабильный критерий при полном равенстве остальных признаков.

## Проверка границы приоритета

Все URL основной локали с приоритетами от `homepage` до `about` вошли в предварительную сотню. В 99 слотах содержательного приоритета нет пропущенного URL, который стоял бы выше границы по локали и бизнес-значимости. На границе остались страницы с тем же приоритетом `content_hub`; их семейства уже представлены среди загруженных адресов. Страницы другой локали намеренно рассматриваются после основной.

Сотый слот не участвует в сравнении бизнес-приоритета: он отдельно зарезервирован для детерминированной проверки предполагаемого исключения. Это позволяет подтвердить, что юридическая/закрытая/поисковая страница действительно не подходит для бесплатной выборки, вместо того чтобы менять принятую арифметику только из-за нового порядка загрузки. Для этого запуска выбран один представитель — https://kileni-seo.ru/consent — а не все похожие адреса.

Отдельный тест запускает тот же набор из 216 адресов в прямом, обратном и циклически сдвинутом порядке. Во всех трёх случаях система получает одну и ту же сотню; это защищает алгоритм от скрытой зависимости от порядка sitemap.

## Итоговые 10 страниц для подробной проверки

1. https://kileni-seo.ru/
2. https://kileni-seo.ru/services
3. https://kileni-seo.ru/seo
4. https://kileni-seo.ru/pricing
5. https://kileni-seo.ru/free-audit
6. https://kileni-seo.ru/brief
7. https://kileni-seo.ru/contacts
8. https://kileni-seo.ru/cases/eco-santeh
9. https://kileni-seo.ru/blog/seo-audit-when-you-need-it
10. https://kileni-seo.ru/about

## 100 адресов, выбранных для предварительного просмотра

| Порядок | Позиция в sitemap | URL | Локаль | Предполагаемый тип | Приоритет | Прокси-семейство | Почему выбран |
|---:|---:|---|---|---|---|---|---|
| 1 | 1 | https://kileni-seo.ru/ | основная | homepage | homepage (0) | primary:root:homepage:entry | основная локаль, внутренняя ссылка на главной №1, глубина 0; выбран по составному приоритету, а не по позиции sitemap |
| 2 | 49 | https://kileni-seo.ru/consent | основная | legal | other (13) | primary:consent:other:entry | основная локаль, внутренняя ссылка на главной №35, глубина 1; контрольный представитель предполагаемых исключений, нужен для подтверждения арифметики выборки |
| 3 | 11 | https://kileni-seo.ru/marketplaces | основная | hub | service_hub (1) | primary:marketplaces:service_hub:entry | основная локаль, внутренняя ссылка на главной №4, глубина 1; выбран по составному приоритету, а не по позиции sitemap |
| 4 | 3 | https://kileni-seo.ru/services | основная | hub | service_hub (1) | primary:services:service_hub:entry | основная локаль, внутренняя ссылка на главной №30, глубина 1; выбран по составному приоритету, а не по позиции sitemap |
| 5 | 5 | https://kileni-seo.ru/seo | основная | commercial | primary_service (2) | primary:seo:primary_service:entry | основная локаль, внутренняя ссылка на главной №2, глубина 1; выбран по составному приоритету, а не по позиции sitemap |
| 6 | 19 | https://kileni-seo.ru/web-development | основная | commercial | primary_service (2) | primary:web-development:primary_service:entry | основная локаль, внутренняя ссылка на главной №3, глубина 1; выбран по составному приоритету, а не по позиции sitemap |
| 7 | 25 | https://kileni-seo.ru/custom-task | основная | unique | primary_service (2) | primary:custom-task:primary_service:entry | основная локаль, внутренняя ссылка на главной №5, глубина 1; выбран по составному приоритету, а не по позиции sitemap |
| 8 | 7 | https://kileni-seo.ru/seo-audit | основная | commercial | primary_service (2) | primary:seo-audit:primary_service:entry | основная локаль, внутренняя ссылка на главной №18, глубина 1; выбран по составному приоритету, а не по позиции sitemap |
| 9 | 9 | https://kileni-seo.ru/seo-promotion | основная | commercial | primary_service (2) | primary:seo-promotion:primary_service:entry | основная локаль, внутренняя ссылка на главной №19, глубина 1; выбран по составному приоритету, а не по позиции sitemap |
| 10 | 21 | https://kileni-seo.ru/yandex-ads | основная | unique | primary_service (2) | primary:yandex-ads:primary_service:entry | основная локаль, внутренняя ссылка на главной №31, глубина 1; выбран по составному приоритету, а не по позиции sitemap |
| 11 | 23 | https://kileni-seo.ru/content-materials | основная | unique | primary_service (2) | primary:content-materials:primary_service:entry | основная локаль, глубина 1; выбран по составному приоритету, а не по позиции sitemap |
| 12 | 15 | https://kileni-seo.ru/marketplaces/ozon | основная | detail | primary_service (2) | primary:marketplaces:primary_service:detail | основная локаль, глубина 2; выбран по составному приоритету, а не по позиции sitemap |
| 13 | 13 | https://kileni-seo.ru/marketplaces/wildberries | основная | detail | primary_service (2) | primary:marketplaces:primary_service:detail | основная локаль, глубина 2; выбран по составному приоритету, а не по позиции sitemap |
| 14 | 17 | https://kileni-seo.ru/marketplaces/yandex-market | основная | detail | primary_service (2) | primary:marketplaces:primary_service:detail | основная локаль, глубина 2; выбран по составному приоритету, а не по позиции sitemap |
| 15 | 27 | https://kileni-seo.ru/pricing | основная | conversion_support | pricing (3) | primary:pricing:pricing:entry | основная локаль, внутренняя ссылка на главной №7, глубина 1; выбран по составному приоритету, а не по позиции sitemap |
| 16 | 51 | https://kileni-seo.ru/free-audit | основная | commercial | free_audit (4) | primary:free-audit:free_audit:entry | основная локаль, внутренняя ссылка на главной №13, глубина 1; выбран по составному приоритету, а не по позиции sitemap |
| 17 | 37 | https://kileni-seo.ru/brief | основная | conversion_support | lead_form (5) | primary:brief:lead_form:entry | основная локаль, внутренняя ссылка на главной №21, глубина 1; выбран по составному приоритету, а не по позиции sitemap |
| 18 | 29 | https://kileni-seo.ru/calculator | основная | unique | lead_form (5) | primary:calculator:lead_form:entry | основная локаль, внутренняя ссылка на главной №33, глубина 1; выбран по составному приоритету, а не по позиции sitemap |
| 19 | 45 | https://kileni-seo.ru/contacts | основная | conversion_support | contact (6) | primary:contacts:contact:entry | основная локаль, внутренняя ссылка на главной №32, глубина 1; выбран по составному приоритету, а не по позиции sitemap |
| 20 | 31 | https://kileni-seo.ru/cases | основная | hub | case (7) | primary:cases:case:entry | основная локаль, внутренняя ссылка на главной №6, глубина 1; выбран по составному приоритету, а не по позиции sitemap |
| 21 | 33 | https://kileni-seo.ru/cases/eco-santeh | основная | case | case (7) | primary:cases:case:detail | основная локаль, внутренняя ссылка на главной №22, глубина 2; выбран по составному приоритету, а не по позиции sitemap |
| 22 | 35 | https://kileni-seo.ru/cases/zasorservice | основная | case | case (7) | primary:cases:case:detail | основная локаль, глубина 2; выбран по составному приоритету, а не по позиции sitemap |
| 23 | 53 | https://kileni-seo.ru/blog/seo-audit-when-you-need-it | основная | article | article (8) | primary:blog:article:detail | основная локаль, внутренняя ссылка на главной №23, глубина 2; выбран по составному приоритету, а не по позиции sitemap |
| 24 | 55 | https://kileni-seo.ru/blog/wildberries-ozon-product-card | основная | article | article (8) | primary:blog:article:detail | основная локаль, внутренняя ссылка на главной №24, глубина 2; выбран по составному приоритету, а не по позиции sitemap |
| 25 | 57 | https://kileni-seo.ru/blog/why-website-is-not-in-search | основная | article | article (8) | primary:blog:article:detail | основная локаль, внутренняя ссылка на главной №25, глубина 2; выбран по составному приоритету, а не по позиции sitemap |
| 26 | 59 | https://kileni-seo.ru/blog/seo-vs-yandex-ads | основная | article | article (8) | primary:blog:article:detail | основная локаль, внутренняя ссылка на главной №26, глубина 2; выбран по составному приоритету, а не по позиции sitemap |
| 27 | 61 | https://kileni-seo.ru/blog/website-speed-loading | основная | article | article (8) | primary:blog:article:detail | основная локаль, внутренняя ссылка на главной №27, глубина 2; выбран по составному приоритету, а не по позиции sitemap |
| 28 | 63 | https://kileni-seo.ru/blog/seo-ecommerce-promotion | основная | article | article (8) | primary:blog:article:detail | основная локаль, внутренняя ссылка на главной №28, глубина 2; выбран по составному приоритету, а не по позиции sitemap |
| 29 | 65 | https://kileni-seo.ru/blog/seo-promotion-cost | основная | article | article (8) | primary:blog:article:detail | основная локаль, внутренняя ссылка на главной №29, глубина 2; выбран по составному приоритету, а не по позиции sitemap |
| 30 | 43 | https://kileni-seo.ru/about | основная | unique | about (10) | primary:about:about:entry | основная локаль, внутренняя ссылка на главной №10, глубина 1; выбран по составному приоритету, а не по позиции sitemap |
| 31 | 39 | https://kileni-seo.ru/blog | основная | hub | content_hub (11) | primary:blog:content_hub:entry | основная локаль, внутренняя ссылка на главной №8, глубина 1; выбран по составному приоритету, а не по позиции sitemap |
| 32 | 41 | https://kileni-seo.ru/glossary | основная | unique | content_hub (11) | primary:glossary:content_hub:entry | основная локаль, внутренняя ссылка на главной №9, глубина 1; выбран по составному приоритету, а не по позиции sitemap |
| 33 | 137 | https://kileni-seo.ru/glossary/indexing | основная | unique | content_hub (11) | primary:glossary:content_hub:detail | основная локаль, внутренняя ссылка на главной №14, глубина 2; выбран по составному приоритету, а не по позиции sitemap |
| 34 | 161 | https://kileni-seo.ru/glossary/on-page | основная | unique | content_hub (11) | primary:glossary:content_hub:detail | основная локаль, внутренняя ссылка на главной №15, глубина 2; выбран по составному приоритету, а не по позиции sitemap |
| 35 | 175 | https://kileni-seo.ru/glossary/core-web-vitals | основная | unique | content_hub (11) | primary:glossary:content_hub:detail | основная локаль, внутренняя ссылка на главной №16, глубина 2; выбран по составному приоритету, а не по позиции sitemap |
| 36 | 135 | https://kileni-seo.ru/glossary/seo-audit | основная | detail | content_hub (11) | primary:glossary:content_hub:detail | основная локаль, внутренняя ссылка на главной №17, глубина 2; выбран по составному приоритету, а не по позиции sitemap |
| 37 | 67 | https://kileni-seo.ru/checks | основная | unique | content_hub (11) | primary:checks:content_hub:entry | основная локаль, глубина 1; выбран по составному приоритету, а не по позиции sitemap |
| 38 | 73 | https://kileni-seo.ru/checks/canonical-url | основная | unique | content_hub (11) | primary:checks:content_hub:detail | основная локаль, глубина 2; выбран по составному приоритету, а не по позиции sitemap |
| 39 | 213 | https://kileni-seo.ru/glossary/ab-testing | основная | unique | content_hub (11) | primary:glossary:content_hub:detail | основная локаль, глубина 2; выбран по составному приоритету, а не по позиции sitemap |
| 40 | 103 | https://kileni-seo.ru/checks/cumulative-layout-shift | основная | unique | content_hub (11) | primary:checks:content_hub:detail | основная локаль, глубина 2; выбран по составному приоритету, а не по позиции sitemap |
| 41 | 215 | https://kileni-seo.ru/glossary/acceptance-criterion | основная | unique | content_hub (11) | primary:glossary:content_hub:detail | основная локаль, глубина 2; выбран по составному приоритету, а не по позиции sitemap |
| 42 | 81 | https://kileni-seo.ru/checks/document-charset | основная | unique | content_hub (11) | primary:checks:content_hub:detail | основная локаль, глубина 2; выбран по составному приоритету, а не по позиции sitemap |
| 43 | 147 | https://kileni-seo.ru/glossary/canonical | основная | unique | content_hub (11) | primary:glossary:content_hub:detail | основная локаль, глубина 2; выбран по составному приоритету, а не по позиции sitemap |
| 44 | 99 | https://kileni-seo.ru/checks/first-contentful-paint | основная | unique | content_hub (11) | primary:checks:content_hub:detail | основная локаль, глубина 2; выбран по составному приоритету, а не по позиции sitemap |
| 45 | 179 | https://kileni-seo.ru/glossary/cls | основная | unique | content_hub (11) | primary:glossary:content_hub:detail | основная локаль, глубина 2; выбран по составному приоритету, а не по позиции sitemap |
| 46 | 89 | https://kileni-seo.ru/checks/heading-hierarchy | основная | unique | content_hub (11) | primary:checks:content_hub:detail | основная локаль, глубина 2; выбран по составному приоритету, а не по позиции sitemap |
| 47 | 187 | https://kileni-seo.ru/glossary/conversion | основная | unique | content_hub (11) | primary:glossary:content_hub:detail | основная локаль, глубина 2; выбран по составному приоритету, а не по позиции sitemap |
| 48 | 95 | https://kileni-seo.ru/checks/html-language | основная | unique | content_hub (11) | primary:checks:content_hub:detail | основная локаль, глубина 2; выбран по составному приоритету, а не по позиции sitemap |
| 49 | 139 | https://kileni-seo.ru/glossary/crawling | основная | unique | content_hub (11) | primary:glossary:content_hub:detail | основная локаль, глубина 2; выбран по составному приоритету, а не по позиции sitemap |
| 50 | 69 | https://kileni-seo.ru/checks/http-status | основная | unique | content_hub (11) | primary:checks:content_hub:detail | основная локаль, глубина 2; выбран по составному приоритету, а не по позиции sitemap |
| 51 | 185 | https://kileni-seo.ru/glossary/ctr | основная | unique | content_hub (11) | primary:glossary:content_hub:detail | основная локаль, глубина 2; выбран по составному приоритету, а не по позиции sitemap |
| 52 | 111 | https://kileni-seo.ru/checks/https | основная | unique | content_hub (11) | primary:checks:content_hub:detail | основная локаль, глубина 2; выбран по составному приоритету, а не по позиции sitemap |
| 53 | 155 | https://kileni-seo.ru/glossary/description | основная | unique | content_hub (11) | primary:glossary:content_hub:detail | основная локаль, глубина 2; выбран по составному приоритету, а не по позиции sitemap |
| 54 | 125 | https://kileni-seo.ru/checks/image-alt-text | основная | unique | content_hub (11) | primary:checks:content_hub:detail | основная локаль, глубина 2; выбран по составному приоритету, а не по позиции sitemap |
| 55 | 167 | https://kileni-seo.ru/glossary/duplicate-page | основная | unique | content_hub (11) | primary:glossary:content_hub:detail | основная локаль, глубина 2; выбран по составному приоритету, а не по позиции sitemap |
| 56 | 127 | https://kileni-seo.ru/checks/image-dimensions | основная | unique | content_hub (11) | primary:checks:content_hub:detail | основная локаль, глубина 2; выбран по составному приоритету, а не по позиции sitemap |
| 57 | 157 | https://kileni-seo.ru/glossary/heading-h1 | основная | unique | content_hub (11) | primary:glossary:content_hub:detail | основная локаль, глубина 2; выбран по составному приоритету, а не по позиции sitemap |
| 58 | 71 | https://kileni-seo.ru/checks/indexability | основная | unique | content_hub (11) | primary:checks:content_hub:detail | основная локаль, глубина 2; выбран по составному приоритету, а не по позиции sitemap |
| 59 | 151 | https://kileni-seo.ru/glossary/http-404 | основная | unique | content_hub (11) | primary:glossary:content_hub:detail | основная локаль, глубина 2; выбран по составному приоритету, а не по позиции sitemap |
| 60 | 91 | https://kileni-seo.ru/checks/internal-link-presence | основная | unique | content_hub (11) | primary:checks:content_hub:detail | основная локаль, глубина 2; выбран по составному приоритету, а не по позиции sitemap |
| 61 | 131 | https://kileni-seo.ru/glossary/http-status | основная | unique | content_hub (11) | primary:glossary:content_hub:detail | основная локаль, глубина 2; выбран по составному приоритету, а не по позиции sitemap |
| 62 | 101 | https://kileni-seo.ru/checks/largest-contentful-paint | основная | unique | content_hub (11) | primary:checks:content_hub:detail | основная локаль, глубина 2; выбран по составному приоритету, а не по позиции sitemap |
| 63 | 183 | https://kileni-seo.ru/glossary/inp | основная | unique | content_hub (11) | primary:glossary:content_hub:detail | основная локаль, глубина 2; выбран по составному приоритету, а не по позиции sitemap |
| 64 | 107 | https://kileni-seo.ru/checks/lighthouse-accessibility | основная | unique | content_hub (11) | primary:checks:content_hub:detail | основная локаль, глубина 2; выбран по составному приоритету, а не по позиции sitemap |
| 65 | 163 | https://kileni-seo.ru/glossary/internal-link | основная | unique | content_hub (11) | primary:glossary:content_hub:detail | основная локаль, глубина 2; выбран по составному приоритету, а не по позиции sitemap |
| 66 | 97 | https://kileni-seo.ru/checks/lighthouse-performance | основная | unique | content_hub (11) | primary:checks:content_hub:detail | основная локаль, глубина 2; выбран по составному приоритету, а не по позиции sitemap |
| 67 | 165 | https://kileni-seo.ru/glossary/internal-linking | основная | unique | content_hub (11) | primary:glossary:content_hub:detail | основная локаль, глубина 2; выбран по составному приоритету, а не по позиции sitemap |
| 68 | 121 | https://kileni-seo.ru/checks/meta-description | основная | unique | content_hub (11) | primary:checks:content_hub:detail | основная локаль, глубина 2; выбран по составному приоритету, а не по позиции sitemap |
| 69 | 173 | https://kileni-seo.ru/glossary/json-ld | основная | unique | content_hub (11) | primary:glossary:content_hub:detail | основная локаль, глубина 2; выбран по составному приоритету, а не по позиции sitemap |
| 70 | 113 | https://kileni-seo.ru/checks/mixed-content | основная | unique | content_hub (11) | primary:checks:content_hub:detail | основная локаль, глубина 2; выбран по составному приоритету, а не по позиции sitemap |
| 71 | 201 | https://kileni-seo.ru/glossary/landing-page | основная | unique | content_hub (11) | primary:glossary:content_hub:detail | основная локаль, глубина 2; выбран по составному приоритету, а не по позиции sitemap |
| 72 | 109 | https://kileni-seo.ru/checks/mobile-viewport | основная | unique | content_hub (11) | primary:checks:content_hub:detail | основная локаль, глубина 2; выбран по составному приоритету, а не по позиции sitemap |
| 73 | 177 | https://kileni-seo.ru/glossary/lcp | основная | unique | content_hub (11) | primary:glossary:content_hub:detail | основная локаль, глубина 2; выбран по составному приоритету, а не по позиции sitemap |
| 74 | 119 | https://kileni-seo.ru/checks/open-graph | основная | unique | content_hub (11) | primary:checks:content_hub:detail | основная локаль, глубина 2; выбран по составному приоритету, а не по позиции sitemap |
| 75 | 133 | https://kileni-seo.ru/glossary/lighthouse | основная | unique | content_hub (11) | primary:glossary:content_hub:detail | основная локаль, глубина 2; выбран по составному приоритету, а не по позиции sitemap |
| 76 | 83 | https://kileni-seo.ru/checks/page-title | основная | unique | content_hub (11) | primary:checks:content_hub:detail | основная локаль, глубина 2; выбран по составному приоритету, а не по позиции sitemap |
| 77 | 159 | https://kileni-seo.ru/glossary/meta-tags | основная | unique | content_hub (11) | primary:glossary:content_hub:detail | основная локаль, глубина 2; выбран по составному приоритету, а не по позиции sitemap |
| 78 | 75 | https://kileni-seo.ru/checks/robots-root-access | основная | unique | content_hub (11) | primary:checks:content_hub:detail | основная локаль, глубина 2; выбран по составному приоритету, а не по позиции sitemap |
| 79 | 199 | https://kileni-seo.ru/glossary/page-cannibalisation | основная | unique | content_hub (11) | primary:glossary:content_hub:detail | основная локаль, глубина 2; выбран по составному приоритету, а не по позиции sitemap |
| 80 | 77 | https://kileni-seo.ru/checks/robots-txt | основная | unique | content_hub (11) | primary:checks:content_hub:detail | основная локаль, глубина 2; выбран по составному приоритету, а не по позиции sitemap |
| 81 | 205 | https://kileni-seo.ru/glossary/product-attribute | основная | unique | content_hub (11) | primary:glossary:content_hub:detail | основная локаль, глубина 2; выбран по составному приоритету, а не по позиции sitemap |
| 82 | 115 | https://kileni-seo.ru/checks/security-headers | основная | unique | content_hub (11) | primary:checks:content_hub:detail | основная локаль, глубина 2; выбран по составному приоритету, а не по позиции sitemap |
| 83 | 209 | https://kileni-seo.ru/glossary/product-card | основная | unique | content_hub (11) | primary:glossary:content_hub:detail | основная локаль, глубина 2; выбран по составному приоритету, а не по позиции sitemap |
| 84 | 87 | https://kileni-seo.ru/checks/single-h1 | основная | unique | content_hub (11) | primary:checks:content_hub:detail | основная локаль, глубина 2; выбран по составному приоритету, а не по позиции sitemap |
| 85 | 203 | https://kileni-seo.ru/glossary/product-feed | основная | unique | content_hub (11) | primary:glossary:content_hub:detail | основная локаль, глубина 2; выбран по составному приоритету, а не по позиции sitemap |
| 86 | 117 | https://kileni-seo.ru/checks/structured-data | основная | unique | content_hub (11) | primary:checks:content_hub:detail | основная локаль, глубина 2; выбран по составному приоритету, а не по позиции sitemap |
| 87 | 191 | https://kileni-seo.ru/glossary/query-cluster | основная | unique | content_hub (11) | primary:glossary:content_hub:detail | основная локаль, глубина 2; выбран по составному приоритету, а не по позиции sitemap |
| 88 | 105 | https://kileni-seo.ru/checks/total-blocking-time | основная | unique | content_hub (11) | primary:checks:content_hub:detail | основная локаль, глубина 2; выбран по составному приоритету, а не по позиции sitemap |
| 89 | 195 | https://kileni-seo.ru/glossary/query-clustering | основная | unique | content_hub (11) | primary:glossary:content_hub:detail | основная локаль, глубина 2; выбран по составному приоритету, а не по позиции sitemap |
| 90 | 85 | https://kileni-seo.ru/checks/unique-page-titles | основная | unique | content_hub (11) | primary:checks:content_hub:detail | основная локаль, глубина 2; выбран по составному приоритету, а не по позиции sitemap |
| 91 | 149 | https://kileni-seo.ru/glossary/redirect | основная | unique | content_hub (11) | primary:glossary:content_hub:detail | основная локаль, глубина 2; выбран по составному приоритету, а не по позиции sitemap |
| 92 | 123 | https://kileni-seo.ru/checks/useful-content-depth | основная | unique | content_hub (11) | primary:checks:content_hub:detail | основная локаль, глубина 2; выбран по составному приоритету, а не по позиции sitemap |
| 93 | 211 | https://kileni-seo.ru/glossary/rich-content | основная | unique | content_hub (11) | primary:glossary:content_hub:detail | основная локаль, глубина 2; выбран по составному приоритету, а не по позиции sitemap |
| 94 | 93 | https://kileni-seo.ru/checks/working-internal-links | основная | unique | content_hub (11) | primary:checks:content_hub:detail | основная локаль, глубина 2; выбран по составному приоритету, а не по позиции sitemap |
| 95 | 143 | https://kileni-seo.ru/glossary/robots-txt | основная | unique | content_hub (11) | primary:glossary:content_hub:detail | основная локаль, глубина 2; выбран по составному приоритету, а не по позиции sitemap |
| 96 | 79 | https://kileni-seo.ru/checks/xml-sitemap | основная | unique | content_hub (11) | primary:checks:content_hub:detail | основная локаль, глубина 2; выбран по составному приоритету, а не по позиции sitemap |
| 97 | 169 | https://kileni-seo.ru/glossary/schema-org | основная | unique | content_hub (11) | primary:glossary:content_hub:detail | основная локаль, глубина 2; выбран по составному приоритету, а не по позиции sitemap |
| 98 | 141 | https://kileni-seo.ru/glossary/search-crawler | основная | unique | content_hub (11) | primary:glossary:content_hub:detail | основная локаль, глубина 2; выбран по составному приоритету, а не по позиции sitemap |
| 99 | 197 | https://kileni-seo.ru/glossary/search-intent | основная | unique | content_hub (11) | primary:glossary:content_hub:detail | основная локаль, глубина 2; выбран по составному приоритету, а не по позиции sitemap |
| 100 | 189 | https://kileni-seo.ru/glossary/search-semantics | основная | unique | content_hub (11) | primary:glossary:content_hub:detail | основная локаль, глубина 2; выбран по составному приоритету, а не по позиции sitemap |

## 116 адресов, не загруженных

| Позиция в sitemap | URL | Локаль | Предполагаемый тип | Приоритет | Прокси-семейство | Почему не загружен |
|---:|---|---|---|---|---|---|
| 2 | https://kileni-seo.ru/en | en | homepage | homepage (0) | en:root:homepage:entry | другая локаль, внутренняя ссылка на главной №12, глубина 0; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 4 | https://kileni-seo.ru/en/services | en | hub | service_hub (1) | en:services:service_hub:entry | другая локаль, глубина 1; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 6 | https://kileni-seo.ru/en/seo | en | commercial | primary_service (2) | en:seo:primary_service:entry | другая локаль, глубина 1; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 8 | https://kileni-seo.ru/en/seo-audit | en | commercial | primary_service (2) | en:seo-audit:primary_service:entry | другая локаль, глубина 1; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 10 | https://kileni-seo.ru/en/seo-promotion | en | commercial | primary_service (2) | en:seo-promotion:primary_service:entry | другая локаль, глубина 1; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 12 | https://kileni-seo.ru/en/marketplaces | en | hub | service_hub (1) | en:marketplaces:service_hub:entry | другая локаль, глубина 1; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 14 | https://kileni-seo.ru/en/marketplaces/wildberries | en | detail | primary_service (2) | en:marketplaces:primary_service:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 16 | https://kileni-seo.ru/en/marketplaces/ozon | en | detail | primary_service (2) | en:marketplaces:primary_service:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 18 | https://kileni-seo.ru/en/marketplaces/yandex-market | en | detail | primary_service (2) | en:marketplaces:primary_service:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 20 | https://kileni-seo.ru/en/web-development | en | commercial | primary_service (2) | en:web-development:primary_service:entry | другая локаль, глубина 1; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 22 | https://kileni-seo.ru/en/yandex-ads | en | unique | primary_service (2) | en:yandex-ads:primary_service:entry | другая локаль, глубина 1; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 24 | https://kileni-seo.ru/en/content-materials | en | unique | primary_service (2) | en:content-materials:primary_service:entry | другая локаль, глубина 1; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 26 | https://kileni-seo.ru/en/custom-task | en | unique | primary_service (2) | en:custom-task:primary_service:entry | другая локаль, глубина 1; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 28 | https://kileni-seo.ru/en/pricing | en | conversion_support | pricing (3) | en:pricing:pricing:entry | другая локаль, глубина 1; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 30 | https://kileni-seo.ru/en/calculator | en | unique | lead_form (5) | en:calculator:lead_form:entry | другая локаль, глубина 1; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 32 | https://kileni-seo.ru/en/cases | en | hub | case (7) | en:cases:case:entry | другая локаль, глубина 1; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 34 | https://kileni-seo.ru/en/cases/eco-santeh | en | case | case (7) | en:cases:case:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 36 | https://kileni-seo.ru/en/cases/zasorservice | en | case | case (7) | en:cases:case:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 38 | https://kileni-seo.ru/en/brief | en | conversion_support | lead_form (5) | en:brief:lead_form:entry | другая локаль, глубина 1; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 40 | https://kileni-seo.ru/en/blog | en | hub | content_hub (11) | en:blog:content_hub:entry | другая локаль, глубина 1; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 42 | https://kileni-seo.ru/en/glossary | en | unique | content_hub (11) | en:glossary:content_hub:entry | другая локаль, глубина 1; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 44 | https://kileni-seo.ru/en/about | en | unique | about (10) | en:about:about:entry | другая локаль, глубина 1; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 46 | https://kileni-seo.ru/en/contacts | en | conversion_support | contact (6) | en:contacts:contact:entry | другая локаль, глубина 1; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 47 | https://kileni-seo.ru/privacy | основная | legal | other (13) | primary:privacy:other:entry | основная локаль, внутренняя ссылка на главной №34, глубина 1; справочный или прочий тип оказался ниже границы составного приоритета после покрытия важных типов |
| 48 | https://kileni-seo.ru/en/privacy | en | legal | other (13) | en:privacy:other:entry | другая локаль, глубина 1; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 50 | https://kileni-seo.ru/en/consent | en | legal | other (13) | en:consent:other:entry | другая локаль, глубина 1; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 52 | https://kileni-seo.ru/en/free-audit | en | commercial | free_audit (4) | en:free-audit:free_audit:entry | другая локаль, глубина 1; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 54 | https://kileni-seo.ru/en/blog/seo-audit-when-you-need-it | en | article | article (8) | en:blog:article:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 56 | https://kileni-seo.ru/en/blog/wildberries-ozon-product-card | en | article | article (8) | en:blog:article:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 58 | https://kileni-seo.ru/en/blog/why-website-is-not-in-search | en | article | article (8) | en:blog:article:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 60 | https://kileni-seo.ru/en/blog/seo-vs-yandex-ads | en | article | article (8) | en:blog:article:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 62 | https://kileni-seo.ru/en/blog/website-speed-loading | en | article | article (8) | en:blog:article:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 64 | https://kileni-seo.ru/en/blog/seo-ecommerce-promotion | en | article | article (8) | en:blog:article:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 66 | https://kileni-seo.ru/en/blog/seo-promotion-cost | en | article | article (8) | en:blog:article:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 68 | https://kileni-seo.ru/en/checks | en | unique | content_hub (11) | en:checks:content_hub:entry | другая локаль, глубина 1; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 70 | https://kileni-seo.ru/en/checks/http-status | en | unique | content_hub (11) | en:checks:content_hub:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 72 | https://kileni-seo.ru/en/checks/indexability | en | unique | content_hub (11) | en:checks:content_hub:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 74 | https://kileni-seo.ru/en/checks/canonical-url | en | unique | content_hub (11) | en:checks:content_hub:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 76 | https://kileni-seo.ru/en/checks/robots-root-access | en | unique | content_hub (11) | en:checks:content_hub:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 78 | https://kileni-seo.ru/en/checks/robots-txt | en | unique | content_hub (11) | en:checks:content_hub:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 80 | https://kileni-seo.ru/en/checks/xml-sitemap | en | unique | content_hub (11) | en:checks:content_hub:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 82 | https://kileni-seo.ru/en/checks/document-charset | en | unique | content_hub (11) | en:checks:content_hub:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 84 | https://kileni-seo.ru/en/checks/page-title | en | unique | content_hub (11) | en:checks:content_hub:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 86 | https://kileni-seo.ru/en/checks/unique-page-titles | en | unique | content_hub (11) | en:checks:content_hub:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 88 | https://kileni-seo.ru/en/checks/single-h1 | en | unique | content_hub (11) | en:checks:content_hub:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 90 | https://kileni-seo.ru/en/checks/heading-hierarchy | en | unique | content_hub (11) | en:checks:content_hub:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 92 | https://kileni-seo.ru/en/checks/internal-link-presence | en | unique | content_hub (11) | en:checks:content_hub:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 94 | https://kileni-seo.ru/en/checks/working-internal-links | en | unique | content_hub (11) | en:checks:content_hub:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 96 | https://kileni-seo.ru/en/checks/html-language | en | unique | content_hub (11) | en:checks:content_hub:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 98 | https://kileni-seo.ru/en/checks/lighthouse-performance | en | unique | content_hub (11) | en:checks:content_hub:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 100 | https://kileni-seo.ru/en/checks/first-contentful-paint | en | unique | content_hub (11) | en:checks:content_hub:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 102 | https://kileni-seo.ru/en/checks/largest-contentful-paint | en | unique | content_hub (11) | en:checks:content_hub:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 104 | https://kileni-seo.ru/en/checks/cumulative-layout-shift | en | unique | content_hub (11) | en:checks:content_hub:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 106 | https://kileni-seo.ru/en/checks/total-blocking-time | en | unique | content_hub (11) | en:checks:content_hub:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 108 | https://kileni-seo.ru/en/checks/lighthouse-accessibility | en | unique | content_hub (11) | en:checks:content_hub:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 110 | https://kileni-seo.ru/en/checks/mobile-viewport | en | unique | content_hub (11) | en:checks:content_hub:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 112 | https://kileni-seo.ru/en/checks/https | en | unique | content_hub (11) | en:checks:content_hub:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 114 | https://kileni-seo.ru/en/checks/mixed-content | en | unique | content_hub (11) | en:checks:content_hub:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 116 | https://kileni-seo.ru/en/checks/security-headers | en | unique | content_hub (11) | en:checks:content_hub:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 118 | https://kileni-seo.ru/en/checks/structured-data | en | unique | content_hub (11) | en:checks:content_hub:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 120 | https://kileni-seo.ru/en/checks/open-graph | en | unique | content_hub (11) | en:checks:content_hub:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 122 | https://kileni-seo.ru/en/checks/meta-description | en | unique | content_hub (11) | en:checks:content_hub:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 124 | https://kileni-seo.ru/en/checks/useful-content-depth | en | unique | content_hub (11) | en:checks:content_hub:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 126 | https://kileni-seo.ru/en/checks/image-alt-text | en | unique | content_hub (11) | en:checks:content_hub:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 128 | https://kileni-seo.ru/en/checks/image-dimensions | en | unique | content_hub (11) | en:checks:content_hub:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 129 | https://kileni-seo.ru/glossary/url | основная | unique | content_hub (11) | primary:glossary:content_hub:detail | основная локаль, глубина 2; справочный или прочий тип оказался ниже границы составного приоритета после покрытия важных типов |
| 130 | https://kileni-seo.ru/en/glossary/url | en | unique | content_hub (11) | en:glossary:content_hub:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 132 | https://kileni-seo.ru/en/glossary/http-status | en | unique | content_hub (11) | en:glossary:content_hub:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 134 | https://kileni-seo.ru/en/glossary/lighthouse | en | unique | content_hub (11) | en:glossary:content_hub:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 136 | https://kileni-seo.ru/en/glossary/seo-audit | en | detail | content_hub (11) | en:glossary:content_hub:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 138 | https://kileni-seo.ru/en/glossary/indexing | en | unique | content_hub (11) | en:glossary:content_hub:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 140 | https://kileni-seo.ru/en/glossary/crawling | en | unique | content_hub (11) | en:glossary:content_hub:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 142 | https://kileni-seo.ru/en/glossary/search-crawler | en | unique | content_hub (11) | en:glossary:content_hub:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 144 | https://kileni-seo.ru/en/glossary/robots-txt | en | unique | content_hub (11) | en:glossary:content_hub:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 145 | https://kileni-seo.ru/glossary/sitemap | основная | unique | content_hub (11) | primary:glossary:content_hub:detail | основная локаль, глубина 2; справочный или прочий тип оказался ниже границы составного приоритета после покрытия важных типов |
| 146 | https://kileni-seo.ru/en/glossary/sitemap | en | unique | content_hub (11) | en:glossary:content_hub:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 148 | https://kileni-seo.ru/en/glossary/canonical | en | unique | content_hub (11) | en:glossary:content_hub:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 150 | https://kileni-seo.ru/en/glossary/redirect | en | unique | content_hub (11) | en:glossary:content_hub:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 152 | https://kileni-seo.ru/en/glossary/http-404 | en | unique | content_hub (11) | en:glossary:content_hub:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 153 | https://kileni-seo.ru/glossary/title | основная | unique | content_hub (11) | primary:glossary:content_hub:detail | основная локаль, глубина 2; справочный или прочий тип оказался ниже границы составного приоритета после покрытия важных типов |
| 154 | https://kileni-seo.ru/en/glossary/title | en | unique | content_hub (11) | en:glossary:content_hub:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 156 | https://kileni-seo.ru/en/glossary/description | en | unique | content_hub (11) | en:glossary:content_hub:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 158 | https://kileni-seo.ru/en/glossary/heading-h1 | en | unique | content_hub (11) | en:glossary:content_hub:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 160 | https://kileni-seo.ru/en/glossary/meta-tags | en | unique | content_hub (11) | en:glossary:content_hub:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 162 | https://kileni-seo.ru/en/glossary/on-page | en | unique | content_hub (11) | en:glossary:content_hub:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 164 | https://kileni-seo.ru/en/glossary/internal-link | en | unique | content_hub (11) | en:glossary:content_hub:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 166 | https://kileni-seo.ru/en/glossary/internal-linking | en | unique | content_hub (11) | en:glossary:content_hub:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 168 | https://kileni-seo.ru/en/glossary/duplicate-page | en | unique | content_hub (11) | en:glossary:content_hub:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 170 | https://kileni-seo.ru/en/glossary/schema-org | en | unique | content_hub (11) | en:glossary:content_hub:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 171 | https://kileni-seo.ru/glossary/structured-data | основная | unique | content_hub (11) | primary:glossary:content_hub:detail | основная локаль, глубина 2; справочный или прочий тип оказался ниже границы составного приоритета после покрытия важных типов |
| 172 | https://kileni-seo.ru/en/glossary/structured-data | en | unique | content_hub (11) | en:glossary:content_hub:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 174 | https://kileni-seo.ru/en/glossary/json-ld | en | unique | content_hub (11) | en:glossary:content_hub:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 176 | https://kileni-seo.ru/en/glossary/core-web-vitals | en | unique | content_hub (11) | en:glossary:content_hub:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 178 | https://kileni-seo.ru/en/glossary/lcp | en | unique | content_hub (11) | en:glossary:content_hub:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 180 | https://kileni-seo.ru/en/glossary/cls | en | unique | content_hub (11) | en:glossary:content_hub:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 181 | https://kileni-seo.ru/glossary/tbt | основная | unique | content_hub (11) | primary:glossary:content_hub:detail | основная локаль, глубина 2; справочный или прочий тип оказался ниже границы составного приоритета после покрытия важных типов |
| 182 | https://kileni-seo.ru/en/glossary/tbt | en | unique | content_hub (11) | en:glossary:content_hub:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 184 | https://kileni-seo.ru/en/glossary/inp | en | unique | content_hub (11) | en:glossary:content_hub:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 186 | https://kileni-seo.ru/en/glossary/ctr | en | unique | content_hub (11) | en:glossary:content_hub:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 188 | https://kileni-seo.ru/en/glossary/conversion | en | unique | content_hub (11) | en:glossary:content_hub:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 190 | https://kileni-seo.ru/en/glossary/search-semantics | en | unique | content_hub (11) | en:glossary:content_hub:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 192 | https://kileni-seo.ru/en/glossary/query-cluster | en | unique | content_hub (11) | en:glossary:content_hub:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 193 | https://kileni-seo.ru/glossary/semantic-core | основная | unique | content_hub (11) | primary:glossary:content_hub:detail | основная локаль, глубина 2; справочный или прочий тип оказался ниже границы составного приоритета после покрытия важных типов |
| 194 | https://kileni-seo.ru/en/glossary/semantic-core | en | unique | content_hub (11) | en:glossary:content_hub:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 196 | https://kileni-seo.ru/en/glossary/query-clustering | en | unique | content_hub (11) | en:glossary:content_hub:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 198 | https://kileni-seo.ru/en/glossary/search-intent | en | unique | content_hub (11) | en:glossary:content_hub:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 200 | https://kileni-seo.ru/en/glossary/page-cannibalisation | en | unique | content_hub (11) | en:glossary:content_hub:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 202 | https://kileni-seo.ru/en/glossary/landing-page | en | unique | content_hub (11) | en:glossary:content_hub:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 204 | https://kileni-seo.ru/en/glossary/product-feed | en | unique | content_hub (11) | en:glossary:content_hub:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 206 | https://kileni-seo.ru/en/glossary/product-attribute | en | unique | content_hub (11) | en:glossary:content_hub:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 207 | https://kileni-seo.ru/glossary/sku | основная | unique | content_hub (11) | primary:glossary:content_hub:detail | основная локаль, глубина 2; справочный или прочий тип оказался ниже границы составного приоритета после покрытия важных типов |
| 208 | https://kileni-seo.ru/en/glossary/sku | en | unique | content_hub (11) | en:glossary:content_hub:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 210 | https://kileni-seo.ru/en/glossary/product-card | en | unique | content_hub (11) | en:glossary:content_hub:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 212 | https://kileni-seo.ru/en/glossary/rich-content | en | unique | content_hub (11) | en:glossary:content_hub:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 214 | https://kileni-seo.ru/en/glossary/ab-testing | en | unique | content_hub (11) | en:glossary:content_hub:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
| 216 | https://kileni-seo.ru/en/glossary/acceptance-criterion | en | unique | content_hub (11) | en:glossary:content_hub:detail | другая локаль, глубина 2; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен |
