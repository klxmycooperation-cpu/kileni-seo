import { expect, test, type Page } from "@playwright/test";
import { PDFDocument } from "pdf-lib";

import { completeClientReportFixtureAudit, createQueuedFixtureAudit } from "./audit-fixture";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "kileni-cookie-preferences:v2",
      JSON.stringify({ essential: true, analytics: false, marketing: false, version: "2026-08-23.2" }),
    );
    window.sessionStorage.setItem("kileni:intro:v9", "1");
  });
});

test("renders a completed report in the initial HTML without a false connection stage", async ({ page }) => {
  const audit = await createQueuedFixtureAudit();
  await completeClientReportFixtureAudit(audit);

  const response = await page.request.get(`/audit/${audit.publicToken}`);
  expect(response.status()).toBe(200);
  const html = await response.text();

  expect(html).toContain("Краткий итог");
  expect(html).not.toContain("Подключаемся к сайту");
});

test("shows a decision-ready report in one first viewport on mobile and desktop", async ({ page }) => {
  const audit = await createQueuedFixtureAudit();
  await completeClientReportFixtureAudit(audit);

  for (const viewport of [{ width: 390, height: 844 }, { width: 1_440, height: 900 }]) {
    await page.setViewportSize(viewport);
    await page.goto(`/audit/${audit.publicToken}`);

    const overview = page.locator(".audit-client-overview");
    await expect(overview).toBeVisible();
    await expect(overview.getByRole("heading", { name: /Краткий итог/u })).toBeVisible();
    await expect(overview.getByText("Критических проблем", { exact: true })).toBeVisible();
    await expect(overview.getByText("Скорость главной страницы", { exact: true })).toBeVisible();
    await expect(overview.getByText("Подсказка о месте страницы в структуре сайта", { exact: true })).toHaveCount(0);
    await expect(page.locator(".audit-client-improvements").getByText("Подсказка о месте страницы в структуре сайта", { exact: true })).toBeVisible();
    await expect(overview.getByText(/наличие в поиске не проверялось/u)).toBeVisible();
    await expect(overview.getByRole("link", { name: "Получить полный аудит сайта" })).toBeVisible();
    await expect(overview.getByRole("link", { name: "Повторить бесплатную проверку" })).toBeVisible();
    if (viewport.width >= 1_000) await expect.poll(() => overview.evaluate((element) => element.getBoundingClientRect().bottom - window.innerHeight)).toBeLessThanOrEqual(1);
    await expectNoHorizontalOverflow(page);
  }
});

test("answers the five owner questions without opening technical details", async ({ page }) => {
  const audit = await createQueuedFixtureAudit();
  await completeClientReportFixtureAudit(audit);
  await page.goto(`/audit/${audit.publicToken}`);

  const report = page.locator(".result-body--client");
  await expect(report.getByText("Скорость главной страницы", { exact: true }).first()).toBeVisible();
  await expect(report.getByText("Стоит проверить", { exact: true }).first()).toBeVisible();
  await expect(report.getByText("Необязательное улучшение", { exact: true }).first()).toBeVisible();
  await expect(report.getByText("Все 10 проверенных страниц открылись без серверных ошибок.", { exact: true }).first()).toBeVisible();
  await expect(report.getByText(/Повторите тест 2–3 раза в одинаковых условиях/u)).toBeVisible();
  await expect(report.getByText("Фактическое наличие в поиске без Яндекс Вебмастера или Search Console не проверялось.", { exact: true }).first()).toBeVisible();
  await expect(report.locator(".audit-technical-details")).toHaveCount(0);
});

