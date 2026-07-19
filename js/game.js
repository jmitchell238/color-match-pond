'use strict';

/** @type {'menu'|'play'|'win'} */
let state = 'menu';

let pads = [];      // { color, x, y, r, filled }
let animals = [];   // { color, kind, x, y, homeX, homeY, r, placed, bounce }
let drag = null;    // { animal, ox, oy }
let modeId = 'easy';
let round = 0;
let roundsTarget = 0;
let sessionMatches = 0;
let winFlash = 0;
let hintTimer = 0;
let waterPhase = 0;
let wrongGlow = null; // { pad, t }

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function currentMode() {
  return MODES[modeId] || MODES.easy;
}

function layoutLevel() {
  const m = currentMode();
  const n = Math.min(COLORS.length, m.colors | 0);
  const palette = shuffle(COLORS).slice(0, n);

  // Pads in a arc / row on the pond
  pads = palette.map((color, i) => {
    const cols = n <= 3 ? n : Math.ceil(n / 2);
    const row = n <= 3 ? 0 : Math.floor(i / cols);
    const col = n <= 3 ? i : i % cols;
    const rows = n <= 3 ? 1 : 2;
    const inRow = n <= 3 ? n : (row === 0 ? cols : n - cols);
    const cellW = (W - 40) / inRow;
    const baseY = 200 + row * 110;
    return {
      color,
      x: 20 + cellW * (n <= 3 ? col : col) + cellW / 2 + (row === 1 && n % 2 ? cellW * 0.25 : 0),
      y: baseY + (row === 1 ? 0 : 0),
      r: n >= 5 ? 38 : 46,
      filled: false,
      pulse: Math.random() * Math.PI * 2,
    };
  });
  // Fix layout for 2-row properly
  if (n > 3) {
    const topN = Math.ceil(n / 2);
    const botN = n - topN;
    pads.forEach((p, i) => {
      const row = i < topN ? 0 : 1;
      const col = i < topN ? i : i - topN;
      const count = row === 0 ? topN : botN;
      const cellW = (W - 48) / count;
      p.x = 24 + cellW * col + cellW / 2;
      p.y = 190 + row * 115;
      p.r = n >= 6 ? 36 : 42;
    });
  } else {
    pads.forEach((p, i) => {
      const cellW = (W - 48) / n;
      p.x = 24 + cellW * i + cellW / 2;
      p.y = 230;
      p.r = 48;
    });
  }

  // Animals along bottom dock
  const kinds = shuffle(ANIMAL_KINDS);
  const animalColors = shuffle(palette);
  animals = animalColors.map((color, i) => {
    const cellW = (W - 40) / n;
    const x = 20 + cellW * i + cellW / 2;
    const y = H - 100;
    return {
      color,
      kind: kinds[i % kinds.length],
      x, y,
      homeX: x,
      homeY: y,
      r: 36,
      placed: false,
      bounce: 0,
      wiggle: Math.random() * Math.PI * 2,
    };
  });

  hintTimer = 0;
  wrongGlow = null;
  drag = null;
}

function enterPlay(forceMode) {
  state = 'play';
  modeId = forceMode || save.mode || 'easy';
  const m = currentMode();
  roundsTarget = m.rounds | 0;
  round = 0;
  sessionMatches = 0;
  winFlash = 0;
  clearParticles();
  layoutLevel();
}

function enterMenu() {
  state = 'menu';
  drag = null;
  clearParticles();
}

function enterWin() {
  state = 'win';
  winFlash = 1.4;
  sfxWin();
  spawnBurst(W / 2, H * 0.4, '#7DFFA0', 24);
  spawnBurst(W / 2, H * 0.4, '#FFD56A', 16);
  spawnPraise(W / 2, H * 0.3, 'Pond clear!');
  recordLevel();
}

function allPlaced() {
  return animals.length > 0 && animals.every(a => a.placed);
}

