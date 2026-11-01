# Evaluation of Alternatives to JavaScript/TypeScript & WebAssembly Wire Format Bottlenecks

This document provides a technical evaluation of programming language alternatives to JavaScript/TypeScript for the *Compact Claustrophobia* canvas reimplementation. It focuses specifically on WebAssembly (Wasm) integration, performance trade-offs, and critical bottlenecks associated with wire format conversions and boundary crossing.

---

## 1. Executive Summary & Context

*Compact Claustrophobia* is being reimplemented as an isometric canvas factory and spatial puzzle game. The engine requires:
- **Strict Determinism**: 20 Hz fixed-timestep simulation running over a 3-player lockstep peer-to-peer WebRTC network.
- **Rendering Separation**: Canvas-based 2.5D isometric projection decoupled from tick simulation, with an HTML/SVG top UI layer handling elevation selection, reticles, and tooltips.
- **Low Latency & High Memory Efficiency**: Zero garbage collection pauses during simulation, low memory footprint, and rapid serialization of inputs and state hashes.

While modern JavaScript engines (V8, SpiderMonkey, JavaScriptCore) are highly optimized, dynamic typing, non-deterministic object ordering, and unpredictable Garbage Collection (GC) pauses can threaten lockstep synchronization. Compiling a systems language to WebAssembly is the primary alternative considered.

---

## 2. Evaluation of Candidate Languages for WebAssembly

### 2.1 Rust
- **Maturity & Ecosystem**: Tier 1 WebAssembly target (`wasm32-unknown-unknown`). Mature tooling via `wasm-bindgen`, `wasm-pack`, and `wee_alloc`.
- **Determinism**: Highly deterministic integer arithmetic and bit manipulation. Strict static memory management with zero GC pauses.
- **Data Layout Control**: Direct control over memory layout (`#[repr(C)]`, packed structs). Allows seamless binary representation aligned with wire formats.
- **Tooling & Ergonomics**: Excellent type system, algebraic data types matching game actions/recipes, and compile-time guarantees against concurrency bugs.
- **Drawbacks**: Slower iteration cycles (longer compilation times compared to TS), non-trivial binary size without optimization flags (`opt-level = "z"`, `wasm-opt`).

### 2.2 Zig
- **Maturity & Ecosystem**: First-class Wasm compilation target directly out of the box (`zig build-exe -target wasm32-freestanding`).
- **Binary Size & Simplicity**: Minimal runtime overhead. Capable of producing sub-10KB wasm binaries with zero external dependencies.
- **Determinism & Memory Control**: Explicit custom allocators (e.g. Arena, FixedBufferAllocator) make deterministic simulation and memory budgeting trivial.
- **Drawbacks**: Younger ecosystem; lack of high-level web binding libraries (requires manual `extern "env"` bindings or minimal C-ABI bridges); smaller developer community.

### 2.3 C / C++ (Emscripten / Clang)
- **Maturity & Ecosystem**: Longest-standing WebAssembly target. Emscripten provides a complete POSIX emulation layer, WebGL bindings, and SDL.
- **Performance**: Peak raw computational speed with fine-grained SIMD and memory layout control.
- **Drawbacks**: Emscripten toolchain can introduce significant runtime glue code. Lack of memory safety at compile time makes state corruptions harder to debug in desync-sensitive lockstep simulations.

### 2.4 Go (Standard `wasm` / TinyGo)
- **Maturity & Ecosystem**: Go 1.11+ natively compiles to Wasm; TinyGo targets embedded systems and WebAssembly.
- **Drawbacks**: Standard Go includes the full Go runtime and Garbage Collector (~2–5 MB minimum wasm binary). While TinyGo produces smaller binaries, Go's stop-the-world GC introduces unpredictable frame drops and latency spikes that jeopardize 20 Hz lockstep frames. **Not recommended for the core deterministic simulation.**

### 2.5 C# (Blazor / Native AOT)
- **Maturity & Ecosystem**: Blazor WebAssembly runs mono runtime or Native AOT.
- **Drawbacks**: Heavy payload (>5–10 MB for standard Blazor), heavy GC pressure, and complex boundary marshaling through JSInterop. **Not recommended.**

---

## 3. WebAssembly <-> JavaScript Boundary & Wire Format Bottlenecks

The most critical architectural hazard when using WebAssembly for browser games is the **Wasm-JS Boundary Crossing Cost** and **Data Serialization / Wire Format Conversion Overhead**.

```
+---------------------------------------------------------------------------------+
|                               BROWSER RUNTIME                                   |
|                                                                                 |
|   +-----------------------+                    +----------------------------+   |
|   | JavaScript / DOM / UI |                    |   WebAssembly Linear Mem   |   |
|   | - HTML5 / SVG Overlay |                    | - 20 Hz Lockstep Engine    |   |
|   | - Canvas 2D Context   |                    | - Spatial Voxel Graph      |   |
|   | - WebRTC DataChannels |                    | - Inventory & Factory Logic|   |
|   +-----------+-----------+                    +--------------+-------------+   |
|               |                                               |                 |
|               |  BOUNDARY CONVERSION / SERIALIZATION OVERHEAD  |                 |
|               +===============================================+                 |
|                   - JSON.stringify / JSON.parse (SLOWEST)                       |
|                   - Protobuf / MessagePack (HIGH CPU/ALLOC)                     |
|                   - FlatBuffers (ZERO-COPY READ, EXPENSIVE BUILD)               |
|                   - Shared TypedArray / Direct Memory View (OPTIMAL)            |
+---------------------------------------------------------------------------------+
```

### 3.1 The Root Causes of Boundary Bottlenecks

