import { useEffect, useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import type { Board, Clue, CropAnchor, CropRevealMiniGameConfig } from '../../types/board';
import { PointValueInput } from '../editor/PointValueInput';
import { canResetTile } from '../../lib/boardFactory';
import {
  createDefaultCropRevealConfig,
  validateCropRevealConfig,
} from '../../lib/cropReveal';
import { deleteMediaIfUnreferenced, isMediaStorageAvailable, saveMediaFile } from '../../lib/mediaStorage';
import { validateMediaFile } from '../../lib/mediaUtils';
import { normalizeAttachment } from '../../lib/attachments';
import { FinalJeopardyCategoryField } from '../editor/FinalJeopardyCategoryField';
import { CropRevealViewport } from './CropRevealViewport';
import './CropRevealEditor.css';

const ANCHORS: { value: CropAnchor; label: string }[] = [
  { value: 'center', label: 'Center' },
  { value: 'top-left', label: 'Top left' },
  { value: 'top', label: 'Top' },
  { value: 'top-right', label: 'Top right' },
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
  { value: 'bottom-left', label: 'Bottom left' },
  { value: 'bottom', label: 'Bottom' },
  { value: 'bottom-right', label: 'Bottom right' },
  { value: 'custom', label: 'Custom position' },
];

interface CropRevealEditorProps {
  board: Board;
  categoryName: string;
  clue: Clue;
  variant?: 'board' | 'final';
  finalCategory?: string;
  onFinalCategoryChange?: (category: string) => void;
  onSave: (clue: Clue) => void;
  onCancel: () => void;
  onReset?: () => void;
}

export function CropRevealEditor({
  categoryName,
  clue,
  variant = 'board',
  finalCategory = '',
  onFinalCategoryChange,
  onSave,
  onCancel,
  onReset,
}: CropRevealEditorProps) {
  const isFinal = variant === 'final';
  const [draft, setDraft] = useState(clue);
  const [categoryDraft, setCategoryDraft] = useState(finalCategory);
  const [errors, setErrors] = useState<string[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const config: CropRevealMiniGameConfig =
    draft.miniGame?.gameType === 'cropReveal'
      ? draft.miniGame
      : createDefaultCropRevealConfig(draft.value);

  useEffect(() => {
    setDraft(clue);
    setErrors([]);
  }, [clue]);

  useEffect(() => {
    setCategoryDraft(finalCategory);
  }, [finalCategory, clue.id]);

  const updateConfig = (partial: Partial<CropRevealMiniGameConfig>) => {
    setDraft((prev) => ({
      ...prev,
      miniGame: { ...config, ...partial, gameType: 'cropReveal' as const },
      value: partial.pointValue ?? prev.value,
    }));
  };

  const handleUpload = async (file: File) => {
    setUploadError(null);
    if (!isMediaStorageAvailable()) {
      setUploadError('Upload not available in this browser.');
      return;
    }
    const validationError = validateMediaFile(file, 'image');
    if (validationError) {
      setUploadError(validationError);
      return;
    }
    const previous = config.image;
    const record = await saveMediaFile(file);
    updateConfig({
      image: {
        id: config.image.id,
        type: 'image',
        title: config.image.title || file.name,
        url: '',
        storage: 'local',
        mediaId: record.id,
        mimeType: record.mimeType,
      },
    });
    if (previous.storage === 'local' && previous.mediaId && previous.mediaId !== record.id) {
      await deleteMediaIfUnreferenced(previous.mediaId);
    }
  };

  const save = () => {
    const cfg = draft.miniGame?.gameType === 'cropReveal' ? draft.miniGame : config;
    const validationErrors = validateCropRevealConfig(cfg);
    setErrors(validationErrors);
    if (validationErrors.length > 0) return;
    if (isFinal) {
      onFinalCategoryChange?.(categoryDraft.trim());
    }
    onSave({
      ...draft,
      type: 'miniGame',
      miniGame: cfg,
      value: isFinal ? 0 : draft.value,
    });
  };

  const previewImage = normalizeAttachment(config.image);

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="crop-reveal-editor-title">
      <div className="modal crop-reveal-editor">
        <div className="modal-header">
          <h2 id="crop-reveal-editor-title">Crop Reveal — {categoryName}</h2>
          <button type="button" className="btn btn-ghost btn-icon" aria-label="Close" onClick={onCancel}>
            ×
          </button>
        </div>
        <div className="modal-body crop-reveal-editor-body">
          {isFinal && (
            <FinalJeopardyCategoryField
              id="cr-editor-fj-category"
              value={categoryDraft}
              onChange={setCategoryDraft}
            />
          )}

          <p className="field-hint">
            Crop Reveal starts with a small part of the image and expands after each hint or wrong guess.
          </p>

          {errors.length > 0 && (
            <ul className="validation-errors" role="alert">
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}

          <div className="field">
            <label className="label" htmlFor="cr-title">Title</label>
            <input
              id="cr-title"
              className="input"
              value={config.title}
              onChange={(e) => updateConfig({ title: e.target.value })}
            />
          </div>

          {!isFinal && (
            <div className="field">
              <label className="label" htmlFor="cr-value">Point value</label>
              <PointValueInput
                id="cr-value"
                value={config.pointValue}
                onChange={(value) => updateConfig({ pointValue: value })}
              />
            </div>
          )}

          <fieldset className="field">
            <legend className="label">Image</legend>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleUpload(file);
                e.target.value = '';
              }}
            />
            <button type="button" className="btn btn-sm" onClick={() => fileRef.current?.click()}>
              <Upload size={14} aria-hidden="true" /> Upload image
            </button>
            <label className="label" htmlFor="cr-image-url">Or image URL</label>
            <input
              id="cr-image-url"
              className="input"
              value={config.image.storage === 'local' ? '' : config.image.url}
              disabled={config.image.storage === 'local'}
              onChange={(e) =>
                updateConfig({
                  image: {
                    ...config.image,
                    url: e.target.value,
                    storage: 'url',
                    mediaId: undefined,
                  },
                })
              }
            />
            {uploadError && <p className="field-error" role="alert">{uploadError}</p>}
            {previewImage && (
              <>
                <CropRevealViewport
                  attachment={previewImage}
                  revealPercent={config.startingCropPercent}
                  anchor={config.anchor}
                  customAnchorX={config.customAnchorX}
                  customAnchorY={config.customAnchorY}
                  interactive
                  mediaClassName="crop-reveal-preview-media"
                  className="crop-reveal-preview-wrap"
                  onAnchorChange={(x, y) =>
                    updateConfig({ anchor: 'custom', customAnchorX: x, customAnchorY: y })
                  }
                />
                <p className="field-hint crop-reveal-drag-hint">
                  Click and drag the preview to set where the crop starts.
                </p>
              </>
            )}
          </fieldset>

          <div className="field">
            <label className="label" htmlFor="cr-answer">Correct answer</label>
            <input
              id="cr-answer"
              className="input"
              value={config.correctAnswer}
              onChange={(e) => updateConfig({ correctAnswer: e.target.value })}
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="cr-aliases">Accepted answers (comma-separated)</label>
            <input
              id="cr-aliases"
              className="input"
              value={config.acceptedAnswers.join(', ')}
              onChange={(e) =>
                updateConfig({
                  acceptedAnswers: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                })
              }
            />
          </div>

          <div className="field-row">
            <div className="field">
              <label className="label" htmlFor="cr-start">Starting crop (%)</label>
              <input
                id="cr-start"
                type="number"
                className="input"
                min={5}
                max={100}
                value={config.startingCropPercent}
                onChange={(e) => updateConfig({ startingCropPercent: Number(e.target.value) })}
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="cr-expand">Expand by (%)</label>
              <input
                id="cr-expand"
                type="number"
                className="input"
                min={5}
                max={50}
                value={config.expandPercentPerReveal}
                onChange={(e) => updateConfig({ expandPercentPerReveal: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="field">
            <label className="label" htmlFor="cr-anchor">Start from</label>
            <select
              id="cr-anchor"
              className="select"
              value={config.anchor}
              onChange={(e) => updateConfig({ anchor: e.target.value as CropAnchor })}
            >
              {ANCHORS.map((a) => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </div>

          {config.anchor === 'custom' && (
            <div className="field-row">
              <div className="field">
                <label className="label" htmlFor="cr-x">X (%)</label>
                <input
                  id="cr-x"
                  type="number"
                  className="input"
                  min={0}
                  max={100}
                  value={config.customAnchorX ?? 50}
                  onChange={(e) => updateConfig({ customAnchorX: Number(e.target.value) })}
                />
              </div>
              <div className="field">
                <label className="label" htmlFor="cr-y">Y (%)</label>
                <input
                  id="cr-y"
                  type="number"
                  className="input"
                  min={0}
                  max={100}
                  value={config.customAnchorY ?? 50}
                  onChange={(e) => updateConfig({ customAnchorY: Number(e.target.value) })}
                />
              </div>
            </div>
          )}

          <div className="field">
            <label className="label" htmlFor="cr-max">Max attempts (optional)</label>
            <input
              id="cr-max"
              type="number"
              className="input"
              min={1}
              placeholder="No limit"
              value={config.maxAttempts ?? ''}
              onChange={(e) =>
                updateConfig({
                  maxAttempts: e.target.value ? Number(e.target.value) : undefined,
                })
              }
            />
          </div>

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={config.autoExpandOnWrongGuess}
              onChange={(e) => updateConfig({ autoExpandOnWrongGuess: e.target.checked })}
            />
            Auto-expand after wrong answer
          </label>

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={config.showFullImageOnComplete}
              onChange={(e) => updateConfig({ showFullImageOnComplete: e.target.checked })}
            />
            Show full image on completion
          </label>

          <div className="field">
            <label className="label" htmlFor="cr-notes">Host notes</label>
            <textarea
              id="cr-notes"
              className="textarea"
              rows={2}
              value={config.hostNotes}
              onChange={(e) => updateConfig({ hostNotes: e.target.value })}
            />
          </div>
        </div>
        <div className="modal-footer">
          {onReset && canResetTile(draft) && (
            <button type="button" className="btn btn-danger modal-footer-start" onClick={onReset}>
              Reset Tile
            </button>
          )}
          <button type="button" className="btn" onClick={onCancel}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={save}>
            Save Crop Reveal
          </button>
        </div>
      </div>
    </div>
  );
}
