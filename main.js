import { createInput } from './input.js';
import { Desktop } from './desktop.js';
import { StickFigure } from './stickFigure.js';
import { resolveStickToStickCollision } from './stick_ragdoll.js';

const cursorImg = new Image();
cursorImg.src = './052dd0c023d9db3d5244875791c71c54-cursor-de-seta.webp';

const bootLogoImg = new Image();
bootLogoImg.src = './dfom9ho-0e411c0f-e367-480b-8c90-77ea71f64628.png';

/* Global error handlers: capture uncaught errors and unhandled promise rejections
   and log them to the console so they don't fail silently with "Script error." */
window.addEventListener('error', (ev) => {
  try {
    // ev.error may be undefined in some cross-origin cases; log available info
    console.error('Global error captured:', {
      message: ev.message,
      filename: ev.filename,
      lineno: ev.lineno,
      colno: ev.colno,
      error: ev.error,
    });
  } catch (_) {
    // swallow any logging errors
  }
  // Do not suppress the browser's default reporting behavior in general,
  // but attempt to prevent demo-crashing behavior where possible.
});

window.addEventListener('unhandledrejection', (ev) => {
  try {
    console.error('Unhandled promise rejection:', ev.reason);
  } catch (_) {}
});

// Canvas element for rendering the scene
const canvas = document.getElementById('scene');
const ctx = canvas.getContext('2d');

// Polyfill for roundRect on older browsers that don't support it
if (ctx && typeof ctx.roundRect !== 'function') {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    let radii = r;
    if (!Array.isArray(radii)) {
      radii = [r, r, r, r];
    } else if (radii.length === 2) {
      radii = [radii[0], radii[1], radii[0], radii[1]];
    } else if (radii.length === 3) {
      radii = [radii[0], radii[1], radii[2], radii[1]];
    }
    const [r1, r2, r3, r4] = radii.map(v => Math.max(0, Math.min(v || 0, Math.min(w, h) / 2)));

    this.beginPath();
    this.moveTo(x + r1, y);
    this.lineTo(x + w - r2, y);
    this.quadraticCurveTo(x + w, y, x + w, y + r2);
    this.lineTo(x + w, y + h - r3);
    this.quadraticCurveTo(x + w, y + h, x + w - r3, y + h);
    this.lineTo(x + r4, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - r4);
    this.lineTo(x, y + r1);
    this.quadraticCurveTo(x, y, x + r1, y);
    return this;
  };
}

let width = 0;
let height = 0;
let dpr = window.devicePixelRatio || 1;

