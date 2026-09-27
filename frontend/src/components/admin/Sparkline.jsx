/**
 * Tiny inline-SVG sparkline. No chart library required.
 *   - data: array of numbers
 *   - width / height: pixels (defaults: 240 x 56)
 *   - stroke: color
 *   - fill: optional area-fill color (rgba)
 */
export function Sparkline({ data, width = 240, height = 56, stroke = "#FF6B3D", fill = "rgba(255, 107, 61, 0.15)" }) {
  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-xs text-text-muted"
        style={{ width, height }}
      >
        No data
      </div>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = data.length > 1 ? width / (data.length - 1) : width;
  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * (height - 6) - 3;
    return [x, y];
  });

  const pathD = points
    .map(([x, y], i) => (i === 0 ? `M ${x},${y}` : `L ${x},${y}`))
    .join(" ");

  // Area path: down to bottom at each x, then close
  const areaD = `${pathD} L ${points[points.length - 1][0]},${height} L ${points[0][0]},${height} Z`;

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label="Trend over time"
    >
      <path d={areaD} fill={fill} />
      <path d={pathD} fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {points.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2" fill={stroke} />
      ))}
    </svg>
  );
}
