# Core Mechanics Specification

This document specifies the exact mechanics implemented in the game, derived from the original modpack configuration files and gameplay loop.

---

## 1. Wall Scraping / Punching Mechanics

The player starts inside an unbreakable **Solid Compact Machine Wall** (`compactmachines3:wall`) perimeter in an isometric room view. Interacting with the walls is the primary bootstrap mechanic.

> **CM3 Wall Distinction**: Solid perimeter walls (`compactmachines3:wall`) can never be broken or moved. They drop resources when hit. By contrast, crafted walls (`compactmachines3:wallbreakable`) are placed as building blocks for Miniaturization field structures.

### 1.1 Empty Hand Scraping
- **Action**: Left-click (or hold punch) against a solid perimeter wall block while holding nothing.
- **Cooldown**: 8 ticks (0.4s).
- **Health Cost**: 1 HP (half a heart) per punch.
- **Hunger Cost**: 0.6 exhaustion.
- **Health Requirement**: Minimum 1 HP remaining (player cannot kill themselves by hitting the wall; displays message: *"You are too bruised up to hit the wall any further ;C"*).
- **Drops (Weighted)**:
  - `contenttweaker:dirtdust`: 70% chance (weight 70)
  - `contenttweaker:graveldust`: 20% chance (weight 20)
  - Nothing / Miss: 10%

### 1.2 Tool-Assisted Wall Scraping
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

From the `CropDusting` mod integration:
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
- In the Hand Crafting list: Select **Dirt Block** (requires 4x `contenttweaker:dirtdust`) $\rightarrow$ produces 1x `minecraft:dirt`.

### 3.2 Rummaging Dirt
- **Action**: Right-click on a placed Dirt block with an empty hand.
- **Durability/Stage**: The dirt block tracks rummaging progress (1 to 5 clicks).
- **Drops per rummage**:
  - Small chance of `arcadialbonsaitrees:bonsai_oak_sapling` (or seeds).
  - Stones / pebbles.
- **Outcome**: On the 5th rummage, the dirt transforms into **Prepared Dirt / Tilled Soil** suitable for planting bonsai trees.

### 3.3 Bonsai Growth Mechanics
- Plant an `arcadialbonsaitrees:bonsai_oak_sapling` onto prepared dirt.
- **Growth Time**: 60 seconds base.
- **Growth Acceleration (Twerking / Sneaking)**:
  - Rapidly tapping or holding sneak while adjacent to or on the bonsai tile accelerates growth ticks by 300%.
- **Harvesting**:
  - Left-clicking a fully grown Bonsai yields:
    - 1–3 `arcadialbonsaitrees:bonsai_oak_cutting`
    - 0–1 `arcadialbonsaitrees:bonsai_oak_sapling` (seed return)
    - 0–2 `minecraft:leaves` (Bonsai leaves / foliage)
    - 0–1 `minecraft:stick`
  - The Bonsai resets to 0% growth rather than destroying the plant.
- **Wood Processing (List-Based)**:
  - Select **Oak Planks** from the crafting list (4x `bonsai_oak_cutting`) $\rightarrow$ produces 4x `minecraft:planks`.

---

## 4. Wooden Crucible, Barrels & Early Fluids

### 4.1 Wooden Crucible
- **Recipe**: Crafted from list: 7x `minecraft:planks`.
- **Function**: Melting foliage into water.
- **Input**:
  - `minecraft:leaves`: 250 mB water
  - `minecraft:sapling` / bonsai cuttings: 250 mB water
  - `minecraft:apple`: 250 mB water
  - `minecraft:wheat_seeds`: 100 mB water
- **Capacity**: 1000 mB (1 Bucket).
- **Output**: Pure `minecraft:water`. Extract using buckets or pipes.

### 4.2 Wooden Barrel
- **Recipe**: Crafted from list: 7x `minecraft:planks`.
- **Mechanics**:
  - **Clay Creation**: Fill barrel with 1000 mB Water, insert 1x `minecraft:dirt` $\rightarrow$ Wait 10 seconds $\rightarrow$ 1x `minecraft:clay` block.
  - Clay block uncrafts into 4x `minecraft:clay_ball` (from list). Smelt in a furnace into `minecraft:brick`.
  - **Sewage Creation**: Fill barrel with 1000 mB Water, insert 1x `cropdusting:poop` $\rightarrow$ transforms into 1000 mB `liquid:sewagefluid`.

---

## 5. Hammering & Comminution Chain

The Ex Nihilo Wooden Hammer smashes blocks into finer materials:

$$\text{Cobblestone} \xrightarrow{\text{Hammer}} \text{Gravel} \xrightarrow{\text{Hammer}} \text{Sand} \xrightarrow{\text{Hammer}} \text{Dust}$$

- Smashes placed blocks directly in the isometric world.
- 1x Cobblestone $\rightarrow$ 1x Gravel $\rightarrow$ 1x Sand $\rightarrow$ 1x Dust.

---

## 6. Sieve & Mesh Mechanics

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
