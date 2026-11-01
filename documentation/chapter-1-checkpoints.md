# Chapter 1 Checkpoints: Vertical Slice Roadmap

This document specifies the internal subcheckpoints for completing **Chapter 1: Compact Claustrophobia (The Beginning)** within the 2D isometric canvas engine.

In adherence to the **"Go Tall, Not Wide"** development policy:
- No features or systems from Chapter 2, 3, or 4 will be implemented until Chapter 1 is fully completed, tested, and playable.
- Development proceeds sequentially through the subcheckpoints defined below. Each subcheckpoint delivers an end-to-end, testable vertical slice that integrates game simulation, state transitions, list-based crafting unlocks, and isometric rendering updates.

---

## Roadmap Overview

| Subcheckpoint | Name | Core Themes & Focus | Key Quest IDs | Status |
| :--- | :--- | :--- | :--- | :--- |
| **1.1** | **Walking & Personal Shrinking Device** | Outer Room geometry, player movement, collision, PSD room transition, camera centering & cutaway | #142, #68 | **Complete** |
| **1.2** | **Path to Wood & Wooden Items** | Wall punching, health/hunger costs, dirt dust, sneak-pooping, list crafting dirt block, soil rummaging, initial bonsai saplings, planks, crafting station, sticks | #13, #20, #29, #30, #32, #9 | **Next** |
| **1.3** | **Farming (Bonsai, Soil & Fibers)** | Soil preparation stages, bonsai growth tick lifecycle, twerk/sneak acceleration, foliage/cutting yields, industrial hemp cultivation, string processing, organic composting | #20, #32, #72, #71 | Planned |
| **1.4** | **Mining & Comminution** | Tool-tier wall scraping (bare hands, wooden pick, stone pick), in-world block placing & breaking, Ex Nihilo hammer comminution chain (Cobble $\rightarrow$ Gravel $\rightarrow$ Sand $\rightarrow$ Dust) | #8, #25, #28, #17, #22, #21 | Planned |
| **1.5** | **Sieving (A Dedicated Topic)** | Wooden Sieve block entity, mesh tier progression (string to diamond), substrate comminution processing, probabilistic loot tables, ore piece combination into raw chunks, click interactions & auto-clicker integration | #78, #77, #70 | Planned |
| **1.6** | **Smelting & Pyrometallurgy** | Furnace block entity, fuel combustion systems (poop fuel, charcoal, coal pieces), temperature/burn ticks, smelting sand to glass, clay to bricks, cobblestone to stone, ore chunks/grits to ingots | #30, #31, #48, #17 | Planned |
| **1.7** | **Early Fluids, Barrels & Clay** | Wooden Crucible foliage melting to water, Wooden Barrel in-world fluid reactions (water + dirt $\rightarrow$ clay, water + poop $\rightarrow$ sewage, sewage + dust $\rightarrow$ slag), bucket fluid handling | #27, #19, #12, #18 | Planned |
| **1.8** | **Automation, Compactor & Miniaturization** | Click Machine automation, hoppers/uppers vertical routing, NuclearCraft Decay Generator (16 RF/t), Modular Compactor multiblock assembly, Modularium compression to breakable walls, Miniaturization Field Projectors (Tiny Compact Machine crafting) | #14, #24, #23, #10 | Planned (Chapter 1 Final) |

---

## Subcheckpoint 1.1: Walking & Personal Shrinking Device [COMPLETED]

### Objective & Scope
Establish the spatial world foundation: spawn in the Overworld Meteor pocket (Outer Room 2x1 footprint with asymmetrical heights 4 and 5), walk between coordinates, and use the Personal Shrinking Device (PSD) to shrink into the 3x3x3 interior of the starting Compact Machine (`room_tiny_1`).

### Deliverables Completed
- `src/world/room.ts`: Room geometry models for `outer_room` and `room_tiny_1`, including perimeter wall bounds and collision detection.
- `src/core/engine.ts`: 20 Hz tick loop, deterministic input queue, player movement actions (`MOVE`), and PSD transitions (`USE_PSD`).
- `src/render/renderer.ts`: 2:1 dimetric isometric projection, camera viewport centering on rooms, depth sorting `(x + y) * K + z`, and cutaway rendering of foreground walls for visibility inside enclosed rooms.
- `test/subcheckpoint11.test.ts`: Automated tests covering out-of-bounds checks, walking between columns, two-way PSD transitions, and cutaway command reduction.

