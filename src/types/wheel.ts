export interface WheelOfNames {
  id: string;
  name: string;
  entries: string[];
}

/** Virtual wheel built from live team names during a game. */
export const WHEEL_TEAMS_ID = '__teams__';
