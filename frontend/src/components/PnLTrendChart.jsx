// PnLTrendChart.jsx
//
// Lightweight SVG line chart for the Profit & Loss analytics
// dashboard. No external charting library required — keeps
// the bundle small and matches the project's existing
// hand-rolled-SVG conventions.

const SERIES = [
  { key: 'totalCollection', label: 'Collections', color: '#3D5A80' }, // accent
  { key: 'totalExpenses', label: 'Expenses', color: '#EE964B' }, // accent-gold
  { key: 'profit', label: 'Profit', color: '#2F8F4E' }, // green
];

const monthLabel = (ym) => {
  if (!ym) return '';
  const [year, month] = ym.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
};

const PnLTrendChart = ({ data = [], height = 260, series = SERIES }) => {
  if (!data.length) {
    return <p className="text-sm text-ink/50">No data available yet.</p>;
  }

  const width = 700;
  const padding = { top: 20, right: 16, bottom: 36, left: 56 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const allValues = data.flatMap((d) => series.map((s) => Number(d[s.key]) || 0));
  let minValue = Math.min(0, ...allValues);
  let maxValue = Math.max(0, ...allValues);
  if (minValue === maxValue) {
    maxValue = minValue + 1;
  }

  const xFor = (i) =>
    padding.left + (data.length === 1 ? innerWidth / 2 : (i / (data.length - 1)) * innerWidth);

  const yFor = (value) =>
    padding.top + innerHeight - ((value - minValue) / (maxValue - minValue)) * innerHeight;

  const zeroY = yFor(0);

  const pathFor = (key) =>
    data
      .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)} ${yFor(Number(d[key]) || 0)}`)
      .join(' ');

  const yTicks = 4;
  const tickValues = Array.from({ length: yTicks + 1 }, (_, i) =>
    minValue + ((maxValue - minValue) * i) / yTicks
  );

  const fmtTick = (v) => {
    if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(0)}k`;
    return v.toFixed(0);
  };

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img">
        {/* Horizontal grid lines + Y-axis labels */}
        {tickValues.map((v, i) => (
          <g key={i}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={yFor(v)}
              y2={yFor(v)}
              stroke="#1B1F2A"
              strokeOpacity="0.08"
            />
            <text x={padding.left - 8} y={yFor(v)} dy="0.32em" textAnchor="end" fontSize="10" fill="#1B1F2A" fillOpacity="0.5">
              {fmtTick(v)}
            </text>
          </g>
        ))}

        {/* Zero line, emphasized if profit can go negative */}
        {minValue < 0 && (
          <line
            x1={padding.left}
            x2={width - padding.right}
            y1={zeroY}
            y2={zeroY}
            stroke="#1B1F2A"
            strokeOpacity="0.25"
          />
        )}

        {/* X-axis month labels */}
        {data.map((d, i) => (
          <text
            key={d.month}
            x={xFor(i)}
            y={height - padding.bottom + 18}
            textAnchor="middle"
            fontSize="10"
            fill="#1B1F2A"
            fillOpacity="0.5"
          >
            {monthLabel(d.month)}
          </text>
        ))}

        {/* Series lines */}
        {series.map((s) => (
          <path key={s.key} d={pathFor(s.key)} fill="none" stroke={s.color} strokeWidth="2" />
        ))}

        {/* Series points */}
        {series.map((s) =>
          data.map((d, i) => (
            <circle key={`${s.key}-${i}`} cx={xFor(i)} cy={yFor(Number(d[s.key]) || 0)} r="2.5" fill={s.color} />
          ))
        )}
      </svg>

      <div className="mt-3 flex flex-wrap gap-4">
        {series.map((s) => (
          <div key={s.key} className="flex items-center gap-2 text-xs text-ink/60">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
            {s.label}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PnLTrendChart;
