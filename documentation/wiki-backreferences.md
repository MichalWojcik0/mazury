# Wiki & Upstream Source Backreferences

This document indexes all upstream references, mod wikis, community documentation, and source repository configuration files used to specify and implement *Compact Claustrophobia (Canvas Edition)*.

---

## 1. Primary Upstream Repositories & Guides

| Source | Link | Description |
| :--- | :--- | :--- |
| **Compact Claustrophobia Modpack** | [GitHub: kamunimaximus/CompactClaustrophobia](https://github.com/kamunimaximus/CompactClaustrophobia) | Original 1.12.2 modpack source repository containing all CraftTweaker scripts (`scripts/*.zs`), Scavenge loot tables (`config/scavenge/*.json`), BetterQuesting quest definitions (`config/betterquesting/DefaultQuests.json`), and mod configs. |
| **Compact Machines 3 Upstream Mod** | [GitHub: CompactMods/CompactMachines (branch 1.12.x)](https://github.com/CompactMods/CompactMachines/tree/1.12.x) | Upstream mod repository for Compact Machines 3. Source of room dimensions, tunnel mechanics (6-face mapping), Personal Shrinking Device behaviors, and miniaturization crafting structures. |
| **Compact Claustrophobia Modpack on CurseForge** | [CurseForge: Compact Claustrophobia](https://www.curseforge.com/minecraft/modpacks/compact-claustrophobia) | Official release page and mod list for Compact Claustrophobia by kamunimaximus. |

---

## 2. Mod & Vanilla Wikis

The following wikis define vanilla game mechanics, mod-specific mechanics, processing tables, and block behaviors implemented across this codebase:

### 2.1 Minecraft Vanilla Mechanics
- **Minecraft Wiki**: [https://minecraft.wiki/](https://minecraft.wiki/)
  - [Farmland](https://minecraft.wiki/w/Farmland): Hydration, tilling rules, soil mechanics.
  - [Wheat Seeds & Crops](https://minecraft.wiki/w/Wheat_Seeds): 8 growth stages, bonemeal / twerk acceleration.
  - [Tools & Durability](https://minecraft.wiki/w/Pickaxe): Pickaxe tiering (wood, stone, iron, diamond), tool durability.
  - [Bedrock](https://minecraft.wiki/w/Bedrock): Indestructible boundary properties, explosive resistance.
  - [Inventory & Hotbar](https://minecraft.wiki/w/Inventory): 36-slot player inventory layout and stack sizes (64 standard, 1 tools/PSD).
  - [Smelting & Fuel](https://minecraft.wiki/w/Smelting): Standard burn ticks (coal = 1600 ticks, 8 items).

### 2.2 Compact Machines 3
- **FTB Wiki: Compact Machines 3**: [https://ftbwiki.org/Compact_Machines_3](https://ftbwiki.org/Compact_Machines_3)
  - [Personal Shrinking Device](https://ftbwiki.org/Personal_Shrinking_Device): Right-click to shrink into machine, right-click to exit, shift-right-click spawn setting.
  - [Compact Machine Room Tiers](https://ftbwiki.org/Compact_Machine): Dimensions (Tiny 3x3x3, Small 5x5x5, Normal 7x7x7, Large 9x9x9, Giant 11x11x11, Maximum 13x13x13).
  - [Tunnels & Face Binding](https://ftbwiki.org/Tunnel): Exactly 6 external faces (`DOWN`, `UP`, `NORTH`, `SOUTH`, `WEST`, `EAST`) mapped to perimeter wall blocks via Tunnel Tool (`compactmachines3:tunneltool`).
  - [Miniaturization Field Projector](https://ftbwiki.org/Miniaturization_Field_Projector): 4 field projectors in cardinal cross, catalyst drop, multiblock structure crafting.

### 2.3 Ex Nihilo Creatio
- **FTB Wiki: Ex Nihilo Creatio**: [https://ftbwiki.org/Ex_Nihilo_Creatio](https://ftbwiki.org/Ex_Nihilo_Creatio)
  - [Wooden Hammer](https://ftbwiki.org/Hammer_(Ex_Nihilo_Creatio)): Comminution chain (Cobble $\rightarrow$ Gravel $\rightarrow$ Sand $\rightarrow$ Dust).
  - [Sieve & Meshes](https://ftbwiki.org/Sieve_(Ex_Nihilo_Creatio)): Mesh tiers (String, Flint, Iron, Diamond), item sifting drop chances.
  - [Wooden Crucible](https://ftbwiki.org/Crucible_(Ex_Nihilo_Creatio)): Foliage/sapling melting into liquid water (leaves = 250 mB, sapling = 250 mB).
  - [Wooden Barrel](https://ftbwiki.org/Wooden_Barrel_(Ex_Nihilo_Creatio)): Fluid transformation reactions (1000 mB Water + 1x Dirt $\rightarrow$ Clay; 1000 mB Water + 1x Poop $\rightarrow$ Sewage).

### 2.4 Bonsai Trees & Organic Farming
- **FTB Wiki: Bonsai Trees**: [https://ftbwiki.org/Bonsai_Trees](https://ftbwiki.org/Bonsai_Trees)
  - Soil compatibility, growth lifecycle, wood cutting yields, and twerking/sneaking growth acceleration.

### 2.5 NuclearCraft & Power Generation
- **FTB Wiki: NuclearCraft**: [https://ftbwiki.org/NuclearCraft](https://ftbwiki.org/NuclearCraft)
  - [Decay Generator](https://ftbwiki.org/Decay_Generator): Early RF power generator producing 16 RF/t from decaying radioactive isotopes/uranium grits.

### 2.6 Modular Machinery
- **FTB Wiki: Modular Machinery**: [https://ftbwiki.org/Modular_Machinery](https://ftbwiki.org/Modular_Machinery)
  - Multiblock assembly, Modular Controller, Input/Output Buses, Energy Input Hatch, and recipe processing (e.g., Modular Compactor compressing Modularium into `compactmachines3:wallbreakable`).

### 2.7 Immersive Engineering
- **FTB Wiki: Immersive Engineering**: [https://ftbwiki.org/Immersive_Engineering](https://ftbwiki.org/Immersive_Engineering)
  - [Industrial Hemp](https://ftbwiki.org/Industrial_Hemp_Seeds): Two-block-tall crop yielding hemp fiber and seeds.
  - [Metal Grits & Dusts](https://ftbwiki.org/Metal_Grit): Copper, iron, tin, lead, and uranium grits dropped by pickaxe wall scraping.

---

## 3. Upstream Configuration & Script Files Mapping

Each system implemented in this repository directly maps to upstream configuration files in `kamunimaximus/CompactClaustrophobia`:

| In-Game System | Upstream Source File | Key Rules / Specifications Verified |
| :--- | :--- | :--- |
| **Wall Punching (Bare Hands)** | [`config/scavenge/compactloot.json`](https://github.com/kamunimaximus/CompactClaustrophobia/blob/master/config/scavenge/compactloot.json) | Drops `dirtdust` (70 weight), `graveldust` (20 weight), empty (10%). Requires empty hand; costs 1 HP damage and 0.6 exhaustion; stops at <= 1 HP with bruised message. |
| **Wall Scraping (Pickaxes)** | [`config/scavenge/pickdrops.json`](https://github.com/kamunimaximus/CompactClaustrophobia/blob/master/config/scavenge/pickdrops.json) | Wooden Pickaxe drops stone pebbles (80 stone, 20 granite, 10 diorite, 5 andesite); Stone Pickaxe drops metal grits (50 copper, 10 iron, 10 tin, 10 lead, 10 beryllium); Iron & Steel pickaxes drop tech dusts. |
| **Sneak-Pooping** | [`config/CropDusting.cfg`](https://github.com/kamunimaximus/CompactClaustrophobia/blob/master/config/CropDusting.cfg) | Sneaking timer triggers `cropdusting:poop` generation behind player; fertilizer for soil. |
| **Dirt Tilling & Rummaging** | [`config/scavenge/compactloot.json`](https://github.com/kamunimaximus/CompactClaustrophobia/blob/master/config/scavenge/compactloot.json) | Right-clicking dirt with empty hand transforms dirt into farmland (25% chance) and yields drops: wheat seeds (15%), oak sapling (15%), spruce/birch/acacia (5% each), dark oak (2.5%), jungle (0.5%), hemp seed (2%). |
| **Hand & Crafting Recipes** | [`scripts/otherrecipes.zs`](https://github.com/kamunimaximus/CompactClaustrophobia/blob/master/scripts/otherrecipes.zs), [`scripts/recipes.zs`](https://github.com/kamunimaximus/CompactClaustrophobia/blob/master/scripts/recipes.zs) | 4x `dirtdust` $\rightarrow$ 1x `dirt`; 4x `graveldust` $\rightarrow$ 1x `gravel`; 4x pebbles $\rightarrow$ 1x `cobblestone`; poop + wheat $\rightarrow$ `poopfuel`; 4x wood planks $\rightarrow$ `craftingstation:crafting_station`. |
| **Bonsai Processing** | [`scripts/bonsai.zs`](https://github.com/kamunimaximus/CompactClaustrophobia/blob/master/scripts/bonsai.zs) | 4x `bonsai_oak_cutting` $\rightarrow$ 4x `minecraft:planks`. |
| **In-World Fluid Transformations** | [`scripts/inworld.zs`](https://github.com/kamunimaximus/CompactClaustrophobia/blob/master/scripts/inworld.zs) | Water + poop $\rightarrow$ sewage; sewage + dust $\rightarrow$ slag; crucible leaf melting $\rightarrow$ water. |
| **Custom Mod Items & Blocks** | [`scripts/content.zs`](https://github.com/kamunimaximus/CompactClaustrophobia/blob/master/scripts/content.zs) | ContentTweaker items: `dirtdust`, `graveldust`, `poopfuel`, `modulariumblend`, `corruptpsd`. Fluids: `compactfluid`, `sewagefluid`. |
| **Quests Progression Tree** | [`config/betterquesting/DefaultQuests.json`](https://github.com/kamunimaximus/CompactClaustrophobia/blob/master/config/betterquesting/DefaultQuests.json) | Chapter 1 Quests #142, #68, #13, #20, #32, #9, #8, #25, #28, #22, #78, #27, #12, #14, #24, #23, #10. |
| **Miniaturization Crafting** | [`config/compactmachines3/recipes/*.json`](https://github.com/kamunimaximus/CompactClaustrophobia/tree/master/config/compactmachines3/recipes) | Field projector recipe definitions for Tiny (`machine-tiny.json`), Small (`machine-small.json`), Normal (`machine-normal.json`), Tunnel Tool (`tunneltool.json`), etc. |
