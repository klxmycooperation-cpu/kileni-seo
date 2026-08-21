import { describe, expect, it } from "vitest";

import {
  fileTypeAllowed,
  maxFileCount,
  maxTotalFileBytes,
  safeOriginalFilename,
} from "../../src/lib/security/files";

describe("brief attachment limits", () => {
  it("keeps the public upload contract at five files and ten MiB total", () => {
    expect(maxFileCount).toBe(5);
    expect(maxTotalFileBytes).toBe(10 * 1024 * 1024);
  });
});

describe("fileTypeAllowed", () => {
  it.each([
    ["report.pdf", "application/pdf", [0x25, 0x50, 0x44, 0x46, 0x2d]],
    ["image.png", "image/png", [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
    ["photo.jpg", "image/jpeg", [0xff, 0xd8, 0x00, 0x00, 0xff, 0xd9]],
    ["brief.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", [0x50, 0x4b, 0x03, 0x04]],
    ["data.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", [0x50, 0x4b, 0x03, 0x04]],
  ] as const)("accepts matching extension, MIME and magic for %s", (name, mime, bytes) => {
    expect(fileTypeAllowed(name, mime, Uint8Array.from(bytes))).toBe(true);
  });

  it.each([
    ["report.jpg", "application/pdf", [0x25, 0x50, 0x44, 0x46, 0x2d]],
    ["report.pdf", "application/pdf", [0x4d, 0x5a, 0x90, 0x00]],
    ["image.png", "image/png", [0x89, 0x50, 0x4e, 0x47]],
    ["photo.jpg", "image/jpeg", [0xff, 0xd8, 0x00, 0x00]],
    ["archive.zip", "application/zip", [0x50, 0x4b, 0x03, 0x04]],
  ] as const)("rejects spoofed or unsupported file %s", (name, mime, bytes) => {
    expect(fileTypeAllowed(name, mime, Uint8Array.from(bytes))).toBe(false);
  });

  it("removes path components and unsafe characters from the stored display name", () => {
    expect(safeOriginalFilename("../../план<script>.pdf")).toBe("план_script_.pdf");
  });
});
