# Регрессионная проверка KILENI перед выпуском

Дата: 5 сентября 2026 года
Ветка: `audit/kileni-full-validation`
Базовый commit: `b9bd48745191b4f685f343a6bcba34ef53a3a258`
Целевой стенд: `https://kileni-preview.72-56-249-36.sslip.io`
Production: не изменялся.

## Область проверки

Проверены только подтверждённые дефекты полного аудита и движка бесплатной проверки. Принятые клиентский отчёт, двухстраничный PDF, выборка, CTA, цены, тексты и визуальная концепция не переделывались.

Изменения этого прохода:

1. исправлена применимость hreflang: проверка не создаёт замечание без реально обнаруженной языковой пары;
2. noindex публичной conversion/utility-страницы больше не теряется между карточкой URL и общими findings;
3. сопоставление check target сохраняет query-строку, поэтому исключённое параметризованное состояние не присоединяется к чистой проверенной странице;
4. устранена нестабильность повторной навигации в четырёх старых WebKit-сценариях;
5. до этого же release-pass были устранены подтверждённые тяжёлые изображения, семантическое расхождение desktop-блоков «О компании», порядок заголовков в брифе и serious color-contrast на нескольких маршрутах/темах;
6. расширенная финальная матрица выявила и точечно исправила бледные хлебные крошки Light на `/seo`, `/glossary/lighthouse` и `/checks/http-status`.

## Автоматические проверки

| Проверка | Результат | Доказательство |
| --- | --- | --- |
| TypeScript | PASS после финальных изменений | `regression/typecheck-post-contrast-final.log` |
| ESLint | PASS после финальных изменений | `regression/lint-post-contrast-final.log` |
| Unit/integration | 93 файла, 582 теста, PASS | `regression/vitest-full-post-contrast-final.log` |
| Build | PASS, Next.js 16.3.1; worker 393,8 КБ; итоговый build `uQ91qJuLNbdZSN5jbqLF5` | `regression/build-post-contrast-final.log` |
| Chromium E2E | 100 + 87 = 187, PASS, один worker | `regression/chromium-shard-1-post-contrast-final.log`, `regression/chromium-shard-2-post-contrast-final.log` |
| WebKit E2E | 100 + 87 = 187, PASS, один worker | `regression/webkit-shard-1-post-contrast-final.log`, `regression/webkit-shard-2-post-contrast-final.log` |
| WebKit flake regression | PASS | `regression/webkit-responsive-flake-proof.log` |
| Fixture gate | 4 файла, 60 тестов, PASS | `regression/fixtures-post-contrast-final.log`, `regression/fixtures-post-contrast-final.json` |
| Accessibility/browser matrix | 36 сценариев, без serious/critical, overflow, console и page errors | `accessibility-final/summary.json` |
| Расширенная theme/contrast matrix | baseline production: 84 сценария и 62 serious/critical вхождения; финальный preview: 84/84 уникальных screenshot, serious/critical 0, non-200 0, overflow 0, missing target 0 | `contrast-before-production-20260905/summary.json`, `contrast-after-preview-final-20260905/summary.json` |
| Release browser gates после contrast-fix | 12 сценариев Chromium/WebKit: breadcrumbs Light, text zoom 200%, compact header, core routes, JS-off 320 px и admin widths — PASS | `regression/release-browser-gates-post-contrast.md`, `regression/playwright-last-run-post-contrast.json` |
| Lighthouse изолированного внешнего preview | 9 маршрутов × 2 профиля × 3 запуска = 54; 54 числовых отчёта, подтверждённый TBT/P1-дефект не воспроизведён, остаточные LCP/CLS отмечены как P2 | `lighthouse-external-preview-post-isolation-final/runs.json`, `medians.json` |
| Production dependency audit | PASS, известных production-уязвимостей нет | `regression/pnpm-audit-prod-post-isolation.log` |

