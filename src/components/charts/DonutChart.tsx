"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { SpreadBucket } from "@/types";

const COLORS = [
  "#3b82f6", // blue-500
  "#10b981", // emerald-500
  "#f59e0b", // amber-500
  "#ef4444", // red-500
  "#8b5cf6", // violet-500
  "#06b6d4", // cyan-500
  "#f97316", // orange-500
  "#ec4899", // pink-500
  "#84cc16", // lime-500
  "#6366f1", // indigo-500
];

const UNCLASSIFIED_COLOR = "#9ca3af"; // gray-400

type Props = {
  buckets: SpreadBucket[];
  title: string;
};

export function DonutChart({ buckets, title }: Props) {
  if (buckets.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-gray-500">
        No data available
      </div>
    );
  }

  const data = buckets.map((b) => ({
    name: b.name,
    value: Math.round(b.value),
    percentage: b.percentage.toFixed(1),
    isUnclassified: b.isUnclassified,
  }));

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-gray-700">{title}</h3>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            dataKey="value"
            nameKey="name"
          >
            {data.map((entry, index) => (
              <Cell
                key={entry.name}
                fill={
                  entry.isUnclassified
                    ? UNCLASSIFIED_COLOR
                    : COLORS[index % COLORS.length]
                }
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => [
              new Intl.NumberFormat("nb-NO", {
                style: "currency",
                currency: "NOK",
                minimumFractionDigits: 0,
              }).format(Number(value ?? 0)),
              String(name ?? ""),
            ]}
          />
          <Legend
            formatter={(value, entry) => {
              const payload = entry.payload as { percentage: string } | undefined;
              return `${value} (${payload?.percentage ?? "0"}%)`;
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
