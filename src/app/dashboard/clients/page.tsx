import { Role } from "@prisma/client";
import { DashboardFrame } from "@/components/dashboard-frame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireRole } from "@/lib/authorization";
import { listClients, listPartners } from "@/lib/services/clients";
import { deleteClientAction, saveClientAction } from "@/app/actions";

const roles = [Role.ADMIN, Role.OPERADOR, Role.PARCEIRO] as const;

export default async function ClientsPage() {
  const { user } = await requireRole(...roles);
  const [clients, partners] = await Promise.all([listClients(user), listPartners(user)]);

  return (
    <DashboardFrame user={user}>
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-neutral-200 pb-6">
        <div>
          <p className="text-sm text-neutral-500">Relacionamento e carteira</p>
          <h1 className="mt-1 font-serif text-3xl text-neutral-900">Clientes</h1>
        </div>
        <span className="text-sm text-neutral-500">{clients.length} registros</span>
      </div>

      <section className="mt-7 border-b border-neutral-200 pb-8">
        <h2 className="font-serif text-xl text-neutral-900">Novo cliente</h2>
        <form action={saveClientAction} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="space-y-1 text-xs text-neutral-600">
            Nome completo
            <Input name="name" autoComplete="name" required minLength={2} maxLength={120} />
          </label>
          <label className="space-y-1 text-xs text-neutral-600">
            CPF
            <Input name="cpf" inputMode="numeric" placeholder="000.000.000-00" required />
          </label>
          <label className="space-y-1 text-xs text-neutral-600">
            Telefone
            <Input name="phone" type="tel" autoComplete="tel" />
          </label>
          <label className="space-y-1 text-xs text-neutral-600">
            E-mail
            <Input name="email" type="email" autoComplete="email" />
          </label>
          {user.role !== Role.PARCEIRO && (
            <label className="space-y-1 text-xs text-neutral-600">
              Parceiro responsável
              <select name="partnerId" required className="h-11 w-full border border-neutral-300 bg-white px-3 text-sm text-neutral-900">
                <option value="">Selecione</option>
                {partners.map((partner) => <option key={partner.id} value={partner.id}>{partner.name}</option>)}
              </select>
            </label>
          )}
          <div className="flex items-end">
            <Button type="submit" className="h-11 w-full sm:w-auto">Adicionar cliente</Button>
          </div>
        </form>
      </section>

      <section className="mt-7">
        <div className="hidden grid-cols-[1.25fr_1fr_1fr_1.1fr_auto] gap-4 border-b border-neutral-300 pb-2 text-xs font-semibold uppercase text-neutral-500 lg:grid">
          <span>Cliente</span><span>CPF</span><span>Contato</span><span>Parceiro</span><span>Ações</span>
        </div>
        {clients.length ? clients.map((client) => (
          <div key={client.id} className="grid gap-3 border-b border-neutral-200 py-4 lg:grid-cols-[1.25fr_1fr_1fr_1.1fr_auto] lg:items-center lg:gap-4">
            <form action={saveClientAction} className="contents">
              <input type="hidden" name="id" value={client.id} />
              <label className="space-y-1 text-xs text-neutral-500 lg:text-sm">
                <span className="lg:hidden">Cliente</span>
                <Input aria-label="Nome do cliente" name="name" defaultValue={client.name} required className="h-10" />
              </label>
              <span className="text-sm tabular-nums text-neutral-700" aria-label="CPF mascarado">{client.displayCpf}</span>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                <Input aria-label="Telefone do cliente" name="phone" defaultValue={client.phone ?? ""} placeholder="Telefone" className="h-10" />
                <Input aria-label="E-mail do cliente" name="email" defaultValue={client.email ?? ""} placeholder="E-mail" className="h-10" />
              </div>
              {user.role !== Role.PARCEIRO ? (
                <select name="partnerId" defaultValue={client.partner.id} aria-label="Parceiro responsável" className="h-10 border border-neutral-300 bg-white px-2 text-sm text-neutral-800">
                  {partners.map((partner) => <option key={partner.id} value={partner.id}>{partner.name}</option>)}
                </select>
              ) : <span className="text-sm text-neutral-700">{client.partner.name}</span>}
              {user.role === Role.ADMIN && <input type="hidden" name="cpf" value={client.displayCpf} />}
              <div className="flex items-center gap-2 lg:justify-end">
                <Button type="submit" variant="secondary" className="h-9 px-3 text-xs">Salvar</Button>
                <Button type="submit" formAction={deleteClientAction} variant="secondary" disabled={client._count.proposals > 0} className="h-9 border-red-200 px-3 text-xs text-red-800 enabled:hover:bg-red-50">
                  Excluir
                </Button>
              </div>
            </form>
            <span className="sr-only">{client._count.proposals} propostas</span>
          </div>
        )) : (
          <p className="py-10 text-center text-sm text-neutral-500">Nenhum cliente nesta carteira.</p>
        )}
      </section>
    </DashboardFrame>
  );
}