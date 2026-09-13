'use strict';

const NO_RENDER = typeof globalThis.NO_RENDER !== 'undefined' && globalThis.NO_RENDER;

const S3 = { quality: 'high', resScale: 100, fpsCap: 0, showFps: false, fov: 80, sens: 1.0, editOnRelease: true };
let settingsOrigin3 = 'menu';

function loadSettings3() {
  try {
    const s = localStorage.getItem('stormroyale3d');
    if (s) Object.assign(S3, JSON.parse(s));
  } catch (e) {}
}

function saveSettings3() {
  try { localStorage.setItem('stormroyale3d', JSON.stringify(S3)); } catch (e) {}
}

function applyVideoSettings3() {
  if (!G3.renderer) return;
  const pxMap = { low: 0.55, medium: 0.8, high: 1.0, epic: 1.25 };
  const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
  G3.renderer.setPixelRatio(Math.min(pxMap[S3.quality] * (S3.resScale / 100) * dpr, 2));
  const shadows = S3.quality !== 'low';
  G3.renderer.shadowMap.enabled = shadows;
  if (G3.sun) {
    G3.sun.castShadow = shadows;
    const ms = S3.quality === 'epic' ? 2048 : S3.quality === 'high' ? 1024 : 512;
    G3.sun.shadow.mapSize.set(ms, ms);
  }
  const fog = { low: [110, 300], medium: [120, 420], high: [150, 480], epic: [200, 620] }[S3.quality];
  G3.scene.fog = new THREE.Fog(0x9fd7e8, fog[0], fog[1]);
  if (G3.camera) {
    G3.camera.fov = S3.fov;
    G3.camera.updateProjectionMatrix();
  }
}

const rand3 = (a, b) => a + Math.random() * (b - a);
const irand3 = (a, b) => Math.floor(rand3(a, b + 1));
const clamp3 = (v, a, b) => Math.max(a, Math.min(b, v));
const distXZ = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const key23 = (x, y) => x + ',' + y;

function circleRectXZ(cx, cz, r, rx, rz, rw, rd) {
  const nx = clamp3(cx, rx, rx + rw), nz = clamp3(cz, rz, rz + rd);
  const dx = cx - nx, dz = cz - nz;
  return dx * dx + dz * dz < r * r;
}

function pickRarity3() {
  let t = 0;
  for (const r of RARITIES3) t += r.w;
  let v = Math.random() * t;
  for (let i = 0; i < RARITIES3.length; i++) {
    v -= RARITIES3[i].w;
    if (v < 0) return i;
  }
  return 0;
}

function pickWeaponType3() {
  const w = { pistol: 25, smg: 22, ar: 20, shotgun: 18, sniper: 15 };
  let t = 0;
  for (const k in w) t += w[k];
  let v = Math.random() * t;
  for (const k in w) {
    v -= w[k];
    if (v < 0) return k;
  }
  return 'pistol';
}

function pickConsumable3() {
  const w = { bandage: 30, medkit: 15, shieldS: 30, shieldL: 25 };
  let t = 0;
  for (const k in w) t += w[k];
  let v = Math.random() * t;
  for (const k in w) {
    v -= w[k];
    if (v < 0) return k;
  }
  return 'bandage';
}

function makeWeapon3(type, rarity) {
  return { kind: 'weapon', type, rarity, mag: WEAPONS3[type].mag };
}

function weaponStats3(inst) {
  const w = WEAPONS3[inst.type];
  return { ...w, dmg: w.dmg * RARITIES3[inst.rarity].mult };
}

let actx3 = null;
function initAudio3() {
  if (!actx3) {
    try { actx3 = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
  }
}
function sfx3(kind, vol = 0.08) {
  if (!actx3 || G3.muted) return;
  const t = actx3.currentTime;
  const o = actx3.createOscillator(), g = actx3.createGain();
  o.connect(g);
  g.connect(actx3.destination);
  const env = (f0, f1, d) => {
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + d);
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + d);
    o.start(t);
    o.stop(t + d);
  };
  if (kind === 'shoot') env(300, 80, 0.09);
  else if (kind === 'shotgun') env(160, 50, 0.16);
  else if (kind === 'sniper') env(500, 60, 0.22);
  else if (kind === 'hit') env(620, 440, 0.06);
  else if (kind === 'build') env(160, 260, 0.07);
  else if (kind === 'pickup') env(520, 900, 0.12);
  else if (kind === 'reload') env(340, 220, 0.08);
  else if (kind === 'heal') env(420, 700, 0.25);
  else if (kind === 'elim') env(200, 560, 0.2);
  else if (kind === 'hurt') env(150, 60, 0.16);
  else if (kind === 'win') env(400, 1200, 0.5);
}

let hud3 = null, hctx3 = null;
function setupHud3() {
  hud3 = document.getElementById('hud');
  hctx3 = hud3.getContext('2d');
  hud3.width = innerWidth;
  hud3.height = innerHeight;
}

function makeGroundTexture3() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = '#4d9e50';
  x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 420; i++) {
    x.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.06)';
    x.fillRect(Math.floor(Math.random() * 256), Math.floor(Math.random() * 256), 6, 6);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(30, 30);
  return t;
}

function setupScene3() {
  G3.scene = new THREE.Scene();
  G3.scene.background = new THREE.Color(0x9fd7e8);
  G3.scene.fog = new THREE.Fog(0x9fd7e8, 120, 420);

  G3.camera = new THREE.PerspectiveCamera(70, 16 / 9, 0.1, 1000);
  G3.camDir = new THREE.Vector3();
  G3.camPos = new THREE.Vector3();

  const hemi = new THREE.HemisphereLight(0xdff2ff, 0x4d7a3e, 0.85);
  G3.scene.add(hemi);

  G3.sun = new THREE.DirectionalLight(0xfff2d9, 0.9);
  G3.sun.position.set(60, 90, 40);
  G3.sun.castShadow = true;
  G3.sun.shadow.mapSize.set(2048, 2048);
  G3.sun.shadow.camera.near = 10;
  G3.sun.shadow.camera.far = 300;
  G3.sun.shadow.camera.left = -70;
  G3.sun.shadow.camera.right = 70;
  G3.sun.shadow.camera.top = 70;
  G3.sun.shadow.camera.bottom = -70;
  G3.sun.shadow.bias = -0.0004;
  G3.scene.add(G3.sun);
  G3.scene.add(G3.sun.target);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD3, WORLD3),
    new THREE.MeshStandardMaterial({ map: makeGroundTexture3(), roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(WORLD3 / 2, 0, WORLD3 / 2);
  ground.receiveShadow = true;
  ground.userData.ground = true;
  G3.scene.add(ground);
  G3.groundPlane = ground;

  G3.ghostMeshes = {};
  for (const type of Object.keys(PIECES3)) {
    const m = new THREE.Mesh(
      PIECES3[type].makeGeo(),
      new THREE.MeshBasicMaterial({ color: 0x7ce6ff, transparent: true, opacity: 0.45, depthWrite: false })
    );
    m.visible = false;
    m.raycast = () => {};
    G3.scene.add(m);
    G3.ghostMeshes[type] = m;
  }
  G3.editMat = new THREE.MeshBasicMaterial({ color: 0x4ade80, transparent: true, opacity: 0.6, depthWrite: false });

  const wallMat = new THREE.MeshBasicMaterial({ color: 0x9a5cff, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false });
  G3.stormWall = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 90, 64, 1, true), wallMat);
  G3.stormWall.position.y = 45;
  G3.scene.add(G3.stormWall);

  const floorMat = new THREE.MeshBasicMaterial({ color: 0x8a4ae0, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false });
  G3.stormFloor = new THREE.Mesh(new THREE.RingGeometry(1, 2, 64), floorMat);
  G3.stormFloor.rotation.x = -Math.PI / 2;
  G3.stormFloor.position.y = 0.02;
  G3.scene.add(G3.stormFloor);

  const ringMat = new THREE.MeshBasicMaterial({ color: 0xdda0ff, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false });
  G3.stormRing = new THREE.Mesh(new THREE.RingGeometry(0.985, 1.015, 64), ringMat);
  G3.stormRing.rotation.x = -Math.PI / 2;
  G3.stormRing.position.y = 0.06;
  G3.scene.add(G3.stormRing);

  const tgtMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false });
  G3.stormTarget = new THREE.Mesh(new THREE.RingGeometry(0.995, 1.005, 64), tgtMat);
  G3.stormTarget.rotation.x = -Math.PI / 2;
  G3.stormTarget.position.y = 0.1;
  G3.scene.add(G3.stormTarget);

  if (!NO_RENDER) {
    const cv3 = document.getElementById('cv');
    G3.renderer = new THREE.WebGLRenderer({ canvas: cv3, antialias: true });
    G3.renderer.setSize(innerWidth, innerHeight);
    G3.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    G3.renderer.shadowMap.enabled = true;
    G3.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    G3.renderer.outputEncoding = THREE.sRGBEncoding;
    G3.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    applyVideoSettings3();
  }
}

