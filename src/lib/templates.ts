import type { Board, Category, Clue } from '../types/board';
import { CATEGORY_COUNT, DEFAULT_POINT_VALUES } from '../types/board';
import { createDefaultFinalJeopardy, finalJeopardyFromLegacy } from './finalJeopardy';
import { createId } from './ids';

export interface BoardTemplate {
  id: string;
  name: string;
  description: string;
  emoji: string;
  categoryNames: string[];
  sampleClues?: Partial<Record<string, { clue: string; answer: string; tags?: string[] }>>;
  /** Legacy flat fields — migrated to `tile` on import. */
  finalJeopardy?: { category?: string; clue?: string; answer?: string };
}

function clueKey(categoryIndex: number, value: number): string {
  return `${categoryIndex}-${value}`;
}

export const BOARD_TEMPLATES: BoardTemplate[] = [
  {
    id: 'blank',
    name: 'Blank Board',
    description: 'Empty 6×5 grid with default categories — start from scratch.',
    emoji: '📝',
    categoryNames: ['Science', 'History', 'Movies', 'Sports', 'Geography', 'Music'],
  },
  {
    id: 'trivia-night',
    name: 'Friday Trivia Night',
    description: 'A ready-to-play sample board with fun general-knowledge clues.',
    emoji: '🎯',
    categoryNames: ['Science', 'History', 'Movies', 'Sports', 'Geography', 'Music'],
    sampleClues: {
      [clueKey(0, 100)]: {
        clue: 'This red planet is named after the Roman god of war.',
        answer: 'Mars',
        tags: ['Astronomy', 'Planets'],
      },
      [clueKey(0, 200)]: {
        clue: 'H2O is the chemical formula for this essential liquid.',
        answer: 'Water',
        tags: ['Chemistry'],
      },
      [clueKey(0, 300)]: {
        clue: 'This force keeps planets in orbit around the Sun.',
        answer: 'Gravity',
        tags: ['Physics'],
      },
      [clueKey(1, 100)]: {
        clue: 'This 1861–1865 conflict divided the United States.',
        answer: 'The Civil War',
        tags: ['US History'],
      },
      [clueKey(1, 200)]: {
        clue: 'In 1969, Neil Armstrong took the first steps on this celestial body.',
        answer: 'The Moon',
        tags: ['Space'],
      },
      [clueKey(2, 100)]: {
        clue: 'This 1997 film about a doomed ocean liner won 11 Oscars.',
        answer: 'Titanic',
        tags: ['Film'],
      },
      [clueKey(2, 200)]: {
        clue: '"May the Force be with you" is a famous line from this sci-fi saga.',
        answer: 'Star Wars',
        tags: ['Film'],
      },
      [clueKey(3, 100)]: {
        clue: 'This sport uses a hoop 10 feet off the ground.',
        answer: 'Basketball',
        tags: ['Sports'],
      },
      [clueKey(4, 100)]: {
        clue: 'This is the longest river in the world.',
        answer: 'The Nile',
        tags: ['Geography'],
      },
      [clueKey(5, 100)]: {
        clue: 'This King of Pop released "Thriller" in 1982.',
        answer: 'Michael Jackson',
        tags: ['Music'],
      },
    },
    finalJeopardy: {
      category: 'World Capitals',
      clue: 'This city on the Danube is the capital of Hungary.',
      answer: 'Budapest',
    },
  },
  {
    id: 'office-party',
    name: 'Office Party',
    description: 'Workplace-friendly categories for team events and happy hours.',
    emoji: '💼',
    categoryNames: ['Company Trivia', 'Pop Culture', 'Tech', 'Food & Drink', 'Travel', 'Random'],
    sampleClues: {
      [clueKey(0, 100)]: {
        clue: 'The shared online space where your team stores documents.',
        answer: 'What is the cloud / shared drive?',
        tags: ['Workplace'],
      },
      [clueKey(1, 100)]: {
        clue: 'This streaming series about a fictional paper company is set in Scranton.',
        answer: 'The Office',
        tags: ['TV'],
      },
      [clueKey(2, 100)]: {
        clue: 'This company makes Windows, Office, and Xbox.',
        answer: 'Microsoft',
        tags: ['Tech'],
      },
      [clueKey(3, 100)]: {
        clue: 'The meal often called "the most important of the day."',
        answer: 'Breakfast',
        tags: ['Food'],
      },
    },
    finalJeopardy: {
      category: 'Famous Firsts',
      clue: 'In 1969, this network sent the first email.',
      answer: 'ARPANET (accept early internet / UCLA)',
    },
  },
  {
    id: 'kids-family',
    name: 'Kids & Family',
    description: 'Easy, family-friendly categories for all ages.',
    emoji: '🎈',
    categoryNames: ['Animals', 'Cartoons', 'Space', 'Books', 'Games', 'Nature'],
    sampleClues: {
      [clueKey(0, 100)]: {
        clue: 'This black-and-white bear eats bamboo.',
        answer: 'Panda',
        tags: ['Animals'],
      },
      [clueKey(0, 200)]: {
        clue: 'The largest mammal on Earth.',
        answer: 'Blue whale',
        tags: ['Animals'],
      },
      [clueKey(1, 100)]: {
        clue: 'This mouse wears red shorts and white gloves.',
        answer: 'Mickey Mouse',
        tags: ['Cartoons'],
      },
      [clueKey(2, 100)]: {
        clue: 'We live on this third planet from the Sun.',
        answer: 'Earth',
        tags: ['Space'],
      },
      [clueKey(5, 100)]: {
        clue: 'Rainbows appear when sunlight passes through these in the sky.',
        answer: 'Water droplets',
        tags: ['Nature'],
      },
    },
    finalJeopardy: {
      category: 'Fairy Tales',
      clue: 'She lost a glass slipper at the ball.',
      answer: 'Cinderella',
    },
  },
];

function createClueFromTemplate(
  value: number,
  categoryIndex: number,
  template: BoardTemplate,
): Clue {
  const sample = template.sampleClues?.[clueKey(categoryIndex, value)];
  return {
    id: createId(),
    type: 'clue',
    value,
    clue: sample?.clue ?? '',
    answer: sample?.answer ?? '',
    hostNotes: '',
    isDailyDouble: false,
    tags: sample?.tags ?? [],
    isUsed: false,
  };
}

function createCategoryFromTemplate(
  index: number,
  template: BoardTemplate,
): Category {
  return {
    id: createId(),
    name: template.categoryNames[index] ?? `Category ${index + 1}`,
    clues: DEFAULT_POINT_VALUES.map((value) =>
      createClueFromTemplate(value, index, template),
    ),
  };
}

export function createBoardFromTemplate(template: BoardTemplate, title?: string): Board {
  const now = new Date().toISOString();
  return {
    id: createId(),
    title: title ?? template.name,
    description: template.description,
    categories: Array.from({ length: CATEGORY_COUNT }, (_, i) =>
      createCategoryFromTemplate(i, template),
    ),
    datasets: [],
    finalJeopardy: template.finalJeopardy
      ? finalJeopardyFromLegacy(template.finalJeopardy)
      : createDefaultFinalJeopardy(),
    createdAt: now,
    updatedAt: now,
  };
}

export function getTemplateById(id: string): BoardTemplate | undefined {
  return BOARD_TEMPLATES.find((t) => t.id === id);
}
