import { useMemo } from 'react';
import { segmentColors } from '../../lib/wheelOfNames';
import './WheelSpinner.css';

interface WheelSpinnerProps {
  entries: string[];
  rotation: number;
  spinning: boolean;
}

function polar(cx: number, cy: number, radius: number, angleDeg: number) {
  const angle = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  };
}

function slicePath(cx: number, cy: number, radius: number, startAngle: number, endAngle: number) {
  const start = polar(cx, cy, radius, endAngle);
  const end = polar(cx, cy, radius, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
}

function labelTransform(cx: number, cy: number, radius: number, angleDeg: number) {
  const point = polar(cx, cy, radius * 0.62, angleDeg);
  const flip = angleDeg > 90 && angleDeg < 270 ? angleDeg + 180 : angleDeg;
  return `translate(${point.x}, ${point.y}) rotate(${flip})`;
}

function labelFontSize(entryCount: number): number {
  if (entryCount <= 3) return 26;
  if (entryCount <= 6) return 20;
  if (entryCount <= 10) return 16;
  return 12;
}

export function WheelSpinner({ entries, rotation, spinning }: WheelSpinnerProps) {
  const size = 500;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 6;
  const colors = useMemo(() => segmentColors(entries.length), [entries.length]);

  if (entries.length === 0) {
    return <p className="wheel-spinner-empty">Add at least two names to spin.</p>;
  }

  const segmentAngle = 360 / entries.length;

  return (
    <div className="wheel-spinner-wrap">
      <div className="wheel-spinner-pointer" aria-hidden="true" />
      <div
        className={`wheel-spinner-rotor${spinning ? ' wheel-spinner-rotor-spinning' : ''}`}
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        <svg
          className="wheel-spinner-svg"
          viewBox={`0 0 ${size} ${size}`}
          width={size}
          height={size}
          role="img"
          aria-label="Wheel of names"
        >
          {entries.map((entry, index) => {
            const start = index * segmentAngle;
            const end = (index + 1) * segmentAngle;
            const mid = start + segmentAngle / 2;
            const label = entry.length > 12 ? `${entry.slice(0, 11)}…` : entry;
            return (
              <g key={`${entry}-${index}`}>
                <path
                  d={slicePath(cx, cy, radius, start, end)}
                  fill={colors[index]}
                  stroke="rgba(255,255,255,0.35)"
                  strokeWidth="1"
                />
                <text
                  className="wheel-spinner-label"
                  fontSize={labelFontSize(entries.length)}
                  transform={labelTransform(cx, cy, radius, mid)}
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {label}
                </text>
              </g>
            );
          })}
          <circle cx={cx} cy={cy} r={26} fill="#0f172a" stroke="#fbbf24" strokeWidth="4" />
        </svg>
      </div>
    </div>
  );
}
