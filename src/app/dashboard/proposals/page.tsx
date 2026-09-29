import { ProposalStatus, Role } from "@prisma/client";
import { DashboardFrame } from "@/components/dashboard-frame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireRole } from "@/lib/authorization";
import { canTransitionProposal, formatCpf, PROPOSAL_STATUSES, type ProposalStage } from "@/lib/domain";
import { listClientsForProposal } from "@/lib/services/clients";
import { listPricingRules } from "@/lib/services/pricing";
import { listProposals } from "@/lib/services/proposals";
import { changeProposalStatusAction, createProposalAction } from "@/app/actions";

const statuses: { key: ProposalStatus; label: string }[] = [
  { key: ProposalStatus.CONSULTA, label: "Consulta" },
  { key: ProposalStatus.DIGITACAO, label: "Digitação" },
  { key: ProposalStatus.ANALISE, label: "Análise" },
  { key: ProposalStatus.APROVADA, label: "Aprovada" },
  { key: ProposalStatus.RECUSADA, label: "Recusada" },
  { key: ProposalStatus.PAGA, label: "Paga" },
];
const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default async function ProposalsPage() {
  const { user } = await requireRole(Role.ADMIN, Role.OPERADOR, Role.PARCEIRO);
  const [proposals, clients, pricingRules] = await Promise.all([
    listProposals(user),
    listClientsForProposal(user),
    listPricingRules(true),
  ]);

  return (
    <DashboardFrame user={user}>
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-neutral-200 pb-6">
        <div>
          <p className="text-sm text-neutral-500">Esteira de crédito</p>
          <h1 className="mt-1 font-serif text-3xl text-neutral-900">Propostas</h1>
        </div>
        <span className="text-sm text-neutral-500">{proposals.length} propostas</span>
      </div>

      <section className="mt-6 border-b border-neutral-200 pb-7">
        <h2 className="font-serif text-xl text-neutral-900">Nova proposta</h2>
        {clients.length && pricingRules.length ? (
          <form action={createProposalAction} className="mt-4 grid gap-3 sm:grid-cols-[minmax(200px,1.3fr)_minmax(150px,1fr)_minmax(120px,0.6fr)_auto] sm:items-end">
            <label className="space-y-1 text-xs text-neutral-600">
              Cliente
              <select id="proposal-client" name="clientId" required className="h-11 w-full border border-neutral-300 bg-white px-3 text-sm text-neutral-900">
                {clients.map((client) => <option key={client.id} value={client.id}>{client.name} · {client.displayCpf}</option>)}
              </select>
            </label>
            <label className="space-y-1 text-xs text-neutral-600">
              Valor solicitado
              <Input name="amount" type="number" min="1" step="0.01" placeholder="R$ 8.500,00" required />
            </label>
            <label className="space-y-1 text-xs text-neutral-600">
              Prazo
              <select name="termMonths" required className="h-11 w-full border border-neutral-300 bg-white px-3 text-sm text-neutral-900">
                {pricingRules.map((rule) => <option key={rule.id} value={rule.termMonths}>{rule.termMonths} meses · {rule.monthlyRate.toString()}% a.m.</option>)}
              </select>
            </label>
            <Button type="submit" className="h-11">Criar proposta</Button>
          </form>
        ) : (
          <p className="mt-3 text-sm text-neutral-600">
            {clients.length ? "Cadastre uma taxa ativa no simulador para criar propostas." : "Cadastre um cliente para iniciar uma proposta."}
          </p>
        )}
      </section>

      <section aria-label="Kanban de propostas" className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {statuses.map((status) => {
          const column = proposals.filter((proposal) => proposal.status === status.key);
          return (
            <section key={status.key} aria-labelledby={`status-${status.key}`} className="min-w-0 border-t-2 border-emerald-900">
              <div className="flex items-center justify-between py-3">
                <h2 id={`status-${status.key}`} className="text-sm font-semibold text-neutral-900">{status.label}</h2>
                <span className="text-xs tabular-nums text-neutral-500">{column.length}</span>
              </div>
              <div className="space-y-3">
                {column.map((proposal) => {
                  const nextStatuses = PROPOSAL_STATUSES.filter((next) => canTransitionProposal(proposal.status as ProposalStage, next));
                  return (
                    <article key={proposal.id} data-testid={`proposal-${proposal.id}`} className="border border-neutral-200 bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-semibold text-neutral-900">{proposal.client.name}</h3>
                          <p className="mt-1 text-xs tabular-nums text-neutral-500">{formatCpf(proposal.client.cpf, user.role === Role.ADMIN)}</p>
                        </div>
                        <p className="shrink-0 text-sm font-semibold tabular-nums text-emerald-950">{currency.format(proposal.amount.toNumber())}</p>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
                        <span>{proposal.termMonths} meses · {proposal.monthlyRate.toString()}% a.m.</span>
                        {user.role !== Role.PARCEIRO && <span>{proposal.partner.name}</span>}
                      </div>
                      {proposal.status === ProposalStatus.PAGA && proposal.commissionAmount && (
                        <p className="mt-3 border-t border-neutral-100 pt-2 text-xs text-emerald-900">
                          Comissão: {currency.format(proposal.commissionAmount.toNumber())} · {proposal.commissionPercentSnapshot?.toString()}%
                        </p>
                      )}
                      {nextStatuses.length > 0 && (
                        <form action={changeProposalStatusAction} className="mt-4 flex gap-2 border-t border-neutral-100 pt-3">
                          <input type="hidden" name="id" value={proposal.id} />
                          <select name="status" aria-label={`Próximo status de ${proposal.client.name}`} className="h-9 min-w-0 flex-1 border border-neutral-300 bg-white px-2 text-xs text-neutral-800">
                            {nextStatuses.map((next) => <option key={next} value={next}>{statuses.find((item) => item.key === next)?.label}</option>)}
                          </select>
                          <Button type="submit" variant="secondary" className="h-9 shrink-0 px-3 text-xs">Avançar</Button>
                        </form>
                      )}
                      <details className="mt-3 border-t border-neutral-100 pt-2">
                        <summary className="cursor-pointer text-xs text-neutral-500">Histórico de status · {proposal.statusHistory.length}</summary>
                        <ol className="mt-3 space-y-2">
                          {proposal.statusHistory.map((entry) => (
                            <li key={entry.id} className="flex justify-between gap-2 text-xs text-neutral-600">
                              <span>{entry.fromStatus ? `${statuses.find((item) => item.key === entry.fromStatus)?.label} → ` : ""}{statuses.find((item) => item.key === entry.toStatus)?.label} · {entry.actor.name}</span>
                              <time className="shrink-0 tabular-nums text-neutral-400" dateTime={entry.changedAt.toISOString()}>
                                {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(entry.changedAt)}
                              </time>
                            </li>
                          ))}
                        </ol>
                      </details>
                    </article>
                  );
                })}
                {!column.length && <p className="border border-dashed border-neutral-300 px-4 py-6 text-center text-xs text-neutral-400">Nenhuma proposta</p>}
              </div>
            </section>
          );
        })}
      </section>
    </DashboardFrame>
  );
}