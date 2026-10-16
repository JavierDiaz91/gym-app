/**
 * Checks provider payment fields before any SaaS invoice settlement.
 * The webhook must separately authenticate the notification and retrieve
 * the payment directly from Mercado Pago.
 */
export function validateKivraSaaSPayment(
  payment: {
    id: unknown;
    collector_id: unknown;
    status: unknown;
    currency_id: unknown;
    transaction_amount: unknown;
    external_reference: unknown;
  },
  expectedPaymentId: string,
  expectedSellerId: string
): { invoiceId: number; gymId: number; amount: number; externalReference: string } | null {
  if (!/^\d{1,30}$/.test(expectedPaymentId) ||
      String(payment.id) !== expectedPaymentId ||
      String(payment.collector_id) !== expectedSellerId ||
      payment.status !== "approved" ||
      payment.currency_id !== "ARS" ||
      typeof payment.transaction_amount !== "number" ||
      !Number.isFinite(payment.transaction_amount) ||
      payment.transaction_amount <= 0) return null;

  const externalReference = String(payment.external_reference ?? "");
  const match = /^kivra_saas_invoice_([1-9]\d*)_gym_([1-9]\d*)$/.exec(externalReference);
  if (!match) return null;
  const invoiceId = Number(match[1]);
  const gymId = Number(match[2]);
  if (!Number.isSafeInteger(invoiceId) || !Number.isSafeInteger(gymId)) return null;
  return { invoiceId, gymId, amount: payment.transaction_amount, externalReference };
}
