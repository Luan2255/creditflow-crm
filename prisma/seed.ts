import "dotenv/config";
import { createHash } from "node:crypto";
import { PrismaClient, ProposalStatus, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { calculateCommission } from "../src/lib/domain";

const prisma = new PrismaClient();
const names = [
  "Ana Martins", "Bruno Almeida", "Camila Souza", "Diego Ferreira", "Eliane Costa",
  "Felipe Rodrigues", "Gabriela Oliveira", "Heitor Santos", "Isabela Lima", "João Carvalho",
  "Karen Ribeiro", "Lucas Gomes", "Mariana Barbosa", "Nicolas Rocha", "Olívia Dias",
  "Paulo Teixeira", "Quitéria Mendes", "Rafael Nunes", "Sabrina Lopes", "Thiago Cardoso",
  "Ursula Correia", "Vinícius Araújo", "Wesley Monteiro", "Yasmin Freitas", "Zeca Pereira",
];
const proposalStages = [
  { until: 12, status: ProposalStatus.CONSULTA, path: [ProposalStatus.CONSULTA] },
  { until: 30, status: ProposalStatus.DIGITACAO, path: [ProposalStatus.CONSULTA, ProposalStatus.DIGITACAO] },
  { until: 50, status: ProposalStatus.ANALISE, path: [ProposalStatus.CONSULTA, ProposalStatus.DIGITACAO, ProposalStatus.ANALISE] },
  { until: 68, status: ProposalStatus.APROVADA, path: [ProposalStatus.CONSULTA, ProposalStatus.DIGITACAO, ProposalStatus.ANALISE, ProposalStatus.APROVADA] },
  { until: 78, status: ProposalStatus.RECUSADA, path: [ProposalStatus.CONSULTA, ProposalStatus.DIGITACAO, ProposalStatus.ANALISE, ProposalStatus.RECUSADA] },
  { until: 120, status: ProposalStatus.PAGA, path: [ProposalStatus.CONSULTA, ProposalStatus.DIGITACAO, ProposalStatus.ANALISE, ProposalStatus.APROVADA, ProposalStatus.PAGA] },
];

function deterministicUuid(key: string): string {
  const bytes = createHash("sha1").update(key).digest("hex").slice(0, 32).split("");
  bytes[12] = "5";
  bytes[16] = ((Number.parseInt(bytes[16], 16) & 0x3) | 0x8).toString(16);
  const value = bytes.join("");
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}

function cpfFor(index: number): string {
  const base = String(900_000_000 + index);
  const digit = (value: string, start: number) => {
    const sum = [...value].reduce((total, number, position) => total + Number(number) * (start - position), 0);
    const remainder = (sum * 10) % 11;
    return String(remainder === 10 ? 0 : remainder);
  };
  const first = digit(base, 10);
  return `${base}${first}${digit(`${base}${first}`, 11)}`;
}

async function main() {
  const password = process.env.SEED_USER_PASSWORD;

  if (!password || password.length < 12) {
    throw new Error("Set SEED_USER_PASSWORD to a local password of at least 12 characters.");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const accounts = [
    { name: "Ana Martins", email: "admin@creditflow.local", role: Role.ADMIN, commissionPercent: 0 },
    { name: "Bruno Almeida", email: "operator@creditflow.local", role: Role.OPERADOR, commissionPercent: 0 },
    { name: "Camila Souza", email: "camila@creditflow.local", role: Role.PARCEIRO, commissionPercent: 8 },
    { name: "Diego Ferreira", email: "diego@creditflow.local", role: Role.PARCEIRO, commissionPercent: 9 },
    { name: "Eliane Costa", email: "eliane@creditflow.local", role: Role.PARCEIRO, commissionPercent: 10 },
    { name: "Felipe Rodrigues", email: "felipe@creditflow.local", role: Role.PARCEIRO, commissionPercent: 11 },
  ];
  const users = new Map<string, { id: string; role: Role; commissionPercent: number }>();

  for (const account of accounts) {
    const user = await prisma.user.upsert({
      where: { email: account.email },
      update: { ...account, passwordHash, isActive: true },
      create: { ...account, passwordHash },
    });
    users.set(account.email, { id: user.id, role: user.role, commissionPercent: account.commissionPercent });
  }

  const partnerAccounts = accounts.filter((account) => account.role === Role.PARCEIRO);
  const partners = partnerAccounts.map((account) => users.get(account.email)!);
  const operators = [users.get("admin@creditflow.local")!, users.get("operator@creditflow.local")!];

  const defaultRules = [
    { termMonths: 12, monthlyRate: "1.7900" },
    { termMonths: 24, monthlyRate: "1.6900" },
    { termMonths: 36, monthlyRate: "1.5900" },
    { termMonths: 48, monthlyRate: "1.4900" },
    { termMonths: 60, monthlyRate: "1.3900" },
    { termMonths: 72, monthlyRate: "1.2900" },
  ];
  for (const rule of defaultRules) {
    await prisma.pricingRule.upsert({
      where: { termMonths: rule.termMonths },
      update: {},
      create: { ...rule, isActive: true },
    });
  }

  const clients = [];
  for (let index = 0; index < 50; index += 1) {
    const firstName = names[index % names.length];
    const lastName = names[(index * 7 + 4) % names.length].split(" ")[1];
    const partner = partners[index % partners.length];
    const cpf = cpfFor(index);
    const client = await prisma.client.upsert({
      where: { cpf },
      update: {
        name: `${firstName} ${lastName}`,
        partnerId: partner.id,
        email: `cliente${String(index + 1).padStart(2, "0")}@example.test`,
      },
      create: {
        name: `${firstName} ${lastName}`,
        cpf,
        phone: `+55 11 90000-${String(index).padStart(4, "0")}`,
        email: `cliente${String(index + 1).padStart(2, "0")}@example.test`,
        partnerId: partner.id,
      },
    });
    clients.push(client);
  }

  const rates = new Map((await prisma.pricingRule.findMany({ where: { isActive: true } })).map((rule) => [rule.termMonths, rule.monthlyRate]));
  const terms = [...rates.keys()].sort((left, right) => left - right);
  const now = new Date();

  for (let index = 0; index < 120; index += 1) {
    const client = clients[index % clients.length];
    const partner = partners.find((item) => item.id === client.partnerId)!;
    const stage = proposalStages.find((item) => index < item.until)!;
    const termMonths = terms[index % terms.length];
    const amount = 3_000 + ((index * 1_739) % 42_000);
    const createdAt = new Date(now);
    createdAt.setDate(createdAt.getDate() - ((index * 37) % 180));
    createdAt.setHours(9 + (index % 8), (index * 13) % 60, 0, 0);
    const proposalId = deterministicUuid(`creditflow-seed-proposal-${index}`);
    const isPaid = stage.status === ProposalStatus.PAGA;
    const commissionAmount = isPaid ? calculateCommission(amount, partner.commissionPercent) : null;
    const proposal = await prisma.proposal.upsert({
      where: { id: proposalId },
      update: {
        clientId: client.id,
        partnerId: partner.id,
        amount: amount.toFixed(2),
        termMonths,
        monthlyRate: rates.get(termMonths)!,
        status: stage.status,
        paidAt: isPaid ? new Date(createdAt.getTime() + stage.path.length * 60 * 60 * 1000) : null,
        commissionAmount: commissionAmount?.toFixed(2) ?? null,
        commissionPercentSnapshot: isPaid ? partner.commissionPercent.toFixed(2) : null,
        createdAt,
      },
      create: {
        id: proposalId,
        clientId: client.id,
        partnerId: partner.id,
        amount: amount.toFixed(2),
        termMonths,
        monthlyRate: rates.get(termMonths)!,
        status: stage.status,
        paidAt: isPaid ? new Date(createdAt.getTime() + stage.path.length * 60 * 60 * 1000) : null,
        commissionAmount: commissionAmount?.toFixed(2) ?? null,
        commissionPercentSnapshot: isPaid ? partner.commissionPercent.toFixed(2) : null,
        createdAt,
      },
    });

    await prisma.proposalStatusHistory.deleteMany({ where: { proposalId: proposal.id } });
    await prisma.proposalStatusHistory.createMany({
      data: stage.path.map((toStatus, position) => ({
        proposalId: proposal.id,
        fromStatus: position ? stage.path[position - 1] : null,
        toStatus,
        actorId: position % 2 ? operators[index % operators.length].id : partner.id,
        changedAt: new Date(createdAt.getTime() + position * 60 * 60 * 1000),
      })),
    });
  }

  console.info("Seed concluído: 6 usuários, 50 clientes, 120 propostas sintéticas e 6 taxas.");
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());