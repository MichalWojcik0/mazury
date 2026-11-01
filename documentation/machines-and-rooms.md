# Machines & Rooms Specification

This document details the spatial architecture, room tiers, inter-room connectivity, and multiblock machinery in *Compact Claustrophobia*.

---

## 1. Compact Machine Room Hierarchy & Isometric Grids

In *Compact Claustrophobia*, all building and factory automation takes place inside closed cuboidal rooms called Compact Machines. In our Canvas reimplementation, each room is modeled as an isometric spatial grid surrounded by perimeter wall tiles.

| Room Tier | In-Game Name | 3D Modpack Size | Isometric Grid Size | Usable Tiles | Outer Border |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Outer Room** | Overworld Meteor Starting Pocket | Asymmetrical 2 x 1 x (4 / 5) | 2 x 1 | 2 tiles | Solid Bedrock / Meteor Shell |
| **Tier 1** | Tiny Compact Machine | 3 x 3 x 3 | 3 x 3 | 9 tiles | 5 x 5 (with solid walls) |
| **Tier 2** | Small Compact Machine | 5 x 5 x 5 | 5 x 5 | 25 tiles | 7 x 7 (with solid walls) |
| **Tier 3** | Normal Compact Machine | 7 x 7 x 7 | 7 x 7 | 49 tiles | 9 x 9 (with solid walls) |
| **Tier 4** | Large Compact Machine | 9 x 9 x 9 | 9 x 9 | 81 tiles | 11 x 11 (with solid walls) |
| **Tier 5** | Giant Compact Machine | 11 x 11 x 11 | 11 x 11 | 121 tiles | 13 x 13 (with solid walls) |
| **Tier 6** | Maximum Compact Machine | 13 x 13 x 13 | 13 x 13 | 169 tiles | 15 x 15 (with solid walls) |

### 1.1 The Outer Room (Overworld Meteor Spawn Pocket)
Before the player enters their first Compact Machine, they spawn inside the **Outer Room**—an ultra-confined, irregular void pocket buried deep within an extraterrestrial meteor (`thestartmeteor.nbt` / `startmeteor.schematic` in the Overworld, Dimension 0).

```
                      Bedrock Ceiling (y = 7)
           +-------------------------+-------------------------+
           |     Column A (Spawn)    |    Column B (Machine)   |
           +-------------------------+-------------------------+
  y = 6    | Air                     | Air                     |
  y = 5    | Torch (on wall)         | Air                     |
  y = 4    | Air (Player Spawn Head) | Air                     |
  y = 3    | Air (Player Spawn Feet) | Air                     |
           +-------------------------+                         |
  y = 2    | Bedrock Floor           | Compact Machine Block   |
           +-------------------------+-------------------------+
  y = 1                              | Bedrock Foundation     |
                                     +-------------------------+
              4 Blocks Clearance          5 Blocks Total Height
                                        (4 Blocks Air above CM)
```

#### Spatial Architecture & Dimensions:
- **Horizontal Footprint**: $2 \times 1$ tiles (2 usable coordinate positions, adjacent along one horizontal axis).
- **Asymmetrical Vertical Profile**:
  - **Column A (Spawn Tile, e.g. $(x=3, z=2)$)**:
    - **Floor Elevation**: $y = 2$ (`minecraft:bedrock`).
    - **Ceiling Elevation**: $y = 7$ (`minecraft:bedrock`).
    - **Internal Clearance**: **4 blocks tall** ($y = 3, 4, 5, 6$).
    - **Contents**: The player's initial spawn point is here (standing at $y = 3..4$), lit by a single wall torch (`minecraft:torch`) at $y = 5$.
  - **Column B (Machine Tile, e.g. $(x=3, z=3)$)**:
    - **Foundation Elevation**: $y = 1$ (`minecraft:bedrock`).
    - **Floor Recess**: The **Tier 1 Tiny Compact Machine** block (`compactmachines3:machine`) is embedded at $y = 2$, sunken 1 block lower than the adjacent spawn tile floor.
    - **Ceiling Elevation**: $y = 7$ (`minecraft:bedrock`).
    - **Internal Clearance**: **5 blocks tall** from bedrock foundation to ceiling (or 4 blocks of air space directly above the machine block at $y = 3, 4, 5, 6$).
