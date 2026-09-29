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