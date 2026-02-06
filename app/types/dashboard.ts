export type AttendanceStat = {
  date: string;
  total_visits: number | string;
};

export type MemberSummary = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  plan_name?: string;
};
