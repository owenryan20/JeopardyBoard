import type { AppDataset, DatasetRow, DatasetSourceMetadata } from '../types/dataset';
import { createColumn } from './datasetConvert';
import { createId } from './ids';
import { formatFgoTraitLabel, titleCaseWord } from './fgoTraitLabels';
import {
  FGO_SERVANTS_COLUMNS,
  FGO_SERVANTS_SOURCE_LABEL,
  getFgoRegionConfig,
  inferFgoRegionFromSource,
} from './fgoServantsPreset';
import type { FgoServantsRegion } from '../types/dataset';

const FETCH_TIMEOUT_MS = 120000;

export interface AtlasAcademyTrait {
  id: number;
  name: string;
}

export interface AtlasAcademySkill {
  id?: number;
  num?: number;
  name?: string;
  type?: string;
  skillSvts?: Array<{ svtId: number; num?: number }>;
}

export interface AtlasAcademyNoblePhantasm {
  id?: number;
  num?: number;
  npNum?: number;
  card?: string;
  name?: string;
  type?: string;
  effectFlags?: string[];
  condQuestId?: number;
  condQuestPhase?: number;
  condLv?: number;
}

export interface AtlasAcademyNiceServant {
  id: number;
  collectionNo?: number;
  name?: string;
  originalName?: string;
  type?: string;
  flag?: string;
  classId?: number;
  className?: string;
  attribute?: string;
  gender?: string;
  traits?: AtlasAcademyTrait[];
  rarity?: number;
  cost?: number;
  atkMax?: number;
  hpMax?: number;
  face?: string;
  cards?: string[];
  noblePhantasms?: AtlasAcademyNoblePhantasm[];
  skills?: AtlasAcademySkill[];
  classPassive?: AtlasAcademySkill[];
  appendPassive?: AtlasAcademySkill[];
  extraPassive?: AtlasAcademySkill[];
  extraAssets?: {
    faces?: {
      ascension?: Record<string, string>;
      costume?: Record<string, string>;
    };
  };
  costume?: Record<string, { shortName?: string }>;
  profile?: {
    illustrator?: string;
    cv?: string;
  };
  cv?: string;
  illustrator?: string;
}

export interface FgoTransformedRow {
  id: string;
  values: Record<string, string>;
}

export interface FgoTransformResult {
  columns: typeof FGO_SERVANTS_COLUMNS;
  rows: FgoTransformedRow[];
  duplicateNames: string[];
  missingImageCount: number;
}

const GENDER_TRAITS: Record<string, string> = {
  genderMale: 'Male',
  genderFemale: 'Female',
  genderUnknown: 'Unknown',
};

const NP_CARD_LABELS: Record<string, string> = {
  '1': 'Arts',
  '2': 'Buster',
  '3': 'Quick',
  '4': 'Extra',
  '5': 'Shield',
};

const DECK_CARD_ABBREVIATIONS: Record<string, string> = {
  '1': 'A',
  '2': 'B',
  '3': 'Q',
  '4': 'E',
  '5': 'S',
};

const SKIP_TRAIT_NAMES = new Set([
  'servant',
  'canBeInBattle',
  'unknown',
]);

const SKIP_TRAIT_PREFIXES = ['gender', 'alignment', 'class', 'attribute'];
const SKIP_TRAIT_SUFFIXES = ['StarServant', 'ClassServant'];

function isRedundantTrait(traitName: string, servantId: number, traitId: number): boolean {
  if (SKIP_TRAIT_NAMES.has(traitName)) return true;
  if (traitName === 'unknown' && traitId === servantId) return true;
  if (SKIP_TRAIT_PREFIXES.some((p) => traitName.startsWith(p))) return true;
  if (SKIP_TRAIT_SUFFIXES.some((s) => traitName.endsWith(s))) return true;
  return false;
}

export function extractGender(servant: AtlasAcademyNiceServant): string {
  const direct = servant.gender?.trim();
  if (direct) return titleCaseWord(direct);
  for (const trait of servant.traits ?? []) {
    const gender = GENDER_TRAITS[trait.name];
    if (gender) return gender;
  }
  return 'Unknown';
}