- **Perimeter & Envelope**:
  - Enclosed entirely by indestructible **Bedrock** (`minecraft:bedrock`), backed by outer crust layers of **Lavastone** (`chisel:lavastone`), **Netherrack** (`chisel:netherrack`), and burning surface flames (`minecraft:fire`).
  - No blocks inside this pocket can be mined, dug, or harvested with early tools.
- **Narrative & Gameplay Role**:
  - This is the initial spawning chamber where Quest #142 (*"Stuck in a hole"*) and Quest #68 (*"The beginning?"*) take place.
  - The player starts with (or is given) the **Personal Shrinking Device (PSD)**. Right-clicking the embedded Compact Machine block at the bottom of Column B teleports the player into the 3x3x3 interior (Dimension 144), kicking off Chapter 1 bootstrap gameplay.
  - If the player uses the PSD to exit the starting machine before establishing external room links or advanced bases, they return directly to this outer 2x1 pocket.

---

### 1.2 The Starting Compact Machine & Wall Distinctions
Upon activating the PSD on the floor machine block of the Outer Room, the player enters the **Tier 1 (Tiny, 3x3x3)** Compact Machine room.

#### Wall Mechanics & Types (Fidelity to Compact Machines 3):
A critical distinction from the original Compact Machines 3 mod:
1. **Solid Compact Machine Wall (`compactmachines3:wall`)**:
   - The indestructible exterior envelope surrounding every room.
   - Cannot be mined, broken, or picked up by any tool or machine.
   - Striking this wall by hand or tool yields dusts, pebbles, and metal grits (the core early bootstrap mechanic).
   - Serves as the substrate where Tunnels are placed.
2. **Compact Machine Wall (`compactmachines3:wallbreakable`)**:
   - A craftable/placeable block item.
   - Fabricated inside the **Modular Compactor** using Modularium ingots (4x Modularium $\rightarrow$ 1x Wall).
   - Used as the physical construction block in **Miniaturization Field recipes** to create new Compact Machine hulls.
   - Can be broken and repositioned like normal blocks.

---

## 2. Dimensional Nesting & Navigation

A fundamental feature of the game is **nested spatial recursion**:
- A Compact Machine is both an isometric block that can be placed in an existing room *and* a container holding a larger internal room.
- **Entering a Room**: Right-clicking or zooming into a placed Compact Machine block with a Personal Shrinking Device (PSD) transitions the player and camera into that machine's internal room.
- **Exiting a Room**: Using the Personal Shrinking Device (PSD) while inside a room or right-clicking an exit portal teleports the player back out to the parent room directly adjacent to the machine block.
- **Respawn / Bed Setting**: Using a bed inside a Compact Machine sets the player's respawn position to that machine interior.
- **Infinite Nesting Depth**: Machine A can contain Machine B, which can contain Machine C.
- **Multiplayer Visibility**: Up to 3 players can freely inhabit the same machine or disperse across different nested rooms. The HUD shows the current room location and status of all connected peers.

---

## 3. Tunnels & Cross-Dimensional Logistical Routing

Compact Machines 3 connects internal room automation to the outer dimension via **Tunnels**:

### 3.1 Tunnel Mechanics & 6-Face Limitation
- **Placement**: Tunnels are **not** standalone crafted conduit blocks placed on the floor. Instead, they are created by right-clicking a **Solid Compact Machine Wall** (`compactmachines3:wall`) on the room perimeter using a **Tunnel Tool** (`compactmachines3:tunneltool`) or **Redstone Tunnel Tool** (`compactmachines3:redstonetunneltool`).
- **Strict Face Binding**: Each machine block in the exterior world has exactly 6 faces:
  - `DOWN` (Bottom)
  - `UP` (Top)
  - `NORTH`
  - `SOUTH`
  - `WEST`
  - `EAST`
- **Maximum 6 Tunnels**: Each exterior face can be bound to **at most one** inside wall tunnel. Therefore, a Compact Machine can have at most **6 active tunnels**.
- **Configuration**:
  - Right-clicking an existing tunnel with a Tunnel Tool cycles through available unassigned exterior faces.
  - Sneak-right-clicking with the tool removes the tunnel and returns the tool/clears the binding.

