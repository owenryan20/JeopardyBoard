import { useRef, useState } from 'react';
import { Link2, Trash2, Upload } from 'lucide-react';
import type { Media } from '../../types/board';
import { deleteMediaIfUnreferenced, isMediaStorageAvailable, saveMediaFile } from '../../lib/mediaStorage';
import {
  inferMediaTypeFromFilename,
  inferMediaTypeFromMime,
  validateMediaFile,
} from '../../lib/mediaUtils';
import './AnswerMediaEditor.css';

type AnswerMediaKind = 'none' | 'image' | 'video';

const MEDIA_ACCEPT: Record<'image' | 'video', string> = {
  image: 'image/*',
  video: 'video/*',
};

function kindFromMedia(media?: Media): AnswerMediaKind {
  if (!media) return 'none';
  if (media.type === 'video') return 'video';
  if (media.type === 'image') return 'image';
  return 'none';
}

interface AnswerMediaEditorProps {
  value?: Media;
  onChange: (media: Media | undefined) => void;
}

export function AnswerMediaEditor({ value, onChange }: AnswerMediaEditorProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [urlExpanded, setUrlExpanded] = useState(Boolean(value?.url?.trim() && value.storage !== 'local'));

  const kind = kindFromMedia(value);
  const uploaded = value?.storage === 'local' && Boolean(value.mediaId);

  const setKind = (next: AnswerMediaKind) => {
    setUploadError(null);
    if (next === 'none') {
      onChange(undefined);
      setUrlExpanded(false);
      return;
    }
    if (kind === next && value) return;
    onChange({ type: next, url: '', storage: 'url' });
    setUrlExpanded(false);
  };

  const handleUpload = async (file: File) => {
    setUploadError(null);
    if (!isMediaStorageAvailable()) {
      setUploadError('Upload not available in this browser.');
      return;
    }
    const expectedType = kind === 'video' ? 'video' : 'image';
    const validationError = validateMediaFile(file, expectedType);
    if (validationError) {
      setUploadError(validationError);
      return;
    }
    const inferred =
      inferMediaTypeFromMime(file.type) ?? inferMediaTypeFromFilename(file.name) ?? expectedType;
    if (inferred !== 'image' && inferred !== 'video') {
      setUploadError('Answer media must be an image or video.');
      return;
    }

    setUploading(true);
    try {
      const previousId = value?.storage === 'local' ? value.mediaId : undefined;
      const record = await saveMediaFile(file);
      onChange({
        type: inferred,
        storage: 'local',
        mediaId: record.id,
        mimeType: record.mimeType,
        filename: file.name,
        url: '',
        altText: value?.altText,
      });
      setUrlExpanded(false);
      if (previousId && previousId !== record.id) {
        await deleteMediaIfUnreferenced(previousId);
      }
    } catch {
      setUploadError('Could not save the file. Try again or use a URL instead.');
    } finally {
      setUploading(false);
    }
  };

  const switchToUrl = () => {
    if (value?.storage === 'local' && value.mediaId) {
      void deleteMediaIfUnreferenced(value.mediaId);
    }
    onChange({
      type: kind === 'video' ? 'video' : 'image',
      url: '',
      storage: 'url',
    });
    setUrlExpanded(true);
  };

  return (
    <fieldset className="answer-media-editor">
      <legend className="label">Answer media</legend>
      <p className="field-hint">Optional image or video shown when you click Show Answer in game.</p>

      <div className="answer-media-type-tabs">
        {(['none', 'image', 'video'] as const).map((t) => (
          <button
            key={t}
            type="button"
            className={`btn btn-sm${kind === t ? ' btn-primary' : ''}`}
            onClick={() => setKind(t)}
          >
            {t === 'none' ? 'None' : t === 'image' ? 'Image' : 'Video'}
          </button>
        ))}
      </div>

      {kind !== 'none' && (
        <div className="answer-media-fields">
          <input
            ref={fileRef}
            type="file"
            className="sr-only"
            accept={MEDIA_ACCEPT[kind]}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleUpload(file);
              e.target.value = '';
            }}
          />
          <div className="answer-media-actions">
            <button
              type="button"
              className="btn btn-sm"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              <Upload size={14} aria-hidden="true" />
              {uploading ? 'Uploading…' : uploaded ? 'Replace' : 'Upload'}
            </button>
            {!urlExpanded && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={switchToUrl}>
                <Link2 size={14} aria-hidden="true" />
                URL
              </button>
            )}
            <button
              type="button"
              className="btn btn-ghost btn-sm btn-danger-ghost"
              onClick={() => setKind('none')}
            >
              <Trash2 size={14} aria-hidden="true" />
              Remove
            </button>
          </div>

          {urlExpanded && (
            <input
              type="url"
              className="input input-sm"
              placeholder={`Paste ${kind} URL`}
              value={value?.storage === 'local' ? '' : (value?.url ?? '')}
              disabled={uploaded}
              onChange={(e) =>
                onChange({
                  type: kind,
                  url: e.target.value,
                  storage: 'url',
                  mediaId: undefined,
                  altText: value?.altText,
                })
              }
            />
          )}

          {uploaded && !urlExpanded && (
            <p className="field-hint">File saved in this browser.</p>
          )}

          {kind === 'image' && (
            <input
              type="text"
              className="input input-sm"
              placeholder="Alt text (optional)"
              value={value?.altText ?? ''}
              onChange={(e) =>
                onChange({
                  ...(value ?? { type: 'image', url: '', storage: 'url' }),
                  altText: e.target.value,
                } as Media)
              }
            />
          )}

          {uploadError && (
            <p className="field-error" role="alert">
              {uploadError}
            </p>
          )}
        </div>
      )}
    </fieldset>
  );
}
