const paymentId = "183589179992";

async function main() {
  const token = String(process.env.MP_TEST_ACCESS_TOKEN || "").trim();

  if (!token) {
    throw new Error("MP_TEST_ACCESS_TOKEN no está configurado.");
  }

  const response = await fetch(
    `https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Mercado Pago respondió HTTP ${response.status}`);
  }

  const payment = await response.json();

  console.log({
    id: payment.id,
    status: payment.status,
    live_mode: payment.live_mode,
    application_id: payment.application_id ?? null,
    collector_id: payment.collector_id ?? null,
    user_id: payment.user_id ?? null,
    external_reference: payment.external_reference ?? null,
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
