"use server";

import { AuthError } from "next-auth";
import { revalidatePath } from "next/cache";
import { ProposalStatus, Role } from "@prisma/client";
import { signIn, signOut } from "@/auth";
import { requireRole } from "@/lib/authorization";
import { saveClient, removeClient } from "@/lib/services/clients";
import { changeProposalStatus, createProposal } from "@/lib/services/proposals";
import { savePartnerCommission, savePricingRule } from "@/lib/services/pricing";
import {
  clientSchema,
  credentialsSchema,
  partnerCommissionSchema,
  pricingRuleSchema,
  proposalSchema,
  proposalStatusSchema,
  recordIdSchema,
} from "@/lib/validation";

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

function readFormValue(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function throwValidationError(error: { issues: { message: string }[] }): never {
  throw new Error(error.issues[0]?.message ?? "Confira os dados informados.");
}

async function currentActor() {
  const { user } = await requireRole(Role.ADMIN, Role.OPERADOR, Role.PARCEIRO);
  return { id: user.id, role: user.role };
}

export async function saveClientAction(formData: FormData) {
  const parsed = clientSchema.safeParse({
    id: readFormValue(formData, "id"),
    name: readFormValue(formData, "name"),
    cpf: readFormValue(formData, "cpf"),
    phone: readFormValue(formData, "phone"),
    email: readFormValue(formData, "email"),
    partnerId: readFormValue(formData, "partnerId"),
  });
  if (!parsed.success) throwValidationError(parsed.error);

  await saveClient(await currentActor(), parsed.data);
  revalidatePath("/dashboard/clients");
  revalidatePath("/dashboard/proposals");
}

export async function deleteClientAction(formData: FormData) {
  const parsed = recordIdSchema.safeParse({ id: readFormValue(formData, "id") });
  if (!parsed.success) throwValidationError(parsed.error);

  await removeClient(await currentActor(), parsed.data.id);
  revalidatePath("/dashboard/clients");
}

export async function createProposalAction(formData: FormData) {
  const parsed = proposalSchema.safeParse({
    clientId: readFormValue(formData, "clientId"),
    productId: readFormValue(formData, "productId"),
    amount: readFormValue(formData, "amount"),
    termMonths: readFormValue(formData, "termMonths"),
  });
  if (!parsed.success) throwValidationError(parsed.error);

  await createProposal(await currentActor(), parsed.data);
  revalidatePath("/dashboard/proposals");
  revalidatePath("/dashboard");
}

export async function changeProposalStatusAction(formData: FormData) {
  const parsed = proposalStatusSchema.safeParse({
    id: readFormValue(formData, "id"),
    status: readFormValue(formData, "status"),
  });
  if (!parsed.success) throwValidationError(parsed.error);

  await changeProposalStatus(await currentActor(), parsed.data.id, parsed.data.status as ProposalStatus);
  revalidatePath("/dashboard/proposals");
  revalidatePath("/dashboard");
}

export async function savePricingRuleAction(formData: FormData) {
  const parsed = pricingRuleSchema.safeParse({
    termMonths: readFormValue(formData, "termMonths"),
    monthlyRate: readFormValue(formData, "monthlyRate"),
    isActive: readFormValue(formData, "isActive") ?? "true",
  });
  if (!parsed.success) throwValidationError(parsed.error);

  await savePricingRule(await currentActor(), parsed.data);
  revalidatePath("/dashboard/simulator");
  revalidatePath("/dashboard/proposals");
}

export async function savePartnerCommissionAction(formData: FormData) {
  const parsed = partnerCommissionSchema.safeParse({
    partnerId: readFormValue(formData, "partnerId"),
    productId: readFormValue(formData, "productId"),
    commissionPercent: readFormValue(formData, "commissionPercent"),
  });
  if (!parsed.success) throwValidationError(parsed.error);

  await savePartnerCommission(
    await currentActor(),
    parsed.data.partnerId,
    parsed.data.productId,
    parsed.data.commissionPercent,
  );
  revalidatePath("/dashboard/simulator");
}