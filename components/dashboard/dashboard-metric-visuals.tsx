type SparklineProps = {
  progress: number;
};

export function MoneySparkline({ progress }: SparklineProps) {
  const clamped = Math.min(Math.max(progress, 8), 100);
  return (
    <svg
      viewBox="0 0 80 36"
      className="sync-dash-sparkline"
      aria-hidden
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points="0,28 14,22 28,24 42,14 56,18 70,8 80,12"
      />
      <circle cx="80" cy="12" r="2.5" fill="currentColor" />
      <line
        x1="0"
        y1={36 - (clamped / 100) * 28}
        x2="80"
        y2={36 - (clamped / 100) * 28}
        stroke="currentColor"
        strokeOpacity="0.15"
        strokeWidth="1"
        strokeDasharray="3 3"
      />
    </svg>
  );
}

export function HealthBarChart() {
  const bars = [0.45, 0.7, 0.55, 0.85, 0.6, 0.9, 0.5];
  return (
    <svg viewBox="0 0 56 36" className="sync-dash-barchart" aria-hidden>
      {bars.map((h, i) => (
        <rect
          key={i}
          x={i * 8 + 2}
          y={36 - h * 28}
          width="5"
          height={h * 28}
          rx="1.5"
          fill="currentColor"
          opacity={0.35 + h * 0.55}
        />
      ))}
    </svg>
  );
}

export function CareerChecklist() {
  return (
    <svg viewBox="0 0 56 36" className="sync-dash-checklist" aria-hidden>
      {[10, 20, 30].map((y, i) => (
        <g key={y}>
          <rect
            x="4"
            y={y - 4}
            width="10"
            height="10"
            rx="2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.25"
            opacity="0.5"
          />
          {i < 2 && (
            <polyline
              points={`6,${y} 8.5,${y + 2.5} 12,${y - 1.5}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          <line
            x1="20"
            y1={y}
            x2="52"
            y2={y}
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
            opacity="0.35"
          />
        </g>
      ))}
    </svg>
  );
}
