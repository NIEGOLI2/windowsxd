// Shared icon rendering for Tools app and cursor-dragged tools.

import { gunImg, mcImgs } from './weapon_assets.js';

// removed local gunImg & mcImgs definitions — moved to weapon_assets.js

// removed inline slot icon drawing from tools_app.js
// removed inline draggingWeapon icon drawing from desktop.js

export function drawToolSlotIcon(ctx, slotType) {
  ctx.save();

  if (slotType === 'gun') {
    if (gunImg.complete) {
      ctx.drawImage(gunImg, -20, -15, 40, 30);
    } else {
      ctx.strokeStyle = '#333';
      ctx.fillStyle = '#555';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.rect(-16, -8, 28, 8);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.rect(0, -2, 10, 14);
      ctx.fill();
      ctx.stroke();
    }
  } else if (slotType === 'knife') {
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#cccccc';
    ctx.beginPath();
    ctx.moveTo(-14, 0);
    ctx.lineTo(10, 0);
    ctx.stroke();
    ctx.strokeStyle = '#8b5a2b';
    ctx.beginPath();
    ctx.moveTo(-20, -3);
    ctx.lineTo(-14, -3);
    ctx.moveTo(-20, 3);
    ctx.lineTo(-14, 3);
    ctx.stroke();
  } else if (slotType === 'sawblade') {
    const r = 16;
    ctx.fillStyle = '#eeeeee';
    ctx.strokeStyle = '#666666';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    const teeth = 10;
    ctx.fillStyle = '#b0bec5';
    for (let i = 0; i < teeth; i++) {
      const a = (i / teeth) * Math.PI * 2;
      const inner = r - 4;
      const outer = r + 3;
      const x1 = Math.cos(a) * inner;
      const y1 = Math.sin(a) * inner;
      const x2 = Math.cos(a + 0.18) * outer;
      const y2 = Math.sin(a + 0.18) * outer;
      const x3 = Math.cos(a - 0.18) * outer;
      const y3 = Math.sin(a - 0.18) * outer;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineTo(x3, y3);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = '#90a4ae';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.35, 0, Math.PI * 2);
    ctx.fill();
  } else if (slotType === 'bomb') {
    const size = 18;
    ctx.fillStyle = '#424242';
    ctx.strokeStyle = '#212121';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 4, size * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#ffa726';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.1);
    ctx.bezierCurveTo(4, -size * 0.4, 8, -size * 0.6, 6, -size * 0.8);
    ctx.stroke();

    ctx.fillStyle = '#ffeb3b';
    ctx.beginPath();
    ctx.arc(6, -size * 0.8, 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (slotType === 'nuke') {
    const size = 22;
    // Tail fins
    ctx.fillStyle = '#263238';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-size * 0.45, size * 0.35);
    ctx.lineTo(-size * 0.15, size * 0.1);
    ctx.lineTo(-size * 0.15, size * 0.45);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(size * 0.45, size * 0.35);
    ctx.lineTo(size * 0.15, size * 0.1);
    ctx.lineTo(size * 0.15, size * 0.45);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Bomb body
    ctx.fillStyle = '#455a64';
    ctx.strokeStyle = '#1c313a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(-size * 0.35, -size * 0.25, size * 0.7, size * 0.7, 4);
    } else {
      ctx.rect(-size * 0.35, -size * 0.25, size * 0.7, size * 0.7);
    }
    ctx.fill();
    ctx.stroke();

    // Nose cone
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.9);
    ctx.lineTo(size * 0.32, -size * 0.25);
    ctx.lineTo(-size * 0.32, -size * 0.25);
    ctx.closePath();
    ctx.fillStyle = '#607d8b';
    ctx.fill();
    ctx.stroke();

    // Radiation symbol disk
    ctx.fillStyle = '#ffeb3b';
    ctx.beginPath();
    ctx.arc(0, size * 0.05, 5, 0, Math.PI * 2);
    ctx.fill();

    // Radiation trefoil
    ctx.fillStyle = '#f57f17';
    const centerY = size * 0.05;
    const rOuter = 7;
    const rInner = 2;
    for (let i = 0; i < 3; i++) {
      const baseAngle = (i * 2 * Math.PI) / 3;
      const a1 = baseAngle - Math.PI / 9;
      const a2 = baseAngle + Math.PI / 9;
      const px1 = Math.cos(a1) * rOuter;
      const py1 = centerY + Math.sin(a1) * rOuter;
      const px2 = Math.cos(a2) * rOuter;
      const py2 = centerY + Math.sin(a2) * rOuter;
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(px1, py1);
      ctx.lineTo(px2, py2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#455a64';
    ctx.beginPath();
    ctx.arc(0, centerY, rInner, 0, Math.PI * 2);
    ctx.fill();
  } else if (slotType === 'car') {
    const w = 32;
    const h = 14;
    ctx.fillStyle = '#1976d2';
    ctx.strokeStyle = '#0d47a1';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, 3);
    ctx.fill();
    ctx.stroke();
    // Roof
    ctx.fillStyle = '#bbdefb';
    ctx.beginPath();
    ctx.roundRect(-w * 0.2, -h / 2 - 4, w * 0.4, h * 0.7, 2);
    ctx.fill();
    ctx.strokeStyle = '#0d47a1';
    ctx.stroke();
    // Wheels
    ctx.fillStyle = '#212121';
    ctx.beginPath();
    ctx.arc(-w * 0.3, h / 2 + 2, 3, 0, Math.PI * 2);
    ctx.arc(w * 0.3, h / 2 + 2, 3, 0, Math.PI * 2);
    ctx.fill();
  } else if (slotType === 'trampoline') {
    const w = 56;
    const h = 14;
    ctx.fillStyle = '#ffec8b';
    ctx.strokeStyle = '#c0a030';
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(-w / 2, -h / 2, w, h, 5);
    else ctx.rect(-w / 2, -h / 2, w, h);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#ff7043';
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 6, -h / 2 + 3);
    ctx.lineTo(w / 2 - 6, -h / 2 + 3);
    ctx.moveTo(-w / 2 + 6, h / 2 - 3);
    ctx.lineTo(w / 2 - 6, h / 2 - 3);
    ctx.stroke();
  } else if (slotType === 'spike') {
    const w = 50;
    const h = 18;
    const baseY = h / 2;
    ctx.fillStyle = '#b0bec5';
    ctx.strokeStyle = '#455a64';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const spikeCount = 3;
    for (let i = 0; i < spikeCount; i++) {
      const sx = (-w / 2) + (i + 0.5) * (w / spikeCount);
      const half = (w / spikeCount) * 0.35;
      const tipX = sx;
      const tipY = -h / 2;
      const leftX = sx - half;
      const rightX = sx + half;
      ctx.moveTo(leftX, baseY);
      ctx.lineTo(tipX, tipY);
      ctx.lineTo(rightX, baseY);
      ctx.closePath();
    }
    ctx.fill();
    ctx.stroke();
  } else if (slotType === 'circle') {
    const r = 20;
    ctx.beginPath();
    ctx.fillStyle = '#ffe082';
    ctx.strokeStyle = '#f9a825';
    ctx.lineWidth = 2;
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (slotType === 'bigcircle') {
    const r = 20;
    ctx.beginPath();
    ctx.fillStyle = '#ffeb3b';
    ctx.strokeStyle = '#f57f17';
    ctx.lineWidth = 2;
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#fbc02d';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2);
    ctx.stroke();
  } else if (slotType === 'square') {
    const size = 28;
    ctx.fillStyle = '#bbdefb';
    ctx.strokeStyle = '#1976d2';
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(-size / 2, -size / 2, size, size, 5);
    else ctx.rect(-size / 2, -size / 2, size, size);
    ctx.fill();
    ctx.stroke();
  } else if (slotType === 'rectangle') {
    const w = 40;
    const h = 18;
    ctx.fillStyle = '#c8e6c9';
    ctx.strokeStyle = '#388e3c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(-w / 2, -h / 2, w, h, 4);
    else ctx.rect(-w / 2, -h / 2, w, h);
    ctx.fill();
    ctx.stroke();
  } else if (slotType === 'longrect') {
    const w = 72;
    const h = 14;
    ctx.fillStyle = '#ffe0b2';
    ctx.strokeStyle = '#fb8c00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(-w / 2, -h / 2, w, h, 4);
    else ctx.rect(-w / 2, -h / 2, w, h);
    ctx.fill();
    ctx.stroke();
  } else if (slotType === 'smallrect') {
    const w = 40;
    const h = 20;
    ctx.fillStyle = '#e0f7fa';
    ctx.strokeStyle = '#00838f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(-w / 2, -h / 2, w, h, 4);
    else ctx.rect(-w / 2, -h / 2, w, h);
    ctx.fill();
    ctx.stroke();
  } else if (slotType === 'tallrect') {
    const w = 24;
    const h = 36;
    ctx.fillStyle = '#f3e5f5';
    ctx.strokeStyle = '#6a1b9a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(-w / 2, -h / 2, w, h, 4);
    else ctx.rect(-w / 2, -h / 2, w, h);
    ctx.fill();
    ctx.stroke();
  } else if (slotType === 'platform') {
    const w = 56;
    const h = 12;
    ctx.fillStyle = '#fff9c4';
    ctx.strokeStyle = '#f9a825';
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(-w / 2, -h / 2, w, h, 4);
    else ctx.rect(-w / 2, -h / 2, w, h);
    ctx.fill();
    ctx.stroke();
  } else if (slotType === 'pillar') {
    const w = 20;
    const h = 40;
    ctx.fillStyle = '#d7ccc8';
    ctx.strokeStyle = '#5d4037';
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(-w / 2, -h / 2, w, h, 4);
    else ctx.rect(-w / 2, -h / 2, w, h);
    ctx.fill();
    ctx.stroke();
  } else if (slotType === 'triangle') {
    const w = 40;
    const h = 26;
    ctx.fillStyle = '#ffccbc';
    ctx.strokeStyle = '#ff7043';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -h / 2);
    ctx.lineTo(w / 2, h / 2);
    ctx.lineTo(-w / 2, h / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (slotType === 'bigtriangle') {
    const w = 44;
    const h = 30;
    ctx.fillStyle = '#ffab91';
    ctx.strokeStyle = '#e64a19';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -h / 2);
    ctx.lineTo(w / 2, h / 2);
    ctx.lineTo(-w / 2, h / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#ffccbc';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -h / 2 + 3);
    ctx.lineTo(w / 2 - 3, h / 2 - 3);
    ctx.lineTo(-w / 2 + 3, h / 2 - 3);
    ctx.closePath();
    ctx.stroke();
  } else if (slotType === 'hexagon') {
    const w = 40;
    const h = 24;
    const rx = w / 2;
    const ry = h / 2;
    ctx.fillStyle = '#ffe0b2';
    ctx.strokeStyle = '#fb8c00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const px = Math.cos(angle) * rx;
      const py = Math.sin(angle) * ry;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (slotType === 'diamond') {
    const w = 30;
    const h = 30;
    ctx.fillStyle = '#e1bee7';
    ctx.strokeStyle = '#8e24aa';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -h / 2);
    ctx.lineTo(w / 2, 0);
    ctx.lineTo(0, h / 2);
    ctx.lineTo(-w / 2, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (slotType === 'bouncyball') {
    const r = 18;
    ctx.beginPath();
    ctx.fillStyle = '#66bb6a';
    ctx.strokeStyle = '#2e7d32';
    ctx.lineWidth = 2;
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.arc(-6, -6, 5, 0, Math.PI * 2);
    ctx.fill();
  } else if (slotType === 'firework') {
    const w = 10;
    const h = 30;
    ctx.fillStyle = '#ff7043';
    ctx.strokeStyle = '#bf360c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2 + 4, w, h - 8, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffcc80';
    ctx.beginPath();
    ctx.moveTo(0, -h / 2 - 6);
    ctx.lineTo(w / 2 + 3, -h / 2 + 4);
    ctx.lineTo(-w / 2 - 3, -h / 2 + 4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#795548';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(0, h / 2 + 8);
    ctx.stroke();
  } else if (slotType === 'magnet') {
    const w = 28;
    const h = 24;
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#c62828';
    ctx.beginPath();
    ctx.moveTo(-w / 2, h / 2);
    ctx.lineTo(-w / 2, 0);
    ctx.arc(0, 0, w / 2, Math.PI, 0, false);
    ctx.lineTo(w / 2, h / 2);
    ctx.stroke();
    ctx.strokeStyle = '#b0bec5';
    ctx.beginPath();
    ctx.moveTo(-w / 2, h / 2);
    ctx.lineTo(-w / 2, h / 2 - 6);
    ctx.moveTo(w / 2, h / 2);
    ctx.lineTo(w / 2, h / 2 - 6);
    ctx.stroke();
  } else if (slotType === 'screw') {
    ctx.fillStyle = '#9e9e9e';
    ctx.strokeStyle = '#424242';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, -6, 8, 0, Math.PI * 2); // Head
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-4, -6); ctx.lineTo(4, -6); // Slot
    ctx.stroke();
    ctx.beginPath();
    ctx.rect(-3, 2, 6, 12); // Shaft
    ctx.fill();
    ctx.stroke();
    // Threads
    for(let i=4; i<12; i+=3) {
      ctx.beginPath();
      ctx.moveTo(-3, i); ctx.lineTo(3, i+1);
      ctx.stroke();
    }
  } else if (slotType === 'ramp') {
    const w = 40, h = 24;
    ctx.fillStyle = '#cfd8dc';
    ctx.strokeStyle = '#607d8b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-w/2, h/2);
    ctx.lineTo(w/2, h/2);
    ctx.lineTo(w/2, -h/2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (slotType === 'portal') {
    const w = 34;
    const h = 44;
    ctx.fillStyle = '#424242';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(-w / 2, -h / 2, w, h, 6);
    else ctx.rect(-w / 2, -h / 2, w, h);
    ctx.fill();
    ctx.stroke();

    const innerR = Math.min(w, h) * 0.28;
    ctx.lineWidth = 2;
    const ringColors = ['#00e5ff', '#00bcd4'];
    ringColors.forEach((color, i) => {
      const r = innerR - i * 3;
      ctx.strokeStyle = color;
      ctx.beginPath();
      for (let a = 0; a <= Math.PI * 2; a += Math.PI / 24) {
        const wobble = Math.sin(a * 3) * 1.2;
        const px = Math.cos(a) * (r + wobble);
        const py = Math.sin(a) * (r + wobble);
        if (a === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    });
  } else if (slotType === 'house') {
    const w = 40;
    const h = 36;
    const baseH = h * 0.55;
    const roofH = h - baseH;
    ctx.fillStyle = '#ffe0b2';
    ctx.strokeStyle = '#bf8040';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2 + roofH, w, baseH, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ef9a9a';
    ctx.strokeStyle = '#b71c1c';
    ctx.beginPath();
    ctx.moveTo(0, -h / 2);
    ctx.lineTo(w / 2 + 2, -h / 2 + roofH);
    ctx.lineTo(-w / 2 - 2, -h / 2 + roofH);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (slotType === 'weight10') {
    const w = 40;
    const h = 26;
    ctx.fillStyle = '#424242';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(-w / 2, -h / 2, w, h, 3);
    else ctx.rect(-w / 2, -h / 2, w, h);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fafafa';
    ctx.font = 'bold 11px "Tahoma", system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('10 t', 0, 1);
  } else if (slotType.startsWith('mc_')) {
    const img = mcImgs[slotType];
    if (img && img.complete) {
      ctx.drawImage(img, -15, -15, 30, 30);
    } else {
      ctx.fillStyle = '#888';
      ctx.fillRect(-15, -15, 30, 30);
    }
  } else if (slotType === 'spawn') {
    ctx.fillStyle = '#444';
    ctx.beginPath();
    ctx.arc(0, -12, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-8, -2);
    ctx.lineTo(0, 10);
    ctx.lineTo(8, -2);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

// Draw the representation of a weapon/shape being dragged by the cursor.
export function drawDragWeaponIcon(ctx, type) {
  ctx.save();

  if (type === 'gun') {
    if (gunImg.complete) {
      ctx.drawImage(gunImg, -20, -15, 40, 30);
    } else {
      ctx.strokeStyle = '#333';
      ctx.fillStyle = '#555';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.rect(-14, -6, 24, 6);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.rect(0, -1, 8, 10);
      ctx.fill();
      ctx.stroke();
    }
  } else if (type === 'knife') {
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#cccccc';
    ctx.beginPath();
    ctx.moveTo(-14, 0);
    ctx.lineTo(10, 0);
    ctx.stroke();
    ctx.strokeStyle = '#8b5a2b';
    ctx.beginPath();
    ctx.moveTo(-20, -3);
    ctx.lineTo(-14, -3);
    ctx.moveTo(-20, 3);
    ctx.lineTo(-14, 3);
    ctx.stroke();
  } else if (type === 'trampoline') {
    const w = 140;
    const h = 18;
    ctx.fillStyle = '#ffec8b';
    ctx.strokeStyle = '#c0a030';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, 6);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#ff7043';
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 8, -h / 2 + 4);
    ctx.lineTo(w / 2 - 8, -h / 2 + 4);
    ctx.moveTo(-w / 2 + 8, h / 2 - 4);
    ctx.lineTo(w / 2 - 8, h / 2 - 4);
    ctx.stroke();
  } else if (type === 'bomb') {
    const size = 30;
    ctx.fillStyle = '#424242';
    ctx.strokeStyle = '#212121';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#ffa726';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.4);
    ctx.bezierCurveTo(
      6,
      -size * 0.8,
      14,
      -size,
      10,
      -size * 1.1
    );
    ctx.stroke();

    ctx.fillStyle = '#ffeb3b';
    ctx.beginPath();
    ctx.arc(10, -size * 1.1, 3, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === 'nuke') {
    const size = 52;

    // Tail fins
    ctx.fillStyle = '#263238';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-size * 0.45, size * 0.35);
    ctx.lineTo(-size * 0.18, size * 0.05);
    ctx.lineTo(-size * 0.18, size * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(size * 0.45, size * 0.35);
    ctx.lineTo(size * 0.18, size * 0.05);
    ctx.lineTo(size * 0.18, size * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Bomb body
    ctx.fillStyle = '#455a64';
    ctx.strokeStyle = '#1c313a';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.roundRect(-size * 0.38, -size * 0.22, size * 0.76, size * 0.78, 6);
    ctx.fill();
    ctx.stroke();

    // Nose cone
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.95);
    ctx.lineTo(size * 0.35, -size * 0.25);
    ctx.lineTo(-size * 0.35, -size * 0.25);
    ctx.closePath();
    ctx.fillStyle = '#607d8b';
    ctx.fill();
    ctx.stroke();

    // Radiation symbol disk
    const diskY = size * 0.0;
    ctx.fillStyle = '#ffeb3b';
    ctx.beginPath();
    ctx.arc(0, diskY, 8, 0, Math.PI * 2);
    ctx.fill();

    // Radiation trefoil
    ctx.fillStyle = '#f57f17';
    const rOuter = 13;
    const rInner = 3;
    for (let i = 0; i < 3; i++) {
      const baseAngle = (i * 2 * Math.PI) / 3;
      const a1 = baseAngle - Math.PI / 9;
      const a2 = baseAngle + Math.PI / 9;
      const px1 = Math.cos(a1) * rOuter;
      const py1 = diskY + Math.sin(a1) * rOuter;
      const px2 = Math.cos(a2) * rOuter;
      const py2 = diskY + Math.sin(a2) * rOuter;
      ctx.beginPath();
      ctx.moveTo(0, diskY);
      ctx.lineTo(px1, py1);
      ctx.lineTo(px2, py2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#455a64';
    ctx.beginPath();
    ctx.arc(0, diskY, rInner, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === 'car') {
    const w = 90;
    const h = 30;
    ctx.fillStyle = '#1976d2';
    ctx.strokeStyle = '#0d47a1';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, 6);
    ctx.fill();
    ctx.stroke();

    // Roof
    ctx.fillStyle = '#bbdefb';
    ctx.beginPath();
    ctx.roundRect(-w * 0.25, -h / 2 - 10, w * 0.5, h * 0.8, 4);
    ctx.fill();
    ctx.strokeStyle = '#0d47a1';
    ctx.stroke();

    // Windows separator
    ctx.strokeStyle = '#90caf9';
    ctx.beginPath();
    ctx.moveTo(0, -h / 2 - 10);
    ctx.lineTo(0, -h / 2 + 8);
    ctx.stroke();

    // Wheels
    ctx.fillStyle = '#212121';
    ctx.beginPath();
    ctx.arc(-w * 0.28, h / 2 + 4, 6, 0, Math.PI * 2);
    ctx.arc(w * 0.28, h / 2 + 4, 6, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === 'spike') {
    const w = 70;
    const h = 30;
    const baseY = h / 2;
    ctx.fillStyle = '#b0bec5';
    ctx.strokeStyle = '#455a64';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const spikeCount = 3;
    for (let i = 0; i < spikeCount; i++) {
      const sx = (-w / 2) + (i + 0.5) * (w / spikeCount);
      const half = (w / spikeCount) * 0.4;
      const tipX = sx;
      const tipY = -h / 2;
      const leftX = sx - half;
      const rightX = sx + half;
      ctx.moveTo(leftX, baseY);
      ctx.lineTo(tipX, tipY);
      ctx.lineTo(rightX, baseY);
      ctx.closePath();
    }
    ctx.fill();
    ctx.stroke();
  } else if (type === 'circle' || type === 'bigcircle') {
    const radius = type === 'bigcircle' ? 70 * 0.6 : 40;
    ctx.beginPath();
    ctx.fillStyle = type === 'bigcircle' ? '#ffeb3b' : '#ffe082';
    ctx.strokeStyle = type === 'bigcircle' ? '#f57f17' : '#f9a825';
    ctx.lineWidth = 2;
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (type === 'bigcircle') {
      ctx.strokeStyle = '#fbc02d';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.7, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (type === 'square') {
    const size = 70;
    ctx.fillStyle = '#bbdefb';
    ctx.strokeStyle = '#1976d2';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-size / 2, -size / 2, size, size, 6);
    ctx.fill();
    ctx.stroke();
  } else if (type === 'rectangle') {
    const w = 120;
    const h = 40;
    ctx.fillStyle = '#c8e6c9';
    ctx.strokeStyle = '#388e3c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, 6);
    ctx.fill();
    ctx.stroke();
  } else if (type === 'longrect') {
    const w = 180;
    const h = 32;
    ctx.fillStyle = '#ffe0b2';
    ctx.strokeStyle = '#fb8c00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, 6);
    ctx.fill();
    ctx.stroke();
  } else if (type === 'smallrect') {
    const w = 60;
    const h = 24;
    ctx.fillStyle = '#e0f7fa';
    ctx.strokeStyle = '#00838f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, 6);
    ctx.fill();
    ctx.stroke();
  } else if (type === 'tallrect') {
    const w = 32;
    const h = 80;
    ctx.fillStyle = '#f3e5f5';
    ctx.strokeStyle = '#6a1b9a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, 6);
    ctx.fill();
    ctx.stroke();
  } else if (type === 'platform') {
    const w = 140;
    const h = 20;
    ctx.fillStyle = '#fff9c4';
    ctx.strokeStyle = '#f9a825';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, 6);
    ctx.fill();
    ctx.stroke();
  } else if (type === 'pillar') {
    const w = 26;
    const h = 70;
    ctx.fillStyle = '#d7ccc8';
    ctx.strokeStyle = '#5d4037';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, 6);
    ctx.fill();
    ctx.stroke();
  } else if (type === 'triangle' || type === 'bigtriangle') {
    const w = type === 'bigtriangle' ? 130 : 90;
    const h = type === 'bigtriangle' ? 80 : 60;
    ctx.fillStyle = type === 'bigtriangle' ? '#ffab91' : '#ffccbc';
    ctx.strokeStyle = type === 'bigtriangle' ? '#e64a19' : '#ff7043';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -h / 2);
    ctx.lineTo(w / 2, h / 2);
    ctx.lineTo(-w / 2, h / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    if (type === 'bigtriangle') {
      ctx.strokeStyle = '#ffccbc';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, -h / 2 + 4);
      ctx.lineTo(w / 2 - 8, h / 2 - 6);
      ctx.lineTo(-w / 2 + 8, h / 2 - 6);
      ctx.closePath();
      ctx.stroke();
    }
  } else if (type === 'hexagon') {
    const w = 90;
    const h = 52;
    const rx = w / 2;
    const ry = h / 2;
    ctx.fillStyle = '#ffe0b2';
    ctx.strokeStyle = '#fb8c00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const px = Math.cos(angle) * rx;
      const py = Math.sin(angle) * ry;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (type === 'diamond') {
    const w = 70;
    const h = 70;
    ctx.fillStyle = '#e1bee7';
    ctx.strokeStyle = '#8e24aa';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -h / 2);
    ctx.lineTo(w / 2, 0);
    ctx.lineTo(0, h / 2);
    ctx.lineTo(-w / 2, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (type === 'bouncyball') {
    const r = 22;
    ctx.beginPath();
    ctx.fillStyle = '#66bb6a';
    ctx.strokeStyle = '#2e7d32';
    ctx.lineWidth = 2;
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.arc(-6, -6, 5, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === 'screw') {
    ctx.fillStyle = '#9e9e9e';
    ctx.strokeStyle = '#424242';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-5, 0); ctx.lineTo(5, 0);
    ctx.stroke();
  } else if (type === 'ramp') {
    const w = 120, h = 50;
    ctx.fillStyle = '#cfd8dc';
    ctx.strokeStyle = '#607d8b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-w/2, h/2);
    ctx.lineTo(w/2, h/2);
    ctx.lineTo(w/2, -h/2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (type === 'firework') {
    const w = 18;
    const h = 40;
    ctx.fillStyle = '#ff7043';
    ctx.strokeStyle = '#bf360c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2 + 6, w, h - 12, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffcc80';
    ctx.beginPath();
    ctx.moveTo(0, -h / 2 - 6);
    ctx.lineTo(w / 2 + 4, -h / 2 + 6);
    ctx.lineTo(-w / 2 - 4, -h / 2 + 6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#795548';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, h / 2 - 4);
    ctx.lineTo(0, h / 2 + 6);
    ctx.stroke();
  } else if (type.startsWith('mc_')) {
    const img = mcImgs[type];
    const sz = 32;
    if (img && img.complete) {
      ctx.drawImage(img, -sz / 2, -sz / 2, sz, sz);
    } else {
      ctx.fillStyle = '#888';
      ctx.fillRect(-sz / 2, -sz / 2, sz, sz);
    }
  } else if (type === 'magnet') {
    const w = 60;
    const h = 40;
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#c62828';
    ctx.beginPath();
    ctx.moveTo(-w / 2, h / 2);
    ctx.lineTo(-w / 2, -h / 4);
    ctx.arc(0, -h / 4, w / 2, Math.PI, 0, false);
    ctx.lineTo(w / 2, h / 2);
    ctx.stroke();
    ctx.strokeStyle = '#b0bec5';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-w / 2, h / 2);
    ctx.lineTo(-w / 2, h / 2 - 10);
    ctx.moveTo(w / 2, h / 2);
    ctx.lineTo(w / 2, h / 2 - 10);
    ctx.stroke();
  }

  ctx.restore();
}