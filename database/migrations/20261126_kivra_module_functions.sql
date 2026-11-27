BEGIN;
CREATE OR REPLACE FUNCTION public.kivra_gym_module_enabled(p_gym_id integer,p_module_code text,p_role text)
RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT COALESCE((SELECT CASE WHEN m.is_essential THEN true ELSE COALESCE(s.enabled,r.default_enabled) END
 FROM public.saas_modules m JOIN public.saas_module_roles r ON r.module_code=m.code
 JOIN public.gyms g ON g.id=p_gym_id
 LEFT JOIN public.gym_module_settings s ON s.gym_id=g.id AND s.module_code=m.code AND s.role=r.role
 WHERE m.code=p_module_code AND r.role=p_role),false);
$$;
CREATE OR REPLACE FUNCTION public.kivra_set_gym_module(p_gym_id integer,p_module_code text,p_role text,p_enabled boolean,p_actor_id integer)
RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE v_essential boolean; v_previous boolean;
BEGIN
 IF p_enabled IS NULL OR NOT EXISTS (SELECT 1 FROM public.users WHERE id=p_actor_id AND role='superadmin') THEN RAISE EXCEPTION 'Operacion no autorizada o invalida'; END IF;
 PERFORM 1 FROM public.gyms WHERE id=p_gym_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Gimnasio inexistente'; END IF;
 SELECT m.is_essential INTO v_essential FROM public.saas_modules m JOIN public.saas_module_roles r ON r.module_code=m.code WHERE m.code=p_module_code AND r.role=p_role;
 IF NOT FOUND THEN RAISE EXCEPTION 'Modulo o rol incompatible'; END IF;
 IF v_essential AND NOT p_enabled THEN RAISE EXCEPTION 'Modulo esencial'; END IF;
 v_previous := public.kivra_gym_module_enabled(p_gym_id,p_module_code,p_role);
 IF v_previous=p_enabled THEN RETURN true; END IF;
 INSERT INTO public.gym_module_settings(gym_id,module_code,role,enabled,updated_by,updated_at)
 VALUES(p_gym_id,p_module_code,p_role,p_enabled,p_actor_id,NOW())
 ON CONFLICT(gym_id,module_code,role) DO UPDATE SET enabled=EXCLUDED.enabled,updated_by=EXCLUDED.updated_by,updated_at=EXCLUDED.updated_at;
 INSERT INTO public.saas_audit_log(actor_user_id,action,entity_type,entity_id,gym_id,details)
 VALUES(p_actor_id,'gym_module_updated','gym_module',p_module_code,p_gym_id,jsonb_build_object('role',p_role,'previous',v_previous,'enabled',p_enabled));
 RETURN true;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.kivra_set_gym_module(integer,text,text,boolean,integer) FROM PUBLIC;
COMMIT;