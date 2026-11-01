# Progression & Quests Specification

This document maps out the quest progression tree of *Compact Claustrophobia*, with quest IDs, pre-requisites, objectives, and unlockable capabilities.

> **Design Choice Cross-Reference**:
> - All crafting objectives are completed using the **List Crafting Interface** (no 2x2/3x3 crafting grids).
> - Gameplay is rendered in **Isometric Canvas view**, and up to 3 players progress cooperatively over **deterministic lockstep peer networking**.
> - Miniaturization and Tunnels follow the accurate **Compact Machines 3** specifications (indestructible border walls vs breakable crafted walls, Tunnel Tool face mapping with 6-face max).

---

## Chapter 1: Compact Claustrophobia (The Beginning)

The player starts inside an unbreakable 3x3x3 Compact Machine room. The quest book guides the player through surviving, gathering resources, and escaping the confinement.

```
[#142: Stuck in a Hole] (Free Personal Shrinking Device)
         |
[#68: The Beginning?] (Interact with floor block / PSD)
         |
[#13: The Real Beginning] (Collect 4x Dirt Dust from walls)
    /                 \
   v                   v
[#20: Getting Dirty]  [#29: Eat Poop and DON'T die]
(Rummage Dirt)        (Sneak to poop, eat or burn)
   |                   |
   v                   v
[#32: Home Grown Wood][#30: Burn the Rest] (Make poop fuel)
(Bonsai oak sapling)
   |
   v
[#9: Wood's Good] (Planks, Crafting Station via List Crafting)
   |-----------------------------+-------------------------------+
   |                             |                               |
   v                             v                               v
[#8: Soft Pick]          [#27: Home Brewed]              [#22: Hammer Time]
(Wooden Pickaxe)         (Wooden Crucible)               (Ex Nihilo Hammer)
   |                             |                               |
   v                             v                               v
[#25: All Cobbled]       [#19: Dry Throat Cure]          [#21: Coarse'n'Everywhere]
(Pebbles -> Cobble)      (Crucible -> Water Bucket)      (Cobble -> Gravel/Sand/Dust)
   |                             |                               |
   v                             v                               v
[#28: Chubby Pick]       [#12: Old Tubby] (Barrel)       [#31: Fully Transparent]
(Stone Pickaxe)                  |                       (Smelt Sand -> Glass)
   |                     [#18: Clay.. Yup]                       |
   v                     (Water + Dirt -> Clay)                  |
[#17: Heavy Metal]               |                               |
(Iron from stone wall)   [#48: Dry Again Dust]                   |
   |                     (Smelt Clay -> Bricks)                  |
   +-----------------------------+-------------------------------+
                                 |
                                 v
                       [#23: Small Compactor]
                       (Multiblock: 3 Bricks, Controller, Hatches, Glass)
                                 |
                                 v
                       [#10: Infinite Tiny Rooms]
                       (Compactor crafts Breakable Wall; Field Projector builds Tiny Machine)
```

### Key Quests in Chapter 1:
1. **Quest #142 - "Stuck in a hole"**
   - *Requirement*: None (Intro).
   - *Reward*: 1x Personal Shrinking Device (`compactmachines3:psd`).
   - *Description*: Explains you are trapped in an inter-dimensional pocket dimension.
2. **Quest #68 - "The beginning?"**
   - *Prereq*: #142.
   - *Objective*: Right click the floor block with your PSD.
3. **Quest #13 - "The real beginning"**
   - *Prereq*: #68.
   - *Objective*: Obtain 4x `contenttweaker:dirtdust`.
   - *Method*: Punch the solid perimeter walls with your bare fists.
4. **Quest #20 - "Getting your hands dirty"**
   - *Prereq*: #13.
   - *Objective*: Craft 1x `minecraft:dirt` from the hand-crafting list and rummage it until prepared.
5. **Quest #32 - "Home grown wood"**
   - *Prereq*: #20.
   - *Objective*: Obtain 1x `arcadialbonsaitrees:bonsai_oak_sapling`.
   - *Method*: Twerk/sneak on soil to accelerate growth, harvest cuttings.
6. **Quest #9 - "Wood's Good"**
   - *Prereq*: #32.
   - *Objective*: Craft a `craftingstation:crafting_station` from 4 wood planks (via list crafting).
7. **Quest #8 - "Soft Pick"**
   - *Prereq*: #9.
   - *Objective*: Craft a `minecraft:wooden_pickaxe` (via list crafting).
   - *Unlocks*: Hitting solid walls drops stone, granite, diorite, and andesite pebbles.
