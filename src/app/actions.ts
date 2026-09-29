"use server";

import { ProposalStatus, Role } from "@prisma/client";
import { AuthError } from "next-auth";
import { revalidatePath } from "next/cache";
import { signIn, signOut } from "@/auth";
import { requireRole } from "@/lib/authorization";
import { PROPOSAL_STATUSES } from "@/lib/domain";
import { removeClient, saveClient } from "@/lib/services/clients";
import { changeProposalStatus, createProposal } from "@/lib/services/proposals";
import { savePartnerCommission, savePricingRule } from "@/lib/services/pricing";
import { clientSchema, credentialsSchema, partnerCommissionSchema, pricingRuleSchema, proposalSchema } from "@/lib/validation";

export type LoginState = { error?: string };

export async function loginAction(_previousState: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) return { error: "Informe um e-mail válido e uma senha com ao menos 12 caracteres." };

  try {
    await signIn("credentials", { ...parsed.data, redirectTo: "/dashboard" });
  } catch (error) {
    if (error instanceof AuthError) return { error: "E-mail ou senha incorretos." };
    throw error;
  }

  return {};
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}

const operationalRoles = [Role.ADMIN, Role.OPERADOR, Role.PARCEIRO] as const;

export async function saveClientAction(formData: FormData) {
  const { user } = await requireRole(...operationalRoles);
  const parsed = clientSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    cpf: formData.get("cpf") || undefined,
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || undefined,
    partnerId: formData.get("partnerId") || undefined,
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Dados de cliente inválidos.");
  await saveClient(user, parsed.data);
  revalidatePath("/dashboard/clients");
}

export async function deleteClientAction(formData: FormData) {
  const { user } = await requireRole(...operationalRoles);
  const id = String(formData.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Cliente inválido.");
  await removeClient(user, id);
  revalidatePath("/dashboard/clients");
}

export async function createProposalAction(formData: FormData) {
  const { user } = await requireRole(...operationalRoles);
  const parsed = proposalSchema.safeParse({
    clientId: formData.get("clientId"),
    amount: formData.get("amount"),
    termMonths: formData.get("termMonths"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Dados da proposta inválidos.");
  await createProposal(user, parsed.data);
  revalidatePath("/dashboard/proposals");
  revalidatePath("/dashboard");
}

export async function changeProposalStatusAction(formData: FormData) {
  const { user } = await requireRole(...operationalRoles);
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Proposta inválida.");
  if (!PROPOSAL_STATUSES.includes(status as (typeof PROPOSAL_STATUSES)[number])) {
    throw new Error("Status inválido.");
  }
  await changeProposalStatus(user, id, status as ProposalStatus);
  revalidatePath("/dashboard/proposals");
  revalidatePath("/dashboard");
}

export async function savePricingRuleAction(formData: FormData) {
  const { user } = await requireRole(Role.ADMIN);
  const parsed = pricingRuleSchema.safeParse({
    termMonths: formData.get("termMonths"),
    monthlyRate: formData.get("monthlyRate"),
    isActive: formData.get("isActive") ?? "true",
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Regra de taxa inválida.");
  await savePricingRule(user, parsed.data);
  revalidatePath("/dashboard/simulator");
  revalidatePath("/dashboard/proposals");
}

export async function savePartnerCommissionAction(formData: FormData) {
  const { user } = await requireRole(Role.ADMIN);
  const parsed = partnerCommissionSchema.safeParse({
    partnerId: formData.get("partnerId"),
    commissionPercent: formData.get("commissionPercent"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Comissão inválida.");
  await savePartnerCommission(user, parsed.data.partnerId, parsed.data.commissionPercent);
  revalidatePath("/dashboard/simulator");
}