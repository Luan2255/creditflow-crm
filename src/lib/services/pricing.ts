import { AuditAction, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { Actor } from "@/lib/services/clients";

export async function listPricingRules(activeOnly = false) {
  return prisma.pricingRule.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    orderBy: { termMonths: "asc" },
  });
}

export async function listProducts(activeOnly = false) {
  return prisma.product.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    orderBy: { name: "asc" },
  });
}

export async function savePricingRule(actor: Actor, input: {
  termMonths: number;
  monthlyRate: number;
  isActive: boolean;
}) {
  if (actor.role !== Role.ADMIN) throw new Error("Somente ADMIN pode alterar as taxas.");
  return prisma.pricingRule.upsert({
    where: { termMonths: input.termMonths },
    update: { monthlyRate: input.monthlyRate.toFixed(4), isActive: input.isActive },
    create: {
      termMonths: input.termMonths,
      monthlyRate: input.monthlyRate.toFixed(4),
      isActive: input.isActive,
    },
  });
}

export async function listPartnerCommissions(actor: Actor) {
  if (actor.role !== Role.ADMIN) throw new Error("Somente ADMIN pode consultar comissões.");
  return prisma.user.findMany({
    where: { role: Role.PARCEIRO, isActive: true },
    select: {
      id: true,
      name: true,
      productCommissions: { select: { productId: true, commissionPercent: true } },
    },
    orderBy: { name: "asc" },
  });
}

export async function savePartnerCommission(
  actor: Actor,
  partnerId: string,
  productId: string,
  commissionPercent: number,
) {
  if (actor.role !== Role.ADMIN) throw new Error("Somente ADMIN pode alterar comissões.");
  await prisma.$transaction(async (transaction) => {
    const partner = await transaction.user.findFirst({
      where: { id: partnerId, role: Role.PARCEIRO },
      select: { id: true },
    });
    const product = await transaction.product.findFirst({
      where: { id: productId, isActive: true },
      select: { id: true },
    });
    if (!partner) throw new Error("Parceiro não encontrado.");
    if (!product) throw new Error("Produto não encontrado ou inativo.");

    await transaction.partnerProductCommission.upsert({
      where: { partnerId_productId: { partnerId, productId } },
      update: { commissionPercent: commissionPercent.toFixed(2) },
      create: { partnerId, productId, commissionPercent: commissionPercent.toFixed(2) },
    });

    await transaction.auditLog.create({
      data: {
        actorId: actor.id,
        action: AuditAction.PARTNER_COMMISSION_UPDATED,
        entity: "PARTNER_PRODUCT_COMMISSION",
        entityId: partnerId,
        metadata: { productId, commissionPercent },
      },
    });
  });
}