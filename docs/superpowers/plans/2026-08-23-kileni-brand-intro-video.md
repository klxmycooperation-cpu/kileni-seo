# KILENI Brand Intro Video Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Создать отдельный рекламный MP4-ролик KILENI с утверждённым сюжетом `KILENI → E → SEO → слоган`, не подключая его к сайту.

**Architecture:** Детерминированная SVG-сцена получает точное время через `window.renderAt(ms)`, поэтому каждый кадр можно воспроизвести и проверить без зависимости от скорости браузера. Playwright сохраняет 210 кадров 1920×1080, генератор создаёт оригинальную стереодорожку 48 кГц, затем FFmpeg собирает семисекундный H.264/AAC MP4.

**Tech Stack:** HTML, SVG, JavaScript, Node.js PCM synthesis, Playwright, FFmpeg.

---

### Task 1: Детерминированная motion-сцена

**Files:**
- Create: `output/kileni-intro-preview/index.html`

- [x] **Step 1: Создать полноэкранную SVG-сцену**

  Добавить светлый фон, маску оптической плоскости, группы `KIL`, `E`, `NI`, `S`, `O`, две строки слогана и тонкий фирменный акцент. Не добавлять header, hero, cookies или другие элементы сайта.

- [x] **Step 2: Реализовать временную шкалу**

  Экспортировать `window.renderAt(ms)` для диапазона `0..7000`. Функция должна задавать opacity/transform каждой группе по утверждённым интервалам, сохраняя координаты `E` неизменными.

- [x] **Step 3: Проверить крайние состояния**

  В `0 ms` сцена чистая, в `900 ms` читается `KILENI`, в `2600 ms` видна только `E`, в `4500 ms` собрано `SEO`, в `5200 ms` виден полный слоган и разделительная линия, в `7000 ms` кадр уходит в чистый фон.

### Task 2: Рендер кадров и видео

**Files:**
- Create: `output/kileni-intro-preview/render.mjs`
- Generate: `output/kileni-intro-preview/frames/frame-*.jpg`
- Generate: `output/kileni-intro-preview/KILENI-intro-v5.mp4`

- [x] **Step 1: Создать покадровый рендер**

  Запустить локальный статический сервер, открыть сцену в Chromium с viewport 1920×1080 и вызвать `renderAt(frameIndex / 30 * 1000)` для 180 кадров.

- [x] **Step 2: Собрать MP4**

  Выполнить:

  ```bash
  ffmpeg -framerate 30 -i frames/frame-%04d.jpg -c:v libx264 -pix_fmt yuv420p -movflags +faststart KILENI-intro-v5.mp4
  ```

  Ожидается MP4 1920×1080, 30 fps, около 7 секунд.

### Task 3: Визуальная и техническая проверка

**Files:**
- Generate: `output/kileni-intro-preview/checkpoints/*.png`

- [x] **Step 1: Сохранить ключевые кадры**

  Сохранить `KILENI`, начало падения, `E`, `SE`, выкатывание `O`, `SEO`, `SEO + слоган`, финальный выход.

- [x] **Step 2: Проверить композицию**

  Убедиться, что буквы не пересекаются, `E` не прыгает, `O` вращается по траектории, слоган читается, а шапка и cookies отсутствуют.

- [x] **Step 3: Проверить видеофайл**

  Выполнить:

  ```bash
  ffprobe -v error -show_entries stream=width,height,r_frame_rate -show_entries format=duration -of json output/kileni-intro-preview/KILENI-intro-v5.mp4
  ```

  Ожидается `1920×1080`, `30/1`, длительность около `7.0` секунд.

- [x] **Step 4: Передать пользователю файл**

  Отправить абсолютную кликабельную ссылку на MP4. Интеграцию с сайтом выполнять только после отдельного утверждения ролика.

### Task 4: Светлый premium UI sound design

**Files:**
- Modify: `output/kileni-intro-preview/soundtrack.mjs`
- Modify: `output/kileni-intro-preview/render.mjs`
- Generate: `output/kileni-intro-preview/KILENI-intro-v8.mp4`

- [x] **Step 1: Пересобрать набор микроэффектов**

  Реализовать отдельные короткие генераторы для tactile click, glass ping, magnetic snap, airy swish, shimmer, synthetic pluck и muted impact. Не использовать постоянный музыкальный pad, протяжный sub-bass или минорную гармонию.

- [x] **Step 2: Привязать эффекты к сцене**

  Синхронизировать звуки с появлением `KILENI`, разделением, падениями `KIL`/`NI`, входом `S`, четырьмя фазами качения `O`, столкновением, затухающей реакцией `SEO`, линией и двумя строками слогана.

- [x] **Step 3: Собрать v8**

  Сгенерировать WAV 48 кГц stereo, соединить его с проверенной видеодорожкой и сохранить `KILENI-intro-v8.mp4` с AAC 192 кбит/с.

- [x] **Step 4: Проверить результат**

  Проверить через FFprobe наличие H.264 1920×1080 30 fps и AAC stereo 48 кГц, длительность 7 секунд. Через `volumedetect` подтвердить отсутствие клиппинга; через автоматический отчёт подтвердить чистую консоль, точный центр `960 px`, корректное столкновение и отсутствие элементов сайта.

## Ограничение по git

Коммиты не создаются: действующая инструкция проекта запрещает `git commit` без прямого разрешения пользователя.
