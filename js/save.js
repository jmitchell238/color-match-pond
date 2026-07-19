'use strict';

const defaultSave = () => ({
  muted: false,
  reducedMotion: false,
  matches: 0,
  levelsDone: 0,
  mode: 'easy',
});

let save = defaultSave();

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) { save = defaultSave(); return save; }
    save = Object.assign(defaultSave(), JSON.parse(raw));
    if (!MODE_ORDER.includes(save.mode)) save.mode = 'easy';
  } catch { save = defaultSave(); }
  return save;
}

function persistSave() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch { /* */ }
}

function recordMatch() {
  save.matches = (save.matches | 0) + 1;
  persistSave();
}

function recordLevel() {
  save.levelsDone = (save.levelsDone | 0) + 1;
  persistSave();
}

function setMuted(v) { save.muted = !!v; persistSave(); }
function setReducedMotion(v) { save.reducedMotion = !!v; persistSave(); }
function setMode(id) {
  if (MODE_ORDER.includes(id)) { save.mode = id; persistSave(); }
}

loadSave();
