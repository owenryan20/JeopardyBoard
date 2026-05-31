import { useEffect, useState, type CSSProperties } from 'react';
import type { Board, BoardBackground, BoardColorTheme, BoardPreviewImage, BoardTheme, Category } from '../../types/board';
import {
  createDefaultBoardTheme,
  DEFAULT_BOARD_COLORS,
  DEFAULT_SOLID_BACKGROUND_COLOR,
  migrateBoardTheme,
} from '../../lib/boardTheme';
import { getMediaBlob, isMediaStorageAvailable, saveMediaFile } from '../../lib/mediaStorage';
import { backgroundToCss } from '../../lib/boardTheme';
import { validateMediaFile } from '../../lib/mediaUtils';
import { clonePresetTheme, type BoardThemePreset } from '../../lib/themePresets';
import { ThemePresetPicker } from './ThemePresetPicker';
import { BoardCardPreview } from '../dashboard/BoardCardPreview';
import './BoardAppearanceEditor.css';

type BoardUpdater = Board | ((board: Board) => Board);

type ImageBoardBackground = Extract<BoardBackground, { type: 'image' }>;

function initialStashedImageBackground(board: Board): ImageBoardBackground | null {
  const bg = migrateBoardTheme(board.theme).background;
  return bg.type === 'image' ? { ...bg } : null;
}

function initialStashedSolidColor(board: Board): string {
  const bg = migrateBoardTheme(board.theme).background;
  return bg.type === 'solid' ? bg.color : DEFAULT_SOLID_BACKGROUND_COLOR;
}

interface BoardAppearanceEditorProps {
  board: Board;
  selectedCategory?: Category | null;
  onBoardChange: (update: BoardUpdater) => void;
  onApplyCategoryStyleToAll?: (style: Category['style']) => void;
  /** When true, omits header and redundant mini-previews (for modal layout). */
  embedded?: boolean;
}

