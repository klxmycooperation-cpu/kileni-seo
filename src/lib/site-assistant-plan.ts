import type { AssistantOffer, AssistantSelection, AssistantTopic, ChatBillingUnit, ChatReply } from "./site-assistant";
import { parseAssistantBudget, assistantBudgetUnit, readAssistantBudgetBounds } from "./site-assistant-pricing";
import { readDesiredTiming, desiredTimingAdvice } from "./site-assistant-timing";
import { affirmativeTaskText, normalizeAssistantIntent, normalizeAssistantNumbers, extractAssistantRequirements, assessOfferRequirements, marketplaceOfferWorkKind, requirementSummary, type AssistantRequirements } from "./site-assistant-requirements";

export type AssistantPlan = {
  requirements?:AssistantRequirements; requirementsChecked?:boolean; description?:string; outcome?:string; dependencies?:string;
  projectTasks?:Array<{id:string;topic:string;description:string;plan?:AssistantPlan}>; activeTask?:string; projectBudget?:{raw:string;amount?:number;allocationKnown?:boolean};
  budgetProposal?:{raw:string;lower?:number;upper?:number;kind:"range"|"minimum"};
  unresolved?:string[]; attempts?:number; paused?:boolean; resumeStep?:string;
  topic?: string; task?: string; kind?: string;
  pages?: number; pagesAnswered?: boolean; regions?: number; regionsAnswered?: boolean;
  cards?: number; cardsAnswered?: boolean; materials?: number; materialsAnswered?: boolean;
  products?: number; productsAnswered?: boolean;
  adsScope?: "confirmed" | "custom" | "unknown";
  budget?: number; budgetAnswered?: boolean; budgetUnit?: ChatBillingUnit; cardBudget?: "total" | "sku";
  timing?: string; offer?: string; preferredOffer?: string; compareRequested?: boolean;
  firstStage?: { field: "pages" | "cards" | "materials"; count: number; original: number; offer: string };
  fullScope?: { field: "pages" | "cards" | "materials"; count: number };
  deferredInput?: string;
};
export type PlanSnapshot = { step: string; plan: AssistantPlan };
const platforms = ["wildberries", "ozon", "yandex-market"];
const goals: [string, string][] = [["Найти ошибки на сайте", "seo-audit"], ["Развивать сайт в поиске", "seo-promotion"], ["Создать новый сайт", "web-development"], ["Подготовить карточки товаров", "marketplaces"], ["Запустить или улучшить рекламу", "yandex-ads"], ["Подготовить тексты для сайта", "content-materials"], ["У меня другая задача", "custom-task"]];
const serviceNames: Record<string, string> = { "seo-audit": "SEO-аудит", "seo-promotion": "SEO-продвижение", "web-development": "Разработка сайта", marketplaces: "Карточки для маркетплейсов", "yandex-ads": "Яндекс Директ", "content-materials": "Тексты для сайта", "custom-task": "Нестандартная задача", wildberries: "Карточки для Wildberries", ozon: "Карточки для Ozon", "yandex-market": "Карточки для Яндекс Маркета" };
function counted(n: number, forms: [string, string, string]): string {
  const remainder = n % 100;
  const form = remainder >= 11 && remainder <= 14 ? forms[2] : n % 10 === 1 ? forms[0] : n % 10 >= 2 && n % 10 <= 4 ? forms[1] : forms[2];
  return `${n} ${form}`;
}
const money = (n: number) => `${new Intl.NumberFormat("ru-RU").format(n)} ₽`;
const unitNames: Record<ChatBillingUnit, string> = { project: "на проект", month: "в месяц", sku: "на один артикул" };
const normalize = normalizeAssistantIntent;
const unknown = (q: string) => /^(не знаю|не уверен|не уверена|пока не знаю|пока не определился|пока не определилась|бюджет пока не определен|сначала подберите подходящий вариант)[.!]*$/u.test(q);
const budgetChoices = ["Укажу свою сумму", "Помогите оценить стоимость", "Сначала подберите подходящий вариант"];
const askingForStart = (p: AssistantPlan) => p.topic === "seo-promotion" || (p.topic === "yandex-ads" && p.kind === "support");
const knownWebFunctions=(p:AssistantPlan)=>p.requirementsChecked || ["languages","blocks","forms","templates","onlinePayment","cart","delivery","integrations","accounts","roles","migration"].some(key=>p.requirements?.[key as keyof AssistantRequirements]!==undefined);

function servicesFor(q: string, catalog: AssistantTopic[]): string[] {
  q=affirmativeTaskText(q);
  const named = catalog.find(topic => normalize(serviceNames[topic.id] ?? topic.title) === q || normalize(topic.title) === q);
  if (named) return [named.id];
  const aliases: [string, RegExp][] = [["seo-audit", /^(?:аудит|проверить сайт|проверка сайта)$/u], ["seo-promotion", /^(?:seo|сео|продвижение|продвижение сайта)$/u], ["web-development", /^(?:разработка|новый сайт|создать сайт)$/u], ["yandex-ads", /^(?:реклама|директ|яндекс директ)$/u], ["content-materials", /^(?:тексты|контент)$/u]];
  const alias = aliases.find(([,pattern]) => pattern.test(q));
  if (alias) return [alias[0]];
  const patterns: [string,RegExp][] = [
    ["wildberries",/wildber|вайлд|(?:^|\s)(?:вб|wb)(?:$|[\s,.])/u], ["ozon",/ozon|озон/u], ["yandex-market",/яндекс\s*маркет/u],
    ["marketplaces",/маркетплейс|карточк|артикул/u], ["seo-audit",/аудит|проверить сайт|проверка сайта|найти ошибки|сайт.{0,12}(?:не наход|не вид|не индекс)/u],
    ["seo-promotion",/продвиж|(?:больше|увеличить|получать).{0,20}(?:заявок|трафик).{0,20}поиск|развивать сайт в поиске/u],
    ["web-development",/разработк|сайт компании|нужен сайт|(?:создать|сделать|новый).{0,15}сайт|(?:нужен|нужна|хочу|создать|сделать).{0,15}(?:лендинг|интернет.магазин|каталог)|создать новый сайт/u],
    ["yandex-ads",/реклам|директ/u], ["content-materials",/(?:подготовить|написать|нужны).{0,15}(?:текст|стать|материал)|тексты для сайта/u],
    ["custom-task",/другая задача|нестандарт|доработ/u],
  ];
  let ids=patterns.filter(([,pattern])=>pattern.test(q)).map(([id])=>id);
  if(/существующ|есть интернет.магазин|уже есть/u.test(q) && /продвиж|развивать|аудит/u.test(q) && !/новый|создать|сделать сайт/u.test(q))ids=ids.filter(id=>id!=="web-development" && id!=="custom-task");
  if(ids.some(id=>platforms.includes(id))) ids=ids.filter(id=>id!=="marketplaces");
  if (/аудит (?:и|с) (?:планом|план) продвижения/u.test(q)) ids=ids.filter(id=>id!=="seo-promotion");
  if (/аудит.{0,10}реклам|провер.{0,10}кампан/u.test(q)) ids=ids.filter(id=>id!=="seo-audit");
  return ids;
}
function serviceFor(q: string,catalog: AssistantTopic[]) {const ids=servicesFor(q,catalog); return ids.length===1?ids[0]:undefined;}
function projectTasksFor(raw:string,ids:string[],catalog:AssistantTopic[]):NonNullable<AssistantPlan["projectTasks"]> {
  const clauses=raw.split(/[,;]|\s+и\s+(?=(?:настройк|запуск|реклам|нуж|подготов|продвиж|аудит|(?:для\s+)?(?:ozon|озон|wildberries|вайлдберриз|яндекс)))/iu);
  return ids.map((topic,index)=>{
    const related=clauses.filter(clause=>servicesFor(normalize(clause),catalog).includes(topic) && !/общий бюджет/u.test(normalize(clause)));
    return {id:`task-${index+1}`,topic,description:related.length?related.join(", "):raw};
  });
}
function quantity(q: string, field: string): number | undefined {
  q=normalizeAssistantNumbers(q);
  const units: Record<string,string> = {pages:"страниц[аы]?",regions:"регион(?:а|ов)?",cards:"(?:карточ(?:ка|ки|ек)|артикул(?:а|ов)?)",materials:"материал(?:а|ов)?",products:"товар(?:а|ов)?"};
  const prefix = "(?:(?:у меня|на сайте|в каталоге|нужно|всего|около|примерно)\\s+)*";
  const match = q.match(new RegExp(`^${prefix}(\\d{1,6})\\s*(?:${units[field]})?[.!]?$`,"u"));
  const n = Number(match?.[1]);
  return Number.isInteger(n) && n > 0 ? n : undefined;
}
function nextStep(p: AssistantPlan): string {
  if(p.projectTasks?.length && !p.activeTask && !p.topic)return "plan-services";
  if (!p.topic) return "plan-topic";
  if (p.topic === "marketplaces") return "plan-platform";
  if (p.compareRequested) return "plan-compare";
  if (!p.task) return "plan-task";
  if(p.topic==="custom-task" && !p.outcome)return "plan-outcome";
  if(p.topic==="custom-task" && !p.dependencies)return "plan-dependencies";
  if (p.topic === "yandex-ads" && p.kind!=="custom" && !p.adsScope) return "plan-ads-scope";
  if (p.topic === "web-development" && p.kind === "company-site" && !p.pagesAnswered) return "plan-pages";
  if (p.topic === "web-development" && p.kind === "catalogue-or-shop" && !p.productsAnswered) return "plan-products";
  if (p.topic === "seo-audit" && !p.pagesAnswered && (p.kind!=="free" || p.pages!==undefined)) return "plan-pages";
  if (p.topic === "seo-promotion" && !p.pagesAnswered) return "plan-pages";
  if (p.topic === "seo-promotion" && !p.regionsAnswered) return "plan-regions";
  if (platforms.includes(p.topic) && !p.cardsAnswered) return "plan-cards";
  if (p.topic === "content-materials" && !p.materialsAnswered) return "plan-materials";
  if (platforms.includes(p.topic) && !p.cardBudget) return "plan-unit";
  if(p.budgetProposal && p.budget===undefined && !p.budgetAnswered)return "plan-budget-confirm";
  if(p.requirements?.adBudgetTotal!==undefined && !p.budgetAnswered)return "plan-ad-budget";
  if (!p.budgetAnswered) return "plan-budget";
  if (!p.timing) return "plan-timing";
  return "plan-results";
}
function initialPlan(topic?: string): AssistantPlan {
  return { topic, ...(topic === "seo-promotion" ? { task: "Регулярно продвигать страницы сайта", kind: "promotion", budgetUnit: "month" as const } : {}), ...(topic === "content-materials" ? { task: "Подготовить материалы для сайта", kind: "content" } : {}) };
}
function taskOptions(topic?: string): [string,string][] {
  switch(topic) {
    case "seo-audit": return [["Технический отчёт","technical"],["Аудит и исправления","implementation"],["Аудит и план продвижения","strategy"],["Бесплатная предварительная проверка","free"]];
    case "web-development": return [["Лендинг","landing"],["Сайт компании","company-site"],["Каталог товаров","catalogue-or-shop"],["Веб-сервис или личный кабинет","custom"]];
    case "yandex-ads": return [["Запустить рекламу","setup"],["Вести существующие кампании","support"]];
    default: return platforms.includes(topic ?? "") ? [["Разбор карточки","analysis"],["Текст и SEO","optimization"],["Текст и изображения","turnkey"]] : [];
  }
}
export function planChoiceAction(label:string,reply:ChatReply):{id:string;label:string;value?:string}|undefined {
  const topic=reply.plan?.topic;
  if(reply.step==="plan-services") {const item=reply.plan?.projectTasks?.find(task=>label===`Перейти к задаче: ${serviceNames[task.topic]??task.topic}`);if(item)return {id:"switch-task",label,value:item.id};}
  if(reply.step==="plan-task") {const item=taskOptions(topic).find(([text])=>text===label);if(item)return {id:"choose-task",label,value:item[1]};}
  if(reply.step==="plan-platform" || reply.step==="plan-topic") {
    const id=Object.keys(serviceNames).find(id=>serviceNames[id]===label)??({Wildberries:"wildberries",Ozon:"ozon","Яндекс Маркет":"yandex-market"} as Record<string,string>)[label];
    if(id)return {id:"choose-service",label,value:id};
  }
}
export function planActionInput(id:string,value:string|undefined,selection:AssistantSelection):string|undefined {
  if(id==="choose-service" && value && serviceNames[value])return serviceNames[value];
  if(id==="choose-task")return taskOptions(selection.plan?.topic).find(([,kind])=>kind===value)?.[0];
  if(id==="switch-task") {const task=selection.plan?.projectTasks?.find(item=>item.id===value);return task?`Перейти к задаче: ${serviceNames[task.topic]??task.topic}`:undefined;}
}

