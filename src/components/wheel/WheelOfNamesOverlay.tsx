import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { Board } from '../../types/board';
import type { Team } from '../../types/board';
import type { WheelOfNames } from '../../types/wheel';
import {
  createWheel,
  formatWheelEntries,
  listWheelOptions,
  parseWheelEntries,
  planWheelSpin,
} from '../../lib/wheelOfNames';
import { WheelSpinner } from './WheelSpinner';
import './WheelOfNamesOverlay.css';

interface WheelOfNamesOverlayProps {
  board: Board;
  teams: Team[];
  onWheelsChange: (wheels: WheelOfNames[]) => void;
  onClose: () => void;
}

export function WheelOfNamesOverlay({
  board,
  teams,
  onWheelsChange,
  onClose,
}: WheelOfNamesOverlayProps) {
  const wheels = board.wheels ?? [];
  const options = useMemo(() => listWheelOptions(board, teams), [board, teams]);

  const [selectedId, setSelectedId] = useState(() => options[0]?.id ?? '');
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEntries, setNewEntries] = useState('');

  useEffect(() => {
    if (!options.some((option) => option.id === selectedId)) {
      setSelectedId(options[0]?.id ?? '');
    }
  }, [options, selectedId]);

  const selected = options.find((option) => option.id === selectedId) ?? options[0];
  const entries = selected?.entries ?? [];

  const handleSpin = () => {
    if (!selected || entries.length < 2 || spinning) return;

    const plan = planWheelSpin(entries.length, rotation);
    if (!plan) return;

    setWinner(null);
    setSpinning(true);
    setRotation(plan.targetRotation);

    window.setTimeout(() => {
      setSpinning(false);
      setWinner(entries[plan.winnerIndex] ?? null);
    }, 4200);
  };

  const handleCreateWheel = () => {
    const parsed = parseWheelEntries(newEntries);
    if (parsed.length < 2) return;

    const wheel = createWheel(newName, parsed);
    onWheelsChange([...wheels, wheel]);
    setSelectedId(wheel.id);
    setCreating(false);
    setNewName('');
    setNewEntries('');
    setWinner(null);
  };

  const removeWheel = (wheelId: string) => {
    onWheelsChange(wheels.filter((wheel) => wheel.id !== wheelId));
    if (selectedId === wheelId) {
      setSelectedId(options[0]?.id ?? '');
    }
  };

  return createPortal(
    <div
      className="clue-overlay wheel-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Wheel of Names"
      onClick={onClose}
    >
      <div className="clue-overlay-panel wheel-overlay-panel" onClick={(event) => event.stopPropagation()}>
        <header className="wheel-overlay-header">
          <h2>Wheel of Names</h2>
          <button type="button" className="btn btn-ghost wheel-overlay-close" onClick={onClose} aria-label="Close">
            <X size={22} />
          </button>
        </header>

        <div className="wheel-overlay-toolbar">
          <label className="wheel-overlay-toolbar-label" htmlFor="wheel-select">
            Choose wheel
          </label>
          <select
            id="wheel-select"
            className="select wheel-overlay-select"
            value={selected?.id ?? ''}
            onChange={(event) => {
              setSelectedId(event.target.value);
              setWinner(null);
            }}
            disabled={spinning}
          >
            {options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name} ({option.entries.length})
              </option>
            ))}
          </select>
        </div>

        <div className={`wheel-overlay-panel-inner${creating ? ' wheel-overlay-panel-inner-creating' : ''}`}>
          <div className="wheel-overlay-main">
            <WheelSpinner entries={entries} rotation={rotation} spinning={spinning} />
          </div>

          <div className="wheel-overlay-footer">
            {winner && !creating && (
              <p className="wheel-overlay-winner" role="status">
                <span className="wheel-overlay-winner-label">Winner</span>
                <strong>{winner}</strong>
              </p>
            )}

            <div className="wheel-overlay-actions clue-overlay-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSpin}
                disabled={spinning || entries.length < 2 || creating}
              >
                {spinning ? 'Spinning…' : 'Spin'}
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setCreating((open) => {
                    if (!open) setWinner(null);
                    return !open;
                  });
                }}
                disabled={spinning}
              >
                {creating ? 'Cancel new wheel' : 'New wheel'}
              </button>
            </div>
          </div>

          {creating && (
            <div className="wheel-overlay-create">
              <label className="label" htmlFor="runtime-wheel-name">
                Wheel name
              </label>
              <input
                id="runtime-wheel-name"
                className="input"
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                placeholder="e.g. Bonus round"
              />
              <label className="label" htmlFor="runtime-wheel-entries">
                Names (one per line)
              </label>
              <textarea
                id="runtime-wheel-entries"
                className="textarea"
                rows={5}
                value={newEntries}
                onChange={(event) => setNewEntries(event.target.value)}
                placeholder={formatWheelEntries(teams.map((team) => team.name))}
              />
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleCreateWheel}
                disabled={parseWheelEntries(newEntries).length < 2}
              >
                Save wheel
              </button>
            </div>
          )}

          {wheels.length > 0 && !creating && (
            <div className="wheel-overlay-runtime">
              <h3 className="wheel-overlay-runtime-title">Saved wheels</h3>
              <ul className="wheel-overlay-runtime-list">
                {wheels.map((wheel) => (
                  <li key={wheel.id}>
                    <span>{wheel.name}</span>
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={() => removeWheel(wheel.id)}
                      disabled={spinning}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
