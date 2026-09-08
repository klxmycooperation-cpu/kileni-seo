"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import type { Locale } from "../../config/site";
import {
  buildGlossaryHref,
  buildGlossaryReturnTarget,
  findGlossaryTextMatches,
  type GlossaryLinkEntry,
} from "../../lib/glossary/linking";

const BLOCK_SELECTOR = "p, li, dd, dt, blockquote, figcaption, td";
const EXCLUDED_SELECTOR = [
  "a",
  "button",
  "input",
  "textarea",
  "select",
  "option",
  "label",
  "code",
  "pre",
  "script",
  "style",
  "summary",
  "nav",
  "header",
  "footer",
  "form",
  "[contenteditable]",
  "[data-glossary-skip]",
  "[data-glossary-inline]",
].join(",");

export function GlossaryLinkEnhancer({
  locale,
  entries,
}: {
  locale: Locale;
  entries: readonly GlossaryLinkEntry[];
}) {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || isGlossaryPath(pathname)) return;
    const main = document.getElementById("main-content");
    if (!main || main.closest("[data-glossary-skip]")) return;

    let activated = false;
    let animationFrame = 0;
    let idleCallback = 0;
    let fallbackTimer: ReturnType<typeof globalThis.setTimeout> | undefined;
    const activate = () => {
      const run = () => {
        animationFrame = window.requestAnimationFrame(() => {
          animationFrame = 0;
          enhanceMainContent(main, pathname, locale, entries);
          scrollToGeneratedReturnAnchor(main);
          activated = true;
        });
      };
      if (typeof window.requestIdleCallback === "function") {
        idleCallback = window.requestIdleCallback(run, { timeout: 1_500 });
      } else {
        fallbackTimer = globalThis.setTimeout(run, 350);
      }
    };
    if (document.readyState === "complete") activate();
    else window.addEventListener("load", activate, { once: true });
    let refreshFrame = 0;
    const observer = new MutationObserver((records) => {
      if (!activated) return;
      const hasExternalContent = records.some((record) => Array.from(record.addedNodes).some((node) => (
        !(node instanceof HTMLElement) || node.dataset.glossaryInline !== "true"
      )));
      if (!hasExternalContent || refreshFrame) return;
      refreshFrame = window.requestAnimationFrame(() => {
        refreshFrame = 0;
        enhanceMainContent(main, pathname, locale, entries);
        scrollToGeneratedReturnAnchor(main);
      });
    });
    observer.observe(main, { childList: true, subtree: true });

    const restoreBeforeNavigation = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const link = event.target.closest<HTMLAnchorElement>("a[href]");
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      if (link.dataset.glossaryTouchDetails === "true") return;
      // Keep the generated source link in the DOM until the browser has
      // completed its native navigation. Removing the active anchor during the
      // click default action is inconsistent between WebKit and Chromium.
      if (link.dataset.glossaryInline === "true") return;
      let target: URL;
      try {
        target = new URL(link.href, window.location.href);
      } catch {
        return;
      }
      if (target.origin !== window.location.origin) return;
      window.queueMicrotask(() => restoreGeneratedLinks(main));
    };
    const restoreBeforeHistoryNavigation = () => restoreGeneratedLinks(main);
    const handleTouchTerm = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const link = event.target.closest<HTMLAnchorElement>("a[data-glossary-inline='true']");
      if (!link) {
        if (!event.target.closest("[data-glossary-touch-popover='true']")) closeTouchGlossaryPopover();
        return;
      }
      if (!isCoarsePointer()) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      openTouchGlossaryPopover(link, locale);
    };
    const closeTouchTermOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeTouchGlossaryPopover();
    };
    const closeTouchTerm = () => closeTouchGlossaryPopover();

    document.addEventListener("click", handleTouchTerm, true);
    document.addEventListener("click", restoreBeforeNavigation, true);
    document.addEventListener("keydown", closeTouchTermOnEscape);
    window.addEventListener("resize", closeTouchTerm);
    window.addEventListener("scroll", closeTouchTerm, true);
    window.addEventListener("popstate", restoreBeforeHistoryNavigation);
    return () => {
      window.removeEventListener("load", activate);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      if (idleCallback && typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(idleCallback);
      if (fallbackTimer !== undefined) globalThis.clearTimeout(fallbackTimer);
      if (refreshFrame) window.cancelAnimationFrame(refreshFrame);
      observer.disconnect();
      document.removeEventListener("click", handleTouchTerm, true);
      document.removeEventListener("click", restoreBeforeNavigation, true);
      document.removeEventListener("keydown", closeTouchTermOnEscape);
      window.removeEventListener("resize", closeTouchTerm);
      window.removeEventListener("scroll", closeTouchTerm, true);
      window.removeEventListener("popstate", restoreBeforeHistoryNavigation);
      closeTouchGlossaryPopover();
      restoreGeneratedLinks(main);
    };
  }, [entries, locale, pathname]);

  return null;
}

