import { useRef, useState } from 'react';

import { ChevronDown, ChevronUp, Link2, Plus, Trash2, Upload } from 'lucide-react';

import type { AttachmentDisplayMode, TileAttachment, TileAttachmentType } from '../../types/board';

import { createId } from '../../lib/ids';

import { deleteMediaIfUnreferenced, isMediaStorageAvailable, saveMediaFile } from '../../lib/mediaStorage';

import {

  inferMediaTypeFromFilename,

  inferMediaTypeFromMime,

  validateMediaFile,

} from '../../lib/mediaUtils';

import { normalizeAttachment, reorderAttachments, isMediaAttachmentType } from '../../lib/attachments';

import { confirmDialog } from '../../lib/dialog';

import { TileAttachmentView } from '../clue/TileAttachmentView';

import './AttachmentEditor.css';



function isFileDragEvent(event: React.DragEvent): boolean {

  return Array.from(event.dataTransfer.types).includes('Files');

}



async function attachmentFromFile(

  file: File,

): Promise<{ attachment: TileAttachment } | { error: string }> {

  if (!isMediaStorageAvailable()) {

    return { error: 'Upload not available in this browser.' };

  }



  const validationError = validateMediaFile(file);

  if (validationError) {

    return { error: `${file.name}: ${validationError}` };

  }



  const inferred =

    inferMediaTypeFromMime(file.type) ?? inferMediaTypeFromFilename(file.name) ?? 'image';

  const record = await saveMediaFile(file);



  return {

    attachment: {

      id: createId(),

      type: inferred,

      title: '',

      url: '',

      storage: 'local',

      mediaId: record.id,

      mimeType: record.mimeType,

    },

  };

}



const ATTACHMENT_TYPES: { value: TileAttachmentType; label: string }[] = [

  { value: 'image', label: 'Image' },

  { value: 'audio', label: 'Audio' },

  { value: 'video', label: 'Video' },

  { value: 'link', label: 'Link' },

  { value: 'text', label: 'Text' },

  { value: 'file', label: 'File' },

];



const MEDIA_ACCEPT: Record<'image' | 'audio' | 'video', string> = {

  image: 'image/*',

  audio: 'audio/*',

  video: 'video/*',

};



interface AttachmentEditorProps {

  attachments: TileAttachment[];

  displayMode: AttachmentDisplayMode;

  onChange: (attachments: TileAttachment[], displayMode: AttachmentDisplayMode) => void;

}



