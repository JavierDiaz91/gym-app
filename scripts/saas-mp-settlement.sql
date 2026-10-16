-- Atomic, idempotent settlement of a VERIFIED Kivra SaaS MP payment.
-- Caller must independently validate MP webhook signature and fetch payment
-- from Mercado Pago with Kivra's own access token, checking seller, amount,
-- currency, status and invoice external reference.
CREATE OR REPLACE FUNCTION public.settle_kivra_saas_mp_payment(
  p_invoice_id integer,
  p_gym_id integer,
  p_mp_payment_id text,
  p_collector_id text,
  p_amount numeric,
  p_currency text,
  p_external_reference text
) RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE
  v_invoice record;
BEGIN
  IF p_mp_payment_id IS NULL OR btrim(p_mp_payment_id) = '' THEN
    RAISE EXCEPTION 'ID de pago inválido';
  END IF;
  SELECT id, gym_id, amount, status, period_start, period_end
  INTO v_invoice FROM public.saas_invoices
  WHERE id = p_invoice_id FOR UPDATE;
  IF NOT FOUND OR v_invoice.gym_id <> p_gym_id
     OR v_invoice.amount <> p_amount OR p_currency <> 'ARS'
     OR p_external_reference <> format('kivra_saas_invoice_%s_gym_%s', p_invoice_id, p_gym_id) THEN
    RAISE EXCEPTION 'Datos de pago no coinciden con factura';
  END IF;
  IF v_invoice.status = 'paid' THEN
    RETURN FALSE;
  END IF;
  IF v_invoice.status NOT IN ('pending', 'overdue') THEN
    RAISE EXCEPTION 'Factura no pagable';
  END IF;
  INSERT INTO public.saas_mp_payments
    (invoice_id, gym_id, mp_payment_id, mp_account_id, amount, currency, provider_status)
  VALUES (p_invoice_id, p_gym_id, p_mp_payment_id, p_collector_id, p_amount, p_currency, 'approved')
  ON CONFLICT (mp_payment_id) DO NOTHING;
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  UPDATE public.saas_invoices SET status = 'paid', paid_at = NOW()
  WHERE id = p_invoice_id;
  INSERT INTO public.saas_audit_log
    (action, entity_type, entity_id, gym_id, details)
  VALUES ('saas_mp_payment_verified', 'saas_invoice', p_invoice_id::text, p_gym_id,
    jsonb_build_object('paymentId', p_mp_payment_id, 'amount', p_amount));
  RETURN TRUE;
END;
$$;
REVOKE ALL ON FUNCTION public.settle_kivra_saas_mp_payment(integer, integer, text, text, numeric, text, text) FROM PUBLIC;
