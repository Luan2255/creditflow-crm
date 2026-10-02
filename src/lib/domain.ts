export type AppRole = "ADMIN" | "OPERADOR" | "PARCEIRO";

export const PROPOSAL_STATUSES = [
  "CONSULTA",
  "DIGITACAO",
  "ANALISE",
  "APROVADA",
  "RECUSADA",
  "PAGA",
] as const;

export type ProposalStage = (typeof PROPOSAL_STATUSES)[number];

export function normalizeCpf(value: string): string {
  return value.replace(/\D/g, "");
}

export function isValidCpf(value: string): boolean {
  const digits = normalizeCpf(value);
  if (!/^\d{11}$/.test(digits) || /^([0-9])\1{10}$/.test(digits)) return false;

  const checkDigit = (base: string, weightStart: number) => {
    const sum = [...base].reduce((total, digit, index) => {
      return total + Number(digit) * (weightStart - index);
    }, 0);
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  return (
    checkDigit(digits.slice(0, 9), 10) === Number(digits[9]) &&
    checkDigit(digits.slice(0, 10), 11) === Number(digits[10])
  );
}

export function formatCpf(value: string, reveal: boolean): string {
  const digits = normalizeCpf(value);
  if (!/^\d{11}$/.test(digits)) return "CPF inválido";
  if (!reveal) return `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**`;
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

export function calculatePriceInstallment(
  principal: number,
  monthlyRatePercent: number,
  termMonths: number,
): number {
  if (!Number.isFinite(principal) || principal <= 0) throw new Error("Valor deve ser positivo.");
  if (!Number.isFinite(monthlyRatePercent) || monthlyRatePercent < 0) {
    throw new Error("Taxa mensal inválida.");
  }
  if (!Number.isInteger(termMonths) || termMonths <= 0) {
    throw new Error("Prazo deve ser um número inteiro positivo.");
  }

  const monthlyRate = monthlyRatePercent / 100;
  if (monthlyRate === 0) return Math.round((principal / termMonths) * 100) / 100;
  const payment = principal * monthlyRate / (1 - (1 + monthlyRate) ** -termMonths);
  return Math.round(payment * 100) / 100;
}

export function calculateCommission(amount: number, commissionPercent: number): number {
  if (!Number.isFinite(amount) || amount < 0) throw new Error("Valor da proposta inválido.");
  if (!Number.isFinite(commissionPercent) || commissionPercent < 0 || commissionPercent > 100) {
    throw new Error("Percentual de comissão inválido.");
  }
  const amountCents = Math.round(amount * 100);
  const percentHundredths = Math.round(commissionPercent * 100);
  return Math.round((amountCents * percentHundredths) / 10_000) / 100;
}

export function canAccessPartnerData(role: AppRole, actorId: string, partnerId: string): boolean {
  return role !== "PARCEIRO" || actorId === partnerId;
}

const ALLOWED_TRANSITIONS: Record<ProposalStage, readonly ProposalStage[]> = {
  CONSULTA: ["DIGITACAO"],
  DIGITACAO: ["ANALISE"],
  ANALISE: ["APROVADA", "RECUSADA"],
  APROVADA: ["PAGA"],
  RECUSADA: [],
  PAGA: [],
};

export function canTransitionProposal(from: ProposalStage, to: ProposalStage): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}