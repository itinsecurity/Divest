"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { StockInterestBalance } from "@/types";

type Props = {
  balance: StockInterestBalance;
  title: string;
};

function formatNOK(value: number): string {
  return new Intl.NumberFormat("nb-NO", {
    style: "currency",
    currency: "NOK",
    minimumFractionDigits: 0,
  }).format(value);
}

export function StackedBarChart({ balance, title }: Props) {
  const data = [
    {
      name: "Portfolio",
      Equity: Math.round(balance.equity.value),
      Interest: Math.round(balance.interest.value),
      Unclassified: Math.round(balance.unclassified.value),
    },
  ];

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-gray-700">{title}</h3>
      <div className="mb-3 grid grid-cols-3 gap-4 text-center text-sm">
        <div>
          <span className="block font-semibold text-blue-600">
            {balance.equity.percentage.toFixed(1)}%
          </span>
          <span className="text-gray-500">Equity</span>
          <span className="block text-xs text-gray-400">
            {formatNOK(balance.equity.value)}
          </span>
        </div>
        <div>
          <span className="block font-semibold text-emerald-600">
            {balance.interest.percentage.toFixed(1)}%
          </span>
          <span className="text-gray-500">Interest</span>
          <span className="block text-xs text-gray-400">
            {formatNOK(balance.interest.value)}
          </span>
        </div>
        <div>
          <span className="block font-semibold text-gray-500">
            {balance.unclassified.percentage.toFixed(1)}%
          </span>
          <span className="text-gray-500">Unclassified</span>
          <span className="block text-xs text-gray-400">
            {formatNOK(balance.unclassified.value)}
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} layout="vertical">
          <XAxis
            type="number"
            tickFormatter={(v: number) =>
              new Intl.NumberFormat("nb-NO", {
                notation: "compact",
                currency: "NOK",
              }).format(v)
            }
          />
          <YAxis type="category" dataKey="name" hide />
          <Tooltip formatter={(value: number) => [formatNOK(value)]} />
          <Legend />
          <Bar dataKey="Equity" stackId="a" fill="#3b82f6" />
          <Bar dataKey="Interest" stackId="a" fill="#10b981" />
          <Bar dataKey="Unclassified" stackId="a" fill="#9ca3af" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
