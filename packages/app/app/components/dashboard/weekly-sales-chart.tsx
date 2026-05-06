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
  day: "Actividad por hora",
  week: "Actividad de la semana",
  month: "Actividad del mes",
  range: "Actividad del rango",
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
  const isDark =
    typeof document !== "undefined"
      ? document.documentElement.classList.contains("dark")
      : false;

  return (
    <div className="shell-card-flat rounded-[24px] bg-white/70 p-4 shadow-[0_10px_26px_rgba(15,23,42,0.05)] dark:bg-[#151821] dark:shadow-[0_18px_40px_rgba(0,0,0,0.22)]">
      <h3 className="text-sm font-semibold text-foreground mb-4">
        {CHART_TITLES[periodType]}
      </h3>
      <div className="h-44 min-h-44 min-w-0 w-full sm:h-48">
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
          <BarChart
            data={chartData}
            margin={{ top: 8, right: 8, bottom: 12, left: 0 }}
          >
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: isDark ? "#a8acb7" : "#6b7280" }}
              tickFormatter={(value) => formatXAxisLabel(String(value), periodType)}
              interval={tickInterval}
              minTickGap={18}
              tickMargin={8}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: isDark ? "#a8acb7" : "#6b7280" }}
              tickFormatter={(value) =>
                value >= 1000 ? `S/${(value / 1000).toFixed(0)}k` : `S/${value}`
              }
              domain={[0, maxValue * 1.1]}
              width={38}
            />
            <Tooltip
              formatter={(value) => [formatCurrency(Number(value)), "Actividad"]}
              labelFormatter={(value) =>
                formatXAxisLabel(String(value), periodType)
              }
              contentStyle={{
                backgroundColor: isDark ? "rgba(29, 31, 38, 0.96)" : "#fff",
                border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid #e5e7eb",
                borderRadius: "8px",
                fontSize: "12px",
                color: isDark ? "#f3f4f6" : "#111827",
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
