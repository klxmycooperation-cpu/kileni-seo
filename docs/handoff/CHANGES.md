# Состояние исправлений

## Симптомы

В production пользователь видел нестабильные результаты бесплатного аудита: для одинакового типа работы появлялись разные формы отчёта, включая экран с обнаруженными страницами, но без выбранных и подробно проверенных страниц. Одновременно перестали надёжно поступать заявки, брифы и почтовые уведомления.

## Что подтверждено в исходниках

`c2097fd3dd518db6bc26df511dd4fb5b270a3687` добавляет проверяемые защиты в общих точках этого пути:

- публичный audit сохраняет согласованный snapshot и не выдаёт completion для неполного результата;
- UI сохраняет введённый URL при hydration и восстанавливает audit после обрыва stream/refresh вместо перехода на пустой или старый экран;
- terminal audit state сохраняется с retry для transient DB errors;
- audit и brief сохраняются до внешнего уведомления: недоступный SMTP или Telegram не отменяет уже принятую запись;
- для audit e-mail `notification_events` хранит lease, результат и retry classification, поэтому web и worker не должны дублировать отправку; у brief сохраняется результат попытки, но отдельный retry worker для копии брифа пока не реализован;
- admin, публичный result и PDF строятся из одного сохранённого audit snapshot;
- добавлены regression tests для формы, terminal state, delivery boundary, worker retry и отображения результата.

## Причина и уровень уверенности

Есть подтверждённая ошибка старого publish-script: он заменял migration и `node_modules` нового релиза файлами активного релиза. Это создаёт смешанный runtime и объясняет расхождение схемы, worker и web-кода. Внутри candidate такой перенос исключён.

Серверные логи и active container недоступны из-за отказа SSH/VNC/serial access. Поэтому нельзя честно утверждать, что это единственная причина всех production симптомов или что SMTP в production сломан. После восстановления доступа нужно сопоставить release mounts, environment web/worker, database mode, worker logs, `notification_events` и timestamps трёх реальных сценариев.

## Проверки candidate

На commit `c2097fd3` до передачи прошли lint, TypeScript, 626 unit/integration tests, production build и 452 Playwright scenarios в Chromium/WebKit на production build с изолированной SQLite-базой. Полный artifact проверен: 33 406 файлов, 710 relative symlink, Linux x86-64 native modules, 0 секретов в package, build ID `A-x7mMbc1h-vtjmDHUy6h`. Эти проверки не заменяют production E2E с контролируемым mailbox и свежим backup.

## Что осталось

1. Восстановить штатный доступ Timeweb и создать свежую проверенную копию production данных.
2. Проверить active release и переключить validated candidate с rollback path.
3. Выполнить реальные audit, brief и email E2E на production; подтверждение SMTP acceptance не выдавать за получение письма.
4. Указать правильный GitHub remote, push commit, создать tag/release и выполнить clean clone именно из GitHub.
