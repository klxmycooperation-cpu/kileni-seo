import { answerPricingQuestion } from "./site-assistant-pricing";
import { normalizeAssistantIntent } from "./site-assistant-requirements";
import { answerPlanQuestion, planChoiceAction, planActionInput, type AssistantPlan, type PlanSnapshot } from "./site-assistant-plan";
import type { OfferScopeContract } from "../config/offers";

export type ChatLink = { label: string; href: string };
export type ChatBillingUnit = "project" | "month" | "sku";
export type ChatAction = { id: string; label: string; value?: string };
export type AssistantOffer = { id: string; title: string; price: string; amount: number | null; priceType: "fixed" | "from" | "custom"; billingUnit: ChatBillingUnit; scope: string; duration: string; result: string; features: string[]; exclusions: string[]; href: string; contract?: OfferScopeContract; estimate?: string; fit?: { suitable: boolean; reasons: string[]; pending?: string[] } };
export type AssistantTopic = {
  id: string; title: string; href: string; description: string;
  faq?: { q: string; a: string }[];
  offers: AssistantOffer[];
};
export type AssistantSelection = { step?: string; offer?: string; budget?: number; budgetUnit?: ChatBillingUnit; pricingMode?: "compare" | "budget"; plan?: AssistantPlan; planHistory?: PlanSnapshot[] };
export type ChatReply = AssistantSelection & { text: string; links: ChatLink[]; topic?: string; suggestions?: string[]; actions?: ChatAction[]; comparisons?: AssistantOffer[]; explanation?: string; timingNotice?: string; summary?: { label: string; value: string; action?: string; actionId?: string }[] };
export type ChatPosition = { x: number; y: number };
export const CHAT_SIZE = 56;
export const CHAT_MARGIN = 12;
export const ASSISTANT_WELCOME = "Здравствуйте! Я ваш личный помощник KILENI. Помогу разобраться в услугах, сравнить тарифы и подобрать вариант под вашу задачу и бюджет. С чего начнём?";
const actionInputs: Record<string, string> = { "start-plan":"Подобрать услугу",compare:"Сравнить тарифы",budget:"Подобрать по бюджету",contacts:"Связаться с командой","main-menu":"Главное меню","cancel-plan":"Отменить подбор","continue-plan":"Продолжить подбор",back:"Назад","edit-service":"Изменить услугу","edit-task":"Изменить задачу","edit-scope":"Изменить объём","edit-requirements":"Изменить обязательные требования","edit-budget":"Изменить бюджет","edit-budget-unit":"Изменить расчёт бюджета","edit-timing":"Изменить срок","edit-offer":"Изменить тариф","prepare-summary":"Подготовить резюме",inclusions:"Что входит?",exclusions:"Что не входит?",preparation:"Что подготовить?","accept-stage":"Принять первый этап","decline-stage":"Вернуться к полному объёму" };
export function assistantActionFor(label:string):ChatAction {
  const entry=Object.entries(actionInputs).find(([,text])=>text.toLowerCase()===label.toLowerCase());
  return entry?{id:entry[0],label}:{id:"answer",label,value:label};
}
export function answerSiteAction(action:ChatAction,catalog:AssistantTopic[],previousTopic?:string,selection:AssistantSelection={},locale:"ru"|"en"="ru"):ChatReply {
  const scopedActions=["edit-task","edit-scope","edit-requirements","edit-budget-unit","edit-timing","edit-offer","prepare-summary","accept-stage","decline-stage"];
  if(!selection.plan && scopedActions.includes(action.id)) {
    if(action.id==="prepare-summary")return answerSiteQuestion("Подготовить резюме",catalog,previousTopic,{...selection,step:"plan-summary",plan:{topic:previousTopic}},locale);
    return {...selection,topic:previousTopic,text:"Сначала определим задачу. Ваш текущий выбор сохранён; можно подобрать услугу или посмотреть тарифы.",links:[],suggestions:["Подобрать услугу","Сравнить тарифы"]};
  }
  if(action.id==="ask-question")return {...selection,topic:previousTopic,text:"Напишите вопрос об услугах, составе работ, цене или порядке работы. Условия подбора сохранятся.",links:[]};
  if(action.id==="choose-offer") {
    const topic=catalog.find(item=>item.id===(selection.plan?.topic??previousTopic));
    const offer=topic?.offers.find(item=>item.id===action.value);
    if(!offer) return {...selection,topic:previousTopic,text:"Этот тариф больше не доступен для выбранной услуги. Условия задачи сохранены; можно посмотреть актуальное сравнение.",links:[],suggestions:["Сравнить тарифы","Продолжить подбор"]};
    return answerSiteQuestion(`Выбрать тариф: ${offer.title}`,catalog,topic!.id,selection,locale);
  }
  const dynamicId=action.id.startsWith("switch-task:")?"switch-task":action.id;
  const input=planActionInput(dynamicId,action.id.startsWith("switch-task:")?action.id.slice(12):action.value,selection)??actionInputs[action.id]??(action.id==="answer"?action.value:undefined);
  if(!input) return {...selection,topic:previousTopic,text:"Это действие сейчас недоступно. Выбор сохранён; продолжите подбор или откройте главное меню.",links:[],suggestions:["Продолжить подбор","Главное меню"]};
  return answerSiteQuestion(input,catalog,previousTopic,selection,locale);
}

