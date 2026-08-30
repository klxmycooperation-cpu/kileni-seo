"use client";

import { useCallback, useEffect, useState } from "react";

export function useCsrf() {
  const [token, setToken] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const response = await fetch("/api/csrf", { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) throw new Error("CSRF token unavailable");
      const data = await response.json() as { token: string };
      setToken(data.token);
      return data.token;
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
