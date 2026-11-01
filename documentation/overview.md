# Compact Claustrophobia (Canvas Edition) - Overview & Design Vision

## 1. Project Vision

*Compact Claustrophobia* originally is a Minecraft modpack created by **kamunimaximus** centered around the premise of being trapped in a hyper-confined, unbreakable room (a Compact Machine) and slowly bootstrapping an entire industrial factory and dimension-hopping technology from nothing.

The problem with the original implementation is the substantial bloat and engine friction inherent to Minecraft:
- Arbitrary 3D procgen overhead when gameplay only takes place within tiny, discrete rooms (3x3 up to 13x13).
- Hundreds of unused blocks, mobs, biome data, and engine mechanics.
- Inefficient voxel physics and heavy JVM memory footprint for what is fundamentally a **spatial puzzle and factory automation game**.

The Canvas implementation reimagines Compact Claustrophobia from scratch as a dedicated 2D / top-down / isometric canvas-based factory and spatial management game.

---

## 2. Core Pillars of the Canvas Reimplementation

1. **Focused Spatial Puzzle & Compact Optimization**
   Every tile matters. Starting inside a 3x3 room, every machine placement, pipe routing, and chest is a crucial logistical decision.
2. **Deterministic, Discrete Factory Engine**
   Replace loose 3D physics items and block entities with a deterministic, tick-based grid simulation (think *Factorio* meets *Mindustry* with nested dimensions).
3. **True Modpack Fidelity where it Counts**
   Preserve the iconic progression arc:
   - Punching compact walls with bare hands (causing self-damage and hunger).
   - Sneaking to produce poop for fertilizer and organic matter.
   - Sifting dirt and rummaging for seeds, pebbles, and saplings.
   - Bonsai farming on prepared dirt.
   - Wooden crucibles and barrels for early water and clay.
   - Sifting gravel, sand, and dust with meshes to acquire ores and minerals.
   - Crafting modular machinery: the Decay Generator (NuclearCraft) and the Compactor (Modular Machinery).
   - Miniaturization and crafting larger Compact Machines (Small, Normal, Large, Giant, Maximum) and nesting them within each other.
4. **Intuitive Controls and High Performance**
   - Pure HTML5 Canvas rendering at fluid 60 FPS.
   - Instant room navigation: zooming into compact machine blocks to enter nested rooms, zooming out to return to parent rooms.
   - Built-in Quest Book and Recipe Viewer (replacing BetterQuesting and JEI) seamlessly integrated into the HUD.

---

## 3. High-Level Gameplay Loop

```
+-------------------------------------------------------------+
| 1. CONFINED START (3x3 Room)                                |
|    - Punch unbreakable walls -> Dirt Dust & Gravel Dust     |
|    - Sneak -> Poop                                          |
|    - Combine Dirt Dust -> Dirt Block; Rummage for Bonsai     |
|    - Grow Bonsai on dirt -> Wood Cuttings -> Planks         |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
| 2. EARLY SURVIVAL & BASIC TOOLS                             |
|    - Craft Wooden Pickaxe -> Strike walls for Pebbles       |
|    - Pebbles -> Cobblestone -> Stone Pickaxe                |
|    - Wooden Crucible + Leaves -> Water                      |
|    - Dirt + Water Barrel -> Clay                            |
|    - Wooden Hammer: Cobble -> Gravel -> Sand -> Dust        |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
| 3. SIEVING & ORES                                           |
|    - Craft String Mesh & Wooden Sieve                       |
|    - Sieve Gravel -> Iron, Copper, Tin, Lead Ore Chunks     |
|    - Sieve Dust -> Bone Meal, Redstone, Gunpowder           |
|    - Smelt Chunks into Ingots                               |
|    - Stone Pickaxe wall drops: Heavy metal ores             |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
| 4. AUTOMATION & MODULAR MACHINERY                           |
|    - Auto-Clicker: Automate wall punching and sifting       |
|    - Hoppers / Item Ducts: Automate item routing            |
|    - Decay Generator: Early RF power from radioactive decay |
|    - Small Compactor: Multi-block machine crafting          |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
| 5. DIMENSIONAL EXPANSION (NESTED ROOMS)                     |
|    - Compact Walls & Miniaturization recipes                |
|    - Craft Tiny Compact Machine (3x3)                       |
|    - Expand to Small (5x5), Normal (7x7), Large (9x9),      |
|      Giant (11x11), and Maximum (13x13)                     |
|    - Tunnels & Face Proxies: Transfer power, items, and     |
|      fluids across room boundaries                          |
+-------------------------------------------------------------+
```

---

## 4. Documentation Directory Structure

- `overview.md`: (This document) Vision, game loop, design pillars.
- `mechanics.md`: Detailed interactions (wall punching, sneaking/pooping, rummaging, bonsai growth, barrel/crucible mechanics, sieving, auto clickers).
- `progression-and-quests.md`: Quest lines, chapter breakdowns, tasks, prereqs, and rewards.
- `recipes-and-tech-tree.md`: Complete recipe lists, crafting tables, hammer recipes, sieving tables, in-world fluid crafting, and compactor recipes.
- `machines-and-rooms.md`: Room specifications (dimensions, walls, tunnels, nesting) and multiblock machine configurations (Compactor, Decay Generator).
- `canvas-architecture.md`: Technical implementation specification for the HTML5 canvas game (state models, loop, grid rendering, automation pipeline, input handling).
