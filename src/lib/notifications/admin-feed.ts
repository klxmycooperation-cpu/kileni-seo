export type AdminFeedItem = { id: string; entityType: "lead" | "brief" | "audit"; createdAt: number };
export type AdminNotificationSnapshot = {
  newCount: number;
  failedNotificationCount: number;
  attentionCount: number;
  latest: AdminFeedItem[];
  emailConfigured: boolean;
  checkedAt: number;
};

export function adminRequestHref(item: AdminFeedItem): string {
  return `/admin/${item.entityType === "lead" ? "leads" : item.entityType === "brief" ? "briefs" : "audits"}/${encodeURIComponent(item.id)}`;
}

export function incomingRequests(previous: AdminFeedItem[], latest: AdminFeedItem[]): AdminFeedItem[] {
  const lastTime = Math.max(0, ...previous.map((item) => item.createdAt));
  const known = new Set(previous.map((item) => `${item.entityType}:${item.id}`));
  return latest.filter((item) => item.createdAt >= lastTime && !known.has(`${item.entityType}:${item.id}`));
}