Старые `chromium-full.log` и промежуточные accessibility-каталоги сохраняются как история диагностики и не являются итоговым зелёным gate. Финальный Chromium/WebKit gate — четыре shard-лога из таблицы; итоговый accessibility gate — `accessibility-final/`. Исходный `accessibility/summary.json` подтверждает исправленный P1: serious `color-contrast` был на `/services`, `/seo`, `/glossary/lighthouse`, `/checks/http-status`, `/contacts`, а в mobile-сценариях также на `/`, `/pricing` и `/services`; в итоговой матрице список serious/critical пуст.

## Fixtures и parity

Fixture A, B и C проходят. Для каждого сохранены API JSON, web screenshot, PDF и admin screenshot в Chromium и WebKit. Автоматически сравнивается единая нормализованная client model, включая inventory, выбранные и исключённые страницы и русские клиентские findings. Текст PDF извлечён и сопоставлен с моделью. Rendered web/PDF/admin дополнительно просмотрены глазами.

Это не называется полным автоматическим посимвольным equality-test четырёх отрисованных поверхностей: автоматизирован model parity, а rendered parity подтверждён визуально по артефактам.

Итог fixtures:

- A: 3 HTML, выбрано и проверено 3, findings 7;
- B: 9 HTML, eligible 5, выбрано и проверено 5, findings 5;
- C: 9 HTML, выбрано и проверено 6, findings 5; ложного hreflang-замечания нет.

## Полный crawl

Read-only production discovered inventory содержит 256 публичных URL: 240 HTML-состояний и 16 документов. Все 216 чистых sitemap URL и все 24 query-состояния загружены и классифицированы. Ошибок ответа, soft 404, noindex, canonical/hreflang, orphan, broken anchor и синтаксических ошибок JSON-LD не найдено.

Route-конфигурация дополнительно содержит legacy aliases, которых нет в sitemap и внутренних ссылках. Проверены 20 конечных alias-адресов и один представитель wildcard `/fragrance/:path*`: каждый отвечает одним 308 и приводит к ожидаемой странице с 200. Поэтому значение `redirect=0` относится только к discovered inventory, а не объявляется отсутствием публичных redirect rules. Доказательство — `inventory-final/source-known-redirects.md`.

После обновления внешнего стенда повторный crawl сохранён в `inventory-preview-final/`: 256 публичных URL, 240 HTML-состояний, 16 документов, все 216 sitemap URL и 24 query-состояния загружены, ошибок и soft 404 нет. После последней CSS-сборки crawl повторён буквально: прямой preview-host проход снова загрузил 256 состояний (240 HTML + 16 документов), без response errors, soft 404, canonical/hreflang, orphan, broken-anchor и JSON-LD syntax errors; результаты лежат в `inventory-preview-post-contrast-20260905/`. Отдельный logical-origin проход подтвердил загрузку всех 216 sitemap URL в `inventory-preview-post-contrast-logical-20260905/`; его canonical/hreflang mismatch вызван тем, что HTML с preview-хоста содержит preview-host, поэтому production metadata оценивается только по исходному read-only production crawl. Защитный noindex preview также ожидаем и не является регрессией.

## Производительность

Production подтвердил тяжёлую раннюю загрузку PNG и offscreen-изображений. После WebP/lazy-loading финальный изолированный preview прошёл 54 измерения. На главной медиана mobile — 91 / LCP 3,12 с / TBT 54 мс, desktop — 99 / LCP 0,84 с / TBT 0 мс. На статье mobile — 93 / LCP 2,72 с / TBT 31,5 мс, desktop — 95 / LCP 0,85 с / TBT 0 мс.

Trace главной при первом и повторном входе сохранён в `performance-trace/`. Маршруты services, SEO, pricing, free-audit, brief, case, article и glossary покрыты в `performance-trace-final/`. Эти template traces сняты с внешнего preview до последнего server-only обновления движка; клиентская performance-сборка не менялась, но в отчёте это различие не скрывается.

Production TBT кейса и статьи был выше 200 мс минимум в двух из трёх прогонов; на preview не воспроизвёлся. После отдельной команды на production deployment требуется такой же контрольный тройной замер.