export function extractAlignment(traits: AtlasAcademyTrait[]): string {
  const names = new Set(traits.map((t) => t.name));
  const axis1 = names.has('alignmentLawful')
    ? 'Lawful'
    : names.has('alignmentChaotic')
      ? 'Chaotic'
      : names.has('alignmentNeutral')
        ? 'Neutral'
        : '';
  const axis2 = names.has('alignmentGood')
    ? 'Good'
    : names.has('alignmentEvil')
      ? 'Evil'
      : names.has('alignmentBalanced')
        ? 'Balanced'
        : names.has('alignmentMadness')
          ? 'Madness'
          : '';
  if (axis1 && axis2) return `${axis1} ${axis2}`;
  if (axis1) return axis1;
  if (axis2) return axis2;
  return 'Unknown';
}

export function extractUsefulTraits(servant: AtlasAcademyNiceServant): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const trait of servant.traits ?? []) {
    if (isRedundantTrait(trait.name, servant.id, trait.id)) continue;
    const label = formatFgoTraitLabel(trait.name);
    const key = label.toLowerCase();
    if (!label || seen.has(key)) continue;
    seen.add(key);
    tags.push(label);
  }
  return tags;
}

function extractCostumeNames(servant: AtlasAcademyNiceServant): string[] {
  const names: string[] = [];
  const seen = new Set<string>();

  if (servant.costume) {
    for (const entry of Object.values(servant.costume)) {
      const shortName = entry.shortName?.trim();
      if (!shortName || seen.has(shortName.toLowerCase())) continue;
      seen.add(shortName.toLowerCase());
      names.push(shortName);
    }
  }

  return names;
}

function hasAlternateCostumes(servant: AtlasAcademyNiceServant): boolean {
  if (extractCostumeNames(servant).length > 0) return true;
  const costumeFaces = servant.extraAssets?.faces?.costume;
  return Boolean(costumeFaces && Object.keys(costumeFaces).length > 0);
}

export function extractFaceImage(servant: AtlasAcademyNiceServant): string {
  if (servant.face?.trim()) return servant.face.trim();

  const ascension = servant.extraAssets?.faces?.ascension;
  if (ascension) {
    for (const key of ['1', '0', '2', '3', '4']) {
      const url = ascension[key];
      if (url?.trim()) return url.trim();
    }
    for (const url of Object.values(ascension)) {
      if (typeof url === 'string' && url.trim()) return url.trim();
    }
  }

  const costume = servant.extraAssets?.faces?.costume;
  if (costume) {
    for (const url of Object.values(costume)) {
      if (typeof url === 'string' && url.trim()) return url.trim();
    }
  }

  return '';
}

function pickMainNoblePhantasm(servant: AtlasAcademyNiceServant): AtlasAcademyNoblePhantasm | undefined {
  const nps = servant.noblePhantasms ?? [];
  if (nps.length === 0) return undefined;

  const owned = nps.filter((np) => {
    if (np.condQuestId && np.condQuestId > 0) return false;
    if (np.condLv && np.condLv > 1) return false;
    return true;
  });

  const pool = owned.length > 0 ? owned : nps;
  return pool.find((np) => np.num === 1 || np.npNum === 1) ?? pool[0];
}

function formatNpCardType(card?: string): string {
  if (!card?.trim()) return '';
  return NP_CARD_LABELS[card] ?? 'Unknown';
}

function formatNpTarget(effectFlags?: string[]): string {
  if (!effectFlags?.length) return '';
  if (effectFlags.includes('support')) return 'Support';
  if (effectFlags.includes('attackEnemyAll')) return 'AoE';
  if (effectFlags.includes('attackEnemyOne')) return 'Single Target';
  return '';
}

/** Combines NP targeting (AoE / single / support) with card type, e.g. "AoE Buster" or "Support Arts". */
export function formatNpCardAndTarget(np?: AtlasAcademyNoblePhantasm): string {
  if (!np) return '';
  const target = formatNpTarget(np.effectFlags);
  const card = formatNpCardType(np.card);
  const hasCard = card !== '' && card !== 'Unknown';

  if (target && hasCard) return `${target} ${card}`;
  if (hasCard) return card;
  return target;
}

/** Command card deck as abbreviated string, e.g. Quick/Arts/Arts/Buster/Buster → "QAABB". */
export function formatDeck(cards?: string[]): string {
  if (!cards?.length) return '';
  return cards
    .map((card) => DECK_CARD_ABBREVIATIONS[card] ?? '')
    .join('');
}

