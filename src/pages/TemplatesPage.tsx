import { useNavigate } from 'react-router-dom';
import { BOARD_TEMPLATES, createBoardFromTemplate } from '../lib/templates';
import { useBoards } from '../hooks/useBoards';
import './TemplatesPage.css';

export function TemplatesPage() {
  const { saveBoard } = useBoards();
  const navigate = useNavigate();

  const useTemplate = (templateId: string) => {
    const template = BOARD_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;
    const board = createBoardFromTemplate(template);
    saveBoard(board);
    navigate(`/boards/${board.id}/edit`);
  };

  return (
    <div className="page templates-page">
      <header className="page-header">
        <div>
          <h1>Templates</h1>
          <p className="page-subtitle">
            Start from a starter board and customize it in the editor
          </p>
        </div>
      </header>

      <div className="template-grid">
        {BOARD_TEMPLATES.map((template) => (
          <article key={template.id} className="template-card card">
            <div className="template-card-icon" aria-hidden="true">
              {template.emoji}
            </div>
            <h2 className="template-card-title">{template.name}</h2>
            <p className="template-card-desc">{template.description}</p>
            <p className="template-card-meta">
              {template.categoryNames.length} categories · 30 clues
            </p>
            <div className="template-categories">
              {template.categoryNames.map((name) => (
                <span key={name} className="badge badge-tag">
                  {name}
                </span>
              ))}
            </div>
            <button
              type="button"
              className="btn btn-primary template-use-btn"
              onClick={() => useTemplate(template.id)}
            >
              Use Template
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
