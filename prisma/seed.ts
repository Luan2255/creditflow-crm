import "dotenv/config";
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function syntheticCpf(index: number): string {
  const base = String(900_000_000 + index);
  const checkDigit = (digits: string, weightStart: number) => {
    const sum = [...digits].reduce((total, digit, position) => {
      return total + Number(digit) * (weightStart - position);
    }, 0);
    const remainder = (sum * 10) % 11;
    return String(remainder === 10 ? 0 : remainder);
  };
  const firstDigit = checkDigit(base, 10);
  return `${base}${firstDigit}${checkDigit(`${base}${firstDigit}`, 11)}`;
}

async function main() {
  const password = process.env.SEED_USER_PASSWORD;

  if (!password || password.length < 12) {
    throw new Error("Set SEED_USER_PASSWORD to a local password of at least 12 characters.");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const users = [
    { name: "Alex Morgan", email: "admin@creditflow.local", role: Role.ADMIN },
    { name: "Jordan Lee", email: "operator@creditflow.local", role: Role.OPERADOR },
    { name: "Taylor Reed", email: "partner@creditflow.local", role: Role.PARCEIRO },
  ];

  let partnerId: string | undefined;
  for (const user of users) {
    const savedUser = await prisma.user.upsert({
      where: { email: user.email },
      update: { ...user, passwordHash, isActive: true },
      create: { ...user, passwordHash },
    });
    if (user.role === Role.PARCEIRO) partnerId = savedUser.id;
  }

  if (!partnerId) throw new Error("The synthetic partner account was not created.");

  const product = await prisma.product.upsert({
    where: { code: "CONSIGNADO" },
    update: {},
    create: { code: "CONSIGNADO", name: "Consignado" },
  });

  await prisma.partnerProductCommission.upsert({
    where: { partnerId_productId: { partnerId, productId: product.id } },
    update: {},
    create: { partnerId, productId: product.id, commissionPercent: "10.00" },
  });

  for (const termMonths of [12, 24, 36, 48, 60]) {
    await prisma.pricingRule.upsert({
      where: { termMonths },
      update: {},
      create: { termMonths, monthlyRate: "1.7900", isActive: true },
    });
  }

  const clients = [
    { name: "Morgan Ellis", email: "morgan.ellis@example.test" },
    { name: "Riley Bennett", email: "riley.bennett@example.test" },
    { name: "Casey Parker", email: "casey.parker@example.test" },
    { name: "Avery Quinn", email: "avery.quinn@example.test" },
    { name: "Jamie Rowan", email: "jamie.rowan@example.test" },
  ];

  for (const [index, client] of clients.entries()) {
    const cpf = syntheticCpf(index);
    await prisma.client.upsert({
      where: { cpf },
      update: { ...client, partnerId },
      create: {
        ...client,
        cpf,
        phone: `+55 11 90000-${String(index + 1).padStart(4, "0")}`,
        partnerId,
      },
    });
  }
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());