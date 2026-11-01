# Compact Claustrophobia (Canvas Edition) - Overview & Design Vision

## 1. Project Vision & Development Checkpoint Strategy

*Compact Claustrophobia* originally is a Minecraft modpack created by **kamunimaximus** centered around the premise of being trapped in a hyper-confined, unbreakable room (a Compact Machine) and slowly bootstrapping an entire industrial factory and dimension-hopping technology from nothing.

### Core Development Checkpoint: "Go Tall, Not Wide"
A critical architectural and development principle governs this reimplementation:
> **Strict Checkpoint Policy**: We will **NOT** implement anything beyond Chapter 1 until Chapter 1 is completely finished, tested, and fleshed out.

- **The Philosophy of Going Tall**: Rather than building shallow, incomplete stubs spanning all four chapters (which risks widespread churn and untestable breadth), we focus all effort on a deep, vertically integrated slice.
- **Solid Testing Baseline**: Completing Chapter 1 end-to-end provides an immediate, playable gameplay experience (from spawning in the meteor pocket, entering the 3x3 room, wall punching, sneaking/pooping, dirt rummaging, bonsai farming, crucibles, barrels, hammer/sieve comminution, to building the Compactor and crafting the first Tiny Compact Machine).
- **Validation Before Divergence**: This vertical slice establishes an empirically validated base for testing mechanics, deterministic lockstep networking, list-based crafting, and UI interactions before diverging or expanding into subsequent chapters.

The problem with the original implementation is the substantial bloat and engine friction inherent to Minecraft:
- Arbitrary 3D procgen overhead when gameplay only takes place within tiny, discrete rooms (3x3 up to 13x13).
- Hundreds of unused blocks, mobs, biome data, and engine mechanics.
- Inefficient voxel physics and heavy JVM memory footprint for what is fundamentally a **spatial puzzle and factory automation game**.

The Canvas implementation reimagines Compact Claustrophobia from scratch as a dedicated 2D **isometric** canvas-based factory and spatial management game supporting up to 3 players via **deterministic lockstep peer-to-peer networking**.

---

## 2. Core Pillars of the Canvas Reimplementation

1. **Focused Spatial Puzzle & Compact Optimization**
   Every tile matters. Starting inside a 3x3 room, every machine placement, pipe routing, and chest is a crucial logistical decision.
2. **Deterministic Lockstep Simulation Engine**
   - 20 Hz fixed-tick deterministic simulation.
   - Multiplayer for up to 3 players over peer-to-peer WebRTC data channels with lockstep input synchronization.
   - Zero non-deterministic physics: reproducible, replayable, and desync-checked factory simulation.
3. **Isometric Canvas Presentation**
   - Dedicated 2.5D isometric projection on HTML5 Canvas.
   - Clean spatial depth and verticality without the performance overhead or visual occlusion of a full first-person 3D voxel engine.
4. **List-Based Streamlined Crafting**
   - Replaces Minecraft's arbitrary 2x2 and 3x3 spatial grid layouts with a searchable, list-based crafting system (similar to *Factorio* or *Terraria*).
   - If the player possesses the required ingredients in their inventory or nearby crafting station containers, items are crafted directly from the list.
5. **Faithful Compact Machines & Modpack Progression Fidelity**
   Preserve the iconic progression arc and accurate mod mechanics:
   - Punching solid compact walls with bare hands (causing self-damage and hunger).
   - Sneaking to produce poop for fertilizer and organic matter.
   - Sifting dirt and rummaging for seeds, pebbles, and saplings.
   - Bonsai farming on prepared dirt.
   - Wooden crucibles and barrels for early water and clay.
   - Sifting gravel, sand, and dust with meshes to acquire ores and minerals.
   - Crafting modular machinery: the Decay Generator (NuclearCraft) and the Compactor (Modular Machinery) to produce `compactmachines3:wallbreakable`.
   - Miniaturization Field Projector crafting to fabricate larger Compact Machines (Small, Normal, Large, Giant, Maximum) and nesting them within each other.
   - Proper CM3 Tunnels: exactly 6 external face mappings (North, South, East, West, Up, Down) mapped to perimeter walls via Tunnel Tools.

---

## 3. High-Level Gameplay Loop

```
+-------------------------------------------------------------+
| 0. METEOR SPAWN POCKET (Outer Room 2x1x(4/5))               |
|    - Spawn in 4-tall column with bedrock & torch            |
|    - Right-click embedded Compact Machine in 5-tall column  |
|      using Personal Shrinking Device (PSD) to shrink inside |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
| 1. CONFINED START (3x3 Room)                                |
|    - Punch solid unbreakable walls -> Dirt Dust & Gravel    |
|    - Sneak -> Poop                                          |
|    - Combine Dirt Dust -> Dirt Block; Rummage for Bonsai     |
|    - Grow Bonsai on dirt -> Wood Cuttings -> Planks         |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
| 2. EARLY SURVIVAL & BASIC TOOLS                             |
|    - Craft Wooden Pickaxe (from list) -> Strike walls       |
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
|    - Modular Compactor: Compresses Modularium into Breakable|
|      Compact Machine Walls (compactmachines3:wallbreakable) |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
| 5. MINIATURIZATION & DIMENSIONAL EXPANSION (NESTED ROOMS)   |
|    - Miniaturization Field Projectors (CM3 craft structure) |
|    - Craft Tiny Machine (3x3), Small (5x5), Normal (7x7),   |
|      Large (9x9), Giant (11x11), and Maximum (13x13)        |
|    - Tunnel Tools: Configure up to 6 tunnels on perimeter   |
|      walls connecting internal lines to external faces      |
|    - Multi-layered factory logistics across nested machines |
+------------------------------+------------------------------+
```

