import type { AuditMeta, AuditRequest, AuditView } from "./types";

async function readError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => null)) as { message?: string | string[] } | null;
  if (!body?.message) return "Não foi possível ler a auditoria.";
  return Array.isArray(body.message) ? body.message.join(" ") : body.message;
}

export async function loadMeta(signal?: AbortSignal): Promise<AuditMeta> {
  const response = await fetch("/api/audit/meta", { signal });
  if (!response.ok) throw new Error(await readError(response));
  return response.json() as Promise<AuditMeta>;
}

export async function loadAudit(request: AuditRequest, signal?: AbortSignal): Promise<AuditView> {
  const params = new URLSearchParams();
  params.set("period", request.period);
  if (request.clientId) params.set("clientId", request.clientId);
  if (request.startDate) params.set("startDate", request.startDate);
  if (request.endDate) params.set("endDate", request.endDate);
  if (request.search) params.set("search", request.search);
  const response = await fetch(`/api/audit?${params}`, { signal });
  if (!response.ok) throw new Error(await readError(response));
  return response.json() as Promise<AuditView>;
}
