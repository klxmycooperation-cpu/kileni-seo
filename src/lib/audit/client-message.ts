import type { AuditClientIssue, AuditClientPresentation } from "./client-presentation";

type GenerateAuditClientMessageInput = {
  domain: string;
  presentation: AuditClientPresentation;
  variant?: number;
};

const introductions = [
  (domain: string, checked: number, selected: number) =>
    `Здравствуйте! Проверили публичные страницы сайта ${domain}: подробно проверено ${checked} из ${selected} выбранных страниц.`,
  (domain: string, checked: number, selected: number) =>
    `Здравствуйте! Готова проверка сайта ${domain}. Мы подробно проверили ${checked} из ${selected} выбранных страниц.`,
  (domain: string, checked: number, selected: number) =>
    `Здравствуйте! Завершили проверку сайта ${domain}. В подробную проверку вошли ${checked} из ${selected} выбранных страниц.`,
] as const;

const closings = [
  "После исправлений рекомендуем повторить проверку этих же страниц и убедиться, что замечания устранены.",
  "Начать лучше с первого пункта, затем пройти остальные и повторно проверить изменённые страницы.",
  "После внесения изменений стоит снова проверить те же страницы и сравнить результат.",
] as const;

export function generateAuditClientMessage({
  domain,
  presentation,
  variant = 0,
}: GenerateAuditClientMessageInput): string {
  const safeVariant = Math.abs(Math.trunc(variant)) % introductions.length;
  const safeDomain = clean(domain) || "проверенного сайта";
  const checked = nonNegativeInteger(presentation.summary.checked);
  const selected = Math.max(checked, nonNegativeInteger(presentation.summary.selected));
  const issues = prioritizedIssues(presentation.issues).slice(0, 3);
  const paragraphs = [introductions[safeVariant](safeDomain, checked, selected)];

  if (!issues.length) {
    paragraphs.push("В проверенной выборке критических проблем не обнаружено.");
    const strength = clean(presentation.strengths[0]);
    if (strength) paragraphs.push(`Что уже в порядке: ${sentence(strength)}`);
    paragraphs.push("Если на сайте есть другие важные разделы, их лучше проверить отдельно: бесплатная проверка охватывает только выбранные страницы.");
    return paragraphs.join("\n\n");
  }

  paragraphs.push("В первую очередь рекомендуем исправить:");
  paragraphs.push(issues.map((issue, index) => issueParagraph(issue, index + 1)).join("\n\n"));
  paragraphs.push(closings[safeVariant]);
  paragraphs.push("Проверка охватывает выбранные публичные страницы и не заменяет данные систем аналитики и поисковых кабинетов.");
  return paragraphs.join("\n\n");
}

function prioritizedIssues(issues: readonly AuditClientIssue[]): AuditClientIssue[] {
  const order = { critical: 0, review: 1, optional: 2 } as const;
  return [...issues]
    .filter((issue) => issue.kind !== "optional" || !issues.some((item) => item.kind !== "optional"))
    .sort((left, right) => order[left.kind] - order[right.kind]);
}

function issueParagraph(issue: AuditClientIssue, index: number): string {
  const title = clean(issue.title) || "Замечание по странице";
  const whatFound = sentence(clean(issue.whatFound));
  const whyImportant = sentence(clean(issue.whyImportant));
  const nextStep = sentence(clean(issue.nextStep));
  return `${index}. ${title}\n${whatFound} ${whyImportant}\nЧто сделать: ${nextStep}`.trim();
}

function clean(value: string | undefined): string {
  return (value ?? "").replace(/\s+/gu, " ").trim().slice(0, 2_000);
}

function sentence(value: string): string {
  if (!value) return "";
  return /[.!?…]$/u.test(value) ? value : `${value}.`;
}

function nonNegativeInteger(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}