---

## Subcheckpoint 1.2: Path to Wood & Wooden Items

### Objective & Scope
Implement the resource bootstrapping chain: harvesting initial dust by punching walls, producing biological matter through sneaking, crafting the first dirt block, rummaging dirt for seeds/saplings, establishing the first wood harvest, and unlocking the Crafting Station.

### User Stories & Player Loop
1. As a trapped player inside `room_tiny_1`, I hit the solid perimeter wall (`compactmachines3:wall`) with bare hands to harvest `contenttweaker:dirtdust` and `contenttweaker:graveldust` at the expense of player health and hunger.
2. When my health drops to 1 HP (half a heart), the engine prevents further self-harm and notifies me to rest.
3. Sneaking continuously for 100 ticks (5 seconds) produces `cropdusting:poop`, which I can eat as emergency sustenance or craft into `contenttweaker:poopfuel`.
4. Using the **List Crafting Interface** (hand crafting tab), I combine 4x `contenttweaker:dirtdust` into 1x `minecraft:dirt`.
5. I place the Dirt block on the floor and right-click with an empty hand to rummage it. Rummaging yields pebbles and a chance for an `arcadialbonsaitrees:bonsai_oak_sapling`.
6. Planting the sapling on prepared dirt and twerking/sneaking grows an oak bonsai. Harvesting yields `arcadialbonsaitrees:bonsai_oak_cutting`, leaves, and sticks.
7. From the hand crafting list, I convert 4x bonsai cuttings into 4x `minecraft:planks`, craft `minecraft:stick`, and craft the `craftingstation:crafting_station`.
8. Placing the Crafting Station unlocks Workbench-tier recipes from the list.

### Mechanics & Systems to Implement
- **Punch Action (`PUNCH_WALL`)**:
  - Targets an adjacent perimeter wall in one of the 4 vertical interaction layers.
  - Cooldown: 8 ticks (0.4s).
  - Health cost: 1 HP (0.5 heart). Exhaustion: 0.6. Safety guard at $\le 1$ HP.
  - Loot roll: 70% `dirtdust`, 20% `graveldust`, 10% miss.
- **Hunger & Health Regeneration**:
  - 20 HP, 20 Hunger, saturation tracking.
  - Eating poop: restores 1 Hunger, inflicts Nausea status effect for 100 ticks.
- **Rummage Action (`RUMMAGE_DIRT`)**:
  - Block state tracking for placed dirt: rummage count (0 to 5 clicks).
  - Drops: 1x Stone pebble or small chance of `bonsai_oak_sapling`.
  - On 5th rummage: dirt tile transforms to `prepared_dirt`.
- **List Crafting Hand Recipes**:
  - `4x dirtdust -> 1x minecraft:dirt`
  - `4x bonsai_oak_cutting -> 4x minecraft:planks`
  - `2x minecraft:planks -> 4x minecraft:stick`
  - `4x minecraft:planks -> 1x craftingstation:crafting_station`
  - `1x cropdusting:poop -> 1x contenttweaker:poopfuel`

### Quests Completed
- Quest #13: "The Real Beginning" (Obtain 4x Dirt Dust)
- Quest #29: "Eat Poop and DON'T die" (Sneak to poop, eat or compress)
- Quest #30: "Burn the Rest" (Craft Poop Fuel)
- Quest #20: "Getting your hands dirty" (Craft Dirt & rummage)
- Quest #32: "Home grown wood" (Obtain Bonsai Oak Sapling & cuttings)
- Quest #9: "Wood's Good" (Craft Crafting Station & Planks)

### Acceptance Criteria & Tests
- [ ] Bare-hand wall punching drops dirt dust with correct probability and decrements health down to minimum 1 HP.
- [ ] Consecutive sneaking generates poop entity/item deterministically every 100 ticks.
- [ ] Placed dirt block tracks 5-step rummaging state, drops items, and transforms into prepared dirt.
- [ ] Bonsai cutting to plank conversion and Crafting Station hand-crafting pass verification without spatial grid requirements.

---

## Subcheckpoint 1.3: Farming (Bonsai, Soil & Fibers)