function taskFor(q: string, topic?: string): [string,string] | undefined {
  q=affirmativeTaskText(q);
  if(/\s(?:или|либо)\s/u.test(q) && topic==="web-development" && /лендинг/u.test(q) && /сайт компании|корпоратив/u.test(q))return undefined;
  if(topic==="web-development" && /доработ|перенос|личн.{0,8}кабинет|веб.сервис/u.test(q))return ["Доработка или индивидуальные функции","custom"];
  if(platforms.includes(topic??"") && /только.{0,12}(изображ|картин|визуал)/u.test(q))return ["Только изображения","custom"];
  if(topic==="yandex-ads" && /провер.{0,10}реклам|аудит.{0,10}(реклам|кампан)/u.test(q))return ["Проверка существующей рекламы","custom"];
  const exact = taskOptions(topic).find(([label])=>normalize(label) === q);
  if (exact) return exact;
  const aliases: Record<string,[string,RegExp][]> = {
    "seo-audit": [["technical", /^(?:технический аудит|проверить сайт|найти ошибки|только отчет|отчет)$/u], ["implementation", /^(?:проверить и исправить|проверка и правки|аудит с исправлениями|исправить ошибки)$/u], ["strategy", /^(?:аудит с планом|план продвижения|аудит и стратегия)$/u], ["free", /^(?:бесплатно|бесплатная проверка|экспресс.проверка)$/u]],
    "web-development": [["company-site", /^(?:корпоративный сайт|сайт для компании)$/u], ["catalogue-or-shop", /^(?:каталог|интернет.магазин|магазин)$/u], ["custom", /^(?:личный кабинет|веб.сервис|сервис)$/u]],
    "yandex-ads": [["setup", /^(?:настройка рекламы|настроить рекламу|новая кампания)$/u], ["support", /^(?:ведение рекламы|вести рекламу|сопровождение)$/u]],
  };
  const kind = aliases[topic ?? ""]?.find(([,pattern])=>pattern.test(q))?.[0];
  if(kind) return taskOptions(topic).find(([,value])=>value===kind);
  const natural: Record<string,[string,RegExp][]> = {
    "seo-audit":[["implementation",/исправ|правк/u],["strategy",/план продвижения|стратег/u],["free",/бесплат|экспресс/u],["technical",/техническ|отчет|найти ошибки/u]],
    "web-development":[["custom",/кабинет|веб.сервис/u],["catalogue-or-shop",/каталог|интернет.магазин/u],["company-site",/компани|корпоратив/u],["landing",/лендинг|одностранич|одна страница/u]],
    "yandex-ads":[["support",/вести|ведение|существующ|сопровожд/u],["setup",/запуст|настро|с нуля/u]],
  };
  const patterns=platforms.includes(topic??"") ? [["turnkey",/изображ|визуал|оформлен/u],["optimization",/текст|seo|сео/u],["analysis",/разбор|разобрать|анализ|улучшени/u]] as [string,RegExp][] : natural[topic??""]??[];
  const found=patterns.filter(([,pattern])=>pattern.test(q));
  if(topic==="web-development" && found.length>1) return undefined;
  if(found.length>1 && /или|либо/u.test(q)) return undefined;
  // Image packaging already includes copy; fixes and strategy include the audit itself.
  const inferred=found[0]?.[0];
  return taskOptions(topic).find(([,value])=>value===inferred);
}

function readPlanFacts(q: string,p: AssistantPlan,step: string,raw=q): {plan: AssistantPlan; changed: boolean; error?: string; errorStep?: string} {
  q=normalizeAssistantNumbers(q);
  const plan={...p}; let changed=false;
  const extracted=extractAssistantRequirements(raw,p.requirements);
  if(extracted.changed){plan.requirements=extracted.requirements;plan.offer=undefined;changed=true;}
  if(extracted.errors.length)plan.unresolved=[...new Set([...(plan.unresolved??[]),...extracted.errors])];
  else if(extracted.changed)plan.unresolved=plan.unresolved?.filter(item=>!/^Укажите одно положительное число:/u.test(item));
  const countText=q.replace(/(?:^|\s)(один|одна|одну|два|две|три)\s+(?=регион|страниц|карточ|артикул|материал|товар)/gu,(_,word:string)=>` ${{один:1,одна:1,одну:1,два:2,две:2,три:3}[word as "один"]} `);
  const counts: ["pages"|"regions"|"cards"|"materials"|"products",string][]=[["pages","(?:приоритетных\\s+)?страниц(?:а|ы)?"],["regions","регион(?:а|ов)?"],["cards","(?:карточ(?:ка|ки|ек)|артикул(?:а|ов)?)"],["materials","(?:материал(?:а|ов)?|стат(?:ья|ьи|ей))"],["products","товар(?:а|ов)?"]];
  const relevant=(field: string)=>field==="pages" ? ["seo-audit","seo-promotion","web-development"].includes(plan.topic??"") : field==="regions" ? ["seo-promotion","yandex-ads"].includes(plan.topic??"") : field==="cards" ? platforms.includes(plan.topic??"") : field==="materials" ? ["content-materials","seo-promotion"].includes(plan.topic??"") : plan.topic==="web-development" && plan.kind==="catalogue-or-shop";
  let error: string|undefined, errorStep: string|undefined;
  for(const [field,unit] of counts) {
    if(!relevant(field)) continue;
    const matches=[...countText.matchAll(new RegExp(`(?<![\\d.,−–—-])(\\d{1,6})\\s+${unit}(?=$|[\\s,.!?;])`,"gu"))].filter(match=>!(field==="cards" && /(?:на|за)\s*$/u.test(countText.slice(0,match.index)) && (/бюджет|₽|тыс|руб/u.test(q) || step==="plan-unit")));
    if(!matches.length) continue;
    const clause=countText.slice(Math.max(0,countText.lastIndexOf(",",matches[0].index)),matches[0].index!+matches[0][0].length);
    if(matches.length!==1 || /\d\s*(?:или|либо|до|[-–—])\s*\d/u.test(clause) || /[−–—-]\s*$/u.test(countText.slice(0,matches[0].index)) || Number(matches[0][1])<1) { error="Для объёма укажите одно целое положительное число."; errorStep=`plan-${field}`; continue; }
    // Total site size is not the number of pages to improve each month.
    if(field==="pages" && plan.topic==="seo-promotion" && /на сайте|всего на сайте|у меня/u.test(q) && !/приоритет|улучшать|каждый месяц|ежемесяч/u.test(q)) continue;
    Object.assign(plan,{[field]:Number(matches[0][1]),[`${field}Answered`]:true,offer:undefined,fullScope:undefined}); changed=true;
  }
  const parts=q.split(/[,;](?!\d)/u);
  let budgetParts=parts.filter(part=>!/^(?:бюджет\s+)?(?:на|за)\s+1\s+(?:артикул|карточку)[.!]*$/u.test(part.trim()) && /бюджет.*\d|\d\s*(?:тыс|тысяч|₽|руб|[кk](?:\s|$))/u.test(part));
  if(plan.topic==="yandex-ads") {
    const spend=budgetParts.filter(part=>/рекламный бюджет|расходы яндекса|на показы|на клики/u.test(part) && !/общий|на работу/u.test(part));
    if(spend.length){const amount=parseAssistantBudget(spend.join(", "));if(amount===undefined){error="Для рекламных расходов укажите одну сумму в рублях.";errorStep="plan-ad-budget";}else{plan.requirements={...plan.requirements,adSpend:amount};changed=true;}budgetParts=budgetParts.filter(part=>!spend.includes(part));}
  }
  if(budgetParts.length) {
    const snippet=budgetParts.join(", ");
    const amount=snippet.includes("бюджет")?snippet.slice(snippet.indexOf("бюджет")):snippet;
    const budget=parseAssistantBudget(amount);
    const bounds=readAssistantBudgetBounds(amount);
    const typedUnit=assistantBudgetUnit(amount);
    const expected=plan.topic==="seo-promotion" || (plan.topic==="yandex-ads" && plan.kind==="support") ? "month" : plan.cardBudget==="sku"?"sku":"project";
    if(plan.projectBudget && /общий бюджет (?:проекта|на проект)/u.test(amount)){plan.projectBudget={raw:amount,amount:budget,allocationKnown:false};changed=true;}
    else if(plan.topic==="yandex-ads" && /рекламный бюджет|расходы яндекса|на показы|на клики/u.test(amount) && !/на работу|общий/u.test(amount)){plan.requirements={...plan.requirements,adSpend:budget};changed=true;}
    else if(plan.topic==="yandex-ads" && /общий|рекламу и|работу и|все вместе/u.test(amount)){if(budget===undefined){error="Укажите одну общую сумму на рекламу и работу в рублях.";errorStep="plan-ad-budget";}else{plan.requirements={...plan.requirements,adBudgetTotal:budget};plan.budget=undefined;plan.budgetAnswered=undefined;errorStep="plan-ad-budget";changed=true;}}
    else if(bounds){plan.budgetProposal=bounds;plan.budget=undefined;plan.budgetAnswered=undefined;errorStep="plan-budget-confirm";changed=true;}
    else if(budget===undefined && !unknown(amount.trim())) { error="Для бюджета укажите одну сумму в рублях."; errorStep="plan-budget"; }
    else if(typedUnit && typedUnit!==expected && (!platforms.includes(plan.topic??"") || plan.cardBudget!==undefined || typedUnit==="month")) {error=`Сейчас нужен бюджет ${unitNames[expected]}. Указанная сумма относится к другому периоду или объёму.`; errorStep="plan-budget";}
    else if(plan.topic) {
      Object.assign(plan,{budget,budgetAnswered:true,budgetUnit:typedUnit??expected,offer:undefined});
      if(platforms.includes(plan.topic) && typedUnit) plan.cardBudget=typedUnit==="sku"?"sku":"total";
      changed=true;
    }
  }
  const timingStart=raw.toLowerCase().replace(/ё/gu,"е").match(/(?:^|\s)(через\s|до\s+\d|за\s+\d|в течение\s|начать\s|старт\s|сегодня|завтра|послезавтра|срочно|к концу)/u);
  const timingPart=timingStart?raw.slice(timingStart.index!+timingStart[0].length-timingStart[1].length).split(/[,;](?!\d)/u)[0].trim():undefined;
  if(timingPart && step!=="plan-timing") {
    const desired=readDesiredTiming(timingPart);
    if(desired?.error) {error=desired.error; errorStep="plan-timing";}
    else if(desired) {plan.timing=desired.text;changed=true;}
  }
  if(extracted.errors.length && !error){error=extracted.errors.join(" ");errorStep="plan-requirements";}
  return {plan,changed,error,errorStep};
}

