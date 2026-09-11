# Три правки по комментариям на главной

- «Сайт есть.» вынесено на отдельную строку; продолжение заголовка сохранено.
- Мелкий текст в отмеченном первом блоке увеличен примерно на 1–2 px: подписи, пояснения, счётчик и карточки проверок. Шрифт основной страницы не масштабировался.
- Панель дополнена наглядным сравнением до/после с выделенным `noindex`, переходом и подтверждением повторной проверки. Есть пометка «Пример исправления» и уточнение, что отсутствие noindex не доказывает попадание в поиск. Четыре этапа сохранены, карточки стали компактнее.

Файлы: `app/final-ui-corrections.css`, `src/components/home/HomePage.tsx`, `tests/e2e/client-feedback-release.spec.ts`. Backend, формы и генератор SEO-отчёта не менялись.

## Проверки и команды

Две проверки новых требований сначала упали на прежнем интерфейсе. После изменений четыре выбранных сценария hero/панели прошли в Chromium. Отдельно проверены RU/EN и три темы на 320, 390, 768, 1024 и 1787 px; переполнений и ошибок JavaScript не найдено. Axe для панели на 390/1787 px — без нарушений.

```powershell
.\node_modules\.bin\eslint.cmd src/components/home/HomePage.tsx tests/e2e/client-feedback-release.spec.ts --max-warnings=0
.\node_modules\.bin\tsc.cmd --noEmit
.\node_modules\.bin\vitest.cmd run --config vitest.config.ts tests/unit/public-copy.test.ts
node node_modules/next/dist/bin/next build --webpack
node scripts/start.mjs
# При запущенном изолированном тестовом сервере:
$env:E2E_EXTERNAL_SERVER='1'
.\node_modules\.bin\playwright.cmd test tests/e2e/client-feedback-release.spec.ts --project=chromium --project=webkit --grep 'hero|balanced visual board' --output=tmp/home-comments-production
node tmp/home-comments-qa.mjs
git diff --check
```

ESLint, TypeScript, шесть unit-тестов текста и production-сборка прошли. На собранной версии также прошли восемь выбранных тестов Chromium/WebKit. Браузерные проверки используют отдельную SQLite и отключённые внешние интеграции, не рабочую базу. Полный набор 647 тестов повторно не запускался: изменения ограничены статической разметкой и CSS.

Скриншоты: `work/browser-qa/home-comments-sept11/` — `{ru,en}-hero-{theme}-{width}.png`, `{ru,en}-panel-{theme}-{width}.png`. Для узких экранов также `panel-end` с нижней частью панели.

Локальный просмотр: http://127.0.0.1:3107/. Обычный запуск разработки по README — `pnpm dev` (web и worker). На этой машине инструменты запускались напрямую из node_modules из-за ранее обнаруженной ошибки подписи Corepack; проверка целостности не отключалась.

После обновления страницы пользователю остаётся оценить визуальный вариант панели. На опубликованный сайт эти изменения не отправлялись; после развёртывания нужен контроль на физическом телефоне.

## Дополнение: заключительный заголовок в одну строку

В `app/final-ui-corrections.css` изменена сетка заключительного блока только при ширине от 1200 px: подпись занимает ширину своего текста, заголовок получает больше места. На телефоне переносы сохранены. Добавлена регрессия в `tests/e2e/client-feedback-release.spec.ts`.

Повторная production-сборка с проверкой TypeScript, ESLint и `git diff --check` прошли. Команда `playwright test tests/e2e/client-feedback-release.spec.ts --project=chromium --project=webkit --grep 'final home CTA'` — два теста прошли. Дополнительная проверка: `node tmp/cta-line-qa.mjs`, RU/EN, три темы, 1787/1440/1200/390 px. Скриншоты: `work/browser-qa/cta-line/`. Локальный запуск и отсутствие публикации остаются без изменений.

## Дополнение: оформление первого блока /seo

Текст заголовка, подписи и описания сохранён дословно в RU/EN. В `src/components/pages/SeoHubPage.tsx` добавлена декоративная векторная композиция с проверкой страницы и повторной работой; она не содержит новых текстов, метрик или интерактивных элементов. В `app/seo-hub.css` добавлены оформление иллюстрации, тонкий акцент у описания и фон, использующие существующие цвета темы. Отдельные изображения, библиотеки и JavaScript не добавлялись.