### Objective & Scope
Build out the renewable agricultural simulation: oak bonsai tree lifecycles, growth acceleration mechanics, foliage and cutting yields, industrial hemp cultivation from rummaged seeds, string processing, and organic composting.

### Key Gameplay Mechanics
1. **Bonsai Agriculture Lifecycle**:
   - Placed onto `prepared_dirt` or `tilled_soil`.
   - Base maturation duration: 1200 ticks (60.0 seconds at 20 Hz).
   - Growth stages: 0% (sapling) $\rightarrow$ 33% (sprout) $\rightarrow$ 66% (bushy) $\rightarrow$ 100% (mature bonsai tree).
   - Twerking / Sneaking acceleration: Each tick a player sneaks adjacent to or on the bonsai block advances growth by +3 additional ticks (4x total speed).
   - Harvest interaction: Right-click or punch mature bonsai resets growth to 0% and drops:
     - 1–3x `arcadialbonsaitrees:bonsai_oak_cutting`
     - 0–2x `minecraft:leaves`
     - 0–1x `minecraft:stick`
     - 5% chance of bonus `bonsai_oak_sapling`
2. **Industrial Hemp Farming**:
   - Dirt rummaging has a 10% chance to drop `immersiveengineering:seed` (Industrial Hemp Seed).
   - Planted on hydrated/prepared dirt.
   - Growth: Grows to a 2-block tall crop. Breaking the upper block yields 1–2x `immersiveengineering:material:4` (Hemp Fiber) while keeping the base plant alive.
   - 3x Hemp Fiber crafts into 1x `minecraft:string` (hand crafting list).
3. **Organic Matter & Composting**:
   - Foliage, extra seeds, and excess cuttings provide organic materials for water creation in crucibles and composting in barrels.

### Quests Completed
- Quest #72: "Hemp It Up" (Acquire Hemp Seeds from dirt)
- Quest #71: "String Theory" (Craft String from Hemp Fiber)

### Acceptance Criteria & Tests
- [ ] Bonsai plant updates state from 0% to 100% over 1200 ticks at normal speed, and under 300 ticks when sneaking.
- [ ] Harvesting resets tree growth without destroying the base tile and adds cuttings/leaves to inventory.
- [ ] Hemp crop grows to height 2; harvesting top block leaves root intact.
- [ ] Hemp fiber to string crafting functions seamlessly in the recipe catalog.

---

## Subcheckpoint 1.4: Mining & Comminution

### Objective & Scope
Implement the full mining and mineral extraction loop: tool-tier wall scraping, tool durability, block placement and breaking in isometric 3D space, and the Ex Nihilo hammer comminution chain.

### Tool-Tier Wall Scraping Architecture
When striking perimeter walls (`compactmachines3:wall`) with tools, drops transition from dust to stones, metals, and rare ores:

| Tool Held | Hit Cost | Cooldown | Loot Drop Table |
| :--- | :--- | :--- | :--- |
| **Wooden Pickaxe** | 1 Durability, 0.1 Exh | 15 ticks | 80% Stone Pebble (`exnihilocreatio:item_pebble:0`), 20% Granite, Diorite, Andesite |
| **Stone Pickaxe** | 1 Durability, 0.1 Exh | 15 ticks | 50% Copper Grit, 10% Iron Grit, 10% Tin Grit, 10% Lead Grit, 10% Beryllium Dust |
| **Iron Pickaxe** | 1 Durability, 0.1 Exh | 15 ticks | Redstone, Uranium Grit, Silver Grit, Nickel Grit, Flint |

### Hammer Comminution Chain
The player crafts an **Ex Nihilo Wooden Hammer** (`exnihilocreatio:hammer_wood`) at the Crafting Station. Hitting placed blocks in the isometric world smashes them into successively finer granular materials:

$$\text{Cobblestone} \xrightarrow{\text{Hammer}} \text{Gravel} \xrightarrow{\text{Hammer}} \text{Sand} \xrightarrow{\text{Hammer}} \text{Dust}$$

- Cobblestone smashed $\rightarrow$ 1x Gravel (`minecraft:gravel`).
- Gravel smashed $\rightarrow$ 1x Sand (`minecraft:sand`).
- Sand smashed $\rightarrow$ 1x Dust (`exnihilocreatio:block_dust`).
- Granite smashed $\rightarrow$ Crushed Granite; Diorite smashed $\rightarrow$ Crushed Diorite.
- Durability: Wooden hammer has 60 durability; each smash expends 1 durability.

