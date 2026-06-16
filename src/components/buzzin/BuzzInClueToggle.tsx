import './BuzzInClueToggle.css';

interface BuzzInClueToggleProps {
  visible: boolean;
  showBuzzIn: boolean;
  onToggle: () => void;
}

export function BuzzInClueToggle({ visible, showBuzzIn, onToggle }: BuzzInClueToggleProps) {
  if (!visible) return null;

  return (
    <button
      type="button"
      className={`buzzin-clue-toggle${showBuzzIn ? ' buzzin-clue-toggle-active' : ''}`}
      onClick={onToggle}
      aria-pressed={showBuzzIn}
      aria-label={showBuzzIn ? 'Hide BuzzIn panel' : 'Show BuzzIn panel'}
    >
      {showBuzzIn ? 'Hide BuzzIn' : 'Show BuzzIn'}
    </button>
  );
}
