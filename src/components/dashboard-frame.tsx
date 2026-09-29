import Link from "next/link";
import { LayoutDashboard, LogOut, Users, Workflow, Calculator, Landmark } from "lucide-react";
import { logoutAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import type { requireRole } from "@/lib/authorization";

type DashboardUser = Awaited<ReturnType<typeof requireRole>>["user"];

const navigation = [
  { href: "/dashboard", label: "Visão geral", icon: LayoutDashboard },
  { href: "/dashboard/clients", label: "Clientes", icon: Users },
  { href: "/dashboard/proposals", label: "Propostas", icon: Workflow },
  { href: "/dashboard/simulator", label: "Simulador", icon: Calculator },
];

const roleNames = { ADMIN: "Administrador", OPERADOR: "Operador", PARCEIRO: "Parceiro" };

export function DashboardFrame({ user, children }: { user: DashboardUser; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#f4f6f3]">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex min-h-16 max-w-[1440px] items-center justify-between gap-4 px-5 sm:px-8">
          <Link href="/dashboard" className="flex items-center gap-2.5 font-semibold text-neutral-900">
            <Landmark aria-hidden="true" className="text-emerald-900" size={19} />
            CreditFlow <span className="font-normal text-neutral-400">/ CRM</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="hidden text-xs text-neutral-500 sm:inline">
              {user.name} · {roleNames[user.role]}
            </span>
            <form action={logoutAction}>
              <Button variant="secondary" className="h-9 px-3 text-xs" aria-label="Sair">
                <LogOut aria-hidden="true" size={15} />
                <span className="hidden sm:inline">Sair</span>
              </Button>
            </form>
          </div>
        </div>
      </header>
      <nav aria-label="Navegação principal" className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-[1440px] gap-1 overflow-x-auto px-5 sm:px-8">
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex h-12 shrink-0 items-center gap-2 border-b-2 border-transparent px-3 text-sm text-neutral-600 transition hover:border-emerald-800 hover:text-emerald-950"
            >
              <Icon aria-hidden="true" size={16} />
              {label}
            </Link>
          ))}
        </div>
      </nav>
      <div className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 sm:py-10">{children}</div>
    </main>
  );
}