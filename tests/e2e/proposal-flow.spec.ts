import { expect, test } from "@playwright/test";

function checkDigit(digits: string, weightStart: number): string {
  const sum = [...digits].reduce((total, digit, index) => total + Number(digit) * (weightStart - index), 0);
  const remainder = (sum * 10) % 11;
  return String(remainder === 10 ? 0 : remainder);
}

function createUniqueCpf(): string {
  const base = String(800_000_000 + (Date.now() % 100_000_000));
  const first = checkDigit(base, 10);
  return `${base}${first}${checkDigit(`${base}${first}`, 11)}`;
}

function formatCpf(cpf: string): string {
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

test("extracts client fields and carries a proposal through payment", async ({ page }) => {
  const password = process.env.E2E_USER_PASSWORD ?? process.env.SEED_USER_PASSWORD;
  if (!password) throw new Error("E2E_USER_PASSWORD or SEED_USER_PASSWORD is required.");

  await page.goto("/login");
  await expect(page.getByTestId("login-form")).toHaveAttribute("data-hydrated", "true");
  await page.getByLabel("E-mail").fill("admin@creditflow.local");
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.getByRole("link", { name: "Clientes" }).click();
  await expect(page.getByTestId("document-upload-form")).toHaveAttribute("data-hydrated", "true");
  await page.getByLabel("Documento (PDF, PNG ou JPEG)").setInputFiles({
    name: "synthetic-id.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("synthetic document fixture"),
  });
  await page.getByRole("button", { name: "Extrair dados" }).click();
  await expect(page.getByRole("status")).toContainText("Dados fictícios de demonstração preenchidos.");
  await expect(page.getByLabel("Nome completo")).toHaveValue("Cliente de demonstração");

  const clientName = `E2E Client ${Date.now()}`;
  const cpf = createUniqueCpf();
  await page.getByLabel("Nome completo").fill(clientName);
  await page.getByLabel("CPF", { exact: true }).fill(cpf);
  await page.getByLabel("Parceiro responsável").first().selectOption({ label: "Taylor Reed" });
  await page.getByRole("button", { name: "Adicionar cliente" }).click();
  await expect(page.getByLabel("Nome do cliente").first()).toHaveValue(clientName);

  await page.getByRole("link", { name: "Propostas" }).click();
  await page.locator("#proposal-client").selectOption({ label: `${clientName} · ${formatCpf(cpf)}` });
  await page.getByLabel("Valor solicitado").fill("12000");
  await page.getByLabel("Produto").selectOption({ label: "Consignado" });
  await page.getByLabel("Prazo").selectOption("12");
  await page.getByRole("button", { name: "Criar proposta" }).click();

  const proposal = page.locator('[data-testid^="proposal-"]').filter({ hasText: clientName });
  await expect(proposal).toBeVisible();
  const nextStatus = proposal.getByLabel(`Próximo status de ${clientName}`);
  for (const status of ["DIGITACAO", "ANALISE", "APROVADA"]) {
    await nextStatus.selectOption(status);
    await proposal.getByRole("button", { name: "Avançar" }).click();
  }
  await nextStatus.selectOption("PAGA");
  await proposal.getByRole("button", { name: "Avançar" }).click();
  await expect(proposal).toContainText("Comissão:");
});
