-- Kivra SaaS administration schema
-- Run once in Neon before enabling the SuperAdmin SaaS modules.

CREATE TABLE IF NOT EXISTS saas_plans (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  monthly_price NUMERIC(12,2),
  max_members INTEGER,
  max_trainers INTEGER,
  status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gym_saas_subscriptions (
  id SERIAL PRIMARY KEY,
  gym_id INTEGER NOT NULL UNIQUE REFERENCES gyms(id) ON DELETE CASCADE,
  plan_id INTEGER NOT NULL REFERENCES saas_plans(id),
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('trial', 'active', 'past_due', 'cancelled')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_start DATE,
  current_period_end DATE,
  next_billing_date DATE,
  price_override NUMERIC(12,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS saas_invoices (
  id SERIAL PRIMARY KEY,
  gym_id INTEGER NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  subscription_id INTEGER REFERENCES gym_saas_subscriptions(id) ON DELETE SET NULL,
  period_start DATE,
  period_end DATE,
  amount NUMERIC(12,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  due_date DATE,
  paid_at TIMESTAMPTZ,
  external_reference VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS saas_audit_log (
  id BIGSERIAL PRIMARY KEY,
  actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(100),
  gym_id INTEGER REFERENCES gyms(id) ON DELETE SET NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gym_saas_subscriptions_plan
  ON gym_saas_subscriptions(plan_id);

CREATE INDEX IF NOT EXISTS idx_saas_invoices_gym
  ON saas_invoices(gym_id);

CREATE INDEX IF NOT EXISTS idx_saas_invoices_status
  ON saas_invoices(status);

CREATE INDEX IF NOT EXISTS idx_saas_audit_log_created_at
  ON saas_audit_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_saas_audit_log_gym
  ON saas_audit_log(gym_id);

INSERT INTO saas_plans (name, description, status)
VALUES
  ('Starter', 'Plan inicial para gimnasios que comienzan a operar con Kivra.', 'draft'),
  ('Profesional', 'Plan para gimnasios con operación completa de miembros, entrenadores, clases y rutinas.', 'draft'),
  ('Enterprise', 'Plan para operaciones de mayor escala y necesidades avanzadas.', 'draft')
ON CONFLICT (name) DO NOTHING;
