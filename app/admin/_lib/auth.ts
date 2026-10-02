import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { adminCookieName, configuredAdminPasswordHash, configuredAdminSessionSecret, verifyAdminSession } from "@/src/lib/security/session";

export type AdminIdentity = { login: string; exp: number };

export function adminFromRequest(request: Request): AdminIdentity | null {
  const token = request.headers.get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${adminCookieName}=`))
    ?.slice(adminCookieName.length + 1);
  return validIdentity(verifyAdminSession(token));
}

export async function currentAdmin(): Promise<AdminIdentity | null> {
  const token = (await cookies()).get(adminCookieName)?.value;
  return validIdentity(verifyAdminSession(token));
}

export async function requireAdmin(): Promise<AdminIdentity> {
  const admin = await currentAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

function validIdentity(identity: AdminIdentity | null): AdminIdentity | null {
  const configuredLogin = process.env.ADMIN_LOGIN;
  if (process.env.NODE_ENV === "production" && (!configuredAdminSessionSecret()
    || !configuredAdminPasswordHash())) return null;
  if (!identity || !configuredLogin || identity.login !== configuredLogin) return null;
  return identity;
}