function genWorld3() {
  G3.houses = [];
  G3.trees = [];
  G3.rocks = [];
  G3.bushes = [];
  for (const b of G3.blockers) G3.scene.remove(b);
  G3.blockers = [];

  const houseMat = new THREE.MeshStandardMaterial({ color: 0xa8703f, roughness: 0.9 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0xc07b3e, roughness: 0.85 });
  for (let c = 0; c < 16; c++) {
    const cx = rand3(60, WORLD3 - 60), cz = rand3(60, WORLD3 - 60);
    if (G3.houses.some(h => Math.hypot(h.x + h.w / 2 - cx, h.z + h.d / 2 - cz) < 90)) continue;
    const big = Math.random() < 0.4;
    const w = big ? rand3(16, 24) : rand3(9, 13);
    const d = big ? rand3(13, 19) : rand3(8, 12);
    const h = { x: clamp3(cx - w / 2, 20, WORLD3 - 20 - w), z: clamp3(cz - d / 2, 20, WORLD3 - 20 - d), w, d, big };
    G3.houses.push(h);
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, big ? 5.5 : 4, d), houseMat);
    m.position.set(h.x + w / 2, (big ? 5.5 : 4) / 2, h.z + d / 2);
    m.castShadow = true;
    m.receiveShadow = true;
    G3.scene.add(m);
    G3.blockers.push(m);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 1.2, 1.2, d + 1.2), roofMat);
    roof.position.set(h.x + w / 2, (big ? 5.5 : 4) + 0.6, h.z + d / 2);
    roof.castShadow = true;
    G3.scene.add(roof);
  }

  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 1 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x2d8c42, roughness: 1 });
  for (let i = 0; i < 130; i++) {
    const x = rand3(20, WORLD3 - 20), z = rand3(20, WORLD3 - 20);
    if (G3.houses.some(h => circleRectXZ(x, z, 6, h.x, h.z, h.w, h.d))) continue;
    const r = rand3(0.35, 0.55);
    const cr = rand3(1.6, 2.6);
    G3.trees.push({ x, z, r, cr });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.2, 2.4, 6), trunkMat);
    trunk.position.set(x, 1.2, z);
    trunk.castShadow = true;
    G3.scene.add(trunk);
    G3.blockers.push(trunk);
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(cr, cr * 2.2, 7), leafMat);
    leaf.position.set(x, 2.6 + cr, z);
    leaf.castShadow = true;
    G3.scene.add(leaf);
  }

  const rockMat = new THREE.MeshStandardMaterial({ color: 0x8d949e, roughness: 1 });
  for (let i = 0; i < 50; i++) {
    const x = rand3(20, WORLD3 - 20), z = rand3(20, WORLD3 - 20);
    if (G3.houses.some(h => circleRectXZ(x, z, 5, h.x, h.z, h.w, h.d))) continue;
    const r = rand3(0.7, 1.3);
    G3.rocks.push({ x, z, r });
    const m = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), rockMat);
    m.position.set(x, r * 0.6, z);
    m.castShadow = true;
    m.receiveShadow = true;
    G3.scene.add(m);
    G3.blockers.push(m);
  }

  const bushMat = new THREE.MeshStandardMaterial({ color: 0x2e8a44, roughness: 1, transparent: true, opacity: 0.85 });
  for (let i = 0; i < 80; i++) {
    const x = rand3(20, WORLD3 - 20), z = rand3(20, WORLD3 - 20);
    if (G3.houses.some(h => circleRectXZ(x, z, 4, h.x, h.z, h.w, h.d))) continue;
    if (G3.trees.some(t => Math.hypot(t.x - x, t.z - z) < 5)) continue;
    const r = rand3(1.2, 1.9);
    G3.bushes.push({ x, z, r });
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 7, 5), bushMat);
    m.position.set(x, r * 0.5, z);
    G3.scene.add(m);
  }
}

function collidesXZ(x, z, r) {
  if (x < r || z < r || x > WORLD3 - r || z > WORLD3 - r) return true;
  for (const h of G3.houses) if (circleRectXZ(x, z, r, h.x, h.z, h.w, h.d)) return true;
  for (const t of G3.trees) {
    const d = r + t.r * 0.85, dx = x - t.x, dz = z - t.z;
    if (dx * dx + dz * dz < d * d) return true;
  }
  for (const o of G3.rocks) {
    const d = r + o.r, dx = x - o.x, dz = z - o.z;
    if (dx * dx + dz * dz < d * d) return true;
  }
  if (G3.builds.size) {
    const g0x = Math.floor((x - r) / CELL3), g1x = Math.floor((x + r) / CELL3);
    const g0z = Math.floor((z - r) / CELL3), g1z = Math.floor((z + r) / CELL3);
    for (let gx = g0x; gx <= g1x; gx++) {
      for (let gz = g0z; gz <= g1z; gz++) {
        if (G3.builds.has(key23(gx, gz)) && circleRectXZ(x, z, r, gx * CELL3, gz * CELL3, CELL3, CELL3)) return true;
      }
    }
  }
  return false;
}

function inBush3(e) {
  for (const b of G3.bushes) {
    const dx = e.x - b.x, dz = e.z - b.z;
    if (dx * dx + dz * dz < b.r * b.r * 0.5) return true;
  }
  return false;
}

function freeSpot3(minDist) {
  for (let i = 0; i < 200; i++) {
    const x = rand3(10, WORLD3 - 10), z = rand3(10, WORLD3 - 10);
    if (collidesXZ(x, z, 1.5)) continue;
    if (minDist && G3.player && Math.hypot(x - G3.player.x, z - G3.player.z) < minDist) continue;
    return { x, z };
  }
  return { x: WORLD3 / 2, z: WORLD3 / 2 };
}

function makeTextSprite3(text, color, scale) {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 64;
  const x = c.getContext('2d');
  x.font = 'bold 40px "Segoe UI", Arial';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.lineWidth = 8;
  x.strokeStyle = 'rgba(0,0,0,0.8)';
  x.strokeText(text, 64, 32);
  x.fillStyle = color;
  x.fillText(text, 64, 32);
  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.LinearFilter;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  s.scale.set(scale, scale / 2, 1);
  s.renderOrder = 999;
  s.raycast = () => {};
  return s;
}

function spawnParticles3(x, y, z, color, n, speed) {
  const mat3p = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 });
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), mat3p);
    m.position.set(x, y, z);
    G3.scene.add(m);
    const a = rand3(0, TAU3), b = rand3(-0.4, 0.9);
    const s = rand3(0.3, 1) * speed;
    G3.parts.push({
      mesh: m,
      vx: Math.cos(a) * Math.cos(b) * s,
      vy: Math.sin(b) * s,
      vz: Math.sin(a) * Math.cos(b) * s,
      life: rand3(0.3, 0.65),
      max: 0.65
    });
  }
}

function spawnDamageNum3(x, y, z, text, color) {
  const s = makeTextSprite3(text, color, 1.1);
  s.position.set(x, y + 1.9, z);
  G3.scene.add(s);
  G3.nums.push({ sprite: s, life: 0.8, vy: 1.6 });
}

function makeTracer3(a, b) {
  const geo = new THREE.BufferGeometry().setFromPoints([a.clone(), b.clone()]);
  const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.9 }));
  G3.scene.add(line);
  setTimeout(() => G3.scene.remove(line), 70);
}

function allEnts3() {
  return [G3.player, ...G3.bots];
}

function castShot3(origin, dir, range, ignore) {
  G3.scene.updateMatrixWorld(true);
  const targets = G3.blockers.slice();
  for (const e of allEnts3()) {
    if (e.alive && e !== ignore && e.group) targets.push(e.group);
  }
  const ray = new THREE.Raycaster(origin, dir.normalize(), 0, range);
  const hits = ray.intersectObjects(targets, true);
  return hits.length ? hits[0] : null;
}

function gunTip3(e, out) {
  e.group.updateMatrixWorld(true);
  return e.parts.gunMesh.getWorldPosition(out);
}

function hitEntity3(t, dmg, headshot, hitPoint) {
  const absorbed = Math.min(t.shield, dmg);
  t.shield -= absorbed;
  t.hp -= (dmg - absorbed);
  t.lastHit = G3.now;
  spawnDamageNum3(
    hitPoint ? hitPoint.x : t.x, hitPoint ? hitPoint.y : 1.4, hitPoint ? hitPoint.z : t.z,
    String(Math.round(dmg)),
    headshot ? '#ffd23f' : (absorbed > 0 ? '#4fc3f7' : '#ffffff')
  );
  spawnParticles3(hitPoint ? hitPoint.x : t.x, hitPoint ? hitPoint.y : 1.2, hitPoint ? hitPoint.z : t.z, '#ff8a80', 4, 2.5);
  if (t.isPlayer) {
    G3.hitFlash = Math.max(G3.hitFlash, 0.3);
    sfx3('hurt', 0.09);
  } else {
    sfx3('hit', clamp3(1 - distXZ(t, G3.player) / 90, 0, 1) * 0.05);
  }
  if (t.hp <= 0) eliminate3(t, null, false);
}

function playerShoot3() {
  const pl = G3.player;
  if (!pl.alive || pl.fireCd > 0) return;
  const inst = pl.slots[pl.cur];
  if (!inst || inst.kind !== 'weapon') return;
  const st = weaponStats3(inst);
  if (pl.reloading || pl.using) return;
  if (inst.mag <= 0) { startReload3(pl); return; }
  inst.mag--;
  pl.fireCd = st.rof;
  pl.lastShot = G3.now;

  const origin = G3.camera.position;
  const tip = new THREE.Vector3();
  gunTip3(pl, tip);
  let end = null;

  for (let p = 0; p < st.pellets; p++) {
    const dir = G3.camera.getWorldDirection(new THREE.Vector3()).clone();
    dir.x += rand3(-1, 1) * st.spread;
    dir.y += rand3(-1, 1) * st.spread;
    dir.z += rand3(-1, 1) * st.spread;
    const hit = castShot3(origin, dir, st.range, pl);
    if (hit && hit.object.userData.entity) {
      const t = hit.object.userData.entity;
      const headshot = hit.object.userData.hitZone === 'head';
      hitEntity3(t, st.dmg * (headshot ? 2 : 1), headshot, hit.point);
    } else if (hit && hit.object.userData.piece) {
      damagePiece3(hit.object.userData.piece, st.dmg, hit.point);
    } else if (hit) {
      spawnParticles3(hit.point.x, hit.point.y, hit.point.z, '#dddddd', 4, 2);
    }
    if (!end) end = hit ? hit.point : origin.clone().add(dir.clone().multiplyScalar(st.range));
  }
  makeTracer3(tip, end);
  spawnParticles3(tip.x, tip.y, tip.z, '#fff3b0', 3, 2);
  G3.shake = 0.06;
  sfx3(inst.type === 'shotgun' ? 'shotgun' : inst.type === 'sniper' ? 'sniper' : 'shoot', 0.09);
}

