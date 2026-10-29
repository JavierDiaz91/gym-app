/**
 * Validates an approved Mercado Pago payment before attempting SaaS settlement.
 * This does not authenticate a webhook or write to the database.
 * The caller must fetch payment details server-to-server and use an atomic
 * database settlement function that revalidates invoice ownership and amount.
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
  if (
    !/^[0-9]{1,30}$/.test(expectedPaymentId) ||
    !/^[0-9]+$/.test(expectedSellerId) ||
    String(payment.id) !== expectedPaymentId ||
    String(payment.collector_id) !== expectedSellerId ||
    payment.status !== "approved" ||
    payment.currency_id !== "ARS" ||
    typeof payment.transaction_amount !== "number" ||
    !Number.isFinite(payment.transaction_amount) ||
    payment.transaction_amount <= 0
  ) return null;

  const externalReference = String(payment.external_reference ?? "");
  const match = /^kivra_saas_invoice_([1-9][0-9]*)_gym_([1-9][0-9]*)$/.exec(externalReference);
  if (!match) return null;

  const invoiceId = Number(match[1]);
  const gymId = Number(match[2]);
  if (!Number.isSafeInteger(invoiceId) || !Number.isSafeInteger(gymId)) return null;

  return {
    invoiceId,
    gymId,
    amount: payment.transaction_amount,
    externalReference,
  };
}
