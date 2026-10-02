import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "kileni-cookie-preferences:v2",
      JSON.stringify({ essential: true, analytics: false, marketing: false, version: "2026-08-23.2" }),
    );
  });
});

test("about opens with an animated KILENI SEO lockup over the blue video stage", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("kileni:theme:v1", "dark"));
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto("/about");

  const hero = await page.evaluate(() => {
    const section = document.querySelector<HTMLElement>(".about-v3-hero");
    const name = document.querySelector<HTMLElement>(".about-v3-brand__name");
    const seo = document.querySelector<HTMLElement>(".about-v3-brand__seo");
    const title = document.querySelector<HTMLElement>(".about-v3-hero__title");
    const video = document.querySelector<HTMLElement>(".about-v3-video.is-active");
    const videoStage = document.querySelector<HTMLElement>(".about-v3-video-stage");
    if (!section || !name || !seo || !title || !video || !videoStage) throw new Error("The new About hero is incomplete");
    const heroRect = section.getBoundingClientRect();
    const nameRect = name.getBoundingClientRect();
    const seoRect = seo.getBoundingClientRect();
    const titleRect = title.getBoundingClientRect();
    const videoRect = video.getBoundingClientRect();
    return {
      nameBeforeSeo: nameRect.left < seoRect.left,
      gap: seoRect.left - nameRect.right,
      seoSmaller: seoRect.height < nameRect.height,
      seoBottomAligned: seoRect.top + seoRect.height / 2 >= nameRect.top + nameRect.height * .62,
      videoBleedsAcrossHero: videoRect.left <= heroRect.left + 1 && videoRect.right >= heroRect.right - 1,
      titleBelowBrand: titleRect.top > nameRect.bottom,
      titleFontSize: Number.parseFloat(getComputedStyle(title).fontSize),
      immediatePlanetMotion: getComputedStyle(video).animationName,
      immediatePlanetFallback: getComputedStyle(videoStage, "::before").backgroundImage,
      videos: section.querySelectorAll("video").length,
      twinklingSpace: Boolean(section.querySelector(".about-v3-cosmos")),
      continuitySpace: Boolean(document.querySelector(".about-v3-continuity")),
      hasContinuationPlanet: Boolean(document.querySelector(".about-v3-continuity__planet")),
      seoLight: getComputedStyle(seo).color,
      searchMap: Boolean(document.querySelector(".about-v3-search-map")),
      searchRoutePulses: document.querySelectorAll(".about-v3-search-map__route i").length,
      marketplaceLogos: document.querySelectorAll(".about-v3-marketplace-logo").length,
      marketplaceStage: Boolean(document.querySelector(".about-v3-marketplace-stage")),
      codeEditor: Boolean(document.querySelector(".about-v3-code-editor")),
    };
  });

  expect(hero.nameBeforeSeo).toBe(true);
  expect(hero.gap).toBeLessThanOrEqual(3);
  expect(hero.seoSmaller).toBe(true);
  expect(hero.seoBottomAligned).toBe(true);
  expect(hero.videoBleedsAcrossHero).toBe(true);
  expect(hero.titleBelowBrand).toBe(true);
  expect(hero.titleFontSize).toBeLessThan(80);
  expect(hero.immediatePlanetMotion).toContain("about-v3-video-drift");
  expect(hero.immediatePlanetFallback).not.toBe("none");
  expect(hero.videos).toBe(2);
  expect(hero.twinklingSpace).toBe(true);
  expect(hero.continuitySpace).toBe(true);
  expect(hero.hasContinuationPlanet).toBe(false);
  expect(hero.seoLight).toBe("rgb(111, 141, 255)");
  expect(hero.searchMap).toBe(true);
  expect(hero.searchRoutePulses).toBe(0);
  expect(hero.marketplaceLogos).toBe(0);
  expect(hero.marketplaceStage).toBe(true);
  expect(hero.codeEditor).toBe(true);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Продвигаем сайты");
  const flowingHeroTitle = page.locator("#about-story-title [data-canvas-text='true']");
  await expect(flowingHeroTitle).toBeVisible();
  await expect.poll(() => flowingHeroTitle.evaluate((element) => ({
    pattern: getComputedStyle(element).getPropertyValue("--canvas-text-pattern"),
    animation: getComputedStyle(element).animationName,
  }))).toEqual(expect.objectContaining({
    pattern: expect.stringMatching(/^url\(/),
    animation: "canvas-text-sheen",
  }));
});