function botTryFire3(b) {
  if (!b.alive || b.fireCd > 0 || !b.target || !b.target.alive) return;
  const st = weaponStats3(b.weapon);
  b.fireCd = st.rof;
  b.lastShot = G3.now;
  const tip = new THREE.Vector3();
  gunTip3(b, tip);
  const target = b.target;
  const aimPoint = new THREE.Vector3(target.x, 1.15, target.z);
  for (let p = 0; p < st.pellets; p++) {
    const dir = aimPoint.clone().sub(tip);
    dir.x += rand3(-1, 1) * st.spread * 1.5;
    dir.y += rand3(-1, 1) * st.spread * 1.5;
    dir.z += rand3(-1, 1) * st.spread * 1.5;
    const hit = castShot3(tip, dir, st.range, b);
    if (hit && hit.object.userData.entity) {
      const t = hit.object.userData.entity;
      const headshot = hit.object.userData.hitZone === 'head';
      hitEntity3(t, st.dmg * (headshot ? 2 : 1), headshot, hit.point);
    } else if (hit && hit.object.userData.piece) {
      damagePiece3(hit.object.userData.piece, st.dmg, hit.point);
    }
  }
  if (distXZ(b, G3.player) < 80) {
    makeTracer3(tip, new THREE.Vector3(target.x, 1.15, target.z));
    sfx3('shoot', clamp3(1 - distXZ(b, G3.player) / 90, 0, 1) * 0.05);
  }
}

function startReload3(e) {
  if (e.reloading || e.using) return;
  const inst = e.slots[e.cur];
  if (!inst || inst.kind !== 'weapon') return;
  const st = WEAPONS3[inst.type];
  if (inst.mag >= st.mag || e.ammo[st.ammo] <= 0) return;
  e.reloading = { t: 0, total: st.reload };
  sfx3('reload', 0.06);
}

function finishReload3(e) {
  const inst = e.slots[e.cur];
  if (!inst || inst.kind !== 'weapon') { e.reloading = null; return; }
  const st = WEAPONS3[inst.type];
  const take = Math.min(st.mag - inst.mag, e.ammo[st.ammo]);
  inst.mag += take;
  e.ammo[st.ammo] -= take;
  e.reloading = null;
}

function switchSlot3(e, i) {
  if (i < 0 || i >= e.slots.length || !e.slots[i] || i === e.cur) return;
  e.reloading = null;
  e.using = null;
  e.cur = i;
}

function tryUseItem3(e) {
  if (e.using || e.reloading) return;
  const slot = e.slots[e.cur];
  if (!slot || slot.kind !== 'consumable') return;
  const it = ITEMS3[slot.item];
  const beneficial = (it.heal > 0 && e.hp < it.cap) || (it.shield > 0 && e.shield < it.cap);
  if (!beneficial) return;
  e.using = { t: 0, total: it.time };
}

function finishUse3(e) {
  const slot = e.slots[e.cur];
  if (!slot || slot.kind !== 'consumable') { e.using = null; return; }
  const it = ITEMS3[slot.item];
  e.hp = Math.min(it.cap, e.hp + it.heal);
  e.shield = Math.min(it.cap, e.shield + it.shield);
  sfx3('heal', 0.08);
  slot.count--;
  if (slot.count <= 0) e.slots[e.cur] = null;
  e.using = null;
}

function makeWedgeGeom3(w, h, d) {
  const x = w / 2, z = d / 2;
  const pos = new Float32Array([
    -x, 0, -z, x, 0, -z, x, 0, z,
    -x, 0, -z, x, 0, z, -x, 0, z,
    -x, 0, z, x, 0, z, x, h, z,
    -x, 0, z, x, h, z, -x, h, z,
    -x, h, z, x, h, z, x, 0, -z,
    -x, h, z, x, 0, -z, -x, 0, -z,
    -x, 0, -z, -x, 0, z, -x, h, z,
    x, 0, -z, x, h, z, x, 0, z
  ]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

function placementTarget3() {
  G3.camera.updateMatrixWorld(true);
  const ray = new THREE.Raycaster();
  ray.setFromCamera({ x: 0, y: 0 }, G3.camera);
  const targets = [G3.groundPlane];
  for (const [k, cell] of G3.builds) for (const p of cell.pieces) targets.push(p.mesh);
  const hits = ray.intersectObjects(targets, false);
  if (!hits.length) return null;
  const hit = hits[0];
  if (hit.object.userData.ground) return { point: hit.point, baseY: 0 };
  const piece = hit.object.userData.piece;
  if (!piece) return { point: hit.point, baseY: 0 };
  return { point: hit.point, baseY: piece.baseY + PIECES3[piece.type].h };
}

function buildPiece3(type) {
  const pl = G3.player;
  const def = PIECES3[type];
  if (pl.wood < def.cost || G3.editing) return;
  const t = placementTarget3();
  if (!t || t.baseY > 24) return;
  const gx = Math.floor(t.point.x / CELL3), gz = Math.floor(t.point.z / CELL3);
  if (gx < 0 || gz < 0 || gx * CELL3 >= WORLD3 || gz * CELL3 >= WORLD3) return;
  for (const e2 of allEnts3()) {
    if (e2.alive && circleRectXZ(e2.x, e2.z, e2.r, gx * CELL3, gz * CELL3, CELL3, CELL3)) return;
  }
  const mesh = new THREE.Mesh(def.makeGeo(), new THREE.MeshStandardMaterial({ color: 0x8a5a3b, roughness: 0.9 }));
  const cx = gx * CELL3 + CELL3 / 2, cz = gz * CELL3 + CELL3 / 2;
  mesh.position.set(cx, t.baseY + def.h / 2, cz);
  mesh.rotation.y = G3.buildRot * Math.PI / 2;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const piece = { type, rot: G3.buildRot, baseY: t.baseY, cx, cz, hp: 250, max: 250, mesh, variant: 0, mat: mesh.material };
  mesh.userData.piece = piece;
  G3.scene.add(mesh);
  G3.blockers.push(mesh);
  const k = key23(gx, gz);
  if (!G3.builds.has(k)) G3.builds.set(k, { pieces: [] });
  G3.builds.get(k).pieces.push(piece);
  pl.wood -= def.cost;
  sfx3('build', 0.07);
}

function aimedPiece3() {
  G3.camera.updateMatrixWorld(true);
  const ray = new THREE.Raycaster();
  ray.setFromCamera({ x: 0, y: 0 }, G3.camera);
  const meshes = [];
  for (const [k, cell] of G3.builds) for (const p of cell.pieces) meshes.push(p.mesh);
  const hits = ray.intersectObjects(meshes, false);
  return hits.length ? hits[0].object.userData.piece : null;
}

function applyVariant3(piece, idx) {
  const def = PIECES3[piece.type];
  const v = def.variants[idx % def.variants.length];
  piece.variant = idx % def.variants.length;
  piece.mesh.scale.set(v.sx, v.sy, 1);
  piece.mesh.position.set(piece.cx + v.ox, piece.baseY + def.h * v.sy / 2 + v.oy, piece.cz);
  piece.mesh.rotation.y = piece.rot * Math.PI / 2;
}

function enterEdit3() {
  const piece = aimedPiece3();
  if (!piece) return;
  G3.editing = piece;
  piece.mesh.material = G3.editMat;
}

function exitEdit3() {
  if (G3.editing) G3.editing.mesh.material = G3.editing.mat;
  G3.editing = null;
}

function cycleVariant3() {
  if (!G3.editing) return;
  applyVariant3(G3.editing, G3.editing.variant + 1);
  sfx3('build', 0.05);
}

function damagePiece3(piece, dmg, point) {
  piece.hp -= dmg;
  spawnParticles3(point.x, point.y, point.z, '#b98a63', 3, 2);
  if (piece.hp <= 0) removePiece3(piece);
}

function removePiece3(piece) {
  G3.scene.remove(piece.mesh);
  G3.blockers.splice(G3.blockers.indexOf(piece.mesh), 1);
  if (piece.mesh.geometry) piece.mesh.geometry.dispose();
  const k = key23(Math.floor(piece.cx / CELL3), Math.floor(piece.cz / CELL3));
  const cell = G3.builds.get(k);
  if (cell) {
    cell.pieces.splice(cell.pieces.indexOf(piece), 1);
    if (!cell.pieces.length) G3.builds.delete(k);
  }
  if (G3.editing === piece) G3.editing = null;
}

function updateBuildPreview3() {
  const ghost = G3.ghostMeshes ? G3.ghostMeshes[G3.buildPiece] : null;
  if (!G3.buildMode || G3.editing || !ghost || !G3.player.alive) {
    if (ghost) ghost.visible = false;
    return;
  }
  const def = PIECES3[G3.buildPiece];
  const t = placementTarget3();
  if (!t || t.baseY > 24) {
    ghost.visible = false;
    return;
  }
  const gx = Math.floor(t.point.x / CELL3), gz = Math.floor(t.point.z / CELL3);
  if (gx < 0 || gz < 0 || gx * CELL3 >= WORLD3 || gz * CELL3 >= WORLD3) {
    ghost.visible = false;
    return;
  }
  const ok = G3.player.wood >= def.cost;
  ghost.visible = true;
  ghost.position.set(gx * CELL3 + CELL3 / 2, t.baseY + def.h / 2, gz * CELL3 + CELL3 / 2);
  ghost.rotation.y = G3.buildRot * Math.PI / 2;
  ghost.scale.set(1, 1, 1);
  ghost.material.color.set(ok ? 0x7ce6ff : 0xff5252);
}

function addLootMesh3(l) {
  let mesh;
  if (l.kind === 'weapon') {
    const rc = RARITIES3[l.rarity].col;
    const st = WEAPONS3[l.type];
    mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.14, st.len),
      new THREE.MeshStandardMaterial({ color: 0x2e3440, roughness: 0.4, metalness: 0.5 })
    );
    const glow = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.22, 0.22),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(rc), transparent: true, opacity: 0.55 })
    );
    glow.userData.glow = true;
    mesh.add(glow);
    mesh.userData.glow = glow;
  } else if (l.kind === 'ammo') {
    mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.22, 0.3),
      new THREE.MeshStandardMaterial({ color: new THREE.Color(AMMO_TYPES3[l.ammo].col), roughness: 0.6 })
    );
  } else if (l.kind === 'consumable') {
    const it = ITEMS3[l.item];
    mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.3, 0.3),
      new THREE.MeshStandardMaterial({ color: new THREE.Color(it.col), roughness: 0.5 })
    );
  } else {
    mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 0.7, 6),
      new THREE.MeshStandardMaterial({ color: 0x8a5a3b, roughness: 1 })
    );
  }
  mesh.position.set(l.x, 0.5, l.z);
  G3.scene.add(mesh);
  l.mesh = mesh;
  l.baseY = 0.5;
}

