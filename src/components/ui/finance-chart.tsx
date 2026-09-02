"use client";

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  type PieLabelRenderProps,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
  loading?: boolean;
}

export function ChartCard({ title, children, className, action, loading }: ChartCardProps) {
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>
          {action}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

const CHART_COLORS = ["#059669", "#10b981", "#34d399", "#6ee7b7", "#a7f3d0", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6", "#ec4899"];

interface AreaChartProps {
  data: Array<{ date: string; [key: string]: string | number }>;
  dataKeys: Array<{ key: string; color?: string; name?: string }>;
  height?: number;
}

export function FinanceAreaChart({ data, dataKeys, height = 300 }: AreaChartProps) {
  if (!data.length) {
    return <div className="flex h-[300px] items-center justify-center text-sm text-slate-400">No data available</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          {dataKeys.map((dk, i) => (
            <linearGradient key={dk.key} id={`gradient-${dk.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={dk.color || CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0.3} />
              <stop offset="95%" stopColor={dk.color || CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
          }}
        />
        {dataKeys.map((dk, i) => (
          <Area
            key={dk.key}
            type="monotone"
            dataKey={dk.key}
            name={dk.name || dk.key}
            stroke={dk.color || CHART_COLORS[i % CHART_COLORS.length]}
            fill={`url(#gradient-${dk.key})`}
            strokeWidth={2}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

interface BarChartProps {
  data: Array<{ name: string; [key: string]: string | number }>;
  dataKeys: Array<{ key: string; color?: string; name?: string }>;
  height?: number;
  stacked?: boolean;
}

export function FinanceBarChart({ data, dataKeys, height = 300, stacked }: BarChartProps) {
  if (!data.length) {
    return <div className="flex h-[300px] items-center justify-center text-sm text-slate-400">No data available</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
          }}
        />
        <Legend />
        {dataKeys.map((dk, i) => (
          <Bar
            key={dk.key}
            dataKey={dk.key}
            name={dk.name || dk.key}
            fill={dk.color || CHART_COLORS[i % CHART_COLORS.length]}
            radius={[4, 4, 0, 0]}
            stackId={stacked ? "stack" : undefined}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

interface PieChartProps {
  data: Array<{ name: string; value: number; color?: string }>;
  height?: number;
}

export function FinancePieChart({ data, height = 300 }: PieChartProps) {
  if (!data.length) {
    return <div className="flex h-[300px] items-center justify-center text-sm text-slate-400">No data available</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart margin={{ top: 12, right: 32, bottom: 12, left: 32 }}>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius="72%"
          paddingAngle={4}
          dataKey="value"
          label={({ name, percent }: PieLabelRenderProps) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
        >
          {data.map((entry, index) => (
            <Cell key={entry.name} fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
