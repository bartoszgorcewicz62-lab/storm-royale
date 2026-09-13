'use strict';

function makePlayer(x, y) {
  return {
    x, y, r: 14, hp: 100, shield: 0, alive: true, isPlayer: true, name: 'You',
    color: '#3b6fd4',
    skin: { outfit: '#3b6fd4', dark: shade('#3b6fd4', -35), skin: '#e0ac69', hair: '#2b2118' },
    aim: 0, fireCd: 0, kills: 0, lastHit: -99, lastShot: -99, walk: 0, moving: false,
    slots: [makeWeapon('pistol', 0), null, null, null, null], cur: 0,
    ammo: { light: 60, medium: 0, shell: 0, heavy: 0 },
    wood: 100, reloading: null, using: null
  };
}

function cancelActions(e) {
  e.reloading = null;
  e.using = null;
}

function startReload(e) {
  if (e.reloading || e.using) return;
  const inst = e.slots[e.cur];
  if (!inst || inst.kind !== 'weapon') return;
  const st = WEAPONS[inst.type];
  if (inst.mag >= st.mag || e.ammo[st.ammo] <= 0) return;
  e.reloading = { t: 0, total: st.reload };
  sfx('reload', 0.06);
}

function finishReload(e) {
  const inst = e.slots[e.cur];
  if (!inst || inst.kind !== 'weapon') { e.reloading = null; return; }
  const st = WEAPONS[inst.type];
  const take = Math.min(st.mag - inst.mag, e.ammo[st.ammo]);
  inst.mag += take;
  e.ammo[st.ammo] -= take;
  e.reloading = null;
}

function switchSlot(e, i) {
  if (i < 0 || i >= e.slots.length || !e.slots[i] || i === e.cur) return;
  cancelActions(e);
  e.cur = i;
}

function tryUseItem(e) {
  if (e.using || e.reloading) return;
  const slot = e.slots[e.cur];
  if (!slot || slot.kind !== 'consumable') return;
  const it = ITEMS[slot.item];
  const beneficial = (it.heal > 0 && e.hp < it.cap) || (it.shield > 0 && e.shield < it.cap);
  if (!beneficial) return;
  e.using = { t: 0, total: it.time };
}

function finishUse(e) {
  const slot = e.slots[e.cur];
  if (!slot || slot.kind !== 'consumable') { e.using = null; return; }
  const it = ITEMS[slot.item];
  e.hp = Math.min(it.cap, e.hp + it.heal);
  e.shield = Math.min(it.cap, e.shield + it.shield);
  sfx('heal', 0.08);
  slot.count--;
  if (slot.count <= 0) e.slots[e.cur] = null;
  e.using = null;
}

function buildWall(e) {
  if (e.wood < 30) return;
  const px = e.x + Math.cos(e.aim) * 58, py = e.y + Math.sin(e.aim) * 58;
  const gx = Math.floor(px / CELL), gy = Math.floor(py / CELL);
  if (gx < 0 || gy < 0 || gx * CELL >= WORLD || gy * CELL >= WORLD) return;
  const k = key2(gx, gy);
  if (G.builds.has(k)) return;
  for (const e2 of allEnts()) {
    if (e2.alive && circleRect(e2.x, e2.y, e2.r, gx * CELL, gy * CELL, CELL, CELL)) return;
  }
  G.builds.set(k, { hp: 250, max: 250 });
  e.wood -= 30;
  sfx('build', 0.07);
}

