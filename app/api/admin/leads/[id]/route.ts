import { deleteSubmission, patchSubmission } from "../../_lib/entities";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return patchSubmission(request, (await context.params).id, "lead");
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  return deleteSubmission(request, (await context.params).id, "lead");
}
