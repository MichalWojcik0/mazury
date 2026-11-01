# Canvas Engine & Software Architecture Specification

This document defines the software engineering design for implementing *Compact Claustrophobia* in HTML5 Canvas and TypeScript/JavaScript.

---

## 1. Engine Core & Loop

The game runs on a fixed-timestep simulation tick loop decoupled from rendering:
- **Simulation Rate (Ticks)**: 20 ticks per second (50ms per tick), matching standard factory games and Minecraft tick timings.
- **Render Rate (Frames)**: Variable `requestAnimationFrame` (up to 60 or 120 FPS) with isometric interpolation.

```typescript
interface GameEngine {
  tickRate: 20; // 20 Hz (50ms per tick)
  currentTick: number;
  accumulator: number;
  lastFrameTime: number;

  update(deltaTick: number): void;
  render(alpha: number): void; // alpha for sub-tick visual interpolation
}
```

---

## 2. Deterministic Lockstep Peer-to-Peer Networking

### 2.1 Topology & Peer Mesh
- **Player Limit**: Up to 3 players (1 to 3 peers).
- **Communication Medium**: WebRTC DataChannels in an unordered/reliable or ordered/reliable peer-to-peer full mesh (each peer directly connected to every other peer).
- **Session Setup**: Lightweight signaling via WebRTC signaling server (or invite code / copy-paste SDP exchange). Once connected, the session runs completely serverless peer-to-peer.

### 2.2 Lockstep Protocol & Turn Execution
The network simulation follows a classic **Deterministic Lockstep** model:
1. **Turn Delay / Input Buffering**:
   - Each player’s input sampled locally at tick $T$ is broadcast to all peers for execution at tick $T + \Delta$ (where $\Delta = \text{Lockstep Buffer Ticks}$, typically 2–4 ticks / 100–200ms depending on peer latency).
2. **Lockstep Execution Barrier**:
   - The engine does *not* advance the local simulation tick $T$ until input messages for tick $T$ have been received from **all** connected peers.
   - If a peer's packet has not arrived, the engine pauses tick execution (displaying a subtle waiting/sync indicator) to prevent desynchronization.
3. **Deterministic Inputs**:
   - Only user inputs (action commands, movement directions, recipe craft requests, tool uses) are sent across the wire—never authoritative entity coordinates or inventory snapshots.

```typescript
interface PlayerInputPacket {
  tick: number;
  playerId: 0 | 1 | 2;
  action: InputAction;
}

type InputAction =
  | { type: "MOVE"; dx: number; dy: number }
  | { type: "START_SNEAK" }
  | { type: "STOP_SNEAK" }
  | { type: "INTERACT_TILE"; x: number; y: number; button: "PRIMARY" | "SECONDARY" }
  | { type: "CRAFT_RECIPE"; recipeId: string; count: number }
  | { type: "TRANSFER_ITEM"; source: ContainerRef; target: ContainerRef; slot: number }
  | { type: "USE_PSD"; targetRoomId?: string };
```

### 2.3 Desync Detection & State Hashes
- Every $N$ ticks (e.g. every 100 ticks / 5 seconds), each peer computes a 64-bit cyclic redundancy check / hash of the deterministic state:
  $$\text{StateHash} = \text{hash}(\text{RoomGraph}, \text{PlayerInventories}, \text{MachineBuffers}, \text{RNGSeed})$$
- Peers exchange `StateHashPacket`. If a hash mismatch is detected, the game halts simulation and flags an explicit state desync error with diagnostic state diffs.
- **RNG Determinism**: All random occurrences (e.g. sifting drops, wall punching drops, rummage outcomes) use a synchronized pseudorandom number generator (e.g. Mulberry32 or PCG32) seeded identically across all peers at room creation.

---

## 3. World & State Data Model

### 3.1 Spatial Hierarchy (Rooms & Universes)
The entire game state is a tree or map of `Room` instances:

```typescript
type RoomId = string;

interface Room {
  id: RoomId;
  name: string;
  tier: 1 | 2 | 3 | 4 | 5 | 6; // Tiny (3x3) to Maximum (13x13)
  width: number;
  height: number;
  tiles: Tile[][];
  parentRoomId?: RoomId;
  parentBlockCoord?: { x: number; y: number };
}

interface Tile {
  id: string; // "compact_wall", "dirt", "wooden_crucible", "sieve", etc.
  type: "solid_wall" | "floor" | "machine" | "conduit" | "tunnel";
  passable: boolean;
  metadata?: Record<string, any>;
  inventory?: Inventory;
  fluidTank?: FluidTank;
  energyStorage?: EnergyStorage;
}
```

### 3.2 Player State (Up to 3 Players)
```typescript
interface Player {
  id: 0 | 1 | 2;
  name: string;
  health: number;       // 0 - 20 (represented as 10 hearts)
  hunger: number;       // 0 - 20 (represented as 10 hunger shanks)
  exhaustion: number;   // 0.0 - 4.0 (converts into hunger drop)
  isSneaking: boolean;
  sneakTimer: number;   // Ticks accumulated towards poop generation
  currentRoomId: RoomId;
  x: number;            // Sub-tile or tile position in current room
  y: number;
  inventory: Inventory; // 36 main slots + 9 hotbar slots + armor/offhand
  selectedHotbarIndex: number;
}
```

---

## 4. Tick Processing Pipeline

On each simulation tick (50ms), the engine executes systems in deterministic order:

1. **Lockstep Input Ingestion**:
   - Retrieve synced inputs for the current tick for Player 0, 1, and 2.
2. **Player System**:
   - Handle player movement vectors and collisions against room walls and machine obstacles.
   - Accumulate sneak ticks; spawn `cropdusting:poop` if sneak threshold met.
   - Natural health regeneration (if hunger > 18) or starvation damage (if hunger == 0).
3. **Interact / Tool System**:
   - Process punch/click against target tile.
   - Apply health/exhaustion penalties or tool durability depletion.
   - Spawn drops into tile drop buffer or player inventory.
4. **List Crafting Execution**:
   - Process queued `CRAFT_RECIPE` requests from players: verify ingredients in inventory or within proximity to a Crafting Station, deduct ingredients atomically, add result to player inventory.
5. **Machine & Logic Tick System**:
   - **Bonsai Pots / Dirt**: Advance growth counter (boosted if players are sneaking nearby).
   - **Crucibles**: Melt organic items into water.
   - **Barrels**: Complete fluid reactions (Water + Dirt $\rightarrow$ Clay, Water + Poop $\rightarrow$ Sewage).
   - **Sieves**: Process input blocks with equipped mesh.
   - **Decay Generators**: Burn nuclear isotopes $\rightarrow$ generate RF.
   - **Modular Compactor**: Consume RF and ingredients $\rightarrow$ produce `compactmachines3:wallbreakable`.
6. **Logistics, Tunnels & Conduits System**:
   - Transfer items via hoppers/ducts.
   - Route items/fluids/energy through active Tunnels (mapped to external parent block faces).
   - Distribute energy through RF cables and conduits.
7. **Quest & Achievement Verification**:
   - Evaluate completion conditions (e.g. inventory contents, machines crafted).
   - Notify player upon quest unlocks.

---

## 5. Isometric Canvas Rendering Architecture

### 5.1 Isometric Projection Mathematics
The game uses a standard dimetric/isometric 2:1 projection where the grid $(x, y)$ maps to screen canvas coordinates $(u, v)$:

$$\begin{aligned}
u &= (x - y) \cdot \frac{W_{\text{tile}}}{2} + \text{CameraOffsetX} \\
v &= (x + y) \cdot \frac{H_{\text{tile}}}{2} - (z \cdot H_{\text{elevation}}) + \text{CameraOffsetY}
\end{aligned}$$

- **Tile Dimensions**: $W_{\text{tile}} = 64\text{ px}$, $H_{\text{tile}} = 32\text{ px}$ (2:1 diamond ratio).
- **Height / Elevation**: Higher layers (e.g. multiblock machines, conduits, walls) offset along the vertical screen axis $v$ by $z \cdot 16\text{ px}$.