### Quests Completed
- Quest #8: "Soft Pick" (Craft Wooden Pickaxe from list)
- Quest #25: "All Cobbled Together" (Craft Cobblestone from 4 pebbles)
- Quest #28: "Chubby Pick" (Craft Stone Pickaxe)
- Quest #17: "Heavy Metal" (Acquire Iron grit from stone pickaxe wall scraping)
- Quest #22: "Hammer Time!... sigh.." (Craft Ex Nihilo Wooden Hammer)
- Quest #21: "Coarse'n'Everywhere" (Smash Cobble to Gravel, Sand, and Dust)

### Acceptance Criteria & Tests
- [ ] Wooden pickaxe wall hits decrement tool durability without draining player health, yielding pebbles.
- [ ] 4x Stone pebbles craft into 1x Cobblestone in the list crafting menu.
- [ ] Stone pickaxe wall hits yield metal grits (Iron, Copper, Tin, Lead).
- [ ] Smashed placed Cobblestone block replaces tile with Gravel, Gravel with Sand, and Sand with Dust block.
- [ ] Hammer tool breaks when durability reaches 0.

---

## Subcheckpoint 1.5: Sieving (A Topic of Its Own)

### Objective & Scope
Develop the Ex Nihilo Sieving system as a standalone, deep mechanical subsystem. Sieving is the primary industrial throughput bottleneck in Chapter 1, responsible for transforming bulk granular materials into technological ores, redstone, and mineral powders.

### Core Architecture & State Model
1. **Wooden Sieve Block Entity (`exnihilocreatio:block_sieve`)**:
   - Footprint: 1x1 block placed on the room floor.
   - Internal State:
     - `installedMesh`: `null | StringMesh | FlintMesh | IronMesh | DiamondMesh`
     - `substrate`: `null | "minecraft:gravel" | "minecraft:sand" | "exnihilocreatio:block_dust"`
     - `progress`: 0 to 100% (incremented per sift click or automated tick)
     - `meshDurability`: Current durability of the installed mesh.
2. **Mesh Tier Progression & Crafting**:
   - **String Mesh** (`item_mesh:1`): 9x String. (Base tier).
   - **Flint Mesh** (`item_mesh:2`): 1x String Mesh + 6x Flint.
   - **Iron Mesh** (`item_mesh:3`): 1x Flint Mesh + 6x Iron Ingot.
   - **Diamond Mesh** (`item_mesh:4`): 1x Iron Mesh + 6x Diamond Nugget.
   - Meshes can be inserted into or extracted from placed sieves via right-click with an empty hand or tool.
3. **Comminution Substrate Loot Tables (String Mesh)**:
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
4. **Ore Aggregation Mechanics**:
   - Sifting yields individual **Ore Pieces** (e.g. Iron Ore Piece).
   - In the List Crafting menu (Hand Crafting): 4x identical Ore Pieces combine into 1x **Raw Ore Chunk** (e.g. 4x Iron Ore Piece $\rightarrow$ 1x Raw Iron Chunk).
   - Raw Ore Chunks are then smelted into full ingots in a furnace.
5. **Multi-Sieve Clustering & Auto-Clicker Compatibility**:
   - In 3x3 rooms, manual clicking on 1 sieve can be manually batch-operated or automated via an adjacent **Click Machine**.
   - Sieve accepts items pumped from top hoppers and ejects finished loot downwards into hoppers or onto adjacent floor tiles.

### Quests Completed
- Quest #78: "Sieve It Good" (Craft Wooden Sieve)
- Quest #77: "Meshed Up" (Craft String Mesh & install into Sieve)
- Quest #70: "Heavy Sifting" (Sieve Gravel for first Iron Ore Pieces)

### Acceptance Criteria & Tests
- [ ] Inserting a String Mesh into an empty Sieve updates the sieve state and renders the mesh texture on canvas.
- [ ] Inserting Gravel without a mesh is rejected; inserting with a mesh loads 1 block of substrate.
- [ ] Clicking sieve increments progress to 100%, consumes 1 substrate block, decrements mesh durability, and rolls outputs from the weighted drop table.
- [ ] Combining 4x Ore Pieces in list crafting produces 1x Raw Ore Chunk.
- [ ] Full regression tests for all 3 substrate types (Gravel, Sand, Dust) against String Mesh and Flint Mesh tables.

