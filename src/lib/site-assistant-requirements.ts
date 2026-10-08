import type { AssistantOffer } from "./site-assistant";

export function marketplaceOfferWorkKind(id: string): "analysis" | "optimization" | "turnkey" | undefined {
 if(id.endsWith("-audit"))return "analysis";
 if(id.endsWith("-optimization"))return "optimization";
 if(id.endsWith("-turnkey"))return "turnkey";
}
import type { AssistantPlan } from "./site-assistant-plan";

export function normalizeAssistantIntent(text: string): string {
 return text.toLocaleLowerCase("ru").replace(/ё/gu,"е").trim()
  .replace(/(?<![а-я])(?:лендиг|лендингг)(?![а-я])/gu,"лендинг")
  .replace(/(?<![а-я])разроботка(?![а-я])/gu,"разработка")
  .replace(/(?<![а-я])продвежение(?![а-я])/gu,"продвижение")
  .replace(/(?<![а-я])аудт(?![а-я])/gu,"аудит");
}

export type AssistantRequirements = {
 languages?:number; blocks?:number; forms?:number; templates?:number;
 onlinePayment?:boolean; cart?:boolean; delivery?:boolean; integrations?:boolean; accounts?:boolean; roles?:boolean; migration?:boolean;
 existingSite?:boolean; siteReady?:boolean; materialsReady?:boolean; designReady?:boolean;
 publishing?:boolean; imagesOnly?:boolean; frames?:number; editHours?:number;
 textLength?:number; textType?:string; editing?:boolean; sourcesReady?:boolean; factsReady?:boolean;
 campaigns?:number; services?:number; groups?:number; adSpend?:number; adBudgetTotal?:number;
};
const numberWords:Record<string,number>={ноль:0,один:1,одна:1,одну:1,одном:1,одного:1,два:2,две:2,двух:2,три:3,трех:3,четыре:4,четырех:4,пять:5,пяти:5,шесть:6,шести:6,семь:7,семи:7,восемь:8,восьми:8,девять:9,девяти:9,десять:10,десяти:10,одиннадцать:11,двенадцать:12,тринадцать:13,четырнадцать:14,пятнадцать:15,шестнадцать:16,семнадцать:17,восемнадцать:18,девятнадцать:19,двадцать:20,тридцать:30,сорок:40,пятьдесят:50,шестьдесят:60,семьдесят:70,восемьдесят:80,девяносто:90,сто:100,двести:200,триста:300,четыреста:400,пятьсот:500,шестьсот:600,семьсот:700,восемьсот:800,девятьсот:900,тысяча:1000,тысячи:1000,тысяч:1000,миллион:1000000,миллиона:1000000,миллионов:1000000};
export function normalizeAssistantNumbers(text:string):string {
 const words=Object.keys(numberWords).sort((a,b)=>b.length-a.length).join("|");
 const pattern=new RegExp(`(?<![а-я])(?:${words})(?:\\s+(?:${words}))*(?![а-я])`,"gu");
 return text.toLowerCase().replace(/ё/gu,"е").replace(pattern,phrase=>{
  const values=phrase.split(/\s/u).map(word=>numberWords[word]);
  // Keep a standalone currency multiplier so digit + thousand keeps its unit.
  if(values.length===1 && values[0]>=1000)return phrase;
  let total=0,current=0;for(const n of values){if(n>=1000){total+=(current||1)*n;current=0;}else current+=n;}return String(total+current);
 });
}
export function affirmativeTaskText(text:string):string {
 return text.split(/[,;.!]|\s+(?:но|а)\s+/u).filter(part=>!/(?:не (?:нуж|хочу|требуется)|(?:реклам|новый сайт).{0,12}не нуж|^\s*не новый сайт)/u.test(part)).join(", ");
}
const requirementLabels:Record<keyof AssistantRequirements,string>={languages:"Языков",blocks:"Блоков",forms:"Форм",templates:"Шаблонов страниц",onlinePayment:"Онлайн-оплата",cart:"Корзина",delivery:"Доставка",integrations:"Интеграции",accounts:"Личный кабинет",roles:"Роли пользователей",migration:"Перенос данных",existingSite:"Работа с существующим сайтом",siteReady:"Сайт готов",materialsReady:"Материалы готовы",designReady:"Дизайн готов",publishing:"Публикация",imagesOnly:"Только изображения",frames:"Кадров",editHours:"Часов правок",textLength:"Символов в материале",textType:"Вид материала",editing:"Редактура готового текста",sourcesReady:"Исходные данные готовы",factsReady:"Факты подтверждены",campaigns:"Кампаний",services:"Услуг для рекламы",groups:"Групп объявлений",adSpend:"Рекламные расходы Яндекса",adBudgetTotal:"Общий бюджет рекламы и работы"};
export function requirementSummary(requirements:AssistantRequirements={}):string {
 const readiness=new Set(["existingSite","siteReady","materialsReady","designReady","sourcesReady","factsReady"]);
 return (Object.entries(requirements) as [keyof AssistantRequirements,number|string|boolean][]).map(([key,value])=>`${requirementLabels[key]}: ${typeof value==="boolean"?(readiness.has(key)?value?"да":"нет":value?"нужно":"не требуется"):value}`).join("; ");
}
export function extractAssistantRequirements(text:string,current:AssistantRequirements={}):{requirements:AssistantRequirements;changed:boolean;errors:string[]} {
 const q=normalizeAssistantNumbers(text), requirements={...current},errors:string[]=[];let changed=false;
 const counts:Partial<Record<keyof AssistantRequirements,string>>={languages:"язык(?:а|ов|ах)?",blocks:"блок(?:а|ов)?",forms:"форм(?:а|ы|у)?",templates:"шаблон(?:а|ов)?",frames:"кадр(?:а|ов)?",editHours:"час(?:а|ов)?\\s+(?:правок|исправлений|внедрения)",textLength:"(?:символ(?:а|ов)?|знак(?:а|ов)?)",campaigns:"кампан(?:ия|ии|ий)",services:"услуг(?:а|и|у)?",groups:"групп(?:а|ы)?"};
 for(const [key,unit] of Object.entries(counts)) {
  if(new RegExp(`(?:^|\\s)[−–—-]\\s*\\d+\\s+${unit}(?=$|[\\s,.!?;])`,"u").test(q)){errors.push(`Укажите одно положительное число: ${requirementLabels[key as keyof AssistantRequirements].toLowerCase()}.`);continue;}
  const matches=[...q.matchAll(new RegExp(`(?<![\\d.,−–—-])(\\d{1,6})\\s+${unit}(?=$|[\\s,.!?;])`,"gu"))];
  if(!matches.length)continue;
  if(matches.length>1 || Number(matches[0][1])<1 || /\d\s*(?:или|либо|[-–—])\s*\d/u.test(q)){errors.push(`Укажите одно положительное число: ${requirementLabels[key as keyof AssistantRequirements].toLowerCase()}.`);continue;}
  Object.assign(requirements,{[key]:Number(matches[0][1])});changed=true;
 }
 const flags:Partial<Record<keyof AssistantRequirements,RegExp>>={onlinePayment:/онлайн[\s-]*оплат|оплат.{0,8}(?:картой|на сайте)/u,cart:/корзин/u,delivery:/доставк/u,integrations:/интеграц|crm|срм|1с|битрикс/u,accounts:/личн.{0,8}кабинет|авторизац/u,roles:/роли пользователей|разные роли/u,migration:/перенос|миграци/u,publishing:/публикац|публиковать|обновлять карточк/u,imagesOnly:/только.{0,12}(?:изображ|картин|визуал|инфограф)/u,editing:/редактур|редактир.{0,12}(?:готов|существующ)/u,existingSite:/существующ|уже есть сайт|есть интернет.магазин|чужой аудит/u};
 for(const [key,pattern] of Object.entries(flags)) {
  const match=q.match(pattern);if(!match)continue;
  const before=q.slice(0,match.index??0),after=q.slice((match.index??0)+match[0].length);
  const clause=before.split(/[,;]|\s+(?:но|а)\s+/u).at(-1)+match[0]+after.split(/[,;]|\s+(?:но|а)\s+/u)[0];
  const value=!/(?:без\s|не нуж|не треб|не надо)/u.test(clause);
  Object.assign(requirements,{[key]:value});changed=true;
 }
 if(/сайт.{0,12}(?:еще разрабатывается|еще не готов|в разработке)/u.test(q)){requirements.siteReady=false;changed=true;}
 if(/сайт готов|готовый сайт/u.test(q)){requirements.siteReady=true;changed=true;}
 if(/материал(?:ы|ов).{0,12}(?:нет|не готов)/u.test(q)){requirements.materialsReady=false;changed=true;}
 if(/(?:тексты|материалы|фото).{0,12}(?:готов|есть)/u.test(q)){requirements.materialsReady=true;changed=true;}
 if(/дизайн.{0,8}(?:есть|готов)/u.test(q)){requirements.designReady=true;changed=true;}
 if(/(?:исходные данные|источники).{0,8}(?:есть|готов)/u.test(q)){requirements.sourcesReady=true;changed=true;}
 if(/(?:исходных данных|источников).{0,8}нет/u.test(q)){requirements.sourcesReady=false;changed=true;}
 if(/факты.{0,8}не.{0,3}(?:подтвержден|проверен)/u.test(q)){requirements.factsReady=false;changed=true;}
 if(/факты.{0,8}(?:подтвержден|проверен)/u.test(q) && !/факты.{0,8}не/u.test(q)){requirements.factsReady=true;changed=true;}
 if(/статья|статьи/u.test(q)){requirements.textType="Статья";changed=true;}
 else if(/текст.{0,12}(?:услуг|страниц)/u.test(q)){requirements.textType="Текст страницы услуги";changed=true;}
 changed=changed && JSON.stringify(requirements)!==JSON.stringify(current);
 return {requirements,changed,errors};
}
export function assessOfferRequirements(offer:AssistantOffer,p:AssistantPlan):{suitable:boolean;reasons:string[];pending:string[]} {
 const r=p.requirements??{},c=offer.contract,reasons:string[]=[],pending:string[]=[];
 if(!c)return {suitable:false,reasons:["Условия тарифа нужно уточнить."],pending:[]};
 if(p.unresolved?.some(item=>/Обязательные функции/u.test(item)))pending.push("Обязательные функции нужно уточнить до подтверждения подходящего тарифа.");
 const limit=(value:number|undefined,max:number|null|undefined,label:string)=>{if(value!==undefined && max!==undefined && max!==null && value>max)reasons.push(`Тариф включает до ${max} ${label}, требуется ${value}.`);};
 if(c.kind==="seo-audit") {
  limit(p.pages,c.urls,"страниц");
  if(p.kind==="free" && offer.amount!==0 || p.kind && p.kind!=="free" && offer.amount===0)reasons.push("Предварительная бесплатная проверка и полный аудит решают разные задачи.");
  if(p.kind==="implementation" && !c.implementationHours)reasons.push("Внедрение исправлений не входит в этот вариант.");
  if(p.kind==="technical" && c.implementationHours)pending.push("Этот вариант включает внедрение; клиенту нужен только отчёт.");
  if(p.kind==="strategy" && c.competitors!=="included")reasons.push("План продвижения с анализом конкурентов требует другого состава работ.");
  if(p.pages===undefined && p.kind!=="free")pending.push("Количество страниц ещё не известно.");
 }
 if(c.kind==="seo-promotion") {limit(p.pages,c.pages,"страниц в месяц");limit(p.regions,c.regions,"регионов");if(p.pages===undefined || p.regions===undefined)pending.push("Нужно уточнить ежемесячный объём страниц и регионы.");}
 if(c.kind==="marketplaces") {if(p.kind && marketplaceOfferWorkKind(offer.id)!==p.kind)reasons.push("Состав тарифа отличается от выбранного вида работы.");if(p.cards===undefined)pending.push("Число артикулов ещё не известно.");}
 if(c.kind==="yandex-ads") {
  if(p.kind==="custom" || p.adsScope==="custom")reasons.push("Для этой задачи нужен индивидуальный состав рекламных работ.");
  if(p.kind==="setup" && !offer.id.endsWith("-setup") || p.kind==="support" && !offer.id.endsWith("-support"))reasons.push("Запуск и ведение рекламы — разные виды работ и расчёта стоимости.");
  if(!p.adsScope || p.adsScope==="unknown")pending.push("Объём рекламных работ ещё не подтверждён.");
 }
 if(c.kind==="content-materials" && p.materials===undefined)pending.push("Количество материалов ещё не известно.");
 if(offer.amount!==null && p.budget!==undefined) {
  const count=c.kind==="marketplaces" && p.cardBudget==="total"?p.cards:c.kind==="content-materials"?p.materials:1;
  if(count!==undefined && offer.amount*count>p.budget)reasons.push(`${offer.priceType==="from"?"Начальная стоимость":"Стоимость"} выбранного объёма превышает указанный бюджет.`);
 }
 if(c.kind==="web-development") {
  if(p.kind && p.kind!==c.productType) reasons.push("Формат тарифа отличается от выбранной задачи.");
  if(p.pages && c.pages!==null && p.pages>c.pages)reasons.push(`Тариф включает до ${c.pages} страниц, требуется ${p.pages}.`);
  if(p.products && c.products!==null && c.products!==undefined && p.products>c.products)reasons.push(`Тариф включает до ${c.products} товаров, требуется ${p.products}.`);
  if(r.templates && (c.templates===null || r.templates>c.templates))reasons.push(`Нужно ${r.templates} шаблонов; ${c.templates===null?"их число согласуем отдельно":`тариф включает ${c.templates}`}.`);
  // These bounds are published in the landing scope, not guessed for other products.
  const scope=offer.scope.toLowerCase();
  const languages=/на одном языке|one language/u.test(scope)?1:undefined;
  const blocks=Number(scope.match(/до (\d+) блок|up to (\d+) sections/u)?.slice(1).find(Boolean))||undefined;
  const forms=Number(scope.match(/(?:и|and) (\d+) форм|(?:and) (\d+) form/u)?.slice(1).find(Boolean))||undefined;
  for(const [key,limit,name] of [["languages",languages,"языков"],["blocks",blocks,"блоков"],["forms",forms,"форм"]] as const){const n=r[key];if(n && (limit===undefined || n>limit))reasons.push(limit===undefined?`Количество ${name} нужно оценить отдельно.`:`Нужно ${n} ${name}, тариф включает ${limit}.`);}
  if(r.onlinePayment)reasons.push("Онлайн-оплата оценивается отдельно и не включена в базовый тариф.");
  if(r.cart && c.productType!=="catalogue-or-shop")reasons.push("Корзина не входит в опубликованный состав этого варианта.");
  if(r.delivery)reasons.push("Доставка оценивается отдельно.");
  if(r.integrations)reasons.push(c.integrations==="excluded"?"Интеграции не входят в этот тариф.":"Интеграции нужно согласовать и оценить отдельно.");
  if(r.accounts || r.roles)reasons.push("Личный кабинет, авторизация и роли требуют индивидуальной оценки.");
  if(r.migration)reasons.push("Перенос существующих данных требует отдельной оценки.");
  if(r.materialsReady===false)pending.push("Нужно согласовать подготовку материалов; отсчёт срока начинается после их получения.");
  if(!p.requirementsChecked && !Object.keys(r).length)pending.push("Обязательные функции ещё не уточнены. Выбор тарифа потребует проверки.");
  if(c.productType==="company-site" && p.pages===undefined || c.productType==="catalogue-or-shop" && p.products===undefined)pending.push("Объём сайта ещё нужно уточнить.");
 }
 if(c.kind==="marketplaces") {
  if(r.publishing && c.publishing!=="included")reasons.push("Публикация и обновление карточек не входят в этот тариф.");
  if(r.imagesOnly)reasons.push("Работу только с изображениями нужно оценить отдельно; опубликованный вариант включает и текст.");
  if(r.frames && (c.frames===null || r.frames>c.frames))reasons.push(c.frames===null?"Оформление изображений не входит в этот вариант.":`Тариф включает до ${c.frames} кадров, нужно ${r.frames}.`);
 }
 if(c.kind==="seo-audit") {
  if(r.existingSite && /чужой аудит/u.test(p.description??""))reasons.push("Исправления по чужому аудиту нужно сначала оценить; тариф включает собственную проверку.");
  if(r.editHours && (c.implementationHours===null || r.editHours>c.implementationHours))reasons.push(c.implementationHours===null?"Внедрение исправлений не входит в этот вариант.":`Включено до ${c.implementationHours} часов правок; требуется ${r.editHours}.`);
  if(r.templates && c.templates!=="included")reasons.push("Проверка повторяющихся шаблонов не входит в бесплатную проверку.");
 }
 if(c.kind==="seo-promotion") {
  if(r.siteReady===false)reasons.push("Для продвижения нужен готовый сайт; начало работы согласуем после разработки.");
  if(p.materials && c.materials!==null && p.materials>c.materials)reasons.push(`В месяц включено ${c.materials} материалов, требуется ${p.materials}.`);
  if(r.editHours && (c.editHours===null || r.editHours>c.editHours))reasons.push(`Объём правок ${r.editHours} часов нужно оценить отдельно.`);
  if(r.publishing && c.publishing!=="included")reasons.push("Публикацию материалов согласуем отдельно.");
 }
 if(c.kind==="yandex-ads") {
  for(const [key,limit,name] of [["services",c.services,"услуг"],["campaigns",c.campaigns,"кампаний"],["groups",c.groups,"групп объявлений"]] as const){if(r[key] && (typeof limit!=="number" || r[key]!>limit))reasons.push(typeof limit==="number"?`Тариф включает до ${limit} ${name}, нужно ${r[key]}.`:`Количество ${name} требует отдельного согласования.`);}
  if(p.regions && (typeof c.regions!=="number" || p.regions>c.regions))reasons.push(`Количество регионов ${p.regions} нужно оценить отдельно.`);
  if(r.siteReady===false)pending.push("Перед запуском нужно подготовить сайт и цели аналитики.");
 }
 if(c.kind==="content-materials") {
  if(r.publishing && c.publishing!=="included")reasons.push("Публикация материалов не входит в тариф.");
  if(r.editing)reasons.push("Редактура готового текста оценивается отдельно от подготовки нового материала.");
  if(r.textLength)pending.push(`Объём ${r.textLength} символов на материал нужно подтвердить: тариф не устанавливает универсальный лимит.`);
  if(r.sourcesReady===false || r.factsReady===false)pending.push("До работы нужны исходные данные и подтверждённые факты клиента.");
 }
 return {suitable:reasons.length===0,reasons:[...new Set(reasons)],pending:[...new Set(pending)]};
}