export function planChoiceRows(p: AssistantPlan, catalog: AssistantTopic[]) {
  const rows: { label: string; value: string; action?: string;actionId?:string }[] = [];
  if(p.description)rows.push({label:"Описание задачи",value:p.description});
  if(p.outcome)rows.push({label:"Ожидаемый результат",value:p.outcome});
  if(p.dependencies)rows.push({label:"Зависимости и исходные данные",value:p.dependencies});
  if(p.requirements && Object.keys(p.requirements).length)rows.push({label:"Обязательные требования",value:requirementSummary(p.requirements),action:"Изменить обязательные требования",actionId:"edit-requirements"});
  if(p.unresolved?.length)rows.push({label:"Нужно уточнить",value:p.unresolved.join("; ")});
  if(p.budgetProposal)rows.push({label:"Исходное пожелание по бюджету",value:p.budgetProposal.raw});
  if(p.projectBudget)rows.push({label:"Бюджет всего проекта",value:`${p.projectBudget.raw}; ${p.projectBudget.allocationKnown?"распределение указано по задачам":"распределение между услугами нужно уточнить"}`});
  for(const item of p.projectTasks??[]) {
    if(item.id===p.activeTask)continue;
    const saved=item.plan;
    rows.push({label:`Другая задача: ${serviceNames[item.topic]??item.topic}`,value:saved?planChoiceRows({...saved,projectTasks:undefined,projectBudget:undefined},catalog).map(row=>`${row.label}: ${row.value}`).join("\n"):item.description,action:`Перейти к задаче: ${serviceNames[item.topic]??item.topic}`,actionId:`switch-task:${item.id}`});
  }
  if (p.topic) rows.push({label:"Услуга",value:serviceNames[p.topic] ?? p.topic,action:"Изменить услугу"});
  if (p.task) rows.push({label:"Задача",value:p.task,action:"Изменить задачу"});
  const scope = [p.pagesAnswered ? p.pages ? counted(p.pages,["страница","страницы","страниц"]) : "Количество страниц нужно уточнить" : "", p.regionsAnswered ? p.regions ? counted(p.regions,["регион","региона","регионов"]) : "Количество регионов нужно уточнить" : "", p.cardsAnswered ? p.cards ? counted(p.cards,["артикул","артикула","артикулов"]) : "Количество карточек нужно уточнить" : "", p.materialsAnswered ? p.materials ? counted(p.materials,["материал","материала","материалов"]) : "Количество материалов нужно уточнить" : "",p.productsAnswered ? p.products ? counted(p.products,["товар","товара","товаров"]) : "Количество товаров нужно уточнить" : ""].filter(Boolean).join(", ");
  if (scope) rows.push({label:"Объём",value:scope,action:"Изменить объём"});
  if(p.fullScope) rows.push({label:"Полный объём проекта",value:counted(p.fullScope.count,p.fullScope.field==="pages"?["страница","страницы","страниц"]:p.fullScope.field==="cards"?["карточка","карточки","карточек"]:["материал","материала","материалов"])+"; выбранный тариф покрывает только первый этап"});
  if (p.adsScope) rows.push({label:"Объём",value:p.adsScope === "confirmed" ? catalog.find(topic=>topic.id === "yandex-ads")?.offers.find(offer=>offer.id === (p.kind === "setup" ? "yandex-ads-setup" : "yandex-ads-support"))?.scope ?? "Опубликованный состав работ" : p.adsScope === "custom" ? "Нужен индивидуальный состав работ" : "Объём нужно уточнить",action:"Изменить объём"});
  if (p.cardBudget) rows.push({label:"Расчёт бюджета",value:p.cardBudget === "total" ? "На все карточки" : "На один артикул",action:"Изменить расчёт бюджета"});
  if (p.budgetAnswered) rows.push({label:"Бюджет",value:p.budget === undefined ? "Уточним после выбора состава работ" : `${money(p.budget)} ${p.cardBudget === "total" ? "на все карточки" : unitNames[p.budgetUnit ?? "project"]}`,action:"Изменить бюджет"});
  if (p.timing) rows.push({label:askingForStart(p) ? "Желаемое начало работы" : "Желаемый срок",value:p.timing === "Срок пока не определён" ? askingForStart(p) ? "Дату старта согласуем" : "Срок согласуем" : p.timing,action:"Изменить срок"});
  const offer = catalog.find(topic=>topic.id === p.topic)?.offers.find(item=>item.id === p.offer);
  const preferred = catalog.find(topic=>topic.id === p.topic)?.offers.find(item=>item.id === p.preferredOffer);
  if (preferred && !offer) rows.push({label:"Интересующий тариф",value:preferred.title+"; соответствие всей задаче пока не подтверждено",action:"Изменить тариф"},{label:"Базовая часть тарифа",value:preferred.scope},{label:"Ориентир по стоимости",value:preferred.price+"; стоимость всей задачи нужно подтвердить"},{label:"Не входит в базовый тариф",value:preferred.exclusions.join("\n")});
  if (offer) rows.push({label:"Тариф",value:offer.title,action:"Изменить тариф"},{label:offer.priceType==="from"?"Начальная стоимость тарифа":"Стоимость тарифа",value:offer.price},{label:"Срок тарифа",value:offer.duration},{label:"Что покрывает тариф",value:offer.scope+"\n"+offer.result},{label:"Не входит в тариф",value:offer.exclusions.join("\n")});
  const reviewed=offer??preferred;
  if(reviewed){const fit=assessOfferRequirements(reviewed,p);if(fit.reasons.length)rows.push({label:"Нужно оценить отдельно",value:fit.reasons.join("\n")});if(fit.pending.length)rows.push({label:"Требует подтверждения",value:fit.pending.join("\n")});}
  if(!offer)rows.push({label:"Тариф",value:"Не выбран; задачу можно обсудить без тарифа",action:"Изменить тариф"});
  if (offer?.amount !== null && offer?.amount !== undefined) {
    const count = platforms.includes(p.topic ?? "") ? p.cards : p.topic === "content-materials" ? p.materials : undefined;
    if (count && count > 1) rows.push({ label: "Ориентировочно за весь объём", value: `${offer.priceType === "from" ? "от " : ""}${money(offer.amount * count)}; итоговую сумму подтвердим после брифа` });
  }
  return rows;
}