test("about presents six scroll scenes and respects reduced motion", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("kileni:theme:v1", "dark"));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/about");

  await expect(page.locator(".about-v3-scene")).toHaveCount(6);
  await expect(page.locator(".about-product-motion img")).toHaveCount(1);
  expect(await page.evaluate(() => {
    const web = document.querySelector<HTMLElement>(".about-v3-web");
    const workflow = document.querySelector<HTMLElement>(".about-workflow");
    const final = document.querySelector<HTMLElement>(".about-v3-final");
    return Boolean(web && workflow && final && workflow.offsetTop >= web.offsetTop + web.offsetHeight && final.offsetTop > workflow.offsetTop);
  })).toBe(true);
  await expect(page.getByRole("link", { name: /Заполнить короткий бриф/i })).toHaveAttribute("href", /brief/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await expect(page.locator(".about-v3-brand__name")).toHaveCSS("animation-name", "none");
});

test("about keeps every company heading readable and pairs copy with its UI", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("kileni:theme:v1", "dark"));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/about");

  const composition = await page.evaluate(() => {
    const sections = [".about-v3-seo", ".about-v3-marketplaces", ".about-v3-web"];

    return sections.map((selector) => {
      const section = document.querySelector<HTMLElement>(selector);
      const copy = section?.querySelector<HTMLElement>(".about-v3-scene__copy");
      const visual = section?.querySelector<HTMLElement>(
        ".about-v3-search-map, .about-v3-marketplace-stage, .about-v3-code-editor",
      );
      const words = Array.from(section?.querySelectorAll<HTMLElement>(".about-v3-staggered-text > span") ?? []);
      if (!section || !copy || !visual || words.length === 0) throw new Error(`Incomplete section: ${selector}`);

      const copyRect = copy.getBoundingClientRect();
      const visualRect = visual.getBoundingClientRect();
      return {
        selector,
        headingVisible: words.every((word) => Number.parseFloat(getComputedStyle(word).opacity) === 1),
        copyVisible: Number.parseFloat(getComputedStyle(copy).opacity) === 1,
        horizontalGap: Math.max(0, visualRect.left - copyRect.right),
        paddingBlockStart: Number.parseFloat(getComputedStyle(section.firstElementChild as HTMLElement).paddingBlockStart),
      };
    });
  });

  for (const section of composition) {
    expect(section.headingVisible, `${section.selector} heading`).toBe(true);
    expect(section.copyVisible, `${section.selector} copy`).toBe(true);
    expect(section.horizontalGap, `${section.selector} copy-to-UI gap`).toBeLessThanOrEqual(96);
    expect(section.paddingBlockStart, `${section.selector} vertical padding`).toBeLessThanOrEqual(104);
  }
});

