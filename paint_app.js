const MENU_H = 18;
const TOOLBAR_H = 26;
const PALETTE_H = 34;
const TOOLPANE_W = 56;
const STATUS_H = 18;

export function getPaintContentRect(win) {
  const barHeight = 24;
  const innerPad = 8;
  const contentX = win.x + innerPad;
  const contentY = win.y + barHeight + innerPad;
  const contentW = win.width - innerPad * 2;
  const contentH = win.height - barHeight - innerPad * 2;

  const canvasX = contentX + TOOLPANE_W + 4;
  const canvasY = contentY + MENU_H + TOOLBAR_H + PALETTE_H + 28; 
  const canvasW = (contentW - TOOLPANE_W - 4) - 8;
  const canvasH = Math.max(80, contentH - (MENU_H + TOOLBAR_H + PALETTE_H + 28) - STATUS_H);

  return { x: canvasX, y: canvasY, width: canvasW, height: canvasH };
}

export function drawPaintApp(ctx, win, contentX, contentY, contentW, contentH) {
  // This is the Paint rendering logic extracted from desktop.js
  let y = contentY;

  // Menu bar
  ctx.fillStyle = '#d4d0c8';
  ctx.fillRect(contentX, y, contentW, 18);
  ctx.strokeStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(contentX + 0.5, y + 17.5);
  ctx.lineTo(contentX + contentW - 0.5, y + 17.5);
  ctx.stroke();
  ctx.fillStyle = '#000';
  ctx.font = '15px "WinXPTahoma", system-ui';
  const menus = ['File', 'Edit', 'View', 'Image', 'Colors', 'Help'];
  let mx = contentX + 6;
  menus.forEach((m) => {
    ctx.fillText(m, mx, y + 3);
    mx += ctx.measureText(m).width + 18;
  });
  y += 18;

  // Tool palette on the left
  const toolPaneWidth = 56;
  const toolPaneHeight = Math.max(72, contentH - 18 - 22);
  ctx.fillStyle = '#d4d0c8';
  ctx.fillRect(contentX, y, toolPaneWidth, toolPaneHeight);
  ctx.strokeStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(contentX + 0.5, y + toolPaneHeight - 0.5);
  ctx.lineTo(contentX + 0.5, y + 0.5);
  ctx.lineTo(contentX + toolPaneWidth - 0.5, y + 0.5);
  ctx.stroke();
  ctx.strokeStyle = '#808080';
  ctx.beginPath();
  ctx.moveTo(contentX + toolPaneWidth - 0.5, y + 0.5);
  ctx.lineTo(contentX + toolPaneWidth - 0.5, y + toolPaneHeight - 0.5);
  ctx.lineTo(contentX + 0.5, y + toolPaneHeight - 0.5);
  ctx.stroke();

  const toolSize = 18;
  const toolMarginX = 4;
  const toolMarginY = 6;
  const toolIcons = [
    { label: 'Pencil', short: 'Pn' },
    { label: 'Brush', short: 'Br' },
    { label: 'Eraser', short: 'Er' },
    { label: 'Fill', short: 'Fi' },
    { label: 'Picker', short: 'Pi' },
    { label: 'Text', short: 'Tx' },
    { label: 'Line', short: 'Ln' },
    { label: 'Rect', short: 'Re' },
    { label: 'Ellipse', short: 'El' },
  ];
  ctx.font = '10px "WinXPTahoma", system-ui';
  toolIcons.forEach((tool, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const tx = contentX + toolMarginX + col * (toolSize + 2);
    const ty = y + toolMarginY + row * (toolSize + 2);

    const isSelected = win.paintTool === tool.label;
    ctx.fillStyle = isSelected ? '#ffffff' : '#f0f0f0';
    ctx.fillRect(tx, ty, toolSize, toolSize);
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(tx + 0.5, ty + toolSize - 0.5);
    ctx.lineTo(tx + 0.5, ty + 0.5);
    ctx.lineTo(tx + toolSize - 0.5, ty + 0.5);
    ctx.stroke();
    ctx.strokeStyle = '#808080';
    ctx.beginPath();
    ctx.moveTo(tx + toolSize - 0.5, ty + 0.5);
    ctx.lineTo(tx + toolSize - 0.5, ty + toolSize - 0.5);
    ctx.lineTo(tx + 0.5, ty + toolSize - 0.5);
    ctx.stroke();

    ctx.fillStyle = isSelected ? '#003399' : '#000';
    ctx.fillText(tool.short, tx + 4, ty + 5);

    if (isSelected) {
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.strokeRect(tx + 0.5, ty + 0.5, toolSize - 1, toolSize - 1);
    }
  });

  const toolbarX = contentX + toolPaneWidth + 4;
  const toolbarW = contentW - toolPaneWidth - 4;
  ctx.fillStyle = '#d4d0c8';
  ctx.fillRect(toolbarX, y, toolbarW, 24);
  ctx.strokeStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(toolbarX + 0.5, y + 23.5);
  ctx.lineTo(toolbarX + toolbarW - 0.5, y + 23.5);
  ctx.stroke();

  ctx.font = '12px "Tahoma", system-ui';
  const toolbarItems = ['New', 'Open', 'Save', 'Print', 'Cut', 'Copy', 'Paste', 'Undo', 'Redo'];
  let tbx = toolbarX + 6;
  toolbarItems.forEach((lab) => {
    const w = Math.max(24, ctx.measureText(lab).width + 14);
    ctx.fillStyle = '#f8f8f8';
    ctx.fillRect(tbx, y + 3, w, 18);
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(tbx + 0.5, y + 20.5);
    ctx.lineTo(tbx + 0.5, y + 3.5);
    ctx.lineTo(tbx + w - 0.5, y + 3.5);
    ctx.stroke();
    ctx.strokeStyle = '#808080';
    ctx.beginPath();
    ctx.moveTo(tbx + w - 0.5, y + 3.5);
    ctx.lineTo(tbx + w - 0.5, y + 20.5);
    ctx.lineTo(tbx + 0.5, y + 20.5);
    ctx.stroke();

    ctx.fillStyle = '#000';
    ctx.fillText(lab, tbx + 6, y + 6);
    tbx += w + 4;
  });

  y += 26;

  const paletteHeight = 34;
  const paletteY = y;
  const paletteX = toolbarX;
  const paletteW = toolbarW;
  ctx.fillStyle = '#d4d0c8';
  ctx.fillRect(paletteX, paletteY, paletteW, paletteHeight);
  ctx.strokeStyle = '#808080';
  ctx.strokeRect(paletteX, paletteY, paletteW, paletteHeight);

  const colors = [
    '#000000', '#808080', '#808000', '#008000', '#008080', '#000080', '#800080', '#800000',
    '#ff0000', '#ff8000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff', '#ffffff',
  ];
  const swatchSize = 12;
  const swatchMargin = 2;
  let cx = paletteX + 6;
  const cy = paletteY + (paletteHeight - swatchSize) / 2;

  colors.forEach((col) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 1, cy - 1, swatchSize + 2, swatchSize + 2);
    ctx.fillStyle = col;
    ctx.fillRect(cx, cy, swatchSize, swatchSize);
    ctx.strokeStyle = '#000000';
    ctx.strokeRect(cx, cy, swatchSize, swatchSize);

    if (win.paintColor === col) {
      ctx.strokeStyle = '#ffeb3b';
      ctx.lineWidth = 2;
      ctx.strokeRect(cx - 2, cy - 2, swatchSize + 4, swatchSize + 4);
      ctx.lineWidth = 1;
    }

    cx += swatchSize + swatchMargin;
  });

  // Brush sizes sit to the right of the color row, within the same palette bar.
  const sizes = [1, 2, 3, 5, 8, 12];
  const sizeBtnW = 34;
  const sizeBtnH = 18;
  const sizeY = paletteY + (paletteHeight - sizeBtnH) / 2;
  let sizeX = cx + 12;
  ctx.font = '12px "Tahoma", system-ui';
  sizes.forEach((sz) => {
    // Ensure buttons stay within the palette width
    if (sizeX + sizeBtnW > paletteX + paletteW - 4) return;

    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(sizeX, sizeY, sizeBtnW, sizeBtnH);
    ctx.strokeStyle = '#c0c0c0';
    ctx.strokeRect(sizeX, sizeY, sizeBtnW, sizeBtnH);

    if (win.paintBrushSize === sz) {
      ctx.strokeStyle = '#0066cc';
      ctx.lineWidth = 2;
      ctx.strokeRect(sizeX + 1, sizeY + 1, sizeBtnW - 2, sizeBtnH - 2);
      ctx.lineWidth = 1;
    }

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = sz;
    const midY = sizeY + sizeBtnH / 2;
    ctx.beginPath();
    ctx.moveTo(sizeX + 4, midY);
    ctx.lineTo(sizeX + sizeBtnW - 4, midY);
    ctx.stroke();
    ctx.lineWidth = 1;

    sizeX += sizeBtnW + 6;
  });

  const currentX = paletteX + paletteW - 64;
  const currentY = paletteY + 6;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(currentX + 8, currentY + 8, 26, 18);
  ctx.strokeStyle = '#000000';
  ctx.strokeRect(currentX + 8, currentY + 8, 26, 18);
  ctx.fillStyle = '#000000';
  ctx.fillRect(currentX + 10, currentY + 10, 22, 14);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(currentX, currentY, 26, 18);
  ctx.strokeStyle = '#000000';
  ctx.strokeRect(currentX, currentY, 26, 18);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(currentX + 2, currentY + 2, 22, 14);

  y += paletteHeight + 4 + 24;

  const canvasX = toolbarX;
  const canvasY = y;
  const canvasW = toolbarW - 8;
  const canvasH = Math.max(80, contentH - (canvasY - contentY) - 24);

  ctx.fillStyle = '#d4d0c8';
  ctx.fillRect(canvasX - 1, canvasY - 17, canvasW + 18, canvasH + 18);

  ctx.fillStyle = '#f0f0f0';
  ctx.fillRect(canvasX, canvasY - 17, canvasW, 16);
  ctx.strokeStyle = '#808080';
  ctx.strokeRect(canvasX, canvasY - 17, canvasW, 16);

  ctx.fillStyle = '#f0f0f0';
  ctx.fillRect(canvasX - 17, canvasY, 16, canvasH);
  ctx.strokeStyle = '#808080';
  ctx.strokeRect(canvasX - 17, canvasY, 16, canvasH);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(canvasX, canvasY, canvasW, canvasH);
  ctx.strokeStyle = '#808080';
  ctx.strokeRect(canvasX, canvasY, canvasW, canvasH);

  if (Array.isArray(win.strokes)) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(canvasX, canvasY, canvasW, canvasH);
    ctx.clip();
    win.strokes.forEach((stroke) => {
      if (!stroke.points || stroke.points.length === 0) return;
      
      ctx.lineWidth = stroke.size || 2;
      ctx.strokeStyle = stroke.color || '#000000';
      ctx.fillStyle = stroke.color || '#000000';
      
      const first = stroke.points[0];
      if (stroke.points.length === 1) {
        // Draw a solid circle dot for single points (improves click-to-draw)
        ctx.beginPath();
        ctx.arc(first.x, first.y, (stroke.size || 2) / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(first.x, first.y);
        for (let i = 1; i < stroke.points.length; i++) {
          const p = stroke.points[i];
          ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      }
    });
    ctx.restore();
  }

  const statusH = 18;
  const statusY = contentY + contentH - statusH;
  ctx.fillStyle = '#d4d0c8';
  ctx.fillRect(contentX, statusY, contentW, statusH);
  ctx.strokeStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(contentX + 0.5, statusY + 0.5);
  ctx.lineTo(contentX + contentW - 0.5, statusY + 0.5);
  ctx.stroke();
  ctx.strokeStyle = '#808080';
  ctx.beginPath();
  ctx.moveTo(contentX + 0.5, statusY + statusH - 0.5);
  ctx.lineTo(contentX + contentW - 0.5, statusY + statusH - 0.5);
  ctx.stroke();

  ctx.fillStyle = '#000';
  ctx.font = '14px "WinXPTahoma", system-ui';
  ctx.textAlign = 'left';
  ctx.fillText('For Help, click Help Topics on the Help Menu.', contentX + 6, statusY + 4);
  ctx.textAlign = 'right';
  ctx.fillText('Stickman XP Paint', contentX + contentW - 6, statusY + 4);
}