Проверки: `eslint` для изменённых TSX/тестов, `tsc --noEmit`, `next build --webpack`, `git diff --check`; браузерная регрессия `playwright test tests/e2e/client-feedback-release.spec.ts --project=chromium --project=webkit --grep 'decorates the SEO hero'`; визуальная проверка `node tmp/seo-hero-qa.mjs`. Скриншоты: `work/browser-qa/seo-hero/`, RU/EN, Dark/Signal/Light, 320/390/768/1024/1787 px. Проверяется дословное сохранение текста, отсутствие горизонтального переполнения, ошибок JavaScript и нарушений axe в первом блоке. Остальные блоки страницы не изменены. Рабочий сайт не обновлялся.

## Дополнение: панель процесса аудита под этапами

В `app/audit-live-overlay.css` двухколоночная компоновка заменена на вертикальную: описание текущего этапа, шкала этапов, анимация на всю ширину блока, показатели и события. В `src/components/forms/AuditLiveProgress.tsx` порядок разметки приведён в соответствие с отображением. Тексты, анимации и логика проверки не изменены.

Регрессия `tests/e2e/audit-live-layout.spec.ts` проверяет пять этапов в Dark/Signal/Light на 1787×1318, 1440×900, 390×844 и 320×720, положение панели ниже этапов, её полную ширину, отсутствие горизонтального переполнения и ошибок JavaScript, сворачивание и повторное открытие. Используется отдельная локальная тестовая база, внешний аудит не запускается. До исправления проверка положения панели падала; после исправления три сценария Chromium прошли. ESLint, `tsc --noEmit` и 20 unit-тестов прогресса прошли.

Команды: `eslint src/components/forms/AuditLiveProgress.tsx tests/e2e/audit-live-layout.spec.ts --max-warnings=0`, `tsc --noEmit`, `vitest run --config vitest.config.ts tests/unit/audit-live-progress.test.ts tests/unit/audit-progress-state.test.ts tests/unit/audit-progress-event.test.ts`, `next build --webpack`, `playwright test tests/e2e/audit-live-layout.spec.ts --project=chromium --project=webkit`, `git diff --check`. Инструменты запускаются из `node_modules/.bin`; для Playwright используются `E2E_EXTERNAL_SERVER=1`, `E2E_PORT=3108` и изолированная SQLite.

Скриншоты: `work/browser-qa/audit-below-stages/{chromium,webkit}-{dark,signal,light}-{connection,rules,selection,check,report}-{1787,1440,390,320}.png`. Ручная проверка после обновления локального просмотра: оценить расположение панели в своём аудите; перед публикацией проверить на физическом телефоне. Запуск разработки по README — `pnpm dev`. На опубликованный сайт изменения не отправляются.

Production-сборка прошла. Локальный просмотр на 3107 обновлён с сохранением прежней базы; исходная страница пользователя открыта в Chromium, состояние подключения проверено глазами и сохранено в `work/browser-qa/audit-below-stages/user-audit-desktop.png`.

При первом production-прогоне WebKit зарегистрировал ошибку предзагрузки. Диагностика trace показала отменённые запросы Next.js (`Load request cancelled`) между повторными переходами, при этом завершённые запросы отвечали 200. Тест изменён: страница открывается один раз, далее проверяются реальные обновления этапов через поток прогресса, без искусственных перезагрузок. Ошибки не фильтруются, сетевые ограничения сайта не ослабляются.

Финальный production-прогон: **6 тестов прошли** в Chromium/WebKit (120 сочетаний этапа, темы и размера экрана), ошибок JavaScript нет. Повторные ESLint и TypeScript после изменения теста также прошли. Временный сервер на 3108 остановлен; пользовательский просмотр на 3107 оставлен запущенным.

## Дополнение: шкала этапов перенесена под анимацию

По следующему комментарию пользователя порядок изменён на: описание текущего этапа → полноширинная анимация → шкала пяти этапов → фактические показатели и события. Изменены только порядок разметки в `AuditLiveProgress.tsx` и области CSS Grid в `audit-live-overlay.css`; логика аудита, тексты и анимации сохранены.

Регрессия сначала воспроизвела прежнее положение шкалы над анимацией. Дополнительная проверка выявила и предотвратила избыточный пустой промежуток: на итоговой странице `kalinoff.ru` расстояние между анимацией и шкалой составляет 12 px. Production-прогон: 6 тестов Chromium/WebKit, 5 этапов, Dark/Signal/Light, 1787×1318, 1440×900, 390×844 и 320×720 — все прошли. Скриншоты: `work/browser-qa/audit-stages-below/`; итоговый пользовательский экран — `user-audit-desktop-final.png`.