function resize() {
  dpr = window.devicePixelRatio || 1;
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

const input = createInput(canvas);

const desktop = new Desktop();

 // Wire the hidden AOL input so typing works reliably in the chat app
const aolInputEl = document.getElementById('aolInput');
if (aolInputEl && typeof desktop.setAolInput === 'function') {
  desktop.setAolInput(aolInputEl);
}

// Wire the hidden wallpaper file input so Settings can load custom wallpapers
const wallpaperFileEl = document.getElementById('wallpaperFile');
if (wallpaperFileEl && typeof desktop.setWallpaperFileInput === 'function') {
  desktop.setWallpaperFileInput(wallpaperFileEl);
}

// Wire the hidden Paint download link so Paint can save drawings
const paintDownloadEl = document.getElementById('paintDownloadLink');
if (paintDownloadEl && typeof desktop.setPaintDownloadLink === 'function') {
  desktop.setPaintDownloadLink(paintDownloadEl);
}

 // Hit sound for stickman impacts (shared by all stickmen)
const hitSound = new Audio('./hitmarker_1.mp3');
hitSound.volume = 0.7;

 // Forward keyboard events to the desktop so apps like AOL can handle typing
window.addEventListener('keydown', (e) => {
  if (typeof desktop.handleKey === 'function') {
    desktop.handleKey(e);
  }
});

 // Forward mouse wheel scrolling to desktop so Tools can scroll
window.addEventListener('wheel', (e) => {
  if (typeof desktop.handleWheel === 'function') {
    desktop.handleWheel(e);
  }
}, { passive: false });

 // Gunshot sound for when stickmen fire the pistol (and cursor gun)
const gunShotSound = new Audio('./single-pistol-gunshot-32-101873.mp3');
gunShotSound.volume = 0.8;

// Share gunshot sound with desktop so cursor-held gun uses the same audio
desktop.gunShotSound = gunShotSound;

 // Color palette for multiple stickmen (up to 10)
const stickColors = [
  '#111111',
  '#d32f2f',
  '#1976d2',
  '#388e3c',
  '#f9a825',
  '#7b1fa2',
  '#00897b',
  '#5d4037',
  '#c2185b',
  '#455a64',
];

// Array of stickmen (start with one)
const sticks = [];
sticks.push(
  new StickFigure({
    x: width * 0.3,
    y: height * 0.6,
    hitSound,
    color: stickColors[0],
    scale: desktop.settings.stickCustomScale || 1.0,
    speedScale: desktop.settings.stickCustomSpeed || 1.0,
  })
);

 // Spawn additional stickmen with the "S" key (max 10)
 // Use both key and code so it works reliably across layouts/focus states.
 function handleSpawnKey(e) {
   // Ignore key events that originate from typed input fields so typing doesn't spawn stickmen
   try {
     const active = document.activeElement;
     if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) {
       return;
     }
   } catch (_) {
     // ignore DOM access issues
   }

   // Normalize to lowercase for robust detection across layouts
   const key = (typeof e.key === 'string' && e.key.length) ? e.key.toLowerCase() : '';
   const isSKey = key === 's' || e.code === 'KeyS';

   if (!isSKey) return;

   // Avoid repeating when key is held down
   if (e.repeat) return;

   // Disable spawning whenever an AOL chat window OR Clippy helper is open
   if (
     (typeof desktop.isAolOpen === 'function' && desktop.isAolOpen()) ||
     (typeof desktop.isClippyOpen === 'function' && desktop.isClippyOpen())
   ) {
     return;
   }

   const maxStickmen = (desktop.settings && desktop.settings.maxStickmen) || 10;
   if (sticks.length >= maxStickmen) {
     // Inform user with a tiny on-canvas popup
     if (typeof desktop.showToast === 'function') {
       desktop.showToast(`Max stickmen (${maxStickmen}) reached`, 1.6);
     } else {
       try { alert('Max stickmen (10) reached'); } catch (_) {}
     }
     return;
   }

   const index = sticks.length;
   const color = stickColors[index % stickColors.length];
   const scale = (index === 0) ? (desktop.settings.stickCustomScale || 1.0) : 1.0;
   const speedScale = (index === 0) ? (desktop.settings.stickCustomSpeed || 1.0) : 1.0;

   const spawnX = width * 0.25 + index * 40;
   const spawnY = height * 0.6;

   sticks.push(
     new StickFigure({
       x: spawnX,
       y: spawnY,
       hitSound,
       color,
       scale,
       speedScale,
     })
   );
 }

 window.addEventListener('keydown', handleSpawnKey, false);

 // Listen for spawn requests from UI (Tools -> Spawn). The Tools window dispatches
 // a 'spawnStick' CustomEvent when its Spawn slot is clicked; create a new stick there.
 window.addEventListener('spawnStick', (e) => {
   // If any AOL chat window or Clippy helper is open, ignore; same rule as keyboard spawn
   if (
     (typeof desktop.isAolOpen === 'function' && desktop.isAolOpen()) ||
     (typeof desktop.isClippyOpen === 'function' && desktop.isClippyOpen())
   ) return;
   const maxStickmen = (desktop.settings && desktop.settings.maxStickmen) || 10;
   if (sticks.length >= maxStickmen) {
     if (typeof desktop.showToast === 'function') {
       desktop.showToast(`Max stickmen (${maxStickmen}) reached`, 1.6);
     }
     return;
   }

   const index = sticks.length;
   const color = stickColors[index % stickColors.length];
   const scale = (index === 0) ? (desktop.settings.stickCustomScale || 1.0) : 1.0;
   const speedScale = (index === 0) ? (desktop.settings.stickCustomSpeed || 1.0) : 1.0;
   // Try to position at event cursor if provided, otherwise fallback to default
   const ex = e && e.detail && typeof e.detail.x === 'number' ? e.detail.x : width * 0.25 + index * 40;
   const ey = e && e.detail && typeof e.detail.y === 'number' ? e.detail.y : height * 0.6;

   sticks.push(
     new StickFigure({
       x: ex,
       y: ey,
       hitSound,
       color,
       scale,
       speedScale,
     })
   );
 });

