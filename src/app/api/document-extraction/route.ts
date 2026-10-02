import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { extractClientDocument, MAX_DOCUMENT_BYTES } from "@/lib/services/document-ai";

const acceptedTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);
const maxRequestBytes = MAX_DOCUMENT_BYTES + 64 * 1024;

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin) {
    const requestUrl = new URL(request.url);
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? requestUrl.host;
    const protocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ?? requestUrl.protocol.slice(0, -1);
    let originUrl: URL;
    try {
      originUrl = new URL(origin);
    } catch {
      return NextResponse.json({ error: "Origem da solicitação inválida." }, { status: 403 });
    }
    if (originUrl.origin !== `${protocol}://${host}`) {
      return NextResponse.json({ error: "Origem da solicitação inválida." }, { status: 403 });
    }
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Autenticação necessária." }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isActive: true },
  });
  if (!user?.isActive) {
    return NextResponse.json({ error: "Autenticação necessária." }, { status: 401 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > maxRequestBytes) {
    return NextResponse.json({ error: "O documento excede o limite de 10 MB." }, { status: 413 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Envie um arquivo em formato válido." }, { status: 400 });
  }

  const document = formData.get("document");
  if (!(document instanceof File) || document.size === 0) {
    return NextResponse.json({ error: "Selecione um documento para extrair." }, { status: 400 });
  }
  if (document.size > MAX_DOCUMENT_BYTES) {
    return NextResponse.json({ error: "O documento excede o limite de 10 MB." }, { status: 413 });
  }
  if (!acceptedTypes.has(document.type)) {
    return NextResponse.json({ error: "Use um PDF ou uma imagem PNG/JPEG." }, { status: 415 });
  }

  try {
    return NextResponse.json(await extractClientDocument(document));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha na extração do documento.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
