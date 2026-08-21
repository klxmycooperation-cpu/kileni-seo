import { redirect } from "next/navigation";

import { currentAdmin } from "./_lib/auth";

export default async function AdminPage() {
  redirect(await currentAdmin() ? "/admin/audits" : "/admin/login");
}
