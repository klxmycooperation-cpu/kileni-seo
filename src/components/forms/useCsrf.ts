"use client";

import { useCallback, useEffect, useState } from "react";
import { createCsrfTokenStore } from "./csrf-client";

const csrfTokens = createCsrfTokenStore(async () => {
  const response = await fetch("/api/csrf", { credentials: "same-origin", cache: "no-store" });
  if (!response.ok) throw new Error("CSRF token unavailable");
  const data = await response.json() as { token?: string };
  if (!data.token) throw new Error("CSRF token unavailable");
  return data.token;
});

export function useCsrf() {
  const [token, setToken] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async (replace = false) => {
    setLoading(true);
    setError(false);
    try {
      const nextToken = replace ? await csrfTokens.renew() : await csrfTokens.get();
      setToken(nextToken);
      return nextToken;
    } catch (requestError) {
      setToken("");
      setError(true);
      throw requestError;
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load().catch(() => undefined); }, [load]);
  return { token, refresh: load, error, loading };
}