---

## Subcheckpoint 1.6: Smelting & Pyrometallurgy

### Objective & Scope
Implement thermal processing via the Furnace: burning fuels, thermal tick simulation, smelting sand to glass, clay balls to bricks, cobblestone to stone, and comminuted ore chunks into structural metal ingots.

### Mechanics & Systems
1. **Furnace Block Entity (`minecraft:furnace`)**:
   - Placement: 1x1 block entity placed against floor or wall.
   - Internal State:
     - `fuelTimeRemaining`: Ticks remaining for currently burning fuel item.
     - `currentFuelMax`: Total burn duration of the active fuel item.
     - `smeltProgress`: 0 to 200 ticks (10.0 seconds per item standard).
     - `inputSlot`: Item stack.
     - `fuelSlot`: Fuel item stack.
     - `outputSlot`: Output product stack.
2. **Fuel Economy**:
   - `contenttweaker:poopfuel`: 1600 ticks (smelts 8 items).
   - `minecraft:coal` / Charcoal: 1600 ticks (smelts 8 items).
   - `cttinycoal:tiny_coal` / Coal Piece: 200 ticks (smelts 1 item).
   - `minecraft:planks` / Sticks: 300 / 100 ticks.
3. **Smelting Recipe Table**:
   - 1x `minecraft:sand` $\rightarrow$ 1x `minecraft:glass`
   - 1x `minecraft:clay_ball` $\rightarrow$ 1x `minecraft:brick`
   - 1x `minecraft:cobblestone` $\rightarrow$ 1x `minecraft:stone`
   - 1x Raw Iron Chunk (or 4x Iron Grit) $\rightarrow$ 1x `minecraft:iron_ingot`
   - 1x Raw Copper Chunk (or 4x Copper Grit) $\rightarrow$ 1x `thermalfoundation:material:128` (Copper Ingot)
   - 1x Raw Tin Chunk (or 4x Tin Grit) $\rightarrow$ 1x `thermalfoundation:material:129` (Tin Ingot)
   - 1x Raw Lead Chunk (or 4x Lead Grit) $\rightarrow$ 1x `thermalfoundation:material:131` (Lead Ingot)
4. **Isometric Visual States**:
   - Lit furnace displays animated fire glow on the front isometric face when `fuelTimeRemaining > 0`.

### Quests Completed
- Quest #31: "Fully Transparent" (Smelt Sand into Glass)
- Quest #48: "Dry Again Dust" (Smelt Clay Balls into Bricks)
- Quest #17: "Heavy Metal" (Smelt Iron Chunk/Grit into Iron Ingot)

### Acceptance Criteria & Tests
- [ ] Furnace consumes fuel item only when input item requires smelting.
- [ ] Smelting takes exactly 200 ticks per item, incrementing output and decrementing input.
- [ ] Fuel burns continuously until exhaustion; remaining burn time carries over to subsequent items.
- [ ] Poop fuel provides exactly 1600 ticks of combustion time.
- [ ] All ore chunks and grits smelt into their corresponding metal ingots.

---

## Subcheckpoint 1.7: Early Fluids, Barrels & Clay

### Objective & Scope
Implement fluid storage, phase transformation, and chemical reactions: melting organic matter in the Wooden Crucible into water, and converting water with dirt or poop in the Wooden Barrel into clay and sewage.

### Mechanics & Systems
1. **Wooden Crucible (`exnihilocreatio:block_crucible_wood`)**:
   - Capacity: 1000 mB fluid buffer.
   - Solid Buffer: Accepts foliage items:
     - `minecraft:leaves`: 250 mB water
     - `arcadialbonsaitrees:bonsai_oak_cutting`: 250 mB water
     - `minecraft:apple`: 250 mB water
     - `minecraft:wheat_seeds`: 100 mB water
   - Solid items melt into liquid water over 100 ticks.
   - Right-clicking with an empty bucket collects 1000 mB `minecraft:water_bucket`.
