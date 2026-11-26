BEGIN;

ALTER TABLE public.saas_settings
 ADD COLUMN IF NOT EXISTS mp_payments_enabled boolean NOT NULL DEFAULT false,
 ADD COLUMN IF NOT EXISTS bank_transfers_enabled boolean NOT NULL DEFAULT false;

DROP INDEX IF EXISTS public.saas_transfer_one_submission_per_invoice;
CREATE UNIQUE INDEX IF NOT EXISTS saas_transfer_one_open_per_invoice
 ON public.saas_transfer_submissions(invoice_id)
 WHERE status IN ('under_review','approved');

CREATE OR REPLACE FUNCTION public.submit_kivra_saas_transfer_with_receipt(
 p_invoice_id integer,p_gym_id integer,p_user_id integer,
 p_operation_number text,p_receipt_hex text,p_mime text
) RETURNS bigint LANGUAGE plpgsql AS $function$
DECLARE v_invoice record; v_bytes bytea; v_id bigint; v_until timestamptz;
BEGIN
 IF length(btrim(COALESCE(p_operation_number,''))) NOT BETWEEN 4 AND 120
 OR p_mime IS NULL OR p_mime NOT IN ('application/pdf','image/png','image/jpeg')
 OR p_receipt_hex IS NULL OR length(p_receipt_hex) NOT BETWEEN 2 AND 4194304
 OR p_receipt_hex !~ '^[0-9a-fA-F]+$' OR length(p_receipt_hex)%2<>0 THEN
 RAISE EXCEPTION 'Comprobante u operación inválidos';
 END IF;
 v_bytes := decode(p_receipt_hex,'hex');
 IF NOT ((p_mime='application/pdf' AND substring(v_bytes from 1 for 5)=decode('255044462d','hex'))
 OR (p_mime='image/png' AND substring(v_bytes from 1 for 8)=decode('89504e470d0a1a0a','hex'))
 OR (p_mime='image/jpeg' AND substring(v_bytes from 1 for 3)=decode('ffd8ff','hex'))) THEN
 RAISE EXCEPTION 'Formato de comprobante inválido';
 END IF;
 IF NOT EXISTS (SELECT 1 FROM public.users WHERE id=p_user_id AND gym_id=p_gym_id AND role='admin') THEN
 RAISE EXCEPTION 'No autorizado';
 END IF;
 IF NOT EXISTS (SELECT 1 FROM public.saas_settings WHERE id=1 AND bank_transfers_enabled AND NULLIF(btrim(bank_account_holder),'') IS NOT NULL AND (NULLIF(btrim(bank_cbu),'') IS NOT NULL OR NULLIF(btrim(bank_alias),'') IS NOT NULL)) THEN
 RAISE EXCEPTION 'Transferencias no disponibles';
 END IF;
 SELECT id,gym_id,status INTO v_invoice FROM public.saas_invoices WHERE id=p_invoice_id FOR UPDATE;
 IF NOT FOUND OR v_invoice.gym_id IS DISTINCT FROM p_gym_id OR v_invoice.status NOT IN ('pending','overdue') THEN
 RAISE EXCEPTION 'Factura no pagable';
 END IF;
 IF EXISTS (SELECT 1 FROM public.saas_transfer_submissions WHERE invoice_id=p_invoice_id AND status IN ('under_review','approved')) THEN
 RAISE EXCEPTION 'Ya existe un comprobante en revisión o aprobado';
 END IF;
 SELECT COALESCE(MIN(provisional_until),now()+interval '48 hours') INTO v_until
 FROM public.saas_transfer_submissions WHERE invoice_id=p_invoice_id;
 INSERT INTO public.saas_transfer_submissions
 (invoice_id,gym_id,submitted_by,operation_number,receipt_storage_key,receipt_content,receipt_mime,provisional_until)
 VALUES(p_invoice_id,p_gym_id,p_user_id,btrim(p_operation_number),'neon-private:'||gen_random_uuid()::text,v_bytes,p_mime,v_until)
 RETURNING id INTO v_id;
 INSERT INTO public.saas_audit_log(actor_user_id,action,entity_type,entity_id,gym_id,details)
 VALUES(p_user_id,'saas_transfer_submitted','saas_transfer',v_id::text,p_gym_id,jsonb_build_object('invoiceId',p_invoice_id));
 RETURN v_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.kivra_saas_access_preview(p_gym_id integer)
 RETURNS TABLE(allowed boolean,reason text,overdue_invoice_id integer,provisional_until timestamptz)
 LANGUAGE sql STABLE AS $function$
 WITH debts AS (
 SELECT i.id,i.due_date,t.provisional_until,
 COALESCE(t.provisional_until>now(),false) AS provisional
 FROM public.saas_invoices i
 LEFT JOIN LATERAL (
 SELECT s.provisional_until FROM public.saas_transfer_submissions s
 WHERE s.invoice_id=i.id AND s.gym_id=i.gym_id AND s.status='under_review'
 LIMIT 1
 ) t ON true
 WHERE i.gym_id=p_gym_id AND i.status IN ('pending','overdue')
 AND i.due_date < (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date
 ), summary AS (
 SELECT count(*) AS total,count(*) FILTER(WHERE NOT provisional) AS unprotected FROM debts
 )
 SELECT summary.unprotected=0,
 CASE WHEN summary.total=0 THEN 'no_overdue_invoice' WHEN summary.unprotected=0 THEN 'transfer_under_review' ELSE 'overdue' END,
 COALESCE((SELECT id FROM debts WHERE NOT provisional ORDER BY due_date,id LIMIT 1),(SELECT id FROM debts ORDER BY due_date,id LIMIT 1)),
 CASE WHEN summary.unprotected=0 THEN (SELECT min(debts.provisional_until) FROM debts) ELSE NULL END
 FROM summary;
 $function$;

COMMIT;
