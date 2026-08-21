import { apiError, mutationGuard } from "../../_lib/http";
import { adminFromRequest } from "@/app/admin/_lib/auth";

export function adminGuard(request: Request) {
  return adminFromRequest(request)
    ? null
    : apiError(401, "ADMIN_AUTH_REQUIRED", "Требуется вход администратора");
}

export function adminMutationGuard(request: Request) {
  return adminGuard(request) ?? mutationGuard(request);
}
