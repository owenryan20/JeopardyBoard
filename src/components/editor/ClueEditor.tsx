import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Clue, MediaType } from '../../types/board';
import { DEFAULT_POINT_VALUES } from '../../types/board';
import './ClueEditor.css';

interface ClueEditorProps {
  categoryName: string;
  clue: Clue;
  onSave: (clue: Clue) => void;
  onCancel: () => void;
  onSaveAndNext: (clue: Clue) => void;
}

export function ClueEditor({
  categoryName,
  clue,
  onSave,
  onCancel,
  onSaveAndNext,
}: ClueEditorProps) {
  const [draft, setDraft] = useState(clue);

  useEffect(() => {
    setDraft(clue);
  }, [clue]);

  const update = <K extends keyof Clue>(key: K, value: Clue[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const updateMedia = (partial: Partial<NonNullable<Clue['media']>>) => {
    setDraft((prev) => ({
      ...prev,
      media: {
        type: prev.media?.type ?? 'image',
        url: prev.media?.url ?? '',
        filename: prev.media?.filename,
        altText: prev.media?.altText,
        ...partial,
      },
    }));
  };

  const clearMedia = () => {
    setDraft((prev) => ({ ...prev, media: undefined }));
  };

  return (
    <div className="clue-editor-modal" role="dialog" aria-modal="true" aria-labelledby="clue-editor-title">
      <div className="modal clue-editor">
        <div className="modal-header">
          <div>
            <h2 id="clue-editor-title">Edit Clue</h2>
            <p className="clue-editor-subtitle">
              Editing: {categoryName} · {draft.value}
            </p>
          </div>
          <button type="button" className="btn btn-ghost btn-icon" aria-label="Close editor" onClick={onCancel}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div className="field">
            <label className="label" htmlFor="clue-text">
              Clue
            </label>
            <textarea
              id="clue-text"
              className="textarea"
              rows={4}
              maxLength={1000}
              value={draft.clue}
              onChange={(e) => update('clue', e.target.value)}
            />
            <p className="field-hint">{draft.clue.length}/1000</p>
          </div>

          <div className="field">
            <label className="label" htmlFor="clue-answer">
              Correct Answer
            </label>
            <input
              id="clue-answer"
              className="input"
              maxLength={500}
              value={draft.answer}
              onChange={(e) => update('answer', e.target.value)}
            />
            <p className="field-hint">{draft.answer.length}/500</p>
          </div>

          <div className="field">
            <label className="label" htmlFor="clue-value">
              Point Value
            </label>
            <select
              id="clue-value"
              className="select"
              value={draft.value}
              onChange={(e) => update('value', Number(e.target.value))}
            >
              {DEFAULT_POINT_VALUES.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          <div className="field toggle-row">
            <div>
              <span className="label" style={{ marginBottom: 0 }}>
                Daily Double
              </span>
              {draft.isDailyDouble && <span className="badge badge-dd" style={{ marginLeft: 8 }}>DD</span>}
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={draft.isDailyDouble}
                onChange={(e) => update('isDailyDouble', e.target.checked)}
              />
              <span className="toggle-slider" />
            </label>
          </div>

          <div className="field">
            <label className="label" htmlFor="host-notes">
              Host Notes
            </label>
            <textarea
              id="host-notes"
              className="textarea"
              rows={2}
              value={draft.hostNotes}
              onChange={(e) => update('hostNotes', e.target.value)}
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="clue-tags">
              Tags (comma-separated)
            </label>
            <input
              id="clue-tags"
              className="input"
              placeholder="Astronomy, Planets"
              value={draft.tags.join(', ')}
              onChange={(e) =>
                update(
                  'tags',
                  e.target.value
                    .split(',')
                    .map((t) => t.trim())
                    .filter(Boolean),
                )
              }
            />
          </div>

          <fieldset className="field media-fieldset">
            <legend className="label">Media</legend>
            <div className="field">
              <label className="label" htmlFor="media-type">
                Type
              </label>
              <select
                id="media-type"
                className="select"
                value={draft.media?.type ?? 'image'}
                onChange={(e) => updateMedia({ type: e.target.value as MediaType })}
              >
                <option value="image">Image</option>
                <option value="video">Video</option>
                <option value="audio">Audio</option>
              </select>
            </div>
            <div className="field">
              <label className="label" htmlFor="media-url">
                URL
              </label>
              <input
                id="media-url"
                className="input"
                placeholder="https://..."
                value={draft.media?.url ?? ''}
                onChange={(e) => updateMedia({ url: e.target.value })}
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="media-filename">
                Filename (optional)
              </label>
              <input
                id="media-filename"
                className="input"
                value={draft.media?.filename ?? ''}
                onChange={(e) => updateMedia({ filename: e.target.value })}
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="media-alt">
                Alt text
              </label>
              <input
                id="media-alt"
                className="input"
                value={draft.media?.altText ?? ''}
                onChange={(e) => updateMedia({ altText: e.target.value })}
              />
            </div>
            {draft.media?.url && (
              <button type="button" className="btn btn-sm btn-danger" onClick={clearMedia}>
                Remove media
              </button>
            )}
          </fieldset>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn" onClick={() => onSaveAndNext(draft)}>
            Save &amp; Next
          </button>
          <button type="button" className="btn btn-primary" onClick={() => onSave(draft)}>
            Save Clue
          </button>
        </div>
      </div>
    </div>
  );
}
