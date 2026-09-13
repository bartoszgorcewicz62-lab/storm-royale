'use strict';

const mini = document.createElement('canvas');
mini.width = mini.height = 170;
const mctx = mini.getContext('2d');

function slotLabel(s) {
  if (!s) return '';
  if (s.kind === 'weapon') return WEAPONS[s.type].name;
  return ITEMS[s.item].name.toUpperCase();
}

function drawHud() {
  const pl = G.player;
  ctx.textAlign = 'left';

  const s = 170 / WORLD;
  mctx.clearRect(0, 0, 170, 170);
  mctx.fillStyle = 'rgba(10,14,30,0.72)';
  mctx.fillRect(0, 0, 170, 170);
  mctx.save();
  mctx.beginPath();
  mctx.rect(0, 0, 170, 170);
  mctx.arc(G.storm.cx * s, G.storm.cy * s, G.storm.r * s, 0, TAU);
  mctx.fillStyle = 'rgba(128,60,220,0.55)';
  mctx.fill('evenodd');
  mctx.restore();
  mctx.strokeStyle = 'rgba(220,160,255,0.9)';
  mctx.lineWidth = 1.5;
  mctx.beginPath();
  mctx.arc(G.storm.cx * s, G.storm.cy * s, G.storm.r * s, 0, TAU);
  mctx.stroke();
  if (G.storm.to) {
    mctx.setLineDash([4, 3]);
    mctx.strokeStyle = '#ffffff';
    mctx.beginPath();
    mctx.arc(G.storm.to.cx * s, G.storm.to.cy * s, G.storm.to.r * s, 0, TAU);
    mctx.stroke();
    mctx.setLineDash([]);
  }
  for (const b of G.bots) {
    if (!b.alive) continue;
    const d = dist(b, pl);
    const pinged = G.now - b.lastShot < 1.5;
    if (d < 700 || (pinged && d < 1300)) {
      mctx.fillStyle = pinged ? '#ff9f43' : '#ff5252';
      mctx.beginPath();
      mctx.arc(b.x * s, b.y * s, 3, 0, TAU);
      mctx.fill();
    }
  }
  if (pl.alive) {
    mctx.fillStyle = '#ffd23f';
    mctx.beginPath();
    mctx.arc(pl.x * s, pl.y * s, 3.5, 0, TAU);
    mctx.fill();
    mctx.strokeStyle = '#fff';
    mctx.lineWidth = 1.5;
    mctx.beginPath();
    mctx.moveTo(pl.x * s, pl.y * s);
    mctx.lineTo(pl.x * s + Math.cos(pl.aim) * 8, pl.y * s + Math.sin(pl.aim) * 8);
    mctx.stroke();
  }
  ctx.drawImage(mini, VW - 190, 20);

  let fy = 205;
  ctx.textAlign = 'right';
  ctx.font = 'bold 13px "Segoe UI", Arial';
  for (const f of G.feed) {
    ctx.globalAlpha = clamp(1 - (f.t - 4.5) / 1.5, 0, 1);
    ctx.fillStyle = f.col;
    ctx.fillText(f.text, VW - 20, fy);
    fy += 18;
  }
  ctx.globalAlpha = 1;

  const alive = (pl.alive ? 1 : 0) + G.bots.filter(b => b.alive).length;
  ctx.textAlign = 'center';
  ctx.font = 'bold 20px "Segoe UI", Arial';
  ctx.fillStyle = '#fff';
  ctx.fillText('ALIVE: ' + alive, VW / 2, 34);
  ctx.font = 'bold 14px "Segoe UI", Arial';
  if (G.storm.mode === 'hold') {
    const t = Math.max(0, Math.ceil(G.storm.t));
    ctx.fillStyle = '#cdd8f5';
    ctx.fillText('STORM SHRINKS IN: 00:' + String(t).padStart(2, '0'), VW / 2, 56);
  } else if (G.storm.mode === 'shrink') {
    ctx.fillStyle = '#c98aff';
    ctx.fillText('THE STORM IS SHRINKING', VW / 2, 56);
  } else {
    ctx.fillStyle = '#c98aff';
    ctx.fillText('FINAL STORM', VW / 2, 56);
  }
  ctx.font = 'bold 13px "Segoe UI", Arial';
  ctx.fillStyle = '#ffd23f';
  ctx.fillText('KILLS: ' + pl.kills, VW / 2, 76);

  if (G.killBanner) {
    ctx.font = 'italic 900 30px "Segoe UI", Arial';
    ctx.fillStyle = '#ffd23f';
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 5;
    ctx.strokeText(G.killBanner.text, VW / 2, 130);
    ctx.fillText(G.killBanner.text, VW / 2, 130);
  }

  const bx = 24, bw = 280;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  rr(ctx, bx - 4, VH - 62, bw + 8, 54, 6);
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(bx, VH - 58, bw, 10);
  ctx.fillStyle = '#4fc3f7';
  ctx.fillRect(bx, VH - 58, bw * clamp(pl.shield / 100, 0, 1), 10);
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(bx, VH - 44, bw, 18);
  ctx.fillStyle = pl.hp > 30 ? '#4ade80' : '#ff6b6b';
  ctx.fillRect(bx, VH - 44, bw * clamp(pl.hp / 100, 0, 1), 18);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px "Segoe UI", Arial';
  ctx.textAlign = 'left';
  ctx.fillText('HP: ' + Math.max(0, Math.ceil(pl.hp)), bx + 6, VH - 30);
  ctx.fillText('SHIELD: ' + Math.ceil(pl.shield), bx + 6, VH - 50);

  ctx.fillStyle = '#8a5a3b';
  ctx.fillRect(bx, VH - 84, 14, 14);
  ctx.strokeStyle = '#5e3d27';
  ctx.lineWidth = 2;
  ctx.strokeRect(bx, VH - 84, 14, 14);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 15px "Segoe UI", Arial';
  ctx.fillText(pl.wood, bx + 22, VH - 72);
  ctx.fillStyle = '#ff9f43';
  ctx.fillText('KILLS: ' + pl.kills, bx + 100, VH - 72);

  const slotW = 148, slotH = 64, gap = 8;
  const totalW = pl.slots.length * slotW + (pl.slots.length - 1) * gap;
  const sx0 = VW - 20 - totalW, sy0 = VH - 20 - slotH;
  for (let i = 0; i < pl.slots.length; i++) {
    const x = sx0 + i * (slotW + gap);
    const slot = pl.slots[i];
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    rr(ctx, x, sy0, slotW, slotH, 6);
    ctx.fill();
    ctx.lineWidth = slot && i === pl.cur ? 3 : 1.5;
    if (slot) {
      ctx.strokeStyle = i === pl.cur ? '#ffffff'
        : slot.kind === 'weapon' ? RARITIES[slot.rarity].col
        : ITEMS[slot.item].col;
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    }
    rr(ctx, x, sy0, slotW, slotH, 6);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = 'bold 10px "Segoe UI", Arial';
    ctx.textAlign = 'left';
    ctx.fillText(String(i + 1), x + 6, sy0 + 13);
    if (slot) {
      ctx.textAlign = 'center';
      ctx.fillStyle = slot.kind === 'weapon' ? RARITIES[slot.rarity].col : ITEMS[slot.item].col;
      ctx.font = 'bold 11px "Segoe UI", Arial';
      const label = slotLabel(slot);
      ctx.fillText(label.length > 14 ? label.slice(0, 13) + '.' : label, x + slotW / 2 + 4, sy0 + 26);
      if (slot.kind === 'weapon') {
        ctx.fillStyle = AMMO_TYPES[WEAPONS[slot.type].ammo].col;
        ctx.fillText(slot.mag + ' / ' + pl.ammo[WEAPONS[slot.type].ammo], x + slotW / 2 + 4, sy0 + 44);
      } else {
        ctx.fillStyle = '#fff';
        ctx.fillText('x' + slot.count, x + slotW / 2 + 4, sy0 + 44);
      }
    }
  }

  const px = sx0, py = sy0 - 58;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  rr(ctx, px, py, 300, 50, 6);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 1.5;
  rr(ctx, px, py, 300, 50, 6);
  ctx.stroke();
  ctx.textAlign = 'left';
  const cur = pl.slots[pl.cur];
  if (cur && cur.kind === 'weapon') {
    const st = WEAPONS[cur.type];
    ctx.fillStyle = RARITIES[cur.rarity].col;
    ctx.font = 'italic 900 17px "Segoe UI", Arial';
    ctx.fillText('[ ' + st.name + ' ]', px + 12, py + 21);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px "Segoe UI", Arial';
    ctx.fillText('AMMO: ' + cur.mag + ' / ' + pl.ammo[st.ammo], px + 12, py + 41);
    ctx.fillStyle = AMMO_TYPES[st.ammo].col;
    ctx.beginPath();
    ctx.arc(px + 250, py + 36, 5, 0, TAU);
    ctx.fill();
  } else if (cur && cur.kind === 'consumable') {
    ctx.fillStyle = ITEMS[cur.item].col;
    ctx.font = 'italic 900 17px "Segoe UI", Arial';
    ctx.fillText('[ ' + ITEMS[cur.item].name.toUpperCase() + ' x' + cur.count + ' ]', px + 12, py + 21);
    ctx.fillStyle = '#cdd8f5';
    ctx.font = 'bold 13px "Segoe UI", Arial';
    ctx.fillText('PRESS ' + (pl.cur + 1) + ' TO USE', px + 12, py + 41);
  } else {
    ctx.fillStyle = '#8b97b8';
    ctx.font = 'italic 900 17px "Segoe UI", Arial';
    ctx.fillText('[ EMPTY ]', px + 12, py + 21);
  }
  if (pl.reloading) {
    const k = pl.reloading.t / pl.reloading.total;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(px + 180, py + 12, 108, 10);
    ctx.fillStyle = '#ffd23f';
    ctx.fillRect(px + 180, py + 12, 108 * k, 10);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px "Segoe UI", Arial';
    ctx.fillText('RELOADING', px + 180, py + 40);
  } else if (pl.using) {
    const k = pl.using.t / pl.using.total;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(px + 180, py + 12, 108, 10);
    ctx.fillStyle = '#4ade80';
    ctx.fillRect(px + 180, py + 12, 108 * k, 10);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px "Segoe UI", Arial';
    ctx.fillText('USING...', px + 180, py + 40);
  }

  ctx.textAlign = 'center';
  ctx.font = '12px "Segoe UI", Arial';
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillText('Q build wall - R reload - 1-5 slots/items - M sound - ESC pause', VW / 2, VH - 8);
}

function drawCrosshair() {
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(mouse.x - 9, mouse.y);
  ctx.lineTo(mouse.x - 3, mouse.y);
  ctx.moveTo(mouse.x + 3, mouse.y);
  ctx.lineTo(mouse.x + 9, mouse.y);
  ctx.moveTo(mouse.x, mouse.y - 9);
  ctx.lineTo(mouse.x, mouse.y - 3);
  ctx.moveTo(mouse.x, mouse.y + 3);
  ctx.lineTo(mouse.x, mouse.y + 9);
  ctx.stroke();
}
