BEGIN;
CREATE OR REPLACE FUNCTION public.kivra_notification_emit(p_gym integer,p_type text,p_title text,p_message text,p_key text,p_ref integer,p_url text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
 IF p_gym IS NULL THEN RETURN; END IF;
 INSERT INTO public.gym_notifications(gym_id,event_type,title,message,event_key,reference_id,action_url)
 SELECT p_gym,p_type,p_title,p_message,p_key,p_ref,p_url
 WHERE COALESCE((SELECT CASE p_type WHEN 'new_member' THEN new_members WHEN 'payment_received' THEN payments_received WHEN 'membership_expiring' THEN membership_expiring WHEN 'membership_expired' THEN membership_expired WHEN 'class_full' THEN classes_full ELSE false END FROM public.gym_notification_preferences WHERE gym_id=p_gym),true)
 ON CONFLICT(gym_id,event_key) DO NOTHING;
END $$;

CREATE OR REPLACE FUNCTION public.kivra_notify_member() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM public.kivra_notification_emit(NEW.gym_id,'new_member','Nuevo miembro',NEW.first_name||' '||NEW.last_name||' se registró en el gimnasio.','member:'||NEW.id,NEW.id,'/admin/miembros');
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS kivra_notify_member ON public.members;
CREATE TRIGGER kivra_notify_member AFTER INSERT ON public.members FOR EACH ROW EXECUTE FUNCTION public.kivra_notify_member();

CREATE OR REPLACE FUNCTION public.kivra_notify_payment() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE m record;
BEGIN
 IF NEW.status IS DISTINCT FROM 'completed' THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' THEN IF OLD.status='completed' THEN RETURN NEW; END IF; END IF;
 SELECT gym_id,first_name,last_name INTO m FROM public.members WHERE id=NEW.member_id;
 IF FOUND THEN
 PERFORM public.kivra_notification_emit(m.gym_id,'payment_received','Pago recibido',m.first_name||' '||m.last_name||' registró un pago de $'||NEW.amount,'payment:'||NEW.id,NEW.id,'/admin/pagos');
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS kivra_notify_payment ON public.payments;
CREATE TRIGGER kivra_notify_payment AFTER INSERT OR UPDATE OF status ON public.payments FOR EACH ROW EXECUTE FUNCTION public.kivra_notify_payment();

CREATE OR REPLACE FUNCTION public.kivra_notify_class() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE c record; occupied integer;
BEGIN
 IF NEW.status IS DISTINCT FROM 'confirmed' THEN RETURN NEW; END IF;
 SELECT t.gym_id,cl.name,cl.capacity INTO c FROM public.class_schedule s JOIN public.classes cl ON cl.id=s.class_id JOIN public.trainers t ON t.id=cl.trainer_id JOIN public.members m ON m.id=NEW.member_id AND m.gym_id=t.gym_id WHERE s.id=NEW.schedule_id;
 IF NOT FOUND OR c.capacity IS NULL OR c.capacity<=0 THEN RETURN NEW; END IF;
 SELECT count(*) INTO occupied FROM public.class_bookings b JOIN public.members m ON m.id=b.member_id AND m.gym_id=c.gym_id WHERE b.schedule_id=NEW.schedule_id AND b.booking_date=NEW.booking_date AND b.status='confirmed';
 IF occupied>=c.capacity THEN
 PERFORM public.kivra_notification_emit(c.gym_id,'class_full','Clase completa',c.name||' alcanzó su capacidad para el '||NEW.booking_date,'class:'||NEW.schedule_id||':'||NEW.booking_date,NEW.schedule_id,'/admin/clases');
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS kivra_notify_class ON public.class_bookings;
CREATE TRIGGER kivra_notify_class AFTER INSERT OR UPDATE OF status ON public.class_bookings FOR EACH ROW EXECUTE FUNCTION public.kivra_notify_class();

CREATE OR REPLACE FUNCTION public.kivra_generate_membership_notifications(p_gym integer) RETURNS void LANGUAGE plpgsql AS $$
DECLARE r record; today date := (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date;
BEGIN
 FOR r IN SELECT s.id,s.end_date,m.first_name,m.last_name,m.gym_id
 FROM public.subscriptions s JOIN public.members m ON m.id=s.member_id
 LEFT JOIN public.gym_notification_preferences p ON p.gym_id=m.gym_id
 WHERE m.gym_id=p_gym AND s.payment_status='paid' AND s.status IN ('active','expired','scheduled')
 AND s.start_date<=today AND s.end_date BETWEEN today-1 AND today+COALESCE(p.expiration_days,3)
 AND NOT EXISTS (SELECT 1 FROM public.subscriptions n WHERE n.member_id=s.member_id AND n.id<>s.id AND n.payment_status='paid' AND n.status IN ('active','scheduled') AND n.start_date<=s.end_date AND n.end_date>s.end_date)
 LOOP
 IF r.end_date<=today THEN
 PERFORM public.kivra_notification_emit(r.gym_id,'membership_expired','Membresía vencida',r.first_name||' '||r.last_name||' venció el '||r.end_date,'expired:'||r.id||':'||r.end_date,r.id,'/admin/membresias');
 ELSE
 PERFORM public.kivra_notification_emit(r.gym_id,'membership_expiring','Membresía por vencer',r.first_name||' '||r.last_name||' vence el '||r.end_date,'expiring:'||r.id||':'||r.end_date,r.id,'/admin/membresias');
 END IF;
 END LOOP;
END $$;
COMMIT;
