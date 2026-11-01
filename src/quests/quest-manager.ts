import type { Inventory } from "../core/types.ts";

export interface Quest {
  id: number;
  title: string;
  description: string;
  prerequisites: number[];
  checkCompleted: (inventory: Inventory, completedQuests: Set<number>, eventFlags?: Set<string>) => boolean;
}

export const CHAPTER_1_QUESTS: Quest[] = [
  {
    id: 142,
    title: "Stuck in a hole",
    description: "Introductory quest. You spawn in a 2x1 bedrock meteor pocket.",
    prerequisites: [],
    checkCompleted: (inv) => (inv.get("compactmachines3:psd") ?? 0) >= 1,
  },
  {
    id: 68,
    title: "The beginning?",
    description: "Right click the embedded floor machine with your PSD to shrink inside.",
    prerequisites: [142],
    checkCompleted: (_inv, completed, eventFlags) => (eventFlags?.has("ENTERED_MACHINE") ?? false),
  },
  {
    id: 13,
    title: "The real beginning",
    description: "Obtain 4x Dirt Dust by punching the solid walls.",
    prerequisites: [68],
    checkCompleted: (inv) => (inv.get("contenttweaker:dirtdust") ?? 0) >= 4,
  },
  {
    id: 20,
    title: "Getting your hands dirty",
    description: "Craft 1x Dirt from the hand-crafting list.",
    prerequisites: [13],
    checkCompleted: (inv) => (inv.get("minecraft:dirt") ?? 0) >= 1,
  },
  {
    id: 29,
    title: "Eat Poop and DON'T die",
    description: "Sneak for 5 seconds to produce poop.",
    prerequisites: [13],
    checkCompleted: (inv) => (inv.get("cropdusting:poop") ?? 0) >= 1,
  },
  {
    id: 9,
    title: "Wood's Good",
    description: "Craft a Crafting Station from 4 wood planks.",
    prerequisites: [20],
    checkCompleted: (inv) => (inv.get("craftingstation:crafting_station") ?? 0) >= 1,
  },
  {
    id: 8,
    title: "Soft Pick",
    description: "Craft a Wooden Pickaxe to harvest pebbles from the walls.",
    prerequisites: [9],
    checkCompleted: (inv) => (inv.get("minecraft:wooden_pickaxe") ?? 0) >= 1,
  },
  {
    id: 25,
    title: "All Cobbled Together",
    description: "Craft 1x Cobblestone from 4 pebbles.",
    prerequisites: [8],
    checkCompleted: (inv) => (inv.get("minecraft:cobblestone") ?? 0) >= 1,
  },
  {
    id: 28,
    title: "Chubby Pick",
    description: "Craft a Stone Pickaxe to extract metal grits from the walls.",
    prerequisites: [25],
    checkCompleted: (inv) => (inv.get("minecraft:stone_pickaxe") ?? 0) >= 1,
  },
];

export class QuestTracker {
  private completedQuests = new Set<number>();

  isCompleted(questId: number): boolean {
    return this.completedQuests.has(questId);
  }

  private eventFlags = new Set<string>();

  triggerEvent(flag: string): void {
    this.eventFlags.add(flag);
  }

  evaluateQuests(inventory: Inventory): number[] {
    const newlyCompleted: number[] = [];

    for (const quest of CHAPTER_1_QUESTS) {
      if (this.completedQuests.has(quest.id)) continue;

      const prereqsMet = quest.prerequisites.every((req) => this.completedQuests.has(req));
      if (prereqsMet && quest.checkCompleted(inventory, this.completedQuests, this.eventFlags)) {
        this.completedQuests.add(quest.id);
        newlyCompleted.push(quest.id);
      }
    }

    return newlyCompleted;
  }

  getCompletedQuestIds(): number[] {
    return Array.from(this.completedQuests);
  }
}
