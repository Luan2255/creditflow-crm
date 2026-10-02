import { z } from "zod";
import { ProposalStatus } from "@prisma/client";
import { isValidCpf } from "@/lib/domain";

export const credentialsSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(12).max(72),
});

export const clientSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(120),
  cpf: z.string().optional().refine((value) => !value || isValidCpf(value), "Informe um CPF válido."),
  phone: z.string().trim().max(30).optional(),
  email: z.union([z.string().trim().email().max(254), z.literal("")]).optional(),
  partnerId: z.string().uuid().optional(),
});

export const recordIdSchema = z.object({ id: z.string().uuid() });

export const proposalSchema = z.object({
  clientId: z.string().uuid(),
  productId: z.string().uuid(),
  amount: z.coerce.number().positive().max(9_999_999_999.99),
  termMonths: z.coerce.number().int().positive(),
});

export const proposalStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.nativeEnum(ProposalStatus),
});

export const pricingRuleSchema = z.object({
  termMonths: z.coerce.number().int().positive(),
  monthlyRate: z.coerce.number().min(0),
  isActive: z.enum(["true", "false"]).transform((value) => value === "true"),
});

export const partnerCommissionSchema = z.object({
  partnerId: z.string().uuid(),
  productId: z.string().uuid(),
  commissionPercent: z.coerce.number().min(0).max(100),
});

export const simulatorQuerySchema = z.object({
  amount: z.coerce.number().positive().max(9_999_999_999.99).optional(),
  termMonths: z.coerce.number().int().positive().optional(),
  margin: z.coerce.number().min(0).max(9_999_999_999.99).optional(),
  productId: z.string().uuid().optional(),
}).superRefine((value, context) => {
  const hasAnyInput = Object.values(value).some((entry) => entry !== undefined);
  const hasAllInputs = Object.values(value).every((entry) => entry !== undefined);
  if (hasAnyInput && !hasAllInputs) {
    context.addIssue({ code: "custom", message: "Informe valor, prazo, produto e margem para simular." });
  }
});

const dateOnlySchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  });

export const dashboardPeriodSchema = z.object({
  from: dateOnlySchema,
  to: dateOnlySchema,
}).refine(({ from, to }) => from <= to, {
  message: "A data inicial deve ser anterior ou igual à data final.",
  path: ["to"],
});

export const documentFieldsSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  cpf: z.string().trim().optional().refine((value) => !value || isValidCpf(value), "O documento retornou um CPF inválido."),
  phone: z.string().trim().max(30).optional(),
  email: z.union([z.string().trim().email().max(254), z.literal("")]).optional(),
}).refine((fields) => Object.values(fields).some((value) => Boolean(value)), {
  message: "Nenhum campo reconhecido foi retornado.",
});