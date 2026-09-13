'use strict';

function makeBot(i) {
  const p = freeSpot(450);
  const outfit = OUTFITS[i % OUTFITS.length];
  return {
    x: p.x, y: p.y, r: 14, hp: 100, shield: [0, 0, 25, 50][irand(0, 3)], alive: true, isPlayer: false,
    name: BOT_NAMES[i % BOT_NAMES.length], color: outfit,
    skin: { outfit, dark: shade(outfit, -35), skin: SKIN_TONES[irand(0, SKIN_TONES.length - 1)], hair: HAIR_COLORS[irand(0, HAIR_COLORS.length - 1)] },
    aim: rand(0, TAU), fireCd: rand(0, 0.5), kills: 0, lastHit: -99, lastShot: -99, walk: 0, moving: false,
    weapon: { kind: 'weapon', type: pickWeaponType(), rarity: pickRarity(), mag: 999 },
    goal: null, goalT: 0, target: null, scanT: rand(0, 0.25),
    strafeT: 0, strafeSign: 1, coverPoint: null, coverT: 0,
    unstickT: 0, unstickA: 0
  };
}

function losClear(a, b) {
  const d = Math.hypot(b.x - a.x, b.y - a.y);
  const steps = Math.ceil(d / 26);
  for (let i = 1; i < steps; i++) {
    const x = a.x + (b.x - a.x) * i / steps, y = a.y + (b.y - a.y) * i / steps;
    if (blocked(x, y)) return false;
  }
  return true;
}

function findEnemy(b) {
  let best = null, bd = 470;
  const cands = [];
  if (G.player.alive) cands.push(G.player);
  for (const o of G.bots) if (o !== b && o.alive) cands.push(o);
  for (const c of cands) {
    const d = dist(b, c);
    if (c.isPlayer && inBush(c) && d > 140) continue;
    if (d < bd && losClear(b, c)) {
      bd = d;
      best = c;
    }
  }
  return best;
}

function coverPoint(b, threat) {
  let best = null, bd = Infinity;
  const check = (ox, oy, or) => {
    const dToObs = Math.hypot(ox - b.x, oy - b.y);
    if (dToObs > 280 || dToObs < or + 12) return;
    const a = Math.atan2(oy - threat.y, ox - threat.x);
    const px = ox + Math.cos(a) * (or + 16), py = oy + Math.sin(a) * (or + 16);
    if (collides(px, py, 14)) return;
    const score = Math.hypot(px - b.x, py - b.y);
    if (score < bd) {
      bd = score;
      best = { x: px, y: py };
    }
  };
  for (const t of G.trees) check(t.x, t.y, t.r);
  for (const o of G.rocks) check(o.x, o.y, o.r);
  return best;
}

function moveBot(b, dx, dy) {
  let moved = false;
  if (dx) {
    b.x += dx;
    if (collides(b.x, b.y, b.r)) b.x -= dx; else moved = true;
  }
  if (dy) {
    b.y += dy;
    if (collides(b.x, b.y, b.r)) b.y -= dy; else moved = true;
  }
  return moved;
}

function updateBot(b, dt) {
  b.fireCd -= dt;
  b.scanT -= dt;
  b.strafeT -= dt;
  b.coverT -= dt;
  b.moving = false;

  if (b.unstickT > 0) {
    b.unstickT -= dt;
    moveBot(b, Math.cos(b.unstickA) * 230 * dt, Math.sin(b.unstickA) * 230 * dt);
    b.moving = true;
    b.walk += dt * 10;
    b.aim = b.unstickA;
    return;
  }

  if (b.scanT <= 0) {
    b.scanT = 0.22;
    b.target = findEnemy(b);
  }

  const stormD = Math.hypot(b.x - G.storm.cx, b.y - G.storm.cy);
  const inDanger = stormD > G.storm.r - 90;
  if (inDanger) {
    const a = Math.atan2(G.storm.cy - b.y, G.storm.cx - b.x);
    b.goal = { x: b.x + Math.cos(a) * 400, y: b.y + Math.sin(a) * 400 };
    b.goalT = 1;
  }

  if (b.target && b.target.alive) {
    const t = b.target, d = dist(b, t);
    const st = WEAPONS[b.weapon.type];
    const pa = Math.atan2(t.y - b.y, t.x - b.x);
    b.aim = pa + (Math.random() - 0.5) * 0.12;

    const hurt = G.now - b.lastHit < 3 || b.hp < 45;
    if (hurt && b.coverT <= 0) {
      b.coverPoint = coverPoint(b, t);
      b.coverT = 1.5;
    }
    if (!hurt) b.coverPoint = null;

    let mx = 0, my = 0;
    if (hurt && b.coverPoint) {
      const ca = Math.atan2(b.coverPoint.y - b.y, b.coverPoint.x - b.x);
      mx = Math.cos(ca);
      my = Math.sin(ca);
    } else {
      if (b.strafeT <= 0) {
        b.strafeT = rand(0.8, 1.8);
        b.strafeSign = Math.random() < 0.5 ? -1 : 1;
      }
      const desired = st.range * 0.5;
      if (d > desired + 60) { mx += Math.cos(pa); my += Math.sin(pa); }
      else if (d < desired - 80) { mx -= Math.cos(pa); my -= Math.sin(pa); }
      mx += Math.cos(pa + Math.PI / 2) * b.strafeSign * 0.8;
      my += Math.sin(pa + Math.PI / 2) * b.strafeSign * 0.8;
    }
    const ml = Math.hypot(mx, my) || 1;
    const moved = moveBot(b, mx / ml * 230 * dt, my / ml * 230 * dt);
    if (!moved) {
      b.unstickT = 0.4;
      b.unstickA = pa + (Math.random() < 0.5 ? 1 : -1) * Math.PI / 2;
      b.coverPoint = null;
    } else {
      b.moving = true;
      b.walk += dt * 10;
    }
    if (d < st.range * 0.9 && b.fireCd <= 0 && losClear(b, t)) tryFire(b);
  } else {
    b.goalT -= dt;
    if (!inDanger && (!b.goal || b.goalT <= 0 || dist(b, b.goal) < 30)) {
      let gx, gy;
      if (G.player.alive && Math.random() < 0.35) {
        gx = clamp(G.player.x + rand(-500, 500), 40, WORLD - 40);
        gy = clamp(G.player.y + rand(-500, 500), 40, WORLD - 40);
      } else {
        const a = rand(0, TAU), rrad = rand(0, G.storm.r * 0.8);
        gx = clamp(G.storm.cx + Math.cos(a) * rrad, 40, WORLD - 40);
        gy = clamp(G.storm.cy + Math.sin(a) * rrad, 40, WORLD - 40);
      }
      b.goal = { x: gx, y: gy };
      b.goalT = rand(3, 6);
    }
    if (b.goal) {
      const a = Math.atan2(b.goal.y - b.y, b.goal.x - b.x);
      b.aim = a;
      const moved = moveBot(b, Math.cos(a) * 210 * dt, Math.sin(a) * 210 * dt);
      if (!moved) {
        b.unstickT = 0.5;
        b.unstickA = a + (Math.random() < 0.5 ? 1 : -1) * Math.PI / 2;
        b.goal = null;
      } else {
        b.moving = true;
        b.walk += dt * 10;
      }
    }
  }
}
