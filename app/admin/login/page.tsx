import { redirect } from "next/navigation";

import { AdminLoginForm } from "@/src/components/admin/AdminLoginForm";
import { currentAdmin } from "../_lib/auth";

export default async function AdminLoginPage() {
  if (await currentAdmin()) redirect("/admin");
  return (
    <section className="admin-login-card">
      <p className="admin-kicker">Закрытый раздел</p>
      <h1>Вход администратора</h1>
      <p>Сессия хранится только в защищённой cookie и автоматически истекает.</p>
      <AdminLoginForm/>
    </section>
  );
}
