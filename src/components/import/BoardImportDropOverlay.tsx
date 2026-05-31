import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Upload } from 'lucide-react';
import { importBoardFromFile, isBoardImportFile, pickBoardImportFile } from '../../lib/boardImport';
import { applyBoardImportAction, resolveBoardImportAction } from '../../lib/boardImportFlow';
import { importBoard } from '../../hooks/useBoards';
import { showToast } from '../../lib/toast';
import './BoardImportDropOverlay.css';

function isFileDrag(event: DragEvent): boolean {
  return Boolean(event.dataTransfer?.types.includes('Files'));
}

export function BoardImportDropOverlay() {
  const navigate = useNavigate();
  const [dragging, setDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const dragDepthRef = useRef(0);

  const importFile = useCallback(
    async (file: File) => {
      if (!isBoardImportFile(file)) {
        showToast('Drop a JSON or ZIP board backup.');
        return;
      }

      setImporting(true);
      const result = await importBoardFromFile(file);
      if (!result.ok) {
        setImporting(false);
        showToast(result.error);
        return;
      }

      const action = await resolveBoardImportAction(result.board);
      const boardId = await applyBoardImportAction(action, importBoard);
      setImporting(false);
      navigate(`/boards/${boardId}/edit`);
    },
    [navigate],
  );

  useEffect(() => {
    const onDragEnter = (event: DragEvent) => {
      if (!isFileDrag(event)) return;
      event.preventDefault();
      dragDepthRef.current += 1;
      setDragging(true);
    };

    const onDragLeave = (event: DragEvent) => {
      if (!isFileDrag(event)) return;
      dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
      if (dragDepthRef.current === 0) setDragging(false);
    };

    const onDragOver = (event: DragEvent) => {
      if (!isFileDrag(event)) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    };

    const onDrop = (event: DragEvent) => {
      if (!isFileDrag(event)) return;
      event.preventDefault();
      dragDepthRef.current = 0;
      setDragging(false);

      const file = pickBoardImportFile(event.dataTransfer?.files);
      if (!file) {
        showToast('Drop a JSON or ZIP board backup.');
        return;
      }

      void importFile(file);
    };

    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('drop', onDrop);

    return () => {
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('drop', onDrop);
    };
  }, [importFile]);

  if (!dragging && !importing) return null;

  return createPortal(
    <div
      className={`board-import-drop-overlay${importing ? ' board-import-drop-overlay-busy' : ''}`}
      role="presentation"
    >
      <div className="board-import-drop-panel" role="status" aria-live="polite">
        <Upload size={28} aria-hidden="true" />
        <p className="board-import-drop-title">
          {importing ? 'Importing board…' : 'Drop board backup to import'}
        </p>
        <p className="board-import-drop-hint">JSON or ZIP · saves locally and opens the editor</p>
      </div>
    </div>,
    document.body,
  );
}
