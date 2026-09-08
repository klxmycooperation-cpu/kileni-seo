import { describe, expect, it } from "vitest";

import { glossaryTerms } from "../../src/content/glossary";
import {
  buildGlossaryHref,
  buildGlossaryReturnTarget,
  countTooltipWords,
  findGlossaryTextMatches,
  getGlossaryLinkEntries,
  sanitizeGlossaryReturnTarget,
} from "../../src/lib/glossary/linking";

describe("inline glossary links", () => {
  it("provides a two or three word tooltip for every known term in both languages", () => {
    for (const locale of ["ru", "en"] as const) {
      const entries = getGlossaryLinkEntries(locale);
      expect(entries).toHaveLength(glossaryTerms.length);
      for (const entry of entries) {
        expect(entry.tooltip, `${locale}:${entry.slug}`).not.toBe("");
        expect(countTooltipWords(entry.tooltip), `${locale}:${entry.slug}`).toBeGreaterThanOrEqual(2);
        expect(countTooltipWords(entry.tooltip), `${locale}:${entry.slug}`).toBeLessThanOrEqual(3);
      }
    }
  });

  it("links only the first non-overlapping occurrence of each term in a text block", () => {
    const entries = getGlossaryLinkEntries("ru");
    const text = "URL ведёт на страницу. Ещё один URL не должен получить вторую ссылку. HTTP 2xx — это код ответа.";
    const matches = findGlossaryTextMatches(text, entries, "ru");

    expect(matches.filter((match) => match.slug === "url")).toHaveLength(1);
    expect(matches.filter((match) => match.slug === "http-status")).toHaveLength(1);
    expect(matches.map((match) => text.slice(match.start, match.end))).toEqual(["URL", "HTTP 2xx"]);
    for (let index = 1; index < matches.length; index += 1) {
      expect(matches[index].start).toBeGreaterThanOrEqual(matches[index - 1].end);
    }
  });

  it("keeps term boundaries and does not treat ordinary substrings as abbreviations", () => {
    const entries = getGlossaryLinkEntries("en");
    const matches = findGlossaryTextMatches("The input stays editable, while INP is explained.", entries, "en");
    expect(matches.filter((match) => match.slug === "inp")).toHaveLength(1);
    expect(matches.find((match) => match.slug === "inp")?.start).toBe(32);
  });

  it("builds a glossary URL with a local return anchor", () => {
    const target = buildGlossaryReturnTarget("/seo", "glossary-source-7");
    expect(target).toBe("/seo#glossary-source-7");
    expect(buildGlossaryHref("ru", "indexing", target!)).toBe(
      "/glossary/indexing?from=%2Fseo%23glossary-source-7",
    );
    expect(buildGlossaryHref("en", "indexing", "/en/seo#glossary-source-2")).toBe(
      "/en/glossary/indexing?from=%2Fen%2Fseo%23glossary-source-2",
    );
  });

  it("rejects external, protocol-relative, privileged and malformed return targets", () => {
    const unsafeTargets = [
      "https://evil.example/steal#glossary-source-1",
      "//evil.example/steal#glossary-source-1",
      "/admin#glossary-source-1",
      "/api/leads#glossary-source-1",
      "/audit/private-token#glossary-source-1",
      "/seo?next=https://evil.example#glossary-source-1",
      "/seo#not-a-source",
      "/seo#glossary-source-%E0%A4%A",
    ];
    for (const target of unsafeTargets) expect(sanitizeGlossaryReturnTarget(target), target).toBeNull();
    expect(sanitizeGlossaryReturnTarget("/seo#glossary-source-3")).toBe("/seo#glossary-source-3");
  });
});
