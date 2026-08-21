/** Adds the signed public restore value to a same-origin audit resource URL. */
export function withAuditRestore(path: string, restore: string | null | undefined): string {
  if (!restore) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}restore=${encodeURIComponent(restore)}`;
}
