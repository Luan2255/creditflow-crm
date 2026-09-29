-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('CONSULTA', 'DIGITACAO', 'ANALISE', 'APROVADA', 'RECUSADA', 'PAGA');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "commissionPercent" DECIMAL(5,2) NOT NULL DEFAULT 10.00;

-- CreateTable
CREATE TABLE "clients" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "partnerId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proposals" (
    "id" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "partnerId" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "termMonths" INTEGER NOT NULL,
    "monthlyRate" DECIMAL(7,4) NOT NULL,
    "status" "ProposalStatus" NOT NULL DEFAULT 'CONSULTA',
    "commissionAmount" DECIMAL(12,2),
    "commissionPercentSnapshot" DECIMAL(5,2),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proposal_status_history" (
    "id" UUID NOT NULL,
    "proposalId" UUID NOT NULL,
    "fromStatus" "ProposalStatus",
    "toStatus" "ProposalStatus" NOT NULL,
    "actorId" UUID NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proposal_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing_rules" (
    "id" UUID NOT NULL,
    "termMonths" INTEGER NOT NULL,
    "monthlyRate" DECIMAL(7,4) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pricing_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clients_cpf_key" ON "clients"("cpf");

-- CreateIndex
CREATE INDEX "clients_partnerId_createdAt_idx" ON "clients"("partnerId", "createdAt");

-- CreateIndex
CREATE INDEX "proposals_status_createdAt_idx" ON "proposals"("status", "createdAt");

-- CreateIndex
CREATE INDEX "proposals_partnerId_status_idx" ON "proposals"("partnerId", "status");

-- CreateIndex
CREATE INDEX "proposal_status_history_proposalId_changedAt_idx" ON "proposal_status_history"("proposalId", "changedAt");

-- CreateIndex
CREATE UNIQUE INDEX "pricing_rules_termMonths_key" ON "pricing_rules"("termMonths");

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal_status_history" ADD CONSTRAINT "proposal_status_history_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal_status_history" ADD CONSTRAINT "proposal_status_history_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
