import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { formatCurrency } from "~/lib/utils";

interface WeeklySalesChartProps {
  labels: string[];
  data: number[];
}

export function WeeklySalesChart({ labels, data }: WeeklySalesChartProps) {
  const chartData = labels.map((label, index) => ({
    day: label,
    amount: data[index] ?? 0,
  }));

  const maxValue = Math.max(...data, 1);

  return (
    <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
      <h3 className="text-sm font-semibold text-foreground mb-4">
        Ventas de la semana
      </h3>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "#6b7280" }}
              interval={0}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "#6b7280" }}
              tickFormatter={(value) =>
                value >= 1000 ? `S/${(value / 1000).toFixed(0)}k` : `S/${value}`
              }
              domain={[0, maxValue * 1.1]}
            />
            <Tooltip
              formatter={(value) => [formatCurrency(Number(value)), "Ventas"]}
              contentStyle={{
                backgroundColor: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />
            <Bar
              dataKey="amount"
              fill="#f97316"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
