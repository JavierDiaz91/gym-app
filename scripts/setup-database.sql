-- Gym Management System Database Schema

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('admin', 'trainer', 'member')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Members table for gym member profiles
CREATE TABLE IF NOT EXISTS members (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  date_of_birth DATE,
  gender VARCHAR(20),
  address TEXT,
  emergency_contact VARCHAR(100),
  emergency_phone VARCHAR(20),
  photo_url TEXT,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  join_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Membership plans table
CREATE TABLE IF NOT EXISTS membership_plans (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  duration_months INTEGER NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  features JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Member subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  member_id INTEGER REFERENCES members(id) ON DELETE CASCADE,
  plan_id INTEGER REFERENCES membership_plans(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'overdue')),
  amount_paid DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trainers table
CREATE TABLE IF NOT EXISTS trainers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  specialization VARCHAR(255),
  bio TEXT,
  photo_url TEXT,
  hourly_rate DECIMAL(10, 2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Classes table for gym classes
CREATE TABLE IF NOT EXISTS classes (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  trainer_id INTEGER REFERENCES trainers(id),
  capacity INTEGER DEFAULT 20,
  duration_minutes INTEGER DEFAULT 60,
  difficulty VARCHAR(20) CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  category VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Class schedule table
CREATE TABLE IF NOT EXISTS class_schedule (
  id SERIAL PRIMARY KEY,
  class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Class bookings table
CREATE TABLE IF NOT EXISTS class_bookings (
  id SERIAL PRIMARY KEY,
  schedule_id INTEGER REFERENCES class_schedule(id) ON DELETE CASCADE,
  member_id INTEGER REFERENCES members(id) ON DELETE CASCADE,
  booking_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'attended', 'no_show')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(schedule_id, member_id, booking_date)
);

-- Attendance tracking
CREATE TABLE IF NOT EXISTS attendance (
  id SERIAL PRIMARY KEY,
  member_id INTEGER REFERENCES members(id) ON DELETE CASCADE,
  check_in TIMESTAMP NOT NULL,
  check_out TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  member_id INTEGER REFERENCES members(id) ON DELETE CASCADE,
  subscription_id INTEGER REFERENCES subscriptions(id),
  amount DECIMAL(10, 2) NOT NULL,
  payment_method VARCHAR(50),
  transaction_id VARCHAR(255),
  status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default membership plans
INSERT INTO membership_plans (name, description, duration_months, price, features) VALUES
('Plan Basico', 'Acceso a equipos de gimnasio', 1, 29.99, '["Acceso a equipos", "Horario limitado 6am-6pm", "Casillero incluido"]'),
('Plan Premium', 'Acceso completo con clases grupales', 1, 49.99, '["Acceso 24/7", "Clases grupales ilimitadas", "Casillero premium", "Toallas incluidas"]'),
('Plan VIP', 'Experiencia completa con entrenador personal', 1, 99.99, '["Todo lo del Plan Premium", "4 sesiones con entrenador personal", "Acceso a spa", "Estacionamiento gratuito"]'),
('Plan Anual Basico', 'Plan basico con descuento anual', 12, 299.99, '["Acceso a equipos", "Horario limitado 6am-6pm", "Casillero incluido", "2 meses gratis"]'),
('Plan Anual Premium', 'Plan premium con descuento anual', 12, 499.99, '["Acceso 24/7", "Clases grupales ilimitadas", "Casillero premium", "Toallas incluidas", "2 meses gratis"]')
ON CONFLICT DO NOTHING;

-- Insert default admin user (password: admin123)
INSERT INTO users (email, password_hash, role) VALUES
('admin@fitzone.com', '$2b$10$rQZ8K8qX5p0jxZK7sG5kXeJ1nL2mF3oP4qR5tU6wX7yZ8aB9cD0eF', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_members_user_id ON members(user_id);
CREATE INDEX IF NOT EXISTS idx_members_status ON members(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_member_id ON subscriptions(member_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_class_schedule_class_id ON class_schedule(class_id);
CREATE INDEX IF NOT EXISTS idx_class_bookings_member_id ON class_bookings(member_id);
CREATE INDEX IF NOT EXISTS idx_attendance_member_id ON attendance(member_id);
CREATE INDEX IF NOT EXISTS idx_payments_member_id ON payments(member_id);