export function handlePaintInteraction(desktop, win, x, y, viewport) {
  const barHeight = 24;
  const innerPad = 8;
  const contentX = win.x + innerPad;
  const contentY = win.y + barHeight + innerPad;
  const contentW = win.width - innerPad * 2;
  const contentH = win.height - barHeight - innerPad * 2;

  let yy = contentY;
  yy += 18; // menu y offset

  const toolPaneWidth = 56;
  const toolPaneHeight = contentH - 18 - 22;
  const toolbarX = contentX + toolPaneWidth + 4;
  const toolbarW = contentW - toolPaneWidth - 4;

  // 1. Tool Selection Hit Test
  const toolSize = 18;
  const toolMarginX = 4;
  const toolMarginY = 6;
  const toolIcons = [
    'Pencil', 'Brush', 'Eraser',
    'Fill', 'Picker', 'Text',
    'Line', 'Rect', 'Ellipse',
  ];
  toolIcons.forEach((label, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const tx = contentX + toolMarginX + col * (toolSize + 2);
    const ty = yy + toolMarginY + row * (toolSize + 2);
    if (x >= tx && x <= tx + toolSize && y >= ty && y <= ty + toolSize) {
      win.paintTool = label;
    }
  });

  // 2. Toolbar Hit Test (Undo/Redo)
  const toolbarItems = ['New', 'Open', 'Save', 'Print', 'Cut', 'Copy', 'Paste', 'Undo', 'Redo'];
  const tempCtx = document.createElement('canvas').getContext('2d');
  tempCtx.font = '12px "Tahoma"';
  let tbx = toolbarX + 6;
  toolbarItems.forEach((lab) => {
    const w = Math.max(24, tempCtx.measureText(lab).width + 14);
    if (x >= tbx && x <= tbx + w && y >= yy + 3 && y <= yy + 21) {
      if (lab === 'Undo' && win.strokes.length > 0) {
        const last = win.strokes.pop();
        if (!win.redoStack) win.redoStack = [];
        win.redoStack.push(last);
      } else if (lab === 'Redo' && win.redoStack && win.redoStack.length > 0) {
        const next = win.redoStack.pop();
        win.strokes.push(next);
      } else if (lab === 'New') {
        win.strokes = [];
        win.redoStack = [];
      }
    }
    tbx += w + 4;
  });

  yy += 26; // move past toolbar

  const paletteHeight = 34;
  const paletteY = yy;
  const paletteX = toolbarX;
  const paletteW = toolbarW;

  const colors = [
    '#000000', '#808080', '#808000', '#008000', '#008080', '#000080', '#800080', '#800000',
    '#ff0000', '#ff8000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff', '#ffffff',
  ];
  const swatchSize = 12;
  const swatchMargin = 2;
  let cx = paletteX + 6;
  const cy = paletteY + (paletteHeight - swatchSize) / 2;

  if (!win.paintColor) win.paintColor = '#000000';
  if (!win.paintBrushSize) win.paintBrushSize = 2;

  colors.forEach((col) => {
    const hitX = cx;
    const hitY = cy;
    const hitW = swatchSize;
    const hitH = swatchSize;
    if (
      x >= hitX &&
      x <= hitX + hitW &&
      y >= hitY &&
      y <= hitY + hitH
    ) {
      win.paintColor = col;
    }
    cx += swatchSize + swatchMargin;
  });

  // Brush sizes clickable area aligned with their new position to the right of colors.
  const sizes = [1, 2, 3, 5, 8, 12];
  const sizeBtnW = 34;
  const sizeBtnH = 18;
  const sizeY = paletteY + (paletteHeight - sizeBtnH) / 2;
  let sizeX = cx + 12;
  sizes.forEach((sz) => {
    if (sizeX + sizeBtnW > paletteX + paletteW - 4) return;

    const bx = sizeX;
    const by = sizeY;
    if (
      x >= bx &&
      x <= bx + sizeBtnW &&
      y >= by &&
      y <= by + sizeBtnH
    ) {
      win.paintBrushSize = sz;
    }
    sizeX += sizeBtnW + 6;
  });
}