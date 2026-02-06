export type Member = {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  status: string;
  created_at: string;
  updated_at: string;

  // joins
  plan_name?: string | null;
  subscription_status?: string | null;
  subscription_start?: string | null;
  subscription_end?: string | null;
};

