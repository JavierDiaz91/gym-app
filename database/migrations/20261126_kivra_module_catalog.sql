BEGIN;
INSERT INTO public.saas_modules (code,name,category,is_essential,sort_order) VALUES
('dashboard','Inicio','General',true,10),
('members','Miembros','Gestión',false,20),
('memberships','Membresías','Gestión',false,30),
('payments','Pagos y cobros','Gestión',false,40),
('attendance','Asistencias','Gestión',false,50),
('classes','Clases y reservas','Deportiva',false,60),
('trainers','Entrenadores','Deportiva',false,70),
('categories','Categorías deportivas','Deportiva',false,80),
('training','Planificación y ejercicios','Deportiva',false,90),
('history','Historial deportivo','Deportiva',false,100),
('reports','Reportes','Administración',false,110),
('settings','Configuración','Administración',true,120),
('saas_subscription','Mi suscripción Kivra','Cuenta',true,130),
('profile','Mi perfil','Cuenta',true,140)
ON CONFLICT (code) DO NOTHING;
INSERT INTO public.saas_module_roles (module_code,role) VALUES
('dashboard','admin'),('dashboard','trainer'),
('members','admin'),('members','trainer'),
('memberships','admin'),('payments','admin'),('attendance','admin'),
('classes','admin'),('classes','trainer'),('classes','member'),
('trainers','admin'),('categories','admin'),('categories','trainer'),
('training','trainer'),('training','member'),('history','member'),
('reports','admin'),('settings','admin'),('saas_subscription','admin'),('profile','member')
ON CONFLICT (module_code,role) DO NOTHING;
COMMIT;