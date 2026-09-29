import { Prisma, ProposalStatus, Role } from "@prisma/client";
import { canAccessPartnerData, canTransitionProposal, calculateCommission } from "@/lib/domain";
import { prisma } from "@/lib/prisma";
import type { Actor } from "@/lib/services/clients";

export async function listProposals(actor: Actor) {
  return prisma.proposal.findMany({
    where: actor.role === Role.PARCEIRO ? { partnerId: actor.id } : undefined,
    include: {
      client: { select: { id: true, name: true, cpf: true } },
      partner: { select: { id: true, name: true } },
      statusHistory: {
        include: { actor: { select: { name: true } } },
        orderBy: { changedAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createProposal(actor: Actor, input: {
  clientId: string;
  amount: number;
  termMonths: number;
}) {
  const client = await prisma.client.findUnique({
    where: { id: input.clientId },
    select: { id: true, partnerId: true },
  });
  if (!client) throw new Error("Cliente não encontrado.");
  if (!canAccessPartnerData(actor.role, actor.id, client.partnerId)) {
    throw new Error("Você não tem acesso a este cliente.");
  }

  const pricing = await prisma.pricingRule.findUnique({ where: { termMonths: input.termMonths } });
  if (!pricing?.isActive) throw new Error("Prazo indisponível na tabela de taxas.");

  return prisma.proposal.create({
    data: {
      clientId: client.id,
      partnerId: client.partnerId,
      amount: input.amount.toFixed(2),
      termMonths: input.termMonths,
      monthlyRate: pricing.monthlyRate,
      statusHistory: {
        create: { fromStatus: null, toStatus: ProposalStatus.CONSULTA, actorId: actor.id },
      },
    },
  });
}

export async function changeProposalStatus(actor: Actor, proposalId: string, nextStatus: ProposalStatus) {
  return prisma.$transaction(async (transaction) => {
    const proposal = await transaction.proposal.findUnique({
      where: { id: proposalId },
      include: { partner: { select: { commissionPercent: true } } },
    });
    if (!proposal) throw new Error("Proposta não encontrada.");
    if (!canAccessPartnerData(actor.role, actor.id, proposal.partnerId)) {
      throw new Error("Você não tem acesso a esta proposta.");
    }
    if (!canTransitionProposal(proposal.status, nextStatus)) {
      throw new Error("Mudança de status não permitida.");
    }

    const isPaid = nextStatus === ProposalStatus.PAGA;
    const commissionPercent = isPaid ? proposal.partner.commissionPercent.toNumber() : null;
    const commissionAmount = isPaid
      ? calculateCommission(proposal.amount.toNumber(), commissionPercent ?? 0)
      : null;

    const updated = await transaction.proposal.updateMany({
      where: { id: proposal.id, status: proposal.status },
      data: {
        status: nextStatus,
        ...(isPaid && {
          paidAt: new Date(),
          commissionPercentSnapshot: new Prisma.Decimal(commissionPercent ?? 0),
          commissionAmount: new Prisma.Decimal((commissionAmount ?? 0).toFixed(2)),
        }),
      },
    });
    if (updated.count !== 1) throw new Error("A proposta foi alterada por outra pessoa. Atualize e tente novamente.");

    await transaction.proposalStatusHistory.create({
      data: {
        proposalId: proposal.id,
        fromStatus: proposal.status,
        toStatus: nextStatus,
        actorId: actor.id,
      },
    });
  });
}