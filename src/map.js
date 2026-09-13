'use strict';

function genWorld() {
  G.houses = [];
  G.trees = [];
  G.rocks = [];
  G.bushes = [];
  G.patches = [];

  for (let c = 0; c < 18; c++) {
    const cx = rand(220, WORLD - 220), cy = rand(220, WORLD - 220);
    if (G.houses.some(h => Math.hypot(h.x + h.w / 2 - cx, h.y + h.h / 2 - cy) < 380)) continue;
    const big = Math.random() < 0.4;
    const w = big ? rand(190, 260) : rand(95, 150);
    const h = big ? rand(150, 210) : rand(90, 140);
    G.houses.push({ x: clamp(cx - w / 2, 50, WORLD - 50 - w), y: clamp(cy - h / 2, 50, WORLD - 50 - h), w, h, big });
  }

  for (let i = 0; i < 120; i++) {
    const x = rand(60, WORLD - 60), y = rand(60, WORLD - 60);
    if (G.houses.some(h => circleRect(x, y, 46, h.x, h.y, h.w, h.h))) continue;
    G.trees.push({ x, y, r: rand(14, 20), cr: rand(24, 38) });
  }

  for (let i = 0; i < 45; i++) {
    const x = rand(60, WORLD - 60), y = rand(60, WORLD - 60);
    if (G.houses.some(h => circleRect(x, y, 40, h.x, h.y, h.w, h.h))) continue;
    G.rocks.push({ x, y, r: rand(12, 20) });
  }

  for (let i = 0; i < 70; i++) {
    const x = rand(60, WORLD - 60), y = rand(60, WORLD - 60);
    if (G.houses.some(h => circleRect(x, y, 40, h.x, h.y, h.w, h.h))) continue;
    if (G.trees.some(t => Math.hypot(t.x - x, t.y - y) < 60)) continue;
    G.bushes.push({ x, y, r: rand(20, 30) });
  }

  for (let i = 0; i < 260; i++) {
    G.patches.push({
      x: rand(0, WORLD), y: rand(0, WORLD), r: rand(30, 90),
      c: Math.random() < 0.5 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.04)'
    });
  }
}

function collides(x, y, r) {
  if (x < r || y < r || x > WORLD - r || y > WORLD - r) return true;
  for (const h of G.houses) if (circleRect(x, y, r, h.x, h.y, h.w, h.h)) return true;
  for (const t of G.trees) {
    const d = r + t.r * 0.78, dx = x - t.x, dy = y - t.y;
    if (dx * dx + dy * dy < d * d) return true;
  }
  for (const o of G.rocks) {
    const d = r + o.r, dx = x - o.x, dy = y - o.y;
    if (dx * dx + dy * dy < d * d) return true;
  }
  if (G.builds.size) {
    const g0x = Math.floor((x - r) / CELL), g1x = Math.floor((x + r) / CELL);
    const g0y = Math.floor((y - r) / CELL), g1y = Math.floor((y + r) / CELL);
    for (let gx = g0x; gx <= g1x; gx++) {
      for (let gy = g0y; gy <= g1y; gy++) {
        if (G.builds.has(key2(gx, gy)) && circleRect(x, y, r, gx * CELL, gy * CELL, CELL, CELL)) return true;
      }
    }
  }
  return false;
}

function blocked(x, y) {
  if (x < 0 || y < 0 || x > WORLD || y > WORLD) return true;
  for (const h of G.houses) if (x > h.x && x < h.x + h.w && y > h.y && y < h.y + h.h) return true;
  for (const t of G.trees) {
    const dx = x - t.x, dy = y - t.y;
    if (dx * dx + dy * dy < t.r * t.r * 0.6) return true;
  }
  for (const o of G.rocks) {
    const dx = x - o.x, dy = y - o.y;
    if (dx * dx + dy * dy < o.r * o.r * 0.8) return true;
  }
  if (G.builds.size) {
    const gx = Math.floor(x / CELL), gy = Math.floor(y / CELL);
    if (G.builds.has(key2(gx, gy))) return true;
  }
  return false;
}

