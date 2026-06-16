import './WheelClueToggle.css';

interface WheelClueToggleProps {
  visible: boolean;
  showWheel: boolean;
  onToggle: () => void;
}

export function WheelClueToggle({ visible, showWheel, onToggle }: WheelClueToggleProps) {
  if (!visible) return null;

  return (
    <button
      type="button"
      className={`wheel-clue-toggle${showWheel ? ' wheel-clue-toggle-active' : ''}`}
      onClick={onToggle}
      aria-pressed={showWheel}
      aria-label={showWheel ? 'Hide wheel' : 'Open wheel of names'}
    >
      {showWheel ? 'Hide Wheel' : 'Wheel'}
    </button>
  );
}