let lastTime = performance.now();
let fpsEstimate = 0;

let isBooting = true;
let bootTimer = 0;
const BOOT_DURATION = 3.5; // seconds

function drawBootScreen(ctx, width, height, dt) {
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  // Logo
  if (bootLogoImg.complete) {
    const lw = 160;
    const lh = 160;
    ctx.drawImage(bootLogoImg, (width - lw) / 2, height * 0.32, lw, lh);
  }
  
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.font = 'bold 20px "WinXPTahoma", sans-serif';
  ctx.fillText('Microsoft', width/2 - 60, height * 0.32);
  
  ctx.font = 'bold 44px "WinXPTahoma", sans-serif';
  ctx.fillText('Windows', width/2 - 30, height * 0.58);
  ctx.font = 'italic 44px "WinXPTahoma", sans-serif';
  ctx.fillText('XP', width/2 + 105, height * 0.58);

  // Progress Bar Track
  const pbW = 160;
  const pbH = 14;
  const pbX = (width - pbW) / 2;
  const pbY = height * 0.75;
  
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 2;
  ctx.strokeRect(pbX, pbY, pbW, pbH);
  
  // Sliding blocks
  ctx.save();
  ctx.beginPath();
  ctx.rect(pbX + 2, pbY + 2, pbW - 4, pbH - 4);
  ctx.clip();
  
  const blockW = 12;
  const blockGap = 3;
  const cycleTime = 1.6;
  const t = (bootTimer % cycleTime) / cycleTime;
  const startX = pbX - (blockW * 3 + blockGap * 2) + t * (pbW + (blockW * 3 + blockGap * 2));
  
  const grad = ctx.createLinearGradient(0, pbY, 0, pbY + pbH);
  grad.addColorStop(0, '#7baef7');
  grad.addColorStop(0.5, '#3169c6');
  grad.addColorStop(1, '#083194');
  ctx.fillStyle = grad;
  
  for(let i=0; i<3; i++) {
    const bx = startX + i * (blockW + blockGap);
    ctx.beginPath();
    ctx.roundRect(bx, pbY + 3, blockW, pbH - 6, 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.fillStyle = '#aaa';
  ctx.font = '12px "WinXPTahoma", sans-serif';
  ctx.fillText('Copyright © Microsoft Corporation', width/2, height - 40);
  
  bootTimer += dt;
  if (bootTimer >= BOOT_DURATION) {
    isBooting = false;
  }
}

function loop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.03);

  if (isBooting) {
    drawBootScreen(ctx, width, height, dt);
    // update lastTime here so the next frame's dt is correct while booting
    lastTime = now;
    requestAnimationFrame(loop);
    return;
  }

  // Optional low-end mode: cap effective update rate at ~30 FPS
  const lowEnd = desktop.settings && desktop.settings.lowEndMode;
  if (lowEnd) {
    const minInterval = 1000 / 30;
    if (now - lastTime < minInterval) {
      requestAnimationFrame(loop);
      return;
    }
  }

  if (dt > 0) {
    const inst = 1 / dt;
    fpsEstimate = fpsEstimate ? fpsEstimate * 0.9 + inst * 0.1 : inst;
    desktop.fps = fpsEstimate;
  }

  desktop.update(dt, {
    width,
    height,
    input,
    stick: sticks[0] || null,
    sticks,
  });

  // Sync global stickman emote & sound toggles with desktop settings
  if (desktop.settings) {
    StickFigure.emotesEnabled = !desktop.settings.disableEmotes;
    StickFigure.muted = !!desktop.settings.muteAllSound;
  }

  sticks.forEach((stick) => {
    stick.update(dt, {
      width,
      height,
      input,
      desktop,
      sticks,
      gunShotSound,
    });
  });

  // Resolve stick-to-stick physical collisions if there are multiple
  if (sticks.length > 1) {
    for (let i = 0; i < sticks.length; i++) {
      for (let j = i + 1; j < sticks.length; j++) {
        resolveStickToStickCollision(sticks[i], sticks[j]);
      }
    }
  }

  // Remove any stickmen that have been "deleted" (dragged into Recycle Bin)
  for (let i = sticks.length - 1; i >= 0; i--) {
    if (sticks[i] && sticks[i].markedForRemoval) {
      sticks.splice(i, 1);
    }
  }

  ctx.clearRect(0, 0, width, height);
  desktop.draw(ctx, {
    width,
    height,
    input,
  });

  // Draw all stickmen who are NOT currently imprisoned inside a jail window.
  // Jailed stickmen are drawn inside their respective window loops for proper Z-ordering (bars on top, other windows above them).
  sticks.forEach((stick) => {
    if (!stick.jailedWindowId || stick.dragging) {
      stick.draw(ctx, desktop);
    }
  });

  drawCursor(ctx, input, desktop.cursorMode || 'default');

  // Clear per-frame click flags after all updates & rendering
  input.frameEnd();

  // record the last frame timestamp right before scheduling the next frame
  lastTime = now;
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

function drawCursor(ctx, input, mode = 'default') {
  if (!input.cursor.visible) return;
  const { x, y } = input.cursor;
  ctx.save();

  // Resize cursors: draw simple double-headed arrows so the user knows they can resize
  if (mode && mode.startsWith('resize')) {
    ctx.translate(x, y);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffffff';
    ctx.fillStyle = '#000000';

    const drawArrow = (dx, dy) => {
      ctx.beginPath();
      ctx.moveTo(-dx * 10, -dy * 10);
      ctx.lineTo(dx * 10, dy * 10);
      ctx.stroke();

      // Arrow heads
      ctx.beginPath();
      ctx.moveTo(dx * 10, dy * 10);
      ctx.lineTo(dx * 10 - dy * 4, dy * 10 + dx * 4);
      ctx.lineTo(dx * 10 + dy * 4, dy * 10 - dx * 4);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(-dx * 10, -dy * 10);
      ctx.lineTo(-dx * 10 - dy * 4, -dy * 10 + dx * 4);
      ctx.lineTo(-dx * 10 + dy * 4, -dy * 10 - dx * 4);
      ctx.closePath();
      ctx.fill();
    };

    if (mode === 'resize-h') {
      drawArrow(1, 0);
    } else if (mode === 'resize-v') {
      drawArrow(0, 1);
    } else if (mode === 'resize-diag1') {
      // top-left <-> bottom-right
      drawArrow(Math.SQRT1_2, Math.SQRT1_2);
    } else if (mode === 'resize-diag2') {
      // bottom-left <-> top-right
      drawArrow(Math.SQRT1_2, -Math.SQRT1_2);
    } else {
      // Fallback to default arrow
      ctx.beginPath();
      ctx.moveTo(-4, -6);
      ctx.lineTo(8, 0);
      ctx.lineTo(-4, 6);
      ctx.closePath();
      ctx.fillStyle = '#111';
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'white';
      ctx.stroke();
    }
  } else if (cursorImg.complete && cursorImg.naturalWidth > 0) {
    // Slightly larger, better-aligned XP-style cursor
    const scale = 0.05;
    const w = cursorImg.naturalWidth * scale;
    const h = cursorImg.naturalHeight * scale;
    // Offset so the tip of the cursor is the actual pointing location
    ctx.drawImage(cursorImg, x - 4, y - 4, w, h);
  } else {
    // Fallback simple cursor
    ctx.translate(x + 4, y + 4);
    ctx.beginPath();
    ctx.moveTo(-4, -6);
    ctx.lineTo(8, 0);
    ctx.lineTo(-4, 6);
    ctx.closePath();
    ctx.fillStyle = '#111';
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'white';
    ctx.stroke();
  }
  ctx.restore();
}