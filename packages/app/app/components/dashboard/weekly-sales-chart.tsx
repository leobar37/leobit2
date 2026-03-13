import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { formatCurrency } from "~/lib/utils";
import type { PeriodType } from "./period-selector";

interface WeeklySalesChartProps {
  labels: string[];
  data: number[];
  periodType: PeriodType;
}

const CHART_TITLES: Record<PeriodType, string> = {
  day: "Ventas por hora",
  week: "Ventas de la semana",
  month: "Ventas del mes",
  range: "Ventas del rango",
};

function getTickInterval(periodType: PeriodType, labelCount: number) {
  const maxTicks =
    periodType === "day" ? 6 : periodType === "range" ? 5 : 7;

  return Math.max(0, Math.ceil(labelCount / maxTicks) - 1);
}

function formatXAxisLabel(label: string, periodType: PeriodType) {
  if (periodType === "day") {
    const hour = label.split(":")[0]?.padStart(2, "0") ?? label;
    return `${hour}h`;
  }

  if (periodType === "range") {
    return label.replace(".", "");
  }

  return label;
}

export function WeeklySalesChart({
  labels,
  data,
  periodType,
}: WeeklySalesChartProps) {
  const chartData = labels.map((label, index) => ({
    day: label,
    amount: data[index] ?? 0,
  }));
  const maxValue = Math.max(...data, 1);
  const tickInterval = getTickInterval(periodType, labels.length);

  return (
    <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
      <h3 className="text-sm font-semibold text-foreground mb-4">
        {CHART_TITLES[periodType]}
      </h3>
      <div className="h-44 sm:h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 8, right: 8, bottom: 12, left: 0 }}
          >
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "#6b7280" }}
              tickFormatter={(value) => formatXAxisLabel(String(value), periodType)}
              interval={tickInterval}
              minTickGap={18}
              tickMargin={8}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "#6b7280" }}
              tickFormatter={(value) =>
                value >= 1000 ? `S/${(value / 1000).toFixed(0)}k` : `S/${value}`
              }
              domain={[0, maxValue * 1.1]}
              width={38}
            />
            <Tooltip
              formatter={(value) => [formatCurrency(Number(value)), "Ventas"]}
              labelFormatter={(value) =>
                formatXAxisLabel(String(value), periodType)
              }
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
