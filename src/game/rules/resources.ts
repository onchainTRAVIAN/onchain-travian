export const RESOURCE_KEYS = ['wood', 'clay', 'iron', 'crop'] as const;
export type ResourceKey = (typeof RESOURCE_KEYS)[number];
export type Resources = Record<ResourceKey, number>;

export const RESOURCE_LABEL: Record<ResourceKey, string> = {
  wood: 'Wood',
  clay: 'Clay',
  iron: 'Iron',
  crop: 'Crop',
};

export const RESOURCE_ICON: Record<ResourceKey, string> = {
  wood: '🪵',
  clay: '🧱',
  iron: '⛓️',
  crop: '🌾',
};

export function res(wood = 0, clay = 0, iron = 0, crop = 0): Resources {
  return { wood, clay, iron, crop };
}

export function addRes(a: Resources, b: Resources): Resources {
  return res(a.wood + b.wood, a.clay + b.clay, a.iron + b.iron, a.crop + b.crop);
}

export function subRes(a: Resources, b: Resources): Resources {
  return res(a.wood - b.wood, a.clay - b.clay, a.iron - b.iron, a.crop - b.crop);
}

export function scaleRes(a: Resources, k: number): Resources {
  return res(a.wood * k, a.clay * k, a.iron * k, a.crop * k);
}

export function floorRes(a: Resources): Resources {
  return res(Math.floor(a.wood), Math.floor(a.clay), Math.floor(a.iron), Math.floor(a.crop));
}

export function canAfford(have: Resources, cost: Resources): boolean {
  return RESOURCE_KEYS.every((k) => have[k] + 1e-9 >= cost[k]);
}

export function sumRes(a: Resources): number {
  return a.wood + a.clay + a.iron + a.crop;
}

/** Round a cost to the nearest 5, the way classic games present prices. */
export function roundTo5(n: number): number {
  return Math.max(5, Math.round(n / 5) * 5);
}
