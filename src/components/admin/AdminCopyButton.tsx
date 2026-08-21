"use client";

import { useState } from "react";

export function AdminCopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    const absolute = new URL(value, window.location.origin).toString();
    try {
      await navigator.clipboard.writeText(absolute);
    } catch {
      const field = document.createElement("textarea");
      field.value = absolute;
      field.style.position = "fixed";
      field.style.opacity = "0";
      document.body.append(field);
      field.select();
      document.execCommand("copy");
      field.remove();
    }
    setCopied(true);
  }
  return <button type="button" onClick={() => void copy()}>{copied ? "Ссылка скопирована" : "Скопировать публичную ссылку"}</button>;
}