export function AttachmentEditor({ attachments, displayMode, onChange }: AttachmentEditorProps) {

  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});

  const [dragOver, setDragOver] = useState(false);

  const [dropError, setDropError] = useState<string | null>(null);

  const [importingDrop, setImportingDrop] = useState(false);

  const [urlExpanded, setUrlExpanded] = useState<Record<string, boolean>>({});

  const dragDepthRef = useRef(0);



  const updateAttachment = (id: string, partial: Partial<TileAttachment>) => {

    onChange(

      attachments.map((a) => (a.id === id ? { ...a, ...partial } : a)),

      displayMode,

    );

  };



  const addAttachment = (type: TileAttachmentType = 'image') => {

    const att: TileAttachment = {

      id: createId(),

      type,

      title: isMediaAttachmentType(type) ? '' : 'New attachment',

      url: '',

      storage: 'url',

    };

    onChange([...attachments, att], displayMode);

  };



  const removeAttachment = async (id: string) => {

    const att = attachments.find((a) => a.id === id);

    if (!att) return;

    const ok = await confirmDialog({

      title: 'Remove attachment?',

      description: att.title.trim()

        ? `Remove "${att.title}" from this tile?`

        : `Remove this ${att.type} attachment from this tile?`,

      confirmLabel: 'Remove',

      variant: 'destructive',

      closeOnBackdrop: false,

    });

    if (!ok) return;

    if (att.storage === 'local' && att.mediaId) {

      await deleteMediaIfUnreferenced(att.mediaId);

    }

    onChange(attachments.filter((a) => a.id !== id), displayMode);

  };



  const moveAttachment = (index: number, direction: -1 | 1) => {

    const target = index + direction;

    if (target < 0 || target >= attachments.length) return;

    onChange(reorderAttachments(attachments, index, target), displayMode);

  };



  const handleUpload = async (id: string, file: File) => {

    setUploadErrors((prev) => ({ ...prev, [id]: '' }));

    if (!isMediaStorageAvailable()) {

      setUploadErrors((prev) => ({ ...prev, [id]: 'Upload not available in this browser.' }));

      return;

    }

    const att = attachments.find((a) => a.id === id);

    const expectedType = att?.type === 'file' ? undefined : (att?.type as 'image' | 'audio' | 'video' | undefined);

    const validationError = validateMediaFile(file, expectedType);

    if (validationError) {

      setUploadErrors((prev) => ({ ...prev, [id]: validationError }));

      return;

    }

    const inferred =

      inferMediaTypeFromMime(file.type) ?? inferMediaTypeFromFilename(file.name) ?? 'image';

    const previous = att;

    const record = await saveMediaFile(file);

    updateAttachment(id, {

      storage: 'local',

      mediaId: record.id,

      mimeType: record.mimeType,

      url: '',

      type: att?.type === 'file' ? inferred : att?.type ?? inferred,

    });

    setUrlExpanded((prev) => ({ ...prev, [id]: false }));

    if (previous?.storage === 'local' && previous.mediaId && previous.mediaId !== record.id) {

      await deleteMediaIfUnreferenced(previous.mediaId);

    }

  };



  const handleDroppedFiles = async (files: FileList | File[]) => {

    const fileArray = Array.from(files);

    if (fileArray.length === 0) return;



    setDropError(null);

    setImportingDrop(true);



    const added: TileAttachment[] = [];

    const errors: string[] = [];



    for (const file of fileArray) {

      const result = await attachmentFromFile(file);

      if ('error' in result) {

        errors.push(result.error);

      } else {

        added.push(result.attachment);

      }

    }



    if (added.length > 0) {

      onChange([...attachments, ...added], displayMode);

    }

    if (errors.length > 0) {

      setDropError(errors.join(' '));

    }



    setImportingDrop(false);

  };



  const switchToUrl = (id: string) => {

    const att = attachments.find((a) => a.id === id);

    if (att?.storage === 'local' && att.mediaId) {

      void deleteMediaIfUnreferenced(att.mediaId);

    }

    updateAttachment(id, { storage: 'url', mediaId: undefined, url: '' });

    setUrlExpanded((prev) => ({ ...prev, [id]: true }));

  };



  return (

    <section className="attachment-editor">

      <div className="attachment-editor-header">

        <h3>Attachments</h3>

        <button type="button" className="btn btn-sm" onClick={() => addAttachment()}>

          <Plus size={14} aria-hidden="true" /> Add

        </button>

      </div>



      <div className="attachment-display-mode">

        <span className="attachment-display-mode-label">Display</span>

        <label className="radio-label">

          <input

            type="radio"

            name="attachment-display-mode"

            checked={displayMode === 'all-at-once'}

            onChange={() => onChange(attachments, 'all-at-once')}

          />

          All at once

        </label>

        <label className="radio-label">

          <input

            type="radio"

            name="attachment-display-mode"

            checked={displayMode === 'progressive'}

            onChange={() => onChange(attachments, 'progressive')}

          />

          One by one

        </label>

      </div>



      <div

        className={`attachment-drop-zone${dragOver ? ' attachment-drop-zone-active' : ''}${importingDrop ? ' attachment-drop-zone-busy' : ''}${attachments.length > 0 ? ' attachment-drop-zone-compact' : ''}`}

        onDragEnter={(event) => {

          if (!isFileDragEvent(event)) return;

          event.preventDefault();

          event.stopPropagation();

          dragDepthRef.current += 1;

          setDragOver(true);

        }}

        onDragLeave={(event) => {

          if (!isFileDragEvent(event)) return;

          event.preventDefault();

          event.stopPropagation();

          dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);

          if (dragDepthRef.current === 0) setDragOver(false);

        }}

        onDragOver={(event) => {

          if (!isFileDragEvent(event)) return;

          event.preventDefault();

          event.stopPropagation();

          event.dataTransfer.dropEffect = 'copy';

        }}

        onDrop={(event) => {

          if (!isFileDragEvent(event)) return;

          event.preventDefault();

          event.stopPropagation();

          dragDepthRef.current = 0;

          setDragOver(false);

          void handleDroppedFiles(event.dataTransfer.files);

        }}

      >

        {attachments.length === 0 && (

          <p className="attachment-empty">

            {importingDrop ? 'Adding attachments…' : 'Drop images, audio, or video here'}

          </p>

        )}



        {dropError && (

          <p className="field-error attachment-drop-error" role="alert">

            {dropError}

          </p>

        )}



        <ul className="attachment-list">

          {attachments.map((att, index) => {

            const normalized = normalizeAttachment(att);

            const uploaded = att.storage === 'local' && Boolean(att.mediaId);

            const isMedia = isMediaAttachmentType(att.type);

            const showUrl = !uploaded && (urlExpanded[att.id] || Boolean(att.url.trim()));



            return (

              <li key={att.id} className="attachment-item">

                <div className="attachment-item-header">

                  <span className="attachment-index">#{index + 1}</span>

                  <select

                    className="select attachment-type-select"

                    aria-label="Attachment type"

                    value={att.type}

                    onChange={(e) => {

                      const type = e.target.value as TileAttachmentType;

                      updateAttachment(att.id, {

                        type,

                        ...(isMediaAttachmentType(type) ? { title: '' } : {}),

                      });

                    }}

                  >

                    {ATTACHMENT_TYPES.map((t) => (

                      <option key={t.value} value={t.value}>

                        {t.label}

                      </option>

                    ))}

                  </select>

                  <div className="attachment-item-actions">

                    <button

                      type="button"

                      className="btn btn-ghost btn-icon btn-icon-sm"

                      aria-label="Move up"

                      disabled={index === 0}

                      onClick={() => moveAttachment(index, -1)}

                    >

                      <ChevronUp size={15} />

                    </button>

                    <button

                      type="button"

                      className="btn btn-ghost btn-icon btn-icon-sm"

                      aria-label="Move down"

                      disabled={index === attachments.length - 1}

                      onClick={() => moveAttachment(index, 1)}

                    >

                      <ChevronDown size={15} />

                    </button>

                    <button

                      type="button"

                      className="btn btn-ghost btn-icon btn-icon-sm btn-danger-ghost"

                      aria-label="Remove attachment"

                      onClick={() => void removeAttachment(att.id)}

                    >

                      <Trash2 size={15} />

                    </button>

                  </div>

                </div>



                {isMedia && normalized && (

                  <TileAttachmentView attachment={normalized} className="attachment-editor-preview" />

                )}



                {att.type === 'text' ? (

                  <div className="attachment-fields">

                    {!isMedia && (

                      <input

                        type="text"

                        className="input input-sm"

                        placeholder="Title"

                        value={att.title}

                        onChange={(e) => updateAttachment(att.id, { title: e.target.value })}

                      />

                    )}

                    <textarea

                      className="input"

                      rows={2}

                      placeholder="Text content"

                      value={att.textContent ?? ''}

                      onChange={(e) => updateAttachment(att.id, { textContent: e.target.value })}

                    />

                  </div>

                ) : att.type === 'link' || att.type === 'file' ? (

                  <div className="attachment-fields">

                    <input

                      type="text"

                      className="input input-sm"

                      placeholder="Title"

                      value={att.title}

                      onChange={(e) => updateAttachment(att.id, { title: e.target.value })}

                    />

                    <input

                      type="url"

                      className="input input-sm"

                      placeholder="URL"

                      value={att.url}

                      onChange={(e) =>

                        updateAttachment(att.id, { url: e.target.value, storage: 'url', mediaId: undefined })

                      }

                    />

                  </div>

                ) : isMedia ? (

                  <div className="attachment-media-footer">

                    <input

                      ref={(el) => {

                        fileRefs.current[att.id] = el;

                      }}

                      type="file"

                      className="sr-only"

                      accept={MEDIA_ACCEPT[att.type as 'image' | 'audio' | 'video']}

                      onChange={(e) => {

                        const file = e.target.files?.[0];

                        if (file) void handleUpload(att.id, file);

                        e.target.value = '';

                      }}

                    />

                    <button

                      type="button"

                      className="btn btn-sm"

                      onClick={() => fileRefs.current[att.id]?.click()}

                    >

                      <Upload size={14} aria-hidden="true" />

                      {uploaded ? 'Replace' : 'Upload'}

                    </button>

                    {!showUrl && (

                      <button

                        type="button"

                        className="btn btn-ghost btn-sm attachment-url-toggle"

                        onClick={() => (uploaded ? switchToUrl(att.id) : setUrlExpanded((p) => ({ ...p, [att.id]: true })))}

                      >

                        <Link2 size={14} aria-hidden="true" />

                        URL

                      </button>

                    )}

                    {showUrl && (

                      <input

                        type="url"

                        className="input input-sm attachment-url-input"

                        placeholder="Paste media URL"

                        value={att.url}

                        onChange={(e) =>

                          updateAttachment(att.id, {

                            url: e.target.value,

                            storage: 'url',

                            mediaId: undefined,

                          })

                        }

                      />

                    )}

                    {uploadErrors[att.id] && (

                      <p className="field-error" role="alert">

                        {uploadErrors[att.id]}

                      </p>

                    )}

                  </div>

                ) : null}



                {att.type === 'image' && (

                  <details className="attachment-alt-details">

                    <summary>Alt text</summary>

                    <input

                      type="text"

                      className="input input-sm"

                      value={att.alt ?? ''}

                      onChange={(e) => updateAttachment(att.id, { alt: e.target.value })}

                      placeholder="Describe the image for accessibility"

                    />

                  </details>

                )}

              </li>

            );

          })}

        </ul>

      </div>



      <p className="field-hint attachment-editor-footnote">

        Uploads stay in this browser. Export ZIP to move boards with media.

      </p>

    </section>

  );

}


