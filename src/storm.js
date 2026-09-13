'use strict';

function resetStorm() {
  G.storm = {
    cx: WORLD / 2, cy: WORLD / 2, r: 2300,
    phase: 0, mode: 'hold', t: PHASES[0].hold,
    from: { cx: WORLD / 2, cy: WORLD / 2, r: 2300 },
    to: null, dps: 1, acc: 0
  };
  planNext();
}

function planNext() {
  const p = PHASES[G.storm.phase];
  if (!p) {
    G.storm.to = null;
    G.storm.mode = 'done';
    return;
  }
  const maxOff = Math.max(0, G.storm.r - p.radius);
  const a = rand(0, TAU), off = rand(0, maxOff * 0.7);
  G.storm.to = {
    cx: clamp(G.storm.cx + Math.cos(a) * off, p.radius, WORLD - p.radius),
    cy: clamp(G.storm.cy + Math.sin(a) * off, p.radius, WORLD - p.radius),
    r: p.radius
  };
  G.storm.mode = 'hold';
  G.storm.t = p.hold;
  G.storm.dps = p.dps;
}

function updateStorm(dt) {
  const s = G.storm;
  if (s.mode !== 'done') {
    const p = PHASES[s.phase];
    s.t -= dt;
    if (s.mode === 'hold') {
      if (s.t <= 0) {
        s.mode = 'shrink';
        s.t = p.shrink;
        s.from = { cx: s.cx, cy: s.cy, r: s.r };
      }
    } else {
      const k = clamp(1 - Math.max(0, s.t) / p.shrink, 0, 1);
      s.cx = s.from.cx + (s.to.cx - s.from.cx) * k;
      s.cy = s.from.cy + (s.to.cy - s.from.cy) * k;
      s.r = s.from.r + (s.to.r - s.from.r) * k;
      if (s.t <= 0) {
        s.phase++;
        s.from = { cx: s.cx, cy: s.cy, r: s.r };
        if (PHASES[s.phase]) planNext();
        else { s.to = null; s.mode = 'done'; }
      }
    }
  }
  s.acc += dt;
  if (s.acc >= 0.5) {
    s.acc -= 0.5;
    const dmg = s.dps * 0.5;
    for (const e of allEnts()) {
      if (!e.alive) continue;
      if (Math.hypot(e.x - s.cx, e.y - s.cy) > s.r) {
        e.hp -= dmg;
        if (e.isPlayer) G.hitFlash = Math.max(G.hitFlash, 0.25);
        if (e.hp <= 0) eliminate(e, null, true);
      }
    }
  }
}

function drawStormOverlay() {
  const s = G.storm;
  ctx.beginPath();
  ctx.rect(G.camX - 20, G.camY - 20, VW + 40, VH + 40);
  ctx.arc(s.cx, s.cy, s.r, 0, TAU);
  ctx.fillStyle = 'rgba(128,60,220,0.4)';
  ctx.fill('evenodd');
  ctx.strokeStyle = 'rgba(220,160,255,0.95)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(s.cx, s.cy, s.r, 0, TAU);
  ctx.stroke();
}
