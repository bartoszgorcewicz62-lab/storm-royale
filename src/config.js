'use strict';

const WORLD = 3200, CELL = 40, TAU = Math.PI * 2;

const RARITIES = [
  { name: 'Common', mult: 1.0, col: '#b8bcc4', w: 35 },
  { name: 'Uncommon', mult: 1.12, col: '#3ecb3e', w: 27 },
  { name: 'Rare', mult: 1.25, col: '#2f9bff', w: 20 },
  { name: 'Epic', mult: 1.4, col: '#c14df0', w: 12 },
  { name: 'Legendary', mult: 1.6, col: '#ffaa1e', w: 6 }
];

const AMMO_TYPES = {
  light: { name: 'Light Ammo', col: '#ffd94a', box: 24 },
  medium: { name: 'Medium Ammo', col: '#ff9f43', box: 20 },
  shell: { name: 'Shells', col: '#e05c4f', box: 8 },
  heavy: { name: 'Heavy Ammo', col: '#8ab4ff', box: 5 }
};

const WEAPONS = {
  pistol: { name: 'PISTOL', dmg: 24, rof: 0.3, spread: 0.05, speed: 1000, range: 620, pellets: 1, mag: 12, reload: 1.3, ammo: 'light', len: 13, gw: 4 },
  smg: { name: 'SMG', dmg: 13, rof: 0.08, spread: 0.13, speed: 950, range: 480, pellets: 1, mag: 30, reload: 1.8, ammo: 'light', len: 17, gw: 4 },
  ar: { name: 'ASSAULT RIFLE', dmg: 30, rof: 0.175, spread: 0.055, speed: 1100, range: 780, pellets: 1, mag: 25, reload: 2.1, ammo: 'medium', len: 21, gw: 5 },
  shotgun: { name: 'SHOTGUN', dmg: 10, rof: 0.9, spread: 0.22, speed: 850, range: 330, pellets: 7, mag: 5, reload: 2.6, ammo: 'shell', len: 20, gw: 6 },
  sniper: { name: 'SNIPER', dmg: 95, rof: 1.6, spread: 0.004, speed: 1700, range: 1500, pellets: 1, mag: 3, reload: 2.8, ammo: 'heavy', len: 27, gw: 4 }
};

const ITEMS = {
  bandage: { name: 'Bandage', time: 1.5, heal: 15, shield: 0, cap: 100, col: '#eef4ea' },
  medkit: { name: 'Medkit', time: 3.0, heal: 100, shield: 0, cap: 100, col: '#e8f5e9' },
  shieldS: { name: 'Small Shield', time: 1.5, heal: 0, shield: 25, cap: 50, col: '#7fd4f5' },
  shieldL: { name: 'Big Shield', time: 2.5, heal: 0, shield: 50, cap: 100, col: '#4fa8f0' }
};

const PHASES = [
  { hold: 20, shrink: 22, radius: 1050, dps: 1 },
  { hold: 15, shrink: 18, radius: 650, dps: 2 },
  { hold: 13, shrink: 15, radius: 380, dps: 4 },
  { hold: 10, shrink: 12, radius: 180, dps: 7 },
  { hold: 8, shrink: 10, radius: 60, dps: 10 }
];

const OUTFITS = [
  '#d45b3b', '#3b7bd4', '#3bd46b', '#b03bd4', '#d4b03b', '#3bd4c4', '#d43b7a', '#7a3bd4',
  '#8a9a3b', '#3b8ad4', '#d48a3b', '#4ad47a', '#c45ce0', '#5c8ae0', '#e0a95c', '#5cd8e0',
  '#e05c96', '#a3e05c', '#e07f5c', '#5c6ee0', '#4dbd7a', '#d94f8e', '#8f6bd9', '#d9a44f',
  '#4fb3d9', '#d95c4f', '#67d94f', '#d94fc4', '#4f9bd9'
];
const SKIN_TONES = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524'];
const HAIR_COLORS = ['#2b2118', '#4a3320', '#6b4a2f', '#1a1a1e', '#7a5c3a'];

const BOT_NAMES = [
  'Ninja_Wannabe', 'DefaultDanny', 'xX_Sn1per_Xx', 'BushCamper', 'Llama_Lord', 'CrankedKid',
  'NoScopeNate', 'Peely_Fan', 'TiltedTed', 'SaltySam', 'TomatoTom', 'Drift_King', 'Raven_Rules',
  'SkullTrooper', 'BoogieBomber', 'ChugJugChad', 'SlurpySteve', 'ZeroBuildZoe', 'OneShotOllie',
  'Midas_Touch', 'FishstickFred', 'Rift_Rider', 'PumpNRun', 'BushWookie', 'StormChaser',
  'LootGoblin', 'CrankMaster', 'GhostPeeker', 'WallTaker'
];

const G = {
  player: null,
  bots: [],
  bullets: [],
  loot: [],
  parts: [],
  nums: [],
  feed: [],
  builds: new Map(),
  trees: [],
  rocks: [],
  bushes: [],
  houses: [],
  patches: [],
  storm: null,
  now: 0,
  camX: 0,
  camY: 0,
  running: false,
  paused: false,
  ended: false,
  muted: false,
  hitFlash: 0,
  shake: 0,
  killBanner: null
};