### 5.2 Depth Sorting & Z-Ordering
Isometric rendering requires strict painter's algorithm ordering:
- Sort renderable entities and tiles by depth index:
  $$\text{DepthKey} = (x + y) \cdot K + z$$
- Tiles, dropped items, machines, conduits, and players (0, 1, 2) are drawn back-to-front to guarantee correct occlusion of isometric walls and multi-height machines.

### 5.3 Layered Canvas Strategy
1. **Terrain & Floor Layer**:
   - Renders room floor tiles, grid markers, and room boundaries.
2. **Isometric Structure & Entity Layer**:
   - Perimeter solid compact walls (`compactmachines3:wall`) with isometric extrusion.
   - Machine blocks, bonsai trees, sieves, crucibles, barrels, conduits.
   - Player sprites (up to 3 players) with directional isometric animations (facing NW, NE, SW, SE).
   - Subtle fluid animations and item transport visualization.
3. **Atmosphere & Lighting Layer**:
   - Claustrophobic vignette effect, dim neon glowstone shadows, and industrial dust motes.
4. **HUD & Modal UI Overlay**:
   - Player Health, Hunger, and Hotbar.
   - Teammate status indicators (health/hunger/room location of connected peers).
   - Tooltips for targeted isometric tile.
   - Modal views: List Crafting Panel, Quest Book, Machine GUIs, and Recipe Viewer.

### 5.4 Camera & Zoom Transition System
- Smooth camera interpolation when zooming into a Compact Machine block:
  1. Camera centers on the isometric machine tile.
  2. Canvas scale increases smoothly ($1\times \rightarrow 8\times$) toward the tile center.
  3. Fade transition swaps active rendered room from parent to child room.
  4. Camera smoothly zooms out to display the new child room centered at $1\times$.
- Exiting via PSD reverses the isometric zoom transition.

---

## 6. List-Based Crafting System

### 6.1 Contrast with Grid Crafting
Minecraft requires arranging items into 2x2 or 3x3 grids in arbitrary spatial patterns. In this canvas reimplementation:
- **Crafting is Done from a List**: The player opens the Crafting Menu (`C` or via Crafting Station interaction).
- **Categorized & Searchable**: Recipes are grouped into categories (Tools, Basic, Metallurgy, Machines, Logistics, Miniaturization) and filterable via search bar.
- **Instant Ingredient Detection**: The system checks if the required ingredient counts exist in the player's inventory (or linked chests/crafting stations within 2 tiles).
- **One-Click / Batch Crafting**:
  - Click recipe $\rightarrow$ instantly crafts 1 item and removes exact ingredients.
  - Shift-click $\rightarrow$ crafts maximum possible quantity.
  - Dedicated quantity slider / number input $[1, 5, 10, \text{All}]$.

```typescript
interface ListRecipe {
  id: string;
  name: string;
  category: "basic" | "tools" | "machinery" | "logistics" | "compact";
  requiredStation?: "none" | "crafting_station" | "furnace" | "compactor";
  inputs: Array<{ itemId: string; count: number }>;
  outputs: Array<{ itemId: string; count: number }>;
  craftTimeTicks?: number; // Instant for basic tools, or timed for processing machines
}
```

---

## 7. Integrated UI & Recipe Viewer

### 7.1 Integrated Quest Book
- Overlay panel accessible via hotkey (`Q` or `Tab`) or clicking the book icon in HUD.
- Displays quest chapters (Chapter 1: Claustrophobia, Chapter 2: Infinite Tiny Space, etc.).
- Interactive node graph showing completed, available, and locked quests with prereq connecting lines.
- Synchronized across all connected peers in deterministic lockstep.

### 7.2 Recipe & Usage Viewer (JEI Equivalent)
- Searchable side panel listing all in-game items.
- Hovering an item and pressing `R` shows all recipes that produce it (List Crafting, Hammer, Sieve, Crucible, Compactor, Miniaturization Field).
- Pressing `U` shows all recipes where the item is an ingredient.
- Crucial for factory puzzle solving in isometric space.
