interface FinalJeopardyCategoryFieldProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
}

export function FinalJeopardyCategoryField({
  value,
  onChange,
  id = 'fj-category',
}: FinalJeopardyCategoryFieldProps) {
  return (
    <div className="field">
      <label className="label" htmlFor={id}>
        Category
      </label>
      <input
        id={id}
        className="input"
        value={value}
        placeholder="e.g. WORLD HISTORY"
        maxLength={120}
        onChange={(e) => onChange(e.target.value)}
      />
      <p className="field-hint">Revealed to players before wagers — separate from the clue text.</p>
    </div>
  );
}
