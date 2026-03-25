/*
desktop_ui.js

This module now houses shared UI & rendering helpers that used to live in desktop.js.
We keep tombstone comments in desktop.js to mark where code was removed.
*/

import { ICON_SIZE, TASKBAR_HEIGHT } from './constants.js';

const startButtonImg = new Image();
startButtonImg.src = './start.png';

export function drawIcon(ctx, icon, scale = 1.0) {
  const size = ICON_SIZE * scale;
  ctx.save();
  ctx.translate(icon.x, icon.y);

  const labelX = size / 2;
  const labelY = size + 4;
  const maxWidth = size + 40; // Increased width for wrapping
  
  ctx.font = '15px "WinXPTahoma", system-ui';
  const text = icon.name || '';
  
  // Wrap text logic for multi-line labels
  const words = text.split(' ');
  const lines = [];
  let currentLine = words[0];
  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = ctx.measureText(currentLine + " " + word).width;
    if (width < maxWidth) {
      currentLine += " " + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);

  if (icon._hover) {
    const padX = 12 * scale;
    const padY = 4 * scale;
    const boxW = size + padX * 2;
    const boxH = size + 10 + (lines.length * 14);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect((size - boxW) / 2, -padY, boxW, boxH, 4);
    } else {
      ctx.rect((size - boxW) / 2, -padY, boxW, boxH);
    }
    ctx.fill();
  }

  if (icon.img && icon.img.complete && icon.img.naturalWidth > 0) {
    const iw = icon.img.naturalWidth;
    const ih = icon.img.naturalHeight;
    const aspect = iw / ih;
    let dw, dh;
    
    if (aspect > 1) {
      dw = size;
      dh = size / aspect;
    } else {
      dh = size;
      dw = size * aspect;
    }

    // If it's the customization app, make it even a bit smaller to avoid visual crowding
    if (icon.appId === 'stickcustomize') {
      dw *= 0.85;
      dh *= 0.85;
    }

    ctx.drawImage(icon.img, (size - dw) / 2, (size - dh) / 2, dw, dh);
  }

  ctx.fillStyle = 'white';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  lines.forEach((line, i) => {
    const ly = labelY + i * 14;
    ctx.strokeStyle = 'rgba(0,0,0,0.85)';
    ctx.lineWidth = 2.5;
    ctx.strokeText(line, labelX, ly);
    ctx.fillText(line, labelX, ly);
  });

  ctx.restore();
}

