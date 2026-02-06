export type MemberStatus = "active" | "inactive" | "suspended";

export interface Member {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  phone: string | null;
  status: MemberStatus;
  join_date: string;
}