test("about places a scroll-triggered vertical messenger beside the final copy", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("kileni:theme:v1", "dark"));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/about");

  const conversation = page.locator(".about-v3-conversation");
  await expect(conversation).toHaveCount(1);
  await expect(conversation).toHaveAttribute("data-playing", "false");
  await expect(page.locator(".about-v3-final__content > .about-v3-conversation")).toHaveCount(1);
  await expect(conversation.getByText("Мой сайт никто не видит. Помогите!", { exact: true })).toHaveCount(1);
  await expect(conversation.getByText(/Не проблема! Сначала проверим/)).toHaveCount(1);
  await expect(conversation.getByText("С чего начнём?", { exact: true })).toHaveCount(1);
  await expect(conversation.getByText(/Проверим индексацию, структуру и скорость/)).toHaveCount(1);
  await expect(conversation.getByText("Отлично, спасибо!", { exact: true })).toHaveCount(1);
  await expect(conversation.locator(".about-v3-conversation__typing")).toHaveCount(2);
  await expect(conversation.locator(".about-chat-report li")).toHaveCount(3);
  await expect(conversation.getByRole("button", { name: "Повторить диалог" })).toBeVisible();
  await expect(conversation.getByText("Диалог с клиентом", { exact: true })).toHaveCount(0);
  await expect(conversation.getByText(/Показатели в сцене/)).toHaveCount(0);
  await expect(conversation.getByText(/Запрос отправлен/)).toHaveCount(0);

  const layout = await page.evaluate(() => {
    const heading = document.querySelector<HTMLElement>("#about-final-title");
    const messenger = document.querySelector<HTMLElement>(".about-v3-conversation");
    const messages = Array.from(document.querySelectorAll<HTMLElement>(".about-v3-conversation__message"));
    if (!heading || !messenger || messages.length !== 5) throw new Error("Final messenger composition is incomplete");
    const headingRect = heading.getBoundingClientRect();
    const messengerRect = messenger.getBoundingClientRect();
    return {
      messengerRightOfHeading: messengerRect.left > headingRect.left,
      vertical: messengerRect.height > messengerRect.width,
      messageOrder: messages.every((message, index) => index === 0 || message.getBoundingClientRect().top > messages[index - 1].getBoundingClientRect().top),
      clientRight: messages[0].getBoundingClientRect().right > messages[1].getBoundingClientRect().right,
      kileniLeft: messages[1].getBoundingClientRect().left < messages[0].getBoundingClientRect().left,
      alternatingSides: messages.every((message, index) => index === 0 || (index % 2 === 0
        ? message.getBoundingClientRect().right > messages[index - 1].getBoundingClientRect().right
        : message.getBoundingClientRect().left < messages[index - 1].getBoundingClientRect().left)),
    };
  });

  expect(layout).toEqual({
    messengerRightOfHeading: true,
    vertical: true,
    messageOrder: true,
    clientRight: true,
    kileniLeft: true,
    alternatingSides: true,
  });

  await conversation.scrollIntoViewIfNeeded();
  await expect(conversation).toHaveAttribute("data-playing", "true");
  await expect(conversation.getByText("Мой сайт никто не видит. Помогите!", { exact: true })).toBeVisible();
  await expect(conversation.getByText(/Не проблема! Сначала проверим/)).toBeVisible({ timeout: 4_000 });
  await expect(conversation.getByText("Отлично, спасибо!", { exact: true })).toBeVisible({ timeout: 7_000 });
  await expect(conversation.locator(".about-v3-conversation__results")).toBeVisible({ timeout: 8_000 });
  await expect.poll(() => conversation.locator(".about-v3-conversation__results").evaluate((element) => Number.parseFloat(getComputedStyle(element).opacity)), { timeout: 9_000 }).toBeGreaterThan(.95);
  await expect(conversation.locator("[data-glossary-inline]")).toHaveCount(0);

  const sectionBackgrounds = await page.evaluate(() =>
    [".about-v3-seo", ".about-v3-marketplaces", ".about-v3-web", ".about-v3-final"].map((selector) => {
      const section = document.querySelector<HTMLElement>(selector);
      if (!section) throw new Error(`Missing section: ${selector}`);
      const style = getComputedStyle(section);
      return { selector, color: style.backgroundColor, image: style.backgroundImage };
    }),
  );

  for (const background of sectionBackgrounds) {
    expect(background.color, background.selector).toBe("rgba(0, 0, 0, 0)");
    expect(background.image, background.selector).toBe("none");
  }
});

test("about keeps the same company narrative in English", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/en/about");

  await expect(page.getByRole("heading", { level: 1 })).toContainText("We make websites easier to find");
  await expect(page.getByRole("link", { name: /Complete the short brief/i })).toHaveAttribute("href", /en\/brief/);
  await expect(page.locator(".about-v3-scene")).toHaveCount(6);
});
