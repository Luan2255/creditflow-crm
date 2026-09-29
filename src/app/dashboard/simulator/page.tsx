import { Role } from "@prisma/client";
import { DashboardFrame } from "@/components/dashboard-frame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { savePartnerCommissionAction, savePricingRuleAction } from "@/app/actions";
import { requireRole } from "@/lib/authorization";
import { calculatePriceInstallment } from "@/lib/domain";
import { listPartnerCommissions, listPricingRules } from "@/lib/services/pricing";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default async function SimulatorPage({ searchParams }: { searchParams: SearchParams }) {
  const { user } = await requireRole(Role.ADMIN, Role.OPERADOR, Role.PARCEIRO);
  const [rules, partners, query] = await Promise.all([listPricingRules(), listPartnerCommissions(), searchParams]);
  const amount = typeof query.amount === "string" ? Number(query.amount) : NaN;
  const termMonths = typeof query.term === "string" ? Number(query.term) : NaN;
  const selectedRule = rules.find((rule) => rule.termMonths === termMonths && rule.isActive);
  const installment = Number.isFinite(amount) && amount > 0 && selectedRule
    ? calculatePriceInstallment(amount, selectedRule.monthlyRate.toNumber(), selectedRule.termMonths)
    : null;

  return (
    <DashboardFrame user={user}>
      <div className="border-b border-neutral-200 pb-6">
        <p className="text-sm text-neutral-500">Crédito consignado · Sistema Price</p>
        <h1 className="mt-1 font-serif text-3xl text-neutral-900">Simulador</h1>
      </div>

      <div className="mt-7 grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
        <section>
          <h2 className="font-serif text-xl text-neutral-900">Calcular parcela</h2>
          <form method="get" className="mt-4 space-y-4">
            <label className="block space-y-1 text-xs text-neutral-600">
              Valor do empréstimo
              <Input name="amount" type="number" min="1" step="0.01" defaultValue={Number.isFinite(amount) ? amount : undefined} required />
            </label>
            <label className="block space-y-1 text-xs text-neutral-600">
              Prazo e taxa
              <select name="term" defaultValue={selectedRule?.termMonths ?? ""} required className="h-11 w-full border border-neutral-300 bg-white px-3 text-sm text-neutral-900">
                <option value="" disabled>Selecione</option>
                {rules.filter((rule) => rule.isActive).map((rule) => (
                  <option key={rule.id} value={rule.termMonths}>{rule.termMonths} meses · {rule.monthlyRate.toString()}% a.m.</option>
                ))}
              </select>
            </label>
            <Button type="submit">Simular</Button>
          </form>
          {installment !== null && selectedRule && (
            <div aria-live="polite" className="mt-6 border-l-4 border-emerald-800 bg-white px-5 py-4">
              <p className="text-xs text-neutral-500">Parcela estimada · {selectedRule.termMonths}x de</p>
              <p className="mt-1 font-serif text-3xl text-neutral-950">{currency.format(installment)}</p>
              <p className="mt-2 text-xs text-neutral-500">
                Total {currency.format(installment * selectedRule.termMonths)} · taxa de {selectedRule.monthlyRate.toString()}% a.m.
              </p>
            </div>
          )}
        </section>

        <section>
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-neutral-200 pb-3">
            <div>
              <h2 className="font-serif text-xl text-neutral-900">Tabela de taxas</h2>
              <p className="mt-1 text-xs text-neutral-500">Taxas mensais por prazo</p>
            </div>
            {user.role === Role.ADMIN && <span className="text-xs font-medium text-emerald-900">Edição ADMIN</span>}
          </div>
          {rules.length ? (
            <div className="divide-y divide-neutral-200">
              {rules.map((rule) => (
                <form key={rule.id} action={savePricingRuleAction} className="grid grid-cols-[1fr_1fr_auto] items-center gap-3 py-3">
                  <input type="hidden" name="termMonths" value={rule.termMonths} />
                  <span className="text-sm text-neutral-800">{rule.termMonths} meses</span>
                  {user.role === Role.ADMIN ? (
                    <Input name="monthlyRate" type="number" min="0" max="100" step="0.0001" defaultValue={rule.monthlyRate.toString()} aria-label={`Taxa para ${rule.termMonths} meses`} className="h-9" />
                  ) : <span className="text-sm tabular-nums text-neutral-700">{rule.monthlyRate.toString()}% a.m.</span>}
                  {user.role === Role.ADMIN ? (
                    <div className="flex items-center gap-2">
                      <select name="isActive" defaultValue={String(rule.isActive)} aria-label={`Ativação do prazo ${rule.termMonths}`} className="h-9 border border-neutral-300 bg-white px-2 text-xs">
                        <option value="true">Ativa</option><option value="false">Inativa</option>
                      </select>
                      <Button type="submit" variant="secondary" className="h-9 px-3 text-xs">Salvar</Button>
                    </div>
                  ) : <span className="text-xs text-neutral-500">{rule.isActive ? "Ativa" : "Inativa"}</span>}
                </form>
              ))}
            </div>
          ) : <p className="py-6 text-sm text-neutral-500">Nenhum prazo configurado.</p>}

          {user.role === Role.ADMIN && (
            <form action={savePricingRuleAction} className="mt-5 grid grid-cols-[0.7fr_1fr_auto] items-end gap-3 border-t border-neutral-200 pt-5">
              <label className="space-y-1 text-xs text-neutral-600">Prazo (meses)<Input name="termMonths" type="number" min="1" max="120" required /></label>
              <label className="space-y-1 text-xs text-neutral-600">Taxa mensal (%)<Input name="monthlyRate" type="number" min="0" max="100" step="0.0001" required /></label>
              <input type="hidden" name="isActive" value="true" />
              <Button type="submit" variant="secondary" className="h-11">Adicionar</Button>
            </form>
          )}

          {user.role === Role.ADMIN && (
            <div className="mt-9 border-t border-neutral-200 pt-6">
              <h2 className="font-serif text-xl text-neutral-900">Comissão por parceiro</h2>
              <p className="mt-1 text-xs text-neutral-500">A nova taxa vale para propostas pagas a partir da alteração.</p>
              <div className="mt-3 divide-y divide-neutral-200">
                {partners.map((partner) => (
                  <form key={partner.id} action={savePartnerCommissionAction} className="grid grid-cols-[1fr_120px_auto] items-center gap-3 py-3">
                    <input type="hidden" name="partnerId" value={partner.id} />
                    <span className="text-sm text-neutral-800">{partner.name}</span>
                    <Input name="commissionPercent" type="number" min="0" max="100" step="0.01" defaultValue={partner.commissionPercent.toString()} aria-label={`Comissão de ${partner.name}`} className="h-9" />
                    <Button type="submit" variant="secondary" className="h-9 px-3 text-xs">Salvar</Button>
                  </form>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </DashboardFrame>
  );
}