function updatePlayer(dt) {
  const pl = G.player;
  let dx = 0, dy = 0;
  if (keys['w']) dy -= 1;
  if (keys['s']) dy += 1;
  if (keys['a']) dx -= 1;
  if (keys['d']) dx += 1;
  pl.moving = !!(dx || dy);
  if (pl.moving) {
    const l = Math.hypot(dx, dy);
    pl.x += dx / l * 265 * dt;
    pl.y += dy / l * 265 * dt;
    if (collides(pl.x, pl.y, pl.r)) {
      pl.x -= dx / l * 265 * dt;
      if (collides(pl.x, pl.y, pl.r)) {
        pl.x += dx / l * 265 * dt;
        pl.y -= dy / l * 265 * dt;
        if (collides(pl.x, pl.y, pl.r)) pl.y += dy / l * 265 * dt;
      }
    }
    pl.walk += dt * 12;
  }
  pl.aim = Math.atan2(mouse.y + G.camY - pl.y, mouse.x + G.camX - pl.x);
  pl.fireCd -= dt;
  if (pl.reloading) {
    pl.reloading.t += dt;
    if (pl.reloading.t >= pl.reloading.total) finishReload(pl);
  }
  if (pl.using) {
    pl.using.t += dt;
    if (pl.using.t >= pl.using.total) finishUse(pl);
  }
  if (mouse.down) {
    const slot = pl.slots[pl.cur];
    if (slot && slot.kind === 'weapon') tryFire(pl);
    else if (slot && slot.kind === 'consumable') tryUseItem(pl);
  }
}

function drawGun(e) {
  const inst = e.isPlayer ? e.slots[e.cur] : e.weapon;
  const st = inst && inst.kind === 'weapon' ? WEAPONS[inst.type] : WEAPONS.pistol;
  const L = st.len, W = st.gw;
  ctx.fillStyle = '#2e3440';
  ctx.fillRect(8, -W / 2, L, W);
  ctx.fillStyle = '#454d5c';
  ctx.fillRect(8 + L - 4, -W / 2 + 1, 4, W - 2);
  if (st === WEAPONS.shotgun) {
    ctx.fillStyle = '#7a5230';
    ctx.fillRect(12, W / 2 - 1, 10, 3);
  }
  if (st === WEAPONS.sniper) {
    ctx.fillStyle = '#1e222b';
    ctx.fillRect(12, -W / 2 - 3, 7, 3);
  }
  ctx.fillStyle = e.skin.skin;
  ctx.beginPath();
  ctx.arc(11, 4, 2.6, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(14, -2, 2.6, 0, TAU);
  ctx.fill();
}

function drawCharacter(e) {
  const s = e.skin;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(e.x, e.y + 9, 13, 6, 0, 0, TAU);
  ctx.fill();
  ctx.translate(e.x, e.y);
  ctx.rotate(e.aim);
  const legOff = e.moving ? Math.sin(e.walk) * 4 : 0;
  ctx.fillStyle = '#33383f';
  ctx.fillRect(-6 - legOff, 8, 9, 5);
  ctx.fillRect(-6 + legOff, -13, 9, 5);
  ctx.fillStyle = s.dark;
  rr(ctx, -15, -7, 7, 14, 2);
  ctx.fill();
  ctx.fillStyle = s.outfit;
  rr(ctx, -9, -10, 18, 20, 5);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = e.isPlayer ? '#f5f7fa' : 'rgba(20,24,30,0.55)';
  ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(2, -10, 4, 20);
  ctx.strokeStyle = s.outfit;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 8);
  ctx.lineTo(13, 4);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(13, -3);
  ctx.stroke();
  drawGun(e);
  ctx.fillStyle = s.skin;
  ctx.beginPath();
  ctx.arc(3, 0, 7.5, 0, TAU);
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(20,24,30,0.55)';
  ctx.stroke();
  ctx.fillStyle = s.hair;
  ctx.beginPath();
  ctx.arc(3, 0, 7.5, Math.PI / 2, Math.PI * 1.5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  if (!e.isPlayer && G.now - e.lastHit < 3) {
    const w = 36;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(e.x - w / 2, e.y - 28, w, 6);
    ctx.fillStyle = '#4ade80';
    ctx.fillRect(e.x - w / 2, e.y - 28, w * clamp(e.hp / 100, 0, 1), 6);
    if (e.shield > 0) {
      ctx.fillStyle = '#4fc3f7';
      ctx.fillRect(e.x - w / 2, e.y - 32, w * clamp(e.shield / 100, 0, 1), 3);
    }
  }
}
