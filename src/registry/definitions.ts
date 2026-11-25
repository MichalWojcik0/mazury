import type { ItemDefinition } from "./items.ts";
import type { BlockDefinition } from "./blocks.ts";
import type { TraitDefinition, TraitId } from "./traits.ts";
import { ITEM_REGISTRY } from "./items.ts";
import { BLOCK_REGISTRY } from "./blocks.ts";
import { getTraitDefinition, resolveWithTraits } from "./traits.ts";

export type { ItemDefinition, BlockDefinition, TraitDefinition, TraitId };
export { ITEM_REGISTRY, BLOCK_REGISTRY };

export function getItemDefinition(itemId: string): ItemDefinition | undefined {
  const def = ITEM_REGISTRY[itemId];
  return def ? resolveWithTraits(def) : undefined;
}

export function getItemTraits(itemId: string): TraitDefinition[] {
  const traits = ITEM_REGISTRY[itemId]?.traits ?? [];
  return traits.map((id) => getTraitDefinition(id)).filter((t): t is TraitDefinition => Boolean(t));
}

export function hasItemTrait(itemId: string, trait: TraitId | string): boolean {
  return ITEM_REGISTRY[itemId]?.traits?.includes(trait as TraitId) ?? false;
}

export function getBlockDefinition(tileId: string): BlockDefinition | undefined {
  const def = BLOCK_REGISTRY[tileId];
  return def ? resolveWithTraits(def) : undefined;
}