function skillBelongsToServant(skill: AtlasAcademySkill, servantId: number): boolean {
  if (!skill.skillSvts?.length) return true;
  return skill.skillSvts.some((entry) => entry.svtId === servantId);
}

function extractSkillNames(servant: AtlasAcademyNiceServant): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const skill of servant.skills ?? []) {
    if (skill.type !== 'active') continue;
    if (!skillBelongsToServant(skill, servant.id)) continue;
    const name = skill.name?.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(name);
  }
  return names;
}

function extractPassiveSkillNames(servant: AtlasAcademyNiceServant): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  const sources = [
    ...(servant.classPassive ?? []),
    ...(servant.appendPassive ?? []),
    ...(servant.extraPassive ?? []),
  ];

  for (const skill of sources) {
    const name = skill.name?.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(name);
  }
  return names;
}

function extractIllustrator(servant: AtlasAcademyNiceServant): string {
  return (
    servant.profile?.illustrator?.trim()
    ?? servant.illustrator?.trim()
    ?? ''
  );
}

function extractVoiceActor(servant: AtlasAcademyNiceServant): string {
  return (
    servant.profile?.cv?.trim()
    ?? servant.cv?.trim()
    ?? ''
  );
}

function isPlayableServant(servant: AtlasAcademyNiceServant): boolean {
  if (servant.type === 'enemyCollectionDetail') return false;
  if (!servant.name?.trim()) return false;
  return true;
}

export function transformAtlasAcademyServants(servants: AtlasAcademyNiceServant[]): FgoTransformResult {
  const rows: FgoTransformedRow[] = servants
    .filter(isPlayableServant)
    .map((servant) => {
      const usefulTraits = extractUsefulTraits(servant);
      const costumeNames = extractCostumeNames(servant);
      const mainNp = pickMainNoblePhantasm(servant);
      const skillNames = extractSkillNames(servant);
      const passiveNames = extractPassiveSkillNames(servant);

      return {
        id: String(servant.id),
        values: {
          ID: String(servant.id),
          'Collection No.': String(servant.collectionNo ?? ''),
          Name: servant.name ?? '',
          'Original Name': servant.originalName ?? '',
          Class: titleCaseWord(servant.className ?? ''),
          Attribute: titleCaseWord(servant.attribute ?? ''),
          Rarity: String(servant.rarity ?? ''),
          Gender: extractGender(servant),
          Alignment: extractAlignment(servant.traits ?? []),
          Traits: usefulTraits.join(', '),
          'Max ATK': String(servant.atkMax ?? ''),
          'Max HP': String(servant.hpMax ?? ''),
          Cost: String(servant.cost ?? ''),
          'NP Card': formatNpCardAndTarget(mainNp),
          'NP Type': mainNp?.type?.trim() ?? '',
          'NP Name': mainNp?.name?.trim() ?? '',
          Deck: formatDeck(servant.cards),
          Skills: skillNames.join(', '),
          'Passive Skills': passiveNames.join(', '),
          Illustrator: extractIllustrator(servant),
          'Voice Actor': extractVoiceActor(servant),
          'Face Image': extractFaceImage(servant),
          'Has Costume': hasAlternateCostumes(servant) ? 'Yes' : 'No',
          Costumes: costumeNames.join(', '),
          'Trait Count': String(usefulTraits.length),
        },
      };
    });

  const nameCounts = new Map<string, number>();
  for (const row of rows) {
    const name = row.values.Name.trim().toLowerCase();
    if (name) nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1);
  }
  const duplicateNames = [...nameCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([name]) => name);

  const missingImageCount = rows.filter((r) => !r.values['Face Image']?.trim()).length;

  return {
    columns: FGO_SERVANTS_COLUMNS,
    rows,
    duplicateNames,
    missingImageCount,
  };
}

export function createFgoSourceMetadata(
  fetchedAt: string,
  region: FgoServantsRegion,
): DatasetSourceMetadata {
  const config = getFgoRegionConfig(region);
  return {
    kind: 'atlasAcademyFgoServants',
    label: FGO_SERVANTS_SOURCE_LABEL,
    url: config.url,
    lastFetchedAt: fetchedAt,
    livePreset: true,
    sourceVersion: config.sourceVersion,
    region: config.region,
  };
}

