# Machines & Rooms Specification

This document details the spatial architecture, room tiers, inter-room connectivity, and multiblock machinery in *Compact Claustrophobia*.

---

## 1. Compact Machine Room Hierarchy

In *Compact Claustrophobia*, all building and factory automation takes place inside closed cuboidal rooms called Compact Machines. In our Canvas reimplementation, these correspond to discrete 2D spatial grids surrounded by perimeter wall tiles.

| Room Tier | Name | Internal Grid Size | Usable Tiles | Outer Border |
| :--- | :--- | :--- | :--- | :--- |
| **Tier 1** | Tiny Compact Machine | 3 x 3 | 9 tiles | 5 x 5 (with walls) |
| **Tier 2** | Small Compact Machine | 5 x 5 | 25 tiles | 7 x 7 (with walls) |
| **Tier 3** | Normal Compact Machine | 7 x 7 | 49 tiles | 9 x 9 (with walls) |
| **Tier 4** | Large Compact Machine | 9 x 9 | 81 tiles | 11 x 11 (with walls) |
| **Tier 5** | Giant Compact Machine | 11 x 11 | 121 tiles | 13 x 13 (with walls) |
| **Tier 6** | Maximum Compact Machine | 13 x 13 | 169 tiles | 15 x 15 (with walls) |

### 1.1 The Starting Room
The player begins inside a **Tier 1 (Tiny, 3x3)** room.
- The 8 perimeter blocks are unbreakable **Compact Machine Walls** (`compactmachines3:wall`).
- The center floor tile has a special marked block representing the dimensional anchor / machine core.
- The player moves within this 3x3 area. Space is at a severe premium.

---

## 2. Dimensional Nesting & Navigation

A fundamental feature of the game is **nested spatial recursion**:
- A Compact Machine is both a physical block that can be placed in an existing room *and* a container holding a larger internal room.
- **Entering a Room**: Right-clicking or zooming into a placed Compact Machine block transitions the view to that machine's internal room.
- **Exiting a Room**: Using the Personal Shrinking Device (PSD) or clicking the outer exit portal zooms the player back out to the parent room where the machine block is located.
- **Infinite Nesting Depth**: Machine A can contain Machine B, which can contain Machine C.

---

## 3. Tunnels & Cross-Dimensional Logistical Routing

Compact Machines connect to the outer world via **Tunnels**:
- Tunnels are specialized wall blocks placed on the perimeter of an internal room.
- Each tunnel is bound to one of the 6 cardinal directions / faces of the exterior block:
  - `North`, `South`, `East`, `West`, `Top` (Up), `Bottom` (Down).
- **Transport Types Supported**:
  1. **Items**: Hoppers, ducts, or conduits connected to the outer face transfer items directly into/out of the internal tunnel tile.
  2. **Fluids**: Liquid pipes connect seamlessly across the wall boundary.
  3. **Energy (RF / FE)**: Power generated in one room can be piped through a tunnel to power machines in other rooms.
  4. **Signals / Redstone**: Logic switches and comparators transfer activation states.

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
- Connecting the Energy Input Hatch to a Decay Generator feeds power.
- Inserting Modularium into the Input Bus automatically begins compression into Compact Machine blocks.

---

## 5. Factory Automation Infrastructure

To fit complex industrial lines inside tiny rooms, the game provides ultra-compact logistics:
- **Click Machines (Auto-Clickers)**: 1-tile automation of left-click or right-click interactions.
- **Thermal Expansion Itemducts & Servos**: Configurable 1-tile transparent item transport tubes with whitelist/blacklist filters.
- **Ender IO Conduits**: Allow Item, Fluid, and Power lines to occupy the **exact same tile**! This is the ultimate tool for compact 3x3 and 5x5 automation.
