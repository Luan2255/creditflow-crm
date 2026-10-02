import { AuditAction } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function auditCpfAccess(actorId: string, clientIds: string[], source: string) {
  const uniqueClientIds = [...new Set(clientIds)];
  if (!uniqueClientIds.length) return;

  await prisma.auditLog.createMany({
    data: uniqueClientIds.map((entityId) => ({
      actorId,
      action: AuditAction.CLIENT_CPF_VIEWED,
      entity: "CLIENT",
      entityId,
      metadata: { source },
    })),
  });
}