### 3.2 Types of Tunnels
1. **Standard Tunnel (`compactmachines3:tunnel`)**:
   - Placed using the **Tunnel Tool** (`compactmachines3:tunneltool`).
   - Bidirectional proxy using Forge Capability routing:
     - **Items**: Hoppers, ducts, conveyors, or conduits connected to the exterior face push/pull directly to/from the inside tunnel tile.
     - **Fluids**: Fluid pipes move liquids seamlessly across the wall boundary.
     - **Energy (RF / FE / Forge Energy)**: Power generated inside the room can be piped outside, or external generators can feed machines inside.
2. **Redstone Tunnel (`compactmachines3:redstonetunnel`)**:
   - Placed using the **Redstone Tunnel Tool** (`compactmachines3:redstonetunneltool`).
   - Specifically transfers redstone activation levels (0 to 15) across the wall boundary.
   - Directional mode: Configured to either **Input** (exterior signal read into inside room) or **Output** (inside signal emitted to exterior machine face).

---

## 4. Multiblock Machinery Specifications

### 4.1 The NuclearCraft Decay Generator
The earliest source of passive RF power.
- **Footprint**: 1x1 block entity.
- **Internal Storage**: 20,000 RF.
- **Generation Rate**:
  - Passive decay of radioactive materials placed in its slot.
  - Uranium grit / isotope: 16 RF/tick for 2000 ticks.
- **Buffer Output**: Pushes power automatically to adjacent energy conduits or hatches.

### 4.2 The Modular Compactor
The multiblock factory required to build advanced materials and machine hulls.

**Components Required**:
1. 1x **Controller** (`modularmachinery:blockcontroller`): The brain of the machine.
2. 1x **Energy Input Hatch** (`modularmachinery:blockenergyinputhatch`): Accepts RF (needs 16 RF/t).
3. 1x **Item Input Bus** (`modularmachinery:blockinputbus`): Receives ingredients.
4. 1x **Item Output Bus** (`modularmachinery:blockoutputbus`): Ejects finished products.
5. 3x **Bricks** (`minecraft:brick_block`): Outer frame structural casing.
6. 1x **Glass Pane** (`minecraft:glass_pane`): Inspection window.
7. 1x **Hopper** + 1x **Upper**: Vertical item transfer conduits.
8. 2x **Stone Slabs** (`minecraft:stone_slab`): Base foundation.

**Assembled State & Operation**:
- When placed in the required pattern, the Controller activates (indicator turns green).
- Connecting the Energy Input Hatch to a Decay Generator feeds power (16 RF/t).
- Inserting 4x Modularium Ingots into the Input Bus automatically compresses them into 1x **Compact Machine Wall** (`compactmachines3:wallbreakable`).
- *Note*: The compactor crafts the breakable walls (`wallbreakable`), which are subsequent ingredients for the Miniaturization Field Projector to produce machine rooms.

---

## 5. Miniaturization Field Projectors

Compact Machines 3 crafts machine room blocks and miniaturized components using **Miniaturization Field Projectors**:
- **Setup**: 4 Miniaturization Field Projectors (`compactmachines3:fieldprojector`) placed facing each other in a cardinal cross, defining a crafting volume ($3 \times 3 \times 3$ or $5 \times 5 \times 5$).
- **Process**:
  1. The player builds the required physical block structure inside the projected field volume.
  2. The player throws or drops the designated **Catalyst** item (e.g. `minecraft:ender_pearl`) into the center of the field.
  3. The field projectors energize, consume the structure over a duration (e.g. 400 ticks / 20 seconds), and synthesize the finished Compact Machine item or component.

---

## 6. Factory Automation Infrastructure

To fit complex industrial lines inside tiny rooms, the game provides ultra-compact logistics:
- **Click Machines (Auto-Clickers)**: 1-tile automation of left-click or right-click interactions.
- **Thermal Expansion Itemducts & Servos**: Configurable 1-tile transparent item transport tubes with whitelist/blacklist filters.
- **Ender IO Conduits**: Allow Item, Fluid, and Power lines to occupy the **exact same tile**! This is the ultimate tool for compact 3x3 and 5x5 automation.
- **Tunnels**: Route these conduits directly to exterior faces (up to 6 total).
