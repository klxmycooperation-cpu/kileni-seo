import type { AssistantOffer, AssistantSelection, AssistantTopic, ChatBillingUnit, ChatReply } from "./site-assistant";
import { normalizeAssistantNumbers } from "./site-assistant-requirements";

const money = (amount: number) => `${new Intl.NumberFormat("ru-RU").format(amount)} ₽`;
const unitLabel: Record<ChatBillingUnit, string> = { project: "на проект", month: "в месяц", sku: "на один артикул" };
const serviceChoices = ["SEO-аудит", "SEO-продвижение", "Разработка сайта", "Карточки для маркетплейсов", "Яндекс Директ", "Тексты для сайта", "Нестандартная задача"];
export function readAssistantBudgetBounds(raw:string):{raw:string;lower:number;upper?:number;kind:"range"|"minimum"}|undefined {
 const q=normalizeAssistantNumbers(raw).replace(/[\u00a0\u202f]/gu," ");
 if(/[$€£]|доллар|евро|usd|eur|процент|%|страниц|товар|телефон/u.test(q))return undefined;
 const range=q.match(/(\d+(?:[,.]\d+)?)\s*(тыс(?:яч[аиу]?)?|[кk])?\s*[-–—]\s*(\d+(?:[,.]\d+)?)\s*(тыс(?:яч[аиу]?)?|[кk])?/u);
 if(range){const scale=(s?:string)=>s?1000:1;const lower=Number(range[1].replace(",","."))*scale(range[2]??range[4]);const upper=Number(range[3].replace(",","."))*scale(range[4]??range[2]);if(lower>=0&&upper>=lower&&upper<=1e9)return {raw,lower,upper,kind:"range"};return undefined;}
 const minimum=q.match(/(?:^|\s)от\s+(\d+(?:[,.]\d+)?)\s*(тыс(?:яч[аиу]?)?|[кk])?/u);
 if(minimum){const lower=Number(minimum[1].replace(",","."))*(minimum[2]?1000:1);if(lower>=0&&lower<=1e9)return {raw,lower,kind:"minimum"};}
}

function chooseService(mode: "compare" | "budget", budget?: number, budgetUnit?: ChatBillingUnit): ChatReply {
  return { pricingMode: mode, budget, budgetUnit, step: "pricing-topic", text: mode === "compare" ? "Сначала выберите тип услуги. Затем покажу её тарифы: стоимость, состав работ, сроки и ограничения." : "Сначала выберите тип услуги. Затем уточним бюджет и подберём подходящие варианты.", links: [], suggestions: [...serviceChoices, "Отменить подбор"] };
}

// Parse a monetary amount, not unrelated page counts, dates or telephone numbers.
export function parseAssistantBudget(question: string): number | undefined {
  const q = normalizeAssistantNumbers(question).replace(/\u00a0|\u202f/gu, " ").replace(/бюджет (?:проекта|теперь|на нашу работу|на вашу работу)/u,"бюджет");
  if(/[$€£]|доллар|евро|usd|eur|процент|%|телефон|\d{1,2}[./]\d{1,2}[./]\d{2,4}/u.test(q))return undefined;
  if (budgetUnits(q).length > 1) return undefined;
  if ((q.match(/\d[\d ,.]*\s*(?:тыс(?:яч[аиу]?)?\.?|[кk](?=\s|$)|₽|руб(?:лей|ля|ль)?\.?)/gu) ?? []).length > 1 || /\d.+(?:или|либо|до|и)\s+\d/u.test(q)) return undefined;
  if (/(?:^|[\s:=])[-−–—]\s*\d|\d\s*(?:тыс\.?|[кk])?\s*[-–—]\s*\d/u.test(q)) return undefined;
  const match = q.match(/(?<![\d.,])(?:бюджет\s*(?:до|не более|составляет|у меня|на проект|в месяц)?\s*[:=]?\s*|до\s+|не более\s+)?(\d{1,3}(?: \d{3})+|\d+)(?:[,.](\d{1,2}))?\s*(тыс(?:яч[аиу]?)?\.?|к(?=\s|$)|k(?=\s|$)|₽|руб(?:лей|ля|ль)?\.?)/u)
    ?? q.match(/(?:бюджет\s*(?:до|составляет)?\s*[:=]?\s*|^)(\d{1,3}(?: \d{3})+|\d+)(?:[,.](\d{1,2}))?\s*$/u);
  if (!match || /от\s+\d|\d\s*[-–—]\s*\d/u.test(q)) return undefined;
  const amount = Number(`${match[1].replace(/ /gu, "")}.${match[2] ?? "0"}`) * (/тыс|^[кk]$/u.test(match[3] ?? "") ? 1000 : 1);
  return Number.isFinite(amount) && amount >= 0 && amount <= 1_000_000_000 ? amount : undefined;
}

