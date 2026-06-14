import { useEffect, useState } from 'react';
import {
  DEFAULT_POINT_VALUES,
  MAX_POINT_VALUE,
  MIN_POINT_VALUE,
} from '../../types/board';
import './PointValueInput.css';

function normalizePointValue(raw: number): number {
  if (!Number.isFinite(raw)) return MIN_POINT_VALUE;
  return Math.round(Math.max(MIN_POINT_VALUE, Math.min(MAX_POINT_VALUE, raw)));
}

interface PointValueInputProps {
  id: string;
  value: number;
  onChange: (value: number) => void;
}

export function PointValueInput({ id, value, onChange }: PointValueInputProps) {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  const commit = () => {
    const parsed = Number(text);
    const next = normalizePointValue(parsed);
    onChange(next);
    setText(String(next));
  };

  return (
    <div className="point-value-input">
      <input
        id={id}
        type="number"
        className="input"
        min={MIN_POINT_VALUE}
        max={MAX_POINT_VALUE}
        step={1}
        inputMode="numeric"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          }
        }}
      />
      <p className="field-hint">
        Enter any whole number from {MIN_POINT_VALUE.toLocaleString()} to {MAX_POINT_VALUE.toLocaleString()}.
      </p>
      <div className="point-value-presets" role="group" aria-label="Quick point values">
        {DEFAULT_POINT_VALUES.map((preset) => (
          <button
            key={preset}
            type="button"
            className={`btn btn-sm${value === preset ? ' btn-primary' : ''}`}
            onClick={() => {
              onChange(preset);
              setText(String(preset));
            }}
          >
            {preset}
          </button>
        ))}
        <button
          type="button"
          className={`btn btn-sm${value === 1000 ? ' btn-primary' : ''}`}
          onClick={() => {
            onChange(1000);
            setText('1000');
          }}
        >
          1000
        </button>
      </div>
    </div>
  );
}
