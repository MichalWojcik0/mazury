# Recipes & Tech Tree Reference

This document catalogs the exact recipes, item conversions, and processing steps in *Compact Claustrophobia*.

---

## 1. Crafting Grid Recipes (2x2 and 3x3)

### Basic Survival & Building Blocks
- **Dirt Block** (2x2):
  ```
  [Dirt Dust] [Dirt Dust]
  [Dirt Dust] [Dirt Dust]  --> 1x Dirt
  ```
- **Cobblestone** (2x2):
  ```
  [Pebble] [Pebble]
  [Pebble] [Pebble]        --> 1x Cobblestone
  ```
- **Oak Planks** (2x2):
  ```
  [Oak Cutting] [Oak Cutting]
  [Oak Cutting] [Oak Cutting] --> 4x Oak Planks
  ```
- **Crafting Station** (2x2):
  ```
  [Oak Planks] [Oak Planks]
  [Oak Planks] [Oak Planks]  --> 1x Crafting Station
  ```
- **Sticks** (2x1 vertical):
  ```
  [Oak Planks]
  [Oak Planks]               --> 4x Sticks
  ```
- **Poop & Stick Book**:
  ```
  [Book]  [Poop]  [    ]
  [Stick] [    ]  [    ]
  [    ]  [    ]  [    ]     --> 1x Writable Book ("Poop & Stick")
  ```
- **Stinky Piston**:
  ```
  [    ] [Poop]   [    ]
  [    ] [Piston] [    ]
  [    ] [    ]   [    ]     --> 1x Sticky Piston
  ```
- **Clipboard**:
  ```
  [Poop] + [Stick] + [Paper] + [Pressure Plate] (Shapeless) --> 1x Clipboard
  ```

---

## 2. Tools & Workbenches

### Wooden Pickaxe
```
[Planks] [Planks] [Planks]
[      ] [Stick ] [      ]
[      ] [Stick ] [      ]  --> 1x Wooden Pickaxe
```

### Stone Pickaxe
```
[Cobble] [Cobble] [Cobble]
[      ] [Stick ] [      ]
[      ] [Stick ] [      ]  --> 1x Stone Pickaxe
```

### Ex Nihilo Wooden Hammer
```
[Planks] [Stick ] [Planks]
[      ] [Stick ] [      ]
[      ] [Stick ] [      ]  --> 1x Wooden Hammer
```

### Ex Nihilo Wooden Sieve
```
[Planks] [      ] [Planks]
[Planks] [Planks] [Planks]
[Stick ] [      ] [Stick ]  --> 1x Wooden Sieve
```

### Meshes
- **String Mesh**:
  ```
  [String] [String] [String]
  [String] [String] [String]
  [String] [String] [String]  --> 1x String Mesh
  ```
- **Flint Mesh**:
  ```
  [Flint] [Flint      ] [Flint]
  [Flint] [String Mesh] [Flint]
  [Flint] [Flint      ] [Flint]  --> 1x Flint Mesh
  ```

---

## 3. Comminution (Hammer Smash Table)

| Input Block | Output Item / Block | Tool Used |
| :--- | :--- | :--- |
| `minecraft:cobblestone` | 1x `minecraft:gravel` | Any Hammer |
| `minecraft:gravel` | 1x `minecraft:sand` | Any Hammer |
| `minecraft:sand` | 1x `exnihilocreatio:block_dust` | Any Hammer |
| `minecraft:stone:1` (Granite) | 1x `exnihilocreatio:block_granite_crushed` | Any Hammer |
| `minecraft:stone:3` (Diorite) | 1x `exnihilocreatio:block_diorite_crushed` | Any Hammer |
| `exnihilocreatio:block_diorite_crushed` | 1x `exnihilocreatio:block_dust` | Any Hammer |

---

## 4. Smelting & Furnace Recipes

- 1x `minecraft:sand` $\rightarrow$ 1x `minecraft:glass`
- 1x `minecraft:clay_ball` $\rightarrow$ 1x `minecraft:brick`
- 4x `immersiveengineering:metal:11` (Iron Grit) $\rightarrow$ 1x `minecraft:iron_ingot`
- 4x `immersiveengineering:metal:18` (Copper Grit) $\rightarrow$ 1x `thermalfoundation:material:128` (Copper Ingot)
- 4x `immersiveengineering:metal:9` (Tin Grit) $\rightarrow$ 1x `thermalfoundation:material:129` (Tin Ingot)
- 4x `immersiveengineering:metal:13` (Lead Grit) $\rightarrow$ 1x `thermalfoundation:material:131` (Lead Ingot)
- 1x `contenttweaker:poopfuel` $\rightarrow$ Smelts 8 items (Burn Time 1600 ticks)

---

## 5. In-World Fluid Reactions (`inworld.zs`)

In-world crafting happens by throwing items into a pool or block of liquid:

### Fluid-to-Item Transformations:
1. **Sewage + Dust $\rightarrow$ Sludge/Fertilizer**:
   - `liquid:sewagefluid` + 1x `exnihilocreatio:block_dust` $\rightarrow$ 2x `thermalfoundation:material:772` (Slag)
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

---

## 6. Modular Compactor Recipes (`modularmachinery`)

The Compactor is the multiblock machine that fabricates Compact Machines and compression components:

### Recipe: Tiny Compact Machine (3x3 Room Block)
- **Machine**: `compactor`
- **Recipe Time**: 100 ticks (5.0s)
- **Power Requirement**: 16 RF/tick (Total 1,600 RF)
- **Inputs**:
  - 4x `modularmachinery:itemmodularium` (Modularium Ingot)
- **Outputs**:
  - 1x `compactmachines3:wallbreakable` (Breakable Wall / Machine Core)

### Recipe: High Impact Diamond Nugget
- **Machine**: `high_impact_compactor`
- **Time**: 200 ticks
- **Power**: 64 RF/tick
- **Inputs**:
  - 8x `thermalfoundation:material:801` (Charcoal Dust)
- **Outputs**:
  - 1x `thermalfoundation:material:16` (Diamond Nugget)

---

## 7. Compact Machines 3 Miniaturization Field Recipes

Miniaturization crafting is performed by creating a structure inside a Field Projector area and throwing a catalyst into the center:

1. **Small Compact Machine (5x5)**:
   - Size: 3x3x3 multiblock of Iron Blocks, Redstone, and Modularium
   - Catalyst: 1x `compactmachines3:psd`
   - Output: 1x `compactmachines3:machine` (Small, 5x5x5)
2. **Normal Compact Machine (7x7)**:
   - Size: Gold blocks + Modularium + Tiny Machine
   - Output: 1x `compactmachines3:machine:1` (Normal, 7x7x7)
3. **Large Compact Machine (9x9)**:
   - Size: Obsidian + Diamond blocks + Normal Machine
   - Output: 1x `compactmachines3:machine:2` (Large, 9x9x9)
4. **Giant Compact Machine (11x11)**:
   - Size: Steel blocks + Ender pearls + Large Machine
   - Output: 1x `compactmachines3:machine:3` (Giant, 11x11x11)
5. **Maximum Compact Machine (13x13)**:
   - Size: Emerald blocks + Nether stars + Giant Machine
   - Output: 1x `compactmachines3:machine:4` (Maximum, 13x13x13)
