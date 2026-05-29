import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { validateBoardImport } from '../../lib/validation';
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
    try {
      const text = await file.text();
      const data = JSON.parse(text) as unknown;
      const result = validateBoardImport(data);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const board = importBoard(result.board);
      onImported?.(board.id);
      navigate(`/boards/${board.id}/edit`);
    } catch {
      setError('Could not parse JSON file. Check the file format.');
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        className="sr-only"
        aria-label="Import board JSON file"
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
