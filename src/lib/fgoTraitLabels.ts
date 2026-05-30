const TRAIT_LABEL_MAP: Record<string, string> = {
  genderFemale: 'Female',
  genderMale: 'Male',
  genderUnknown: 'Unknown',
  classSaber: 'Saber',
  classArcher: 'Archer',
  classLancer: 'Lancer',
  classRider: 'Rider',
  classCaster: 'Caster',
  classAssassin: 'Assassin',
  classBerserker: 'Berserker',
  classRuler: 'Ruler',
  classAvenger: 'Avenger',
  classAlterego: 'Alter Ego',
  classMoonCancer: 'Moon Cancer',
  classForeigner: 'Foreigner',
  classPretender: 'Pretender',
  classBeast: 'Beast',
  classShielder: 'Shielder',
  attributeEarth: 'Earth',
  attributeHuman: 'Human',
  attributeSky: 'Sky',
  attributeStar: 'Star',
  attributeBeast: 'Beast',
  alignmentLawful: 'Lawful',
  alignmentNeutral: 'Neutral',
  alignmentChaotic: 'Chaotic',
  alignmentGood: 'Good',
  alignmentEvil: 'Evil',
  alignmentBalanced: 'Balanced',
  alignmentMadness: 'Madness',
  fiveStarServant: '5 Star Servant',
  fourStarServant: '4 Star Servant',
  threeStarServant: '3 Star Servant',
  twoStarServant: '2 Star Servant',
  oneStarServant: '1 Star Servant',
  hasCostume: 'Has Costume',
  skyOrEarthServant: 'Sky or Earth Servant',
  weakToEnumaElish: 'Weak to Enuma Elish',
  knightsOfTheRound: 'Knights of the Round',
  humanoid: 'Humanoid',
  riding: 'Riding',
  dragon: 'Dragon',
  saberface: 'Saberface',
  king: 'King',
  arthur: 'Arthur',
  divineOrDemonOrUndead: 'Divine or Demon or Undead',
};

export function formatFgoTraitLabel(traitName: string): string {
  const mapped = TRAIT_LABEL_MAP[traitName];
  if (mapped) return mapped;
  return camelCaseToTitleCase(traitName);
}

export function camelCaseToTitleCase(value: string): string {
  const spaced = value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
  return spaced
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      if (/^\d+$/.test(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

export function titleCaseWord(value: string): string {
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}
