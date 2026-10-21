-- Transactional transfer lifecycle. Execute after saas-payment-methods-foundation.sql.
-- A receipt_storage_key must point to an already uploaded PRIVATE object.
-- This SQL does not implement storage, scanning or receipt retrieval.

CREATE OR REPLACE FUNCTION public.submit_kivra_saas_transfer(
  p_invoice_id integer,
  p_gym_id integer,
  p_user_id integer,
  p_operation_number text,
  p_receipt_storage_key text
) RETURNS bigint LANGUAGE plpgsql AS $$
DECLARE
  v_invoice record;
  v_id bigint;
BEGIN
  IF length(btrim(COALESCE(p_operation_number, ''))) NOT BETWEEN 4 AND 120
     OR length(btrim(COALESCE(p_receipt_storage_key, ''))) NOT BETWEEN 8 AND 1024 THEN
    RAISE EXCEPTION 'Número de operación o comprobante inválido';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.users
                 WHERE id = p_user_id AND gym_id = p_gym_id AND role = 'admin') THEN
    RAISE EXCEPTION 'Administrador no autorizado';
  END IF;
  SELECT id, gym_id, status INTO v_invoice
  FROM public.saas_invoices WHERE id = p_invoice_id FOR UPDATE;
  IF NOT FOUND OR v_invoice.gym_id <> p_gym_id
     OR v_invoice.status NOT IN ('pending', 'overdue') THEN
    RAISE EXCEPTION 'Factura no disponible';
  END IF;
  INSERT INTO public.saas_transfer_submissions
    (invoice_id, gym_id, submitted_by, operation_number, receipt_storage_key)
  VALUES (p_invoice_id, p_gym_id, p_user_id, btrim(p_operation_number), p_receipt_storage_key)
  RETURNING id INTO v_id;
  INSERT INTO public.saas_audit_log
    (actor_user_id, action, entity_type, entity_id, gym_id, details)
  VALUES (p_user_id, 'saas_transfer_submitted', 'saas_transfer', v_id::text,
          p_gym_id, jsonb_build_object('invoiceId', p_invoice_id));
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.review_kivra_saas_transfer(
  p_submission_id bigint,
  p_superadmin_id integer,
  p_approve boolean,
  p_notes text DEFAULT NULL
) RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE
  v_transfer record;
  v_invoice record;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_superadmin_id AND role = 'superadmin') THEN
    RAISE EXCEPTION 'Solo SuperAdmin';
  END IF;
  SELECT * INTO v_transfer FROM public.saas_transfer_submissions
  WHERE id = p_submission_id FOR UPDATE;
  IF NOT FOUND OR v_transfer.status <> 'under_review' THEN
    RETURN FALSE;
  END IF;
  SELECT id, status, gym_id INTO v_invoice FROM public.saas_invoices
  WHERE id = v_transfer.invoice_id FOR UPDATE;
  IF NOT FOUND OR v_invoice.gym_id <> v_transfer.gym_id THEN
    RAISE EXCEPTION 'Factura no coincide';
  END IF;
  IF p_approve AND v_invoice.status NOT IN ('pending', 'overdue') THEN
    RAISE EXCEPTION 'La factura ya no admite pagos';
  END IF;
  UPDATE public.saas_transfer_submissions
  SET status = CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END,
      reviewed_at = NOW(), reviewed_by = p_superadmin_id,
      review_notes = left(p_notes, 2000)
  WHERE id = p_submission_id;
  IF p_approve THEN
    UPDATE public.saas_invoices SET status = 'paid', paid_at = NOW()
    WHERE id = v_transfer.invoice_id;
  END IF;
  INSERT INTO public.saas_audit_log
    (actor_user_id, action, entity_type, entity_id, gym_id, details)
  VALUES (p_superadmin_id,
          CASE WHEN p_approve THEN 'saas_transfer_approved' ELSE 'saas_transfer_rejected' END,
          'saas_transfer', p_submission_id::text, v_transfer.gym_id,
          jsonb_build_object('invoiceId', v_transfer.invoice_id));
  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_kivra_saas_transfer(integer, integer, integer, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.review_kivra_saas_transfer(bigint, integer, boolean, text) FROM PUBLIC;
