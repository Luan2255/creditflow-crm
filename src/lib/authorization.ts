import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function requireRole(...allowedRoles: Role[]) {
  const session = await auth();

  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, role: true, isActive: true },
  });

  if (!user?.isActive) redirect("/login");
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) redirect("/dashboard");

  return { ...session, user: { ...session.user, name: user.name, role: user.role } };
}