function spawnWorldLoot3() {
  for (const l of G3.loot) if (l.mesh) G3.scene.remove(l.mesh);
  G3.loot = [];
  for (let i = 0; i < 60; i++) {
    const p = freeSpot3();
    G3.loot.push({ x: p.x, z: p.z, kind: 'weapon', type: pickWeaponType3(), rarity: pickRarity3(), bob: rand3(0, TAU3) });
  }
  for (let i = 0; i < 25; i++) {
    const p = freeSpot3();
    const types = Object.keys(AMMO_TYPES3);
    G3.loot.push({ x: p.x, z: p.z, kind: 'ammo', ammo: types[irand3(0, types.length - 1)], bob: rand3(0, TAU3) });
  }
  for (let i = 0; i < 25; i++) {
    const p = freeSpot3();
    G3.loot.push({ x: p.x, z: p.z, kind: 'consumable', item: pickConsumable3(), count: 1, bob: rand3(0, TAU3) });
  }
  for (let i = 0; i < 10; i++) {
    const p = freeSpot3();
    G3.loot.push({ x: p.x, z: p.z, kind: 'wood', amt: 60, bob: rand3(0, TAU3) });
  }
  for (const l of G3.loot) addLootMesh3(l);
}

function dropLootFrom3(e) {
  const scatter = () => ({
    x: clamp3(e.x + rand3(-1.5, 1.5), 10, WORLD3 - 10),
    z: clamp3(e.z + rand3(-1.5, 1.5), 10, WORLD3 - 10)
  });
  let p = scatter();
  G3.loot.push({ x: p.x, z: p.z, kind: 'weapon', type: e.weapon.type, rarity: e.weapon.rarity, bob: rand3(0, TAU3) });
  p = scatter();
  G3.loot.push({ x: p.x, z: p.z, kind: 'ammo', ammo: WEAPONS3[e.weapon.type].ammo, bob: rand3(0, TAU3) });
  if (Math.random() < 0.45) {
    p = scatter();
    G3.loot.push({ x: p.x, z: p.z, kind: 'consumable', item: pickConsumable3(), count: 1, bob: rand3(0, TAU3) });
  }
  for (const l of G3.loot) if (!l.mesh) addLootMesh3(l);
}

function updatePickups3(dt) {
  const pl = G3.player;
  if (!pl.alive) return;
  for (const l of G3.loot) {
    if (l.taken) continue;
    if (Math.hypot(l.x - pl.x, l.z - pl.z) > 1.4) continue;
    if (l.kind === 'weapon') {
      const sameIdx = pl.slots.findIndex(s => s && s.kind === 'weapon' && s.type === l.type);
      if (sameIdx >= 0) {
        if (l.rarity > pl.slots[sameIdx].rarity) {
          pl.slots[sameIdx] = makeWeapon3(l.type, l.rarity);
          l.taken = true;
          sfx3('pickup', 0.09);
        }
      } else {
        const empty = pl.slots.findIndex(s => !s);
        if (empty >= 0) {
          pl.slots[empty] = makeWeapon3(l.type, l.rarity);
          l.taken = true;
          sfx3('pickup', 0.09);
        }
      }
    } else if (l.kind === 'ammo') {
      pl.ammo[l.ammo] += AMMO_TYPES3[l.ammo].box;
      l.taken = true;
      sfx3('pickup', 0.07);
    } else if (l.kind === 'consumable') {
      const stack = pl.slots.findIndex(s => s && s.kind === 'consumable' && s.item === l.item && s.count < 10);
      if (stack >= 0) {
        pl.slots[stack].count++;
        l.taken = true;
        sfx3('pickup', 0.07);
      } else {
        const empty = pl.slots.findIndex(s => !s);
        if (empty >= 0) {
          pl.slots[empty] = { kind: 'consumable', item: l.item, count: 1 };
          l.taken = true;
          sfx3('pickup', 0.07);
        }
      }
    } else if (l.kind === 'wood') {
      pl.wood = Math.min(300, pl.wood + l.amt);
      l.taken = true;
      sfx3('pickup', 0.07);
    }
  }
  for (const l of G3.loot) {
    if (l.taken && l.mesh) {
      G3.scene.remove(l.mesh);
      l.mesh = null;
    }
  }
  G3.loot = G3.loot.filter(l => !l.taken);
}

function makePlayer3(x, z) {
  const pl = {
    x, z, y: 0, vy: 0, r: 0.45, hp: 100, shield: 0, alive: true, isPlayer: true,
    name: 'You',
    outfit: makeOutfit3(0, true),
    aim: 0, fireCd: 0, kills: 0, lastHit: -99, lastShot: -99, walk: 0, moving: false, moveSpeed: 0,
    slots: [makeWeapon3('pistol', 0), null, null, null, null], cur: 0,
    ammo: { light: 60, medium: 0, shell: 0, heavy: 0 },
    wood: 100, reloading: null, using: null,
    goal: null, goalT: 0, target: null, scanT: 0, strafeT: 0, strafeSign: 1,
    coverPoint: null, coverT: 0, unstickT: 0, unstickA: 0
  };
  return pl;
}

function makeBot3(i) {
  const p = freeSpot3(45);
  const outfit = makeOutfit3(i, false);
  const b = {
    x: p.x, z: p.z, y: 0, vy: 0, r: 0.45,
    hp: 100, shield: [0, 0, 25, 50][irand3(0, 3)], alive: true, isPlayer: false,
    name: BOT_NAMES3[i % BOT_NAMES3.length],
    outfit,
    aim: rand3(0, TAU3), fireCd: rand3(0, 0.5), kills: 0, lastHit: -99, lastShot: -99,
    walk: 0, moving: false, moveSpeed: 0,
    weapon: { kind: 'weapon', type: pickWeaponType3(), rarity: pickRarity3(), mag: 999 },
    goal: null, goalT: 0, target: null, scanT: rand3(0, 0.25),
    strafeT: 0, strafeSign: 1, coverPoint: null, coverT: 0,
    unstickT: 0, unstickA: 0
  };
  return b;
}

function losClear3(a, b) {
  const d = Math.hypot(b.x - a.x, b.z - a.z);
  const steps = Math.ceil(d / 3);
  for (let i = 1; i < steps; i++) {
    const x = a.x + (b.x - a.x) * i / steps, z = a.z + (b.z - a.z) * i / steps;
    for (const h of G3.houses) if (x > h.x && x < h.x + h.w && z > h.z && z < h.z + h.d) return false;
    for (const t of G3.trees) {
      const dx = x - t.x, dz = z - t.z;
      if (dx * dx + dz * dz < t.r * t.r * 0.7) return false;
    }
    for (const o of G3.rocks) {
      const dx = x - o.x, dz = z - o.z;
      if (dx * dx + dz * dz < o.r * o.r * 0.8) return false;
    }
    if (G3.builds.size) {
      const gx = Math.floor(x / CELL3), gz = Math.floor(z / CELL3);
      if (G3.builds.has(key23(gx, gz))) return false;
    }
  }
  return true;
}

function findEnemy3(b) {
  let best = null, bd = 80;
  const cands = [];
  if (G3.player.alive) cands.push(G3.player);
  for (const o of G3.bots) if (o !== b && o.alive) cands.push(o);
  for (const c of cands) {
    const d = distXZ(b, c);
    if (c.isPlayer && inBush3(c) && d > 14) continue;
    if (d < bd && losClear3(b, c)) {
      bd = d;
      best = c;
    }
  }
  return best;
}

function coverPoint3(b, threat) {
  let best = null, bd = Infinity;
  const check = (ox, oz, or) => {
    const dToObs = Math.hypot(ox - b.x, oz - b.z);
    if (dToObs > 26 || dToObs < or + 1) return;
    const a = Math.atan2(oz - threat.z, ox - threat.x);
    const px = ox + Math.cos(a) * (or + 1.2), pz = oz + Math.sin(a) * (or + 1.2);
    if (collidesXZ(px, pz, 0.45)) return;
    const score = Math.hypot(px - b.x, pz - b.z);
    if (score < bd) {
      bd = score;
      best = { x: px, z: pz };
    }
  };
  for (const t of G3.trees) check(t.x, t.z, t.r);
  for (const o of G3.rocks) check(o.x, o.z, o.r);
  return best;
}

function moveBot3(b, dx, dz) {
  let moved = false;
  if (dx) {
    b.x += dx;
    if (collidesXZ(b.x, b.z, b.r)) b.x -= dx; else moved = true;
  }
  if (dz) {
    b.z += dz;
    if (collidesXZ(b.x, b.z, b.r)) b.z -= dz; else moved = true;
  }
  return moved;
}

