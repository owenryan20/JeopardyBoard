import type { CSSProperties } from 'react';
import type { Board } from '../../types/board';
import { getCategoryHeaderStyle, migrateBoardTheme } from '../../lib/boardTheme';
import { useBoardThemeStyles } from '../../hooks/useBoardTheme';
import { hasPreviewImage, useStoredImageUrl } from '../../hooks/useStoredImageUrl';
import './BoardCardPreview.css';

interface BoardCardPreviewProps {
  board: Board;
}

export function BoardCardPreview({ board }: BoardCardPreviewProps) {
  const customPreviewUrl = useStoredImageUrl(board.previewImage);
  const themeStyles = useBoardThemeStyles(board);
  const theme = migrateBoardTheme(board.theme);
  const cols = Math.min(Math.max(board.categories.length, 1), 6);

  if (hasPreviewImage(board.previewImage) && customPreviewUrl) {
    return (
      <div className="board-card-thumb board-card-thumb-custom" aria-hidden="true">
        <img src={customPreviewUrl} alt="" className="board-card-preview-img" />
      </div>
    );
  }

  const gridStyle = {
    ...themeStyles,
    '--board-card-cols': cols,
  } as CSSProperties;

  return (
    <div
      className="board-card-thumb board-card-thumb-themed board-themed"
      style={gridStyle}
      aria-hidden="true"
    >
      <div className="board-card-mini-inner">
        <div className="board-card-mini-grid board-card-mini-cats">
          {board.categories.slice(0, 6).map((cat) => {
            const header = getCategoryHeaderStyle(cat, board);
            return (
              <div
                key={cat.id}
                className="board-card-mini-col board-card-mini-cat"
                style={{
                  background: header.headerBackgroundImage
                    ? `url(${header.headerBackgroundImage}) center/cover`
                    : header.headerBackground,
                  color: header.headerTextColor,
                }}
              >
                <span>{cat.name.slice(0, 4)}</span>
              </div>
            );
          })}
        </div>
        <div className="board-card-mini-grid board-card-mini-tiles">
          {board.categories.slice(0, 6).map((cat) => (
            <div
              key={`${cat.id}-tile`}
              className="board-card-mini-col board-card-mini-tile"
              style={{
                background: theme.colors.tileBackground,
                borderColor: theme.colors.tileBorder,
                color: theme.colors.pointValueText,
              }}
            >
              <span>{cat.clues[0]?.value ?? 100}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
