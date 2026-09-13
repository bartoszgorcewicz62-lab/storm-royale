'use strict';

function makeWeapon(type, rarity) {
  return { kind: 'weapon', type, rarity, mag: WEAPONS[type].mag };
}

function weaponStats(inst) {
  const w = WEAPONS[inst.type];
  return { ...w, dmg: w.dmg * RARITIES[inst.rarity].mult };
}

function tryFire(e) {
  if (!e.alive || e.fireCd > 0) return;
  const inst = e.isPlayer ? e.slots[e.cur] : e.weapon;
  if (!inst || inst.kind !== 'weapon') return;
  const st = weaponStats(inst);
  if (e.isPlayer) {
    if (e.reloading || e.using) return;
    if (inst.mag <= 0) { startReload(e); return; }
    inst.mag--;
  }
  e.fireCd = st.rof;
  e.lastShot = G.now;
  const bx = e.x + Math.cos(e.aim) * (10 + st.len), by = e.y + Math.sin(e.aim) * (10 + st.len);
  for (let p = 0; p < st.pellets; p++) {
    const a = e.aim + (Math.random() - 0.5) * 2 * st.spread * (st.pellets > 1 ? 2.2 : 1);
    G.bullets.push({ x: bx, y: by, vx: Math.cos(a) * st.speed, vy: Math.sin(a) * st.speed, dmg: st.dmg, owner: e, life: st.range / st.speed });
  }
  G.parts.push({ x: bx, y: by, vx: Math.cos(e.aim) * 60, vy: Math.sin(e.aim) * 60, life: 0.06, max: 0.06, size: 6, col: '#fff3b0' });
  G.shake = e.isPlayer ? 0.1 : G.shake;
  const vol = e.isPlayer ? 0.09 : clamp(1 - dist(e, G.player) / 900, 0, 1) * 0.05;
  if (vol > 0.004) sfx(inst.type === 'shotgun' ? 'shotgun' : inst.type === 'sniper' ? 'sniper' : 'shoot', vol);
}

function updateBullets(dt) {
  for (const b of G.bullets) {
    if (b.dead) continue;
    b.life -= dt;
    if (b.life <= 0) { b.dead = true; continue; }
    const sp = Math.hypot(b.vx, b.vy);
    const steps = Math.max(1, Math.ceil(sp * dt / 10));
    for (let s = 0; s < steps && !b.dead; s++) {
      b.x += b.vx * dt / steps;
      b.y += b.vy * dt / steps;
      if (b.x < 0 || b.y < 0 || b.x > WORLD || b.y > WORLD) { b.dead = true; break; }
      const gx = Math.floor(b.x / CELL), gy = Math.floor(b.y / CELL);
      const w = G.builds.get(key2(gx, gy));
      if (w) {
        w.hp -= b.dmg;
        if (w.hp <= 0) G.builds.delete(key2(gx, gy));
        impactFx(b.x, b.y, '#b98a63');
        b.dead = true;
        break;
      }
      if (blocked(b.x, b.y)) {
        impactFx(b.x, b.y, '#dddddd');
        b.dead = true;
        break;
      }
      for (const e of allEnts()) {
        if (!e.alive || e === b.owner) continue;
        const dx = e.x - b.x, dy = e.y - b.y;
        if (dx * dx + dy * dy < 16 * 16) {
          hitEntity(e, b);
          b.dead = true;
          break;
        }
      }
    }
  }
  G.bullets = G.bullets.filter(b => !b.dead);
}

function impactFx(x, y, col) {
  for (let i = 0; i < 3; i++) {
    G.parts.push({ x, y, vx: rand(-70, 70), vy: rand(-70, 70), life: 0.22, max: 0.22, size: 3, col });
  }
}

function hitEntity(t, b) {
  const absorbed = Math.min(t.shield, b.dmg);
  t.shield -= absorbed;
  const rest = b.dmg - absorbed;
  t.hp -= rest;
  t.lastHit = G.now;
  G.nums.push({
    x: t.x + rand(-10, 10), y: t.y - 24, vy: -55, life: 0.8,
    text: Math.round(b.dmg), col: absorbed > 0 ? '#4fc3f7' : '#ffffff'
  });
  impactFx(b.x, b.y, '#ff8a80');
  if (t.isPlayer) {
    G.hitFlash = Math.max(G.hitFlash, 0.3);
    sfx('hurt', 0.09);
  } else {
    sfx('hit', clamp(1 - dist(t, G.player) / 900, 0, 1) * 0.05);
  }
  if (t.hp <= 0) eliminate(t, b.owner, false);
}
