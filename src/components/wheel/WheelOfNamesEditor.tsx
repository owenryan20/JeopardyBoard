import { useState } from 'react';
import type { Board } from '../../types/board';
import type { WheelOfNames } from '../../types/wheel';
import { createWheel, formatWheelEntries, parseWheelEntries } from '../../lib/wheelOfNames';
import './WheelOfNamesEditor.css';

interface WheelOfNamesEditorProps {
  board: Board;
  onBoardChange: (board: Board) => void;
}

export function WheelOfNamesEditor({ board, onBoardChange }: WheelOfNamesEditorProps) {
  const wheels = board.wheels ?? [];

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [draftEntries, setDraftEntries] = useState('');

  const startNew = () => {
    setEditingId('new');
    setDraftName('');
    setDraftEntries('');
  };

  const startEdit = (wheel: WheelOfNames) => {
    setEditingId(wheel.id);
    setDraftName(wheel.name);
    setDraftEntries(formatWheelEntries(wheel.entries));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraftName('');
    setDraftEntries('');
  };

  const saveWheel = () => {
    const entries = parseWheelEntries(draftEntries);
    if (entries.length < 2) return;

    if (editingId === 'new') {
      const wheel = createWheel(draftName, entries);
      onBoardChange({
        ...board,
        wheels: [...wheels, wheel],
        updatedAt: new Date().toISOString(),
      });
    } else if (editingId) {
      onBoardChange({
        ...board,
        wheels: wheels.map((wheel) =>
          wheel.id === editingId
            ? { ...wheel, name: draftName.trim() || wheel.name, entries }
            : wheel,
        ),
        updatedAt: new Date().toISOString(),
      });
    }
    cancelEdit();
  };

  const removeWheel = (wheelId: string) => {
    onBoardChange({
      ...board,
      wheels: wheels.filter((wheel) => wheel.id !== wheelId),
      updatedAt: new Date().toISOString(),
    });
    if (editingId === wheelId) cancelEdit();
  };

  return (
    <section className="inspector-section card wheel-editor-section">
      <h3>Wheel of Names</h3>
      <p className="field-hint">
        Create name lists for the in-game spinner. During play, a Teams wheel is built from live team
        names; wheels created in a game are saved here too.
      </p>

      <div className="wheel-editor-list">
        {wheels.length === 0 ? (
          <p className="wheel-editor-empty">No custom wheels yet.</p>
        ) : (
          <ul className="wheel-editor-items">
            {wheels.map((wheel) => (
              <li key={wheel.id} className="wheel-editor-item">
                <div>
                  <strong>{wheel.name}</strong>
                  <span className="wheel-editor-count">{wheel.entries.length} names</span>
                </div>
                <div className="wheel-editor-item-actions">
                  <button type="button" className="btn btn-sm" onClick={() => startEdit(wheel)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={() => removeWheel(wheel.id)}
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {editingId ? (
        <div className="wheel-editor-form">
          <label className="label" htmlFor="wheel-name">
            Wheel name
          </label>
          <input
            id="wheel-name"
            className="input"
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            placeholder="e.g. Daily Double picker"
          />
          <label className="label" htmlFor="wheel-entries">
            Names (one per line)
          </label>
          <textarea
            id="wheel-entries"
            className="textarea wheel-editor-textarea"
            rows={6}
            value={draftEntries}
            onChange={(event) => setDraftEntries(event.target.value)}
            placeholder={'Player 1\nPlayer 2\nPlayer 3'}
          />
          <div className="wheel-editor-form-actions">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={saveWheel}
              disabled={parseWheelEntries(draftEntries).length < 2}
            >
              Save wheel
            </button>
            <button type="button" className="btn btn-sm" onClick={cancelEdit}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="btn btn-sm btn-primary" onClick={startNew}>
          Add wheel
        </button>
      )}
    </section>
  );
}
