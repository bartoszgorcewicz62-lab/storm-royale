'use strict';

const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');
let VW = innerWidth, VH = innerHeight;

function resize() {
  VW = cv.width = innerWidth;
  VH = cv.height = innerHeight;
}
addEventListener('resize', resize);
resize();

const mouse = { x: innerWidth / 2, y: innerHeight / 2, down: false };
const keys = {};

function allEnts() {
  return [G.player, ...G.bots];
}

function clampCam(p, size, view) {
  return size <= view ? (size - view) / 2 : clamp(p - view / 2, 0, size - view);
}

function eliminate(t, killer, byStorm) {
  if (!t.alive) return;
  t.alive = false;
  for (let i = 0; i < 18; i++) {
    const a = rand(0, TAU), sp = rand(40, 180);
    G.parts.push({
      x: t.x, y: t.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: rand(0.3, 0.7), max: 0.7, size: rand(2, 5),
      col: t.isPlayer ? '#ffd166' : t.color
    });
  }
  const kname = byStorm ? 'The Storm' : (killer ? (killer.isPlayer ? 'You' : killer.name) : 'The Storm');
  const vname = t.isPlayer ? 'You' : t.name;
  let col = '#cdd8f5';
  if (byStorm) col = '#c98aff';
  else if (killer && killer.isPlayer) col = '#ffd23f';
  else if (t.isPlayer) col = '#ff6b6b';
  G.feed.push({ text: kname + ' eliminated ' + vname, col, t: 0 });
  if (!t.isPlayer) dropLootFrom(t);
  if (t.isPlayer) {
    endMatch(false);
    return;
  }
  if (killer && killer.isPlayer && killer.alive) {
    killer.kills++;
    killer.wood = Math.min(300, killer.wood + 30);
    G.killBanner = { text: 'ELIMINATED ' + t.name, t: 1.6 };
    sfx('elim', 0.12);
  }
  if (G.bots.every(b => !b.alive)) endMatch(true);
}

function endMatch(win) {
  G.ended = true;
  G.running = false;
  const alive = G.bots.filter(b => b.alive).length;
  const title = document.getElementById('endTitle');
  const msg = document.getElementById('endMsg');
  if (win) {
    title.textContent = 'VICTORY!';
    title.classList.add('win');
    msg.textContent = 'PLACEMENT: #1 of 30 \u00b7 KILLS: ' + G.player.kills;
    sfx('win', 0.14);
  } else {
    title.textContent = 'GAME OVER';
    title.classList.remove('win');
    msg.textContent = 'PLACEMENT: #' + (alive + 1) + ' of 30 \u00b7 KILLS: ' + G.player.kills;
  }
  document.getElementById('end').classList.remove('hidden');
}

function initMatch() {
  genWorld();
  G.builds.clear();
  G.bullets = [];
  G.parts = [];
  G.nums = [];
  G.feed = [];
  G.killBanner = null;
  G.ended = false;
  G.paused = false;
  G.hitFlash = 0;
  G.shake = 0;
  G.now = 0;
  const sp = freeSpot();
  G.player = makePlayer(sp.x, sp.y);
  G.bots = [];
  for (let i = 0; i < 29; i++) G.bots.push(makeBot(i));
  spawnWorldLoot();
  resetStorm();
}

function updateFx(dt) {
  for (const p of G.parts) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
  }
  G.parts = G.parts.filter(p => p.life > 0);
  for (const n of G.nums) {
    n.y += n.vy * dt;
    n.life -= dt;
  }
  G.nums = G.nums.filter(n => n.life > 0);
  for (const f of G.feed) f.t += dt;
  G.feed = G.feed.filter(f => f.t < 6);
  if (G.killBanner) {
    G.killBanner.t -= dt;
    if (G.killBanner.t <= 0) G.killBanner = null;
  }
  G.hitFlash = Math.max(0, G.hitFlash - dt * 1.4);
  G.shake = Math.max(0, G.shake - dt * 0.8);
}

function update(dt) {
  G.now += dt;
  G.camX = clampCam(G.player.x, WORLD, VW);
  G.camY = clampCam(G.player.y, WORLD, VH);
  if (G.player.alive) updatePlayer(dt);
  for (const b of G.bots) if (b.alive) updateBot(b, dt);
  updateBullets(dt);
  updateStorm(dt);
  updatePickups(dt);
  updateFx(dt);
}