---

## 4. Explicit Points of Divergence from Minecraft & Compact Claustrophobia

To prevent ambiguity during design, development, and debugging, the table below documents every intended deviation from the original Minecraft Java modpack. **Any difference not listed here or in this specification should be treated as an accidental discrepancy or bug rather than an intended design choice.**

| Category | Minecraft / Original Modpack | Canvas Reimplementation | Classification | Design Rationale |
| :--- | :--- | :--- | :--- | :--- |
| **Perspective & Rendering** | First-person / third-person full 3D voxel engine (OpenGL / JVM). | 2.5D Isometric projection on HTML5 Canvas with HTML/SVG Top UI overlay. | **Design Choice** | Eliminates camera clipping in tight 3x3 rooms, removes voxel rendering bloat, and optimizes clarity for factory layout and conduit management. |
| **Voxel Interaction & Targeting** | 3D Crosshair raycast directly tied to 1st/3rd person mouse camera pitch and yaw. | Two-stage Layer + Block Selection (4 adjacent vertical layers $\times$ 8–9 blocks, selected via screen click, aux SVG widget, or numpad 1–9 unless obstructed). | **Design Choice** | Resolves isometric depth ambiguity cleanly without pixel hunting or misclicks in compact 3D rooms. |
| **Network Architecture** | Client-Server (dedicated server or integrated singleplayer server) with authoritative ticks, client prediction, and potential desyncs. | Deterministic Lockstep over Peer-to-Peer (WebRTC DataChannels) for 1–3 players. | **Design Choice** | Eliminates central server hosting costs. Perfectly synchronized factory state across peers without ghost item desyncs; ideal for small cooperative factory puzzle solving. |
| **Crafting Interface** | Spatial grid-based crafting (2x2 inventory grid and 3x3 Crafting Table grid where item placement shapes matter). | List-based crafting (categorized/searchable recipe list with single-click crafting if ingredients are present). | **Design Choice** | Eliminates tedious micro-management of drag-and-drop spatial grids. Matches modern factory games (*Factorio*) while preserving all recipe ingredients, tool requirements, and unlock stages. |
| **World Generation** | Infinite procgen overworld / void dimension with chunk loading, biomes, and terrain noise. | Strictly isolated, bounded 2D isometric grid rooms loaded in memory as discrete room graphs. | **Design Choice** | Claustrophobia takes place entirely within closed machine boundaries; boundless procgen is unnecessary overhead. |
| **Physics & Entities** | Floating loose 3D item entities with Newtonian physics, collision volumes, and despawn timers. | Deterministic discrete tile drops or immediate conveyor/hopper ingestion without floating entity physics jitter. | **Design Choice** | Item physics causes lag and clipping in tiny rooms. Deterministic factory routing guarantees predictable automation. |
| **Compact Machine Tunnels** | In CM3, tunnels are placed onto inside wall blocks using a Tunnel Tool, binding that block to 1 of 6 exterior faces (North, South, East, West, Up, Down). Maximum 6 tunnels per machine. | Exactly identical to CM3: Tunnels placed on perimeter walls via Tunnel Tool, mapped to the 6 exterior machine faces (max 6 active tunnels). | **Fidelity Preserved** | Core CM3 mechanic preserved. (Previously misdocumented as arbitrary conduit pass-throughs; now accurately specified). |
| **Compact Machine Wall Types** | Solid Compact Machine Wall (`compactmachines3:wall`) forms the room boundary and cannot be broken. Compact Machine Wall (`compactmachines3:wallbreakable`) is crafted in the Compactor and used in Miniaturization recipes. | Strictly matches CM3: The room borders are indestructible solid walls. The Compactor crafts breakable walls for miniaturization recipes. | **Fidelity Preserved** | Accurately distinguishes structural room boundary from the craftable block item. |
| **Machine Miniaturization** | CM3 uses 4 Field Projectors spaced in a cross to project a craft volume, where multiblock structures are built and a catalyst is thrown into the field. | Miniaturization field crafting simulated via isometric structural placement and catalyst drop (or projector interface). | **Fidelity Preserved** | Faithfully matches the original modpack recipes (e.g. Tiny machine requires 3x3x3 hollow wall structure with Ender Pearl catalyst). |
| **Player Count** | Arbitrary player count bounded by server RAM. | Fixed at 1 to 3 players max. | **Design Choice** | Lockstep peer-to-peer networks exhibit latency scaling with $O(N^2)$ messaging. Limiting to 3 players ensures ultra-low latency and fits the claustrophobic co-op theme. |

---

## 5. Documentation Directory Structure

- `overview.md`: (This document) Vision, game loop, design pillars, and points of divergence.
- `chapter-1-checkpoints.md`: Sequential subcheckpoint implementation roadmap for Chapter 1 (path to wood, farming, mining, sieving, smelting, fluids, automation).
- `mechanics.md`: Detailed interactions (wall punching, sneaking/pooping, rummaging, bonsai growth, barrel/crucible mechanics, sieving, auto clickers).
- `machines-and-rooms.md`: Room specifications (dimensions, walls, tunnels, nesting), Compact Machines 3 mechanics, and multiblock machine configurations (Compactor, Decay Generator).
- `recipes-and-tech-tree.md`: Complete list-based recipe catalog, hammer tables, sieving tables, in-world fluid crafting, and miniaturization field recipes.
- `canvas-architecture.md`: Technical implementation specification (isometric rendering pipeline, deterministic lockstep peer networking, state models, list crafting system).
- `progression-and-quests.md`: Quest lines, chapter breakdowns, tasks, prereqs, and rewards.
