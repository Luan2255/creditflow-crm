import { documentFieldsSchema } from "@/lib/validation";

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

const demoFields = {
  name: "Cliente de demonstração",
  cpf: "90000000094",
};

type DocumentFields = typeof demoFields & { phone?: string; email?: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pickText(...values: unknown[]): string | undefined {
  return values.find((value): value is string => typeof value === "string" && value.trim().length > 0);
}

export async function extractClientDocument(file: File): Promise<{
  mode: "mock" | "live";
  fields: DocumentFields;
}> {
  const endpoint = process.env.DOCUMENT_AI_URL?.trim();
  if (!endpoint) return { mode: "mock", fields: demoFields };

  const requestBody = new FormData();
  requestBody.set("file", file, file.name);

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      body: requestBody,
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    throw new Error("Não foi possível conectar ao serviço de extração.");
  }

  if (!response.ok) throw new Error("O serviço de extração recusou o documento.");

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error("O serviço de extração retornou uma resposta inválida.");
  }

  const envelope = isRecord(payload) ? payload : {};
  const data = isRecord(envelope.extracted_data)
    ? envelope.extracted_data
    : isRecord(envelope.data)
      ? envelope.data
      : envelope;
  const parsed = documentFieldsSchema.safeParse({
    name: pickText(data.name, data.full_name),
    cpf: pickText(data.cpf, data.document_number),
    phone: pickText(data.phone, data.telephone),
    email: pickText(data.email),
  });
  if (!parsed.success) throw new Error("O serviço de extração não retornou dados válidos.");

  return {
    mode: "live",
    fields: {
      name: parsed.data.name ?? "",
      cpf: parsed.data.cpf ?? "",
      phone: parsed.data.phone,
      email: parsed.data.email,
    },
  };
}
