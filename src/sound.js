'use strict';

let actx = null;

function initAudio() {
  if (!actx) {
    try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
  }
}

function sfx(kind, vol = 0.08) {
  if (!actx || G.muted) return;
  const t = actx.currentTime;
  const o = actx.createOscillator(), g = actx.createGain();
  o.connect(g);
  g.connect(actx.destination);
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
