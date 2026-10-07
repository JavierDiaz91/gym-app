-- Idempotencia para webhooks de Mercado Pago.
-- Ejecutar una vez sobre la base existente antes de habilitar el webhook endurecido.

CREATE UNIQUE INDEX IF NOT EXISTS ux_payments_transaction_id
ON payments (transaction_id)
WHERE transaction_id IS NOT NULL;