1. **Memory Isolation (Linear Memory vs. V8 Heap)**:
   - WebAssembly operates on an isolated linear memory buffer (`WebAssembly.Memory`, backed by an `ArrayBuffer`).
   - JavaScript objects (DOM elements, JSON objects, garbage-collected strings) cannot exist directly inside Wasm linear memory.
   - Passing complex objects across the boundary requires copying, serializing, or converting pointers.

2. **Call Overhead**:
   - Calling an exported Wasm function with primitive arguments (integers, floats) is nearly as fast as a standard JS function call (a few nanoseconds).
   - However, calling Wasm hundreds or thousands of times per animation frame (e.g. asking Wasm for individual tile properties during isometric rendering) causes significant FFI overhead and pipeline stalls.

3. **Garbage Collection (GC) Thrashing on the JS Side**:
   - If Wasm serializes state to JSON or intermediate JS objects every tick (20 times per second) or every render frame (60–120 times per second), the JavaScript garbage collector will trigger periodic sweeps (5–30ms pauses), causing stutter and lockstep lag.

---

## 4. Evaluation of Wire Formats & Data Exchange Protocols

To exchange lockstep packets (player inputs, state hashes) over WebRTC and exchange render buffers between Wasm and Canvas/JS, several serialization formats were evaluated:

| Format | Serialization Speed | Deserialization Speed | JS GC Allocation | Wasm Interop Complexity | Suitability |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **JSON** (`JSON.stringify` / `serde_json`) | Very Slow (~5–10 MB/s) | Very Slow (~10–15 MB/s) | **Severe** (Creates thousands of transient JS objects) | Low (Trivial in JS, heavy in Wasm) | **Unacceptable** for tick simulation / lockstep. |
| **MessagePack** (`msgpack-lite` / `rmp-serde`) | Moderate (~30–50 MB/s) | Moderate (~40–60 MB/s) | **High** (Transient JS objects created) | Moderate | Suboptimal. |
| **Protocol Buffers** (`protobuf.js` / `prost`) | Fast (~80–120 MB/s) | Fast (~100–150 MB/s) | **Moderate** (Objects decoded into JS classes) | High (Requires code generation & runtime) | Acceptable for network packets, poor for per-frame render sync. |
| **FlatBuffers** | Instant encode (zero-copy read) | Instant (Accesses buffer directly via vtable offsets) | **Zero / Minimal** (Reads direct from byte array) | High (Complex schema and accessor code) | Excellent for network packets, moderate complexity. |
| **Raw Binary Structs / Direct Shared Memory Views** | **Instant** (Direct memory write) | **Instant** (Direct `TypedArray` view) | **Zero** (Reuses fixed `ArrayBuffer` views) | Low / Clean (Direct C/Rust `#[repr(C)]` layout) | **Optimal & Recommended**. |

### 4.1 Detailed Breakdown of the Direct Shared Memory Pattern

Rather than serializing state across the boundary, the optimal pattern uses **Direct Shared Memory Views**:

1. **Allocating Fixed Buffers in Wasm Linear Memory**:
   - Wasm allocates a contiguous array of render instances (e.g. `RenderTileInstance` struct containing `x`, `y`, `z`, `tile_id`, `state_flags`, `variant`).
   - The struct uses `#[repr(C, packed)]` to guarantee deterministic, unpadded byte layout.
2. **Creating Zero-Copy TypedArray Views in JS**:
   - JavaScript acquires a view into Wasm's linear memory:
     ```javascript
     const tileBufferView = new Uint32Array(
       wasmInstance.exports.memory.buffer,
       renderBufferPointer,
       renderedTileCount * FIELDS_PER_TILE
     );
     ```
   - No memory copying occurs. The Canvas 2D/WebGL rendering pipeline reads coordinates and sprite indices directly from the `Uint32Array` view.
3. **Lockstep Network Packets**:
   - For network traffic (P2P inputs), messages are fixed-size binary structs (e.g. 8 to 16 bytes per input packet: `tick: u32`, `player_id: u8`, `action_code: u8`, `arg0: u16`, `arg1: u16`).
   - WebRTC `RTCDataChannel` handles binary `ArrayBuffer` directly without stringification.
   - Wasm receives the raw byte pointer, reads fields with zero deserialization overhead, and executes the tick.

---

## 5. Architectural Recommendation & Staging Plan

Based on the project constraints and the "Go Tall, Not Wide" checkpoint strategy:

### Phase 1: Pure TypeScript / JavaScript Foundation (Current Stage)
- **Decision**: Implement Chapter 1 in modular, strictly-typed TypeScript.
- **Rationale**:
  - Eliminates build tooling friction and boundary overhead while rapidly fleshing out Chapter 1 mechanics (recipes, quest triggers, room graphs, 2-stage targeting).
  - Isolates core deterministic simulation logic into pure, side-effect-free functions using deterministic integer coordinates and deterministic PRNGs (Mulberry32).
  - Avoids premature optimization before the vertical slice is validated.

### Phase 2: Hybrid WebAssembly Simulation (Post-Chapter 1 Milestone)
- **Target Language**: **Rust** (`wasm32-unknown-unknown`).
- **Architecture**:
  - Port the deterministic simulation engine (`RoomGraph`, `TickPipeline`, `ConduitSolver`, `RecipeRegistry`) to Rust.
  - Keep the HTML/SVG Top UI overlay and Canvas rendering in TypeScript/JavaScript.
  - Bridge the boundary using the **Direct Shared Memory Pattern** (`Uint32Array` views into Wasm linear memory) and compact fixed-width binary packets over `RTCDataChannel`.
- **Precaution**: Ensure no per-tile function calls cross the Wasm boundary during rendering; batch entire frame instances into contiguous memory.