При этом performance не объявляется полностью закрытым. Mobile LCP главной превысил 2,5 с в 2/3 запусков при принятой intro-сцене (**DO NOT CHANGE** без продуктового решения), mobile LCP статьи — в 3/3 (2,75 / 2,72 / 2,71 с), а CLS брифа равен 0,11 в 3/3. Медиана лабораторной оценки `/seo` desktop и `/free-audit` mobile равна 89 без повторного высокого TBT. Это P2-наблюдения, для которых нужны полевые данные или отдельный воспроизводимый trace.

## Runtime-пакет

В предыдущем полном gate (до последнего CSS-only contrast-fix) был создан и проверен standalone runtime:

- `/tmp/kileni-runtime-final-20260905T0131Z.tar.gz`;
- 40 343 645 байт;
- SHA-256 `315022e6b337a08d0a3abe69c64041ed2607fe1bcff88962df95e02b3ceaae1c`;
- запрещённых environment/secrets-файлов: 0;
- совпадений с приватными ключами: 0.

Архив был транспортным артефактом проверки и удалён после сборки server release; его хеш и результаты no-secrets проверки сохранены здесь и в `regression/runtime-packaging-final.txt`.

Минимальный транспортный overlay для отдельного preview:

- `/tmp/kileni-deploy-overlay-20260905T0135Z.tar.gz`;
- 3 098 253 байта;
- SHA-256 `6a87dde5dd2b7561fa10d162c0e50faac30632d1aa118bc95837f80d39219f35`;
- переиспользует неизменённые `public` и `node_modules` предыдущего preview-релиза.

Этот промежуточный overlay также удалён после проверки и больше не занимает локальный диск.

Финальный Linux runtime после исправления изоляции хранится вне публичного web root: `/opt/kileni-preview/artifacts/kileni-preview-linux-final-20260905T1215MSK.tar.gz`, 43 819 324 байта, SHA-256 `755b4288d4c2afba524b06632039c8c88a754588186c453e9bc68c516ce56251`. Проверка состава: environment/secrets-файлы — 0, маркеры приватных ключей — 0, AppleDouble — 0. Нативный `better-sqlite3` проверен как Linux ELF, необходимые runtime migration и libSQL Linux package присутствуют.

Полный runtime локально распакован и запущен на порту 64321. `/api/health` вернул `status=ok`, `database=ok`, `auditRunner=worker`. Подробности: `regression/runtime-packaging-final.txt`.

## Внешний release-gate

Gate снят. 6 сентября 2026 года build `hMRsJgZvOWXEvY7S6UUSe` опубликован сначала на preview, затем в production.

