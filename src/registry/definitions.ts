import type { ItemDefinition } from "./items.ts";
import type { BlockDefinition } from "./blocks.ts";
import { ITEM_REGISTRY } from "./items.ts";
import { BLOCK_REGISTRY } from "./blocks.ts";

export type { ItemDefinition, BlockDefinition };
export { ITEM_REGISTRY, BLOCK_REGISTRY };

export function getItemDefinition(itemId: string): ItemDefinition | undefined {
  return ITEM_REGISTRY[itemId];
}

export function getBlockDefinition(tileId: string): BlockDefinition | undefined {
  return BLOCK_REGISTRY[tileId];
}
