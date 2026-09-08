# Финальный интеграционный gate RC3

## Зафиксированный кандидат

- [x] Ветка `release/final-handoff-qa`, базовый commit `b9bd48745191b4f685f343a6bcba34ef53a3a258`.
- [x] Exact build ID `SENFDQRfLN1EzZQY-cqkc`.
- [x] Полный git status и список незакоммиченных путей сохранены.
- [x] 549 runtime-файлов повторно сверены по исходному SHA-256 manifest; состояние кандидата во время тестов не менялось.
- [x] Preview изолирован от production и использует отдельную SQLite, схема 10.
- [x] Production опубликован после server-side preflight и backup.

## Прежние P0/P1

- [x] Preview health: database/worker ok; current production health: 10/10 HTTP 200.
- [x] Существующие production audit web/API/PDF открываются.
- [x] Новый RC3 audit создаётся, восстанавливается и завершается.
- [x] Семь editorial WebP входят в standalone/runtime package и отвечают 200 на preview.
- [x] CSS, JS, шрифты и изображения загружаются без cache/service worker.
- [x] Калькулятор и аудит восстанавливаются после reload; duplicate submit не создаёт вторую запись.
- [x] Выбранный offer сохраняется до брифа; лишней кнопки «Выбрано» нет.
- [x] Admin показывает понятную причину исключения.
- [x] Web/PDF/API/admin используют один snapshot.
- [x] Preview SMTP принял письмо; sender, UTF-8 subject и ссылка проверены.

## 24 замечания

- [x] Все 24 пункта сохраняют PASS после объединения с техническими исправлениями.
- [x] Изображения отображаются, вкладки меняют содержимое.
- [x] Карточки, цены, списки и CTA выровнены.
- [x] Нет лишнего selected-state, обрезанных букв и дробления слов.
- [x] Проверены нормальные пользовательские формулировки без запрещённого технического жаргона.
- [x] 24 RU/EN DOCX/PDF-брифа совпадают с утверждённым договором формы и повторно сверены по hash.
- [x] Dark, Signal и Light прошли regression.

## Полный test suite

- [x] Typecheck PASS.
- [x] ESLint PASS, exit 0.
- [x] Vitest: 606/606 PASS, 97 файлов.
- [x] Audit fixtures: 32/32 PASS, 2 интеграционных файла.
- [x] Chromium E2E: 213/213 PASS.
- [x] WebKit E2E: 213/213 PASS полным scope в свежих process shards.
- [x] Production build и worker bundle PASS.
- [x] Runtime packaging test PASS.

## Clean browser

- [x] 27 шаблонов × 4 viewport × 3 темы × 2 движка = 648/648 PASS.
- [x] Chromium 324/324; WebKit 324/324.
- [x] 320×720, 390×844, 768×1024, 1440×900.
- [x] Dark, Signal, Light.
- [x] Horizontal overflow, clipping, H1, theme, images, focus, console, network и assets проверены.
- [x] Sitemap routes 216/216; assets 57/57; internal links 561/561.
- [x] Итоговые desktop/mobile contact sheets обоих движков просмотрены вручную.

## Центральный E2E

- [x] Первый визит и переход с главной.
- [x] Бесплатный аудит, fullscreen, свернуть/восстановить, refresh.
- [x] Завершение, web-result, раскрытия, public PDF.
- [x] Полный аудит, выбранный тариф, Back/Forward/reload.
- [x] Бриф, вложение, отправка.
- [x] Admin login, status, note, export и client exclusion reason.
- [x] SMTP handoff.
- [x] Console/page errors и unexpected network errors: 0.

## Runtime и выпуск

- [x] 33 406 файлов и 710 symlink сверены; расхождений нет.
- [x] Нативные зависимости — Linux x86-64, Node ABI 127; macOS-бинарников нет.
- [x] Внутри package разрешаются все production dependencies и worker externals.
- [x] Создан проверенный архив RC3 и сохранён SHA-256.
- [x] Release path и code rollback определены.
- [x] Current production smoke сохранён read-only.
- [x] Server-side preflight, backup, switch и post-switch smoke: PASS.

## Итог

- [x] P0: 0.
- [x] P1: 0.
- [x] P2 оставлено: 0.
- [x] Candidate verdict: PASS.
- [ ] Реальный Safari / физический iPhone: OWNER MANUAL CHECK.
- [ ] Внешний inbox: доступа нет; SMTP handoff подтверждён.
- [x] Production published: `/opt/kileni-seo-releases/20260907-final-integration-rc3`, build `SENFDQRfLN1EzZQY-cqkc`.