function scopeFits(offer: AssistantOffer, p: AssistantPlan): boolean {
  const c = offer.contract;
  if (!c || !assessOfferRequirements(offer,p).suitable) return false;
  switch (c.kind) {
    case "seo-audit":
      if (p.kind === "free") return offer.amount === 0 && (p.pages===undefined || (c.urls!==null && p.pages<=c.urls));
      return offer.amount !== 0 && p.pages !== undefined && c.urls !== null && c.urls >= p.pages && (p.kind === "implementation" ? Boolean(c.implementationHours) : !c.implementationHours) && (p.kind !== "strategy" || c.competitors === "included");
    case "seo-promotion": return p.pages !== undefined && p.regions !== undefined && c.pages !== null && c.regions !== null && c.pages >= p.pages && c.regions >= p.regions;
    case "web-development": return c.productType === p.kind && (p.pages===undefined || (c.pages!==null && c.pages>=p.pages)) && (p.kind === "company-site" ? p.pages !== undefined && c.pages !== null && c.pages >= p.pages : p.kind === "catalogue-or-shop" ? p.products !== undefined && c.products !== undefined && c.products !== null && c.products >= p.products : true);
    case "marketplaces": return p.cards !== undefined && c.skus === 1 && marketplaceOfferWorkKind(offer.id)===p.kind;
    case "yandex-ads": return p.adsScope === "confirmed" && (p.kind === "setup" ? offer.id === "yandex-ads-setup" : p.kind === "support" && offer.id === "yandex-ads-support");
    case "content-materials": return p.materials !== undefined && c.volume === 1;
    default: return false;
  }
}
function costFor(offer: AssistantOffer,p: AssistantPlan) {
  if (offer.amount === null || offer.priceType === "custom") return undefined;
  return offer.amount * (platforms.includes(p.topic ?? "") && p.cardBudget === "total" ? p.cards ?? 1 : p.topic === "content-materials" ? p.materials ?? 1 : 1);
}
export function matchingPlanOffers(p: AssistantPlan, catalog: AssistantTopic[]): AssistantOffer[] {
  const offers = catalog.find(topic=>topic.id === p.topic)?.offers ?? [];
  return offers.filter(offer=>scopeFits(offer,p) && (p.budget === undefined || (costFor(offer,p) !== undefined && costFor(offer,p)! <= p.budget))).map(offer=>({ ...offer,fit:assessOfferRequirements(offer,p), ...(platforms.includes(p.topic ?? "") && p.cards && p.cards > 1 ? {estimate:`${offer.priceType === "from" ? "от " : ""}${money(offer.amount!)} × ${p.cards} = ${offer.priceType === "from" ? "от " : ""}${money(offer.amount! * p.cards)} за ${counted(p.cards,["артикул","артикула","артикулов"])}. Состав и общую сумму согласуем до начала работ.`} : p.topic === "content-materials" && p.materials && p.materials > 1 ? {estimate:`${money(offer.amount!)} × ${p.materials} = ${money(offer.amount! * p.materials)} за ${counted(p.materials,["материал","материала","материалов"])}. Объём каждого материала и итоговую сумму нужно подтвердить.`} : {}) }));
}

function budgetScope(p: AssistantPlan): string {
  if (p.cardBudget === "total") return p.cards ? `на ${counted(p.cards, ["артикул", "артикула", "артикулов"])}` : "на все карточки";
  return unitNames[p.budgetUnit ?? "project"];
}

function budgetPriceReference(p: AssistantPlan, catalog: AssistantTopic[]): string {
  const offers = matchingPlanOffers({ ...p, budget: undefined }, catalog);
  if (!offers.length) return "Для вашей задачи стоимость нужно рассчитать по составу работ. Можете указать комфортный бюджет или продолжить подбор — подготовим предложение после уточнения объёма.";
  const prices = offers.map(offer => {
    const amount = costFor(offer, p);
    const price = amount === undefined ? offer.price : `${offer.priceType === "from" ? "от " : ""}${money(amount)} ${budgetScope(p)}`;
    return `${offer.title} — ${price}.`;
  });
  return `Стоимость подходящего состава работ:\n${prices.join("\n")}${p.topic === "yandex-ads" ? "\nРасходы на рекламу Яндекса оплачиваются отдельно." : ""}\n\nКакую сумму учесть при подборе? Напишите бюджет в рублях или сначала выберите подходящий вариант.`;
}

function firstStageFor(p: AssistantPlan,catalog: AssistantTopic[]): AssistantPlan["firstStage"] {
  if(p.budget===undefined || !p.task || !p.kind) return undefined;
  const field: "pages"|"cards"|"materials"|undefined=p.topic==="seo-audit" && p.kind!=="free"?"pages":platforms.includes(p.topic??"") && p.cardBudget==="total"?"cards":p.topic==="content-materials"?"materials":undefined;
  if(!field || !p[field] || p.adsScope) return undefined;
  const offers=catalog.find(topic=>topic.id===p.topic)?.offers??[];
  const stages=offers.flatMap(offer=>{
    const count=field==="pages" && offer.contract?.kind==="seo-audit"?offer.contract.urls:offer.amount?Math.floor(p.budget!/offer.amount):undefined;
    if(!count || count>=p[field]! || !matchingPlanOffers({...p,[field]:count},catalog).some(item=>item.id===offer.id)) return [];
    return [{field,count,original:p[field]!,offer:offer.id}];
  });
  return stages.sort((a,b)=>b.count-a.count)[0];
}
function recommendationReason(p: AssistantPlan,offers: AssistantOffer[],catalog: AssistantTopic[]): string {
  const selected=offers.find(offer=>offer.id===p.offer)??offers[0];
  if(!selected) return "";
  const scope=planChoiceRows({...p,offer:undefined},catalog).find(row=>row.label==="Объём")?.value;
  const cost=costFor(selected,p);
  const fit=assessOfferRequirements(selected,p);
  return `Тариф «${selected.title}» покрывает указанный объём задачи «${p.task}»${scope?` (${scope})`:""}.${p.budget!==undefined && cost!==undefined?` ${selected.priceType==="from"?"Начальная стоимость":"Стоимость"} ${money(cost)} соответствует бюджету ${money(p.budget)}${p.cardBudget==="total"?" на все карточки":` ${unitNames[p.budgetUnit??"project"]}`}.${selected.priceType==="from"?" Соответствие окончательной цены пока не подтверждено.":""}`:" Бюджет не указан: соответствие цены бюджету ещё не проверено."}${fit.pending.length?` ${fit.pending.join(" ")}`:""}${p.fullScope?" Это первый этап; оставшийся объём нужно оценить отдельно.":""}`;
}
const importantTimingNotice=(text: string)=>/короче|Срочную|нужно уточнить|начало работы|не гарантируется|всего объёма/u.test(text)?text:undefined;
function planTimingAdvice(p: AssistantPlan,offers: AssistantOffer[]) {
  const advice=desiredTimingAdvice(p.timing,offers);
  const batch=platforms.includes(p.topic??"") && (p.cards??0)>1 ? "Срок тарифа указан для одного артикула. Срок всего объёма согласуем отдельно." : p.topic==="content-materials" && (p.materials??0)>1 ? "Срок тарифа относится к одному материалу. Срок всего объёма согласуем отдельно." : "";
  return batch ? `${importantTimingNotice(advice)?advice+"\n\n":""}${batch}` : advice;
}

