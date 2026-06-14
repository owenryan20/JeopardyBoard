import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { AttachmentDisplayMode, Clue, TileAttachment } from '../../types/board';
import {
  attachmentsForSave,
  DEFAULT_ATTACHMENT_DISPLAY_MODE,
} from '../../lib/attachments';
import { canResetTile } from '../../lib/boardFactory';
import { confirmDialog } from '../../lib/dialog';
import { answerMediaForSave } from '../../lib/mediaUtils';
import { AttachmentEditor } from './AttachmentEditor';
import { AnswerMediaEditor } from './AnswerMediaEditor';
import { FinalJeopardyCategoryField } from './FinalJeopardyCategoryField';
import { PointValueInput } from './PointValueInput';
import './ClueEditor.css';

interface ClueEditorProps {
  categoryName: string;
  clue: Clue;
  variant?: 'board' | 'final';
  finalCategory?: string;
  onFinalCategoryChange?: (category: string) => void;
  onSave: (clue: Clue) => void;
  onCancel: () => void;
  onSaveAndNext: (clue: Clue) => void;
  onConvertToMiniGame?: () => void;
  onReset?: () => void;
}

export function ClueEditor({
  categoryName,
  clue,
  variant = 'board',
  finalCategory = '',
  onFinalCategoryChange,
  onSave,
  onCancel,
  onSaveAndNext,
  onConvertToMiniGame,
  onReset,
}: ClueEditorProps) {
  const [draft, setDraft] = useState(clue);
  const [categoryDraft, setCategoryDraft] = useState(finalCategory);

  useEffect(() => {
    setDraft(clue);
  }, [clue]);

  useEffect(() => {
    setCategoryDraft(finalCategory);
  }, [finalCategory, clue.id]);

  const update = <K extends keyof Clue>(key: K, value: Clue[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const prepareClueForSave = (next: Clue): Clue => ({
    ...next,
    answerMedia: answerMediaForSave(next.answerMedia),
    attachments: attachmentsForSave(next.attachments),
    attachmentDisplayMode: next.attachmentDisplayMode ?? DEFAULT_ATTACHMENT_DISPLAY_MODE,
    media: undefined,
  });

  const saveDraft = (next: Clue) => {
    if (isFinal) {
      onFinalCategoryChange?.(categoryDraft.trim());
    }
    onSave(prepareClueForSave(next));
  };

  const handleAttachmentsChange = (
    attachments: TileAttachment[],
    displayMode: AttachmentDisplayMode,
  ) => {
    setDraft((prev) => ({
      ...prev,
      attachments,
      attachmentDisplayMode: displayMode,
    }));
  };

  const isFinal = variant === 'final';

  return (
    <div className="clue-editor-modal" role="dialog" aria-modal="true" aria-labelledby="clue-editor-title">
      <div className="modal clue-editor">
        <div className="modal-header">
          <div>
            <h2 id="clue-editor-title">{isFinal ? 'Edit Final Jeopardy' : 'Edit Clue'}</h2>
            <p className="clue-editor-subtitle">
              Editing: {categoryName}{!isFinal ? ` · ${draft.value}` : ''}
            </p>
          </div>
          <button type="button" className="btn btn-ghost btn-icon" aria-label="Close editor" onClick={onCancel}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {isFinal && (
            <FinalJeopardyCategoryField
              id="clue-editor-fj-category"
              value={categoryDraft}
              onChange={setCategoryDraft}
            />
          )}

          {onConvertToMiniGame && (
            <div className="field">
              <label className="label" htmlFor="clue-card-type">Card type</label>
              <select
                id="clue-card-type"
                className="select"
                value="clue"
                onChange={async (e) => {
                  if (e.target.value === 'miniGame') {
                    const hasContent = draft.clue.trim() || draft.answer.trim();
                    if (hasContent) {
                      const ok = await confirmDialog({
                        title: 'Convert to Mini Game?',
                        description: 'Existing clue text will be hidden but not deleted.',
                        confirmLabel: 'Convert',
                      });
                      if (!ok) {
                        e.target.value = 'clue';
                        return;
                      }
                    }
                    onConvertToMiniGame();
                  }
                }}
              >
                <option value="clue">Standard Clue</option>
                <option value="miniGame">Mini Game</option>
              </select>
            </div>
          )}

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

          <AnswerMediaEditor
            value={draft.answerMedia}
            onChange={(answerMedia) => update('answerMedia', answerMedia)}
          />

          {!isFinal && (
          <div className="field">
            <label className="label" htmlFor="clue-value">
              Point Value
            </label>
            <PointValueInput
              id="clue-value"
              value={draft.value}
              onChange={(value) => update('value', value)}
            />
          </div>
          )}

          {!isFinal && (
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
          )}

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

          <AttachmentEditor
            attachments={draft.attachments ?? []}
            displayMode={draft.attachmentDisplayMode ?? DEFAULT_ATTACHMENT_DISPLAY_MODE}
            attachmentAutoplay={draft.attachmentAutoplay ?? false}
            onChange={handleAttachmentsChange}
            onAttachmentAutoplayChange={(attachmentAutoplay) => update('attachmentAutoplay', attachmentAutoplay)}
          />
          <p className="field-hint media-storage-hint">
            Uploads are saved in this browser. Use ZIP export to move boards with media to another computer.
          </p>
        </div>

        <div className="modal-footer">
          {onReset && canResetTile(draft) && (
            <button type="button" className="btn btn-danger modal-footer-start" onClick={onReset}>
              Reset Tile
            </button>
          )}
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
          {!isFinal && (
          <button type="button" className="btn" onClick={() => onSaveAndNext(prepareClueForSave(draft))}>
            Save &amp; Next
          </button>
          )}
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => saveDraft(draft)}
          >
            {isFinal ? 'Save Final Jeopardy' : 'Save Clue'}
          </button>
        </div>
      </div>
    </div>
  );
}
