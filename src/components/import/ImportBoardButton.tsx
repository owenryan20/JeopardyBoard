import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { importBoardFromFile } from '../../lib/boardImport';
import { applyBoardImportAction, resolveBoardImportAction } from '../../lib/boardImportFlow';
import { importBoard } from '../../hooks/useBoards';
import { useNavigate } from 'react-router-dom';

interface ImportBoardButtonProps {
  className?: string;
  onImported?: (boardId: string) => void;
}

export function ImportBoardButton({ className = 'btn', onImported }: ImportBoardButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setError(null);
    const result = await importBoardFromFile(file);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const action = await resolveBoardImportAction(result.board);
    const boardId = await applyBoardImportAction(action, importBoard);
    onImported?.(boardId);
    navigate(`/boards/${boardId}/edit`);
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".json,.zip,application/json,application/zip"
        className="sr-only"
        aria-label="Import board JSON or ZIP file"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = '';
        }}
      />
      <button
        type="button"
        className={className}
        onClick={() => inputRef.current?.click()}
      >
        <Upload size={16} aria-hidden="true" />
        Import Board
      </button>
      {error && (
        <p role="alert" className="import-error">
          {error}
        </p>
      )}
    </>
  );
}
