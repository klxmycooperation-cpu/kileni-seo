import { describe, expect, it } from "vitest";

import { POST } from "@/app/api/admin/audits/[id]/client-message/route";

describe("маршрут текста для заказчика", () => {
  it("не допускает запрос без административной сессии", async () => {
    const response = await POST(
      new Request("http://localhost/api/admin/audits/11111111-1111-4111-8111-111111111111/client-message", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "http://localhost" },
        body: JSON.stringify({ variant: 0 }),
      }),
      { params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }) },
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ error: "ADMIN_AUTH_REQUIRED" });
  });
});
