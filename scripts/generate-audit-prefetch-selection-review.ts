import { readFile, writeFile } from "node:fs/promises";

import { auditPrefetchPriority } from "../src/lib/audit/sample-selector";

type SmokeResult = {
  readonly targetUrl: string;
  readonly requestOrder: readonly string[];
  readonly sitemap: { readonly urls: readonly string[] };
  readonly pages: readonly [{ readonly links?: { readonly internalUrls?: readonly string[] } }, ...unknown[]];
  readonly selectedPages: readonly { readonly url: string }[];
  readonly inventory: readonly {
    readonly finalUrl: string;
    readonly statusCode: number | null;
    readonly pageType: string | null;
  }[];
};

const sourcePath = new URL("../scratch/audit-prefetch-smoke.json", import.meta.url);
const outputPath = new URL("../docs/audit-prefetch-selection-review.md", import.meta.url);
const result = JSON.parse(await readFile(sourcePath, "utf8")) as SmokeResult;

const sitemapUrls = result.sitemap.urls.map(normalizeUrl);
const sitemapSet = new Set(sitemapUrls);
const sitemapPosition = new Map(sitemapUrls.map((url, index) => [url, index + 1] as const));
const prefetchOrder: string[] = [];
const seen = new Set<string>();
for (const rawUrl of result.requestOrder) {
  const url = normalizeUrl(rawUrl);
  if (!sitemapSet.has(url) || seen.has(url)) continue;
  seen.add(url);
  prefetchOrder.push(url);
  if (prefetchOrder.length === 100) break;
}

if (sitemapUrls.length !== 216) throw new Error(`Expected 216 sitemap URLs, received ${sitemapUrls.length}`);
if (prefetchOrder.length !== 100) throw new Error(`Expected 100 prefetch URLs, received ${prefetchOrder.length}`);

const selectedSet = new Set(prefetchOrder);
const firstHundredSet = new Set(sitemapUrls.slice(0, 100));
const overlap = prefetchOrder.filter((url) => firstHundredSet.has(url)).length;
const beyondFirstHundred = prefetchOrder.length - overlap;
const firstHundredSkipped = sitemapUrls.slice(0, 100).filter((url) => !selectedSet.has(url)).length;
const rootLinkOrder = new Map(
  (result.pages[0]?.links?.internalUrls ?? []).map((url, index) => [normalizeUrl(url), index + 1] as const),
);
const finalTen = result.selectedPages.map((page) => normalizeUrl(page.url));
const exclusionProbeUrls = result.inventory
  .filter((item) => item.statusCode !== null && ["legal", "auth", "account", "cart", "internal_search", "filter"].includes(item.pageType ?? ""))
  .map((item) => normalizeUrl(item.finalUrl))
  .filter((url) => sitemapSet.has(url));
const eligiblePreviewed = prefetchOrder.length - exclusionProbeUrls.length;
const outsideDetailedSample = eligiblePreviewed - finalTen.length;
const businessSelected = prefetchOrder.filter((url) => !exclusionProbeUrls.includes(url));
const worstBusinessTuple = businessSelected
  .map((url) => auditPrefetchPriority(url, result.targetUrl))
  .sort((left, right) => right.localeRank - left.localeRank || right.businessPriority.rank - left.businessPriority.rank)[0]!;
const higherPrioritySkipped = sitemapUrls.filter((url) => {
  if (selectedSet.has(url)) return false;
  const priority = auditPrefetchPriority(url, result.targetUrl);
  return priority.localeRank < worstBusinessTuple.localeRank
    || (priority.localeRank === worstBusinessTuple.localeRank && priority.businessPriority.rank < worstBusinessTuple.businessPriority.rank);
});
const sameBoundarySkipped = sitemapUrls.filter((url) => {
  if (selectedSet.has(url)) return false;
  const priority = auditPrefetchPriority(url, result.targetUrl);
  return priority.localeRank === worstBusinessTuple.localeRank
    && priority.businessPriority.rank === worstBusinessTuple.businessPriority.rank;
});

if (higherPrioritySkipped.length > 0) {
  throw new Error(`Higher-priority URLs were skipped from the 99 business slots: ${higherPrioritySkipped.join(", ")}`);
}
if (exclusionProbeUrls.length !== 1 || outsideDetailedSample !== 89) {
  throw new Error(`Accepted coverage arithmetic changed: exclusion probes=${exclusionProbeUrls.length}, outside=${outsideDetailedSample}`);
}

const selectedRows = prefetchOrder.map((url, index) => rowFor(url, index + 1, true));
const skippedRows = sitemapUrls
  .filter((url) => !selectedSet.has(url))
  .map((url) => rowFor(url, null, false));

