import { describe, expect, it, vi } from "vitest";
import { createCsrfTokenStore } from "../../src/components/forms/csrf-client";

describe("client CSRF token store", () => {
  it("shares the first request so a late response cannot replace the form token cookie", async () => {
    let resolveFirst: ((token: string) => void) | undefined;
    const loadToken = vi.fn(() => new Promise<string>((resolve) => { resolveFirst = resolve; }));
    const store = createCsrfTokenStore(loadToken);

    const initial = store.get();
    const concurrentRenewal = store.renew();

    expect(loadToken).toHaveBeenCalledTimes(1);
    resolveFirst?.("first-token");
    await expect(initial).resolves.toBe("first-token");
    await expect(concurrentRenewal).resolves.toBe("first-token");
    expect(await store.get()).toBe("first-token");
  });

  it("requests a replacement only after the previous token has settled", async () => {
    const loadToken = vi.fn()
      .mockResolvedValueOnce("first-token")
      .mockResolvedValueOnce("replacement-token");
    const store = createCsrfTokenStore(loadToken);

    await store.get();
    await expect(store.renew()).resolves.toBe("replacement-token");
    expect(loadToken).toHaveBeenCalledTimes(2);
    await expect(store.get()).resolves.toBe("replacement-token");
  });
});