test("keeps the two conclusions, pages, PDF and admin client summary in parity", async ({ page }) => {
  const audit = await createQueuedFixtureAudit();
  await completeClientReportFixtureAudit(audit);
  await page.goto(`/audit/${audit.publicToken}`);

  await expect(page.locator(".audit-client-issue")).toHaveCount(2);
  await expect(page.locator(".audit-client-issue").nth(0)).toContainText("https://example.com/");
  await expect(page.locator(".audit-client-issue").nth(1)).toContainText("https://example.com/services");
  await expect(page.locator(".audit-page-card")).toHaveCount(10);
  await expect(page.locator(".audit-page-card", { hasText: "пунктов: 1" })).toHaveCount(2);
  const additionalResources = page.locator("details.audit-resource-summary");
  await expect(additionalResources.getByText("Дополнительные изображения, скрипты и документы: 16", { exact: true })).toBeVisible();
  await expect(additionalResources).not.toHaveAttribute("open", "");
  await additionalResources.locator("summary").click();
  await expect(additionalResources.getByText("Они не входят в бесплатную проверку и не загружались; среди них документов: 16.", { exact: true })).toBeVisible();
  await expect(page.locator(".audit-technical-details")).toHaveCount(0);
  await expect(page.getByText("Исправить найденное", { exact: true })).toHaveCount(0);

  const publicResponse = await page.request.get(`/api/audits/${audit.publicToken}`);
  const publicPayload = await publicResponse.json() as { result: Record<string, unknown> };
  expect(JSON.stringify(publicPayload.result)).not.toMatch(/url_pattern|content_pattern|template:dom|classificationConfidence|classificationReasons/u);

  const pdfResponse = await page.request.get(`/api/audits/${audit.publicToken}/report.pdf`);
  expect(pdfResponse.status()).toBe(200);
  const pdf = await PDFDocument.load(await pdfResponse.body());
  expect(pdf.getPageCount()).toBe(2);

  await page.goto("/admin/login");
  await page.getByLabel("Логин").fill("e2e-admin");
  await page.getByLabel("Пароль").fill("Kileni-e2e-password");
  await page.getByRole("button", { name: "Войти" }).click();
  await expect(page).toHaveURL(/\/admin$/u);
  await page.goto(`/admin/audits/${audit.id}`);

  const clientSummary = page.locator('section[aria-labelledby="audit-client-summary-heading"]');
  await expect(page.getByRole("heading", { name: "Клиентский итог и рекомендации" })).toBeVisible();
  await expect(clientSummary).toContainText("Предварительно просмотрено адресов100");
  await expect(clientSummary).toContainText("Подходят для выборки98");
  await expect(clientSummary).toContainText("Исключено до выборки2");
  await expect(clientSummary).toContainText("Закрытый раздел: 1");
  await expect(clientSummary).toContainText("Подробно проверено страниц10");
  await expect(clientSummary).toContainText("Критических проблем0");
  await expect(clientSummary).toContainText("Стоит проверить1");
  await expect(clientSummary).toContainText("Необязательных улучшений1");
  await expect(clientSummary).toContainText("Скорость главной страницы");
  await expect(clientSummary).toContainText("https://example.com/services");

  const adminAttention = clientSummary.locator('section[aria-labelledby="admin-client-attention-heading"]');
  const adminOptional = clientSummary.locator('section[aria-labelledby="admin-client-optional-heading"]');
  await expect(adminAttention.getByRole("heading", { name: "Что стоит проверить" })).toBeVisible();
  await expect(adminAttention).toContainText("Скорость главной страницы");
  await expect(adminAttention).not.toContainText("Подсказка о месте страницы в структуре сайта");
  await expect(adminOptional.getByRole("heading", { name: "Можно улучшить" })).toBeVisible();
  await expect(adminOptional).toContainText("Подсказка о месте страницы в структуре сайта");
  await expect(adminOptional).not.toContainText("Скорость главной страницы");
});

