export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "/api/v1";

export async function responseMessage(response: Response): Promise<string> {
  try {
    const body = await response.json() as { detail?: unknown; error?: string };
    if (typeof body.detail === "string") return body.detail;
    if (Array.isArray(body.detail)) return body.detail.map(item => `${item.loc?.slice(1).join(".") ?? "Champ"}: ${item.msg ?? "Valeur invalide"}`).join(" · ");
    return body.error ?? `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
}
