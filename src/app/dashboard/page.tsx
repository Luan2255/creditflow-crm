import { ArrowDownRight, ArrowUpRight, BriefcaseBusiness, CircleDollarSign, Users, Workflow } from "lucide-react";
import { DashboardFrame } from "@/components/dashboard-frame";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/authorization";
import { dashboardPeriodSchema } from "@/lib/validation";
import { getDashboardMetrics } from "@/lib/services/dashboard";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const statusNames: Record<string, string> = {
  CONSULTA: "Consulta",
  DIGITACAO: "Digitação",
  ANALISE: "Análise",
  APROVADA: "Aprovada",
  RECUSADA: "Recusada",
  PAGA: "Paga",
};

function localDateInput(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

export default async function DashboardPage({ searchParams }: { searchParams: SearchParams }) {
  const { user } = await requireRole();
  const query = await searchParams;
  const parsedPeriod = dashboardPeriodSchema.safeParse({ from: query.from, to: query.to });
  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1);
  const defaultTo = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const from = parsedPeriod.success
    ? new Date(`${parsedPeriod.data.from}T00:00:00`)
    : defaultFrom;
  const to = parsedPeriod.success
    ? new Date(`${parsedPeriod.data.to}T00:00:00`)
    : new Date(defaultTo.getTime());
  if (parsedPeriod.success) to.setDate(to.getDate() + 1);

  const metrics = await getDashboardMetrics({ id: user.id, role: user.role }, { from, to });
  const displayTo = parsedPeriod.success ? new Date(to.getTime()) : new Date(now.getFullYear(), now.getMonth() + 1, 0);
  if (parsedPeriod.success) displayTo.setDate(displayTo.getDate() - 1);
  const dateFormat = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" });

  return (
    <DashboardFrame user={user}>
      <section className="flex flex-wrap items-end justify-between gap-5 border-b border-neutral-200 pb-6">
        <div>
          <p className="text-sm text-neutral-500">Painel de operações</p>
          <h1 className="mt-1 font-serif text-3xl text-neutral-900">Visão geral</h1>
        </div>
        <form method="get" className="flex flex-wrap items-end gap-3">
          <label className="space-y-1 text-xs text-neutral-600">
            De
            <input name="from" type="date" defaultValue={localDateInput(parsedPeriod.success ? from : defaultFrom)} required className="h-10 border border-neutral-300 bg-white px-2 text-sm text-neutral-900" />
          </label>
          <label className="space-y-1 text-xs text-neutral-600">
            Até
            <input name="to" type="date" defaultValue={localDateInput(parsedPeriod.success ? displayTo : new Date(now.getFullYear(), now.getMonth(), now.getDate()))} required className="h-10 border border-neutral-300 bg-white px-2 text-sm text-neutral-900" />
          </label>
          <Button type="submit" variant="secondary" className="h-10">Filtrar</Button>
        </form>
      </section>

      <p className="mt-5 text-xs text-neutral-500">
        Período: {dateFormat.format(from)} – {dateFormat.format(displayTo)}
      </p>

      <section aria-label="Indicadores do período" className="mt-4 grid border-y border-neutral-200 bg-white sm:grid-cols-2 xl:grid-cols-4">
        <article className="border-b border-neutral-200 p-5 sm:border-r xl:border-b-0">
          <div className="flex items-center justify-between text-xs text-neutral-500"><span>Produção paga</span><CircleDollarSign size={17} /></div>
          <p className="mt-3 font-serif text-2xl tabular-nums text-neutral-950">{currency.format(metrics.production)}</p>
          <p className="mt-1 text-xs text-neutral-500">{metrics.paidCount} propostas pagas</p>
        </article>
        <article className="border-b border-neutral-200 p-5 xl:border-r xl:border-b-0">
          <div className="flex items-center justify-between text-xs text-neutral-500"><span>Ticket médio</span><BriefcaseBusiness size={17} /></div>
          <p className="mt-3 font-serif text-2xl tabular-nums text-neutral-950">{currency.format(metrics.averageTicket)}</p>
          <p className="mt-1 text-xs text-neutral-500">Por proposta paga</p>
        </article>
        <article className="border-b border-neutral-200 p-5 sm:border-r sm:border-b-0">
          <div className="flex items-center justify-between text-xs text-neutral-500"><span>Propostas no período</span><Workflow size={17} /></div>
          <p className="mt-3 font-serif text-2xl tabular-nums text-neutral-950">{metrics.proposalCount}</p>
          <p className="mt-1 text-xs text-neutral-500">Criadas entre as datas selecionadas</p>
        </article>
        <article className="p-5">
          <div className="flex items-center justify-between text-xs text-neutral-500"><span>Em andamento</span><Users size={17} /></div>
          <p className="mt-3 font-serif text-2xl tabular-nums text-neutral-950">{metrics.pipeline.filter((item) => item.status !== "PAGA" && item.status !== "RECUSADA").reduce((sum, item) => sum + item.count, 0)}</p>
          <p className="mt-1 text-xs text-neutral-500">Na carteira criada no período</p>
        </article>
      </section>

      <div className="mt-9 grid gap-10 xl:grid-cols-[1.2fr_0.8fr]">
        <section>
          <div className="flex items-end justify-between border-b border-neutral-200 pb-3">
            <div>
              <h2 className="font-serif text-xl text-neutral-900">Conversão por etapa</h2>
              <p className="mt-1 text-xs text-neutral-500">Propostas criadas no período selecionado</p>
            </div>
          </div>
          <ol className="divide-y divide-neutral-200">
            {metrics.funnel.map((stage) => (
              <li key={stage.label} className="grid grid-cols-[1fr_auto_auto] items-center gap-5 py-4">
                <span className="text-sm text-neutral-700">{stage.label}</span>
                <span className="text-sm tabular-nums text-neutral-900">{stage.count}</span>
                <span className="flex min-w-16 items-center justify-end gap-1 text-xs tabular-nums text-neutral-500">
                  {stage.conversion === null ? "Base" : <>{stage.conversion >= 50 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{stage.conversion}%</>}
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <div className="flex items-end justify-between border-b border-neutral-200 pb-3">
            <div>
              <h2 className="font-serif text-xl text-neutral-900">{user.role === "PARCEIRO" ? "Sua produção" : "Ranking de parceiros"}</h2>
              <p className="mt-1 text-xs text-neutral-500">Ordenado pelo valor pago no período</p>
            </div>
          </div>
          {metrics.partnerRanking.length ? (
            <ol className="divide-y divide-neutral-200">
              {metrics.partnerRanking.map((partner, index) => (
                <li key={partner.name} className="flex items-center justify-between gap-4 py-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid size-8 shrink-0 place-items-center border border-neutral-200 text-xs tabular-nums text-neutral-500">{index + 1}</span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-neutral-900">{partner.name}</p>
                      <p className="text-xs text-neutral-500">{currency.format(partner.commission)} em comissão</p>
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-emerald-950">{currency.format(partner.amount)}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="py-8 text-sm text-neutral-500">Nenhuma proposta paga neste período.</p>
          )}
        </section>
      </div>

      <section className="mt-10">
        <div className="flex items-end justify-between border-b border-neutral-200 pb-3">
          <div>
            <h2 className="font-serif text-xl text-neutral-900">Carteira por status</h2>
            <p className="mt-1 text-xs text-neutral-500">Propostas criadas no período selecionado</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-px border border-neutral-200 bg-neutral-200 sm:grid-cols-3 xl:grid-cols-6">
          {metrics.pipeline.map((item) => (
            <div key={item.status} className="bg-white p-4">
              <p className="text-xs text-neutral-500">{statusNames[item.status]}</p>
              <p className="mt-2 text-xl tabular-nums text-neutral-900">{item.count}</p>
            </div>
          ))}
        </div>
      </section>
    </DashboardFrame>
  );
}