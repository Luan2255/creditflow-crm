import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { Actor } from "@/lib/services/clients";

export async function listPricingRules(activeOnly = false) {
  return prisma.pricingRule.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    orderBy: { termMonths: "asc" },
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

export async function listPartnerCommissions() {
  return prisma.user.findMany({
    where: { role: Role.PARCEIRO, isActive: true },
    select: { id: true, name: true, commissionPercent: true },
    orderBy: { name: "asc" },
  });
}

export async function savePartnerCommission(actor: Actor, partnerId: string, commissionPercent: number) {
  if (actor.role !== Role.ADMIN) throw new Error("Somente ADMIN pode alterar comissões.");
  const result = await prisma.user.updateMany({
    where: { id: partnerId, role: Role.PARCEIRO },
    data: { commissionPercent: commissionPercent.toFixed(2) },
  });
  if (result.count !== 1) throw new Error("Parceiro não encontrado.");
}