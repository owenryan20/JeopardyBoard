import { Upload, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { Clue, Media, MediaType } from '../../types/board';
import { DEFAULT_POINT_VALUES } from '../../types/board';
import { hasTileContent } from '../../lib/boardFactory';
import { ClueMedia } from '../clue/ClueMedia';
import { deleteMediaIfUnreferenced, isMediaStorageAvailable, saveMediaFile } from '../../lib/mediaStorage';
import {
  hasClueMedia,
  inferMediaTypeFromFilename,
  inferMediaTypeFromMime,
  isLocalMedia,
  normalizeMedia,
  mediaForSave,
  validateMediaFile,
} from '../../lib/mediaUtils';
import './ClueEditor.css';

interface ClueEditorProps {
  categoryName: string;
  clue: Clue;
  onSave: (clue: Clue) => void;
  onCancel: () => void;
  onSaveAndNext: (clue: Clue) => void;
  onConvertToMiniGame?: () => void;
  onReset?: () => void;
}

export function ClueEditor({
  categoryName,
  clue,
  onSave,
  onCancel,
  onSaveAndNext,
  onConvertToMiniGame,
  onReset,
}: ClueEditorProps) {
  const [draft, setDraft] = useState(clue);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(clue);
    setUploadError(null);
  }, [clue]);

  const update = <K extends keyof Clue>(key: K, value: Clue[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const updateMedia = (partial: Partial<Media>) => {
    setDraft((prev) => ({
      ...prev,
      media: {
        type: prev.media?.type ?? 'image',
        storage: prev.media?.storage,
        url: prev.media?.url ?? '',
        filename: prev.media?.filename,
        altText: prev.media?.altText,
        mediaId: prev.media?.mediaId,
        mimeType: prev.media?.mimeType,
        ...partial,
      },
    }));
  };

  const clearMedia = async () => {
    const previous = draft.media;
    setDraft((prev) => ({ ...prev, media: undefined }));
    setUploadError(null);
    if (previous && isLocalMedia(previous) && previous.mediaId) {
      await deleteMediaIfUnreferenced(previous.mediaId);
    }
  };

  const handleUrlChange = (url: string) => {
    setUploadError(null);
    if (!url.trim()) {
      void clearMedia();
      return;
    }
    updateMedia({
      storage: 'url',
      url: url.trim(),
      mediaId: undefined,
      mimeType: undefined,
    });
  };

  const handleUpload = async (file: File) => {
    setUploadError(null);
    if (!isMediaStorageAvailable()) {
      setUploadError('File upload is not available in this browser.');
      return;
    }

    const expectedType = draft.media?.type ?? 'image';
    const validationError = validateMediaFile(file, expectedType);
    if (validationError) {
      setUploadError(validationError);
      return;
    }

    const inferredType =
      inferMediaTypeFromMime(file.type) ?? inferMediaTypeFromFilename(file.name) ?? expectedType;

    setUploading(true);
    try {
      const previous = draft.media;
      const record = await saveMediaFile(file);
      setDraft((prev) => ({
        ...prev,
        media: normalizeMedia({
          storage: 'local',
          type: inferredType,
          mediaId: record.id,
          mimeType: record.mimeType,
          filename: record.filename,
          altText: prev.media?.altText,
          url: '',
        }),
      }));

      if (previous && isLocalMedia(previous) && previous.mediaId && previous.mediaId !== record.id) {
        await deleteMediaIfUnreferenced(previous.mediaId);
      }
    } catch {
      setUploadError('Could not save the uploaded file in this browser.');
    } finally {
      setUploading(false);
    }
  };

  const saveDraft = (next: Clue) => {
    onSave({
      ...next,
      media: mediaForSave(next.media),
    });
  };

  const resolvedMedia = normalizeMedia(draft.media);

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
          {onConvertToMiniGame && (
            <div className="field">
              <label className="label" htmlFor="clue-card-type">Card type</label>
              <select
                id="clue-card-type"
                className="select"
                value="clue"
                onChange={(e) => {
                  if (e.target.value === 'miniGame') {
                    const hasContent = draft.clue.trim() || draft.answer.trim();
                    if (hasContent && !window.confirm('Convert this tile to a Mini Game? Existing clue text will be hidden but not deleted.')) {
                      e.target.value = 'clue';
                      return;
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
            <p className="field-hint media-storage-hint">
              Uploads are saved in this browser on the host device. Use ZIP export to move boards with media to another computer.
            </p>
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
              <label className="label" htmlFor="media-upload">
                Upload file
              </label>
              <input
                ref={fileRef}
                id="media-upload"
                type="file"
                className="sr-only"
                accept="image/*,audio/*,video/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleUpload(file);
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                className="btn btn-sm"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                <Upload size={14} aria-hidden="true" />
                {uploading ? 'Uploading…' : 'Choose file'}
              </button>
              {isLocalMedia(draft.media) && draft.media?.filename && (
                <p className="field-hint">Stored locally: {draft.media.filename}</p>
              )}
            </div>

            <div className="field">
              <label className="label" htmlFor="media-url">
                Or paste URL
              </label>
              <input
                id="media-url"
                className="input"
                placeholder="https://..."
                value={draft.media?.storage === 'url' ? (draft.media.url ?? '') : ''}
                onChange={(e) => handleUrlChange(e.target.value)}
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

            {uploadError && (
              <p role="alert" className="import-error">
                {uploadError}
              </p>
            )}

            {resolvedMedia && hasClueMedia(resolvedMedia) && (
              <div className="media-preview">
                <ClueMedia media={resolvedMedia} className="clue-editor-media-preview" />
              </div>
            )}

            {resolvedMedia && hasClueMedia(resolvedMedia) && (
              <button type="button" className="btn btn-sm btn-danger" onClick={() => void clearMedia()}>
                Remove media
              </button>
            )}
          </fieldset>
        </div>

        <div className="modal-footer">
          {onReset && hasTileContent(draft) && (
            <button type="button" className="btn btn-danger modal-footer-start" onClick={onReset}>
              Reset Tile
            </button>
          )}
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn" onClick={() => onSaveAndNext({ ...draft, media: mediaForSave(draft.media) })}>
            Save &amp; Next
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => saveDraft(draft)}
          >
            Save Clue
          </button>
        </div>
      </div>
    </div>
  );
}
