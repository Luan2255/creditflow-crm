import { z } from "zod";
import { isValidCpf } from "@/lib/domain";

export const credentialsSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(12).max(72),
});

export const clientSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(120),
  cpf: z.string().optional().refine((value) => value === undefined || isValidCpf(value), "CPF inválido."),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  email: z.string().trim().email().max(254).optional().or(z.literal("")),
  partnerId: z.string().uuid().optional(),
});

export const proposalSchema = z.object({
  clientId: z.string().uuid(),
  amount: z.coerce.number().positive().max(10_000_000),
  termMonths: z.coerce.number().int().positive().max(120),
});

export const pricingRuleSchema = z.object({
  termMonths: z.coerce.number().int().positive().max(120),
  monthlyRate: z.coerce.number().min(0).max(100),
  isActive: z.enum(["true", "false"]).transform((value) => value === "true").default("true"),
});

export const partnerCommissionSchema = z.object({
  partnerId: z.string().uuid(),
  commissionPercent: z.coerce.number().min(0).max(100),
});