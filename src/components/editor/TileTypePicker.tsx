import { Crop, Gamepad2, HelpCircle } from 'lucide-react';
import './TileTypePicker.css';

interface TileTypePickerProps {
  pointValue: number;
  onSelectClue: () => void;
  onSelectCharacterGuess: () => void;
  onSelectCropReveal: () => void;
  onCancel: () => void;
}

export function TileTypePicker({
  pointValue,
  onSelectClue,
  onSelectCharacterGuess,
  onSelectCropReveal,
  onCancel,
}: TileTypePickerProps) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="tile-type-title">
      <div className="modal tile-type-picker">
        <div className="modal-header">
          <h2 id="tile-type-title">Add to {pointValue} tile</h2>
        </div>
        <div className="modal-body tile-type-options">
          <button type="button" className="tile-type-card" onClick={onSelectClue}>
            <HelpCircle size={28} aria-hidden="true" />
            <strong>Standard Clue</strong>
            <span>Question and answer for classic Jeopardy play</span>
          </button>
          <button type="button" className="tile-type-card tile-type-minigame" onClick={onSelectCharacterGuess}>
            <Gamepad2 size={28} aria-hidden="true" />
            <strong>Character Guess</strong>
            <span>Interactive guessing using a CSV dataset</span>
          </button>
          <button type="button" className="tile-type-card tile-type-minigame" onClick={onSelectCropReveal}>
            <Crop size={28} aria-hidden="true" />
            <strong>Crop Reveal</strong>
            <span>Guess from a progressively revealed image crop</span>
          </button>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
