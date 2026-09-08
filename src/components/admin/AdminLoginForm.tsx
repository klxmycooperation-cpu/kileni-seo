"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useCsrf } from "@/src/components/forms/useCsrf";

export function AdminLoginForm() {
  const router = useRouter();
  const { token, refresh } = useCsrf();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const csrf = token || await refresh();
      const response = await fetch("/api/admin/session", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json", "x-csrf-token": csrf },
        body: JSON.stringify({ login: form.get("login"), password: form.get("password") }),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({})) as { message?: string };
        setMessage(result.message ?? "Не удалось войти");
        return;
      }
      router.replace("/admin");
      router.refresh();
    } catch {
      setMessage("Сервис входа временно недоступен");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="admin-login-form" onSubmit={submit}>
      <label><span>Логин</span><input name="login" autoComplete="username" required maxLength={100}/></label>
      <label><span>Пароль</span><input name="password" type="password" autoComplete="current-password" required maxLength={500}/></label>
      {message && <p className="admin-error" role="alert">{message}</p>}
      <button type="submit" disabled={pending || !token}>{pending ? "Проверяем…" : "Войти"}</button>
    </form>
  );
}