export function drawTaskbar(ctx, { width, height, windows, activeWindowId, settings, taskbarHoverWindow }) {
  const y = height - TASKBAR_HEIGHT;
  ctx.save();
  ctx.translate(0, y);

  const darkTaskbar = !!(settings && settings.darkTaskbar);

  const grad = ctx.createLinearGradient(0, 0, 0, TASKBAR_HEIGHT);
  if (darkTaskbar) {
    grad.addColorStop(0, '#1f1f1f');
    grad.addColorStop(1, '#101010');
  } else {
    grad.addColorStop(0, '#0059ad');
    grad.addColorStop(1, '#004E98');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, TASKBAR_HEIGHT);

  ctx.strokeStyle = '#00386c';
  ctx.beginPath();
  ctx.moveTo(0, 0.5);
  ctx.lineTo(width, 0.5);
  ctx.stroke();

  const startX = 6;
  const startY = 4;
  const startHeight = TASKBAR_HEIGHT - 8;
  let startWidth = 80;

  if (startButtonImg.complete && startButtonImg.naturalWidth > 0) {
    const aspect = startButtonImg.naturalWidth / startButtonImg.naturalHeight;
    startWidth = Math.min(120, startHeight * aspect);
    ctx.drawImage(startButtonImg, startX, startY, startWidth, startHeight);
  } else {
    ctx.fillStyle = '#2b8a3e';
    ctx.beginPath();
    ctx.roundRect(startX, startY, startWidth, startHeight, 4);
    ctx.fill();
  }

  const btnHeight = TASKBAR_HEIGHT - 8;
  const startXForButtons = startX + startWidth + 8;
  let x = startXForButtons;

  windows.forEach(win => {
    if (win.closed) return;
    
    ctx.font = '15px "WinXPTahoma", system-ui';
    const textWidth = ctx.measureText(win.title || '').width;
    const w = Math.max(80, Math.min(180, textWidth + 28)); // Increased max width significantly
    const isHovered = taskbarHoverWindow && taskbarHoverWindow.id === win.id;
    const isActive = win.id === activeWindowId;

    if (darkTaskbar) {
      ctx.fillStyle = isHovered ? '#444' : (isActive ? '#333' : '#2a2a2a');
    } else {
      ctx.fillStyle = isHovered ? '#ffffff' : (isActive ? '#fcfcfc' : '#e6e6e6');
    }
    
    ctx.beginPath();
    ctx.roundRect(x, 4, w, btnHeight, 3);
    ctx.fill();
    ctx.strokeStyle = darkTaskbar ? '#555' : '#b0b0b0';
    ctx.stroke();

    ctx.fillStyle = darkTaskbar ? '#f0f0f0' : '#000';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    
    let label = win.title || '';
    const maxTextWidth = w - 16;
    
    // Only truncate if it absolutely exceeds the increased max button width
    if (ctx.measureText(label).width > maxTextWidth) {
      let base = label;
      while (base.length > 0 && ctx.measureText(base + '…').width > maxTextWidth) {
        base = base.slice(0, -1);
      }
      label = base + '…';
    }
    
    ctx.fillText(label, x + 10, TASKBAR_HEIGHT / 2 + 1);
    x += w + 4;
  });

  const clockWidth = 72;
  const fullBtnSize = 28;
  const padding = 6;
  const clockX = width - fullBtnSize - padding - clockWidth - padding;
  const clockY = 6;
  ctx.fillStyle = darkTaskbar ? '#303030' : '#e6e6e6';
  ctx.beginPath();
  ctx.roundRect(clockX, clockY, clockWidth, TASKBAR_HEIGHT - 12, 3);
  ctx.fill();
  ctx.strokeStyle = darkTaskbar ? '#555' : '#c0c0c0';
  ctx.stroke();

  const now = new Date();
  const hours = now.getHours();
  const h12 = ((hours + 11) % 12) + 1;
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const timeStr = `${h12}:${minutes} ${ampm}`;

  ctx.fillStyle = darkTaskbar ? '#f0f0f0' : '#000';
  ctx.font = '15px "WinXPTahoma", system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(timeStr, clockX + clockWidth / 2, TASKBAR_HEIGHT / 2 + 1);

  const btnX = width - fullBtnSize - padding;
  const btnY = (TASKBAR_HEIGHT - fullBtnSize) / 2;
  ctx.fillStyle = darkTaskbar ? '#303030' : '#e6e6e6';
  ctx.beginPath();
  ctx.roundRect(btnX, btnY, fullBtnSize, fullBtnSize, 5);
  ctx.fill();
  ctx.strokeStyle = darkTaskbar ? '#555' : '#c0c0c0';
  ctx.stroke();

  ctx.save();
  ctx.translate(btnX + fullBtnSize / 2, btnY + fullBtnSize / 2);
  ctx.strokeStyle = darkTaskbar ? '#f0f0f0' : '#333';
  ctx.lineWidth = 2;
  const s = 8;
  ctx.beginPath();
  ctx.moveTo(-s, -s + 4);
  ctx.lineTo(-s, -s);
  ctx.lineTo(-s + 4, -s);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(s, -s + 4);
  ctx.lineTo(s, -s);
  ctx.lineTo(s - 4, -s);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-s, s - 4);
  ctx.lineTo(-s, s);
  ctx.lineTo(-s + 4, s);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(s, s - 4);
  ctx.lineTo(s, s);
  ctx.lineTo(s - 4, s);
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}

