"use client";

import { useActionState } from "react";
import { ArrowRight, Landmark, LockKeyhole } from "lucide-react";
import { loginAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, {});

  return (
    <main className="grid min-h-screen lg:grid-cols-[minmax(350px,0.85fr)_1.15fr]">
      <section className="brand-panel relative flex min-h-[260px] flex-col justify-between overflow-hidden px-8 py-8 text-white sm:px-12 lg:min-h-screen lg:px-16 lg:py-12">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-white/10">
            <Landmark aria-hidden="true" size={21} strokeWidth={1.8} />
          </span>
          <span className="text-lg font-semibold">CreditFlow</span>
        </div>
        <div className="relative z-10 max-w-md py-12 lg:py-0">
          <p className="mb-4 text-xs font-semibold uppercase text-emerald-200">Crédito, com clareza</p>
          <h1 className="font-serif text-4xl leading-tight sm:text-5xl">Mais controle em cada etapa.</h1>
          <p className="mt-5 max-w-sm text-sm leading-6 text-emerald-50/75">
            Um espaço de trabalho para acompanhar operações e relações com confiança.
          </p>
        </div>
        <p className="hidden text-xs text-emerald-100/60 lg:block">CreditFlow CRM · Ambiente de operações</p>
        <div aria-hidden="true" className="absolute -bottom-28 -right-20 size-72 rounded-full border border-white/10 lg:size-96" />
      </section>

      <section className="flex items-center justify-center px-6 py-12 sm:px-12">
        <div className="w-full max-w-[390px]">
          <div className="mb-9 flex items-center gap-2 text-sm text-neutral-500">
            <LockKeyhole aria-hidden="true" size={16} />
            <span>Acesso seguro</span>
          </div>
          <h2 className="font-serif text-3xl text-neutral-900">Boas-vindas</h2>
          <p className="mt-2 text-sm text-neutral-600">Entre com suas credenciais para continuar.</p>

          <form action={formAction} className="mt-8 space-y-5">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-neutral-800">E-mail</label>
              <Input id="email" name="email" type="email" autoComplete="email" placeholder="voce@empresa.com" required />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-neutral-800">Senha</label>
              <Input id="password" name="password" type="password" autoComplete="current-password" required />
            </div>
            {state.error && (
              <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {state.error}
              </p>
            )}
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Entrando..." : "Entrar"}
              {!pending && <ArrowRight aria-hidden="true" size={16} />}
            </Button>
          </form>
          <p className="mt-8 border-t border-neutral-200 pt-5 text-xs leading-5 text-neutral-500">
            Acesso restrito a usuários autorizados. Suas credenciais são protegidas.
          </p>
        </div>
      </section>
    </main>
  );
}