function freeSpot(minDist) {
  for (let i = 0; i < 200; i++) {
    const x = rand(80, WORLD - 80), y = rand(80, WORLD - 80);
    if (collides(x, y, 20)) continue;
    if (minDist && G.player && dist({ x, y }, G.player) < minDist) continue;
    return { x, y };
  }
  return { x: WORLD / 2, y: WORLD / 2 };
}

function inBush(e) {
  for (const b of G.bushes) {
    const dx = e.x - b.x, dy = e.y - b.y;
    if (dx * dx + dy * dy < b.r * b.r * 0.56) return true;
  }
  return false;
}

function drawGround() {
  ctx.fillStyle = '#4d9e50';
  ctx.fillRect(G.camX - 10, G.camY - 10, VW + 20, VH + 20);
  for (const p of G.patches) {
    if (p.x + p.r < G.camX || p.x - p.r > G.camX + VW || p.y + p.r < G.camY || p.y - p.r > G.camY + VH) continue;
    ctx.fillStyle = p.c;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, TAU);
    ctx.fill();
  }
}

function drawObstacles() {
  for (const h of G.houses) {
    ctx.fillStyle = '#5e3d27';
    ctx.fillRect(h.x - 5, h.y - 5, h.w + 10, h.h + 10);
    ctx.fillStyle = h.big ? '#c07b3e' : '#a8703f';
    ctx.fillRect(h.x, h.y, h.w, h.h);
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.fillRect(h.x, h.y, h.w, h.h / 2);
    ctx.strokeStyle = '#7a4a2b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(h.x + 6, h.y + h.h / 2);
    ctx.lineTo(h.x + h.w - 6, h.y + h.h / 2);
    ctx.stroke();
    ctx.strokeStyle = '#4a2f1d';
    ctx.lineWidth = 2;
    ctx.strokeRect(h.x, h.y, h.w, h.h);
    ctx.fillStyle = '#4a2f1d';
    ctx.fillRect(h.x + h.w / 2 - 8, h.y + h.h - 6, 16, 10);
  }
  for (const o of G.rocks) {
    ctx.fillStyle = '#8d949e';
    ctx.beginPath();
    ctx.arc(o.x, o.y, o.r, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#a7aeb8';
    ctx.beginPath();
    ctx.arc(o.x - o.r * 0.25, o.y - o.r * 0.25, o.r * 0.6, 0, TAU);
    ctx.fill();
  }
  for (const t of G.trees) {
    ctx.fillStyle = '#6b4a2f';
    ctx.beginPath();
    ctx.arc(t.x, t.y, 6, 0, TAU);
    ctx.fill();
  }
}

function drawCanopies() {
  for (const t of G.trees) {
    if (t.x + t.cr < G.camX || t.x - t.cr > G.camX + VW || t.y + t.cr < G.camY || t.y - t.cr > G.camY + VH) continue;
    ctx.fillStyle = 'rgba(24,90,40,0.92)';
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.cr, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(45,140,66,0.92)';
    ctx.beginPath();
    ctx.arc(t.x - t.cr * 0.2, t.y - t.cr * 0.2, t.cr * 0.65, 0, TAU);
    ctx.fill();
  }
}

function drawBushes() {
  for (const b of G.bushes) {
    if (b.x + b.r < G.camX || b.x - b.r > G.camX + VW || b.y + b.r < G.camY || b.y - b.r > G.camY + VH) continue;
    ctx.fillStyle = 'rgba(22,86,40,0.82)';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(50,130,64,0.82)';
    ctx.beginPath();
    ctx.arc(b.x - b.r * 0.2, b.y - b.r * 0.2, b.r * 0.62, 0, TAU);
    ctx.fill();
  }
}
