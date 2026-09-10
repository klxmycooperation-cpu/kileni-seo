"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useCsrf } from "@/src/components/forms/useCsrf";

export function AdminLogoutButton() {
  const router = useRouter();
  const { refresh } = useCsrf();
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);
    try {
      const csrf = await refresh();
      await fetch("/api/admin/session", {
        method: "DELETE",
        credentials: "same-origin",
        headers: { "x-csrf-token": csrf },
      });
    } finally {
      router.replace("/admin/login");
      router.refresh();
    }
  }

  return <button className="admin-nav-button" type="button" onClick={() => void logout()} disabled={pending}>{pending ? "Выходим…" : "Выйти"}</button>;
}