export function clampChatPosition(position: ChatPosition, viewport: { width: number; height: number }): ChatPosition {
  const maxX = Math.max(CHAT_MARGIN, viewport.width - CHAT_SIZE - CHAT_MARGIN);
  const maxY = Math.max(CHAT_MARGIN, viewport.height - CHAT_SIZE - CHAT_MARGIN);
  return {
    x: Math.max(CHAT_MARGIN, Math.min(maxX, Number.isFinite(position.x) ? position.x : maxX)),
    y: Math.max(CHAT_MARGIN, Math.min(maxY, Number.isFinite(position.y) ? position.y : maxY)),
  };
}

export function chatPanelLayout(position: ChatPosition, viewport: { width: number; height: number }) {
  let width = Math.min(400, viewport.width - 24);
  const preferredHeight = Math.min(720, viewport.height - 24);
  const above = position.y - 24;
  const below = viewport.height - position.y - CHAT_SIZE - 24;
  let left = Math.max(12, Math.min(viewport.width - width - 12, position.x + CHAT_SIZE - width));
  let height = preferredHeight;
  let top: number;
  if (above >= preferredHeight) top = position.y - height - 12;
  else if (below >= preferredHeight) top = position.y + CHAT_SIZE + 12;
  else if (viewport.width > 640) {
    // On a wide screen the phone can sit beside the circle without covering it.
    const rightSpace = viewport.width - position.x - CHAT_SIZE - 24;
    const leftSpace = position.x - 24;
    width = Math.min(width, Math.max(rightSpace, leftSpace));
    left = rightSpace >= leftSpace ? position.x + CHAT_SIZE + 12 : position.x - width - 12;
    left = Math.max(12, Math.min(viewport.width - width - 12, left));
    top = Math.max(12, Math.min(viewport.height - height - 12, position.y - height / 2));
  } else if (above >= below) { height = Math.max(0, above); top = 12; }
  else { height = Math.max(0, below); top = position.y + CHAT_SIZE + 12; }
  return { left, top, width, height };
}

const matchers: [string, RegExp][] = [
  ["wildberries", /wildber|вайлд|(?:^|[\s,.!?])вб(?:$|[\s,.!?])|wb\b/u],
  ["ozon", /ozon|озон/u],
  ["yandex-market", /яндекс\s*маркет|yandex\s*market/u],
  ["marketplaces", /маркетплейс|карточ|артикул/u],
  ["yandex-ads", /реклам|директ|direct/u],
  ["web-development", /разработ|созда.{0,15}сайт|сдела.{0,15}сайт|новый сайт|нужен сайт|хочу сайт|заказать сайт|сайт с нуля|сайт компани|каталог товар|лендинг|интернет.магазин/u],
  ["marketplaces", /товар/u],
  ["seo-audit", /аудит|проверк|проверить|никто не видит|не виден|не видно|не наход|не индекс|ошибк|медленно|скорост/u],
  ["seo-promotion", /продвиж|seo|сео|позици|поиск|трафик/u],
  ["content-materials", /текст|контент|стать[яию]|материал/u],
  ["custom-task", /другая задач|нестандарт|консультац|доработ/u],
];