function render() {
  const sx = G.shake > 0 ? rand(-1, 1) * G.shake * 8 : 0;
  const sy = G.shake > 0 ? rand(-1, 1) * G.shake * 8 : 0;
  ctx.save();
  ctx.translate(-G.camX + sx, -G.camY + sy);
  drawGround();
  drawObstacles();
  drawLoot();
  for (const [k, w] of G.builds) {
    const [gx, gy] = k.split(',').map(Number);
    ctx.fillStyle = '#8a5a3b';
    ctx.fillRect(gx * CELL + 1, gy * CELL + 1, CELL - 2, CELL - 2);
    ctx.strokeStyle = '#5e3d27';
    ctx.lineWidth = 3;
    ctx.strokeRect(gx * CELL + 3, gy * CELL + 3, CELL - 6, CELL - 6);
    if (w.hp < w.max) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(gx * CELL + 4, gy * CELL + 4, CELL - 8, 4);
      ctx.fillStyle = '#4ade80';
      ctx.fillRect(gx * CELL + 4, gy * CELL + 4, (CELL - 8) * w.hp / w.max, 4);
    }
  }
  ctx.strokeStyle = 'rgba(255,224,102,0.9)';
  ctx.lineWidth = 2.5;
  for (const b of G.bullets) {
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02);
    ctx.stroke();
  }
  for (const b of G.bots) if (b.alive) drawCharacter(b);
  if (G.player.alive) drawCharacter(G.player);
  drawCanopies();
  drawBushes();
  for (const p of G.parts) {
    ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
    ctx.fillStyle = p.col;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    ctx.globalAlpha = 1;
  }
  ctx.font = 'bold 15px "Segoe UI", Arial';
  ctx.textAlign = 'center';
  for (const n of G.nums) {
    ctx.globalAlpha = clamp(n.life / 0.8, 0, 1);
    ctx.fillStyle = n.col;
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 3;
    ctx.strokeText(n.text, n.x, n.y);
    ctx.fillText(n.text, n.x, n.y);
    ctx.globalAlpha = 1;
  }
  drawStormOverlay();
  ctx.restore();

  if (G.hitFlash > 0) {
    const g = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.35, VW / 2, VH / 2, VH * 0.75);
    g.addColorStop(0, 'rgba(255,0,0,0)');
    g.addColorStop(1, 'rgba(255,0,0,' + (G.hitFlash * 0.55) + ')');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VW, VH);
  }

  drawHud();
  drawCrosshair();
}

let last = performance.now();
function loop(t) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (t - last) / 1000);
  last = t;
  if (G.running && !G.paused) update(dt);
  if (G.player) render();
}

addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (['w', 'a', 's', 'd', 'q', 'r', 'm', '1', '2', '3', '4', '5', 'escape'].includes(k)) e.preventDefault();
  keys[k] = true;
  if (!G.running || G.ended) return;
  if (k === 'escape') {
    G.paused = !G.paused;
    document.getElementById('pause').classList.toggle('hidden', !G.paused);
    return;
  }
  if (G.paused || !G.player.alive) return;
  if (k === 'm') { G.muted = !G.muted; return; }
  if (k === 'r') startReload(G.player);
  if (k === 'q') buildWall(G.player);
  if (['1', '2', '3', '4', '5'].includes(k)) {
    const i = parseInt(k) - 1;
    const slot = G.player.slots[i];
    if (!slot) return;
    if (slot.kind === 'consumable' && i === G.player.cur) tryUseItem(G.player);
    else switchSlot(G.player, i);
  }
});
addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
addEventListener('blur', () => {
  for (const k in keys) keys[k] = false;
  mouse.down = false;
});
cv.addEventListener('mousemove', e => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});
cv.addEventListener('mousedown', e => {
  if (e.button === 0) mouse.down = true;
  if (e.button === 2 && G.running && !G.paused && G.player.alive) buildWall(G.player);
});
addEventListener('mouseup', e => { if (e.button === 0) mouse.down = false; });
cv.addEventListener('contextmenu', e => e.preventDefault());
addEventListener('wheel', e => {
  if (!G.running || !G.player.alive) return;
  const dir = e.deltaY > 0 ? 1 : -1;
  let i = G.player.cur;
  for (let n = 0; n < G.player.slots.length; n++) {
    i = (i + dir + G.player.slots.length) % G.player.slots.length;
    if (G.player.slots[i]) break;
  }
  switchSlot(G.player, i);
}, { passive: true });

document.getElementById('play').addEventListener('click', () => {
  initAudio();
  document.getElementById('menu').classList.add('hidden');
  initMatch();
  G.running = true;
  G.paused = false;
});
document.getElementById('again').addEventListener('click', () => {
  document.getElementById('end').classList.add('hidden');
  initMatch();
  G.running = true;
  G.paused = false;
});

initMatch();
G.running = false;
requestAnimationFrame(loop);