function enhanceMainContent(
  main: HTMLElement,
  pathname: string,
  locale: Locale,
  entries: readonly GlossaryLinkEntry[],
) {
  const blocks = Array.from(main.querySelectorAll<HTMLElement>(BLOCK_SELECTOR));
  let sourceNumber = 0;

  for (const [index, block] of blocks.entries()) {
    if (!isEligibleBlock(block, main)) continue;
    sourceNumber = index + 1;
    enhanceBlock(block, pathname, sourceNumber, locale, entries);
  }
}

function enhanceBlock(
  block: HTMLElement,
  pathname: string,
  sourceNumber: number,
  locale: Locale,
  entries: readonly GlossaryLinkEntry[],
) {
  block.dataset.glossaryEnhanced = "true";
  const usedSlugs = new Set<string>();
  const textNodes = collectEligibleTextNodes(block);
  let sourceId = "";

  for (const node of textNodes) {
    const availableEntries = entries.filter((entry) => !usedSlugs.has(entry.slug) && entry.tooltip);
    const matches = findGlossaryTextMatches(node.data, availableEntries, locale);
    if (matches.length === 0) continue;

    if (!sourceId) {
      sourceId = `glossary-source-${sourceNumber}`;
      if (block.id) {
        const sourceAnchor = document.createElement("span");
        sourceAnchor.id = sourceId;
        sourceAnchor.dataset.glossaryReturnAnchor = "true";
        sourceAnchor.setAttribute("aria-hidden", "true");
        block.prepend(sourceAnchor);
      } else {
        block.id = sourceId;
        block.dataset.glossaryAnchorGenerated = "true";
      }
    }
    const returnTarget = buildGlossaryReturnTarget(pathname, sourceId);
    if (!returnTarget) continue;

    const fragment = document.createDocumentFragment();
    let cursor = 0;
    for (const match of matches) {
      if (match.start > cursor) fragment.append(node.data.slice(cursor, match.start));
      const link = document.createElement("a");
      link.className = "glossary-inline-term";
      link.dataset.glossaryInline = "true";
      link.dataset.glossarySlug = match.slug;
      link.dataset.glossarySourceId = sourceId;
      link.dataset.glossaryTip = match.tooltip;
      link.dataset.glossaryTooltipAlign = "left";
      link.href = buildGlossaryHref(locale, match.slug, returnTarget);
      const visibleTerm = node.data.slice(match.start, match.end);
      link.textContent = visibleTerm;
      link.setAttribute("aria-label", `${visibleTerm} — ${match.tooltip}`);
      fragment.append(link);
      usedSlugs.add(match.slug);
      cursor = match.end;
    }
    if (cursor < node.data.length) fragment.append(node.data.slice(cursor));
    node.replaceWith(fragment);
  }

  for (const link of block.querySelectorAll<HTMLElement>("[data-glossary-inline]")) {
    const rect = link.getBoundingClientRect();
    link.dataset.glossaryTooltipAlign = rect.left > window.innerWidth / 2 ? "right" : "left";
  }
}

function collectEligibleTextNodes(block: HTMLElement): Text[] {
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let current = walker.nextNode();
  while (current) {
    if (
      current instanceof Text
      && current.data.trim().length > 0
      && current.parentElement
      && !current.parentElement.closest(EXCLUDED_SELECTOR)
    ) {
      nodes.push(current);
    }
    current = walker.nextNode();
  }
  return nodes;
}

function isEligibleBlock(block: HTMLElement, main: HTMLElement): boolean {
  if (!main.contains(block) || block.closest(EXCLUDED_SELECTOR)) return false;
  if (block.dataset.glossaryEnhanced === "true") return false;
  if (block.closest(".glossary-page")) return false;
  const closestBlock = block.parentElement?.closest(BLOCK_SELECTOR);
  return !closestBlock || closestBlock === block;
}

