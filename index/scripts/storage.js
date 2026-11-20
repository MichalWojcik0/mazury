import { engine, dom } from "./state.js";

export const SAVE_STORAGE_KEY = "compact_claustrophobia_save_v1";

let statusTimeout = null;

function setSaveStatus(text, durationMs = 2000) {
  if (!dom.saveStatus) return;
  dom.saveStatus.textContent = text;
  if (statusTimeout) {
    clearTimeout(statusTimeout);
    statusTimeout = null;
  }
  if (durationMs > 0) {
    statusTimeout = setTimeout(() => {
      if (dom.saveStatus) dom.saveStatus.textContent = "";
      statusTimeout = null;
    }, durationMs);
  }
}

export function saveGame(silent = false) {
  try {
    const data = engine.serialize();
    localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(data));
    if (!silent) {
      setSaveStatus("Saved ✓");
    }
    return true;
  } catch (err) {
    console.error("Failed to save game locally:", err);
    if (!silent) {
      setSaveStatus("Save failed", 3000);
    }
    return false;
  }
}

export function loadSavedGame() {
  try {
    const raw = localStorage.getItem(SAVE_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    const ok = engine.deserialize(parsed);
    if (ok) {
      setSaveStatus("Loaded save", 2500);
    }
    return ok;
  } catch (err) {
    console.error("Failed to load local save:", err);
    return false;
  }
}

export function resetSave(onReset) {
  try {
    localStorage.removeItem(SAVE_STORAGE_KEY);
  } catch (err) {
    console.error("Failed to clear local save:", err);
  }
  engine.reset();
  setSaveStatus("Save reset", 2500);
  if (typeof onReset === "function") {
    onReset();
  }
}
