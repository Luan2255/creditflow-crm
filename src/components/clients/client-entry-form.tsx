"use client";

import { useEffect, useState, type FormEvent } from "react";
import { FileUp } from "lucide-react";
import { saveClientAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { documentFieldsSchema } from "@/lib/validation";

export function ClientEntryForm({
  partners,
  isPartner,
  mockMode,
}: {
  partners: { id: string; name: string }[];
  isPartner: boolean;
  mockMode: boolean;
}) {
  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [document, setDocument] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [usedMock, setUsedMock] = useState(mockMode);

  useEffect(() => setHydrated(true), []);

  async function extractDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!document) {
      setError("Selecione um documento.");
      return;
    }

    setExtracting(true);
    setError("");
    setMessage("");
    const payload = new FormData();
    payload.set("document", document);

    try {
      const response = await fetch("/api/document-extraction", { method: "POST", body: payload });
      const result: unknown = await response.json();
      if (!response.ok || typeof result !== "object" || result === null || !("fields" in result)) {
        const responseError = typeof result === "object" && result !== null && "error" in result && typeof result.error === "string"
          ? result.error
          : "Não foi possível extrair os dados.";
        throw new Error(responseError);
      }

      const fields = documentFieldsSchema.safeParse(result.fields);
      if (!fields.success || !("mode" in result) || (result.mode !== "mock" && result.mode !== "live")) {
        throw new Error("A resposta de extração não está em um formato válido.");
      }

      setName(fields.data.name ?? "");
      setCpf(fields.data.cpf ?? "");
      setPhone(fields.data.phone ?? "");
      setEmail(fields.data.email ?? "");
      setUsedMock(result.mode === "mock");
      setMessage(result.mode === "mock" ? "Dados fictícios de demonstração preenchidos." : "Campos extraídos e preenchidos.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível extrair os dados.");
    } finally {
      setExtracting(false);
    }
  }

  return (
    <>
      <form
        onSubmit={extractDocument}
        data-testid="document-upload-form"
        data-hydrated={hydrated}
        className="mt-4 flex flex-wrap items-end gap-3 border-b border-neutral-200 pb-5"
      >
        <label className="min-w-56 flex-1 space-y-1 text-xs text-neutral-600">
          Documento (PDF, PNG ou JPEG)
          <Input
            type="file"
            accept="application/pdf,image/png,image/jpeg"
            onChange={(event) => setDocument(event.target.files?.[0] ?? null)}
            className="h-11 py-2 file:mr-3 file:border-0 file:bg-transparent file:text-xs file:font-medium file:text-emerald-900"
          />
        </label>
        <Button type="submit" variant="secondary" disabled={extracting || !document} className="h-11">
          <FileUp aria-hidden="true" size={16} />
          {extracting ? "Extraindo..." : "Extrair dados"}
        </Button>
        <p role="note" className={`basis-full text-xs ${usedMock ? "text-amber-800" : "text-neutral-500"}`}>
          {usedMock
            ? "Modo demonstração: sem DOCUMENT_AI_URL, o arquivo não é enviado e os dados preenchidos são fictícios."
            : "Extração conectada: o arquivo será enviado ao serviço DOCUMENT_AI_URL configurado."}
        </p>
        {message && <p role="status" className="basis-full text-xs text-emerald-900">{message}</p>}
        {error && <p role="alert" className="basis-full text-xs text-red-800">{error}</p>}
      </form>

      <form action={saveClientAction} className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="space-y-1 text-xs text-neutral-600">
          Nome completo
          <Input name="name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required minLength={2} maxLength={120} />
        </label>
        <label className="space-y-1 text-xs text-neutral-600">
          CPF
          <Input name="cpf" inputMode="numeric" placeholder="000.000.000-00" value={cpf} onChange={(event) => setCpf(event.target.value)} required />
        </label>
        <label className="space-y-1 text-xs text-neutral-600">
          Telefone
          <Input name="phone" type="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} />
        </label>
        <label className="space-y-1 text-xs text-neutral-600">
          E-mail
          <Input name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        {!isPartner && (
          <label className="space-y-1 text-xs text-neutral-600">
            Parceiro responsável
            <select name="partnerId" required className="h-11 w-full border border-neutral-300 bg-white px-3 text-sm text-neutral-900">
              <option value="">Selecione</option>
              {partners.map((partner) => <option key={partner.id} value={partner.id}>{partner.name}</option>)}
            </select>
          </label>
        )}
        <div className="flex items-end">
          <Button type="submit" className="h-11 w-full sm:w-auto">Adicionar cliente</Button>
        </div>
      </form>
    </>
  );
}