export function buildFgoAppDataset(
  name: string,
  transform: FgoTransformResult,
  fetchedAt: string,
  region: FgoServantsRegion,
  existingId?: string,
): Omit<AppDataset, 'createdAt' | 'updatedAt'> & { createdAt?: string; updatedAt?: string } {
  const now = new Date().toISOString();
  const columns = transform.columns.map((col) =>
    createColumn(col.name, col.type, []),
  );
  columns.forEach((col, i) => {
    if (transform.columns[i].hidden) col.hidden = true;
  });

  const rows: DatasetRow[] = transform.rows.map((row) => ({
    id: row.id,
    values: row.values,
  }));

  return {
    id: existingId ?? createId(),
    name,
    type: 'fgoServants',
    sourceType: 'livePreset',
    columns,
    rows,
    source: createFgoSourceMetadata(fetchedAt, region),
    lastFetchedAt: fetchedAt,
    hasLocalEdits: false,
    lastEditedAt: undefined,
    createdAt: now,
    updatedAt: now,
  };
}

export async function fetchAtlasAcademyServants(region: FgoServantsRegion): Promise<{
  ok: true;
  servants: AtlasAcademyNiceServant[];
  fetchedAt: string;
  region: FgoServantsRegion;
} | {
  ok: false;
  error: string;
  invalidShape?: boolean;
}> {
  const config = getFgoRegionConfig(region);
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(config.url, { signal: controller.signal });
    if (!response.ok) {
      return { ok: false, error: "Couldn't fetch FGO servant data right now." };
    }
    const data: unknown = await response.json();
    if (!Array.isArray(data) || data.length === 0) {
      return {
        ok: false,
        error: "We fetched data, but it didn't look like the expected FGO servant list.",
        invalidShape: true,
      };
    }
    const first = data[0] as Record<string, unknown>;
    if (typeof first.id !== 'number' || typeof first.name !== 'string') {
      return {
        ok: false,
        error: "We fetched data, but it didn't look like the expected FGO servant list.",
        invalidShape: true,
      };
    }
    return {
      ok: true,
      servants: data as AtlasAcademyNiceServant[],
      fetchedAt: new Date().toISOString(),
      region,
    };
  } catch {
    return { ok: false, error: "Couldn't fetch FGO servant data right now." };
  } finally {
    window.clearTimeout(timeout);
  }
}

export interface FgoRefreshSummary {
  currentRowCount: number;
  newRowCount: number;
  lastFetchedAt: string | undefined;
  newFetchedAt: string;
  addedCount: number;
  removedCount: number;
  updatedCount: number;
}

export function summarizeFgoRefresh(
  existing: AppDataset,
  transform: FgoTransformResult,
  fetchedAt: string,
): FgoRefreshSummary {
  const existingIds = new Set(existing.rows.map((r) => r.id));
  const newIds = new Set(transform.rows.map((r) => r.id));
  let addedCount = 0;
  let removedCount = 0;
  let updatedCount = 0;

  for (const id of newIds) {
    if (!existingIds.has(id)) addedCount++;
  }
  for (const id of existingIds) {
    if (!newIds.has(id)) removedCount++;
  }

  const columnNames = transform.columns.map((c) => c.name);
  const existingById = new Map(existing.rows.map((r) => [r.id, r]));
  for (const row of transform.rows) {
    const prev = existingById.get(row.id);
    if (!prev) continue;
    const changed = columnNames.some(
      (col) => (prev.values[col] ?? '') !== (row.values[col] ?? ''),
    );
    if (changed) updatedCount++;
  }

  return {
    currentRowCount: existing.rows.length,
    newRowCount: transform.rows.length,
    lastFetchedAt: existing.lastFetchedAt,
    newFetchedAt: fetchedAt,
    addedCount,
    removedCount,
    updatedCount,
  };
}

export function formatFgoExportLabel(source?: {
  region?: FgoServantsRegion;
  sourceVersion?: string;
}): string {
  const region = source?.region ?? inferFgoRegionFromSource(source);
  const config = getFgoRegionConfig(region);
  if (source?.sourceVersion && source.sourceVersion !== config.sourceVersion) {
    return `${region} · ${source.sourceVersion.replace(/_/g, ' ')}`;
  }
  return config.exportLabel;
}

export function formatFgoRegionLabel(source?: {
  region?: FgoServantsRegion;
  url?: string;
}): string {
  return getFgoRegionConfig(inferFgoRegionFromSource(source)).label;
}
