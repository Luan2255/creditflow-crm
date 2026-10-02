import { ProposalStatus, Role } from "@prisma/client";
import { PROPOSAL_STATUSES } from "@/lib/domain";
import type { Actor } from "@/lib/services/clients";
import { prisma } from "@/lib/prisma";

export async function getDashboardMetrics(actor: Actor, period: { from: Date; to: Date }) {
  const partnerFilter = actor.role === Role.PARCEIRO ? { partnerId: actor.id } : {};
  const dateFilter = { gte: period.from, lt: period.to };

  const [paidThisMonth, monthlyProposals, currentPipeline] = await Promise.all([
    prisma.proposal.findMany({
      where: { ...partnerFilter, status: ProposalStatus.PAGA, paidAt: dateFilter },
      select: {
        amount: true,
        commissionAmount: true,
        partnerId: true,
        partner: { select: { name: true } },
      },
    }),
    prisma.proposal.findMany({
      where: { ...partnerFilter, createdAt: dateFilter },
      select: { id: true, statusHistory: { select: { toStatus: true } } },
    }),
    prisma.proposal.groupBy({
      by: ["status"],
      where: { ...partnerFilter, createdAt: dateFilter },
      _count: { _all: true },
    }),
  ]);

  const production = paidThisMonth.reduce((sum, proposal) => sum + proposal.amount.toNumber(), 0);
  const stageCounts = Object.fromEntries(PROPOSAL_STATUSES.map((status) => [status, 0])) as Record<string, number>;
  for (const proposal of monthlyProposals) {
    for (const history of proposal.statusHistory) stageCounts[history.toStatus] += 1;
  }

  const funnel = [
    { label: "Consulta", count: stageCounts.CONSULTA },
    { label: "Digitação", count: stageCounts.DIGITACAO },
    { label: "Análise", count: stageCounts.ANALISE },
    { label: "Decisão", count: stageCounts.APROVADA + stageCounts.RECUSADA },
    { label: "Paga", count: stageCounts.PAGA },
  ].map((stage, index, stages) => ({
    ...stage,
    conversion: index === 0 || stages[index - 1].count === 0
      ? null
      : Math.round((stage.count / stages[index - 1].count) * 100),
  }));

  const partnerTotals = new Map<string, { name: string; amount: number; commission: number }>();
  for (const proposal of paidThisMonth) {
    const existing = partnerTotals.get(proposal.partnerId) ?? {
      name: proposal.partner.name,
      amount: 0,
      commission: 0,
    };
    existing.amount += proposal.amount.toNumber();
    existing.commission += proposal.commissionAmount?.toNumber() ?? 0;
    partnerTotals.set(proposal.partnerId, existing);
  }

  return {
    production,
    averageTicket: paidThisMonth.length ? production / paidThisMonth.length : 0,
    paidCount: paidThisMonth.length,
    proposalCount: monthlyProposals.length,
    funnel,
    pipeline: PROPOSAL_STATUSES.map((status) => ({
      status,
      count: currentPipeline.find((item) => item.status === status)?._count._all ?? 0,
    })),
    partnerRanking: [...partnerTotals.values()].sort((left, right) => right.amount - left.amount),
  };
}