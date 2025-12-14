"use client";

interface DataPoint {
  date: string;
  value: number;
}

interface SimpleChartProps {
  data: DataPoint[];
  color?: string;
  height?: number;
}

export function SimpleChart({
  data,
  color = "#3b82f6",
  height = 200,
}: SimpleChartProps) {
  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-gray-400 text-sm"
        style={{ height }}
      >
        Keine Daten verfügbar
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const chartWidth = 100; // percentage based
  const chartHeight = height - padding.top - padding.bottom;

  // Calculate points for the line
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = ((maxValue - d.value) / maxValue) * chartHeight + padding.top;
    return { x, y, ...d };
  });

  // Create SVG path
  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x}% ${p.y}`)
    .join(" ");

  // Create area path (for gradient fill)
  const areaPath = `${linePath} L 100% ${chartHeight + padding.top} L 0% ${chartHeight + padding.top} Z`;

  // Y-axis labels
  const yLabels = [0, Math.round(maxValue / 2), maxValue];

  // X-axis labels (show every 7th day)
  const xLabels = data.filter((_, i) => i % 7 === 0 || i === data.length - 1);

  return (
    <div className="w-full" style={{ height }}>
      <svg
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
        className="w-full h-full"
      >
        {/* Gradient definition */}
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {yLabels.map((_, i) => {
          const y = padding.top + (i / 2) * chartHeight;
          return (
            <line
              key={i}
              x1="0%"
              y1={y}
              x2="100%"
              y2={y}
              stroke="#e5e7eb"
              strokeWidth="0.5"
              vectorEffect="non-scaling-stroke"
            />
          );
        })}

        {/* Area fill */}
        <path
          d={areaPath}
          fill="url(#areaGradient)"
          vectorEffect="non-scaling-stroke"
        />

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={`${p.x}%`}
            cy={p.y}
            r="3"
            fill="white"
            stroke={color}
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
            className="opacity-0 hover:opacity-100 transition-opacity"
          />
        ))}
      </svg>

      {/* Y-axis labels */}
      <div
        className="absolute left-0 top-0 flex flex-col justify-between text-xs text-gray-400"
        style={{ height: chartHeight, marginTop: padding.top }}
      >
        {yLabels.reverse().map((label, i) => (
          <span key={i}>{label}</span>
        ))}
      </div>
    </div>
  );
}

// Wrapper component with labels
interface ChartContainerProps {
  title: string;
  data: { date: string; messages: number; tokens: number }[];
  dataKey: "messages" | "tokens";
  color?: string;
}

export function ChartContainer({
  title,
  data,
  dataKey,
  color = "#3b82f6",
}: ChartContainerProps) {
  const chartData = data.map((d) => ({
    date: d.date,
    value: d[dataKey],
  }));

  const total = chartData.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-900">{title}</h3>
        <span className="text-sm text-gray-500">
          Gesamt: {total.toLocaleString("de-CH")}
        </span>
      </div>
      <div className="relative">
        <SimpleChart data={chartData} color={color} height={200} />
      </div>
      {/* X-axis labels */}
      <div className="flex justify-between mt-2 text-xs text-gray-400">
        {data.length > 0 && (
          <>
            <span>{formatDateShort(data[0].date)}</span>
            <span>{formatDateShort(data[Math.floor(data.length / 2)].date)}</span>
            <span>{formatDateShort(data[data.length - 1].date)}</span>
          </>
        )}
      </div>
    </div>
  );
}

function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit" });
}
