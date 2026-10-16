import { sql } from "@/lib/db";

// Safety rollout: this gate is active only for the explicitly selected test gym.
// Default is OFF, including when the env variable is absent.
export function isSaaSAccessGateEnabled(gymId: number): boolean {
  const selected = process.env.KIVRA_SAAS_ACCESS_TEST_GYM_ID;
  return process.env.KIVRA_SAAS_ACCESS_GATE_ENABLED === "true" &&
    !!selected && /^\d+$/.test(selected) && Number(selected) === gymId;
}

export async function getSaaSAccess(gymId: number): Promise<{
  allowed: boolean;
  reason: string;
  overdueInvoiceId: number | null;
}> {
  if (!isSaaSAccessGateEnabled(gymId)) {
    return { allowed: true, reason: "gate_disabled", overdueInvoiceId: null };
  }
  // Do not fail open when billing cannot be checked for the test tenant.
  const [result] = await sql`
    SELECT allowed, reason, overdue_invoice_id
    FROM public.kivra_saas_access_preview(${gymId})
  `;
  if (!result) throw new Error("No se pudo verificar la suscripción SaaS");
  return {
    allowed: result.allowed === true,
    reason: String(result.reason),
    overdueInvoiceId: result.overdue_invoice_id == null ? null : Number(result.overdue_invoice_id)
  };
}

export async function requireSaaSOperationalAccess(gymId: number): Promise<void> {
  const status = await getSaaSAccess(gymId);
  if (!status.allowed) {
    throw new Error("Tu suscripción Kivra está vencida. Ingresá a Mi suscripción para regularizarla.");
  }
}
