// REDLINE · everything the garage can change. Pure data, shared by sim, renderer and UI.
// All names, cars and liveries are original.

export const CARS = {
  wedge: {
    name: 'VANTA GT',
    blurb: 'The all-rounder. Sharp wedge, honest grip, no surprises.',
    top: 1.0, accel: 1.0, grip: 1.0, cool: 1.0,
  },
  coupe: {
    name: 'HALCYON',
    blurb: 'Long-legged grand tourer. Highest top end, sheds heat fast, lazy in the bends.',
    top: 1.07, accel: 0.88, grip: 0.9, cool: 1.3,
  },
  bike: {
    name: 'TSUBAME',
    blurb: 'Long, low, fully faired. The quickest thing in the garage off the line; leans hard and slips through gaps a car can\'t.',
    top: 1.04, accel: 1.18, grip: 1.08, cool: 0.95, bike: true,
  },
  kei: {
    name: 'MOSQUITO',
    blurb: 'Tiny city box. Launches like a slingshot and darts between lanes. Runs hot.',
    top: 0.93, accel: 1.25, grip: 1.25, cool: 0.85,
  },
};

// body = paint, stripe = livery stripe, trim = wing / rims / accents
export const LIVERIES = [
  { name: 'BONE', body: '#e9e4d8', stripe: '#ff003c', trim: '#15121d' },
  { name: 'SIGNAL', body: '#fcee0a', stripe: '#0d0d0d', trim: '#0d0d0d' },
  { name: 'MIDNIGHT', body: '#1b1830', stripe: '#00f0ff', trim: '#ff2bd6' },
  { name: 'ROSSO', body: '#c8102e', stripe: '#f5f2ea', trim: '#111111' },
  { name: 'AKAI', body: '#e0141e', stripe: '#ffe7c2', trim: '#1a0d0f' },
  { name: 'GHOST', body: '#8e95a8', stripe: '#b8ff2e', trim: '#1b1b22' },
  { name: 'ORCHID', body: '#ff2bd6', stripe: '#16121f', trim: '#00f0ff' },
];

export const GLOWS = [
  { name: 'CYAN', color: '#00f0ff' },
  { name: 'MAGENTA', color: '#ff2bd6' },
  { name: 'ACID', color: '#b8ff2e' },
  { name: 'AMBER', color: '#ffb000' },
  { name: 'OFF', color: null },
];

// Time of day sets the sky, fog, light and the colour of the city.
export const TIMES = {
  // the default world: a sleepless city at 2am. Fluorescent whites, sodium amber, red beacons, red haze on the horizon.
  tokyo: {
    name: 'MIDNIGHT TOKYO',
    zenith: '#02040c', horizon: '#141c40', glow: '#ff3326', fog: '#0a0d1e',
    body: { kind: 'moon', color: '#f4f1ff', size: 70, y: 280 },
    hemi: ['#5a6cff', '#040509', 0.35], key: ['#c8d4ff', 0.25],
    windows: ['#eef4ff', '#ffd39a', '#ff2a3a', '#8feaff'], stars: 0.06, fogDensity: 0.0032,
    searchlights: true,
  },
  dusk: {
    name: 'DUSK',
    zenith: '#120828', horizon: '#ff3f8e', glow: '#ff7a59', fog: '#5a1650',
    body: { kind: 'moon', color: '#ffe9d6', size: 120, y: 190 },
    hemi: ['#ff5aa0', '#120a1e', 0.55], key: ['#ff9a7a', 0.35],
    windows: ['#fcee0a', '#00f0ff', '#ff2bd6', '#ffb36b'], stars: 0.15, fogDensity: 0.0042,
  },
  midnight: {
    name: 'NEON BLUE',
    zenith: '#02030c', horizon: '#1f2f7a', glow: '#3a5bff', fog: '#0b1030',
    body: { kind: 'moon', color: '#dfe9ff', size: 70, y: 260 },
    hemi: ['#4a62ff', '#05060f', 0.45], key: ['#9fb4ff', 0.3],
    windows: ['#00f0ff', '#ff2bd6', '#b8ff2e', '#e6ecff'], stars: 1.0, fogDensity: 0.0036,
  },
  dawn: {
    name: 'DAWN',
    zenith: '#1a1440', horizon: '#ffb36b', glow: '#ffd36b', fog: '#7a3a5c',
    body: { kind: 'sun', color: '#ffd84a', size: 150, y: 110 },
    hemi: ['#ffb07a', '#1a1022', 0.7], key: ['#ffcf8a', 0.5],
    windows: ['#fcee0a', '#ff8a3d', '#ff2bd6', '#ffe2b0'], stars: 0, fogDensity: 0.0038,
  },
};

export const WEATHER = {
  clear: { name: 'CLEAR', grip: 1.0, rain: 0, wet: 0.55 },
  rain: { name: 'RAIN', grip: 0.82, rain: 1, wet: 1.0 },
};

export const DIFFICULTY = {
  chill: { name: 'CHILL', density: 0.6, trafficSpeed: 0.9, lives: 5, blurb: 'Light traffic, five hits.' },
  street: { name: 'STREET', density: 1.0, trafficSpeed: 1.0, lives: 3, blurb: 'The intended ride.' },
  redline: { name: 'REDLINE', density: 1.45, trafficSpeed: 1.12, lives: 2, blurb: 'Rush hour. Two hits.' },
};

export const QUALITY = {
  low: { name: 'LOW', pixelRatio: 0.75, bloom: 0.5, buildings: 90 },
  balanced: { name: 'BALANCED', pixelRatio: 1, bloom: 0.5, buildings: 140 },
  high: { name: 'HIGH', pixelRatio: 1.6, bloom: 0.5, buildings: 180 },
};

export const DEFAULT_CONFIG = {
  car: 'wedge',
  livery: 0,
  glow: 0,
  time: 'tokyo',
  weather: 'clear',
  difficulty: 'street',
  assist: false,
  effects: 'full', // 'full' | 'reduced' (no shake, no flashes, no tearing)
  quality: 'balanced',
  sound: true,
  music: true,
  volume: 0.7,
};

export const SLOGANS = [
  'AUT VIAM INVENIAM', 'SAID ≠ MEANT', 'BRAND IS A MEMORY', 'MEMELORE', 'FIND A WAY',
  'USER JOURNEYS', 'NO FREE LUNCH', 'SHIP IT', 'STAY CURIOUS', 'MAKE ONE', 'MATH-HEAD', 'KEEP DRIVING',
];
