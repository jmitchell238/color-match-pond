'use strict';

// Color Match Pond — Keep CACHE in sw.js in sync: 'color-match-pond-' + GAME_VERSION
const GAME_VERSION = '1.0.001';
const GAME_VERSION_LABEL = 'v' + GAME_VERSION;
const GAME_NAME = 'Color Match Pond';

const W = 390;
const H = 700;
const SAVE_KEY = 'color-match-pond-save-v1';

/** Super-distinct colors for little kids */
const COLORS = [
  { id: 'red',    label: 'Red',    pad: '#FF5252', padDark: '#C62828', animal: '#FF8A80', rim: '#B71C1C' },
  { id: 'blue',   label: 'Blue',   pad: '#42A5F5', padDark: '#1565C0', animal: '#90CAF9', rim: '#0D47A1' },
  { id: 'green',  label: 'Green',  pad: '#66BB6A', padDark: '#2E7D32', animal: '#A5D6A7', rim: '#1B5E20' },
  { id: 'yellow', label: 'Yellow', pad: '#FFEE58', padDark: '#F9A825', animal: '#FFF59D', rim: '#F57F17' },
  { id: 'purple', label: 'Purple', pad: '#AB47BC', padDark: '#6A1B9A', animal: '#CE93D8', rim: '#4A148C' },
  { id: 'orange', label: 'Orange', pad: '#FFA726', padDark: '#EF6C00', animal: '#FFCC80', rim: '#E65100' },
];

/** Modes: color count + free vs challenge */
const MODES = {
  free:  { id: 'free',  name: 'Free Play',  tagline: '2 colors · cozy', colors: 2, rounds: 0 },
  easy:  { id: 'easy',  name: 'Easy',      tagline: '3 colors · short', colors: 3, rounds: 5 },
  more:  { id: 'more',  name: 'A Little More', tagline: '4 colors', colors: 4, rounds: 8 },
  full:  { id: 'full',  name: 'Full Pond', tagline: '5–6 colors', colors: 6, rounds: 10 },
};
const MODE_ORDER = ['free', 'easy', 'more', 'full'];

const ANIMAL_KINDS = ['frog', 'duck', 'fish', 'turtle'];

const PRAISE = ['Splash!', 'Yay!', 'Nice!', 'Match!', 'Wow!', 'Yes!', 'Great!'];
