import type { Board } from '../types/board';
import { formatPeso } from './currency';
import { syncBoardDatasetsForExport } from './datasetStorage';

export function boardToJson(board: Board): string {
  return JSON.stringify(syncBoardDatasetsForExport(board), null, 2);
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportBoardJson(board: Board): void {
  const safeName = board.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'board';
  downloadFile(boardToJson(board), `${safeName}.json`, 'application/json');
}

export function exportBoardBackup(board: Board): void {
  const safeName = board.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'board';
  const stamp = new Date().toISOString().slice(0, 10);
  downloadFile(boardToJson(board), `${safeName}-backup-${stamp}.json`, 'application/json');
}

export async function copyBoardToClipboard(board: Board): Promise<void> {
  await navigator.clipboard.writeText(boardToJson(board));
}

export function openPrintableBoard(board: Board): void {
  const win = window.open('', '_blank');
  if (!win) return;

  const rows = board.categories
    .map((cat) => {
      const header = `<th>${escapeHtml(cat.name)}</th>`;
      return header;
    })
    .join('');

  const bodyRows = [0, 1, 2, 3, 4]
    .map((rowIndex) => {
      const cells = board.categories
        .map((cat) => {
          const clue = cat.clues[rowIndex];
          if (!clue) return '<td></td>';
          const text = clue.clue.trim() || '(empty)';
          const answer = clue.answer.trim() ? `<div class="answer">A: ${escapeHtml(clue.answer)}</div>` : '';
          const dd = clue.isDailyDouble ? ' <span class="dd">DD</span>' : '';
          return `<td><strong>${formatPeso(clue.value)}</strong>${dd}<p>${escapeHtml(text)}</p>${answer}</td>`;
        })
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

  const final = board.finalJeopardy;
  const finalSection =
    final.category || final.clue
      ? `<section class="final"><h2>Final Jeopardy</h2><p><strong>Category:</strong> ${escapeHtml(final.category)}</p><p>${escapeHtml(final.clue)}</p><p class="answer"><strong>Answer:</strong> ${escapeHtml(final.answer)}</p></section>`
      : '';

  win.document.write(`<!DOCTYPE html>
<html><head><title>${escapeHtml(board.title)} — Printable</title>
<style>
  body { font-family: Georgia, serif; padding: 24px; color: #111; }
  h1 { margin-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  th, td { border: 1px solid #333; padding: 10px; vertical-align: top; font-size: 12px; }
  th { background: #1e3a8a; color: #fff; }
  .answer { color: #555; font-size: 11px; margin-top: 6px; }
  .dd { background: #f59e0b; color: #fff; padding: 1px 4px; border-radius: 3px; font-size: 10px; }
  .final { margin-top: 32px; page-break-before: always; }
  @media print { body { padding: 0; } }
</style></head><body>
<h1>${escapeHtml(board.title)}</h1>
<p>Printed ${new Date().toLocaleString()}</p>
<table><thead><tr>${rows}</tr></thead><tbody>${bodyRows}</tbody></table>
${finalSection}
<script>window.onload = () => window.print();</script>
</body></html>`);
  win.document.close();
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
