import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { Board, BoardBackground } from '../types/board';
import { backgroundToCss, boardThemeToCssVars, migrateBoardTheme } from '../lib/boardTheme';
import { getMediaBlob } from '../lib/mediaStorage';

export function useBoardThemeStyles(board: Board | null): CSSProperties {
  const theme = migrateBoardTheme(board?.theme);
  const imageUrl = useBackgroundImageUrl(theme.background);

  return useMemo(() => {
    const vars = boardThemeToCssVars(theme) as Record<string, string>;
    if (theme.background.type === 'image' && imageUrl) {
      vars['--board-bg-image'] = `url("${imageUrl}")`;
      vars['--board-bg-overlay'] = theme.background.overlayColor ?? '#000000';
      vars['--board-bg-overlay-opacity'] = String(theme.background.overlayOpacity ?? 0.45);
    }
    return vars as CSSProperties;
  }, [theme, imageUrl]);
}

function useBackgroundImageUrl(bg: BoardBackground): string | null {
  const [url, setUrl] = useState<string | null>(null);
  const imageMediaId = bg.type === 'image' && bg.storage === 'local' ? bg.mediaId : undefined;
  const imageUrl = bg.type === 'image' && bg.storage !== 'local' ? bg.url : undefined;

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    async function load() {
      if (bg.type !== 'image') {
        setUrl(null);
        return;
      }
      if (bg.storage === 'local' && bg.mediaId) {
        const blob = await getMediaBlob(bg.mediaId);
        if (cancelled) return;
        if (blob) {
          objectUrl = URL.createObjectURL(blob);
          setUrl(objectUrl);
        } else {
          setUrl(null);
        }
        return;
      }
      setUrl(bg.url?.trim() || null);
    }

    void load();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [bg.type, imageMediaId, imageUrl]);

  return url;
}

export function boardBackgroundClass(bg: BoardBackground): string {
  if (bg.type === 'image') return 'board-bg-image';
  return '';
}

export { backgroundToCss, migrateBoardTheme };