function nextRoundOrWin() {
  const m = currentMode();
  if (!m.rounds) {
    // Free play: reshuffle forever with cheer
    sfxMatch();
    spawnPraise(W / 2, 120, 'Again!');
    layoutLevel();
    return;
  }
  round++;
  if (round >= roundsTarget) {
    enterWin();
  } else {
    sfxMatch();
    spawnPraise(W / 2, 100, 'Round ' + (round + 1) + '!');
    layoutLevel();
  }
}

function hitAnimal(x, y) {
  for (let i = animals.length - 1; i >= 0; i--) {
    const a = animals[i];
    if (a.placed) continue;
    const dx = x - a.x;
    const dy = y - a.y;
    if (dx * dx + dy * dy <= (a.r * 1.2) ** 2) return a;
  }
  return null;
}

function hitPad(x, y) {
  let best = null;
  let bestD = Infinity;
  for (const p of pads) {
    if (p.filled) continue;
    const dx = x - p.x;
    const dy = y - p.y;
    const d = dx * dx + dy * dy;
    const r = p.r * 1.35;
    if (d <= r * r && d < bestD) {
      best = p;
      bestD = d;
    }
  }
  return best;
}

function startDrag(x, y) {
  if (state !== 'play') return;
  const a = hitAnimal(x, y);
  if (!a) return;
  drag = { animal: a, ox: x - a.x, oy: y - a.y };
  sfxPickup();
  a.bounce = 0.2;
  hintTimer = 0;
}

function moveDrag(x, y) {
  if (!drag) return;
  drag.animal.x = x - drag.ox;
  drag.animal.y = y - drag.oy;
}

function endDrag(x, y) {
  if (!drag) return;
  const a = drag.animal;
  const pad = hitPad(a.x, a.y);
  drag = null;

  if (pad && pad.color.id === a.color.id) {
    // Match!
    a.placed = true;
    a.x = pad.x;
    a.y = pad.y;
    pad.filled = true;
    a.bounce = 0.35;
    sfxMatch();
    spawnSplash(pad.x, pad.y, a.color.pad);
    spawnPraise(pad.x, pad.y - 50);
    recordMatch();
    sessionMatches++;
    hintTimer = 0;

    if (allPlaced()) {
      setTimeout(() => {
        if (state === 'play' && allPlaced()) nextRoundOrWin();
      }, save.reducedMotion ? 350 : 650);
    }
  } else {
    // Soft bounce home
    sfxWrong();
    if (pad) {
      wrongGlow = { pad, t: 0.5 };
      spawnPraise(pad.x, pad.y - 40, a.color.label + ' pad!');
      // highlight correct pad briefly
      const correct = pads.find(p => p.color.id === a.color.id && !p.filled);
      if (correct) wrongGlow = { pad: correct, t: 0.7, good: true };
    }
    // animate home
    a.returning = true;
    a.bounce = 0.25;
  }
}

function updatePlay(dt) {
  waterPhase += dt;
  hintTimer += dt;

  for (const a of animals) {
    if (a.bounce > 0) a.bounce = Math.max(0, a.bounce - dt);
    a.wiggle += dt * 2;
    if (a.returning) {
      const k = save.reducedMotion ? 10 : 7;
      a.x += (a.homeX - a.x) * Math.min(1, k * dt);
      a.y += (a.homeY - a.y) * Math.min(1, k * dt);
      if (Math.hypot(a.x - a.homeX, a.y - a.homeY) < 2) {
        a.x = a.homeX;
        a.y = a.homeY;
        a.returning = false;
      }
    } else if (!a.placed && (!drag || drag.animal !== a)) {
      a.y = a.homeY + Math.sin(a.wiggle) * 2;
    }
  }

  for (const p of pads) p.pulse += dt * 1.5;

  if (wrongGlow) {
    wrongGlow.t -= dt;
    if (wrongGlow.t <= 0) wrongGlow = null;
  }

  // Soft helper: glow correct pad for first unplaced animal after idle
  updateParticles(dt);
}

function updateWin(dt) {
  winFlash = Math.max(0, winFlash - dt);
  updateParticles(dt);
}

// ---- Drawing ----

