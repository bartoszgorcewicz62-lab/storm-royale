'use strict';

const matCache3 = {};
function mat3(color, opts) {
  const key = color + (opts ? JSON.stringify(opts) : '');
  if (!matCache3[key]) {
    matCache3[key] = new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.75, metalness: 0.05 }, opts || {}));
  }
  return matCache3[key];
}

function addBox(parent, w, h, d, x, y, z, color, opts, tag, entity) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat3(color, opts));
  m.position.set(x, y, z);
  if (tag) m.userData.hitZone = tag;
  if (entity) m.userData.entity = entity;
  parent.add(m);
  return m;
}

function makeOutfit3(i, isPlayer) {
  const arch = ARCHETYPES3[i % 3];
  const skins = SKIN_TONES3[i % SKIN_TONES3.length];
  const palettes = {
    scout: { primary: '#e8e8ec', secondary: '#9aa0a8', accent: '#3a3f4a', visor: '#12151c' },
    viper: { primary: '#3ff23f', secondary: '#181c22', accent: '#8a8f96', visor: '#0a0a0a' },
    ghost: { primary: '#e0433f', secondary: '#5b1f1d', accent: '#c9cdd4', visor: '#1a1a1a' }
  };
  const base = palettes[arch];
  const hues = {
    scout: ['#e8e8ec', '#cfd6e4', '#d9e6d4', '#e6d9d4'],
    viper: ['#3ff23f', '#3fd4f2', '#f2d43f', '#c44ff2'],
    ghost: ['#e0433f', '#7a4fd4', '#2f9bff', '#e0a95c']
  };
  const primary = isPlayer ? '#3b6fd4' : hues[arch][i % hues[arch].length];
  return {
    arch,
    primary,
    secondary: base.secondary,
    accent: base.accent,
    visor: base.visor,
    skin: skins
  };
}

function makeLabel3(text, color) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const x = c.getContext('2d');
  x.font = 'bold 34px "Segoe UI", Arial';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.lineWidth = 7;
  x.strokeStyle = 'rgba(0,0,0,0.8)';
  x.strokeText(text, 128, 32);
  x.fillStyle = color;
  x.fillText(text, 128, 32);
  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.LinearFilter;
  const m = new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true });
  const s = new THREE.Sprite(m);
  s.scale.set(2.4, 0.6, 1);
  s.renderOrder = 999;
  s.userData.isLabel = true;
  s.raycast = () => {};
  return s;
}