export function BoardAppearanceEditor({
  board,
  selectedCategory,
  onBoardChange,
  onApplyCategoryStyleToAll,
  embedded = false,
}: BoardAppearanceEditorProps) {
  const theme = migrateBoardTheme(board.theme);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewUploading, setPreviewUploading] = useState(false);
  const [previewUploadError, setPreviewUploadError] = useState<string | null>(null);
  const [stashedImageBackground, setStashedImageBackground] = useState<ImageBoardBackground | null>(
    () => initialStashedImageBackground(board),
  );
  const [stashedSolidColor, setStashedSolidColor] = useState(() => initialStashedSolidColor(board));

  const patchBoard = (recipe: (current: Board) => Board) => {
    onBoardChange(recipe);
  };

  const updateTheme = (partial: Partial<BoardTheme>) => {
    patchBoard((current) => {
      const currentTheme = migrateBoardTheme(current.theme);
      return {
        ...current,
        theme: {
          ...currentTheme,
          ...partial,
          colors: { ...currentTheme.colors, ...(partial.colors ?? {}) },
          background: partial.background ?? currentTheme.background,
        },
      };
    });
  };

  const updateColors = (key: keyof BoardColorTheme, value: string) => {
    updateTheme({ colors: { ...theme.colors, [key]: value } });
  };

  const updateBackground = (bg: BoardBackground) => {
    if (bg.type === 'image') {
      setStashedImageBackground(bg);
    } else if (bg.type === 'solid') {
      setStashedSolidColor(bg.color);
    }
    updateTheme({ background: bg });
  };

  const switchBackgroundType = (type: 'solid' | 'image') => {
    setUploadError(null);
    const current = migrateBoardTheme(board.theme).background;

    if (type === 'solid') {
      if (current.type === 'image') {
        setStashedImageBackground(current);
      }
      updateBackground({ type: 'solid', color: stashedSolidColor });
      return;
    }

    if (current.type === 'solid') {
      setStashedSolidColor(current.color);
    }
    updateBackground(
      stashedImageBackground ?? {
        type: 'image',
        url: '',
        overlayColor: '#000000',
        overlayOpacity: 0.45,
      },
    );
  };

  const resetTheme = () => {
    patchBoard((current) => ({ ...current, theme: createDefaultBoardTheme() }));
  };

  const applyPreset = (preset: BoardThemePreset) => {
    patchBoard((current) => ({
      ...current,
      theme: clonePresetTheme(preset),
      categories: current.categories.map((c) => {
        const hasHeaderOverride =
          c.style?.headerBackground || c.style?.headerTextColor || c.style?.headerBackgroundImage;
        if (!hasHeaderOverride) return c;
        return {
          ...c,
          style: {
            ...c.style,
            headerBackground: undefined,
            headerTextColor: undefined,
            headerBackgroundImage: undefined,
          },
        };
      }),
    }));
  };

  const catStyle = selectedCategory?.style ?? {};

  const updateCategoryStyle = (partial: NonNullable<Category['style']>) => {
    if (!selectedCategory) return;
    patchBoard((current) => ({
      ...current,
      categories: current.categories.map((c) =>
        c.id === selectedCategory.id
          ? { ...c, style: { ...c.style, ...partial } }
          : c,
      ),
    }));
  };

  const handleImageUpload = async (file: File) => {
    setUploadError(null);
    if (!isMediaStorageAvailable()) {
      setUploadError('File upload is not available in this browser.');
      return;
    }
    const validationError = validateMediaFile(file, 'image');
    if (validationError) {
      setUploadError(validationError);
      return;
    }

    setUploading(true);
    try {
      const record = await saveMediaFile(file);
      patchBoard((current) => {
        const currentTheme = migrateBoardTheme(current.theme);
        const overlay =
          currentTheme.background.type === 'image'
            ? {
                overlayColor: currentTheme.background.overlayColor,
                overlayOpacity: currentTheme.background.overlayOpacity,
              }
            : stashedImageBackground
              ? {
                  overlayColor: stashedImageBackground.overlayColor,
                  overlayOpacity: stashedImageBackground.overlayOpacity,
                }
              : { overlayColor: '#000000', overlayOpacity: 0.45 };

        const nextBackground: ImageBoardBackground = {
          type: 'image',
          url: '',
          storage: 'local',
          mediaId: record.id,
          ...overlay,
        };
        setStashedImageBackground(nextBackground);

        return {
          ...current,
          theme: {
            ...currentTheme,
            background: nextBackground,
          },
        };
      });
    } catch {
      setUploadError('Could not save the image. Try again or use an image URL instead.');
    } finally {
      setUploading(false);
    }
  };

  const updatePreviewImage = (preview: BoardPreviewImage | undefined) => {
    patchBoard((current) => ({ ...current, previewImage: preview }));
  };

  const handlePreviewImageUpload = async (file: File) => {
    setPreviewUploadError(null);
    if (!isMediaStorageAvailable()) {
      setPreviewUploadError('File upload is not available in this browser.');
      return;
    }
    const validationError = validateMediaFile(file, 'image');
    if (validationError) {
      setPreviewUploadError(validationError);
      return;
    }

    setPreviewUploading(true);
    try {
      const record = await saveMediaFile(file);
      updatePreviewImage({
        url: '',
        storage: 'local',
        mediaId: record.id,
      });
    } catch {
      setPreviewUploadError('Could not save the image. Try again or use an image URL instead.');
    } finally {
      setPreviewUploading(false);
    }
  };

  return (
    <div className="board-appearance-editor">
      {!embedded && (
        <>
          <h3>Board Appearance</h3>
          <p className="field-hint">
            Appearance settings are saved with this board and included in backups.
          </p>
        </>
      )}

      <ThemePresetPicker theme={theme} onSelect={applyPreset} />

      <section className="appearance-section">
        <h4>Background</h4>
        <div className="bg-type-tabs">
          {(['solid', 'image'] as const).map((t) => (
            <button
              key={t}
              type="button"
              className={`btn btn-sm${theme.background.type === t ? ' btn-primary' : ''}`}
              onClick={() => switchBackgroundType(t)}
            >
              {t === 'solid' ? 'Solid color' : 'Image'}
            </button>
          ))}
        </div>

        {theme.background.type === 'gradient' && (
          <p className="field-hint">
            This board uses a gradient background. Choose Solid color or Image to update it.
          </p>
        )}

        {theme.background.type === 'solid' && (
          <label className="color-field">
            Color
            <input
              type="color"
              value={theme.background.color}
              onChange={(e) => updateBackground({ type: 'solid', color: e.target.value })}
            />
          </label>
        )}

        {theme.background.type === 'solid' && stashedImageBackground && (
          <p className="field-hint">
            Background image is kept if you switch back to Image. It is removed only when you save with Solid color selected.
          </p>
        )}

        {theme.background.type === 'image' && (
          <>
            <label className="field-label">
              Image URL
              <input
                className="input"
                value={theme.background.storage === 'local' ? '' : theme.background.url}
                disabled={theme.background.storage === 'local'}
                placeholder="https://..."
                onChange={(e) =>
                  updateBackground({
                    type: 'image',
                    url: e.target.value,
                    storage: 'url',
                    mediaId: undefined,
                    overlayColor:
                      theme.background.type === 'image' ? theme.background.overlayColor : '#000000',
                    overlayOpacity:
                      theme.background.type === 'image' ? theme.background.overlayOpacity : 0.45,
                  })
                }
              />
            </label>
            <label className="btn btn-sm appearance-upload-label">
              {uploading ? 'Uploading…' : 'Upload background'}
              <input
                type="file"
                accept="image/*"
                className="appearance-file-input"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleImageUpload(file);
                  e.target.value = '';
                }}
              />
            </label>
            {theme.background.storage === 'local' && theme.background.mediaId && (
              <p className="field-hint appearance-upload-ok">Background image saved in this browser.</p>
            )}
            {uploadError && (
              <p className="field-error" role="alert">
                {uploadError}
              </p>
            )}
          </>
        )}

        {!embedded && <BackgroundPreview background={theme.background} />}
      </section>

      <section className="appearance-section">
        <h4>Board colors</h4>
        <ColorPicker label="Tile background" value={theme.colors.tileBackground} onChange={(v) => updateColors('tileBackground', v)} />
        <ColorPicker label="Tile hover" value={theme.colors.tileBackgroundHover} onChange={(v) => updateColors('tileBackgroundHover', v)} />
        <ColorPicker label="Used tile" value={theme.colors.tileBackgroundUsed} onChange={(v) => updateColors('tileBackgroundUsed', v)} />
        <ColorPicker label="Selected tile" value={theme.colors.tileBackgroundSelected} onChange={(v) => updateColors('tileBackgroundSelected', v)} />
        <ColorPicker label="Tile border" value={theme.colors.tileBorder} onChange={(v) => updateColors('tileBorder', v)} />
        <ColorPicker label="Point value text" value={theme.colors.pointValueText} onChange={(v) => updateColors('pointValueText', v)} />
        <ColorPicker label="Clue text" value={theme.colors.clueText} onChange={(v) => updateColors('clueText', v)} />
        <ColorPicker label="Category header background" value={theme.colors.categoryHeaderBackground} onChange={(v) => updateColors('categoryHeaderBackground', v)} />
        <ColorPicker label="Category header text" value={theme.colors.categoryHeaderText} onChange={(v) => updateColors('categoryHeaderText', v)} />
      </section>

      <section className="appearance-section">
        <h4>Dashboard card preview</h4>
        <p className="field-hint">
          Image shown on My Boards. Leave empty to use a mini board with your current theme.
        </p>
        <label className="field-label">
          Image URL
          <input
            className="input"
            value={board.previewImage?.storage === 'local' ? '' : (board.previewImage?.url ?? '')}
            disabled={board.previewImage?.storage === 'local'}
            placeholder="https://..."
            onChange={(e) =>
              updatePreviewImage(
                e.target.value.trim()
                  ? { url: e.target.value, storage: 'url', mediaId: undefined }
                  : undefined,
              )
            }
          />
        </label>
        <label className="btn btn-sm appearance-upload-label">
          {previewUploading ? 'Uploading…' : 'Upload preview image'}
          <input
            type="file"
            accept="image/*"
            className="appearance-file-input"
            disabled={previewUploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handlePreviewImageUpload(file);
              e.target.value = '';
            }}
          />
        </label>
        {board.previewImage?.storage === 'local' && board.previewImage.mediaId && (
          <p className="field-hint appearance-upload-ok">Preview image saved in this browser.</p>
        )}
        {previewUploadError && (
          <p className="field-error" role="alert">
            {previewUploadError}
          </p>
        )}
        {board.previewImage && (
          <button type="button" className="btn btn-sm" onClick={() => updatePreviewImage(undefined)}>
            Remove custom preview
          </button>
        )}
        <div className="appearance-card-preview-wrap" aria-hidden="true">
          <BoardCardPreview board={board} />
        </div>
      </section>

      <section className="appearance-section">
        <h4>Game chrome</h4>
        <p className="field-hint">Top bar and team score footer during gameplay.</p>
        <ColorPicker label="Top bar background" value={theme.colors.topBarBackground} onChange={(v) => updateColors('topBarBackground', v)} />
        <ColorPicker label="Footer background" value={theme.colors.footerBackground} onChange={(v) => updateColors('footerBackground', v)} />
        <button type="button" className="btn btn-sm" onClick={resetTheme}>
          Reset to default
        </button>
      </section>

      {selectedCategory && (
        <section className="appearance-section">
          <h4>Category Header Style</h4>
          <p className="field-hint">Styling for &ldquo;{selectedCategory.name}&rdquo;</p>
          <ColorPicker
            label="Header background"
            value={catStyle.headerBackground ?? theme.colors.categoryHeaderBackground}
            onChange={(v) => updateCategoryStyle({ headerBackground: v })}
          />
          <ColorPicker
            label="Header font color"
            value={catStyle.headerTextColor ?? theme.colors.categoryHeaderText}
            onChange={(v) => updateCategoryStyle({ headerTextColor: v })}
          />
          <div className="appearance-actions">
            <button
              type="button"
              className="btn btn-sm"
              onClick={() =>
                onApplyCategoryStyleToAll?.({
                  headerBackground: catStyle.headerBackground ?? theme.colors.categoryHeaderBackground,
                  headerTextColor: catStyle.headerTextColor ?? theme.colors.categoryHeaderText,
                })
              }
            >
              Apply to all category headers
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => updateCategoryStyle({ headerBackground: undefined, headerTextColor: undefined, headerBackgroundImage: undefined })}
            >
              Reset category header style
            </button>
          </div>
        </section>
      )}

      {!embedded && (
        <div className="tile-preview-row" aria-hidden="true">
          <div
            className="tile-preview-sample"
            style={{
              background: theme.colors.tileBackground,
              borderColor: theme.colors.tileBorder,
              color: theme.colors.pointValueText,
            }}
          >
            500
          </div>
          <div
            className="tile-preview-sample tile-preview-used"
            style={{ background: theme.colors.tileBackgroundUsed, borderColor: theme.colors.tileBorder }}
          />
        </div>
      )}
    </div>
  );
}

function BackgroundPreview({ background }: { background: BoardBackground }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    async function load() {
      if (background.type !== 'image') {
        setPreviewUrl(null);
        return;
      }
      if (background.storage === 'local' && background.mediaId) {
        const blob = await getMediaBlob(background.mediaId);
        if (cancelled) return;
        if (blob) {
          objectUrl = URL.createObjectURL(blob);
          setPreviewUrl(objectUrl);
        } else {
          setPreviewUrl(null);
        }
        return;
      }
      const url = background.url?.trim();
      setPreviewUrl(url || null);
    }

    void load();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [background]);

  const cssBg = backgroundToCss(background);
  const style: CSSProperties =
    background.type === 'image' && previewUrl
      ? {
          backgroundImage: `url("${previewUrl}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }
      : { background: cssBg };

  return (
    <div className="appearance-preview board-bg-preview" style={style} aria-hidden="true">
      <span>{background.type === 'image' && !previewUrl ? 'Add an image URL or upload' : 'Preview'}</span>
    </div>
  );
}

function ColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const hex = value.startsWith('#') && value.length >= 7 ? value.slice(0, 7) : DEFAULT_BOARD_COLORS.tileBackground;
  return (
    <label className="color-field">
      {label}
      <input type="color" value={hex} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
