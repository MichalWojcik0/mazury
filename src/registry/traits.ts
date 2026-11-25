export type TraitId =
  | "foliage"
  | "bonsai_cutting"
  | "bonsai_sapling"
  | "sieve_mesh"
  | "sieve_substrate"
  | "fuel"
  | "smeltable"
  | "crop_base"
  | "crop_column"
  | "crop_segment";

export interface TraitDefaults {
  crucibleMeltMb?: number;
  plantableOn?: string[];
  maxGrowthTicks?: number;
  maxColumnHeight?: number;
  isCrop?: boolean;
  isCropTop?: boolean;
  passable?: boolean;
  breakable?: boolean;
}

export interface TraitDefinition {
  id: TraitId;
  name: string;
  description: string;
  defaults?: TraitDefaults;
  componentKey?: "crop_base" | "crop_segment";
}

export const TRAIT_REGISTRY: Record<TraitId, TraitDefinition> = {
  foliage: {
    id: "foliage",
    name: "Foliage",
    description: "Organic plant matter that melts into water in a Wooden Crucible.",
    defaults: {
      crucibleMeltMb: 250,
    },
  },
  bonsai_cutting: {
    id: "bonsai_cutting",
    name: "Bonsai Cutting",
    description: "Harvested miniature tree cutting used for planks or crucible water.",
    defaults: {
      crucibleMeltMb: 250,
    },
  },
  bonsai_sapling: {
    id: "bonsai_sapling",
    name: "Bonsai Sapling",
    description: "Miniature tree sapling plantable on farmland or dirt.",
    defaults: {
      crucibleMeltMb: 250,
      plantableOn: ["minecraft:farmland", "minecraft:dirt"],
    },
  },
  sieve_mesh: {
    id: "sieve_mesh",
    name: "Sieve Mesh",
    description: "Installable mesh screen for Wooden Sieves.",
  },
  sieve_substrate: {
    id: "sieve_substrate",
    name: "Sieve Substrate",
    description: "Granular block siftable through a Wooden Sieve.",
  },
  fuel: {
    id: "fuel",
    name: "Combustible Fuel",
    description: "Burnable fuel source for Furnaces.",
  },
  smeltable: {
    id: "smeltable",
    name: "Smeltable",
    description: "Material that can be smelted in a Furnace.",
  },
  crop_base: {
    id: "crop_base",
    name: "Crop",
    description: "Growing crop tile that advances over ticks and yields harvest drops.",
    defaults: {
      isCrop: true,
      passable: true,
      breakable: true,
      maxGrowthTicks: 1200,
    },
    componentKey: "crop_base",
  },
  crop_column: {
    id: "crop_column",
    name: "Multi-Block Column Crop",
    description: "Crop that grows upward by spawning upper segment blocks.",
    defaults: {
      isCrop: true,
      passable: true,
      breakable: true,
      maxGrowthTicks: 1200,
      maxColumnHeight: 2,
    },
    componentKey: "crop_base",
  },
  crop_segment: {
    id: "crop_segment",
    name: "Upper Crop Segment",
    description: "Upper segment of a multi-block column crop (hemp, sugar cane, cactus).",
    defaults: {
      isCropTop: true,
      passable: true,
      breakable: true,
    },
    componentKey: "crop_segment",
  },
};

export function getTraitDefinition(traitId: TraitId | string): TraitDefinition | undefined {
  return TRAIT_REGISTRY[traitId as TraitId];
}

/**
 * Resolves merged trait defaults for an item or block's trait list,
 * with explicit definition properties taking precedence.
 */
export function resolveWithTraits<T extends { traits?: TraitId[] }>(def: T): T & TraitDefaults {
  if (!def.traits || def.traits.length === 0) {
    return def;
  }
  const merged: Record<string, unknown> = {};
  for (const traitId of def.traits) {
    const trait = TRAIT_REGISTRY[traitId];
    if (trait?.defaults) {
      Object.assign(merged, trait.defaults);
    }
  }
  return { ...merged, ...def } as T & TraitDefaults;
}