function showStep(step: string, plan: AssistantPlan, history: PlanSnapshot[], catalog: AssistantTopic[], prefix = ""): ChatReply {
  if(plan.offer && !matchingPlanOffers(plan,catalog).some(offer=>offer.id===plan.offer))plan={...plan,preferredOffer:plan.offer,offer:undefined};
  const base = {step,plan,planHistory:history,topic:plan.topic,offer:plan.offer,links:[]};
  const question = (text: string,suggestions: string[]): ChatReply => ({...base,text:prefix+text,suggestions:[...suggestions,...(history.length ? ["Назад"] : []),"Отменить подбор"]});
  switch(step) {
    case "plan-services":return question("В проекте несколько задач. Сохраню каждую отдельно. С какой начнём? Общий бюджет не будет применён целиком к каждой услуге.",(plan.projectTasks??[]).map(item=>`Перейти к задаче: ${serviceNames[item.topic]??item.topic}`));
    case "plan-budget-confirm":return question(plan.budgetProposal?.kind==="range"?`Вы указали диапазон «${plan.budgetProposal.raw}». Использовать ${money(plan.budgetProposal.upper!)} как верхний предел при подборе? Исходный диапазон останется в резюме.`:`Вы указали «${plan.budgetProposal?.raw}» — это нижняя граница. Какую максимальную сумму учесть? Напишите верхний предел или продолжите без него.`,plan.budgetProposal?.kind==="range"?["Использовать верхнюю границу","Укажу другую сумму","Сначала подберите подходящий вариант"]:["Укажу другую сумму","Сначала подберите подходящий вариант"]);
    case "plan-ad-budget":return question(`Вы назвали общий бюджет ${money(plan.requirements?.adBudgetTotal??0)} на рекламу и работу. Какую часть выделяете на работу KILENI? Рекламные расходы Яндекса считаются отдельно.`,["Укажу бюджет на работу","Распределение нужно обсудить"]);
    case "plan-requirements": {
      const preferred=catalog.find(item=>item.id===plan.topic)?.offers.find(item=>item.id===plan.preferredOffer);
      const text=plan.topic==="web-development"?`Уточним обязательные функции.${preferred?` В выбранном варианте: ${preferred.scope}.`:""} Нужны ли другие языки, больше блоков или форм, онлайн-оплата, интеграции, личный кабинет или перенос данных? Напишите требования; базовый состав можно подтвердить.`:plan.topic==="content-materials"?"Какой материал нужен и какой объём каждого текста? Нужны ли редактура или публикация? Сохраню условия для оценки.":"Какие работы обязательны? Например, публикация, изображения, внедрение исправлений или дополнительный объём. Сохраню требования отдельно от названия услуги.";
      return question(text,["Базовый состав подходит","Требования нужно уточнить","Подготовить резюме"]);
    }
    case "plan-outcome":return question("Какой результат должен дать первый этап? Опишите, что должно быть готово или измениться.",["Результат нужно обсудить","Подготовить резюме"]);
    case "plan-dependencies":return question("Какие материалы, доступы или другие работы влияют на задачу? Пароли здесь не отправляйте.",["Зависимости нужно уточнить","Подготовить резюме"]);
    case "plan-compare": {
      const topic=catalog.find(item=>item.id===plan.topic);
      const explanation=prefix+`Все тарифы услуги «${serviceNames[plan.topic??""] ?? topic?.title ?? ""}». Нажмите на название, чтобы посмотреть состав, или выберите тариф — затем проверим его по вашей задаче.`;
      return {...base,pricingMode:"compare",comparisons:topic?.offers.map(offer=>({...offer,fit:assessOfferRequirements(offer,plan)})),explanation,text:explanation+"\n\nЭто просмотр тарифов, а не окончательный подбор. Условия вашей задачи сохранены. Цены «от» — начальная стоимость; итоговую сумму подтвердим после брифа.",suggestions:["Продолжить подбор","Изменить услугу"]};
    }
    case "plan-topic": return question("Что нужно сделать? Сначала выберите услугу — затем уточним задачу, объём и бюджет.",[...Object.keys(serviceNames).filter(id=>!platforms.includes(id)).map(id=>serviceNames[id]),"Помогите выбрать услугу"]);
    case "plan-goal": return question("Что хотите изменить? Выберите ближайшую задачу — помогу определить услугу.", goals.map(([label])=>label));
    case "plan-platform": return question("На какой площадке нужно подготовить карточки?",["Wildberries","Ozon","Яндекс Маркет"]);
    case "plan-task": return question(taskOptions(plan.topic).length ? "Какой результат вам нужен? Выберите ближайший вариант." : "Опишите, что нужно сделать и что должно получиться. Достаточно одного-двух предложений.",taskOptions(plan.topic).map(([label])=>label));
    case "plan-ads-scope": {
      const offer = catalog.find(topic=>topic.id === "yandex-ads")?.offers.find(item=>item.id === (plan.kind === "setup" ? "yandex-ads-setup" : "yandex-ads-support"));
      return question(`Опубликованный тариф: ${offer?.scope ?? "объём нужно согласовать"}. Подходит такой объём? Рекламный бюджет Яндекса оплачивается отдельно.`,["Да, этот объём подходит","Нужно больше работ","Объём нужно уточнить"]);
    }
    case "plan-pages": return question(plan.topic === "seo-promotion" ? "Сколько приоритетных страниц нужно улучшать каждый месяц?" : plan.topic === "web-development" ? "Сколько страниц нужно подготовить для сайта компании?" : "Сколько примерно страниц нужно проверить на сайте? Напишите число или выберите «Не знаю».",["5 страниц","10 страниц",...(plan.topic === "web-development" ? ["20 страниц"] : ["50 страниц","200 страниц","500 страниц"]),"Не знаю"]);
    case "plan-products": return question("Сколько товаров должно быть в каталоге? Базовый вариант рассчитан на ассортимент до 100 товаров.",["50 товаров","100 товаров","200 товаров","Не знаю"]);
    case "plan-regions": return question("В скольких регионах нужно продвигать сайт? Напишите число.",["1 регион","2 региона","3 региона","Не знаю"]);
    case "plan-cards": return question("Сколько артикулов нужно подготовить? От этого зависит общая стоимость.",["1 карточка","5 карточек","10 карточек","Не знаю"]);
    case "plan-materials": return question("Сколько материалов для сайта нужно подготовить?",["1 материал","3 материала","5 материалов","Не знаю"]);
    case "plan-unit": return question("Будем подбирать по общему бюджету на все карточки или по сумме на один артикул?",["Общий бюджет на все карточки","Бюджет на один артикул"]);
    case "plan-budget": return question(`Какой бюджет планируете ${budgetScope(plan)}? Напишите сумму в рублях. Если пока не определились, помогу оценить стоимость по вашей задаче.${plan.topic === "yandex-ads" ? " Бюджет здесь относится к работе KILENI. Расходы на рекламу Яндекса считаются отдельно." : ""}`,budgetChoices);
    case "plan-timing": return askingForStart(plan)
      ? question("Когда планируете начать работу? Дату старта согласуем с вами.",["Начать как можно скорее","Укажу дату начала","Дату старта согласуем"])
      : question("К какой дате нужно завершить работу? Если точной даты нет, согласуем срок по объёму задачи.",["Как можно скорее","Укажу дату готовности","Срок согласуем"]);
    case "plan-stage": {
      const stage=firstStageFor(plan,catalog);
      if(!stage)return showStep("plan-results",{...plan,firstStage:undefined},history,catalog,prefix+"Условия первого этапа изменились. Полная задача сохранена; проверим доступные варианты. ");
      base.plan={...plan,firstStage:stage};
      const offer=catalog.find(topic=>topic.id===plan.topic)?.offers.find(item=>item.id===stage?.offer);
      const forms: [string,string,string]=stage?.field==="pages"?["страница","страницы","страниц"]:stage?.field==="cards"?["карточка","карточки","карточек"]:["материал","материала","материалов"];
      const amount=offer?costFor(offer,{...plan,[stage.field]:stage.count}):undefined;
      return question(`Первый этап может охватить ${counted(stage.count,forms)}: ${offer?.title} — ${amount===undefined?offer?.price:`${offer?.priceType==="from"?"от ":""}${money(amount)} за этот этап`}. Вы указали ${counted(stage.original,forms)}; оставшийся объём в этот этап не входит. Применить меньший объём к подбору?`,["Принять первый этап","Вернуться к полному объёму","Изменить задачу"]);
    }
    case "plan-summary": return {...base,summary:planChoiceRows(plan,catalog),timingNotice:plan.offer?importantTimingNotice(planTimingAdvice(plan,matchingPlanOffers(plan,catalog))):undefined,text:"Проверьте резюме перед переходом в бриф. Любой пункт можно изменить. Данные перенесутся только после вашего подтверждения в брифе."+(plan.offer?`\n\n${planTimingAdvice(plan,matchingPlanOffers(plan,catalog))}`:""),suggestions:["Изменить задачу","Изменить бюджет","Изменить срок",...(history.length?["Назад"]:[])]};
    default: {
      const offers = matchingPlanOffers(plan,catalog);
      const scopeUnknown = plan.adsScope === "unknown" || (plan.pagesAnswered && !plan.pages) || (plan.regionsAnswered && !plan.regions) || (plan.cardsAnswered && !plan.cards) || (plan.materialsAnswered && !plan.materials) || (plan.productsAnswered && !plan.products);
      const custom = plan.adsScope === "custom" || plan.topic === "custom-task" || plan.kind === "custom";
      const serviceOffers=catalog.find(item=>item.id===plan.topic)?.offers??[];
      const requirementReasons=[...new Set(serviceOffers.filter(offer=>!plan.kind || offer.contract?.kind!=="web-development" || offer.contract.productType===plan.kind).flatMap(offer=>assessOfferRequirements(offer,plan).reasons))];
      const preferred=catalog.find(item=>item.id===plan.topic)?.offers.find(item=>item.id===plan.preferredOffer);
      const preferredCost=preferred?costFor(preferred,plan):undefined;
      const preferredContract=preferred?.contract;
      const preferredReason=preferredContract?.kind==="web-development" && preferredContract.pages!==null && plan.pages!==undefined && plan.pages>preferredContract.pages
        ? `Он рассчитан на ${counted(preferredContract.pages,["страницу","страницы","страниц"])}, а вы указали ${counted(plan.pages,["страницу","страницы","страниц"])}.`
        : preferredCost!==undefined && preferredCost!==null && plan.budget!==undefined && preferredCost>plan.budget
          ? `Стоимость выбранного объёма — ${money(preferredCost)}${preferred?.priceType==="from"?" или выше":""}, ваш бюджет — ${money(plan.budget)}.` : "Объём и бюджет сохранены.";
      const preferredNote=preferred && !offers.some(item=>item.id===preferred.id)?`Тариф «${preferred.title}» не соответствует указанным условиям. ${preferredReason}\n\n`:"";
      const note = preferredNote+(custom ? "Для этой задачи нужен индивидуальный состав работ. Стоимость и срок определим после брифа." : scopeUnknown ? "Нужно уточнить объём задачи. Пока не буду утверждать, что опубликованный тариф её покрывает." : offers.length ? recommendationReason(plan,offers,catalog) : "С учётом задачи, объёма и бюджета нет тарифа, который можно уверенно предложить. Можно изменить условия или обсудить индивидуальный состав работ.")+(requirementReasons.length?`\n\nЧто требует отдельной оценки:\n${requirementReasons.join("\n")}`:"");
      const scopedOffers = matchingPlanOffers({...plan,budget:undefined},catalog);
      const minimum = scopedOffers.length ? Math.min(...scopedOffers.map(offer=>costFor(offer,plan) ?? Infinity)) : undefined;
      const budgetExplanation = !offers.length && plan.budget !== undefined && minimum !== undefined && Number.isFinite(minimum) && minimum > plan.budget
        ? `\n\nДля этого объёма стоимость начинается с ${money(minimum)} ${plan.cardBudget === "total" ? "на все карточки" : unitNames[plan.budgetUnit ?? "project"]}. До этой суммы не хватает ${money(minimum - plan.budget)}. Можно изменить бюджет или объём.` : "";
      const timing=planTimingAdvice(plan,offers);
      return {...base,step:"plan-results",explanation:offers.length?note.replace(/ Обязательные функции ещё не уточнены\. Выбор тарифа потребует проверки\./u,""):Object.keys(plan.requirements??{}).length && requirementReasons.length?"Опубликованные тарифы покрывают только часть задачи. Дополнительные требования перечислены ниже; соответствие всей задаче не подтверждено.":undefined,timingNotice:offers.length?importantTimingNotice(timing):undefined,text:prefix+note+budgetExplanation+(plan.budget === undefined ? "\n\nБюджет пока не указан, поэтому соответствие цены бюджету не проверено." : "")+(timing?`\n\n${timing}`:"")+"\n\nЦены «от» — начальная стоимость. Итоговую сумму подтвердим после брифа."+(plan.kind === "free" ? " Бесплатная проверка охватывает до 10 открытых страниц и не заменяет полный аудит." : "")+(plan.topic === "yandex-ads" ? " Рекламный бюджет Яндекса оплачивается отдельно." : ""),comparisons:offers.length ? offers : Object.keys(plan.requirements??{}).length && requirementReasons.length?serviceOffers.map(offer=>({...offer,fit:assessOfferRequirements(offer,plan)})):undefined,suggestions:[offers.length ? "Резюме без выбора тарифа" : "Подготовить резюме",...(preferredNote?["Сравнить тарифы"]:[]),...(!offers.length && firstStageFor(plan,catalog)?["Рассмотреть первый этап"]:[]),"Изменить задачу","Изменить бюджет","Изменить срок","Изменить услугу",...(plan.projectTasks?.length?["Другие задачи проекта"]:[]),...(history.length ? ["Назад"] : [])]};
    }
  }
}

