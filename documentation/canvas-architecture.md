# Canvas Engine & Software Architecture Specification

This document defines the software engineering design for implementing *Compact Claustrophobia* in HTML5 Canvas and TypeScript/JavaScript.

---

## 1. Engine Core & Loop

The game runs on a fixed-timestep simulation tick loop decoupled from rendering:
- **Simulation Rate (Ticks)**: 20 ticks per second (50ms per tick), matching standard factory games and Minecraft tick timings.
- **Render Rate (Frames)**: Variable requestAnimationFrame (up to 60 or 120 FPS) with interpolation.

```typescript
interface GameEngine {
  tickRate: 20; // Hz
  accumulator: number;
  lastFrameTime: number;

  update(deltaTick: number): void;
  render(alpha: number): void; // alpha for sub-tick interpolation
}
```

---

## 2. World & State Data Model

### 2.1 Spatial Hierarchy (Rooms & Universes)
The entire game state is a tree or map of `Room` instances:

```typescript
type RoomId = string;

interface Room {
  id: RoomId;
  name: string;
  tier: 1 | 2 | 3 | 4 | 5 | 6; // 3x3 up to 13x13
  width: number;
  height: number;
  tiles: Tile[][];
  parentRoomId?: RoomId;
  parentBlockCoord?: { x: number; y: number };
}

interface Tile {
  id: string; // "compact_wall", "dirt", "wooden_crucible", "sieve", etc.
  type: "wall" | "floor" | "machine" | "conduit";
  passable: boolean;
  metadata?: Record<string, any>;
  inventory?: Inventory;
  fluidTank?: FluidTank;
  energyStorage?: EnergyStorage;
}
```

### 2.2 Player State
```typescript
interface Player {
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

## 3. Tick Processing Pipeline

On each simulation tick (50ms), the engine executes systems in deterministic order:

1. **Player System**:
   - Handle player input (movement vectors, hotbar selection).
   - Check sneak ticks; spawn `cropdusting:poop` if sneak threshold met.
   - Natural health regeneration (if hunger > 18) or starvation damage (if hunger == 0).
2. **Interact / Tool System**:
   - Process punch/click against target tile.
   - Apply health/exhaustion penalties or tool durability depletion.
   - Spawn drops into tile drop buffer or player inventory.
3. **Machine & Logic Tick System**:
   - **Bonsai Pots / Dirt**: Advance growth counter (boosted if player is sneaking on tile).
   - **Crucibles**: Melt organic items into water.
   - **Barrels**: Complete fluid reactions (Water + Dirt $\rightarrow$ Clay, Water + Poop $\rightarrow$ Sewage).
   - **Sieves**: Process input blocks with equipped mesh.
   - **Decay Generators**: Burn nuclear isotopes $\rightarrow$ generate RF.
   - **Modular Compactor**: Consume RF and ingredients $\rightarrow$ produce compact blocks.
4. **Logistics & Conduits System**:
   - Transfer items via hoppers/ducts.
   - Push fluids through fluid pipes.
   - Distribute energy through RF cables and cross-dimensional room tunnels.
5. **Quest & Achievement Verification**:
   - Evaluate completion conditions (e.g. inventory contents, machines crafted).
   - Notify player upon quest unlocks.

---

## 4. Canvas Rendering Architecture

### 4.1 Layered Canvas Strategy
Use a layered canvas setup for optimal rendering performance:
1. **Background Layer (Static/Semi-static)**:
   - Renders room walls, grid lines, and floor tiles. Only redraws when room or structure changes.
2. **Entity & Machine Layer (Dynamic)**:
   - Machine animations (sieve rocking, compactor piston, furnace flames, fluid levels).
   - Item drops and particles.
   - Player sprite with direction/animation.
3. **Lighting & Atmosphere Layer**:
   - Claustrophobic vignette effect, shadow overlays, and dim neon/glowstone lighting.
4. **HUD & UI Overlay**:
   - Hotbar, Health, and Hunger bars.
   - Active tooltip for targeted block.
   - Modal views: Inventory, Crafting Grid, Quest Book, and Recipe Viewer (JEI equivalent).

### 4.2 Camera & Zoom Transition System
- Smooth camera interpolation when zooming into a Compact Machine block:
  1. Camera centers on the machine tile.
  2. Canvas scale increases smoothly ($1\times \rightarrow 10\times$).
  3. Fade transition swaps active rendered room from parent to child.
  4. Camera resets to centered view of the new room at $1\times$.
- Zooming out (using PSD) performs the reverse transition smoothly.

---

## 5. User Interface (UI) Components

### 5.1 Integrated Quest Book
- A responsive overlay panel accessible via hotkey (`Q` or `Tab`) or clicking the book icon in HUD.
- Displays quest chapters (Chapter 1: Claustrophobia, Chapter 2: Infinite Tiny Space, etc.).
- Interactive node graph showing completed, available, and locked quests with prereq connecting lines.
- Shows quest descriptions, required tasks, and claimable rewards.

### 5.2 Recipe & Usage Viewer (JEI Equivalent)
- Searchable side panel listing all in-game items.
- Hovering an item and pressing `R` shows all recipes that produce it (Crafting table, Hammer, Sieve, Crucible, Compactor, In-world).
- Pressing `U` shows all recipes where the item is an ingredient.
- Critical for factory puzzle solving.

---

## 6. Audio Design & Feedback

To capture the atmospheric claustrophobia of the modpack:
- Heavy, industrial ambient hum inside machine rooms.
- Stone strike impact sound with slight screen shake on wall punch.
- Distinct crunch/squelch sounds for rummaging dirt and sneaking.
- Crisp metallic clicks for modular machine assembly and auto-clicker operation.
- Rewarding chime upon completing quest milestones.