function budgetUnits(q: string): ChatBillingUnit[] {
  const units: ChatBillingUnit[] = [];
  if (/в месяц|на месяц|\/\s*мес|ежемесяч|месячн/u.test(q)) units.push("month");
  if (/(?:на|за) (?:(?:один|1|каждый) )?артикул|(?:на|за) (?:(?:одну|1|каждую) )?карточку/u.test(q)) units.push("sku");
  if (/на проект|за проект|разов|запуск|на все карточки|за все карточки|на все артикулы|общий бюджет/u.test(q)) units.push("project");
  return units;
}

export function assistantBudgetUnit(q: string): ChatBillingUnit | undefined {
  const units = budgetUnits(q);
  return units.length === 1 ? units[0] : undefined;
}

function variantsLink(topic: AssistantTopic) {
  return `${topic.href}${topic.href.startsWith("/marketplaces/") ? "#marketplace-offers" : "#variants"}`;
}

function compareReply(topic: AssistantTopic, offers: AssistantOffer[], selection: AssistantSelection, intro: string): ChatReply {
  const minimumOnly = offers.some((offer) => offer.priceType === "from");
  const unknown = offers.some((offer) => offer.amount === null || offer.priceType === "custom");
  const free = offers.some((offer) => offer.amount === 0);
  return {
    topic: topic.id, ...selection, step: undefined, offer: undefined, comparisons: offers,
    text: `${intro}${minimumOnly ? "\n\nЦены «от» — начальная стоимость. Окончательная сумма зависит от задачи." : ""}${unknown ? "\n\nИндивидуальную стоимость подтвердим после брифа." : ""}${free ? "\n\nБесплатная проверка охватывает до 10 открытых страниц и не заменяет полный аудит." : ""}${topic.id === "yandex-ads" ? "\n\nРекламный бюджет Яндекса оплачивается отдельно от настройки и ведения." : ""}`,
    links: [{ label: "Все варианты на странице услуги", href: variantsLink(topic) }],
    suggestions: [selection.pricingMode === "budget" ? "Сравнить тарифы" : "Подобрать по бюджету", "Изменить бюджет", "Подобрать другую услугу"],
  };
}

