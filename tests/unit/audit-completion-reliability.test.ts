import { describe, expect, it, vi } from "vitest";

import { completeAuditReliably } from "../../src/lib/audit/completion-reliability";

describe("completeAuditReliably", () => {
  it("retries a transient database fetch failure before sending notifications", async () => {
    const persist = vi.fn()
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(undefined);
    const notify = vi.fn().mockResolvedValue(undefined);

    const result = await completeAuditReliably({
      persist,
      notify,
      retryDelaysMs: [0, 0],
    });

    expect(result).toEqual({ notificationError: null, persistenceAttempts: 2 });
    expect(persist).toHaveBeenCalledTimes(2);
    expect(notify).toHaveBeenCalledTimes(1);
  });

  it("retries a timed-out database completion before sending notifications", async () => {
    const timeout = new Error("request timed out");
    timeout.name = "TimeoutError";
    const persist = vi.fn()
      .mockRejectedValueOnce(timeout)
      .mockResolvedValueOnce(undefined);
    const notify = vi.fn().mockResolvedValue(undefined);

    const result = await completeAuditReliably({
      persist,
      notify,
      retryDelaysMs: [0, 0],
    });

    expect(result).toEqual({ notificationError: null, persistenceAttempts: 2 });
    expect(persist).toHaveBeenCalledTimes(2);
    expect(notify).toHaveBeenCalledTimes(1);
  });

  it("keeps a saved audit successful when a completion notification fails", async () => {
    const persist = vi.fn().mockResolvedValue(undefined);
    const notify = vi.fn().mockRejectedValue(new TypeError("fetch failed"));

    const result = await completeAuditReliably({
      persist,
      notify,
      retryDelaysMs: [0, 0],
    });

    expect(result.persistenceAttempts).toBe(1);
    expect(result.notificationError).toBeInstanceOf(TypeError);
  });

  it("does not retry deterministic report errors", async () => {
    const persist = vi.fn().mockRejectedValue(new Error("invalid audit contract"));
    const notify = vi.fn();

    await expect(completeAuditReliably({
      persist,
      notify,
      retryDelaysMs: [0, 0],
    })).rejects.toThrow("invalid audit contract");

    expect(persist).toHaveBeenCalledTimes(1);
    expect(notify).not.toHaveBeenCalled();
  });
});