8. **Quest #25 - "All Cobbled Together"**
   - *Prereq*: #8.
   - *Objective*: Craft 1x `minecraft:cobblestone` from 4 pebbles (via list crafting).
9. **Quest #28 - "Chubby Pick"**
   - *Prereq*: #25.
   - *Objective*: Craft a `minecraft:stone_pickaxe`.
   - *Unlocks*: Hitting solid walls drops metal grits (Copper, Iron, Tin, Lead, Beryllium).
10. **Quest #22 - "Hammer Time!... sigh.."**
    - *Prereq*: #9.
    - *Objective*: Craft an `exnihilocreatio:hammer_wood`.
    - *Unlocks*: Smash Cobble $\rightarrow$ Gravel $\rightarrow$ Sand $\rightarrow$ Dust.
11. **Quest #72, #71, #78, #77, #70 - The Sifting Line**
    - Obtain Industrial Hemp seeds from rummaging dirt.
    - Harvest Hemp Fibers $\rightarrow$ String $\rightarrow$ String Mesh $\rightarrow$ Wooden Sieve.
    - Sieve Gravel, Sand, and Dust for bulk iron and tech dusts.
12. **Quest #27 & #19 - Water Creation**
    - Craft a Wooden Crucible from list. Feed leaves/cuttings to melt into water.
    - Craft an Iron Bucket to collect water.
13. **Quest #12 & #18 - Clay Production**
    - Craft a Wooden Barrel from list. Add Water + Dirt $\rightarrow$ Clay.
    - Uncraft to clay balls, smelt into bricks.
14. **Quest #14 - "Decay and Growth"**
    - Craft a NuclearCraft `nuclearcraft:decay_generator`.
    - Generates 16 RF/t when radioactive isotopes (or Uranium grit) decay in its inventory.
15. **Quest #24 - "Auto Clicker"**
    - Craft a `clickmachine:auto_clicker`.
    - Automates wall punching and sifting.
16. **Quest #23 - "Small Compactor"**
    - Multiblock assembler requiring: 3x Bricks, 1x Modular Controller, 1x Input Bus, 1x Output Bus, 1x Energy Hatch, 1x Glass Pane, 1x Hopper, 1x Upper, 2x Stone Slabs.
    - Powered by the Decay Generator (16 RF/t).
    - Used to compress Modularium into `compactmachines3:wallbreakable`.
17. **Quest #10 - "Infinite Tiny Rooms"**
    - Craft Miniaturization Field Projectors.
    - Construct a 3x3x3 hollow structure of `compactmachines3:wallbreakable` and throw an Ender Pearl catalyst to create the first craftable Compact Machine (Tiny).

---

## Chapter 2: Infinite Tiny Space (Industrial Expansion)

Once the Compactor and Field Projectors are operational, the player constructs larger Compact Machines and begins expanding space exponentially.

### Key Milestones:
1. **Quest #65 - "Finally More Room"**:
   - Construct a **Small Compact Machine** (5x5x5 internal volume) via Miniaturization Field Projectors (wallbreakable shell + Iron Block core + Ender Pearl catalyst).
2. **Quest #66 - "A tunnel to other rooms"**:
   - Craft a **Tunnel Tool** (`compactmachines3:tunneltool`) via Miniaturization Field.
   - Right-click solid perimeter walls to configure up to 6 Tunnels mapped to the exterior machine faces (North, South, East, West, Up, Down).
3. **Quest #80 - "Treated Wood" & Immersive Engineering**:
   - Create Creosote Oil by pyrolyzing coal / charcoal.
   - Immersive Engineering Coke Oven and Blast Furnace for Steel.
4. **Quest #60 & #61 - "Metal Press" & "Power!"**:
   - Multiblock Metal Press for plates, rods, and wires.
   - Thermoelectric Generators for passive continuous power.
5. **Quest #168 - #171 - OpenComputers Automation**:
   - Craft an OpenComputers simple development robot.
   - Write Lua scripts to automate complex item routing and crafting within cramped 5x5 and 7x7 spaces.

---

## Chapter 3 & 4: Unlimited Dimensions & Agoraphobia (Endgame)

1. **Chapter 4 - Unlimited Dimensions**:
   - Miniaturize **Giant** (11x11x11) and **Maximum** (13x13x13) Compact Machines using glitched blocks and machine casings.
   - NuclearCraft Fission Reactors miniaturized inside 13x13 rooms.
   - Thermal Expansion Cryotheum and Blizz powder production.
2. **Chapter 3 - Extreme Agoraphobia**:
   - Building rocket technology inside compact rooms.
   - Launching out of the pocket dimensions into the Moon, Mars, and open space—finally escaping claustrophobia.
