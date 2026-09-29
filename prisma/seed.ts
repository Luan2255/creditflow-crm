import "dotenv/config";
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = process.env.SEED_USER_PASSWORD;

  if (!password || password.length < 12) {
    throw new Error("Set SEED_USER_PASSWORD to a local password of at least 12 characters.");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const users = [
    { name: "Ana Martins", email: "admin@creditflow.local", role: Role.ADMIN },
    { name: "Bruno Almeida", email: "operator@creditflow.local", role: Role.OPERADOR },
    { name: "Camila Souza", email: "partner@creditflow.local", role: Role.PARCEIRO },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { ...user, passwordHash, isActive: true },
      create: { ...user, passwordHash },
    });
  }
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());