export function answerSiteQuestion(question: string, catalog: AssistantTopic[], previousTopic?: string, selection: AssistantSelection = {}, locale:"ru"|"en"="ru"): ChatReply {
  const reply = buildSiteAnswer(question, catalog, previousTopic, selection);
  const suggestions = [...(reply.suggestions ?? [])];
  if (reply.step) {
    if (reply.step.startsWith("pricing-") && reply.step !== "pricing-topic" && !suggestions.some((item) => /другую услугу/u.test(item))) suggestions.push("Выбрать другую услугу");
    suggestions.push("Отменить подбор");
  }
  const unique=[...new Set(suggestions)].filter((suggestion) => suggestion.toLocaleLowerCase("ru") !== question.trim().toLocaleLowerCase("ru"));
  void locale;
  return { ...reply, suggestions: unique, actions: unique.map(label=>planChoiceAction(label,reply)??assistantActionFor(label)) };
}

function buildSiteAnswer(question: string, catalog: AssistantTopic[], previousTopic?: string, selection: AssistantSelection = {}): ChatReply {
  const q = normalizeAssistantIntent(question);
  if (/^(отменить подбор|отмена|главное меню)$/u.test(q)) return {...selection,step:"assistant-menu",plan:selection.plan?{...selection.plan,resumeStep:selection.step?.startsWith("plan-")?selection.step:selection.plan.resumeStep,paused:q!=="главное меню"}:undefined,topic:previousTopic,text:q==="главное меню"?"Выберите следующее действие. Условия задачи сохранены.":"Активный подбор остановлен. Переписка и условия сохранены; к ним можно вернуться.",links:[],suggestions:[...(selection.plan?["Продолжить подбор"]:[]),"Подобрать услугу","Сравнить тарифы","Подобрать по бюджету","Связаться с командой"]};
  const planReply = answerPlanQuestion(q, catalog, selection, question.trim(), previousTopic);
  if (planReply) return planReply;
  if (selection.plan && (selection.step?.startsWith("plan-") || selection.step==="assistant-menu")) {
    // Answer a side question while preserving the task and the current step.
    const answer = buildSiteAnswer(question, catalog, previousTopic, { offer: selection.plan.offer??selection.plan.preferredOffer??selection.offer });
    return {
      ...answer, topic: previousTopic, step: selection.step, plan: selection.plan,
      planHistory: selection.planHistory, offer: selection.offer, budget: selection.budget,
      budgetUnit: selection.budgetUnit, pricingMode: selection.pricingMode,
      suggestions: ["Продолжить подбор", ...(answer.suggestions ?? [])],
    };
  }
  if (/связа|человек|сотрудник|позвон|контакт|телефон|менеджер|оператор/u.test(q)) {
    return { ...selection, topic: previousTopic, text: "Обсудить задачу с командой можно по телефону или в MAX. Контакты находятся под полем сообщения. В брифе можно описать проект и оставить удобный способ связи.", links: [{ label: "Заполнить короткий бриф", href: "/brief" }, { label: "Все контакты", href: "/contacts" }] };
  }
  if (/оплат|договор|начина.{0,8}работ|порядок работы|как проходит работа|как происходит работа|как начать|с чего начать/u.test(q)) {
    return { ...selection, topic: previousTopic, text: "Сначала знакомимся с задачей через короткий бриф, затем согласуем состав, сроки и стоимость. Работу начинаем после согласования. Условия оплаты и договора уточняются для вашего проекта; помощник не оформляет заказ.", links: [{ label: "Обсудить условия в брифе", href: "/brief" }, { label: "Как мы работаем", href: "/about" }] };
  }
  if (/^(привет|здравствуй(?:те)?|добрый (?:день|вечер)|доброе утро|спасибо(?: большое)?|благодарю)[!.,\s]*$/u.test(q)) return { ...selection, topic: previousTopic, text: /спасибо|благодар/u.test(q) ? "Пожалуйста! Если появятся вопросы об услугах, стоимости или сроках, пишите." : ASSISTANT_WELCOME, links: [], suggestions: selection.step?.startsWith("pricing-") ? ["Продолжить подбор", "Отменить подбор"] : ["Подбери мне услугу", "Сравнить тарифы", "Подобрать по бюджету"] };
  const price = /цен|стоим|стоит|сколько|бюджет|тариф/u.test(q);
  const duration = /срок|долго|дней|время|когда/u.test(q);
  const scope = /вход|получу|результат|состав/u.test(q);
  const matched = matchers.find(([, pattern]) => pattern.test(q))?.[0];
  const topic = catalog.find((item) => item.id === (matched ?? ((price || duration || scope) ? previousTopic : undefined)));

  const preparationQuestion = /что.{0,15}подготов|какие.{0,15}материал|нужны.{0,15}материал/u.test(q);
  const choosingPriceOffer = q.startsWith("выбрать тариф: ");
  const pricingPlatformContext = selection.step?.startsWith("pricing-") && matched === "marketplaces" && ["wildberries", "ozon", "yandex-market"].includes(previousTopic ?? "");
  const contextualTopic = catalog.find((item) => item.id === (selection.step === "pricing-topic" ? matched : (((preparationQuestion || choosingPriceOffer || pricingPlatformContext) && previousTopic) || (selection.step === "marketplace-scope" && !["wildberries", "ozon", "yandex-market"].includes(matched ?? "")) ? previousTopic : matched ?? previousTopic)));
  if (previousTopic && matched && contextualTopic?.id !== previousTopic && selection.step !== "goal" && selection.step !== "pricing-topic" && selection.step !== "pricing-platform" && !choosingPriceOffer && !preparationQuestion && !pricingPlatformContext) {
    // Budgets, billing units and chosen offers belong to the previous service.
    selection = selection.pricingMode ? { pricingMode: selection.pricingMode, step: selection.step?.startsWith("pricing-") ? "pricing-amount" : undefined } : {};
  }
  const pricingReply = answerPricingQuestion(q, catalog, contextualTopic, selection, Boolean(matched));
  if (pricingReply) return pricingReply;
  const knowledge = answerKnowledge(q, catalog, contextualTopic);
  if (knowledge) return { ...(knowledge.topic && knowledge.topic !== previousTopic ? {} : selection), topic: contextualTopic?.id, ...knowledge };
  const chosen = contextualTopic?.offers.find((offer) => offer.id === selection.offer);
  if (chosen && !matched && (price || duration || scope || /не вход|исключ|отдельно/u.test(q))) {
    return { topic: contextualTopic!.id, offer: chosen.id, text: `${chosen.title} — ${chosen.price}.\n\n${duration ? `Срок: ${chosen.duration}.` : /не вход|исключ|отдельно/u.test(q) ? `Отдельно от этого варианта:\n${chosen.exclusions.join("\n")}` : `В состав входят:\n${chosen.features.join("\n")}\n\nРезультат: ${chosen.result}`}`, links: [{ label: "Обсудить выбранный вариант", href: chosen.href }], suggestions: ["Что входит?", "Что не входит?", "Какие сроки?", "Что подготовить?", "Подобрать другую услугу"] };
  }

  if (topic) {
    const offers = topic.offers;
    const details = offers.map((offer) => duration
      ? `${offer.title} — ${offer.duration}.`
      : scope ? `${offer.title}: ${offer.result}` : `${offer.title} — ${offer.price}.`).join("\n");
    return {
      topic: topic.id,
      text: `${duration ? "В каталоге указаны такие сроки:" : scope ? "Что вы получите по каждому варианту:" : topic.description}${details ? `\n\n${details}` : ""}${duration ? "\n\nСрок для вашего проекта подтвердим после знакомства с задачей." : ""}`,
      links: [{ label: "Посмотреть состав и варианты", href: `${topic.href}${offers.length ? (topic.href.startsWith("/marketplaces/") ? "#marketplace-offers" : "#variants") : ""}` }, ...(offers.length === 1 ? [{ label: "Обсудить этот вариант", href: offers[0].href }] : [{ label: "Описать задачу в брифе", href: "/brief" }])],
      suggestions: ["Помоги выбрать вариант", "Сравнить тарифы", "Подобрать по бюджету", "Что подготовить?"],
    };
  }
  if (price || /услуг|что уме|чем пом|чем вы|занима|выбрать|с чего нач|помогите|не знаю/u.test(q)) {
    return { text: "Поможем проверить и продвигать сайт, создать новый, подготовить карточки товаров, настроить рекламу или написать материалы. Расскажите, что хотите улучшить — например, «Сайт не находят в поиске» или «Сколько стоит карточка для Ozon?».", links: [{ label: "Все услуги и цены", href: "/pricing" }, { label: "У меня другая задача", href: "/custom-task" }] };
  }
  return { text: "Я помощник по услугам KILENI: могу подсказать варианты, цены, сроки и порядок работы. Пока не понял, какая помощь вам нужна. Речь о проверке сайта, продвижении, разработке, рекламе или карточках товаров? Выберите направление или опишите задачу подробнее.", links: [{ label: "Связаться с командой", href: "/contacts" }], suggestions: ["Подобрать услугу и тариф", "SEO-аудит", "SEO-продвижение", "Разработка сайта", "Карточки для маркетплейсов", "Яндекс Директ"] };
}