function updateBot3(b, dt) {
  b.fireCd -= dt;
  b.scanT -= dt;
  b.strafeT -= dt;
  b.coverT -= dt;
  b.moving = false;
  b.moveSpeed = 0;

  if (b.unstickT > 0) {
    b.unstickT -= dt;
    moveBot3(b, Math.sin(b.unstickA) * 4.8 * dt, Math.cos(b.unstickA) * 4.8 * dt);
    b.moving = true;
    b.moveSpeed = 4.8;
    b.aim = b.unstickA;
    return;
  }

  if (b.scanT <= 0) {
    b.scanT = 0.22;
    b.target = findEnemy3(b);
  }

  const stormD = Math.hypot(b.x - G3.storm.cx, b.z - G3.storm.cz);
  const inDanger = stormD > G3.storm.r - 8;
  if (inDanger) {
    const a = Math.atan2(G3.storm.cz - b.z, G3.storm.cx - b.x);
    b.goal = { x: b.x + Math.cos(a) * 30, z: b.z + Math.sin(a) * 30 };
    b.goalT = 1;
  }

  if (b.target && b.target.alive) {
    const t = b.target, d = distXZ(b, t);
    const st = WEAPONS3[b.weapon.type];
    const pa = Math.atan2(t.z - b.z, t.x - b.x);
    b.aim = pa + (Math.random() - 0.5) * 0.12;

    const hurt = G3.now - b.lastHit < 3 || b.hp < 45;
    if (hurt && b.coverT <= 0) {
      b.coverPoint = coverPoint3(b, t);
      b.coverT = 1.5;
    }
    if (!hurt) b.coverPoint = null;

    let mx = 0, mz = 0;
    if (hurt && b.coverPoint) {
      const ca = Math.atan2(b.coverPoint.z - b.z, b.coverPoint.x - b.x);
      mx = Math.cos(ca);
      mz = Math.sin(ca);
    } else {
      if (b.strafeT <= 0) {
        b.strafeT = rand3(0.8, 1.8);
        b.strafeSign = Math.random() < 0.5 ? -1 : 1;
      }
      const desired = st.range * 0.5;
      if (d > desired + 6) { mx += Math.cos(pa); mz += Math.sin(pa); }
      else if (d < desired - 8) { mx -= Math.cos(pa); mz -= Math.sin(pa); }
      mx += Math.cos(pa + Math.PI / 2) * b.strafeSign * 0.8;
      mz += Math.sin(pa + Math.PI / 2) * b.strafeSign * 0.8;
    }
    const ml = Math.hypot(mx, mz) || 1;
    const moved = moveBot3(b, mx / ml * 4.8 * dt, mz / ml * 4.8 * dt);
    if (!moved) {
      b.unstickT = 0.4;
      b.unstickA = pa + (Math.random() < 0.5 ? 1 : -1) * Math.PI / 2;
      b.coverPoint = null;
    } else {
      b.moving = true;
      b.moveSpeed = 4.8;
    }
    if (d < st.range * 0.9 && b.fireCd <= 0 && losClear3(b, t)) botTryFire3(b);
  } else {
    b.goalT -= dt;
    if (!inDanger && (!b.goal || b.goalT <= 0 || Math.hypot(b.goal.x - b.x, b.goal.z - b.z) < 3)) {
      let gx, gz;
      if (G3.player.alive && Math.random() < 0.35) {
        gx = clamp3(G3.player.x + rand3(-45, 45), 10, WORLD3 - 10);
        gz = clamp3(G3.player.z + rand3(-45, 45), 10, WORLD3 - 10);
      } else {
        const a = rand3(0, TAU3), rrad = rand3(0, G3.storm.r * 0.8);
        gx = clamp3(G3.storm.cx + Math.cos(a) * rrad, 10, WORLD3 - 10);
        gz = clamp3(G3.storm.cz + Math.sin(a) * rrad, 10, WORLD3 - 10);
      }
      b.goal = { x: gx, z: gz };
      b.goalT = rand3(3, 6);
    }
    if (b.goal) {
      const a = Math.atan2(b.goal.z - b.z, b.goal.x - b.x);
      b.aim = a;
      const moved = moveBot3(b, Math.cos(a) * 4.2 * dt, Math.sin(a) * 4.2 * dt);
      if (!moved) {
        b.unstickT = 0.5;
        b.unstickA = a + (Math.random() < 0.5 ? 1 : -1) * Math.PI / 2;
        b.goal = null;
      } else {
        b.moving = true;
        b.moveSpeed = 4.2;
      }
    }
  }
}

function updatePlayer3(dt) {
  const pl = G3.player;
  const sprint = keys3['shift'] && !keys3['s'] && !keys3['a'] && !keys3['d'];
  let dx = 0, dz = 0;
  const fwdX = Math.sin(G3.camYaw), fwdZ = Math.cos(G3.camYaw);
  const rightX = Math.cos(G3.camYaw), rightZ = -Math.sin(G3.camYaw);
  if (keys3['w']) { dx += fwdX; dz += fwdZ; }
  if (keys3['s']) { dx -= fwdX; dz -= fwdZ; }
  if (keys3['a']) { dx -= rightX; dz -= rightZ; }
  if (keys3['d']) { dx += rightX; dz += rightZ; }
  pl.moving = !!(dx || dz);
  const speed = sprint ? 8.2 : 5.8;
  pl.moveSpeed = 0;
  if (pl.moving) {
    const l = Math.hypot(dx, dz);
    pl.x += dx / l * speed * dt;
    pl.z += dz / l * speed * dt;
    if (collidesXZ(pl.x, pl.z, pl.r)) {
      pl.x -= dx / l * speed * dt;
      if (collidesXZ(pl.x, pl.z, pl.r)) {
        pl.x += dx / l * speed * dt;
        pl.z -= dz / l * speed * dt;
        if (collidesXZ(pl.x, pl.z, pl.r)) pl.z += dz / l * speed * dt;
      }
    }
    pl.moveSpeed = speed;
    pl.walk += dt * 11;
  }

  if (keys3[' '] && pl.y <= 0.001) pl.vy = 7.2;
  pl.vy -= 20 * dt;
  pl.y += pl.vy * dt;
  if (pl.y <= 0) { pl.y = 0; pl.vy = 0; }

  pl.aim = G3.camYaw;
  pl.fireCd -= dt;
  if (pl.reloading) {
    pl.reloading.t += dt;
    if (pl.reloading.t >= pl.reloading.total) finishReload3(pl);
  }
  if (pl.using) {
    pl.using.t += dt;
    if (pl.using.t >= pl.using.total) finishUse3(pl);
  }
  if (mouse3.down) {
    const slot = pl.slots[pl.cur];
    if (slot && slot.kind === 'weapon') playerShoot3();
    else if (slot && slot.kind === 'consumable') tryUseItem3(pl);
  }
}

function resetStorm3() {
  G3.storm = {
    cx: WORLD3 / 2, cz: WORLD3 / 2, r: WORLD3 * 0.92,
    phase: 0, mode: 'hold', t: PHASES3[0].hold,
    from: { cx: WORLD3 / 2, cz: WORLD3 / 2, r: WORLD3 * 0.92 },
    to: null, dps: 1, acc: 0
  };
  planNext3();
}

function planNext3() {
  const p = PHASES3[G3.storm.phase];
  if (!p) {
    G3.storm.to = null;
    G3.storm.mode = 'done';
    return;
  }
  const maxOff = Math.max(0, G3.storm.r - p.radius);
  const a = rand3(0, TAU3), off = rand3(0, maxOff * 0.7);
  G3.storm.to = {
    cx: clamp3(G3.storm.cx + Math.cos(a) * off, p.radius, WORLD3 - p.radius),
    cz: clamp3(G3.storm.cz + Math.sin(a) * off, p.radius, WORLD3 - p.radius),
    r: p.radius
  };
  G3.storm.mode = 'hold';
  G3.storm.t = p.hold;
  G3.storm.dps = p.dps;
}

function updateStorm3(dt) {
  const s = G3.storm;
  if (s.mode !== 'done') {
    const p = PHASES3[s.phase];
    s.t -= dt;
    if (s.mode === 'hold') {
      if (s.t <= 0) {
        s.mode = 'shrink';
        s.t = p.shrink;
        s.from = { cx: s.cx, cz: s.cz, r: s.r };
      }
    } else {
      const k = clamp3(1 - Math.max(0, s.t) / p.shrink, 0, 1);
      s.cx = s.from.cx + (s.to.cx - s.from.cx) * k;
      s.cz = s.from.cz + (s.to.cz - s.from.cz) * k;
      s.r = s.from.r + (s.to.r - s.from.r) * k;
      if (s.t <= 0) {
        s.phase++;
        s.from = { cx: s.cx, cz: s.cz, r: s.r };
        if (PHASES3[s.phase]) planNext3();
        else { s.to = null; s.mode = 'done'; }
      }
    }
  }
  s.acc += dt;
  if (s.acc >= 0.5) {
    s.acc -= 0.5;
    const dmg = s.dps * 0.5;
    for (const e of allEnts3()) {
      if (!e.alive) continue;
      if (Math.hypot(e.x - s.cx, e.z - s.cz) > s.r) {
        e.hp -= dmg;
        if (e.isPlayer) G3.hitFlash = Math.max(G3.hitFlash, 0.25);
        if (e.hp <= 0) eliminate3(e, null, true);
      }
    }
  }
}

let stormCache3 = '';
function updateStormMeshes3() {
  const s = G3.storm;
  const t = s.to;
  const sig = s.r.toFixed(1) + '|' + s.cx.toFixed(1) + '|' + s.cz.toFixed(1) + '|' + (t ? t.r.toFixed(1) + ',' + t.cx.toFixed(1) + ',' + t.cz.toFixed(1) : 'x');
  if (sig === stormCache3) return;
  stormCache3 = sig;
  G3.stormWall.scale.set(s.r, 1, s.r);
  G3.stormWall.position.set(s.cx, 45, s.cz);
  G3.stormRing.scale.set(s.r, 1, s.r);
  G3.stormRing.position.set(s.cx, 0.06, s.cz);
  if (G3.stormFloor) {
    G3.stormFloor.geometry.dispose();
    G3.stormFloor.geometry = new THREE.RingGeometry(Math.max(s.r, 2), WORLD3 * 1.6, 64);
  }
  G3.stormFloor.position.set(s.cx, 0.02, s.cz);
  if (G3.storm.to && G3.storm.mode !== 'done') {
    G3.stormTarget.visible = true;
    G3.stormTarget.scale.set(G3.storm.to.r, 1, G3.storm.to.r);
    G3.stormTarget.position.set(G3.storm.to.cx, 0.1, G3.storm.to.cz);
  } else {
    G3.stormTarget.visible = false;
  }
}