test("release pass keeps technical explanations readable and the disclaimer AA-visible", async ({ page }) => {
  const audit = await createQueuedFixtureAudit();
  await completeClientReportFixtureAudit(audit);
  await page.setViewportSize({ width: 1_440, height: 900 });
  await page.goto(`/audit/${audit.publicToken}`);

  const technicalDetails = page.locator(".audit-client-resources .audit-selected-list > li > div > ul > li");
  await expect(technicalDetails).not.toHaveCount(0);
  const detailLayouts = await technicalDetails.evaluateAll((elements) => elements.map((element) => {
    const style = getComputedStyle(element);
    return {
      display: style.display,
      overflowWrap: style.overflowWrap,
      wordBreak: style.wordBreak,
    };
  }));
  expect(detailLayouts.every((item) => item.display !== "grid")).toBe(true);
  expect(detailLayouts.every((item) => item.overflowWrap === "normal" && item.wordBreak === "normal")).toBe(true);
  const nestedTermDisplay = await technicalDetails.first().evaluate((element) => {
    const term = document.createElement("a");
    term.className = "audit-term-link";
    term.textContent = "sitemap";
    element.append(term);
    const display = getComputedStyle(term).display;
    term.remove();
    return display;
  });
  expect(nestedTermDisplay).toBe("inline");

  const lastPage = page.locator(".audit-page-card").last();
  await lastPage.locator("summary").click();
  const pageSelectionColors = await lastPage.locator(".audit-page-selection p").evaluate((element) => {
    const probe = document.createElement("span");
    probe.style.color = "var(--audit-muted)";
    element.append(probe);
    const result = { color: getComputedStyle(element).color, muted: getComputedStyle(probe).color };
    probe.remove();
    return result;
  });
  expect(pageSelectionColors.color).toBe(pageSelectionColors.muted);

  const disclaimer = page.locator(".audit-client-disclaimer");
  for (const theme of ["dark", "signal", "light"] as const) {
    await page.locator("html").evaluate((element, value) => element.setAttribute("data-kileni-theme", value), theme);
    const contrast = await disclaimer.evaluate((element) => {
      const channels = (value: string) => (value.match(/[\d.]+/gu) ?? []).slice(0, 3).map(Number);
      const luminance = (value: string) => {
        const [red, green, blue] = channels(value).map((channel) => {
          const normalized = channel / 255;
          return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * red! + 0.7152 * green! + 0.0722 * blue!;
      };
      const foreground = getComputedStyle(element).color;
      let ancestor: Element | null = element;
      let background = "rgba(0, 0, 0, 0)";
      while (ancestor && background === "rgba(0, 0, 0, 0)") {
        background = getComputedStyle(ancestor).backgroundColor;
        ancestor = ancestor.parentElement;
      }
      const lighter = Math.max(luminance(foreground), luminance(background));
      const darker = Math.min(luminance(foreground), luminance(background));
      return (lighter + 0.05) / (darker + 0.05);
    });
    expect(contrast).toBeGreaterThanOrEqual(4.5);
  }

  await expectNoHorizontalOverflow(page);
});

test("release pass remains readable at the acceptance viewports and 200 percent text zoom", async ({ page }) => {
  const audit = await createQueuedFixtureAudit();
  await completeClientReportFixtureAudit(audit);

  for (const viewport of [
    { width: 1_440, height: 900 },
    { width: 768, height: 1_024 },
    { width: 390, height: 844 },
    { width: 320, height: 720 },
  ]) {
    await test.step(`${viewport.width}x${viewport.height}`, async () => {
      await page.setViewportSize(viewport);
      await page.goto(`/audit/${audit.publicToken}`);
      await expectNoHorizontalOverflow(page);

      const strengths = page.locator(".audit-client-strengths > ul > li");
      await expect(strengths).not.toHaveCount(0);
      const strengthBoxes = await strengths.evaluateAll((items) => items.map((item) => {
        const box = item.getBoundingClientRect();
        return { left: Math.round(box.left), top: Math.round(box.top), width: Math.round(box.width) };
      }));
      if (viewport.width > 980) {
        expect(new Set(strengthBoxes.map((item) => item.top)).size).toBe(1);
        expect(Math.max(...strengthBoxes.map((item) => item.width)) - Math.min(...strengthBoxes.map((item) => item.width))).toBeLessThanOrEqual(1);
      } else {
        expect(new Set(strengthBoxes.map((item) => item.left)).size).toBe(1);
        expect(new Set(strengthBoxes.map((item) => item.top)).size).toBe(strengthBoxes.length);
      }

      await page.locator("html").evaluate((element) => { (element as HTMLElement).style.fontSize = "200%"; });
      await expect(page.locator(".audit-client-disclaimer")).toBeVisible();
      await expect(page.locator(".audit-client-resources")).toBeVisible();

      const headline = page.locator("#audit-client-heading");
      const headlineBox = await headline.boundingBox();
      expect(headlineBox).not.toBeNull();
      expect(headlineBox!.x).toBeGreaterThanOrEqual(0);
      expect(headlineBox!.x + headlineBox!.width).toBeLessThanOrEqual(viewport.width + 1);
      await expect(page.locator(".audit-client-heading-domain")).toHaveCSS("overflow-wrap", "anywhere");

      const overviewOrder = await page.locator(".audit-client-overview > *").evaluateAll((elements) => elements.map((element) => Math.round(element.getBoundingClientRect().top)));
      expect(overviewOrder).toEqual([...overviewOrder].sort((left, right) => left - right));

      const resourceDetail = page.locator(".audit-client-resources .audit-selected-list > li > div > ul > li").first();
      await expect(resourceDetail).toHaveCSS("overflow-wrap", "normal");
      await expect(resourceDetail).toHaveCSS("word-break", "normal");

      if (viewport.width <= 390) {
        const statBoxes = await page.locator(".audit-client-stats > div").evaluateAll((elements) => elements.slice(0, 2).map((element) => {
          const box = element.getBoundingClientRect();
          return { left: Math.round(box.left), top: Math.round(box.top) };
        }));
        expect(statBoxes[1]!.left).toBe(statBoxes[0]!.left);
        expect(statBoxes[1]!.top).toBeGreaterThan(statBoxes[0]!.top);

        const actionBoxes = await page.locator(".audit-client-mobile-actions .button").evaluateAll((elements) => elements.map((element) => {
          const box = element.getBoundingClientRect();
          return { left: Math.round(box.left), top: Math.round(box.top), width: Math.round(box.width) };
        }));
        expect(actionBoxes[1]!.left).toBe(actionBoxes[0]!.left);
        expect(actionBoxes[1]!.top).toBeGreaterThan(actionBoxes[0]!.top);
        expect(actionBoxes[0]!.width).toBe(actionBoxes[1]!.width);

        const resourceColumns = await page.locator(".audit-client-resources .audit-selected-list > li").first().evaluate((element) => getComputedStyle(element).gridTemplateColumns);
        expect(resourceColumns.trim().split(/\s+/u)).toHaveLength(1);
      }

      if (viewport.width === 768) {
        const topLineBoxes = await page.locator(".audit-client-overview__topline > div").evaluateAll((elements) => elements.map((element) => {
          const box = element.getBoundingClientRect();
          return { left: Math.round(box.left), top: Math.round(box.top) };
        }));
        expect(topLineBoxes[1]!.left).toBe(topLineBoxes[0]!.left);
        expect(topLineBoxes[1]!.top).toBeGreaterThan(topLineBoxes[0]!.top);
      }

      await expectNoHorizontalOverflow(page);
    });
  }
});

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  await page.evaluate(() => document.fonts.ready);
  const measurement = await page.evaluate(() => {
    const contentExceedsBox = (element: HTMLElement, box: DOMRect) => {
      const childExceeds = [...element.children].some((child) => {
        const childBox = child.getBoundingClientRect();
        return childBox.left < box.left - 1 || childBox.right > box.right + 1;
      });
      const textExceeds = [...element.childNodes]
        .filter((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim())
        .some((node) => {
          const range = document.createRange();
          range.selectNodeContents(node);
          return [...range.getClientRects()].some((line) => line.left < box.left - 1 || line.right > box.right + 1);
        });
      return childExceeds || textExceeds;
    };

    return {
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      offenders: [...document.querySelectorAll<HTMLElement>(".audit-result-header *, .result-body--client *")]
        .filter((element) => {
        const box = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        const visible = box.width > 0
          && box.height > 0
          && style.display !== "none"
          && style.visibility !== "hidden"
          && !element.closest(".visually-hidden, nextjs-portal, .audit-live__progress.is-indeterminate, svg");
        const clipsOrScrollsByDesign = Boolean(element.closest(".audit-page-table-wrap"));
        return visible && !clipsOrScrollsByDesign && (
          box.right > document.documentElement.clientWidth + 1
          || box.left < -1
          || (element.scrollWidth > element.clientWidth + 1 && contentExceedsBox(element, box))
        );
      })
      .slice(0, 16)
      .map((element) => ({
        tagName: element.tagName,
        className: element.className,
        parentClassName: element.parentElement?.className ?? "",
        text: element.textContent?.trim().slice(0, 80) ?? "",
        left: Math.round(element.getBoundingClientRect().left),
        right: Math.round(element.getBoundingClientRect().right),
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
        width: Math.round(element.getBoundingClientRect().width),
        display: getComputedStyle(element).display,
        columns: getComputedStyle(element).gridTemplateColumns,
        children: [...element.children].slice(0, 4).map((child) => ({
          className: (child as HTMLElement).className,
          left: Math.round(child.getBoundingClientRect().left),
          right: Math.round(child.getBoundingClientRect().right),
          width: Math.round(child.getBoundingClientRect().width),
          whiteSpace: getComputedStyle(child).whiteSpace,
        })),
      })),
    };
  });
  expect(measurement.offenders, JSON.stringify(measurement.offenders)).toEqual([]);
  expect(measurement.overflow, JSON.stringify(measurement.offenders)).toBeLessThanOrEqual(1);
}
