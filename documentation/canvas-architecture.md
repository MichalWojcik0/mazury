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
  | { type: "SELECT_LAYER"; layerIndex: 0 | 1 | 2 | 3 }
  | { type: "INTERACT_TILE"; x: number; y: number; z: number; button: "PRIMARY" | "SECONDARY" }
  | { type: "INTERACT_GRID_SLOT"; slot: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9; button: "PRIMARY" | "SECONDARY" }
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
  depth: number; // Vertical dimensions (Z levels, e.g. 3 to 13)
  voxels: Tile[][][]; // 3D voxel grid indexed as [z][y][x]
  parentRoomId?: RoomId;
  parentBlockCoord?: { x: number; y: number; z: number };
}

interface Tile {
  id: string; // "compact_wall", "dirt", "wooden_crucible", "sieve", etc.
  type: "air" | "solid_wall" | "floor" | "machine" | "conduit" | "tunnel";
  passable: boolean;
  occluding?: boolean; // Blocks line of sight / targeting to blocks behind it
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
  x: number;            // Sub-tile or tile coordinate in current room
  y: number;
  z: number;            // Vertical coordinate of feet (occupies z and z + 1)
  height: 2;            // Player character is strictly 2 blocks tall
  selectedLayerIndex: 0 | 1 | 2 | 3; // Selected interaction layer relative to player
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

### 5.3 Layered Architecture: Canvas & HTML/SVG UI Stack

The interface architecture decouples visual voxel simulation rendering from reactive user interaction and controls by utilizing a layered DOM structure:

```
+-------------------------------------------------------------------------+
| TOP UI LAYER (HTML5 / SVG DOM Overlay, pointer-events: none / auto)     |
| - Layer Selection Widget & Elevation Controls                           |
| - Auxiliary 3x3 Interaction Reticle (SVG diamond / grid projected)      |
| - Interactive HUD: Health / Hunger / Hotbar / Quest Book / Modals       |
| - Target Block Highlighting, Hover Tooltips & Numpad Key Overlays       |
+-------------------------------------------------------------------------+
| CANVAS LAYER (HTML5 Canvas 2D / WebGL)                                  |
| - Sub-layer 3: Atmosphere & Lighting (Vignette, Glow, Shading)          |
| - Sub-layer 2: Depth-Sorted Isometric Voxels, Machines, Entities        |
| - Sub-layer 1: Room Floor Grid & Ground Baselines                       |
+-------------------------------------------------------------------------+
```

1. **Canvas Layer (Simulation & Scene Rendering)**:
   - **Sub-layer 1 (Floor Grid)**: Renders room floor tiles, coordinate markers, and foundation boundaries.
   - **Sub-layer 2 (Voxel World & Entities)**: Perimeter solid walls (`compactmachines3:wall`), machines, conduits, bonsai trees, fluids, and 2-block-tall player sprites depth-sorted front-to-back according to `DepthKey`.
   - **Sub-layer 3 (Atmosphere & Shadows)**: Ambient occlusion between adjacent blocks, dim neon machine lighting, and claustrophobic vignette.

2. **Top UI Layer (HTML5 & SVG Overlay)**:
   - Positioned directly above the Canvas container with `position: absolute; inset: 0; pointer-events: none;`.
   - Specific interactive UI elements (widgets, hotbars, dialogs, auxiliary grid cells) declare `pointer-events: auto;`.
   - Utilizes SVG path projections for crisp isometric highlight outlines, reticles, direction vectors, and crosshairs matching current canvas camera transformations.
   - Renders the **Layer Selection Widget** and **Auxiliary 3x3 Interaction Grid**, enabling direct mouse interaction and touch/stylus support in addition to keyboard hotkeys.

### 5.4 Camera & Zoom Transition System
- Smooth camera interpolation when zooming into a Compact Machine block:
  1. Camera centers on the isometric machine tile.
  2. Canvas scale increases smoothly ($1\times \rightarrow 8\times$) toward the tile center.
  3. Fade transition swaps active rendered room from parent to child room.
  4. Camera smoothly zooms out to display the new child room centered at $1\times$.
- Exiting via PSD reverses the isometric zoom transition.

---

## 6. Player Spatial Interaction & Voxel Selection Architecture

Isometric 2.5D projection creates depth ambiguity along the line of sight (a single screen pixel can correspond to multiple $(x, y, z)$ voxels). In a confined factory environment where precision tile manipulation is essential, the game resolves this via a deterministic, two-stage **Layer + Block Selection Model** rendered through the HTML/SVG top UI layer.

### 6.1 Player Physical Model & The 4 Interaction Layers

The player character occupies an isometric footprint of $1 \times 1$ tile and is **2 blocks tall** in world vertical coordinates:
- Feet elevation: $z_{\text{player}}$
- Head elevation: $z_{\text{player}} + 1$

From their current position $(x_p, y_p, z_p)$, the player can reach exactly **4 vertical layers** adjacent to their body:

```
+-------------------------------------------------------------------------+
| Layer Index | Relative Z Offset | Designation       | Interactable Slots|
| :---        | :---              | :---              | :---              |
| **Layer 3** | $z_p + 2$         | Above Head / Roof | 9 blocks (3x3)   |
| **Layer 2** | $z_p + 1$         | Upper Body / Head | 8 blocks (3x3 - C)|
| **Layer 1** | $z_p$             | Lower Body / Feet | 8 blocks (3x3 - C)|
| **Layer 0** | $z_p - 1$         | Below Feet / Floor| 9 blocks (3x3)   |
+-------------------------------------------------------------------------+
```
*(Where `C` denotes the center tile $(0, 0)$ occupied by the player character's own collision body).*

### 6.2 Reach Geometry & 8–9 Interactable Blocks per Layer

Each of the 4 layers forms a $3 \times 3$ horizontal bounding footprint around the player:
$$\Delta x \in \{-1, 0, +1\}, \quad \Delta y \in \{-1, 0, +1\}$$

1. **Layers Above and Below (Layers 0 and 3)**:
   - Provide up to **9 interactable block locations** per layer (8 surrounding neighbors plus the tile directly below the feet or directly above the head).
2. **Body Layers (Layers 1 and 2)**:
   - Provide up to **8 interactable block locations** per layer surrounding the player horizontally (North, South, East, West, and diagonals). The center $(0, 0)$ slot is occupied by the player entity itself and cannot be interacted with.

### 6.3 Obstruction & Line-of-Sight ("Unless Blocks in the Way")

In the confined quarters of a Compact Machine, tiles may be physically occluded or obstructed:
1. **Physical Occlusion / Line-of-Sight Raycasting**:
   - A block in the $3 \times 3$ grid is interactable only if there is an unblocked ray from the player's center of mass $(x_p + 0.5, y_p + 0.5, z_p + 1.0)$ to the target block $(x_p + \Delta x, y_p + \Delta y, z_{\text{layer}})$.
   - If an intervening solid block (e.g. solid compact wall, full machine chassis) completely blocks physical access or tool reach, the targeted slot is marked as **Obstructed** (`passable: false`, `obstructed: true`).
2. **Visual Feedback in UI Layer**:
   - Obstructed blocks are dimmed or flagged with a strike-through pattern in the SVG/HTML overlay, preventing accidental misclicks and giving immediate feedback that access is blocked.

### 6.4 Two-Stage Selection Mechanism

To make block targeting completely unambiguous, interaction is split into two distinct steps:

```
[ Step 1: Select 1 of 4 Layers ] ===> [ Step 2: Select 1 of 8-9 Blocks ]
  - Layer 3: Above Head (Roof)           - Direct On-Screen Click (Canvas/SVG)
  - Layer 2: Upper Body (Head)           - Aux SVG Reticle Widget Click
  - Layer 1: Lower Body (Feet)           - Numpad Keys [1] - [9]
  - Layer 0: Below Feet (Floor)
```

#### Step 1: Layer Selection (Choosing 1 of 4 Options)
The active layer index $L \in \{0, 1, 2, 3\}$ is chosen through any of the following intuitive input methods:
- **Auxiliary HTML/SVG Layer Selector**: A compact, vertical 4-tier stack widget anchored beside the player or in the HUD showing the 4 layer silhouettes (`Roof`, `Head`, `Feet`, `Floor`).
- **Mouse Wheel / Modifier**: `Shift + Scroll` or `Alt + Scroll` steps through the 4 vertical interaction layers.
- **Dedicated Hotkeys**:
  - `[` and `]` (or `PageUp` / `PageDown`, `R` / `F`) step between adjacent layers.
  - Or direct layer shortcuts: `F1`–`F4` or holding modifier keys.
- **Persistent Isometric Visual Plane**: The currently selected layer displays an isometric projection slice (a faint SVG diamond plane) at the active $z$-level, highlighting which vertical slice of the room is currently being targeted.

#### Step 2: Block Selection within the Active Layer
Once the layer is selected, the specific block is chosen without ambiguity:
1. **Direct On-Screen Selection (Canvas / SVG Overlays)**:
   - The player hovers or clicks directly on the screen. Because the active $z$-plane is locked, the mouse coordinates $(u, v)$ mathematically invert to a single unique $(x, y)$ coordinate at that $z$.
   - The SVG top UI layer draws an active isometric bounding box over the hovered block.
2. **Auxiliary 3x3 Widget (Aux Widget)**:
   - An on-screen HTML/SVG widget rendered either near the screen corner or anchored isometrically around the player avatar.
   - Represents the active $3 \times 3$ layer footprint as a clean diamond or 9-cell keypad layout.
   - Clicking any cell targets that relative tile.
3. **Numeric Keypad (Numpad 1–9) Direct Mapping**:
   - The 9 physical keys on a standard numpad map 1:1 to the $3 \times 3$ grid relative to the player's isometric orientation:
     ```
     [ 7: NW ]  [ 8: N  ]  [ 9: NE ]
     [ 4: W  ]  [ 5: C  ]  [ 6: E  ]
     [ 1: SW ]  [ 2: S  ]  [ 3: SE ]
     ```
   - Pressing `Numpad 8` strikes/interacts with the tile directly north at the active layer.
   - Pressing `Numpad 5` targets the center tile (on Layer 0: floor under feet; on Layer 3: ceiling above head; on Layers 1–2: self/inventory).
   - This provides instant, blindingly fast single-keystroke interaction without relying on pixel-hunting in cramped 3x3x3 rooms.

---

## 7. List-Based Crafting System

### 7.1 Contrast with Grid Crafting
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

## 8. Integrated UI & Recipe Viewer

### 8.1 Integrated Quest Book
- Overlay panel accessible via hotkey (`Q` or `Tab`) or clicking the book icon in HUD.
- Displays quest chapters (Chapter 1: Claustrophobia, Chapter 2: Infinite Tiny Space, etc.).
- Interactive node graph showing completed, available, and locked quests with prereq connecting lines.
- Synchronized across all connected peers in deterministic lockstep.

### 8.2 Recipe & Usage Viewer (JEI Equivalent)
- Searchable side panel listing all in-game items.
- Hovering an item and pressing `R` shows all recipes that produce it (List Crafting, Hammer, Sieve, Crucible, Compactor, Miniaturization Field).
- Pressing `U` shows all recipes where the item is an ingredient.
- Crucial for factory puzzle solving in isometric space.