export function drawStartMenu(ctx, desktop, { width, height }) {
  const menu = desktop.getStartMenuRect(width, height);
  const items = desktop.getStartMenuItems();

  ctx.save();

  const hoveredIndex = desktop.startMenuHoverIndex ?? -1;

  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.roundRect(menu.x + 4, menu.y + 4, menu.width, menu.height, 6);
  ctx.fill();

  ctx.beginPath();
  ctx.roundRect(menu.x, menu.y, menu.width, menu.height, 6);
  ctx.fillStyle = '#f4f4f4';
  ctx.fill();
  ctx.strokeStyle = '#3f6db3';
  ctx.lineWidth = 1;
  ctx.stroke();

  const bandWidth = 60;
  const bandGrad = ctx.createLinearGradient(
    menu.x,
    menu.y,
    menu.x,
    menu.y + menu.height
  );
  bandGrad.addColorStop(0, '#2957a4');
  bandGrad.addColorStop(1, '#163b7c');
  ctx.fillStyle = bandGrad;
  ctx.fillRect(menu.x + 1, menu.y + 1, bandWidth, menu.height - 2);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px "WinXPTahoma", system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.save();
  // Move the vertical "Windows XP" label up so it stays fully visible inside the band
  ctx.translate(menu.x + bandWidth / 2, menu.y + menu.height - 40);
  ctx.rotate(-Math.PI / 2);
  ctx.font = 'bold 16px "WinXPTahoma", system-ui';
  ctx.fillText('Windows XP', 0, -10);
  ctx.restore();

  const itemsX = menu.x + bandWidth + 8;
  const itemsY = menu.y + 40;
  const itemHeight = 22;
  const itemWidth = menu.width - bandWidth - 16;

  ctx.font = '14px "WinXPTahoma", system-ui';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  items.forEach((item, i) => {
    if (!item.label) return;
    const iy = itemsY + i * itemHeight;

    if (iy + itemHeight > menu.y + menu.height - 4) return;

    const isHovered = hoveredIndex === i;

    if (item.label === 'Log Off' || item.label === 'Shut Down...') {
      ctx.strokeStyle = '#d0d0d0';
      ctx.beginPath();
      ctx.moveTo(itemsX, iy - 3);
      ctx.lineTo(itemsX + itemWidth, iy - 3);
      ctx.stroke();
    }

    if (isHovered) {
      const g = ctx.createLinearGradient(itemsX, iy, itemsX, iy + itemHeight - 2);
      g.addColorStop(0, '#3b75d6');
      g.addColorStop(1, '#2453a8');
      ctx.fillStyle = g;
      ctx.fillRect(itemsX, iy, itemWidth, itemHeight - 2);
      ctx.strokeStyle = '#1c3b74';
      ctx.strokeRect(itemsX + 0.5, iy + 0.5, itemWidth - 1, itemHeight - 3);
      ctx.fillStyle = '#ffffff';
    } else {
      ctx.fillStyle = '#f4f4f4';
      ctx.fillRect(itemsX, iy, itemWidth, itemHeight - 2);
      ctx.fillStyle = '#000000';
    }

    ctx.fillText(item.label, itemsX + 10, iy + (itemHeight - 2) / 2);
  });

  const headerHeight = 24;
  const headerGrad = ctx.createLinearGradient(
    itemsX,
    menu.y + 8,
    itemsX,
    menu.y + 8 + headerHeight
  );
  headerGrad.addColorStop(0, '#fffbdc');
  headerGrad.addColorStop(1, '#ffe28a');
  ctx.fillStyle = headerGrad;
  ctx.fillRect(itemsX, menu.y + 8, itemWidth, headerHeight);
  ctx.strokeStyle = '#d0c070';
  ctx.strokeRect(itemsX, menu.y + 8, itemWidth, headerHeight);

  ctx.fillStyle = '#000';
  ctx.font = 'bold 15px "WinXPTahoma", system-ui';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('User', itemsX + 8, menu.y + 8 + headerHeight / 2);

  ctx.restore();
}

export function hitTestWindowResizeEdge(win, x, y) {
  const barHeight = 24;
  const edgeMargin = 6;

  const withinVertical =
    y >= win.y + barHeight && y <= win.y + win.height;
  const withinHorizontal =
    x >= win.x && x <= win.x + win.width;

  const onLeft =
    withinVertical &&
    x >= win.x - edgeMargin &&
    x <= win.x + edgeMargin;
  const onRight =
    withinVertical &&
    x >= win.x + win.width - edgeMargin &&
    x <= win.x + win.width + edgeMargin;
  const onTop =
    withinHorizontal &&
    y >= win.y + barHeight - edgeMargin &&
    y <= win.y + barHeight + edgeMargin;
  const onBottom =
    withinHorizontal &&
    y >= win.y + win.height - edgeMargin &&
    y <= win.y + win.height + edgeMargin;

  if (onLeft || onRight || onTop || onBottom) {
    return { left: onLeft, right: onRight, top: onTop, bottom: onBottom };
  }
  return null;
}

export function tombstoneUI() {
  // Kept for backwards compatibility; new helpers are exported above.
}