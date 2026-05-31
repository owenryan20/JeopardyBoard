interface TeamScoreQuickActionsProps {
  teams: { id: string; name: string }[];
  value: number;
  selections: Record<string, 'add' | 'subtract'>;
  onScore: (teamId: string, delta: number) => void;
  className?: string;
}

export function TeamScoreQuickActions({
  teams,
  value,
  selections,
  onScore,
  className = 'score-quick-actions',
}: TeamScoreQuickActionsProps) {
  return (
    <div className={className}>
      <p>Apply score — click selected again to undo:</p>
      {teams.map((team) => {
        const selection = selections[team.id];
        const scored = selection != null;
        return (
          <div key={team.id} className="score-team-row">
            <span>{team.name}</span>
            <div className="score-team-buttons" role="group" aria-label={`Score for ${team.name}`}>
              <button
                type="button"
                className={`btn btn-sm score-btn-add${selection === 'add' ? ' score-btn-selected' : ''}`}
                disabled={scored && selection !== 'add'}
                aria-pressed={selection === 'add'}
                aria-label={
                  selection === 'add'
                    ? `Undo ${value} points for ${team.name}`
                    : `Award ${value} points to ${team.name}`
                }
                onClick={() => onScore(team.id, value)}
              >
                +{value}
              </button>
              <button
                type="button"
                className={`btn btn-sm score-btn-subtract${selection === 'subtract' ? ' score-btn-selected' : ''}`}
                disabled={scored && selection !== 'subtract'}
                aria-pressed={selection === 'subtract'}
                aria-label={
                  selection === 'subtract'
                    ? `Undo −${value} points for ${team.name}`
                    : `Deduct ${value} points from ${team.name}`
                }
                onClick={() => onScore(team.id, -value)}
              >
                −{value}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
