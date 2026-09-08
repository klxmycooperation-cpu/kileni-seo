import type { Locale } from "../config/site";
import type { RawServiceContent, ServiceVisual } from "./services";

type AdditionalService = { content: RawServiceContent; diagnosis: string[]; visual: ServiceVisual };

const ru: Record<string, AdditionalService> = {
  "content-materials": {
    content: {
      eyebrow: "Тексты и материалы", title: "Готовим материалы, которые отвечают на реальный вопрос", lead: "Сначала фиксируем задачу, факты и место материала в структуре сайта, затем пишем и редактируем.",
      problem: "Текст не помогает, если он дублирует другие страницы, не отвечает на вопрос читателя или содержит непроверенные обещания.",
      fit: ["Нужна новая страница услуги", "Нужно обновить старый материал", "Нужна серия статей", "Нужен редактор для материалов команды"],
      work: ["Согласуем задачу и читателя", "Собираем факты из материалов клиента", "Строим план и считаем объём", "Пишем, редактируем и проверяем ссылки", "Передаём текст, название и описание страницы"],
      deliverables: ["План материала", "Согласованный текст", "Название и описание страницы", "Список источников и вопросов на проверку"],
      duration: "Срок зависит от объёма, доступности фактов и скорости согласования; его фиксируем до старта.",
      exclusions: ["Интервью и экспертиза без согласования", "Публикация без доступа", "Дизайн и фотосъёмка вне брифа", "Обещание позиций или трафика"],
      outcomes: ["Материал решает одну задачу", "Факты отделены от предположений", "Структура готова к публикации", "Редактуру можно принять по списку правок"],
      packages: [
        { name: "Разбор", priceKey: "individual", description: "План и редакторские рекомендации для одной страницы.", limit: "1 страница", features: ["Задача", "Структура", "Список правок"] },
        { name: "Материал", priceKey: "content-article", description: "План, текст, название и описание страницы.", limit: "Один материал с одним раундом правок", features: ["План", "Текст", "Название и описание", "Проверка фактов"], featured: true },
        { name: "Серия", priceKey: "individual", description: "Общий план и пакет связанных материалов.", limit: "Объём после брифа", features: ["Карта тем", "Роль каждой страницы", "График", "Критерии приёмки"] },
      ],
      faq: [{ q: "Нужны ли ключевые слова?", a: "Нужен понятный вопрос и роль страницы. Формулировки встраиваем естественно." }, { q: "Кто проверяет факты?", a: "Мы сверяем текст с переданными материалами; экспертные утверждения подтверждает клиент." }, { q: "Можно ли только редактуру?", a: "Да. Объём и критерии приёмки согласуем до старта." }],
    },
    diagnosis: ["Связываем вопрос с конкретной страницей", "Сверяем факты и источники", "Убираем повторы и пустые абзацы", "Фиксируем понятный критерий приёмки"],
    visual: { kind: "card-stack", label: "Как готовим материал", summary: "Сначала определяем вопрос читателя, затем проверяем факты, составляем план и редактируем текст.", signals: [{ label: "вопрос", value: "ЗАДАЧА" }, { label: "факты", value: "ФАКТЫ" }, { label: "план", value: "ПЛАН" }, { label: "текст", value: "ТЕКСТ" }] },
  },
  "custom-task": {
    content: {
      eyebrow: "Другая задача", title: "Разберём нестандартную задачу до оценки", lead: "Не нужно знать название услуги. Опишите текущую ситуацию и желаемый результат.",
      problem: "Нестандартную задачу нельзя корректно оценить по одному абзацу: сначала нужны границы, данные, зависимости и критерий готовности.",
      fit: ["Нет подходящего типового варианта", "Нужно связать несколько систем или провести исследование", "Нужно сопоставить несколько направлений", "Нужно сначала проверить предположение"],
      work: ["Уточняем текущую ситуацию и нужный результат", "Отделяем цель от способа решения", "Описываем варианты и риски", "Предлагаем первый проверяемый этап", "Фиксируем смету до работы"],
      deliverables: ["Описание задачи", "Вариант решения", "Состав первого этапа", "Срок, цена и ограничения", "Критерий приёмки"],
      duration: "Срок появится в предложении после короткого брифа; без входных данных его не выдумываем.",
      exclusions: ["Работа до согласования сметы", "Покупка сервисов и лицензий", "Доступ к закрытым системам без согласования", "Гарантия бизнес-показателя"],
      outcomes: ["Понятный состав первого этапа", "Описанные зависимости", "Смета до старта", "Проверяемый результат"],
      packages: [
        { name: "Разбор задачи", priceKey: "individual", description: "Уточняем цель, данные и ограничения.", limit: "После брифа", features: ["Текущая ситуация", "Цель", "Риски", "Следующий шаг"] },
        { name: "Первый этап", priceKey: "individual", description: "Отдельный проверяемый этап без обязательства покупать весь проект.", limit: "Состав после брифа", features: ["Состав", "Срок", "Цена", "Приёмка"], featured: true },
        { name: "Проект", priceKey: "individual", description: "Несколько этапов с контрольными точками.", limit: "Оценка после первого этапа", features: ["Этапы", "Ограничения", "Контрольные точки", "Передача результата"] },
      ],
      faq: [{ q: "Можно не знать точное решение?", a: "Да. Опишите ситуацию и желаемый результат; вариант решения предложим после уточнения." }, { q: "Можно начать с малого?", a: "Да. Первый этап должен давать самостоятельный проверяемый результат." }, { q: "Когда появится цена?", a: "После короткого брифа и списка обязательных входных данных." }],
    },
    diagnosis: ["Фиксируем текущее состояние", "Отделяем обязательное от желательного", "Проверяем зависимости и риски", "Выделяем первый принимаемый результат"],
    visual: { kind: "build-system", label: "Как определяем первый этап", summary: "Уточняем текущую ситуацию и цель, после чего согласуем состав работ и способ приёмки.", signals: [{ label: "ситуация", value: "СЕЙЧАС" }, { label: "цель", value: "НУЖНО" }, { label: "работа", value: "ДЕЛАЕМ" }, { label: "проверка", value: "ГОТОВО" }] },
  },
};