2. **Wooden Barrel (`exnihilocreatio:block_barrel_wood`)**:
   - Capacity: 1000 mB fluid buffer.
   - **Clay Production**:
     - Fill barrel with 1000 mB Water.
     - Insert 1x `minecraft:dirt` block.
     - Reaction timer: 200 ticks (10 seconds).
     - Tile transforms into 1x `minecraft:clay` block.
     - Right-click harvest yields 4x `minecraft:clay_ball` (smelted into bricks).
   - **Sewage Production**:
     - Fill barrel with 1000 mB Water.
     - Insert 1x `cropdusting:poop`.
     - Instant transformation into 1000 mB `liquid:sewagefluid`.
   - **Slag Production**:
     - In sewage barrel, insert 1x `exnihilocreatio:block_dust` $\rightarrow$ converts to 2x `thermalfoundation:material:772` (Slag).

### Quests Completed
- Quest #27: "Home Brewed" (Craft Wooden Crucible)
- Quest #19: "Dry Throat Cure" (Melt leaves into Water & craft bucket)
- Quest #12: "Old Tubby" (Craft Wooden Barrel)
- Quest #18: "Clay.. Yup" (React Water + Dirt into Clay)

### Acceptance Criteria & Tests
- [ ] Crucible accepts leaves and cuttings, incrementing internal fluid volume up to 1000 mB.
- [ ] Water bucket extracts 1000 mB water from full crucible.
- [ ] Inserting dirt into a water-filled barrel triggers a 200-tick transformation into a clay block.
- [ ] Harvesting clay block yields 4 clay balls; inserting poop into water converts to sewage fluid.

---

## Subcheckpoint 1.8: Automation, Compactor & Miniaturization Field (Chapter 1 Completion)

### Objective & Scope
The pinnacle of Chapter 1: construct automated logistics, RF power generation via radioactive decay, assemble the multiblock Modular Compactor to press Modularium into breakable walls, set up Miniaturization Field Projectors, and craft the first craftable Tiny Compact Machine to complete Quest #10.

### Mechanics & Systems
1. **Early Automation**:
   - **Click Machine (`clickmachine:auto_clicker`)**: 1x1 block entity configured to click target adjacent tile at 1–20 clicks/sec with equipped tool.
   - **Hoppers & Uppers**: Standard hoppers pull items downward; Uppers push items upward to maximize vertical utilization of 3x3 rooms.
2. **NuclearCraft Decay Generator (`nuclearcraft:decay_generator`)**:
   - Generates 16 RF/t continuously when radioactive isotopes or Uranium grit are placed in its chamber.
   - 20,000 RF internal storage buffer. Ejects power to adjacent energy hatches.
3. **Modular Compactor Multiblock**:
   - Assembly structure: 3x Bricks, 1x Controller (`modularmachinery:blockcontroller`), 1x Input Bus, 1x Output Bus, 1x Energy Input Hatch, 1x Glass Pane, 1x Hopper, 1x Upper, 2x Stone Slabs.
   - Power consumption: 16 RF/t for 100 ticks (1,600 RF total).
   - Recipe: 4x Modularium Ingots $\rightarrow$ 1x **Compact Machine Wall** (`compactmachines3:wallbreakable`).
4. **Miniaturization Field Projector Crafting**:
   - 4x Field Projectors (`compactmachines3:fieldprojector`) placed in cardinal cross.
   - Construction: 3x3x3 hollow cube built of 26x `compactmachines3:wallbreakable` with hollow center.
   - Catalyst: Drop 1x `minecraft:ender_pearl` into center.
   - Animation & transformation: 400 ticks (20s) miniaturization animation produces 1x `compactmachines3:machine` (Tier 1 Tiny Compact Machine).

### Quests Completed
- Quest #24: "Auto Clicker"
- Quest #14: "Decay and Growth"
- Quest #23: "Small Compactor"
- Quest #10: "Infinite Tiny Rooms" (Chapter 1 Final Milestone)

### Acceptance Criteria & Tests
- [ ] Auto-clicker triggers wall hits or sieve clicks deterministically according to its tick interval.
- [ ] Decay generator burns fuel and outputs exactly 16 RF/tick.
- [ ] Multiblock validator detects complete Compactor structure and accepts power.
- [ ] Compactor processes Modularium into breakable walls.
- [ ] Miniaturization field detects 26 wall cube + Ender Pearl catalyst and outputs Tiny Compact Machine item.
- [ ] Quest #10 completion verifies that Chapter 1 vertical slice is 100% complete and ready for Chapter 2 expansion.
