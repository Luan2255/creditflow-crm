import { Landmark, LogOut, ShieldCheck } from "lucide-react";
import { logoutAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/authorization";

const roleNames = {
  ADMIN: "Administrador",
  OPERADOR: "Operador",
  PARCEIRO: "Parceiro",
};

export default async function DashboardPage() {
  const { user } = await requireRole();

  return (
    <main className="min-h-screen bg-[#f4f6f3]">
      <header className="flex h-16 items-center justify-between border-b border-neutral-200 bg-white px-5 sm:px-10">
        <div className="flex items-center gap-2.5 font-semibold text-neutral-900">
          <Landmark aria-hidden="true" className="text-emerald-900" size={19} />
          CreditFlow <span className="font-normal text-neutral-400">/ CRM</span>
        </div>
        <form action={logoutAction}>
          <Button variant="secondary" className="h-9 px-3 text-xs">
            <LogOut aria-hidden="true" size={15} />
            Sair
          </Button>
        </form>
      </header>
      <section className="mx-auto max-w-5xl px-5 py-12 sm:px-10">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-neutral-200 pb-6">
          <div>
            <p className="text-sm text-neutral-500">Painel de operações</p>
            <h1 className="mt-1 font-serif text-3xl text-neutral-900">Olá, {user.name?.split(" ")[0]}</h1>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-emerald-900/10 bg-emerald-900/5 px-3 py-1.5 text-xs font-medium text-emerald-950">
            <ShieldCheck aria-hidden="true" size={15} />
            {roleNames[user.role]}
          </div>
        </div>
        <div className="mt-8 flex min-h-64 flex-col items-center justify-center border border-dashed border-neutral-300 bg-white/60 px-6 text-center">
          <span className="flex size-11 items-center justify-center rounded-full bg-emerald-900/5 text-emerald-900">
            <Landmark aria-hidden="true" size={20} />
          </span>
          <h2 className="mt-4 font-serif text-xl text-neutral-900">Área de trabalho pronta</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-neutral-600">
            Sua sessão está ativa. Os módulos de clientes e propostas serão adicionados na próxima fase.
          </p>
        </div>
      </section>
    </main>
  );
}