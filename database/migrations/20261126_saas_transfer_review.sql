BEGIN;
CREATE OR REPLACE FUNCTION public.review_kivra_saas_transfer(
 p_transfer_id bigint, p_actor_id integer, p_decision text, p_notes text
) RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE
 v_invoice public.saas_invoices%ROWTYPE;
 v_transfer public.saas_transfer_submissions%ROWTYPE;
 v_invoice_id integer;
BEGIN
 IF p_decision IS NULL OR p_decision NOT IN ('approved','rejected') OR
    NOT EXISTS (SELECT 1 FROM public.users WHERE id=p_actor_id AND role='superadmin') THEN
   RAISE EXCEPTION 'Revisión no autorizada o inválida';
 END IF;
 IF p_decision='rejected' AND NULLIF(btrim(p_notes),'') IS NULL THEN
   RAISE EXCEPTION 'El motivo del rechazo es obligatorio';
 END IF;
 IF length(coalesce(p_notes,'')) > 1000 THEN RAISE EXCEPTION 'Observaciones demasiado extensas'; END IF;
 SELECT invoice_id INTO v_invoice_id FROM public.saas_transfer_submissions WHERE id=p_transfer_id;
 IF NOT FOUND THEN RETURN FALSE; END IF;
 SELECT * INTO v_invoice FROM public.saas_invoices WHERE id=v_invoice_id FOR UPDATE;
 IF NOT FOUND THEN RETURN FALSE; END IF;
 SELECT * INTO v_transfer FROM public.saas_transfer_submissions WHERE id=p_transfer_id FOR UPDATE;
 IF NOT FOUND OR v_transfer.status <> 'under_review' OR v_transfer.invoice_id <> v_invoice.id OR v_transfer.gym_id <> v_invoice.gym_id THEN RETURN FALSE; END IF;
 IF p_decision='approved' THEN
   IF v_invoice.status NOT IN ('pending','overdue') OR v_invoice.amount <= 0 OR v_transfer.receipt_content IS NULL OR EXISTS (SELECT 1 FROM public.saas_mp_payments WHERE invoice_id=v_invoice.id) THEN RETURN FALSE; END IF;
   UPDATE public.saas_invoices SET status='paid', paid_at=NOW() WHERE id=v_invoice.id;
 END IF;
 UPDATE public.saas_transfer_submissions SET status=p_decision, reviewed_at=NOW(), reviewed_by=p_actor_id, review_notes=NULLIF(btrim(p_notes),'') WHERE id=p_transfer_id;
 INSERT INTO public.saas_audit_log(actor_user_id,action,entity_type,entity_id,gym_id,details)
 VALUES(p_actor_id,CASE WHEN p_decision='approved' THEN 'saas_transfer_approved' ELSE 'saas_transfer_rejected' END,'saas_transfer',p_transfer_id::text,v_invoice.gym_id,jsonb_build_object('invoice_id',v_invoice.id,'amount',v_invoice.amount,'notes',NULLIF(btrim(p_notes),'')));
 RETURN TRUE;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.review_kivra_saas_transfer(bigint,integer,text,text) FROM PUBLIC;
COMMIT;
