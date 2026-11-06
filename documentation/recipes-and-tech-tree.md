# Recipes & Tech Tree Reference

This document catalogs the exact recipes, item conversions, and processing steps in *Compact Claustrophobia*.
For comprehensive links to wikis and upstream configuration scripts, see [Wiki Backreferences](wiki-backreferences.md).

> **Design Choice Reminder**: In accordance with our architecture specification, crafting in the Canvas edition **does not use Minecraft's 2x2 or 3x3 spatial placement grids**. Instead, all crafting is performed from a **searchable, categorized list**. As long as the player carries the required input items (or is adjacent to a Crafting Station with linked containers), selecting the recipe produces the output.

---

## 1. List-Based Hand & Workbench Crafting Recipes

### 1.1 Hand Crafting (No Workbench Required)
*Backreferences: [`scripts/otherrecipes.zs`](https://github.com/kamunimaximus/CompactClaustrophobia/blob/master/scripts/otherrecipes.zs), [`scripts/recipes.zs`](https://github.com/kamunimaximus/CompactClaustrophobia/blob/master/scripts/recipes.zs), [`scripts/bonsai.zs`](https://github.com/kamunimaximus/CompactClaustrophobia/blob/master/scripts/bonsai.zs)*

| Recipe Name | Inputs | Outputs | Description / Category |
| :--- | :--- | :--- | :--- |
| **Dirt Block** | 4x `contenttweaker:dirtdust` | 1x `minecraft:dirt` | Basic Survival. Compressed from wall dust. |
| **Cobblestone** | 4x `exnihilocreatio:item_pebble:0` (Stone) | 1x `minecraft:cobblestone` | Basic Survival. Formed from wall pebbles. |
| **Oak Planks** | 4x `arcadialbonsaitrees:bonsai_oak_cutting` | 4x `minecraft:planks` | Basic Survival. Processed bonsai wood. |
| **Crafting Station** | 4x `minecraft:planks` | 1x `craftingstation:crafting_station` | Basic Survival. Unlocks advanced list recipes. |
| **Sticks** | 2x `minecraft:planks` | 4x `minecraft:stick` | Basic Survival. Handles and tool rods. |
| **Ore Chunk (Iron)** | 4x Iron Ore Piece | 1x Raw Iron Chunk | Metallurgy. Formed from 4 sifted ore pieces. |
| **Ore Chunk (Copper)** | 4x Copper Ore Piece | 1x Raw Copper Chunk | Metallurgy. Formed from 4 sifted ore pieces. |
| **Ore Chunk (Tin)** | 4x Tin Ore Piece | 1x Raw Tin Chunk | Metallurgy. Formed from 4 sifted ore pieces. |
| **Ore Chunk (Lead)** | 4x Lead Ore Piece | 1x Raw Lead Chunk | Metallurgy. Formed from 4 sifted ore pieces. |
| **Poop Fuel** | 1x `cropdusting:poop` | 1x `contenttweaker:poopfuel` | Organic. Burn time = 1600 ticks (smelts 8 items). |
| **Poop & Stick Book** | 1x `minecraft:book`, 1x `cropdusting:poop`, 1x `minecraft:stick` | 1x Writable Book ("Poop & Stick") | Quests. |
| **Stinky Piston** | 1x `minecraft:piston`, 1x `cropdusting:poop` | 1x `minecraft:sticky_piston` | Machinery / Redstone. |
| **Clipboard** | 1x `cropdusting:poop`, 1x `minecraft:stick`, 1x `minecraft:paper`, 1x `minecraft:wooden_pressure_plate` | 1x `clipboard:clipboard` | Utility. |

---

### 1.2 Crafting Station Recipes (Requires Proximity to Crafting Station)
*Backreferences: [`scripts/recipes.zs`](https://github.com/kamunimaximus/CompactClaustrophobia/blob/master/scripts/recipes.zs), [FTB Wiki: Ex Nihilo Creatio](https://ftbwiki.org/Ex_Nihilo_Creatio)*

| Recipe Name | Inputs | Outputs | Category / Notes |
| :--- | :--- | :--- | :--- |
| **Wooden Pickaxe** | 3x `minecraft:planks`, 2x `minecraft:stick` | 1x `minecraft:wooden_pickaxe` | Tools. Strikes solid walls for stone pebbles. |
| **Stone Pickaxe** | 3x `minecraft:cobblestone`, 2x `minecraft:stick` | 1x `minecraft:stone_pickaxe` | Tools. Strikes solid walls for metal grits. |
| **Ex Nihilo Wooden Hammer** | 2x `minecraft:planks`, 2x `minecraft:stick` | 1x `exnihilocreatio:hammer_wood` | Tools. Smashes blocks in comminution chain. |
| **Ex Nihilo Wooden Sieve** | 5x `minecraft:planks`, 2x `minecraft:stick` | 1x `exnihilocreatio:block_sieve` | Machinery. Sifts gravel, sand, and dust. |
| **Wooden Crucible** | 7x `minecraft:planks` | 1x `exnihilocreatio:block_crucible_wood` | Fluid. Melts foliage/organic matter into water. |
| **Wooden Barrel** | 7x `minecraft:planks` | 1x `exnihilocreatio:block_barrel_wood` | Fluid. Converts water + dirt $\rightarrow$ clay, water + poop $\rightarrow$ sewage. |
| **String Mesh** | 9x `minecraft:string` | 1x `exnihilocreatio:item_mesh:1` | Machinery / Sieve upgrade. |
| **Flint Mesh** | 1x `exnihilocreatio:item_mesh:1`, 6x `minecraft:flint` | 1x `exnihilocreatio:item_mesh:2` | Machinery / Sieve upgrade. |
| **Iron Mesh** | 1x `exnihilocreatio:item_mesh:2`, 6x `minecraft:iron_ingot` | 1x `exnihilocreatio:item_mesh:3` | Machinery / Sieve upgrade. |
| **Diamond Mesh** | 1x `exnihilocreatio:item_mesh:3`, 6x `thermalfoundation:material:16` (Diamond Nugget) | 1x `exnihilocreatio:item_mesh:4` | Machinery / Sieve upgrade. |
| **Click Machine (Auto-Clicker)** | 4x `minecraft:cobblestone`, 2x `minecraft:redstone`, 1x `minecraft:piston`, 1x `minecraft:chest` | 1x `clickmachine:auto_clicker` | Automation. |
| **Hopper** | 5x `minecraft:iron_ingot`, 1x `minecraft:chest` | 1x `minecraft:hopper` | Logistics. |
| **Upper** | 5x `minecraft:iron_ingot`, 1x `minecraft:hopper` | 1x `uppers:upper` | Logistics. Pushes items upwards. |

---

## 2. Comminution (Hammer Smash Table)

Smashing a placed block with any tier of Hammer converts it down the particle scale:

$$\text{Cobblestone} \xrightarrow{\text{Hammer}} \text{Gravel} \xrightarrow{\text{Hammer}} \text{Sand} \xrightarrow{\text{Hammer}} \text{Dust}$$

| Input Block | Output Item / Block | Tool Used |
| :--- | :--- | :--- |
| `minecraft:cobblestone` | 1x `minecraft:gravel` | Any Hammer |
| `minecraft:gravel` | 1x `minecraft:sand` | Any Hammer |
| `minecraft:sand` | 1x `exnihilocreatio:block_dust` | Any Hammer |
| `minecraft:stone:1` (Granite) | 1x `exnihilocreatio:block_granite_crushed` | Any Hammer |
| `minecraft:stone:3` (Diorite) | 1x `exnihilocreatio:block_diorite_crushed` | Any Hammer |
| `exnihilocreatio:block_diorite_crushed` | 1x `exnihilocreatio:block_dust` | Any Hammer |

---

## 3. Smelting & Furnace Recipes

Standard furnace smelting:

| Input Item | Output Item | Burn / Processing |
| :--- | :--- | :--- |
| 1x `minecraft:sand` | 1x `minecraft:glass` | Standard heat |
| 1x `minecraft:clay_ball` | 1x `minecraft:brick` | Standard heat |
| 1x Raw Iron Chunk (or 4x Iron Grit) | 1x `minecraft:iron_ingot` | Standard heat |
| 1x Raw Copper Chunk (or 4x Copper Grit) | 1x `thermalfoundation:material:128` (Copper Ingot) | Standard heat |
| 1x Raw Tin Chunk (or 4x Tin Grit) | 1x `thermalfoundation:material:129` (Tin Ingot) | Standard heat |
| 1x Raw Lead Chunk (or 4x Lead Grit) | 1x `thermalfoundation:material:131` (Lead Ingot) | Standard heat |
| 1x `minecraft:cobblestone` | 1x `minecraft:stone` | Standard heat |

---

## 4. In-World Fluid Reactions (`inworld.zs`)

Performed by dropping items into fluid pools/barrels or mixing fluids:

### Fluid-to-Item Transformations:
1. **Sewage + Dust $\rightarrow$ Slag**:
   - `liquid:sewagefluid` (in barrel/world) + 1x `exnihilocreatio:block_dust` $\rightarrow$ 2x `thermalfoundation:material:772` (Slag)
2. **Sewage + Paper $\rightarrow$ Prestoff**:
   - `liquid:sewagefluid` + 1x `minecraft:paper` $\rightarrow$ 1x `contenttweaker:prestoff`
3. **Sewage + Compact Machine $\rightarrow$ Glitched Machine**:
   - `liquid:sewagefluid` + 1x `compactmachines3:machine` $\rightarrow$ 1x `contenttweaker:glitched0`
4. **Sewage + PSD $\rightarrow$ Corrupt PSD**:
   - `liquid:sewagefluid` + 1x `compactmachines3:psd` $\rightarrow$ 1x `contenttweaker:corruptpsd`
5. **Water + Bonsai Sapling $\rightarrow$ Real Sapling**:
   - `liquid:water` + 1x `arcadialbonsaitrees:bonsai_oak_sapling` $\rightarrow$ 1x `minecraft:sapling` (oak)

### Fluid-to-Fluid Transformations:
1. **Water + Poop $\rightarrow$ Sewage**:
   - 1000 mB `liquid:water` + 1x `cropdusting:poop` $\rightarrow$ 1000 mB `liquid:sewagefluid`
2. **Sewage + Dust $\rightarrow$ Purified Water**:
   - 1000 mB `liquid:sewagefluid` + 1x `exnihilocreatio:block_dust` $\rightarrow$ 1000 mB `liquid:water`
3. **Water + Dirt Block $\rightarrow$ Clay Block**:
   - 1000 mB `liquid:water` + 1x `minecraft:dirt` $\rightarrow$ 1x `minecraft:clay` (after 10s reaction)

---

## 5. Modular Compactor Recipes (`modularmachinery`)

The Modular Compactor is powered by 16 RF/tick and fabricates breakable compact walls and compressed carbon:

### 5.1 Recipe: Compact Machine Wall (`compactor_tiny_compact_machine`)
- **Machine**: `compactor` (Modular Compactor multiblock)
- **Time**: 100 ticks (5.0s)
- **Energy**: 16 RF/tick (Total 1,600 RF)
- **Inputs**:
  - 4x `modularmachinery:itemmodularium` (Modularium Ingot)
- **Outputs**:
  - 1x `compactmachines3:wallbreakable` (Compact Machine Wall)
- *Note*: This is the fundamental block used to build Miniaturization structures for all Compact Machines.

### 5.2 Recipe: High Impact Diamond Nugget
- **Machine**: `high_impact_compactor`
- **Time**: 200 ticks (10.0s)
- **Energy**: 64 RF/tick
- **Inputs**:
  - 8x `thermalfoundation:material:801` (Charcoal Dust)
- **Outputs**:
  - 1x `thermalfoundation:material:16` (Diamond Nugget)

---

## 6. Compact Machines 3 Miniaturization Field Recipes

Miniaturization crafting is performed inside the field projected by 4 **Miniaturization Field Projectors** (`compactmachines3:fieldprojector`). A multiblock structure is constructed inside the field and an **Ender Pearl catalyst** is dropped into the center to trigger miniaturization.

### 6.1 Tiny Compact Machine (3x3x3 Room)
- **Target Item**: `compactmachines3:machine` (meta 0, Tiny)
- **Duration**: 400 ticks (20 seconds)
- **Catalyst**: 1x `minecraft:ender_pearl`
- **Structure (3x3x3 Hollow Cube)**:
  - Outer: 26x `compactmachines3:wallbreakable`
  - Center: 1x Air / Empty
  - Total Walls: 26x `compactmachines3:wallbreakable`

### 6.2 Small Compact Machine (5x5x5 Room)
- **Target Item**: `compactmachines3:machine` (meta 1, Small)
- **Duration**: 440 ticks (22 seconds)
- **Catalyst**: 1x `minecraft:ender_pearl`
- **Structure (3x3x3 Solid Shell with Core)**:
  - Outer: 26x `compactmachines3:wallbreakable`
  - Center: 1x `minecraft:iron_block`

### 6.3 Normal Compact Machine (7x7x7 Room)
- **Target Item**: `compactmachines3:machine` (meta 2, Normal)
- **Duration**: 480 ticks (24 seconds)
- **Catalyst**: 1x `minecraft:ender_pearl`
- **Structure (3x3x3 Shell with Gold Core)**:
  - Outer: 26x `compactmachines3:wallbreakable`
  - Center: 1x `minecraft:gold_block`

### 6.4 Large Compact Machine (9x9x9 Room)
- **Target Item**: `compactmachines3:machine` (meta 3, Large)
- **Duration**: 520 ticks (26 seconds)
- **Catalyst**: 1x `minecraft:ender_pearl`
- **Structure (5x5x5 Hollow Cube)**:
  - 5x5x5 hollow box composed of 98x `compactmachines3:wallbreakable` with a 3x3x3 empty interior.

### 6.5 Giant Compact Machine (11x11x11 Room)
- **Target Item**: `compactmachines3:machine` (meta 4, Giant)
- **Duration**: 1000 ticks (50 seconds)
- **Catalyst**: 1x `minecraft:ender_pearl`
- **Structure**:
  - `compactmachines3:wallbreakable` casing
  - 6x `contenttweaker:glitched3`
  - 1x `modularmachinery:blockcasing` (Machine Casing)

### 6.6 Maximum Compact Machine (13x13x13 Room)
- **Target Item**: `compactmachines3:machine` (meta 5, Maximum)
- **Duration**: 1000 ticks (50 seconds)
- **Catalyst**: 1x `minecraft:ender_pearl`
- **Structure**:
  - `compactmachines3:wallbreakable` casing
  - 6x `contenttweaker:glitched4`
  - 1x `modularmachinery:blockcasing` (Machine Casing)

### 6.7 Tunnel Tools Crafting
Tunnel tools are also crafted via the Miniaturization Field:
- **Tunnel Tool (`compactmachines3:tunneltool`)**:
  - Duration: 200 ticks
  - Structure: 8x Redstone Wire surrounding 1x `compactmachines3:wallbreakable` base, with 1x `minecraft:hopper` above center.
  - Output: 2x `compactmachines3:tunneltool`
- **Redstone Tunnel Tool (`compactmachines3:redstonetunneltool`)**:
  - Duration: 200 ticks
  - Structure: 8x Redstone Wire surrounding 1x `compactmachines3:wallbreakable` base, with 1x `minecraft:redstone_block` above center.
  - Output: 2x `compactmachines3:redstonetunneltool`