- Preview runtime: `/opt/kileni-preview/releases/20260905T1155MSK-isolated-final`.
- Production release: `/opt/kileni-seo-releases/20260906-hmrs-final/runtime`.
- Build ID обоих web runtime: `hMRsJgZvOWXEvY7S6UUSe`.
- `kileni-preview-web` — healthy, `kileni-preview-worker` — up; health возвращает `status=ok`, `database=ok`, `auditRunner=worker`, `worker=ok`.
- Внешний ответ содержит `X-Robots-Tag: noindex, nofollow, noarchive`.
- Preview использует отдельную SQLite-базу; Turso, SMTP, Telegram и Turnstile в web/worker отключены. Worker работает из image с Chromium; ошибочный промежуточный worker из web-image больше не обслуживает стенд.
- Новый cache-miss аудит завершён с token `BoqzYtMbeBwYcIJXmnt1iQ_z5EZjNE-KQfAsgrsdDNc`: 100 предварительно просмотрено, 99 подходят, 1 исключён, 10 выбрано и подробно проверено, 89 не вошли; один speed warning на главной и один optional BreadcrumbList на `/services`.
- Свежий PDF повторно скачан уже после последнего preview deployment, занимает 2 заполненные A4-страницы (38 503 байта), SHA-256 `9d63088c86e99ebadc07164eba731f4d9c0b26b8e30c57f3ce467fe768ca35b8`, и визуально сопоставлен с web.
- Сохранённая API presentation, web, PDF и admin заново построены из одного immutable snapshot. Четыре нормализованные client-facing модели побайтно одинаковы, общий SHA-256 `4fad01c8d565316725149c66c390427c7b2d73d0982a3e482b55e83c2675ccc2`; отдельно проверен фактически извлечённый текст PDF.
- В настоящем in-app browser проверены Dark/Signal/Light, `320×720`, `390×844`, `768×1024`, `1440×900`, закрытая и раскрытая группировка, технические файлы, дисклеймер и CTA; консольных ошибок и horizontal overflow нет. Увеличение текста до 200% дополнительно прошло в Chromium и WebKit E2E.
- Реальный Safari 26.1 использован после production-переключения: проверены desktop, Responsive Design Mode `387×800`, заставка, главная и первый viewport готового клиентского отчёта. Новый SSR отчёта подтверждён DOM-снимком: завершённый snapshot отображается сразу без промежуточного loader.
- Серверная сверка после переключения показала production web `healthy`, worker `up`, внешний `/api/health` — `status=ok`, `database=ok`, `auditRunner=worker`, `worker=ok`; Caddy не пересоздавался.
- В ходе проверки выявлено, что более ранняя конфигурация preview наследовала production Turso и внешние интеграции. Поэтому ранние preview-аудиты могли создать QA-записи в production-базе, хотя production runtime не менялся. Записи не удалялись; требуется отдельное решение владельца после точной идентификации.
- Временные upload-файлы preview удалены; rollback releases и containers сохранены.

Доказательства: `inventory-preview-final/`, `inventory-preview-post-contrast-20260905/`, `inventory-preview-post-contrast-logical-20260905/`, `contrast-before-production-20260905/`, `contrast-after-preview-final-20260905/`, `lighthouse-external-preview-post-isolation-final/`, `audit-pipeline-post-isolation-final/` и финальные логи в `regression/`.

## Что не проверено

Сборка `hMRsJgZvOWXEvY7S6UUSe` опубликована. Transport archive удалён локально и на сервере после успешного healthcheck; предыдущий production release и отдельная preview-копия сохранены для отката. Findings, выборка и композиция отчёта не менялись при выпуске.

- **NOT TESTED:** фактическая индексация, позиции, показы и CTR — нужны Яндекс Вебмастер или Google Search Console;
- **NOT TESTED:** трафик и конверсии — нужен доступ к аналитике;
- **NOT TESTED полностью:** смысловое соответствие текста назначению всех 240 HTML-страниц; вручную просмотрены девять основных шаблонов без явного mismatch;
- **NOT TESTED externally:** реальная доставка письма — preview намеренно не подключён к production SMTP;
- **NOT TESTED:** причинная привязка hydration, количества listeners и всех offscreen-анимаций к одному компоненту; trace не даёт достаточного основания;
- **NOT TESTED в реальном Safari:** взаимодействие со всеми раскрытиями/формами; реальный Safari использован для load/render smoke, а полный интерактивный набор выполнен движком WebKit в Playwright.

Отсутствие внешней доставки почты не скрывается, но не блокирует проверку preview: стенд намеренно изолирован от production SMTP, а шаблон, snapshot и сохранение notification-state покрыты автоматическими тестами. Перед отдельным production release остаётся обязательным реальное письмо на контролируемый адрес.

## Откат

Preview обновляется отдельным release-каталогом. Безопасный откат — пересоздать только preview web/worker на предыдущем `KILENI_RUNTIME_DIR`, сохранив текущую изолированную SQLite-конфигурацию и пустые Turso/SMTP/Telegram/Turnstile. Остановленные контейнеры, созданные до исправления изоляции, нельзя запускать как есть: их environment мог содержать production-подключения. Процедура отката не требует операций с production, его маршрутом или data volume. Предыдущий кодовый релиз сохраняется до отдельного production-решения.

Корень доказательств: `docs/user-audit-evidence/kileni-full-audit-2026-09-04/`.