export function answerPricingQuestion(q: string, catalog: AssistantTopic[], topic: AssistantTopic | undefined, selection: AssistantSelection, explicitTopic = false): ChatReply | undefined {
  const comparing = /сравн|отлич.{0,15}тариф|разниц.{0,15}тариф/u.test(q);
  const budgeting = /по бюджету|подб[ео]р.{0,20}бюджет|изменить бюджет|мой бюджет|бюджет\s*(?:до|[:=])?\s*\d/u.test(q);
  const pending = selection.step?.startsWith("pricing-") === true;
  const amount = parseAssistantBudget(q);
  const invalidAmount = amount === undefined && (/бюджет[^\d]{0,15}[-−]?\d/u.test(q) || (pending && /\d/u.test(q)));
  const monetary = amount !== undefined && /₽|руб|тыс|бюджет|\d\s*[кk](?:\s|$)/u.test(q);
  if (/другую услуг|изменить услуг|сменить услуг|выбрать другую услуг/u.test(q) && selection.pricingMode) return chooseService(selection.pricingMode);
  if ((comparing || (budgeting && !monetary && !invalidAmount)) && !topic && !explicitTopic && !/изменить бюджет/u.test(q)) return chooseService(comparing ? "compare" : "budget", amount, assistantBudgetUnit(q));
  const selected = q.startsWith("выбрать тариф: ") ? topic?.offers.find((offer) => `выбрать тариф: ${offer.title.toLowerCase()}` === q) : undefined;
  if (q.startsWith("выбрать тариф: ") && !selected) return { topic: topic?.id, text: "Этот тариф не найден в текущем каталоге. Выберите услугу и сравните доступные варианты заново.", links: [], suggestions: ["Сравнить тарифы", "Подобрать по бюджету"] };
  if (selected && selection.pricingMode) return {
    topic: topic!.id, offer: selected.id, text: `Вы выбрали: ${selected.title}.\nСтоимость: ${selected.price}.\nОбъём: ${selected.scope}.\nСрок: ${selected.duration}.\n\nРезультат: ${selected.result}${selected.priceType === "from" ? "\n\nОкончательную сумму подтвердим после уточнения задачи." : ""}`,
    links: [{ label: "Обсудить выбранный тариф в брифе", href: selected.href }], suggestions: ["Что входит?", "Что не входит?", "Сравнить тарифы", "Подобрать по бюджету"],
  };
  if (!comparing && !budgeting && !monetary && !pending && !invalidAmount) return undefined;
  if (invalidAmount && !comparing) return { topic: topic?.id, pricingMode: "budget", step: "pricing-amount", budgetUnit: selection.budgetUnit, text: "Напишите одну сумму в рублях. Диапазон или отрицательная сумма не подходят для сравнения. Если бюджет ещё не определён, можно сначала сравнить тарифы.", links: [], suggestions: ["Сравнить тарифы", "Подобрать под мою задачу"] };
  // Common questions about a service do not cancel an unfinished budget selection.
  if (pending && !comparing && !budgeting && !monetary && /бриф|подготов|доступ|парол|гарант|срок|контакт|входит|включен/u.test(q)) return undefined;
  let mode = comparing ? "compare" as const : budgeting || monetary ? "budget" as const : selection.pricingMode ?? "budget";
  let budget = amount ?? selection.budget;
  if (/изменить бюджет/u.test(q)) { mode = "budget"; budget = undefined; }
  let budgetUnit = assistantBudgetUnit(q) ?? selection.budgetUnit;
  const context = { pricingMode: mode, budget, budgetUnit };
  if (!topic) return chooseService(mode, budget, budgetUnit);
  if (topic.id === "marketplaces") return { ...context, topic: topic.id, step: "pricing-platform", text: "Выберите площадку, для которой нужно сравнить карточки.", links: [], suggestions: ["Wildberries", "Ozon", "Яндекс Маркет"] };
  if (mode === "compare") return compareReply(topic, topic.offers, { pricingMode: "compare" }, `Варианты услуги «${topic.title}». Сравните цену, объём, сроки и ограничения.`);
  const units = [...new Set(topic.offers.filter((offer) => offer.amount !== null && offer.priceType !== "custom").map((offer) => offer.billingUnit))];
  if (!units.length) return { topic: topic.id, text: "Для этой задачи цена определяется после брифа. Назовите бюджет и желаемый результат команде — она предложит состав первого этапа. Помощник не может подтвердить стоимость заранее.", links: [{ label: "Обсудить задачу и бюджет", href: "/brief" }], comparisons: topic.offers, suggestions: ["Подобрать другую услугу"] };
  if (budget === undefined) return {
    topic: topic.id, ...context, budget: undefined, step: "pricing-amount", text: `Какой бюджет планируете${units.length === 1 ? ` ${unitLabel[units[0]]}` : " на работу KILENI"}? Напишите сумму в рублях или сначала сравните стоимость и состав тарифов.${topic.id === "yandex-ads" ? " Расходы на рекламу Яндекса считаются отдельно." : ""}`,
    links: [], suggestions: ["Сравнить тарифы", "Подобрать под мою задачу"],
  };
  if (selection.step === "pricing-unit" && q === "это бюджет на один артикул") budgetUnit = "sku";
  if (selection.step === "pricing-unit" && q === "укажу бюджет на один артикул") return { topic: topic.id, pricingMode: "budget", budgetUnit: "sku", step: "pricing-amount", text: "Напишите бюджет в рублях на один артикул. Чтобы оценить общую стоимость, можно подобрать состав работ и указать количество карточек.", links: [], suggestions: ["Сравнить тарифы", "Подобрать под мою задачу"] };
  if (!budgetUnit && units.length === 1 && units[0] !== "sku") budgetUnit = units[0];
  if (!budgetUnit || !units.includes(budgetUnit)) return {
    topic: topic.id, pricingMode: "budget", budget, step: "pricing-unit", text: units[0] === "sku" ? `Вы указали ${money(budget)}. Для карточек цены считаются за артикул. Это бюджет на одну карточку или общая сумма на несколько?` : `Вы указали ${money(budget)}. Уточните, сравниваем ли разовую стоимость проекта или расходы в месяц.${topic.id === "yandex-ads" ? " Это сумма на работу KILENI; рекламные расходы Яндекса оплачиваются отдельно." : ""}`, links: [],
    suggestions: units[0] === "sku" ? ["Это бюджет на один артикул", "Укажу бюджет на один артикул"] : units.map((unit) => unit === "month" ? "Это бюджет в месяц" : "Это бюджет на проект"),
  };
  const compatible = topic.offers.filter((offer) => offer.billingUnit === budgetUnit && offer.amount !== null && offer.priceType !== "custom");
  const affordable = compatible.filter((offer) => offer.amount! <= budget!);
  const paidMinimum = compatible.filter((offer) => offer.amount! > 0).sort((a, b) => a.amount! - b.amount!)[0];
  const note = affordable.length && affordable.every((offer) => offer.amount === 0) && paidMinimum ? ` Платные варианты начинаются с ${paidMinimum.price}.` : "";
  if (!affordable.length) return {
    topic: topic.id, pricingMode: "budget", budget, budgetUnit,
    text: `В бюджете ${money(budget)} ${unitLabel[budgetUnit]} нет опубликованных вариантов этой услуги.${paidMinimum ? ` Ближайшая начальная стоимость: ${paidMinimum.price}.` : ""} Можно обсудить меньший состав работ в брифе; его стоимость нужно согласовать отдельно.`, links: [{ label: "Обсудить задачу и бюджет", href: "/brief" }], suggestions: ["Изменить бюджет", "Сравнить тарифы", "Подобрать другую услугу"],
  };
  return compareReply(topic, affordable, { pricingMode: "budget", budget, budgetUnit }, `Бюджет: ${money(budget)} ${unitLabel[budgetUnit]}. Ниже подходящие по цене варианты — сверьте их объём со своей задачей.${note}`);
}
