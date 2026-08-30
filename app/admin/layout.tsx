import type { Metadata } from "next";
import Link from "next/link";

import { AdminLogoutButton } from "@/src/components/admin/AdminLogoutButton";
import { currentAdmin } from "./_lib/auth";
import "./admin.css";

export const metadata: Metadata = {
  title: "Администрирование",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await currentAdmin();
  return (
    <div className="admin-shell">
      <header className="admin-header">
        <Link className="admin-brand" href={admin ? "/admin" : "/admin/login"}>KILENI <span>ADMIN</span></Link>
        {admin && <nav aria-label="Администрирование">
          <Link href="/admin">Обзор</Link>
          <Link href="/admin/audits">Аудиты</Link>
          <Link href="/admin/leads">Заявки</Link>
          <Link href="/admin/briefs">Брифы</Link>
          <AdminLogoutButton/>
        </nav>}
      </header>
      <main id="main-content" className="admin-main">{children}</main>
    </div>
  );
}
