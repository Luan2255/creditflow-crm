import { Role } from "@prisma/client";
import { requireRole } from "@/lib/authorization";
import { getDashboardMetrics } from "@/lib/services/dashboard";
import { DashboardFrame } from "@/components/dashboard-frame";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const statusNames: Record<string, string> = {
  CONSULTA: "Consulta",
  DIGITACAO: "Digitação",
  ANALISE: "Análise",
  APROVADA: "Aprovada",
  RECUSADA: "Recusada",
  PAGA: "Paga",
};

export default async function DashboardPage() {
  const { user } = await requireRole(Role.ADMIN, Role.OPERADOR, Role.PARCEIRO);
  const metrics = await getDashboardMetrics(user);
  const month = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date());
  const maxStage = Math.max(1, ...metrics.funnel.map((stage) => stage.count));

  return (
    <DashboardFrame user={user}>
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-neutral-200 pb-6">
        <div>
          <p className="text-sm capitalize text-neutral-500">Painel de operações · {month}</p>
          <h1 className="mt-1 font-serif text-3xl text-neutral-900">Olá, {user.name?.split(" ")[0]}</h1>
        </div>
        <a href="/dashboard/proposals" className="inline-flex h-10 items-center bg-emerald-900 px-4 text-sm font-medium text-white hover:bg-emerald-800">
          Nova proposta <span aria-hidden="true" className="ml-2">+</span>
        </a>
      </div>

      <section aria-label="Indicadores do mês" className="mt-7 grid gap-px border border-neutral-200 bg-neutral-200 sm:grid-cols-3">
        <article className="bg-white p-5 sm:p-6">
          <p className="text-sm text-neutral-500">Produção paga</p>
          <p className="mt-2 font-serif text-3xl text-neutral-950">{currency.format(metrics.production)}</p>
          <p className="mt-2 text-xs text-neutral-500">{metrics.paidCount} propostas pagas no mês</p>
        </article>
        <article className="bg-white p-5 sm:p-6">
          <p className="text-sm text-neutral-500">Ticket médio</p>
          <p className="mt-2 font-serif text-3xl text-neutral-950">{currency.format(metrics.averageTicket)}</p>
          <p className="mt-2 text-xs text-neutral-500">Valor médio por proposta paga</p>
        </article>
        <article className="bg-white p-5 sm:p-6">
          <p className="text-sm text-neutral-500">Em andamento</p>
          <p className="mt-2 font-serif text-3xl text-neutral-950">
            {metrics.pipeline.filter((stage) => !["PAGA", "RECUSADA"].includes(stage.status)).reduce((sum, stage) => sum + stage.count, 0)}
          </p>
          <p className="mt-2 text-xs text-neutral-500">Propostas abertas em todas as etapas</p>
        </article>
      </section>

      <div className="mt-9 grid gap-9 lg:grid-cols-[1.2fr_0.8fr]">
        <section>
          <div className="flex items-end justify-between border-b border-neutral-200 pb-3">
            <div>
              <h2 className="font-serif text-xl text-neutral-900">Conversão por etapa</h2>
              <p className="mt-1 text-xs text-neutral-500">Propostas criadas neste mês</p>
            </div>
            <a href="/dashboard/proposals" className="text-xs font-medium text-emerald-900 hover:underline">Abrir kanban</a>
          </div>
          <div className="divide-y divide-neutral-200">
            {metrics.funnel.map((stage) => (
              <div key={stage.label} className="grid grid-cols-[84px_1fr_46px_48px] items-center gap-3 py-4 sm:grid-cols-[100px_1fr_54px_56px]">
                <span className="text-sm text-neutral-700">{stage.label}</span>
                <div className="h-2 bg-neutral-200">
                  <div className="h-full bg-emerald-800" style={{ width: `${(stage.count / maxStage) * 100}%` }} />
                </div>
                <span className="text-right text-sm font-semibold tabular-nums text-neutral-900">{stage.count}</span>
                <span className="text-right text-xs tabular-nums text-neutral-500">{stage.conversion === null ? "—" : `${stage.conversion}%`}</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="border-b border-neutral-200 pb-3">
            <h2 className="font-serif text-xl text-neutral-900">Parceiros em destaque</h2>
            <p className="mt-1 text-xs text-neutral-500">Produção paga neste mês</p>
          </div>
          {metrics.partnerRanking.length ? (
            <ol className="divide-y divide-neutral-200">
              {metrics.partnerRanking.slice(0, 5).map((partner, index) => (
                <li key={partner.name} className="flex items-center gap-4 py-4">
                  <span className="flex size-8 shrink-0 items-center justify-center border border-neutral-200 text-xs font-semibold text-neutral-500">{String(index + 1).padStart(2, "0")}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-800">{partner.name}</span>
                  <span className="text-right text-sm font-semibold tabular-nums text-neutral-900">{currency.format(partner.amount)}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="py-6 text-sm text-neutral-500">Ainda não há propostas pagas neste mês.</p>
          )}
        </section>
      </div>

      <section className="mt-9 border-t border-neutral-200 pt-6">
        <div className="mb-4">
          <h2 className="font-serif text-xl text-neutral-900">Pipeline atual</h2>
          <p className="mt-1 text-xs text-neutral-500">Distribuição das propostas por status</p>
        </div>
        <div className="grid grid-cols-2 gap-px border border-neutral-200 bg-neutral-200 sm:grid-cols-3 lg:grid-cols-6">
          {metrics.pipeline.map((stage) => (
            <div key={stage.status} className="bg-white px-4 py-4">
              <p className="text-xs text-neutral-500">{statusNames[stage.status]}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-neutral-900">{stage.count}</p>
            </div>
          ))}
        </div>
      </section>
    </DashboardFrame>
  );
}