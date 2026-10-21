-- Private receipt bytes stored in Neon (no public URLs or external storage).
-- Max 2 MiB per receipt; PDF, PNG or JPEG, validated again at API.
-- Apply after saas-payment-methods-foundation.sql.
ALTER TABLE public.saas_transfer_submissions
  ADD COLUMN IF NOT EXISTS receipt_content BYTEA,
  ADD COLUMN IF NOT EXISTS receipt_mime VARCHAR(32);

ALTER TABLE public.saas_transfer_submissions
  DROP CONSTRAINT IF EXISTS saas_transfer_receipt_size;
ALTER TABLE public.saas_transfer_submissions
  ADD CONSTRAINT saas_transfer_receipt_size
  CHECK (receipt_content IS NULL OR octet_length(receipt_content) BETWEEN 1 AND 2097152);

CREATE OR REPLACE FUNCTION public.submit_kivra_saas_transfer_with_receipt(
  p_invoice_id integer,
  p_gym_id integer,
  p_user_id integer,
  p_operation_number text,
  p_receipt_hex text,
  p_mime text
) RETURNS bigint LANGUAGE plpgsql AS $$
DECLARE
  v_invoice record;
  v_bytes bytea;
  v_id bigint;
BEGIN
  IF length(btrim(COALESCE(p_operation_number, ''))) NOT BETWEEN 4 AND 120
     OR p_mime NOT IN ('application/pdf', 'image/png', 'image/jpeg')
     OR p_receipt_hex IS NULL OR length(p_receipt_hex) NOT BETWEEN 2 AND 4194304
     OR p_receipt_hex !~ '^[0-9a-fA-F]+$' OR length(p_receipt_hex) % 2 <> 0 THEN
    RAISE EXCEPTION 'Comprobante u operación inválidos';
  END IF;
  v_bytes := decode(p_receipt_hex, 'hex');
  IF octet_length(v_bytes) > 2097152 THEN
    RAISE EXCEPTION 'Comprobante demasiado grande';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.users WHERE id = p_user_id AND gym_id = p_gym_id AND role = 'admin'
  ) THEN RAISE EXCEPTION 'No autorizado'; END IF;

  SELECT id, gym_id, status INTO v_invoice
  FROM public.saas_invoices WHERE id = p_invoice_id FOR UPDATE;
  IF NOT FOUND OR v_invoice.gym_id <> p_gym_id
     OR v_invoice.status NOT IN ('pending', 'overdue') THEN
    RAISE EXCEPTION 'Factura no pagable';
  END IF;

  INSERT INTO public.saas_transfer_submissions
    (invoice_id, gym_id, submitted_by, operation_number,
     receipt_storage_key, receipt_content, receipt_mime)
  VALUES (p_invoice_id, p_gym_id, p_user_id, btrim(p_operation_number),
          'neon-private:' || gen_random_uuid()::text, v_bytes, p_mime)
  RETURNING id INTO v_id;

  INSERT INTO public.saas_audit_log
    (actor_user_id, action, entity_type, entity_id, gym_id, details)
  VALUES (p_user_id, 'saas_transfer_submitted', 'saas_transfer', v_id::text,
          p_gym_id, jsonb_build_object('invoiceId', p_invoice_id));
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.submit_kivra_saas_transfer_with_receipt(integer, integer, integer, text, text, text) FROM PUBLIC;