function buildCharacter3(e) {
  const g = new THREE.Group();
  const o = e.outfit;
  const skin = o.skin;

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.55, 16),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.03;
  shadow.raycast = () => {};
  g.add(shadow);

  const legL = new THREE.Group();
  legL.position.set(-0.13, 0.75, 0);
  addBox(legL, 0.2, 0.78, 0.2, 0, -0.39, 0, o.secondary, null, 'body', e);
  g.add(legL);

  const legR = new THREE.Group();
  legR.position.set(0.13, 0.75, 0);
  addBox(legR, 0.2, 0.78, 0.2, 0, -0.39, 0, o.secondary, null, 'body', e);
  g.add(legR);

  if (o.arch === 'scout') {
    addBox(legL, 0.24, 0.16, 0.24, 0, -0.66, -0.01, o.accent, null, 'body', e);
    addBox(legR, 0.24, 0.16, 0.24, 0, -0.66, -0.01, o.accent, null, 'body', e);
  }
  if (o.arch === 'viper') {
    addBox(legL, 0.24, 0.26, 0.24, 0, -0.5, 0, '#181c22', null, 'body', e);
    addBox(legR, 0.24, 0.26, 0.24, 0, -0.5, 0, '#181c22', null, 'body', e);
  }

  const torsoH = o.arch === 'ghost' ? 0.68 : 0.56;
  const torsoY = o.arch === 'ghost' ? 0.78 : 0.84;
  addBox(g, 0.44, torsoH, 0.26, 0, torsoY + torsoH / 2, 0, o.primary, null, 'body', e);

  if (o.arch === 'scout') {
    addBox(g, 0.3, 0.24, 0.1, 0, torsoY + torsoH / 2, -0.19, o.accent, null, 'body', e);
    addBox(g, 0.12, 0.12, 0.08, -0.1, torsoY + torsoH / 2 - 0.02, -0.2, '#5a5f66', null, 'body', e);
    addBox(g, 0.12, 0.12, 0.08, 0.1, torsoY + torsoH / 2 - 0.02, -0.2, '#5a5f66', null, 'body', e);
  }
  if (o.arch === 'viper') {
    addBox(g, 0.18, 0.2, 0.3, -0.3, 1.02, 0, '#181c22', null, 'body', e);
    addBox(g, 0.18, 0.2, 0.3, 0.3, 1.02, 0, '#181c22', null, 'body', e);
    addBox(g, 0.16, 0.12, 0.3, 0, torsoY + torsoH / 2, 0, o.accent, null, 'body', e);
  }

  const armL = new THREE.Group();
  armL.position.set(-0.3, 1.32, 0);
  addBox(armL, 0.17, 0.62, 0.17, 0, -0.31, 0, o.primary, null, 'body', e);
  if (o.arch === 'viper') addBox(armL, 0.2, 0.16, 0.2, 0, -0.1, 0, '#181c22', null, 'body', e);
  addBox(armL, 0.16, 0.16, 0.16, 0, -0.62, 0, skin, null, 'body', e);
  g.add(armL);

  const armR = new THREE.Group();
  armR.position.set(0.3, 1.32, 0);
  addBox(armR, 0.17, 0.62, 0.17, 0, -0.31, 0, o.primary, null, 'body', e);
  if (o.arch === 'viper') addBox(armR, 0.2, 0.16, 0.2, 0, -0.1, 0, '#181c22', null, 'body', e);
  addBox(armR, 0.16, 0.16, 0.16, 0, -0.62, 0, skin, null, 'body', e);
  g.add(armR);

  const headY = o.arch === 'ghost' ? 1.52 : 1.5;
  const head = new THREE.Group();
  head.position.set(0, headY, 0);
  if (o.arch === 'scout') {
    addBox(head, 0.32, 0.3, 0.32, 0, 0.03, 0, o.primary, null, 'head', e);
    addBox(head, 0.34, 0.12, 0.34, 0, 0.2, 0, o.accent, null, 'head', e);
    addBox(head, 0.24, 0.12, 0.06, 0, 0.1, 0.2, o.visor, { metalness: 0.6, roughness: 0.3 }, 'head', e);
  } else if (o.arch === 'viper') {
    addBox(head, 0.3, 0.3, 0.3, 0, 0.04, 0, o.primary, { roughness: 0.4, metalness: 0.35 }, 'head', e);
    addBox(head, 0.34, 0.12, 0.34, 0, 0.2, 0, '#181c22', null, 'head', e);
  } else {
    addBox(head, 0.28, 0.28, 0.28, 0, 0.02, 0, skin, null, 'head', e);
    addBox(head, 0.34, 0.34, 0.34, 0, 0.05, -0.05, o.primary, null, 'head', e);
    addBox(head, 0.22, 0.2, 0.08, 0, -0.05, -0.18, o.secondary, null, 'head', e);
  }
  g.add(head);

  const gun = new THREE.Group();
  gun.position.set(0.14, 1.22, 0.28);
  gun.rotation.x = -0.15;
  const wdef = WEAPONS3[e.isPlayer ? e.slots[0].type : e.weapon.type];
  const gunMesh = addBox(gun, wdef.gw, 0.11, wdef.len, 0, 0, wdef.len / 2 - 0.05, '#2e3440', { roughness: 0.4, metalness: 0.5 }, null, e);
  addBox(gun, wdef.gw, 0.11, 0.08, 0, 0, -0.06, '#454d5c', { roughness: 0.4, metalness: 0.5 }, null, e);
  gun.userData.gunMesh = gunMesh;
  g.add(gun);

  const label = makeLabel3(e.name, e.isPlayer ? '#ffd23f' : '#ffffff');
  label.position.y = 2.25;
  g.add(label);

  g.userData.entity = e;
  e.group = g;
  e.parts = { armL, armR, legL, legR, head, gun, gunMesh };
  e.label = label;
  return g;
}

function animateCharacter3(e, dt) {
  const p = e.parts;
  const speed = e.moving ? Math.min(1, (e.moveSpeed || 0) / 5.5) : 0;
  e.walk = (e.walk || 0) + dt * 11 * speed;
  const s = e.moving ? Math.sin(e.walk) * 0.55 * speed : 0;
  p.armL.rotation.x = -s;
  p.armR.rotation.x = s;
  p.legL.rotation.x = s;
  p.legR.rotation.x = -s;
  if (e.isPlayer) {
    p.armR.rotation.x = -0.9;
    p.armL.rotation.x = -0.7;
  }
}
