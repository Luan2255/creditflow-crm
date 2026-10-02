import { AuditAction, Prisma, ProposalStatus, Role } from "@prisma/client";
import { canAccessPartnerData, canTransitionProposal, calculateCommission } from "@/lib/domain";
import { prisma } from "@/lib/prisma";
import type { Actor } from "@/lib/services/clients";
import { auditCpfAccess } from "@/lib/services/audit";

export async function listProposals(actor: Actor) {
  const proposals = await prisma.proposal.findMany({
    where: actor.role === Role.PARCEIRO ? { partnerId: actor.id } : undefined,
    include: {
      client: { select: { id: true, name: true, cpf: true } },
      product: { select: { id: true, name: true } },
      partner: { select: { id: true, name: true } },
      statusHistory: {
        include: { actor: { select: { name: true } } },
        orderBy: { changedAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (actor.role === Role.ADMIN) {
    await auditCpfAccess(actor.id, proposals.map((proposal) => proposal.clientId), "proposals");
  }

  return proposals;
}

export async function createProposal(actor: Actor, input: {
  clientId: string;
  productId: string;
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

  const product = await prisma.product.findFirst({
    where: { id: input.productId, isActive: true },
    select: { id: true },
  });
  if (!product) throw new Error("Produto não encontrado ou inativo.");

  const pricing = await prisma.pricingRule.findUnique({ where: { termMonths: input.termMonths } });
  if (!pricing?.isActive) throw new Error("Prazo indisponível na tabela de taxas.");

  return prisma.proposal.create({
    data: {
      clientId: client.id,
      productId: product.id,
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
    });
    if (!proposal) throw new Error("Proposta não encontrada.");
    if (!canAccessPartnerData(actor.role, actor.id, proposal.partnerId)) {
      throw new Error("Você não tem acesso a esta proposta.");
    }
    if (!canTransitionProposal(proposal.status, nextStatus)) {
      throw new Error("Mudança de status não permitida.");
    }

    const isPaid = nextStatus === ProposalStatus.PAGA;
    const commissionRule = isPaid
      ? await transaction.partnerProductCommission.findUnique({
          where: {
            partnerId_productId: { partnerId: proposal.partnerId, productId: proposal.productId },
          },
        })
      : null;
    if (isPaid && !commissionRule) {
      throw new Error("Configure a comissão deste parceiro e produto antes de marcar como paga.");
    }
    const commissionPercent = commissionRule?.commissionPercent.toNumber() ?? null;
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
    await transaction.auditLog.create({
      data: {
        actorId: actor.id,
        action: AuditAction.PROPOSAL_STATUS_CHANGED,
        entity: "PROPOSAL",
        entityId: proposal.id,
        metadata: { from: proposal.status, to: nextStatus },
      },
    });
  });
}