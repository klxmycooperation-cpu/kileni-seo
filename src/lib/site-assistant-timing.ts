import type { AssistantOffer } from "./site-assistant";

type DesiredTiming = { text: string; days?: number; workingDays?: number; start?: boolean; urgent?: boolean; error?: string };
const wordNumbers: Record<string, number> = { один:1, одну:1, одной:1, два:2, две:2, двух:2, три:3, трех:3, четыре:4, четырех:4, пять:5, пяти:5, шесть:6, семь:7, десять:10 };
function today() {
  const parts = new Intl.DateTimeFormat("en", {timeZone:"Europe/Moscow",year:"numeric",month:"numeric",day:"numeric"}).formatToParts(new Date());
  const n = (type: string) => Number(parts.find(part=>part.type===type)?.value);
  return Date.UTC(n("year"), n("month")-1, n("day"));
}
export function readDesiredTiming(raw: string): DesiredTiming | undefined {
  const q = raw.toLowerCase().replace(/ё/gu,"е").trim().replace(/[.!]+$/u,"");
  if(/(?:или|либо)/u.test(q) || (q.match(/\d{1,2}[./]\d{1,2}/gu)??[]).length>1 || (q.match(/(?:^|\s)(?:через|в течение)\s/gu)??[]).length>1 || (/начать|старт/u.test(q) && /готов|результат|заверш|законч/u.test(q))) return undefined;
  if (/^(?:срок пока не определен|не знаю|пока не знаю|не срочно|без спешки|когда получится|после согласования|срок не определен|срок согласуем|дату старта согласуем)$/u.test(q)) return {text:"Срок пока не определён"};
  const start = /начать|старт|приступить|начало работы/u.test(q);
  const namedMonths=["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];
  const namedDate=q.match(new RegExp(`(?:^|\\s)(\\d{1,2})\\s+(${namedMonths.join("|")})(?:\\s+(\\d{4}))?(?:$|\\s)`,"u"));
  const date = q.match(/(?:^|\s)(\d{1,2})[./](\d{1,2})(?:[./](\d{4}))?(?:$|\s)/u) ?? (namedDate?[namedDate[0],namedDate[1],String(namedMonths.indexOf(namedDate[2])+1),namedDate[3]]:undefined);
  if (date) {
    const now = today();
    const year = date[3] ? Number(date[3]) : new Date(now).getUTCFullYear();
    const month = Number(date[2])-1, day = Number(date[1]);
    const target = Date.UTC(year,month,day);
    const d = new Date(target);
    if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month || d.getUTCDate() !== day) return {text:raw,error:"Такой даты нет в календаре. Укажите другую дату, например «до 20.11.2026»."};
    if (target < now) return {text:raw,error:"Эта дата уже прошла. Укажите будущую дату или согласуем срок по объёму задачи."};
    return {text:raw,days:Math.round((target-now)/86400000),start};
  }
  if (/\d\s*[-–]\s*\d/u.test(q)) return undefined;
  if (/сегодня|завтра|послезавтра/u.test(q)) return {text:raw,days:/послезавтра/u.test(q)?2:/завтра/u.test(q)?1:0,start};
  if (/^(?:очень )?срочно$|как можно скорее/u.test(q)) return {text:raw,urgent:true,start};
  const relative = q.match(/(?:через|за|в течение|не позднее чем через|нужен?о? через)\s+(\d{1,3}|один|одну|одной|два|две|двух|три|трех|четыре|четырех|пять|пяти|шесть|семь|десять)?\s*(рабоч(?:ий|их|ие|его)\s+)?(день|дня|дней|недел[юьи]|месяц(?:а|ев)?)/u);
  if (relative) {
    const n = relative[1] ? Number(relative[1]) || wordNumbers[relative[1]] : 1;
    if (!n) return undefined;
    return {text:raw,start,...(relative[2] ? {workingDays:n} : {days:n*(relative[3].startsWith("недел")?7:relative[3].startsWith("месяц")?30:1)})};
  }
  if (/к концу (?:этого )?месяца/u.test(q)) {
    const now=today(), d=new Date(now), end=Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0);
    return {text:raw,days:Math.round((end-now)/86400000),start};
  }
  return undefined;
}
export function desiredTimingAdvice(timing: string | undefined, offers: AssistantOffer[]): string {
  if (!timing || timing === "Срок пока не определён") return "";
  const desired=readDesiredTiming(timing);
  if (!desired || desired.error) return "Желаемую дату нужно уточнить: срок оценён без её учёта.";
  if (desired.start) return "Вы указали желаемое начало работы. Дату старта согласуем с командой; срок выполнения считается отдельно.";
  if (!offers.length) return "";
  if (desired.urgent) return "Срочную задачу нужно обсудить с командой: помощник не подтверждает ускоренный срок.";
  const weekdays = (days: number) => {
    const now=today(); let total=Math.floor(days/7)*5;
    for (let i=1;i<=days%7;i++) {const day=new Date(now+i*86400000).getUTCDay(); if(day!==0 && day!==6) total++;}
    return total;
  };
  const tight=offers.filter(offer=>{
    const range=offer.duration.match(/(\d+)(?:[–-](\d+))?\s*(?:рабочих?\s+)?дн|(?:Обычно\s+)?(\d+)(?:[–-](\d+))?\s*день/iu);
    if (!range) return false;
    const max=Number(range[2]??range[4]??range[1]??range[3]);
    const available=/рабоч/u.test(offer.duration) ? desired.workingDays??weekdays(desired.days??0) : desired.days??Math.ceil((desired.workingDays??0)*7/5);
    return available<max;
  });
  if (tight.length) return `Желаемый срок короче срока тарифа: ${tight.map(offer=>`${offer.title} — ${offer.duration}`).join("; ")}. Возможность ускорения нужно обсудить с командой.`;
  if (offers.some(offer=>!/\d.*(?:дн|день|минут)/u.test(offer.duration) && !/Ежемесяч/u.test(offer.duration))) return "Для этой работы срок нужно уточнить после проверки проекта.";
  if (offers.some(offer=>/Ежемесяч/u.test(offer.duration))) return "Продвижение и ведение рекламы — регулярная работа. Срок получения заявок или позиций не гарантируется.";
  return "Срок тарифа — ориентир. Дату готовности подтвердим после брифа и получения материалов.";
}
