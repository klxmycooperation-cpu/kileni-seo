"use client";

import { useCallback, useEffect, useState } from "react";

export function useCsrf() {
  const [token, setToken] = useState("");
  const load = useCallback(async () => {
    const response = await fetch("/api/csrf", { credentials: "same-origin", cache: "no-store" });
    if (!response.ok) throw new Error("CSRF token unavailable");
    const data = await response.json() as { token: string };
    setToken(data.token);
    return data.token;
  }, []);
  useEffect(() => { void load(); }, [load]);
  return { token, refresh: load };
}
