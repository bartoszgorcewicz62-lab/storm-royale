'use strict';

function pickWeaponType() {
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

function pickConsumable() {
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

function spawnWorldLoot() {
  G.loot = [];
  for (let i = 0; i < 60; i++) {
    const p = freeSpot();
    G.loot.push({ x: p.x, y: p.y, kind: 'weapon', type: pickWeaponType(), rarity: pickRarity(), bob: rand(0, TAU) });
  }
  for (let i = 0; i < 25; i++) {
    const p = freeSpot();
    const types = Object.keys(AMMO_TYPES);
    G.loot.push({ x: p.x, y: p.y, kind: 'ammo', ammo: types[irand(0, types.length - 1)], bob: rand(0, TAU) });
  }
  for (let i = 0; i < 25; i++) {
    const p = freeSpot();
    G.loot.push({ x: p.x, y: p.y, kind: 'consumable', item: pickConsumable(), count: 1, bob: rand(0, TAU) });
  }
  for (let i = 0; i < 10; i++) {
    const p = freeSpot();
    G.loot.push({ x: p.x, y: p.y, kind: 'wood', amt: 60, bob: rand(0, TAU) });
  }
}

function dropLootFrom(e) {
  const scatter = () => ({ x: clamp(e.x + rand(-30, 30), 20, WORLD - 20), y: clamp(e.y + rand(-30, 30), 20, WORLD - 20) });
  let p = scatter();
  G.loot.push({ x: p.x, y: p.y, kind: 'weapon', type: e.weapon.type, rarity: e.weapon.rarity, bob: rand(0, TAU) });
  p = scatter();
  G.loot.push({ x: p.x, y: p.y, kind: 'ammo', ammo: WEAPONS[e.weapon.type].ammo, bob: rand(0, TAU) });
  if (Math.random() < 0.45) {
    p = scatter();
    G.loot.push({ x: p.x, y: p.y, kind: 'consumable', item: pickConsumable(), count: 1, bob: rand(0, TAU) });
  }
}

function updatePickups(dt) {
  const pl = G.player;
  if (!pl.alive) return;
  for (const l of G.loot) {
    if (l.taken) continue;
    if (dist(pl, l) > 30) continue;
    if (l.kind === 'weapon') {
      const sameIdx = pl.slots.findIndex(s => s && s.kind === 'weapon' && s.type === l.type);
      if (sameIdx >= 0) {
        if (l.rarity > pl.slots[sameIdx].rarity) {
          pl.slots[sameIdx] = makeWeapon(l.type, l.rarity);
          l.taken = true;
          sfx('pickup', 0.09);
        }
      } else {
        const empty = pl.slots.findIndex(s => !s);
        if (empty >= 0) {
          pl.slots[empty] = makeWeapon(l.type, l.rarity);
          l.taken = true;
          sfx('pickup', 0.09);
        }
      }
    } else if (l.kind === 'ammo') {
      pl.ammo[l.ammo] += AMMO_TYPES[l.ammo].box;
      l.taken = true;
      sfx('pickup', 0.07);
    } else if (l.kind === 'consumable') {
      const stack = pl.slots.findIndex(s => s && s.kind === 'consumable' && s.item === l.item && s.count < 10);
      if (stack >= 0) {
        pl.slots[stack].count++;
        l.taken = true;
        sfx('pickup', 0.07);
      } else {
        const empty = pl.slots.findIndex(s => !s);
        if (empty >= 0) {
          pl.slots[empty] = { kind: 'consumable', item: l.item, count: 1 };
          l.taken = true;
          sfx('pickup', 0.07);
        }
      }
    } else if (l.kind === 'wood') {
      pl.wood = Math.min(300, pl.wood + l.amt);
      l.taken = true;
      sfx('pickup', 0.07);
    }
  }
  G.loot = G.loot.filter(l => !l.taken);
}

function drawLoot() {
  for (const l of G.loot) {
    if (l.x < G.camX - 40 || l.x > G.camX + VW + 40 || l.y < G.camY - 40 || l.y > G.camY + VH + 40) continue;
    const bob = Math.sin(G.now * 3 + l.bob) * 3;
    if (l.kind === 'weapon') {
      const rc = RARITIES[l.rarity].col;
      const w = WEAPONS[l.type];
      ctx.save();
      ctx.shadowColor = rc;
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#2e3440';
      ctx.fillRect(l.x - w.len / 2, l.y - 2 + bob, w.len, w.gw);
      ctx.fillStyle = rc;
      ctx.fillRect(l.x - w.len / 2, l.y - 4 + bob, 6, 3);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = rc;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(l.x - w.len / 2 - 3, l.y - 7 + bob, w.len + 6, w.gw + 8);
      ctx.restore();
    } else if (l.kind === 'ammo') {
      const c = AMMO_TYPES[l.ammo].col;
      ctx.fillStyle = '#3a3f4a';
      ctx.fillRect(l.x - 7, l.y - 5 + bob, 14, 10);
      ctx.fillStyle = c;
      ctx.fillRect(l.x - 7, l.y - 1 + bob, 14, 3);
    } else if (l.kind === 'consumable') {
      const it = ITEMS[l.item];
      ctx.fillStyle = it.col;
      if (l.item === 'medkit' || l.item === 'bandage') {
        ctx.fillRect(l.x - 7, l.y - 7 + bob, 14, 14);
        ctx.fillStyle = '#e53935';
        ctx.fillRect(l.x - 2, l.y - 5 + bob, 4, 10);
        ctx.fillRect(l.x - 5, l.y - 2 + bob, 10, 4);
      } else {
        ctx.beginPath();
        ctx.arc(l.x, l.y + bob, 7, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#3a3f4a';
        ctx.fillRect(l.x - 2, l.y - 10 + bob, 4, 4);
      }
    } else if (l.kind === 'wood') {
      ctx.fillStyle = '#8a5a3b';
      ctx.beginPath();
      ctx.arc(l.x - 4, l.y + bob, 5, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(l.x + 4, l.y + bob, 5, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#b98a63';
      ctx.beginPath();
      ctx.arc(l.x, l.y - 4 + bob, 5, 0, TAU);
      ctx.fill();
    }
  }
}
