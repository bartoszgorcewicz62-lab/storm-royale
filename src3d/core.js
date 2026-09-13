'use strict';

const WORLD3 = 800, CELL3 = 2, TAU3 = Math.PI * 2;

const RARITIES3 = [
  { name: 'Common', mult: 1.0, col: '#b8bcc4', w: 35 },
  { name: 'Uncommon', mult: 1.12, col: '#3ecb3e', w: 27 },
  { name: 'Rare', mult: 1.25, col: '#2f9bff', w: 20 },
  { name: 'Epic', mult: 1.4, col: '#c14df0', w: 12 },
  { name: 'Legendary', mult: 1.6, col: '#ffaa1e', w: 6 }
];

const AMMO_TYPES3 = {
  light: { name: 'Light Ammo', col: '#ffd94a', box: 24 },
  medium: { name: 'Medium Ammo', col: '#ff9f43', box: 20 },
  shell: { name: 'Shells', col: '#e05c4f', box: 8 },
  heavy: { name: 'Heavy Ammo', col: '#8ab4ff', box: 5 }
};

const WEAPONS3 = {
  pistol: { name: 'PISTOL', dmg: 24, rof: 0.3, spread: 0.05, range: 70, pellets: 1, mag: 12, reload: 1.3, ammo: 'light', len: 0.5, gw: 0.09 },
  smg: { name: 'SMG', dmg: 13, rof: 0.08, spread: 0.12, range: 50, pellets: 1, mag: 30, reload: 1.8, ammo: 'light', len: 0.62, gw: 0.1 },
  ar: { name: 'ASSAULT RIFLE', dmg: 30, rof: 0.175, spread: 0.05, range: 95, pellets: 1, mag: 25, reload: 2.1, ammo: 'medium', len: 0.8, gw: 0.11 },
  shotgun: { name: 'SHOTGUN', dmg: 10, rof: 0.9, spread: 0.2, range: 22, pellets: 7, mag: 5, reload: 2.6, ammo: 'shell', len: 0.78, gw: 0.13 },
  sniper: { name: 'SNIPER', dmg: 95, rof: 1.6, spread: 0.004, range: 200, pellets: 1, mag: 3, reload: 2.8, ammo: 'heavy', len: 1.05, gw: 0.1 }
};

const ITEMS3 = {
  bandage: { name: 'Bandage', time: 1.5, heal: 15, shield: 0, cap: 100, col: '#eef4ea' },
  medkit: { name: 'Medkit', time: 3.0, heal: 100, shield: 0, cap: 100, col: '#e8f5e9' },
  shieldS: { name: 'Small Shield', time: 1.5, heal: 0, shield: 25, cap: 50, col: '#7fd4f5' },
  shieldL: { name: 'Big Shield', time: 2.5, heal: 0, shield: 50, cap: 100, col: '#4fa8f0' }
};

const PHASES3 = [
  { hold: 25, shrink: 22, radius: 420, dps: 1 },
  { hold: 18, shrink: 18, radius: 240, dps: 2 },
  { hold: 15, shrink: 15, radius: 130, dps: 4 },
  { hold: 12, shrink: 12, radius: 70, dps: 7 },
  { hold: 9, shrink: 10, radius: 30, dps: 10 }
];

const PIECES3 = {
  wall: {
    name: 'WALL', cost: 10, h: 2.6,
    variants: [
      { sx: 1, sy: 1, ox: 0, oy: 0 },
      { sx: 1, sy: 0.5, ox: 0, oy: -0.65 },
      { sx: 1, sy: 0.5, ox: 0, oy: 0.65 },
      { sx: 0.5, sy: 1, ox: -0.5, oy: 0 },
      { sx: 0.5, sy: 1, ox: 0.5, oy: 0 }
    ],
    makeGeo: () => new THREE.BoxGeometry(CELL3, 2.6, 0.16)
  },
  floor: {
    name: 'FLOOR', cost: 10, h: 0.14,
    variants: [
      { sx: 1, sy: 1, ox: 0, oy: 0 },
      { sx: 0.5, sy: 1, ox: -0.5, oy: 0 }
    ],
    makeGeo: () => new THREE.BoxGeometry(CELL3, 0.14, CELL3)
  },
  ramp: {
    name: 'RAMP', cost: 10, h: 1.3,
    variants: [
      { sx: 1, sy: 1, ox: 0, oy: 0 },
      { sx: 0.5, sy: 1, ox: -0.5, oy: 0 },
      { sx: 0.5, sy: 1, ox: 0.5, oy: 0 }
    ],
    makeGeo: () => makeWedgeGeom3(CELL3, 1.3, CELL3)
  },
  cone: {
    name: 'CONE', cost: 10, h: 1.3,
    variants: [
      { sx: 1, sy: 1, ox: 0, oy: 0 },
      { sx: 0.5, sy: 1, ox: -0.5, oy: 0 }
    ],
    makeGeo: () => new THREE.ConeGeometry(CELL3 * 0.71, 1.3, 4)
  }
};

const ARCHETYPES3 = ['scout', 'viper', 'ghost'];

const SKIN_TONES3 = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524'];

const BOT_NAMES3 = [
  'Ninja_Wannabe', 'DefaultDanny', 'xX_Sn1per_Xx', 'BushCamper', 'Llama_Lord', 'CrankedKid',
  'NoScopeNate', 'Peely_Fan', 'TiltedTed', 'SaltySam', 'TomatoTom', 'Drift_King', 'Raven_Rules',
  'SkullTrooper', 'BoogieBomber', 'ChugJugChad', 'SlurpySteve', 'ZeroBuildZoe', 'OneShotOllie',
  'Midas_Touch', 'FishstickFred', 'Rift_Rider', 'PumpNRun', 'BushWookie', 'StormChaser',
  'LootGoblin', 'CrankMaster', 'GhostPeeker', 'WallTaker'
];

const G3 = {
  player: null,
  bots: [],
  loot: [],
  parts: [],
  nums: [],
  feed: [],
  builds: new Map(),
  trees: [],
  rocks: [],
  bushes: [],
  houses: [],
  blockers: [],
  storm: null,
  now: 0,
  running: false,
  paused: false,
  ended: false,
  muted: false,
  hitFlash: 0,
  shake: 0,
  killBanner: null,
  camYaw: 0,
  camPitch: -0.2,
  camPos: { x: 0, y: 8, z: 20 },
  camDir: { x: 0, y: -0.2, z: -1 },
  scene: null,
  camera: null,
  renderer: null,
  stormWall: null,
  stormFloor: null,
  stormRing: null,
  stormTarget: null,
  sun: null
};