const faqRules: [string, number, RegExp][] = [
  ["seo-audit", 0, /бесплат|экспресс.{0,15}полн|проверка.{0,15}аудит/u],
  ["seo-audit", 1, /только исправ|готовый аудит|есть аудит|чужой аудит/u],
  ["seo-audit", 2, /почему.{0,25}(страниц|цен)|количеств.{0,15}страниц/u],
  ["seo-promotion", 0, /когда.{0,25}(результат|трафик|позици)|срок.{0,15}результат/u],
  ["seo-promotion", 1, /нужна ли.{0,15}реклам|seo.{0,15}реклам|сео.{0,15}реклам/u],
  ["seo-promotion", 2, /кто.{0,15}(пишет|публику)/u],
  ["marketplaces", 0, /публику|сами.{0,12}меня|автомат.{0,15}карточ/u],
  ["marketplaces", 1, /только.{0,15}(визуал|картин|изображ|инфограф)/u],
  ["marketplaces", 2, /гарант|позиц/u],
  ["web-development", 0, /технолог|cms|вордпресс|wordpress|битрикс/u],
  ["web-development", 1, /прототип/u],
  ["web-development", 2, /(seo|сео).{0,20}(вход|включ)|вход.{0,20}(seo|сео)/u],
  ["yandex-ads", 0, /рекламн.{0,8}бюджет|бюджет.{0,15}вход/u],
  ["yandex-ads", 2, /аудит.{0,15}реклам|провер.{0,15}кампан/u],
  ["content-materials", 0, /ключев.{0,10}слов/u],
  ["content-materials", 1, /провер.{0,10}факт|кто.{0,10}факт/u],
  ["content-materials", 2, /редактур/u],
  ["custom-task", 0, /не знаю.{0,20}решен/u],
  ["custom-task", 1, /начать с мал|небольш.{0,10}этап/u],
];

