import { neon } from '@neondatabase/serverless'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set')
}

export const sql = neon(process.env.DATABASE_URL)

// Type definitions for database entities
export interface User {
  id: number
  email: string
  password_hash: string
  role: 'admin' | 'trainer' | 'member' | 'superadmin'
  created_at: Date
  updated_at: Date
}

export interface Member {
  id: number
  user_id: number
  first_name: string
  last_name: string
  phone?: string
  date_of_birth?: Date
  gender?: string
  address?: string
  emergency_contact?: string
  emergency_phone?: string
  photo_url?: string
  status: 'active' | 'inactive' | 'suspended'
  join_date: Date
  created_at: Date
  updated_at: Date
}

export interface MembershipPlan {
  id: number
  name: string
  description?: string
  duration_months: number
  price: number
  features: string[]
  is_active: boolean
  created_at: Date
  updated_at: Date
}

export interface Subscription {
  id: number
  member_id: number
  plan_id: number
  start_date: Date
  end_date: Date
  status: 'active' | 'expired' | 'cancelled'
  payment_status: 'pending' | 'paid' | 'overdue'
  amount_paid?: number
  created_at: Date
  updated_at: Date
}

export interface Trainer {
  id: number
  user_id: number
  first_name: string
  last_name: string
  specialization?: string
  bio?: string
  photo_url?: string
  hourly_rate?: number
  is_active: boolean
  created_at: Date
  updated_at: Date
}

export interface GymClass {
  id: number
  name: string
  description?: string
  trainer_id?: number
  capacity: number
  duration_minutes: number
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  category?: string
  is_active: boolean
  created_at: Date
  updated_at: Date
}

export interface ClassSchedule {
  id: number
  class_id: number
  day_of_week: number
  start_time: string
  end_time: string
  room?: string
  is_active: boolean
  created_at: Date
}

export interface Attendance {
  id: number
  member_id: number
  check_in: Date
  check_out?: Date
  created_at: Date
}

export interface Payment {
  id: number
  member_id: number
  subscription_id?: number
  amount: number
  payment_method?: string
  transaction_id?: string
  status: 'pending' | 'completed' | 'failed' | 'refunded'
  payment_date: Date
  notes?: string
  created_at: Date
}