function eliminate3(t, killer, byStorm) {
  if (!t.alive) return;
  t.alive = false;
  if (t.group) {
    G3.scene.remove(t.group);
    spawnParticles3(t.x, 1.2, t.z, t.isPlayer ? '#ffd166' : t.outfit.primary, 18, 4);
  }
  const kname = byStorm ? 'The Storm' : (killer ? (killer.isPlayer ? 'You' : killer.name) : 'The Storm');
  const vname = t.isPlayer ? 'You' : t.name;
  let col = '#cdd8f5';
  if (byStorm) col = '#c98aff';
  else if (killer && killer.isPlayer) col = '#ffd23f';
  else if (t.isPlayer) col = '#ff6b6b';
  G3.feed.push({ text: kname + ' eliminated ' + vname, col, t: 0 });
  if (!t.isPlayer) dropLootFrom3(t);
  if (t.isPlayer) {
    endMatch3(false);
    return;
  }
  if (killer && killer.isPlayer && killer.alive) {
    killer.kills++;
    killer.wood = Math.min(300, killer.wood + 30);
    G3.killBanner = { text: 'ELIMINATED ' + t.name, t: 1.6 };
    sfx3('elim', 0.12);
  }
  if (G3.bots.every(b => !b.alive)) endMatch3(true);
}

function endMatch3(win) {
  G3.ended = true;
  G3.running = false;
  const alive = G3.bots.filter(b => b.alive).length;
  const title = document.getElementById('endTitle');
  const msg = document.getElementById('endMsg');
  if (win) {
    title.textContent = 'VICTORY!';
    title.classList.add('win');
    msg.textContent = 'PLACEMENT: #1 of 30 \u00b7 KILLS: ' + G3.player.kills;
    sfx3('win', 0.14);
  } else {
    title.textContent = 'GAME OVER';
    title.classList.remove('win');
    msg.textContent = 'PLACEMENT: #' + (alive + 1) + ' of 30 \u00b7 KILLS: ' + G3.player.kills;
  }
  document.getElementById('end').classList.remove('hidden');
}

function updateFx3(dt) {
  for (const p of G3.parts) {
    p.vy -= 9 * dt;
    p.mesh.position.x += p.vx * dt;
    p.mesh.position.y += p.vy * dt;
    p.mesh.position.z += p.vz * dt;
    if (p.mesh.position.y < 0.06) p.mesh.position.y = 0.06;
    p.life -= dt;
    if (p.life <= 0) {
      G3.scene.remove(p.mesh);
      p.dead = true;
    }
  }
  G3.parts = G3.parts.filter(p => !p.dead);
  for (const n of G3.nums) {
    n.sprite.position.y += n.vy * dt;
    n.life -= dt;
    n.sprite.material.opacity = clamp3(n.life / 0.8, 0, 1);
    if (n.life <= 0) {
      G3.scene.remove(n.sprite);
      n.dead = true;
    }
  }
  G3.nums = G3.nums.filter(n => !n.dead);
  for (const f of G3.feed) f.t += dt;
  G3.feed = G3.feed.filter(f => f.t < 6);
  if (G3.killBanner) {
    G3.killBanner.t -= dt;
    if (G3.killBanner.t <= 0) G3.killBanner = null;
  }
  G3.hitFlash = Math.max(0, G3.hitFlash - dt * 1.4);
  G3.shake = Math.max(0, G3.shake - dt * 0.8);
  for (const l of G3.loot) {
    if (l.mesh) l.mesh.position.y = l.baseY + Math.sin(G3.now * 3 + l.bob) * 0.12;
    if (l.mesh && l.mesh.userData.glow) {
      l.mesh.userData.glow.material.opacity = 0.35 + Math.sin(G3.now * 4 + l.bob) * 0.2;
    }
  }
}

function updateCamera3() {
  const pl = G3.player;
  const dist = 4.2, height = 2.1;
  const backX = -Math.sin(G3.camYaw), backZ = -Math.cos(G3.camYaw);
  const from = new THREE.Vector3(pl.x, pl.y + 1.4, pl.z);
  const to = new THREE.Vector3(
    pl.x + backX * dist,
    pl.y + height + G3.camPitch * 1.5,
    pl.z + backZ * dist
  );
  if (G3.scene && G3.blockers.length) {
    const dir = to.clone().sub(from);
    const len = dir.length();
    dir.normalize();
    G3.scene.updateMatrixWorld(true);
    const hits = new THREE.Raycaster(from, dir, 0, len).intersectObjects(G3.blockers, false);
    if (hits.length) {
      const p = from.clone().add(dir.clone().multiplyScalar(Math.max(0.6, hits[0].distance - 0.35)));
      to.copy(p);
    }
  }
  G3.camera.position.copy(to);
  const aimY = pl.y + 1.25 + G3.camPitch * 8;
  G3.camera.lookAt(
    pl.x + Math.sin(G3.camYaw) * 5,
    aimY,
    pl.z + Math.cos(G3.camYaw) * 5
  );
  G3.camera.getWorldDirection(G3.camDir);
  G3.camPos.copy(to);
  G3.sun.position.set(pl.x + 60, 90, pl.z + 40);
  G3.sun.target.position.set(pl.x, 0, pl.z);
}

function initMatch3() {
  genWorld3();
  if (G3.editing) exitEdit3();
  for (const [k, cell] of G3.builds) {
    for (const p of cell.pieces) {
      G3.scene.remove(p.mesh);
      G3.blockers.splice(G3.blockers.indexOf(p.mesh), 1);
    }
  }
  G3.builds.clear();
  G3.buildMode = false;
  G3.buildPiece = 'wall';
  G3.buildRot = 0;
  G3.editing = null;
  if (G3.ghostMeshes) for (const t in G3.ghostMeshes) G3.ghostMeshes[t].visible = false;
  G3.parts = [];
  G3.nums = [];
  G3.feed = [];
  G3.killBanner = null;
  G3.ended = false;
  G3.paused = false;
  G3.hitFlash = 0;
  G3.shake = 0;
  G3.now = 0;
  const sp = freeSpot3();
  if (G3.player && G3.player.group) G3.scene.remove(G3.player.group);
  G3.player = makePlayer3(sp.x, sp.z);
  G3.scene.add(buildCharacter3(G3.player));
  for (const b of G3.bots) if (b.group) G3.scene.remove(b.group);
  G3.bots = [];
  for (let i = 0; i < 29; i++) {
    const b = makeBot3(i);
    G3.bots.push(b);
    G3.scene.add(buildCharacter3(b));
  }
  spawnWorldLoot3();
  resetStorm3();
  updateStormMeshes3();
  updateCamera3();
}

function update3(dt) {
  G3.now += dt;
  if (G3.player.alive) updatePlayer3(dt);
  for (const b of G3.bots) if (b.alive) updateBot3(b, dt);
  updateStorm3(dt);
  updatePickups3(dt);
  updateFx3(dt);
  updateCamera3();
  updateStormMeshes3();
  updateBuildPreview3();
  const pl = G3.player;
  if (pl.group) {
    pl.group.position.set(pl.x, pl.y, pl.z);
    pl.group.rotation.y = pl.aim;
    animateCharacter3(pl, dt);
  }
  for (const b of G3.bots) {
    if (!b.alive) continue;
    b.group.position.set(b.x, b.y, b.z);
    b.group.rotation.y = b.aim;
    animateCharacter3(b, dt);
  }
}

const mini3 = document.createElement('canvas');
mini3.width = mini3.height = 170;
const mctx3 = mini3.getContext('2d');

function slotLabel3(s) {
  if (!s) return '';
  if (s.kind === 'weapon') return WEAPONS3[s.type].name;
  return ITEMS3[s.item].name.toUpperCase();
}

