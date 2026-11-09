# Core Mechanics Specification

This document specifies the exact mechanics implemented in the game, derived from upstream modpack configuration files and gameplay wikis.
For a complete listing of external documentation and source mappings, see [Wiki Backreferences](wiki-backreferences.md).

---

## 0.1 Inventory List & Quick Selection Hotbar

The player inventory is modeled as a deterministic ordered list of **36 slots**:
- **Stack Constraints**: Each slot holds an `ItemStack` (`{ id, count }`) up to the item's maximum stack size (default 64; unstackable items such as tools and PSD limit to 1). Adding items merges into existing stacks before occupying empty slots.
- **Top 9 Quick Selection**: The first 9 slots (indices 0..8) are displayed in the HUD as the quick selection hotbar. Selecting an active slot (via keys 1–9 or mouse click) equips that item for tool-assisted actions.
- **Hover Reordering Feature**: In the UI, hovering over any populated item reveals little arrow controls (▲ / ▼) to move the item stack to the very top (index 0) or bottom of the list.

---

## 0. Player Interaction & Voxel Targeting Mechanics

As detailed in the architecture specification (`canvas-architecture.md`), the 2-block-tall player character reaches into **4 distinct vertical layers** relative to their position:
- **Layer 3**: Above Head ($z_p + 2$, 9 interactable blocks)
- **Layer 2**: Upper Body ($z_p + 1$, 8 interactable blocks surrounding player)
- **Layer 1**: Lower Body ($z_p$, 8 interactable blocks surrounding player)
- **Layer 0**: Below Feet ($z_p - 1$, 9 interactable blocks)

Interactions against walls, machines, sieves, crucibles, and barrels require targeting an unblocked block in one of these 4 layers. The player selects one of the 4 layers (via layer widget, mouse wheel, or hotkeys) and then unambiguously selects the block via screen click, SVG aux reticle, or numpad keys 1–9 (unless intervening blocks obstruct physical reach).

---

## 1. Wall Scraping / Punching Mechanics

The player starts inside an unbreakable **Solid Compact Machine Wall** (`compactmachines3:wall`) perimeter in an isometric room view. Interacting with the walls is the primary bootstrap mechanic.

> **CM3 Wall Distinction**: Solid perimeter walls (`compactmachines3:wall`) can never be broken or moved. They drop resources when hit. By contrast, crafted walls (`compactmachines3:wallbreakable`) are placed as building blocks for Miniaturization field structures.