export function answerPlanQuestion(q: string, catalog: AssistantTopic[], selection: AssistantSelection, originalQuestion = q, previousTopic?: string): ChatReply | undefined {
  const commonControl=/^(?:назад|подготовить резюме|резюме без выбора тарифа|изменить (?:услугу|задачу|объем|обязательные требования|расчет бюджета|бюджет|срок|тариф)|рассмотреть первый этап|принять первый этап|вернуться к полному объему|другие задачи проекта|перейти к задаче: .+|выбрать тариф: .+)$/u.test(q);
  if(selection.plan && selection.step==="assistant-menu" && (commonControl || /^(?:сравнить|сравни|показать|покажи) тарифы/u.test(q)))return answerPlanQuestion(q,catalog,{...selection,step:selection.plan.resumeStep??nextStep(selection.plan),plan:{...selection.plan,paused:undefined,resumeStep:undefined}},originalQuestion,previousTopic);
  if(selection.plan && ["plan-compare","plan-results"].includes(selection.step??"")) {
    const shown=selection.step==="plan-compare"?catalog.find(topic=>topic.id===selection.plan!.topic)?.offers??[]:matchingPlanOffers(selection.plan,catalog);
    const ordinal=["первый","второй","третий","четвертый"].indexOf(q.replace(/^(?:выбрать|хочу|этот)\s+/u,""));
    if(ordinal>=0 && shown[ordinal])q=`выбрать тариф: ${normalize(shown[ordinal].title)}`;
    else if(/^(?:этот|да, этот|выбрать этот)$/u.test(q) && shown.length===1)q=`выбрать тариф: ${normalize(shown[0].title)}`;
  }
  if(selection.plan && selection.step==="assistant-menu" && /^(?:продолжить подбор|подобрать услугу|подобрать по бюджету)$/u.test(q))return showStep(selection.plan.resumeStep??nextStep(selection.plan),{...selection.plan,paused:undefined,resumeStep:undefined},selection.planHistory??[],catalog);
  const validTopic=catalog.some(item=>item.id===previousTopic)?previousTopic:undefined;
  if(!selection.plan && selection.pricingMode==="compare") {
    if(selection.step==="pricing-topic" || selection.step==="pricing-platform") {
      const selected=serviceFor(q,catalog);
      if(selected && (selection.step!=="pricing-platform" || platforms.includes(selected))) {
        const plan={...initialPlan(selected),compareRequested:true};
        return showStep(nextStep(plan),plan,[],catalog);
      }
    }
    if(validTopic && q.startsWith("выбрать тариф: ")) return answerPlanQuestion(q,catalog,{step:"plan-compare",plan:{...initialPlan(validTopic),compareRequested:true}},originalQuestion,validTopic);
  }
  if (!selection.plan && /^(?:сравнить|сравни|показать|покажи) тарифы/u.test(q)) {
    const topic=serviceFor(q,catalog)??validTopic;
    if(topic) {const plan={...initialPlan(topic),...(topic===validTopic?{budget:selection.budget,budgetAnswered:selection.budget!==undefined?true:undefined,budgetUnit:selection.budgetUnit}:{}),compareRequested:true};return showStep(nextStep(plan),plan,[],catalog);}
  }
  if (/^(подобрать услугу и тариф|подбор по задаче и бюджету|подобрать по задаче и бюджету|подбери мне услугу|подобрать услугу)$/u.test(q)) return selection.plan?showStep(nextStep({...selection.plan,compareRequested:undefined}),{...selection.plan,compareRequested:undefined},selection.planHistory??[],catalog):showStep("plan-topic",{},[],catalog);
  if(/^(помоги(?:те)? выбрать вариант|подобрать по бюджету|подобрать под мою задачу)$/u.test(q)) {
    const plan=selection.plan?{...selection.plan,compareRequested:undefined}:{...initialPlan(validTopic),budget:selection.budget,budgetAnswered:selection.budget!==undefined?true:undefined,budgetUnit:selection.budgetUnit};
    const history=selection.plan?[...(selection.planHistory??[]),{step:selection.step!,plan:selection.plan}]:[];
    return showStep(nextStep(plan),plan,history,catalog);
  }
  if (/^(помогите выбрать услугу|не знаю,? с чего начать)$/u.test(q)) return showStep("plan-goal",{},selection.plan ? [...(selection.planHistory ?? []),{step:selection.step!,plan:selection.plan}] : [],catalog);
  const legacySteps: Record<string,string>={goal:"plan-goal","audit-goal":"plan-task","audit-pages":"plan-pages",development:"plan-task",promotion:"plan-pages",platform:"plan-platform","marketplace-scope":"plan-task",ads:"plan-task"};
  if(!selection.plan && legacySteps[selection.step??""]) {
    const plan=initialPlan(selection.step==="goal"?undefined:previousTopic);
    if(selection.step==="audit-pages") Object.assign(plan,{kind:"technical",task:"Технический отчёт"});
    return answerPlanQuestion(q,catalog,{step:legacySteps[selection.step!],plan},originalQuestion,previousTopic);
  }
  if(!selection.plan && /хочу|нужен|нужна|нужны|нужно|доработ|существующ|есть /u.test(q) && !q.endsWith("?")) {
    const ids=servicesFor(q,catalog);
    if(ids.length) return answerPlanQuestion(q,catalog,{step:"plan-topic",plan:{}},originalQuestion,previousTopic);
  }
  if(!selection.plan && selection.pricingMode!=="budget" && /^(?:(?:мой )?бюджет\s+.*\d|\d[\d\s,.]*\s*(?:₽|руб|тыс|[кk](?:\s|$)))/u.test(q) && !q.endsWith("?")) {
    const topic=serviceFor(q,catalog)??(catalog.some(item=>item.id===previousTopic)?previousTopic:undefined);
    const plan=initialPlan(topic);
    if(plan.task) {
      const facts=readPlanFacts(q,plan,"plan-topic",originalQuestion);
      return showStep(nextStep(facts.plan),facts.plan,[],catalog,facts.error?facts.error+"\n\n":"");
    }
    return showStep(nextStep(plan),{...plan,deferredInput:originalQuestion},[],catalog);
  }
  if (!selection.plan || !selection.step?.startsWith("plan-")) return undefined;
  let p = {...selection.plan};
  const originalPlan = {...p};
  const history = [...(selection.planHistory ?? [])];
  const step = selection.step;
  if (q === "назад") {
    const previous = history.pop();
    return previous ? showStep(previous.step,previous.plan,history,catalog) : showStep(step,p,history,catalog,"Вы в начале подбора. ");
  }
  const greeting = /^(?:привет|здравствуйте|здравствуй|добрый (?:день|вечер)|доброе утро|спасибо(?: большое)?|благодарю)[!.,\s]*$/u.test(q);
  const question = /^(?:что|как|какие|когда|сколько|зачем|почему)\s|^(?:можно|нужно) ли\s/u.test(q) || q.endsWith("?");
  const contactRequest = /^(?:(?:хочу|нужно|можно|дайте|покажите)\s+)?(?:связаться(?: с .+)?|позвонить(?: .+)?|контакты|телефон|оператор|менеджер|сотрудник)[.!?]*$/u.test(q);
  if (greeting || contactRequest || (question && /бриф|доступ|парол|подготов|материал|гарант|срок|входит|работ|контакт|связаться|позвон|договор|оплат|стоит|цен|тариф/u.test(q))) return undefined;
  const advance = (newPlan: AssistantPlan, forcedStep?: string) => {
    newPlan={...newPlan,attempts:undefined};
    if(newPlan.offer && !matchingPlanOffers(newPlan,catalog).some(item=>item.id===newPlan.offer))newPlan={...newPlan,preferredOffer:newPlan.offer,offer:undefined};
    let target=forcedStep??nextStep(newPlan);
    if(target==="plan-results" && newPlan.preferredOffer && matchingPlanOffers(newPlan,catalog).some(item=>item.id===newPlan.preferredOffer)) {
      if(newPlan.topic==="web-development" && !knownWebFunctions(newPlan))target="plan-requirements";
      else {if(!newPlan.unresolved?.some(item=>/Обязательные функции/u.test(item)))newPlan={...newPlan,offer:newPlan.preferredOffer,preferredOffer:undefined};target="plan-summary";}
    }
    return showStep(target,newPlan,[...history,{step,plan:originalPlan}].slice(-20),catalog);
  };
  const clarify=(message:string,known=p)=>{
    const attempts=(known.attempts??0)+1;
    const reply=showStep(step,{...known,attempts},history,catalog,message+"\n\n");
    if(attempts>=2){reply.text="Давайте упростим этот шаг. Можно выбрать предложенный ответ, сохранить резюме с известными условиями или обсудить вопрос с командой.\n\n"+reply.text;reply.suggestions=[...(reply.suggestions??[]).filter(item=>item!=="Отменить подбор"),"Подготовить резюме","Связаться с командой","Отменить подбор"];}
    return reply;
  };
  const advanceWithFacts = (newPlan: AssistantPlan) => {
    const deferred=p.deferredInput && newPlan.task?readPlanFacts(normalize(p.deferredInput),newPlan,step,p.deferredInput):undefined;
    const facts=readPlanFacts(q,{...(deferred?.plan??newPlan),firstStage:undefined,deferredInput:deferred?undefined:p.deferredInput},step,originalQuestion);
    if(deferred?.error && !facts.error) {facts.error=deferred.error;facts.errorStep=deferred.errorStep;}
    const pending=nextStep(facts.plan);
    const order=["plan-topic","plan-platform","plan-task","plan-ads-scope","plan-pages","plan-products","plan-regions","plan-cards","plan-materials","plan-unit","plan-budget","plan-timing","plan-results"];
    const errorStep=facts.errorStep && order.indexOf(facts.errorStep)<order.indexOf(pending)?facts.errorStep:pending;
    return facts.error ? showStep(errorStep,facts.plan,[...history,{step,plan:originalPlan}].slice(-20),catalog,facts.error+"\n\n") : advance(facts.plan);
  };
  if (q === "продолжить подбор") return step==="plan-compare"?advance({...p,compareRequested:undefined}):showStep(step,p,history,catalog);
  if(q==="другие задачи проекта")return showStep("plan-services",p,history,catalog);
  if(q.startsWith("перейти к задаче: ") || step==="plan-services" && !commonControl && !/^(?:сравнить|сравни|показать|покажи) тарифы/u.test(q)) {
    const topic=serviceFor(q.replace(/^перейти к задаче: /u,""),catalog);
    const task=p.projectTasks?.find(item=>item.topic===topic);
    if(!task)return showStep("plan-services",p,history,catalog,"Выберите одну из сохранённых задач проекта. ");
    const {projectTasks,projectBudget,activeTask,...current}=p;
    const tasks=projectTasks!.map(item=>item.id===activeTask?{...item,plan:current}:item);
    const option=taskFor(normalize(task.description),task.topic);
    const initial={...initialPlan(task.topic),...(option?{task:option[0],kind:option[1]}:{})};
    const local=task.plan??readPlanFacts(normalize(task.description),initial,"plan-topic",task.description).plan;
    return showStep(nextStep(local),{...local,description:local.description??task.description,projectTasks:tasks,projectBudget,activeTask:task.id},history,catalog);
  }
  if(q==="изменить обязательные требования")return advance({...p,offer:undefined,requirementsChecked:undefined},"plan-requirements");
  if (/^(?:сравнить|сравни|показать|покажи) тарифы/u.test(q)) {
    const requested=serviceFor(q,catalog);
    return advance({...requested&&requested!==p.topic?initialPlan(requested):p,compareRequested:true});
  }
  if (q === "изменить услугу" || q === "подобрать другую услугу") return showStep("plan-topic",p,[...history,{step,plan:originalPlan}].slice(-20),catalog,"Выберите новую услугу. Независимые условия сохранятся, объём проверим заново. ");
  if(/^изменить /u.test(q) && q!=="изменить тариф") p.compareRequested=undefined;
  if(q === "рассмотреть первый этап") {
    const firstStage=firstStageFor(p,catalog);
    return firstStage?advance({...p,firstStage},"plan-stage"):showStep(step,p,history,catalog,"Для этой задачи меньший опубликованный этап не найден. ");
  }
  if(q === "принять первый этап") {
    if(step!=="plan-stage" || !p.firstStage)return showStep(step,p,history,catalog,"Сейчас нет предложенного первого этапа. Условия полной задачи сохранены. ");
    const stage=p.firstStage;
    const current=firstStageFor(p,catalog);
    if(step!=="plan-stage" || !stage || current?.offer!==stage.offer || current.count!==stage.count || current.original!==stage.original) return showStep(current?"plan-stage":"plan-results",{...p,firstStage:current},history,catalog,"Состав первого этапа изменился. Проверьте текущие условия перед согласием. ");
    return advance({...p,[stage.field]:stage.count,offer:undefined,firstStage:undefined,fullScope:{field:stage.field,count:stage.original}});
  }
  if(q === "вернуться к полному объему") return advance({...p,...p.fullScope?{[p.fullScope.field]:p.fullScope.count,[`${p.fullScope.field}Answered`]:true}:{},firstStage:undefined,fullScope:undefined,offer:undefined},"plan-results");
  if (step === "plan-goal" && !commonControl) {
    const goal = goals.find(([label])=>normalize(label) === q);
    const inferred=goal?.[1]??serviceFor(q,catalog);
    if (!inferred) return clarify(servicesFor(q,catalog).length>1?"В сообщении несколько направлений. Выберите, с какого начнём.":"Пока не удалось определить задачу. Выберите ближайший вариант ниже.",{...p,deferredInput:p.deferredInput?`${p.deferredInput}; ${originalQuestion}`.slice(0,2000):originalQuestion});
    const option=taskFor(q,inferred);
    return advanceWithFacts({...initialPlan(inferred),compareRequested:p.compareRequested,...(option?{task:option[0],kind:option[1],...(option[1]==="free"?{budget:0,budgetAnswered:true}:{})}:{})});
  }
  const service = serviceFor(q,catalog);
  if ((step === "plan-topic" || step === "plan-platform") && !commonControl) {
    if (step === "plan-topic" && unknown(q)) return advance({},"plan-goal");
    const ids=servicesFor(q,catalog);
    if(ids.length>1 && !/\s(?:или|либо)\s/u.test(q))return showStep("plan-services",{description:originalQuestion,projectTasks:projectTasksFor(originalQuestion,ids,catalog),.../общий бюджет/u.test(q)?{projectBudget:{raw:originalQuestion,amount:parseAssistantBudget(q),allocationKnown:false}}:{}},history,catalog);
    if (!service || (step === "plan-platform" && !platforms.includes(service))) return step==="plan-platform"?clarify("Выберите одну из трёх площадок."):showStep("plan-goal",{...p,deferredInput:originalQuestion},history,catalog,ids.length>1?"Вы назвали несколько вариантов. Уточните, какая услуга нужна. ":"");
    const option=taskFor(q,service);
    const preserve:Partial<AssistantPlan>=p.topic && p.topic!==service?{timing:p.timing,description:p.description,outcome:p.outcome,dependencies:p.dependencies,requirements:p.requirements,projectTasks:p.projectTasks,activeTask:p.activeTask,projectBudget:p.projectBudget,...p.budgetUnit===(service==="seo-promotion"?"month":"project")?{budget:p.budget,budgetAnswered:p.budgetAnswered,budgetUnit:p.budgetUnit}:{}}:{};
    return advanceWithFacts({...initialPlan(service),...preserve,description:/нуж|хочу|существующ|доработ/u.test(q)?originalQuestion:preserve.description,compareRequested:p.compareRequested,...(option?{task:option[0],kind:option[1],budgetUnit:service==="yandex-ads" && option[1]==="support"?"month" as const:preserve.budgetUnit,...(option[1]==="free"?{budget:0,budgetAnswered:true}:{})}:{})});
  }
  if (service && service !== p.topic && (q===normalize(serviceNames[service]) || (platforms.includes(service) && !question) || /(?:сменить|вместо|лучше|другая услуга|теперь нужен)/u.test(q))) {
    const option=taskFor(q,service);
    return advanceWithFacts({...initialPlan(service),compareRequested:p.compareRequested,...(option?{task:option[0],kind:option[1]}:{})});
  }
  if (q === "изменить задачу") return advance({
    ...p, task: undefined, kind: undefined, offer: undefined, preferredOffer:undefined,compareRequested:undefined,adsScope: undefined, firstStage:undefined,fullScope:undefined,
    ...(p.fullScope?{[p.fullScope.field]:p.fullScope.count,[`${p.fullScope.field}Answered`]:true}:{}),
    ...(p.kind === "free" ? { budget: undefined, budgetAnswered: undefined } : {}),
  }, "plan-task");
  if (q === "изменить объем") {
    if (p.topic === "yandex-ads") return advance({...p,adsScope:undefined,offer:undefined,firstStage:undefined},"plan-ads-scope");
    if(p.topic==="custom-task" || p.topic==="web-development" && p.kind==="landing")return advance({...p,offer:undefined,requirementsChecked:undefined},"plan-requirements");
    p = {...p,pages:undefined,pagesAnswered:undefined,regions:undefined,regionsAnswered:undefined,cards:undefined,cardsAnswered:undefined,materials:undefined,materialsAnswered:undefined,products:undefined,productsAnswered:undefined,offer:undefined,firstStage:undefined,fullScope:undefined};
    return advance(p);
  }
  if (q === "изменить расчет бюджета") return platforms.includes(p.topic??"")?advance({...p,cardBudget:undefined,budgetUnit:undefined,budget:undefined,budgetAnswered:undefined,offer:undefined},"plan-unit"):clarify("Для этой услуги единица расчёта задана условиями тарифа. Можно изменить бюджет или тариф.");
  if (q === "изменить бюджет") return advance({...p,budget:undefined,budgetAnswered:undefined,budgetProposal:undefined,offer:undefined,firstStage:undefined},"plan-budget");
  if (q === "изменить срок") return advance({...p,timing:undefined},"plan-timing");
  if (q === "изменить тариф") return advance({...p,offer:undefined,preferredOffer:undefined,compareRequested:true});
  if(step==="plan-compare" && q.startsWith("выбрать тариф: ")) {
    const offer=catalog.find(item=>item.id===p.topic)?.offers.find(item=>normalize(`Выбрать тариф: ${item.title}`)===q);
    if(!offer) return showStep(step,p,history,catalog,"Этот тариф не найден для выбранной услуги. ");
    const c=offer.contract;
    const kind=c?.kind==="web-development"?c.productType:c?.kind==="seo-audit"?offer.amount===0?"free":c.implementationHours?"implementation":c.competitors==="included"?"strategy":"technical":c?.kind==="marketplaces"?marketplaceOfferWorkKind(offer.id):c?.kind==="yandex-ads"?offer.id.endsWith("-support")?"support":"setup":p.kind;
    const task=taskOptions(p.topic).find(([,id])=>id===kind)?.[0]??p.task;
    if(p.kind && kind!==p.kind)return advance({...p,compareRequested:undefined,offer:undefined,preferredOffer:offer.id},"plan-results");
    const changed=Boolean(p.kind && kind!==p.kind);
    const scoped=changed?{...p,adsScope:undefined,firstStage:undefined,fullScope:undefined,...p.fullScope?{[p.fullScope.field]:p.fullScope.count,[`${p.fullScope.field}Answered`]:true}:{}}:p;
    const marketplace=platforms.includes(p.topic??"");
    const differentUnit=!marketplace && scoped.budgetUnit && scoped.budgetUnit!==offer.billingUnit;
    return advanceWithFacts({...scoped,kind,task,compareRequested:undefined,offer:undefined,preferredOffer:offer.id,...differentUnit?{budget:undefined,budgetAnswered:undefined}:{},budgetUnit:marketplace?scoped.budgetUnit:offer.billingUnit,...kind==="free"?{budget:0,budgetAnswered:true}:{}});
  }
  const updatedTask=taskFor(q,p.topic);
  if(step!=="plan-task" && updatedTask && updatedTask[1]!==p.kind && /нуж|хочу|лучше|вместо|давайте/u.test(q)) {
    const editing=answerPlanQuestion("изменить задачу",catalog,selection,originalQuestion,previousTopic)!;
    return answerPlanQuestion(q,catalog,editing,originalQuestion,previousTopic);
  }
  if (q === "подготовить резюме" || q === "резюме без выбора тарифа" || q.startsWith("выбрать тариф: ")) {
    if (q.startsWith("выбрать тариф: ")) {
      const offer = matchingPlanOffers(p,catalog).find(offer=>normalize(`Выбрать тариф: ${offer.title}`) === q);
      if (!offer) return showStep("plan-results",p,history,catalog,"Этот тариф не соответствует текущим условиям подбора. ");
      if(p.topic==="web-development" && !knownWebFunctions(p))return advance({...p,preferredOffer:offer.id},"plan-requirements");
      if(p.unresolved?.some(item=>/Обязательные функции/u.test(item)))p={...p,preferredOffer:offer.id,offer:undefined};else p.offer = offer.id;
    }
    return advance(p,"plan-summary");
  }
  if(step==="plan-budget-confirm") {
    if(q==="использовать верхнюю границу" && p.budgetProposal?.upper!==undefined)return advance({...p,budget:p.budgetProposal.upper,budgetAnswered:true});
    if(q==="укажу другую сумму")return showStep("plan-budget",p,history,catalog,"Напишите максимальную сумму. ");
    if(unknown(q))return advance({...p,budgetAnswered:true,budget:undefined});
    const amount=parseAssistantBudget(q);if(amount!==undefined)return advance({...p,budget:amount,budgetAnswered:true});
    return clarify("Нужно подтвердить предел или указать другую сумму.");
  }
  if(step==="plan-ad-budget") {
    if(q==="укажу бюджет на работу")return showStep("plan-budget",{...p,requirements:{...p.requirements,adBudgetTotal:p.requirements?.adBudgetTotal}},history,catalog,"Напишите часть общего бюджета, выделенную на работу KILENI. ");
    if(q==="распределение нужно обсудить")return advance({...p,budget:undefined,budgetAnswered:true});
    const amount=parseAssistantBudget(q);if(amount!==undefined && amount<=(p.requirements?.adBudgetTotal??Infinity))return advance({...p,budget:amount,budgetAnswered:true});
    return clarify("Укажите сумму на работу в пределах общего бюджета или обсудите распределение.");
  }
  if(step==="plan-requirements") {
    if(q==="базовый состав подходит")return advance({...p,requirementsChecked:true});
    if(q==="требования нужно уточнить")return advance({...p,requirementsChecked:true,unresolved:[...new Set([...(p.unresolved??[]),"Обязательные функции нужно уточнить"])]});
    const facts=readPlanFacts(q,p,step,originalQuestion);
    if(facts.changed && !facts.error)return advance({...facts.plan,requirementsChecked:true});
    return clarify("Напишите обязательные функции или выберите, что требования нужно уточнить.",facts.plan);
  }
  if(step==="plan-outcome" || step==="plan-dependencies") {
    const facts=readPlanFacts(q,p,step,originalQuestion);
    if(facts.error)return showStep(facts.errorStep??step,facts.plan,history,catalog,facts.error+"\n\n");
    if(facts.changed && (parseAssistantBudget(q)!==undefined || readDesiredTiming(originalQuestion)))return advance(facts.plan);
    if(step==="plan-outcome")return originalQuestion.length>=5?advance({...facts.plan,outcome:originalQuestion},"plan-dependencies"):clarify("Опишите ожидаемый результат хотя бы несколькими словами.");
    return originalQuestion.length>=5?advance({...facts.plan,dependencies:originalQuestion}):clarify("Опишите зависимости или отметьте, что их нужно уточнить.");
  }
  if (step === "plan-task") {
    const option = taskFor(q,p.topic);
    if (option) {
      const unit = p.topic === "yandex-ads" && option[1] === "support" ? "month" : platforms.includes(p.topic ?? "") ? p.budgetUnit : "project";
      return advanceWithFacts({...p,task:option[0],kind:option[1],offer:undefined,budgetUnit:unit,...(p.budgetUnit && unit !== p.budgetUnit ? {budget:undefined,budgetAnswered:undefined} : {}),...(option[1] === "free" ? {budget:0,budgetAnswered:true} : {})});
    }
    if (!taskOptions(p.topic).length && q.length >= 10 && q.length <= 12000 && !unknown(q)) {
      const changed={...p,task:originalQuestion,description:originalQuestion,kind:p.topic === "seo-promotion" ? "promotion" : p.topic === "content-materials" ? "content" : "custom",offer:undefined};
      return p.topic==="custom-task"?advance(changed,"plan-outcome"):advanceWithFacts(changed);
    }
    const facts=readPlanFacts(q,p,step,originalQuestion);
    return clarify("Уточните, какой результат нужен. Остальные понятные условия сохранены.",facts.plan);
  }
  if (step === "plan-ads-scope") {
    const scope = /^(?:да|да, этот объем подходит|подходит|все подходит|да, подходит)[.!]*$/u.test(q) ? "confirmed" : /^(?:нужно больше работ|нет|не подходит|больше)[.!]*$/u.test(q) ? "custom" : q === "объем нужно уточнить" || unknown(q) ? "unknown" : undefined;
    return scope ? advance({...p,adsScope:scope,offer:undefined}) : clarify("Уточните, соответствует ли задача этому объёму.");
  }
  if(step!=="plan-timing" && step!=="plan-stage") {
    const facts=readPlanFacts(q,p,step,originalQuestion);
    if(facts.error) return showStep(facts.errorStep??step,facts.plan,history,catalog,facts.error+"\n\n");
    if(facts.changed) return advance(facts.plan);
  }
  const countFields: Record<string,["pages"|"regions"|"cards"|"materials"|"products","pagesAnswered"|"regionsAnswered"|"cardsAnswered"|"materialsAnswered"|"productsAnswered"]> = {"plan-pages":["pages","pagesAnswered"],"plan-regions":["regions","regionsAnswered"],"plan-cards":["cards","cardsAnswered"],"plan-materials":["materials","materialsAnswered"],"plan-products":["products","productsAnswered"]};
  if (countFields[step]) {
    const [field,answered] = countFields[step];
    const count = quantity(q, field);
    if (count === undefined && !unknown(q)) return clarify("Нужно одно целое положительное число, например «5». Если число неизвестно, выберите «Не знаю».");
    return advance({...p,[field]:count,[answered]:true,offer:undefined});
  }
  if (step === "plan-unit") {
    if (/^(?:общий бюджет на все карточки|на все|за все|общий бюджет|всего)$/u.test(q)) return advance({...p,cardBudget:"total",budgetUnit:"project",offer:undefined});
    if (/^(?:бюджет на один артикул|за одну|на одну|за один|на один|за карточку)$/u.test(q)) return advance({...p,cardBudget:"sku",budgetUnit:"sku",offer:undefined});
    return clarify("Уточните, к какому объёму относится сумма.");
  }
  if (step === "plan-budget") {
    if (q === "укажу свою сумму") return { ...showStep(step,p,history,catalog), text: `Напишите сумму в рублях ${budgetScope(p)}. Учту её при подборе состава работ.${p.topic === "yandex-ads" ? " Расходы на рекламу Яндекса в эту сумму не входят." : ""}`, suggestions: [...budgetChoices.slice(1), ...(history.length ? ["Назад"] : []), "Отменить подбор"] };
    if (q === "помогите оценить стоимость") return { ...showStep(step,p,history,catalog), text: budgetPriceReference(p,catalog), suggestions: [budgetChoices[0],budgetChoices[2],...(history.length ? ["Назад"] : []),"Отменить подбор"] };
    const typedUnit = assistantBudgetUnit(q);
    if (typedUnit && typedUnit !== (p.budgetUnit ?? "project")) return showStep(step,p,history,catalog,`Эта сумма указана ${unitNames[typedUnit]}, а сейчас нужен бюджет ${p.cardBudget === "total" ? "на все карточки" : unitNames[p.budgetUnit ?? "project"]}. Укажите бюджет для текущего расчёта.\n\n`);
    const budget = parseAssistantBudget(q);
    if (budget === undefined && !unknown(q)) return clarify("Укажите одну сумму в рублях или выберите «Сначала подберите подходящий вариант».");
    return advance({...p,budget,budgetAnswered:true,budgetUnit:p.budgetUnit ?? "project",offer:undefined});
  }
  if (step === "plan-timing") {
    if (q === "укажу дату готовности" || q === "укажу дату начала") return { ...showStep(step,p,history,catalog), text: `Напишите дату, ${askingForStart(p) ? "когда хотите начать работу" : "к которой нужна готовая работа"}, в формате ДД.ММ.ГГГГ. Можно указать желаемый срок словами.`, suggestions: [askingForStart(p) ? "Начать как можно скорее" : "Как можно скорее",askingForStart(p) ? "Дату старта согласуем" : "Срок согласуем",...(history.length ? ["Назад"] : []),"Отменить подбор"] };
    const suppliedTiming = readDesiredTiming(originalQuestion);
    const businessGoal=/заявк|позици|продаж|трафик|результат/u.test(q) && askingForStart(p);
    const timing=q.length<=200
      ? askingForStart(p) && !businessGoal && suppliedTiming && suppliedTiming.text !== "Срок пока не определён" && !suppliedTiming.start
        ? readDesiredTiming(`Начать ${originalQuestion}`)
        : suppliedTiming
      : undefined;
    if(!timing || timing.error) return showStep(step,p,history,catalog,(timing?.error??`Напишите ${askingForStart(p) ? "дату начала работы" : "дату готовности или желаемый срок"} либо выберите «${askingForStart(p) ? "Дату старта согласуем" : "Срок согласуем"}».`)+"\n\n");
    return advance({...p,timing:timing.text,...businessGoal?{outcome:originalQuestion}:{}}, p.offer ? "plan-summary" : undefined);
  }
  return clarify("Можно изменить условия, выбрать подходящий тариф или подготовить резюме.");
}
