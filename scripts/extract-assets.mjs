#!/usr/bin/env node
/**
 * Full 2-stage asset pipeline:
 *   1. Extract PNGs from `vendor/compact-claustrophobia/` jars -> `assets/textures/`
 *   2. Encode PNGs from `assets/textures/` -> `src/render/textures.ts`
 */

import { extractTextures } from "./extract-textures.mjs";
import { buildTexturesTs } from "./build-textures.mjs";

extractTextures(process.argv.slice(2));
buildTexturesTs();