function drawHud3() {
  const pl = G3.player;
  if (!pl || !hctx3) return;
  const x2 = hctx3;
  x2.clearRect(0, 0, hud3.width, hud3.height);
  x2.textAlign = 'left';

  const s = 170 / WORLD3;
  mctx3.clearRect(0, 0, 170, 170);
  mctx3.fillStyle = 'rgba(10,14,30,0.72)';
  mctx3.fillRect(0, 0, 170, 170);
  mctx3.save();
  mctx3.beginPath();
  mctx3.rect(0, 0, 170, 170);
  mctx3.arc(G3.storm.cx * s, G3.storm.cz * s, G3.storm.r * s, 0, TAU3);
  mctx3.fillStyle = 'rgba(128,60,220,0.55)';
  mctx3.fill('evenodd');
  mctx3.restore();
  mctx3.strokeStyle = 'rgba(220,160,255,0.9)';
  mctx3.lineWidth = 1.5;
  mctx3.beginPath();
  mctx3.arc(G3.storm.cx * s, G3.storm.cz * s, G3.storm.r * s, 0, TAU3);
  mctx3.stroke();
  if (G3.storm.to) {
    mctx3.setLineDash([4, 3]);
    mctx3.strokeStyle = '#ffffff';
    mctx3.beginPath();
    mctx3.arc(G3.storm.to.cx * s, G3.storm.to.cz * s, G3.storm.to.r * s, 0, TAU3);
    mctx3.stroke();
    mctx3.setLineDash([]);
  }
  for (const b of G3.bots) {
    if (!b.alive) continue;
    const d = distXZ(b, pl);
    const pinged = G3.now - b.lastShot < 1.5;
    if (d < 65 || (pinged && d < 130)) {
      mctx3.fillStyle = pinged ? '#ff9f43' : '#ff5252';
      mctx3.beginPath();
      mctx3.arc(b.x * s, b.z * s, 3, 0, TAU3);
      mctx3.fill();
    }
  }
  if (pl.alive) {
    mctx3.fillStyle = '#ffd23f';
    mctx3.beginPath();
    mctx3.arc(pl.x * s, pl.z * s, 3.5, 0, TAU3);
    mctx3.fill();
    mctx3.strokeStyle = '#fff';
    mctx3.lineWidth = 1.5;
    mctx3.beginPath();
    mctx3.moveTo(pl.x * s, pl.z * s);
    mctx3.lineTo(pl.x * s + Math.sin(pl.aim) * 8, pl.z * s + Math.cos(pl.aim) * 8);
    mctx3.stroke();
  }
  x2.drawImage(mini3, hud3.width - 190, 20);

  let fy = 205;
  x2.textAlign = 'right';
  x2.font = 'bold 13px "Segoe UI", Arial';
  for (const f of G3.feed) {
    x2.globalAlpha = clamp3(1 - (f.t - 4.5) / 1.5, 0, 1);
    x2.fillStyle = f.col;
    x2.fillText(f.text, hud3.width - 20, fy);
    fy += 18;
  }
  x2.globalAlpha = 1;

  const alive = (pl.alive ? 1 : 0) + G3.bots.filter(b => b.alive).length;
  x2.textAlign = 'center';
  x2.font = 'bold 20px "Segoe UI", Arial';
  x2.fillStyle = '#fff';
  x2.fillText('ALIVE: ' + alive, hud3.width / 2, 34);
  x2.font = 'bold 14px "Segoe UI", Arial';
  if (G3.storm.mode === 'hold') {
    const t = Math.max(0, Math.ceil(G3.storm.t));
    x2.fillStyle = '#cdd8f5';
    x2.fillText('STORM SHRINKS IN: 00:' + String(t).padStart(2, '0'), hud3.width / 2, 56);
  } else if (G3.storm.mode === 'shrink') {
    x2.fillStyle = '#c98aff';
    x2.fillText('THE STORM IS SHRINKING', hud3.width / 2, 56);
  } else {
    x2.fillStyle = '#c98aff';
    x2.fillText('FINAL STORM', hud3.width / 2, 56);
  }
  x2.font = 'bold 13px "Segoe UI", Arial';
  x2.fillStyle = '#ffd23f';
  x2.fillText('KILLS: ' + pl.kills, hud3.width / 2, 76);

  if (G3.killBanner) {
    x2.font = 'italic 900 30px "Segoe UI", Arial';
    x2.fillStyle = '#ffd23f';
    x2.strokeStyle = 'rgba(0,0,0,0.6)';
    x2.lineWidth = 5;
    x2.strokeText(G3.killBanner.text, hud3.width / 2, 130);
    x2.fillText(G3.killBanner.text, hud3.width / 2, 130);
  }

  const bx = 24, bw = 280;
  x2.fillStyle = 'rgba(0,0,0,0.5)';
  x2.fillRect(bx - 4, hud3.height - 62, bw + 8, 54);
  x2.fillStyle = 'rgba(0,0,0,0.6)';
  x2.fillRect(bx, hud3.height - 58, bw, 10);
  x2.fillStyle = '#4fc3f7';
  x2.fillRect(bx, hud3.height - 58, bw * clamp3(pl.shield / 100, 0, 1), 10);
  x2.fillStyle = 'rgba(0,0,0,0.6)';
  x2.fillRect(bx, hud3.height - 44, bw, 18);
  x2.fillStyle = pl.hp > 30 ? '#4ade80' : '#ff6b6b';
  x2.fillRect(bx, hud3.height - 44, bw * clamp3(pl.hp / 100, 0, 1), 18);
  x2.fillStyle = '#fff';
  x2.font = 'bold 12px "Segoe UI", Arial';
  x2.textAlign = 'left';
  x2.fillText('HP: ' + Math.max(0, Math.ceil(pl.hp)), bx + 6, hud3.height - 30);
  x2.fillText('SHIELD: ' + Math.ceil(pl.shield), bx + 6, hud3.height - 50);

  x2.fillStyle = '#8a5a3b';
  x2.fillRect(bx, hud3.height - 84, 14, 14);
  x2.strokeStyle = '#5e3d27';
  x2.lineWidth = 2;
  x2.strokeRect(bx, hud3.height - 84, 14, 14);
  x2.fillStyle = '#fff';
  x2.font = 'bold 15px "Segoe UI", Arial';
  x2.fillText(pl.wood, bx + 22, hud3.height - 72);

  const slotW = 148, slotH = 64, gap = 8;
  const totalW = pl.slots.length * slotW + (pl.slots.length - 1) * gap;
  const sx0 = hud3.width - 20 - totalW, sy0 = hud3.height - 20 - slotH;
  for (let i = 0; i < pl.slots.length; i++) {
    const x = sx0 + i * (slotW + gap);
    const slot = pl.slots[i];
    x2.fillStyle = 'rgba(0,0,0,0.55)';
    x2.fillRect(x, sy0, slotW, slotH);
    x2.lineWidth = slot && i === pl.cur ? 3 : 1.5;
    if (slot) {
      x2.strokeStyle = i === pl.cur ? '#ffffff'
        : slot.kind === 'weapon' ? RARITIES3[slot.rarity].col
        : ITEMS3[slot.item].col;
    } else {
      x2.strokeStyle = 'rgba(255,255,255,0.25)';
    }
    x2.strokeRect(x, sy0, slotW, slotH);
    x2.fillStyle = 'rgba(255,255,255,0.6)';
    x2.font = 'bold 10px "Segoe UI", Arial';
    x2.textAlign = 'left';
    x2.fillText(String(i + 1), x + 6, sy0 + 13);
    if (slot) {
      x2.textAlign = 'center';
      x2.fillStyle = slot.kind === 'weapon' ? RARITIES3[slot.rarity].col : ITEMS3[slot.item].col;
      x2.font = 'bold 11px "Segoe UI", Arial';
      const label = slotLabel3(slot);
      x2.fillText(label.length > 14 ? label.slice(0, 13) + '.' : label, x + slotW / 2 + 4, sy0 + 26);
      if (slot.kind === 'weapon') {
        x2.fillStyle = AMMO_TYPES3[WEAPONS3[slot.type].ammo].col;
        x2.fillText(slot.mag + ' / ' + pl.ammo[WEAPONS3[slot.type].ammo], x + slotW / 2 + 4, sy0 + 44);
      } else {
        x2.fillStyle = '#fff';
        x2.fillText('x' + slot.count, x + slotW / 2 + 4, sy0 + 44);
      }
    }
  }

  const px = sx0, py = sy0 - 58;
  x2.fillStyle = 'rgba(0,0,0,0.55)';
  x2.fillRect(px, py, 300, 50);
  x2.strokeStyle = 'rgba(255,255,255,0.3)';
  x2.lineWidth = 1.5;
  x2.strokeRect(px, py, 300, 50);
  x2.textAlign = 'left';
  const cur = pl.slots[pl.cur];
  if (cur && cur.kind === 'weapon') {
    const st = WEAPONS3[cur.type];
    x2.fillStyle = RARITIES3[cur.rarity].col;
    x2.font = 'italic 900 17px "Segoe UI", Arial';
    x2.fillText('[ ' + st.name + ' ]', px + 12, py + 21);
    x2.fillStyle = '#fff';
    x2.font = 'bold 14px "Segoe UI", Arial';
    x2.fillText('AMMO: ' + cur.mag + ' / ' + pl.ammo[st.ammo], px + 12, py + 41);
  } else if (cur && cur.kind === 'consumable') {
    x2.fillStyle = ITEMS3[cur.item].col;
    x2.font = 'italic 900 17px "Segoe UI", Arial';
    x2.fillText('[ ' + ITEMS3[cur.item].name.toUpperCase() + ' x' + cur.count + ' ]', px + 12, py + 21);
    x2.fillStyle = '#cdd8f5';
    x2.font = 'bold 13px "Segoe UI", Arial';
    x2.fillText('PRESS ' + (pl.cur + 1) + ' TO USE', px + 12, py + 41);
  } else {
    x2.fillStyle = '#8b97b8';
    x2.font = 'italic 900 17px "Segoe UI", Arial';
    x2.fillText('[ EMPTY ]', px + 12, py + 21);
  }
  if (pl.reloading) {
    const k = pl.reloading.t / pl.reloading.total;
    x2.fillStyle = 'rgba(0,0,0,0.6)';
    x2.fillRect(px + 180, py + 12, 108, 10);
    x2.fillStyle = '#ffd23f';
    x2.fillRect(px + 180, py + 12, 108 * k, 10);
    x2.fillStyle = '#fff';
    x2.font = 'bold 10px "Segoe UI", Arial';
    x2.fillText('RELOADING', px + 180, py + 40);
  } else if (pl.using) {
    const k = pl.using.t / pl.using.total;
    x2.fillStyle = 'rgba(0,0,0,0.6)';
    x2.fillRect(px + 180, py + 12, 108, 10);
    x2.fillStyle = '#4ade80';
    x2.fillRect(px + 180, py + 12, 108 * k, 10);
    x2.fillStyle = '#fff';
    x2.font = 'bold 10px "Segoe UI", Arial';
    x2.fillText('USING...', px + 180, py + 40);
  }

  x2.textAlign = 'center';
  x2.font = '12px "Segoe UI", Arial';
  x2.fillStyle = 'rgba(255,255,255,0.45)';
  x2.fillText('Q build - Z/X/C/V pieces - R rotate - G edit - R reload - M sound - ESC pause', hud3.width / 2, hud3.height - 8);

  if (S3.showFps) {
    x2.textAlign = 'left';
    x2.font = 'bold 14px "Segoe UI", Arial';
    x2.fillStyle = '#4ade80';
    x2.fillText('FPS: ' + fpsShown3, 24, 34);
    x2.textAlign = 'center';
  }

  if (G3.buildMode && pl.alive && !G3.editing) {
    x2.font = 'italic 900 18px "Segoe UI", Arial';
    x2.fillStyle = '#7ce6ff';
    x2.fillText('[ BUILD MODE ] ' + PIECES3[G3.buildPiece].name + ' - LMB place - R / WHEEL rotate - Z/X/C/V piece', hud3.width / 2, hud3.height / 2 + 50);
  }
  if (G3.editing) {
    x2.font = 'italic 900 18px "Segoe UI", Arial';
    x2.fillStyle = '#4ade80';
    x2.fillText('[ EDITING ] Click to change shape - G to exit', hud3.width / 2, hud3.height / 2 + 50);
  }

  if (G3.hitFlash > 0) {
    const g = x2.createRadialGradient(hud3.width / 2, hud3.height / 2, hud3.height * 0.35, hud3.width / 2, hud3.height / 2, hud3.height * 0.75);
    g.addColorStop(0, 'rgba(255,0,0,0)');
    g.addColorStop(1, 'rgba(255,0,0,' + (G3.hitFlash * 0.55) + ')');
    x2.fillStyle = g;
    x2.fillRect(0, 0, hud3.width, hud3.height);
  }

  x2.strokeStyle = '#ffffff';
  x2.lineWidth = 2;
  const mx = hud3.width / 2, my = hud3.height / 2;
  x2.beginPath();
  x2.moveTo(mx - 9, my);
  x2.lineTo(mx - 3, my);
  x2.moveTo(mx + 3, my);
  x2.lineTo(mx + 9, my);
  x2.moveTo(mx, my - 9);
  x2.lineTo(mx, my - 3);
  x2.moveTo(mx, my + 3);
  x2.lineTo(mx, my + 9);
  x2.stroke();
}