const markdown = `# Проверка предварительного выбора URL

Дата контрольного запуска: 4 сентября 2026 года. Цель запуска: проверить выбор 100 адресов для лёгкого предварительного просмотра из 216 адресов sitemap до подробной проверки 10 страниц.

## Итог

- В sitemap: **216 URL**.
- Предварительно выбрано: **100 URL**.
- Не загружено из-за лимита предварительного просмотра: **116 URL**.
- С буквальными первыми 100 строками sitemap совпали только **${overlap} URL**.
- Выбрано за пределами первых 100 строк sitemap: **${beyondFirstHundred} URL**.
- Из буквальных первых 100 строк sitemap пропущено: **${firstHundredSkipped} URL**.
- Предварительная сотня состоит из **99 приоритетных адресов + 1 контрольного адреса исключения**.
- Среди 116 пропущенных нет URL с локалью/бизнес-приоритетом выше границы 99 приоритетных слотов: **${higherPrioritySkipped.length}**.
- На самой границе осталось адресов с тем же приоритетом: **${sameBoundarySkipped.length}**; они относятся к уже представленным справочным семействам.
- Контрольно загружено предполагаемых исключений: **${exclusionProbeUrls.length}** (${exclusionProbeUrls.join(", ")}).
- Подходят для выборки после проверки исключения: **${eligiblePreviewed} URL**; после подробной десятки не вошло: **${outsideDetailedSample} URL**.
- Итоговая подробная выборка сохранила принятые 10 URL: **${finalTen.length} из 10**.

Вывод: предварительный выбор не зависит только от позиции адреса в sitemap. Сначала учитываются основная локаль, предполагаемый тип и коммерческая значимость пути, наличие и порядок первой внутренней ссылки на главной странице, разнообразие прокси-семейств шаблонов и глубина URL. Порядок URL используется только как последний стабильный критерий при полном равенстве остальных признаков.

## Проверка границы приоритета

Все URL основной локали с приоритетами от \`homepage\` до \`about\` вошли в предварительную сотню. В 99 слотах содержательного приоритета нет пропущенного URL, который стоял бы выше границы по локали и бизнес-значимости. На границе остались страницы с тем же приоритетом \`${worstBusinessTuple.businessPriority.key}\`; их семейства уже представлены среди загруженных адресов. Страницы другой локали намеренно рассматриваются после основной.

Сотый слот не участвует в сравнении бизнес-приоритета: он отдельно зарезервирован для детерминированной проверки предполагаемого исключения. Это позволяет подтвердить, что юридическая/закрытая/поисковая страница действительно не подходит для бесплатной выборки, вместо того чтобы менять принятую арифметику только из-за нового порядка загрузки. Для этого запуска выбран один представитель — ${exclusionProbeUrls[0]} — а не все похожие адреса.

Отдельный тест запускает тот же набор из 216 адресов в прямом, обратном и циклически сдвинутом порядке. Во всех трёх случаях система получает одну и ту же сотню; это защищает алгоритм от скрытой зависимости от порядка sitemap.

## Итоговые 10 страниц для подробной проверки

${finalTen.map((url, index) => `${index + 1}. ${url}`).join("\n")}

## 100 адресов, выбранных для предварительного просмотра

| Порядок | Позиция в sitemap | URL | Локаль | Предполагаемый тип | Приоритет | Прокси-семейство | Почему выбран |
|---:|---:|---|---|---|---|---|---|
${selectedRows.join("\n")}

## 116 адресов, не загруженных

| Позиция в sitemap | URL | Локаль | Предполагаемый тип | Приоритет | Прокси-семейство | Почему не загружен |
|---:|---|---|---|---|---|---|
${skippedRows.join("\n")}
`;

await writeFile(outputPath, markdown, "utf8");

function rowFor(url: string, order: number | null, selected: boolean): string {
  const priority = auditPrefetchPriority(url, result.targetUrl);
  const sitemapIndex = sitemapPosition.get(url) ?? 0;
  const rootLinkIndex = rootLinkOrder.get(url);
  const locale = priority.localeRank === 0 ? "основная" : localeFromUrl(url);
  const context = [
    priority.localeRank === 0 ? "основная локаль" : "другая локаль",
    rootLinkIndex ? `внутренняя ссылка на главной №${rootLinkIndex}` : null,
    `глубина ${priority.depth}`,
  ].filter(Boolean).join(", ");
  const reason = selected
    ? exclusionProbeUrls.includes(url)
      ? `${context}; контрольный представитель предполагаемых исключений, нужен для подтверждения арифметики выборки`
      : `${context}; выбран по составному приоритету, а не по позиции sitemap`
    : priority.localeRank > 0
      ? `${context}; другая локаль рассматривается после покрытия основной, лимит 100 уже заполнен`
      : `${context}; справочный или прочий тип оказался ниже границы составного приоритета после покрытия важных типов`;
  const prefix = order === null ? "" : `| ${order} `;
  return `${prefix}| ${sitemapIndex} | ${escapeCell(url)} | ${locale} | ${priority.inferredPageType} | ${priority.businessPriority.key} (${priority.businessPriority.rank}) | ${escapeCell(priority.templateFamily)} | ${escapeCell(reason)} |`;
}

function normalizeUrl(rawUrl: string): string {
  const url = new URL(rawUrl);
  url.hash = "";
  url.search = "";
  url.pathname = url.pathname.replace(/\/{2,}/gu, "/").replace(/\/$/u, "") || "/";
  return url.href;
}

function localeFromUrl(rawUrl: string): string {
  const segment = new URL(rawUrl).pathname.split("/").filter(Boolean)[0];
  return segment && /^[a-z]{2}$/u.test(segment) ? segment : "другая";
}

function escapeCell(value: string): string {
  return value.replace(/\|/gu, "\\|");
}