const en: Record<string, AdditionalService> = {
  "content-materials": {
    ...ru["content-materials"],
    content: { ...ru["content-materials"].content, eyebrow: "Content and editorial", title: "Content built around a real reader question", lead: "We agree the task, evidence and place in the site structure before writing and editing.", problem: "Copy underperforms when it repeats another page, avoids the reader's question or makes claims no source can support.", fit: ["A new service page is required", "An old page needs a substantive update", "A connected article series is planned", "A team needs editorial support"], work: ["Agree the reader and page job", "Collect evidence from client materials", "Build an outline and confirm scope", "Write, edit and verify links", "Deliver copy and metadata"], deliverables: ["Content outline", "Approved copy", "Title and description", "Source and verification questions"], duration: "Timing depends on scope, evidence availability and review speed; it is confirmed before work starts.", exclusions: ["Unagreed interviews or subject expertise", "Publishing without access", "Design or photography outside the brief", "Ranking or traffic guarantees"], outcomes: ["One clear page job", "Facts separated from assumptions", "Publication-ready structure", "Editable acceptance checklist"], packages: [
      { name: "Editorial review", priceKey: "individual", description: "Outline and editing notes for one page.", limit: "1 page", features: ["Page job", "Structure", "Edit list"] },
      { name: "Content item", priceKey: "content-article", description: "Outline, copy and metadata.", limit: "One item with one revision round", features: ["Outline", "Copy", "Metadata", "Fact check"], featured: true },
      { name: "Series", priceKey: "individual", description: "A connected group of pages with one editorial plan.", limit: "Scope after the brief", features: ["Topic map", "Page roles", "Schedule", "Acceptance criteria"] },
    ], faq: [{ q: "Do you need a keyword list?", a: "We need the reader question and the page role. Search wording is used naturally, not repeated mechanically." }, { q: "Who verifies claims?", a: "We check against supplied materials; the client confirms subject-matter claims." }, { q: "Can we order editing only?", a: "Yes. Scope and acceptance criteria are agreed before work starts." }] },
    diagnosis: ["Connect the reader question to one page", "Verify facts and sources", "Remove repetition and empty copy", "Define an acceptance checklist"],
    visual: { kind: "card-stack", label: "How we prepare content", summary: "We define the reader’s question, verify the facts, build the outline and then edit the copy.", signals: [{ label: "Reader", value: "QUESTION" }, { label: "Sources", value: "VERIFIED" }, { label: "Structure", value: "OUTLINE" }, { label: "Delivery", value: "EDITED" }] },
  },
  "custom-task": {
    ...ru["custom-task"],
    content: { ...ru["custom-task"].content, eyebrow: "Other task", title: "Scope a non-standard task before estimating it", lead: "You do not need the service name. Describe the current situation and the outcome you need.", problem: "A non-standard task cannot be estimated honestly from one paragraph: scope, data, dependencies and an acceptance criterion come first.", fit: ["No standard option fits", "An integration or research phase is needed", "Several disciplines must be coordinated", "A hypothesis needs a bounded test"], work: ["Collect context", "Separate outcome from implementation", "Describe options and risks", "Propose the first verifiable stage", "Confirm the estimate before work"], deliverables: ["Task boundaries", "Recommended approach", "First-stage scope", "Timing, price and exclusions", "Acceptance criterion"], duration: "Timing is included in the proposal after the short brief; we do not invent it without inputs.", exclusions: ["Work before estimate approval", "Purchasing services or licences", "Unagreed access to private systems", "Guaranteed business metrics"], outcomes: ["Clear first-stage boundary", "Named dependencies", "Estimate before work", "Verifiable result"], packages: [
      { name: "Task review", priceKey: "individual", description: "Clarify the outcome, data and constraints.", limit: "After the brief", features: ["Context", "Outcome", "Risks", "Next step"] },
      { name: "First stage", priceKey: "individual", description: "A bounded stage with an independent result.", limit: "Scope after the brief", features: ["Scope", "Timing", "Price", "Acceptance"], featured: true },
      { name: "Project", priceKey: "individual", description: "Several stages with checkpoints.", limit: "Estimated after the first stage", features: ["Stages", "Limits", "Checkpoints", "Handover"] },
    ], faq: [{ q: "Can the exact solution be unknown?", a: "Yes. Describe the situation and desired result; we will propose an approach after clarifying the constraints." }, { q: "Can we start small?", a: "Yes. The first stage should produce an independent result you can verify." }, { q: "When is price confirmed?", a: "After the short brief and a list of required inputs." }] },
    diagnosis: ["Record the current state", "Separate mandatory and optional scope", "Review dependencies and risks", "Define the first acceptable result"],
    visual: { kind: "build-system", label: "How we define the first stage", summary: "We clarify the current situation and required outcome, then agree the first stage and its acceptance check.", signals: [{ label: "Situation", value: "RECORDED" }, { label: "Outcome", value: "AGREED" }, { label: "First stage", value: "SCOPED" }, { label: "Acceptance", value: "DEFINED" }] },
  },
};

export const additionalServices: Record<Locale, Record<string, AdditionalService>> = { ru, en };