function render3() {
  if (!G3.renderer) return;
  const sx = G3.shake > 0 ? rand3(-1, 1) * G3.shake * 0.4 : 0;
  const sy = G3.shake > 0 ? rand3(-1, 1) * G3.shake * 0.4 : 0;
  G3.camera.position.x += sx;
  G3.camera.position.y += sy;
  G3.renderer.render(G3.scene, G3.camera);
  G3.camera.position.x -= sx;
  G3.camera.position.y -= sy;
  drawHud3();
}

const mouse3 = { x: innerWidth / 2, y: innerHeight / 2, down: false };
const keys3 = {};

let last3 = performance.now();
let fpsCount3 = 0, fpsTimer3 = 0, fpsShown3 = 0;
function loop3(t) {
  requestAnimationFrame(loop3);
  if (S3.fpsCap > 0 && t - last3 < 1000 / S3.fpsCap) return;
  const dt = Math.min(0.05, (t - last3) / 1000);
  last3 = t;
  if (S3.showFps) {
    fpsCount3++;
    fpsTimer3 += dt;
    if (fpsTimer3 >= 0.5) {
      fpsShown3 = Math.round(fpsCount3 / fpsTimer3);
      fpsCount3 = 0;
      fpsTimer3 = 0;
    }
  }
  if (G3.running && !G3.paused) update3(dt);
  render3();
}

function wireSettings3() {
  const $ = id => document.getElementById(id);
  $('menuSettings').addEventListener('click', () => {
    settingsOrigin3 = 'menu';
    $('menu').classList.add('hidden');
    $('settings').classList.remove('hidden');
    syncSettingsUI3();
  });
  $('pauseSettings').addEventListener('click', () => {
    settingsOrigin3 = 'pause';
    $('pause').classList.add('hidden');
    $('settings').classList.remove('hidden');
    syncSettingsUI3();
  });
  $('settingsBack').addEventListener('click', () => {
    $('settings').classList.add('hidden');
    if (settingsOrigin3 === 'pause') $('pause').classList.remove('hidden');
    else $('menu').classList.remove('hidden');
  });
  $('setQuality').addEventListener('change', () => {
    S3.quality = $('setQuality').value;
    saveSettings3();
    applyVideoSettings3();
  });
  $('setRes').addEventListener('input', () => {
    S3.resScale = +$('setRes').value;
    $('setResVal').textContent = S3.resScale + '%';
    saveSettings3();
    applyVideoSettings3();
  });
  $('setFps').addEventListener('change', () => {
    S3.fpsCap = +$('setFps').value;
    saveSettings3();
  });
  $('setShowFps').addEventListener('change', () => {
    S3.showFps = $('setShowFps').checked;
    saveSettings3();
  });
  $('setFov').addEventListener('input', () => {
    S3.fov = +$('setFov').value;
    $('setFovVal').textContent = S3.fov;
    saveSettings3();
    applyVideoSettings3();
  });
  $('setSens').addEventListener('input', () => {
    S3.sens = $('setSens').value / 10;
    $('setSensVal').textContent = S3.sens.toFixed(1);
    saveSettings3();
  });
  $('setEditRelease').addEventListener('change', () => {
    S3.editOnRelease = $('setEditRelease').checked;
    saveSettings3();
  });
}

function syncSettingsUI3() {
  const $ = id => document.getElementById(id);
  $('setQuality').value = S3.quality;
  $('setRes').value = S3.resScale;
  $('setResVal').textContent = S3.resScale + '%';
  $('setFps').value = String(S3.fpsCap);
  $('setShowFps').checked = S3.showFps;
  $('setFov').value = S3.fov;
  $('setFovVal').textContent = S3.fov;
  $('setSens').value = Math.round(S3.sens * 10);
  $('setSensVal').textContent = S3.sens.toFixed(1);
  $('setEditRelease').checked = S3.editOnRelease;
}

function setupInput3() {
  if (NO_RENDER) return;
  const cv3 = document.getElementById('cv');
  addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    if (['w', 'a', 's', 'd', 'q', 'r', 'g', 'z', 'x', 'c', 'v', 'm', '1', '2', '3', '4', '5', ' ', 'escape', 'f1', 'f2', 'f3', 'f4'].includes(k)) e.preventDefault();
    keys3[k] = true;
    if (!G3.running || G3.ended) return;
    if (k === 'escape') {
      G3.paused = !G3.paused;
      document.getElementById('pause').classList.toggle('hidden', !G3.paused);
      if (document.pointerLockElement) document.exitPointerLock();
      return;
    }
    if (G3.paused || !G3.player.alive) return;
    if (k === 'm') { G3.muted = !G3.muted; return; }
    if (k === 'q') {
      if (G3.editing) { exitEdit3(); return; }
      G3.buildMode = !G3.buildMode;
      return;
    }
    if (k === 'g') {
      if (G3.editing) exitEdit3();
      else enterEdit3();
      return;
    }
    if (G3.buildMode) {
      if (k === 'z' || k === 'f1') { G3.buildPiece = 'wall'; return; }
      if (k === 'x' || k === 'f2') { G3.buildPiece = 'floor'; return; }
      if (k === 'c' || k === 'f3') { G3.buildPiece = 'ramp'; return; }
      if (k === 'v' || k === 'f4') { G3.buildPiece = 'cone'; return; }
      if (k === 'r') { G3.buildRot = (G3.buildRot + 1) % 4; return; }
    }
    if (k === 'r') { startReload3(G3.player); return; }
    if (['1', '2', '3', '4', '5'].includes(k)) {
      const i = parseInt(k) - 1;
      const slot = G3.player.slots[i];
      if (!slot) return;
      G3.buildMode = false;
      if (G3.editing) exitEdit3();
      if (slot.kind === 'consumable' && i === G3.player.cur) tryUseItem3(G3.player);
      else switchSlot3(G3.player, i);
    }
  });
  addEventListener('keyup', e => { keys3[e.key.toLowerCase()] = false; });
  addEventListener('blur', () => {
    for (const k in keys3) keys3[k] = false;
    mouse3.down = false;
  });
  cv3.addEventListener('mousemove', e => {
    if (document.pointerLockElement === cv3) {
      G3.camYaw += e.movementX * 0.0023 * S3.sens;
      G3.camPitch = clamp3(G3.camPitch + e.movementY * 0.0023 * S3.sens, -0.8, 0.9);
    }
  });
  cv3.addEventListener('mousedown', e => {
    if (e.button === 0) {
      if (document.pointerLockElement !== cv3 && G3.running && !G3.paused && !G3.ended) {
        cv3.requestPointerLock();
        return;
      }
      if (G3.editing) {
        if (!S3.editOnRelease) cycleVariant3();
        return;
      }
      if (G3.buildMode && G3.player.alive) {
        buildPiece3(G3.buildPiece);
        return;
      }
      mouse3.down = true;
    }
    if (e.button === 2 && G3.running && !G3.paused && G3.player.alive && !G3.editing) {
      if (G3.buildMode) G3.buildRot = (G3.buildRot + 1) % 4;
      else buildPiece3('wall');
    }
  });
  addEventListener('mouseup', e => {
    if (e.button === 0) {
      if (G3.editing && S3.editOnRelease) cycleVariant3();
      mouse3.down = false;
    }
  });
  cv3.addEventListener('contextmenu', e => e.preventDefault());
  addEventListener('wheel', e => {
    if (!G3.running || !G3.player.alive) return;
    if (G3.buildMode && !G3.editing) {
      G3.buildRot = (G3.buildRot + (e.deltaY > 0 ? 1 : 3)) % 4;
      return;
    }
    const dir = e.deltaY > 0 ? 1 : -1;
    let i = G3.player.cur;
    for (let n = 0; n < G3.player.slots.length; n++) {
      i = (i + dir + G3.player.slots.length) % G3.player.slots.length;
      if (G3.player.slots[i]) break;
    }
    switchSlot3(G3.player, i);
  }, { passive: true });

  document.getElementById('play').addEventListener('click', () => {
    initAudio3();
    document.getElementById('menu').classList.add('hidden');
    initMatch3();
    G3.running = true;
    G3.paused = false;
    cv3.requestPointerLock();
  });
  document.getElementById('again').addEventListener('click', () => {
    document.getElementById('end').classList.add('hidden');
    initMatch3();
    G3.running = true;
    G3.paused = false;
    cv3.requestPointerLock();
  });
  document.getElementById('resumeBtn').addEventListener('click', () => {
    document.getElementById('pause').classList.add('hidden');
    G3.paused = false;
    cv3.requestPointerLock();
  });
  wireSettings3();
  addEventListener('resize', () => {
    G3.renderer.setSize(innerWidth, innerHeight);
    G3.camera.aspect = innerWidth / innerHeight;
    G3.camera.updateProjectionMatrix();
    hud3.width = innerWidth;
    hud3.height = innerHeight;
  });
}

loadSettings3();
setupScene3();
setupHud3();
setupInput3();
initMatch3();
G3.running = false;
if (!NO_RENDER) requestAnimationFrame(loop3);

globalThis.GameAPI3 = {
  initMatch: initMatch3,
  update: update3,
  render: render3,
  G: G3,
  castShot: castShot3,
  playerShoot: playerShoot3,
  buildPiece: buildPiece3,
  enterEdit: enterEdit3,
  exitEdit: exitEdit3,
  cycleVariant: cycleVariant3,
  aimedPiece: aimedPiece3,
  applyVariant: applyVariant3
};
