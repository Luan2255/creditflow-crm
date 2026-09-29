import { Role } from "@prisma/client";
import { canAccessPartnerData, formatCpf, normalizeCpf } from "@/lib/domain";
import { prisma } from "@/lib/prisma";
import type { clientSchema } from "@/lib/validation";
import type { z } from "zod";

export type Actor = { id: string; role: Role };
type ClientInput = z.infer<typeof clientSchema>;

export async function listClients(actor: Actor) {
  const clients = await prisma.client.findMany({
    where: actor.role === Role.PARCEIRO ? { partnerId: actor.id } : undefined,
    include: {
      partner: { select: { id: true, name: true } },
      _count: { select: { proposals: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return clients.map(({ cpf, ...client }) => ({
    ...client,
    displayCpf: formatCpf(cpf, actor.role === Role.ADMIN),
  }));
}

export async function listPartners(actor: Actor) {
  if (actor.role === Role.PARCEIRO) {
    return prisma.user.findMany({ where: { id: actor.id }, select: { id: true, name: true } });
  }
  return prisma.user.findMany({
    where: { role: Role.PARCEIRO, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function saveClient(actor: Actor, input: ClientInput) {
  const existing = input.id ? await prisma.client.findUnique({ where: { id: input.id } }) : null;
  if (input.id && !existing) throw new Error("Cliente não encontrado.");
  if (existing && !canAccessPartnerData(actor.role, actor.id, existing.partnerId)) {
    throw new Error("Você não tem acesso a este cliente.");
  }

  const partnerId = actor.role === Role.PARCEIRO ? actor.id : input.partnerId;
  if (!partnerId) throw new Error("Selecione um parceiro responsável.");

  const partner = await prisma.user.findUnique({ where: { id: partnerId }, select: { role: true } });
  if (!partner || partner.role !== Role.PARCEIRO) throw new Error("Parceiro inválido.");

  const cpf = input.cpf ? normalizeCpf(input.cpf) : existing?.cpf;
  if (!cpf) throw new Error("Informe um CPF válido.");
  const data = {
    name: input.name,
    cpf,
    phone: input.phone || null,
    email: input.email?.toLowerCase() || null,
    partnerId,
  };

  return existing
    ? prisma.client.update({ where: { id: existing.id }, data })
    : prisma.client.create({ data });
}

export async function removeClient(actor: Actor, id: string) {
  const client = await prisma.client.findUnique({
    where: { id },
    select: { id: true, partnerId: true, _count: { select: { proposals: true } } },
  });
  if (!client) throw new Error("Cliente não encontrado.");
  if (!canAccessPartnerData(actor.role, actor.id, client.partnerId)) {
    throw new Error("Você não tem acesso a este cliente.");
  }
  if (client._count.proposals > 0) throw new Error("Clientes com propostas não podem ser excluídos.");
  await prisma.client.delete({ where: { id } });
}

export async function listClientsForProposal(actor: Actor) {
  return prisma.client.findMany({
    where: actor.role === Role.PARCEIRO ? { partnerId: actor.id } : undefined,
    select: { id: true, name: true, cpf: true },
    orderBy: { name: "asc" },
  }).then((clients) => clients.map(({ cpf, ...client }) => ({
    ...client,
    displayCpf: formatCpf(cpf, actor.role === Role.ADMIN),
  })));
}