"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type Props = {
  data: {
    date: string;
    visitas: number;
  }[];
};

export function AttendanceChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="colorVisitas" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopOpacity={0.3} />
            <stop offset="95%" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Area
          type="monotone"
          dataKey="visitas"
          stroke="hsl(var(--primary))"
          fill="url(#colorVisitas)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