function answerKnowledge(q: string, catalog: AssistantTopic[], topic?: AssistantTopic): ChatReply | undefined {
  const links = [{ label: "Заполнить короткий бриф", href: "/brief" }];
  if (/бриф/u.test(q)) return { text: "Бриф — короткая анкета о проекте. Вы указываете, чем занимается бизнес, что хотите улучшить, желаемые сроки и бюджет. По ответам команда уточнит состав работ и стоимость. Если точного решения пока нет, так и напишите. Заполнение брифа не запускает работу автоматически.", links, suggestions: ["Что подготовить?", "Как начинается работа?"] };
  if (/доступ|парол|логин/u.test(q)) return { text: "Для первоначального знакомства достаточно ссылки на сайт или карточки и описания задачи. Доступы к аналитике, поисковым кабинетам и системе управления согласуем, если они нужны для выбранной работы. Пароли в этот чат присылать не нужно: способ передачи доступов обсудите с командой.", links, topic: topic?.id };
  if (/что.{0,15}подготов|какие.{0,15}материал|нужны.{0,15}материал|что.{0,15}прислать/u.test(q)) return { text: topic?.id === "web-development" ? "Подготовьте описание бизнеса, нужные разделы и функции, примеры сайтов, которые нравятся. Укажите, есть ли логотип, тексты и фотографии и когда нужен запуск. Если материалов пока нет, отметьте это в брифе — состав работ уточним вместе." : ["wildberries", "ozon", "yandex-market", "marketplaces"].includes(topic?.id ?? "") ? "Пришлите название площадки, ссылки или артикулы, количество карточек и описание нужных изменений. Для оформления пригодятся фотографии, характеристики и подтверждённые факты о товаре. Укажите, нужны ли публикация и дальнейшие обновления." : "Подготовьте ссылку на сайт, описание проблемы и желаемого результата. Укажите важные услуги, регионы, сроки и бюджет, если уже определились. Полезно приложить сведения о прошлых работах и недавних изменениях. Если чего-то нет, это можно уточнить после брифа.", links, topic: topic?.id };
  if (/чем.{0,20}(аудит|продвиж)|аудит.{0,20}(или|отлич).{0,15}продвиж/u.test(q)) return { text: "Аудит показывает, что мешает сайту: вы получаете проверку, примеры проблем и порядок исправлений. Продвижение — регулярная работа с запросами, страницами и материалами с отчётом об изменениях. Если причина слабой видимости неизвестна, разумно сначала разобраться в состоянии сайта.", links: [{ label: "Сравнить варианты аудита", href: "/seo-audit#variants" }, { label: "Посмотреть продвижение", href: "/seo-promotion#variants" }], suggestions: ["Подбери мне услугу"] };
  const exact = catalog.flatMap((item) => (item.faq ?? []).map((faq) => ({ item, faq }))).find(({ faq }) => faq.q.toLowerCase().replace(/ё/gu, "е").replace(/[?!.,]/gu, "").trim() === q.replace(/[?!.,]/gu, "").trim());
  const rule = faqRules.find(([id, , pattern]) => pattern.test(q) && !(id === "seo-promotion" && ["marketplaces", "wildberries", "ozon", "yandex-market"].includes(topic?.id ?? "")) && (id !== "marketplaces" || !topic || ["marketplaces", "wildberries", "ozon", "yandex-market"].includes(topic.id)));
  const source = exact?.item ?? catalog.find((item) => item.id === rule?.[0]) ?? (rule?.[0] === "marketplaces" ? catalog.find((item) => item.id === "ozon") : undefined);
  const faq = exact?.faq ?? (rule ? source?.faq?.[rule[1]] : undefined);
  if (faq && source) return { topic: ["marketplaces", "wildberries", "ozon", "yandex-market"].includes(topic?.id ?? "") && ["ozon", "marketplaces"].includes(source.id) ? topic?.id : source.id, text: faq.a, links: [{ label: "Подробнее об услуге", href: ["wildberries", "ozon", "yandex-market"].includes(topic?.id ?? "") && ["ozon", "marketplaces"].includes(source.id) ? topic!.href : source.href }], suggestions: ["Помоги выбрать вариант", "Что подготовить?"] };
  if (/гарант|топ.?1|перв.{0,10}мест/u.test(q)) return { text: "В условиях услуг нет гарантии определённых позиций или числа заявок. Результат зависит от рынка и факторов, которые меняются. Перед началом согласуем конкретный состав работ и способ проверки результата. Условия для вашего проекта можно обсудить с командой.", links, topic: topic?.id };
}