### 1.1 Empty Hand Scraping
*Backreference: [`config/scavenge/compactloot.json` (`CompactDropsEmptyHand`)](https://github.com/kamunimaximus/CompactClaustrophobia/blob/master/config/scavenge/compactloot.json)*
- **Action**: Left-click (or hold punch) against a solid perimeter wall block while holding nothing.
- **Cooldown**: 8 ticks (0.4s).
- **Health Cost**: 1 HP (half a heart) per punch (`amount: 1f`, `increase: false`).
- **Hunger Cost**: 0.6 exhaustion (`amount: 0.6f`, `exhaustion: true`).
- **Health Requirement**: Minimum 1 HP remaining (guard prevents suicide; upstream message: *"You are too bruised up to hit the wall any further ;C"*).
- **Drops (Weighted)**:
  - `contenttweaker:dirtdust`: 70% chance (weight 70)
  - `contenttweaker:graveldust`: 20% chance (weight 20)
  - Nothing / Miss: 10%

### 1.2 Tool-Assisted Wall Scraping
*Backreference: [`config/scavenge/pickdrops.json`](https://github.com/kamunimaximus/CompactClaustrophobia/blob/master/config/scavenge/pickdrops.json) and [FTB Wiki: Ex Nihilo Creatio Pebbles](https://ftbwiki.org/Ex_Nihilo_Creatio)*
Hitting the wall with tools uses tool durability (1 point per hit) and costs 0.1 exhaustion without hurting player HP. Drops vary strictly by tool tier:

| Tool Held | Cooldown | Drop Table & Weights | Notes |
| :--- | :--- | :--- | :--- |
| **Wooden Pickaxe** / Gold Pickaxe | 15 ticks | - `exnihilocreatio:item_pebble:0` (Stone): 80<br>- `exnihilocreatio:item_pebble:1` (Granite): 20<br>- `exnihilocreatio:item_pebble:2` (Diorite): 10<br>- `exnihilocreatio:item_pebble:3` (Andesite): 5 | Primary early source of stone/cobble |
| **Stone Pickaxe** | 15 ticks | - `immersiveengineering:metal:18` (Copper grit): 50<br>- `immersiveengineering:metal:11` (Iron grit): 10<br>- `immersiveengineering:metal:9` (Tin grit): 10<br>- `immersiveengineering:metal:13` (Lead grit): 10<br>- `nuclearcraft:dust:1` (Beryllium dust): 10 | Early metal source |
| **Iron Pickaxe** | 15 ticks | - `minecraft:redstone`: 15<br>- `immersiveengineering:metal:19` (Uranium grit): 5<br>- `minecraft:flint`: 1<br>- `immersiveengineering:metal:14` (Silver grit): 10<br>- `immersiveengineering:metal:12` (Nickel grit): 5 | Advanced metals & tech materials |
| **Steel Pickaxe** | 15 ticks | - `minecraft:quartz`: 10<br>- `minecraft:flint`: 5<br>- `nuclearcraft:dust:6` (Zirconium): 10<br>- `nuclearcraft:dust:7` (Molybdenum): 3<br>- `nuclearcraft:dust:5` (Thorium): 10<br>- `nuclearcraft:dust:3` (Lithium): 5<br>- `minecraft:dye:4` (Lapis Lazuli): 20 | Mid-game nuclear & chemical dusts |
| **Diamond Pickaxe** | 15 ticks | - `cttinycoal:tiny_coal`: 1200<br>- `thermalfoundation:material:71` (Electrum): 100<br>- `thermalfoundation:material:70` (Invar): 125<br>- `thermalfoundation:material:16` (Diamond Nugget): 15<br>- `bedrockminer:bedrock_chunk`: 1 | Late-game gems & bedrock |

---

## 2. Sneaking & Pooping Mechanics

*Backreference: [`config/CropDusting.cfg`](https://github.com/kamunimaximus/CompactClaustrophobia/blob/master/config/CropDusting.cfg) and [`scripts/content.zs`](https://github.com/kamunimaximus/CompactClaustrophobia/blob/master/scripts/content.zs)*
- **Trigger**: Holding the sneak key (`Shift`) while moving or standing.
- **Cooldown**: Every 30–60 seconds of sneaking (or cumulative sneak ticks).
- **Result**: Spawns 1x `cropdusting:poop` behind/beneath the player with a characteristic sound.
- **Exhaustion**: Slightly increases hunger.
- **Uses of Poop**:
  - Emergency food: Can be eaten (gives 1 hunger, gives Nausea for 5 seconds).
  - Fuel: Can be compressed into `contenttweaker:poopfuel` (burn time = 1600 ticks).
  - Liquid Sewage: Dropping poop into a water barrel converts it to `liquid:sewagefluid`.
  - Crafting: Used in sticky pistons ("Stinky Piston"), clipboards, and early organic recipes.

---

## 3. Dirt Rummaging & Bonsai Tree Growth

### 3.1 Crafting Dirt Block (List-Based)
*Backreference: [`scripts/otherrecipes.zs`](https://github.com/kamunimaximus/CompactClaustrophobia/blob/master/scripts/otherrecipes.zs)*
- In the Hand Crafting list: Select **Dirt Block** (requires 4x `contenttweaker:dirtdust`) $\rightarrow$ produces 1x `minecraft:dirt`.

### 3.2 Rummaging Dirt
*Backreference: [`config/scavenge/compactloot.json` (`DirtDropsEmptyHandRight`)](https://github.com/kamunimaximus/CompactClaustrophobia/blob/master/config/scavenge/compactloot.json) & [Minecraft Wiki: Farmland](https://minecraft.wiki/w/Farmland)*
- **Action**: Right-click on a placed Dirt block with an empty hand (`clicktype: right`, `require_empty_hand`).
- **Cooldown**: 8 ticks (`player_cooldown: 8`).
- **Tilling / Conversion Chance**: 25% chance (`consume_block: chance: 25.0`) to convert `minecraft:dirt` into `minecraft:farmland`.
- **Drops per rummage**:
  - `minecraft:wheat_seeds`: 15% chance
  - `arcadialbonsaitrees:bonsai_oak_sapling`: 15% chance
  - `arcadialbonsaitrees:bonsai_spruce_sapling`: 5% chance
  - `arcadialbonsaitrees:bonsai_birch_sapling`: 5% chance
  - `arcadialbonsaitrees:bonsai_acacia_sapling`: 5% chance
  - `arcadialbonsaitrees:bonsai_darkoak_sapling`: 2.5% chance
  - `arcadialbonsaitrees:bonsai_jungle_sapling`: 0.5% chance
  - `immersiveengineering:seed` (Industrial Hemp): 2% chance

### 3.3 Bonsai Growth Mechanics
*Backreference: [FTB Wiki: Bonsai Trees](https://ftbwiki.org/Bonsai_Trees) & [`scripts/bonsai.zs`](https://github.com/kamunimaximus/CompactClaustrophobia/blob/master/scripts/bonsai.zs)*
- Plant an `arcadialbonsaitrees:bonsai_oak_sapling` onto prepared dirt (`minecraft:farmland`).
- **Growth Time**: 60 seconds base (1200 ticks at 20 Hz).
- **Growth Acceleration (Twerking / Sneaking)**:
  - Rapidly tapping or holding sneak while adjacent to or on the bonsai tile accelerates growth ticks by 4x (+3 bonus ticks per real tick).
- **Harvesting**:
  - Left-clicking a fully grown Bonsai yields:
    - 1–3 `arcadialbonsaitrees:bonsai_oak_cutting`
    - 0–2 `minecraft:leaves` (Bonsai leaves / foliage)
    - 0–1 `minecraft:stick`
  - The Bonsai resets to stage 0 growth in place without returning the planted sapling to inventory (breaking an immature bonsai drops the sapling).
- **Wood Processing (List-Based)**:
  - Select **Oak Planks** from the crafting list (4x `bonsai_oak_cutting`) $\rightarrow$ produces 4x `minecraft:planks` (derived from `scripts/bonsai.zs`).

---

## 4. Wooden Crucible, Barrels & Early Fluids

### 4.1 Wooden Crucible
*Backreference: [FTB Wiki: Wooden Crucible](https://ftbwiki.org/Crucible_(Ex_Nihilo_Creatio)) & [`scripts/otherrecipes.zs`](https://github.com/kamunimaximus/CompactClaustrophobia/blob/master/scripts/otherrecipes.zs)*
- **Recipe**: Crafted from list: 7x `minecraft:planks` (or 4 planks + 1 wood slab + 2 sticks per Ex Nihilo).
- **Function**: Melting foliage into water.
- **Input**:
  - `minecraft:leaves`: 250 mB water
  - `minecraft:sapling` / bonsai cuttings: 250 mB water
  - `minecraft:apple`: 250 mB water
  - `minecraft:wheat_seeds`: 100 mB water
- **Capacity**: 1000 mB (1 Bucket).
- **Output**: Pure `minecraft:water`. Extract using buckets or pipes.

### 4.2 Wooden Barrel
*Backreference: [FTB Wiki: Wooden Barrel](https://ftbwiki.org/Wooden_Barrel_(Ex_Nihilo_Creatio)) & [`scripts/inworld.zs`](https://github.com/kamunimaximus/CompactClaustrophobia/blob/master/scripts/inworld.zs)*
- **Recipe**: Crafted from list: 7x `minecraft:planks`.
- **Mechanics**:
  - **Clay Creation**: Fill barrel with 1000 mB Water, insert 1x `minecraft:dirt` $\rightarrow$ Wait 10 seconds $\rightarrow$ 1x `minecraft:clay` block.
  - Clay block uncrafts into 4x `minecraft:clay_ball` (from list via `scripts/recipes.zs`). Smelt in a furnace into `minecraft:brick`.
  - **Sewage Creation**: Fill barrel with 1000 mB Water, insert 1x `cropdusting:poop` $\rightarrow$ transforms into 1000 mB `liquid:sewagefluid` (via `scripts/inworld.zs: FluidToFluid.transform(<liquid:sewagefluid>, <liquid:water>, [<cropdusting:poop>])`).

---

## 5. Hammering & Comminution Chain

*Backreference: [FTB Wiki: Ex Nihilo Hammer](https://ftbwiki.org/Hammer_(Ex_Nihilo_Creatio)) & [`scripts/inworld.zs`](https://github.com/kamunimaximus/CompactClaustrophobia/blob/master/scripts/inworld.zs)*

The Ex Nihilo Wooden Hammer smashes blocks into finer materials:

$$\text{Cobblestone} \xrightarrow{\text{Hammer}} \text{Gravel} \xrightarrow{\text{Hammer}} \text{Sand} \xrightarrow{\text{Hammer}} \text{Dust}$$

- Smashes placed blocks directly in the isometric world.
- 1x Cobblestone $\rightarrow$ 1x Gravel $\rightarrow$ 1x Sand $\rightarrow$ 1x Dust.

---

## 6. Sieve & Mesh Mechanics

*Backreference: [FTB Wiki: Ex Nihilo Sieve](https://ftbwiki.org/Sieve_(Ex_Nihilo_Creatio)) & [`scripts/otherrecipes.zs`](https://github.com/kamunimaximus/CompactClaustrophobia/blob/master/scripts/otherrecipes.zs)*

The Wooden Sieve holds a mesh and processes bulk material into raw ore chunks, seeds, and mineral powders.

### 6.1 Mesh Types (Crafted from list)
1. **String Mesh** (`exnihilocreatio:item_mesh:1`): 9x String.
2. **Flint Mesh** (`exnihilocreatio:item_mesh:2`): String mesh + 6x Flint.
3. **Iron Mesh** (`exnihilocreatio:item_mesh:3`): Flint mesh + 6x Iron Ingot.
4. **Diamond Mesh** (`exnihilocreatio:item_mesh:4`): Iron mesh + 6x Diamond Nugget.

### 6.2 Key Sifting Tables (String Mesh)
- **Sifting Gravel**:
  - Iron Ore Piece: 15%
  - Copper Ore Piece: 15%
  - Tin Ore Piece: 10%
  - Lead Ore Piece: 10%
  - Flint: 25%
  - Coal Piece: 12%
- **Sifting Sand**:
  - Crushed Quartz: 10%
  - Bone Meal: 15%
  - Cocoa Beans / Seeds: 5%
- **Sifting Dust**:
  - Bone Meal: 20%
  - Gunpowder: 7%
  - Redstone: 12%
  - Glowstone Dust: 6%

*Note on Ore Pieces: 4x Ore Pieces are combined via the list crafting menu into 1x Raw Ore Chunk, which is smelted in a furnace into 1x Ingot.*

---

## 7. Auto-Clickers & Automation Early Game

Because manual wall punching and sieving are physically taxing:
- **Click Machine / Auto Clicker**:
  - Placed on the isometric floor facing a target tile (such as a Solid Wall or Sieve).
  - Can hold a tool (e.g. Wooden Pickaxe, Hammer).
  - Configurable click speed: 1 to 20 clicks/sec.
  - Automatically punches the wall, respects tool durability, and drops loot into adjacent hoppers or floor.
- **Hoppers & Uppers**:
  - Standard hoppers pull items downward.
  - Uppers pull items and push upwards (crucial for vertical space efficiency in 3x3 rooms).