function drawPondBg(ctx) {
  // Sky
  const sky = ctx.createLinearGradient(0, 0, 0, H * 0.45);
  sky.addColorStop(0, '#81D4FA');
  sky.addColorStop(1, '#B3E5FC');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Sun
  ctx.fillStyle = 'rgba(255, 241, 118, 0.9)';
  ctx.beginPath();
  ctx.arc(50, 50, 28, 0, Math.PI * 2);
  ctx.fill();

  // Water
  const water = ctx.createLinearGradient(0, H * 0.28, 0, H);
  water.addColorStop(0, '#4FC3F7');
  water.addColorStop(0.5, '#29B6F6');
  water.addColorStop(1, '#0288D1');
  ctx.fillStyle = water;
  ctx.beginPath();
  ctx.moveTo(0, H * 0.32);
  for (let x = 0; x <= W; x += 20) {
    const y = H * 0.32 + Math.sin(x * 0.04 + waterPhase) * 6;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fill();

  // Shore dock bottom
  ctx.fillStyle = '#8D6E63';
  ctx.fillRect(0, H - 48, W, 48);
  ctx.fillStyle = '#A1887F';
  for (let i = 0; i < 8; i++) {
    ctx.fillRect(i * 50 + 4, H - 48, 42, 8);
  }

  // Reeds
  ctx.strokeStyle = '#558B2F';
  ctx.lineWidth = 3;
  for (const rx of [20, 50, W - 30, W - 55]) {
    ctx.beginPath();
    ctx.moveTo(rx, H * 0.38);
    ctx.quadraticCurveTo(rx + 8, H * 0.28, rx - 4, H * 0.2);
    ctx.stroke();
  }
}

function drawPad(ctx, p) {
  const bob = Math.sin(p.pulse) * 2;
  ctx.save();
  ctx.translate(p.x, p.y + bob);

  // Glow helper
  if (wrongGlow && wrongGlow.pad === p && wrongGlow.good) {
    ctx.shadowColor = p.color.pad;
    ctx.shadowBlur = 18;
  }

  // Pad shadow
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.beginPath();
  ctx.ellipse(4, 8, p.r * 1.05, p.r * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();

  // Lily pad
  ctx.fillStyle = p.color.pad;
  ctx.beginPath();
  ctx.ellipse(0, 0, p.r, p.r * 0.72, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = p.color.padDark;
  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  ctx.ellipse(-p.r * 0.15, -p.r * 0.1, p.r * 0.55, p.r * 0.4, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Notch
  ctx.fillStyle = '#29B6F6';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, p.r * 0.95, -0.25, 0.25);
  ctx.closePath();
  ctx.fill();

  // Rim
  ctx.strokeStyle = p.color.rim;
  ctx.lineWidth = 2.5;
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.ellipse(0, 0, p.r, p.r * 0.72, 0, 0.3, Math.PI * 2 - 0.3);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Label for very young kids on unfilled pads
  if (!p.filled) {
    ctx.font = 'bold 13px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.strokeText(p.color.label, 0, 0);
    ctx.fillText(p.color.label, 0, 0);
  }

  ctx.restore();
}

function drawAnimalSprite(ctx, a) {
  const col = a.color;
  const bounce = a.bounce > 0 ? Math.sin((1 - a.bounce / 0.35) * Math.PI) * 0.15 : 0;
  const scale = 1 + bounce;
  ctx.save();
  ctx.translate(a.x, a.y);
  ctx.scale(scale, scale);

  // Shadow
  if (!a.placed) {
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.ellipse(0, a.r * 0.7, a.r * 0.7, a.r * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  if (a.kind === 'duck') {
    ctx.fillStyle = col.pad;
    ctx.beginPath();
    ctx.ellipse(0, 6, 28, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-10, -14, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FF8A65';
    ctx.beginPath();
    ctx.ellipse(-24, -12, 10, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(-14, -18, 3, 0, Math.PI * 2);
    ctx.fill();
  } else if (a.kind === 'fish') {
    ctx.fillStyle = col.pad;
    ctx.beginPath();
    ctx.ellipse(0, 0, 30, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(26, 0);
    ctx.lineTo(42, -14);
    ctx.lineTo(42, 14);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-12, -4, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(-11, -4, 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (a.kind === 'turtle') {
    ctx.fillStyle = col.padDark;
    ctx.beginPath();
    ctx.ellipse(0, 0, 28, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = col.pad;
    ctx.beginPath();
    ctx.ellipse(0, 0, 20, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = col.animal;
    ctx.beginPath();
    ctx.arc(-22, -4, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(-25, -6, 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // frog default
    ctx.fillStyle = col.pad;
    ctx.beginPath();
    ctx.ellipse(0, 8, 30, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = col.animal;
    ctx.beginPath();
    ctx.ellipse(0, 14, 18, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    // eyes
    ctx.fillStyle = col.pad;
    ctx.beginPath();
    ctx.arc(-14, -12, 11, 0, Math.PI * 2);
    ctx.arc(14, -12, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-14, -12, 7, 0, Math.PI * 2);
    ctx.arc(14, -12, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(-14, -12, 3.5, 0, Math.PI * 2);
    ctx.arc(14, -12, 3.5, 0, Math.PI * 2);
    ctx.fill();
    // smile
    ctx.strokeStyle = col.rim;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 6, 8, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  }

  ctx.restore();
}

function drawHud(ctx) {
  const m = currentMode();
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(14, 12, W - 28, 52, 14);
  else ctx.rect(14, 12, W - 28, 52);
  ctx.fill();

  ctx.font = 'bold 17px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(m.name, W / 2, 30);

  ctx.font = '13px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  if (m.rounds) {
    ctx.fillText('Round ' + (round + 1) + ' / ' + roundsTarget + ' · Matches ' + sessionMatches, W / 2, 48);
  } else {
    ctx.fillText('Drag friends to matching pads · ' + sessionMatches + ' matches', W / 2, 48);
  }
}

function drawPlay(ctx) {
  drawPondBg(ctx);
  for (const p of pads) drawPad(ctx, p);

  // Idle hint: pulse unfilled pads matching first free animal after 6s
  if (hintTimer > 6 && !drag) {
    const free = animals.find(a => !a.placed);
    if (free) {
      const pad = pads.find(p => !p.filled && p.color.id === free.color.id);
      if (pad) {
        const a = 0.25 + 0.25 * Math.sin(hintTimer * 4);
        ctx.save();
        ctx.globalAlpha = a;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(pad.x, pad.y, pad.r + 8, pad.r * 0.72 + 6, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  // Draw placed animals under drag
  for (const a of animals) {
    if (drag && drag.animal === a) continue;
    drawAnimalSprite(ctx, a);
  }
  if (drag) drawAnimalSprite(ctx, drag.animal);

  drawParticles(ctx);
  drawHud(ctx);

  ctx.font = '14px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.textAlign = 'center';
  ctx.fillText('Drag onto the matching pad', W / 2, H - 22);
}

function drawWinScene(ctx) {
  drawPondBg(ctx);
  for (const p of pads) drawPad(ctx, p);
  for (const a of animals) drawAnimalSprite(ctx, a);
  drawParticles(ctx);
  if (winFlash > 0) {
    ctx.fillStyle = 'rgba(255,255,255,' + (0.12 * Math.min(1, winFlash)) + ')';
    ctx.fillRect(0, 0, W, H);
  }
}

function drawMenuBackdrop(ctx) {
  drawPondBg(ctx);
  // Decorative pads + frogs
  const demo = COLORS.slice(0, 3);
  demo.forEach((c, i) => {
    const p = { color: c, x: 70 + i * 120, y: 250, r: 44, filled: false, pulse: i };
    drawPad(ctx, p);
    drawAnimalSprite(ctx, {
      color: c, kind: ANIMAL_KINDS[i], x: p.x, y: p.y + 4, r: 34,
      placed: true, bounce: 0, wiggle: 0,
    });
  });
  ctx.fillStyle = 'rgba(6, 30, 40, 0.4)';
  ctx.fillRect(0, 0, W, H);
}