function restoreGeneratedLinks(main: HTMLElement) {
  closeTouchGlossaryPopover();
  const affectedParents = new Set<Node>();
  for (const link of main.querySelectorAll<HTMLElement>("[data-glossary-inline]")) {
    if (link.parentNode) affectedParents.add(link.parentNode);
    link.replaceWith(document.createTextNode(link.textContent ?? ""));
  }
  for (const parent of affectedParents) parent.normalize();
  for (const block of main.querySelectorAll<HTMLElement>("[data-glossary-anchor-generated='true']")) {
    block.removeAttribute("id");
    delete block.dataset.glossaryAnchorGenerated;
  }
  for (const anchor of main.querySelectorAll<HTMLElement>("[data-glossary-return-anchor='true']")) {
    anchor.remove();
  }
  for (const block of main.querySelectorAll<HTMLElement>("[data-glossary-enhanced='true']")) {
    delete block.dataset.glossaryEnhanced;
  }
}

function isCoarsePointer() {
  return window.matchMedia("(hover: none), (pointer: coarse)").matches
    || navigator.maxTouchPoints > 0;
}

function openTouchGlossaryPopover(link: HTMLAnchorElement, locale: Locale) {
  closeTouchGlossaryPopover();
  const tip = link.dataset.glossaryTip?.trim();
  if (!tip) return;

  const popover = document.createElement("span");
  const popoverId = `glossary-touch-${link.dataset.glossarySourceId ?? "term"}`;
  popover.id = popoverId;
  popover.dataset.glossaryTouchPopover = "true";
  popover.setAttribute("role", "dialog");
  popover.setAttribute("aria-label", locale === "ru" ? "Краткое объяснение термина" : "Short term explanation");

  const tipText = document.createElement("span");
  tipText.dataset.glossaryTouchTip = "true";
  tipText.textContent = tip;

  const detailsLink = document.createElement("a");
  detailsLink.dataset.glossaryTouchDetails = "true";
  detailsLink.setAttribute("href", link.getAttribute("href") ?? link.href);
  detailsLink.textContent = locale === "ru" ? "Подробнее в словаре" : "Open glossary entry";

  popover.append(tipText, detailsLink);
  document.body.append(popover);
  link.dataset.glossaryTouchOpen = "true";
  link.setAttribute("aria-expanded", "true");
  link.setAttribute("aria-controls", popoverId);

  const linkRect = link.getBoundingClientRect();
  const popoverRect = popover.getBoundingClientRect();
  const gutter = 12;
  const left = Math.min(
    Math.max(gutter, linkRect.left),
    Math.max(gutter, window.innerWidth - popoverRect.width - gutter),
  );
  const below = linkRect.bottom + 8;
  const above = linkRect.top - popoverRect.height - 8;
  const top = below + popoverRect.height <= window.innerHeight - gutter
    ? below
    : Math.max(gutter, above);
  popover.style.left = `${Math.round(left)}px`;
  popover.style.top = `${Math.round(top)}px`;
}

function closeTouchGlossaryPopover() {
  for (const popover of document.querySelectorAll<HTMLElement>("[data-glossary-touch-popover='true']")) {
    popover.remove();
  }
  for (const link of document.querySelectorAll<HTMLAnchorElement>("a[data-glossary-touch-open='true']")) {
    delete link.dataset.glossaryTouchOpen;
    link.removeAttribute("aria-expanded");
    link.removeAttribute("aria-controls");
  }
}

function scrollToGeneratedReturnAnchor(main: HTMLElement) {
  if (!window.location.hash) return;
  let sourceId: string;
  try {
    sourceId = decodeURIComponent(window.location.hash.slice(1));
  } catch {
    return;
  }
  if (!/^glossary-source-\d+$/u.test(sourceId)) return;
  const source = document.getElementById(sourceId);
  if (!source || !main.contains(source)) return;
  window.requestAnimationFrame(() => {
    source.scrollIntoView({ block: "center", inline: "nearest" });
  });
}

function isGlossaryPath(pathname: string): boolean {
  return pathname === "/glossary"
    || pathname.startsWith("/glossary/")
    || pathname === "/en/glossary"
    || pathname.startsWith("/en/glossary/");
}
