import { drawToolSlotIcon } from './tools_icons.js';

// removed inline slot icon drawing in drawToolsApp() — moved to tools_icons.js

const TOOL_CATEGORIES = [
  { name: 'Tools', items: ['spawn', 'portal', 'firework', 'screw'] },
  { name: 'Weapons', items: ['gun', 'knife', 'sawblade', 'spike', 'bomb', 'nuke'] },
  { name: 'Shapes', items: ['square', 'rectangle', 'longrect', 'smallrect', 'tallrect', 'platform', 'pillar', 'circle', 'bigcircle', 'triangle', 'bigtriangle', 'ramp', 'hexagon', 'diamond', 'bouncyball', 'house', 'weight10'] },
  { name: 'Misc', items: ['car', 'trampoline', 'magnet'] },
  { name: 'Minecraft', items: [
    'mc_sand',
    'mc_diamond_ore',
    'mc_emerald_ore',
    'mc_leaves',
    'mc_portal',
    'mc_log',
    'mc_bedrock',
    'mc_stone_block',
    'mc_cobblestone',
    'mc_lava',
    'mc_planks',
    'mc_sponge',
    'mc_redwool',
    'mc_darkblue_wool',
    'mc_rainbow_wool',
    'mc_netherrack',
    'mc_gold',
    'mc_red_ore',
    'mc_teal_gem',
    'mc_crafting',
    'mc_tnt'
  ] }
];

const SLOT_W = 90;
const SLOT_H = 80;
const GAP_X = 16;
const GAP_Y = 16;
const HEADER_H = 26;

export function getToolsSlots(win, desktop = null) {
  const innerPad = 8;
  const barHeight = 24;
  const contentX = win.x + innerPad;
  const contentY = win.y + barHeight + innerPad;
  const contentW = win.width - innerPad * 2;

  const firstX = contentX + 12;
  const firstY = contentY + 32;

  const maxCols = Math.max(1, Math.floor((contentW - 32) / (SLOT_W + GAP_X)));
  const slots = [];
  
  let currentY = firstY;

  TOOL_CATEGORIES.forEach(cat => {
    currentY += HEADER_H;
    const catRows = Math.ceil(cat.items.length / maxCols);
    cat.items.forEach((type, index) => {
      const col = index % maxCols;
      const row = Math.floor(index / maxCols);
      const x = firstX + col * (SLOT_W + GAP_X);
      const y = currentY + row * (SLOT_H + GAP_Y);

      // desktop may be omitted by callers; guard access safely
      // Rainbow block is no longer locked — always available.
      slots.push({
        type,
        x,
        y,
        w: SLOT_W,
        h: SLOT_H,
        locked: false
      });
    });
    currentY += catRows * (SLOT_H + GAP_Y) + 10;
  });

  return slots;
}

export function drawToolsApp(ctx, win, desktop, contentX, contentY, contentW, contentH) {
  const headerY = contentY;
  ctx.fillStyle = '#ece9d8';
  ctx.fillRect(contentX, headerY, contentW, 22);
  ctx.strokeStyle = '#d4d0c8';
  ctx.strokeRect(contentX, headerY, contentW, 22);
  ctx.fillStyle = '#000';
  ctx.font = '15px "WinXPTahoma", system-ui';
  ctx.fillText('Categorized tool palette for your stickmen desktop.', contentX + 6, headerY + 4);

  // Help + Delete All buttons in header
  const btnH = 16;
  const helpW = 56;
  const delW = 70;
  const spacing = 6;
  const delX = contentX + contentW - delW - 4;
  const delY = headerY + 3;
  const helpX = delX - helpW - spacing;
  const helpY = headerY + 3;

  // Help button
  ctx.fillStyle = '#f0f0f0';
  ctx.fillRect(helpX, helpY, helpW, btnH);
  ctx.strokeStyle = '#808080';
  ctx.lineWidth = 1;
  ctx.strokeRect(helpX + 0.5, helpY + 0.5, helpW - 1, btnH - 1);
  ctx.fillStyle = '#003366';
  ctx.font = 'bold 11px "WinXPTahoma"';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('HELP', helpX + helpW / 2, helpY + btnH / 2 + 1);

  // Delete All button
  ctx.fillStyle = '#f0f0f0';
  ctx.fillRect(delX, delY, delW, btnH);
  ctx.strokeStyle = '#808080';
  ctx.lineWidth = 1;
  ctx.strokeRect(delX + 0.5, delY + 0.5, delW - 1, btnH - 1);
  ctx.fillStyle = '#800000';
  ctx.font = 'bold 11px "WinXPTahoma"';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('DELETE ALL', delX + delW / 2, delY + btnH / 2 + 1);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  const slots = getToolsSlots(win, desktop);
  const scrollableHeaderH = 22;

  // Compute total scrollable height based on the last slot
  const contentHeight = slots.length > 0 ? (slots[slots.length-1].y + SLOT_H - (contentY + scrollableHeaderH + 10)) : 0;

  const visibleTop = contentY + scrollableHeaderH;
  const visibleHeight = contentH - scrollableHeaderH - 16;
  win.toolsMaxScroll = Math.max(0, contentHeight - visibleHeight);
  if (typeof win.toolsScrollY !== 'number') win.toolsScrollY = 0;
  if (win.toolsScrollY < 0) win.toolsScrollY = 0;
  if (win.toolsScrollY > win.toolsMaxScroll) win.toolsScrollY = win.toolsMaxScroll;

  const scrollY = win.toolsScrollY || 0;

  // Clip to scrollable region
  ctx.save();
  ctx.beginPath();
  ctx.rect(contentX, visibleTop, contentW, visibleHeight);
  ctx.clip();

  // Draw Category Headers
  const maxCols = Math.max(1, Math.floor((contentW - 32) / (SLOT_W + GAP_X)));
  let headerDrawY = contentY + 32 - scrollY;
  
  TOOL_CATEGORIES.forEach(cat => {
    ctx.fillStyle = '#4f81bd';
    ctx.font = 'bold 16px "WinXPTahoma"';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(cat.name.toUpperCase(), contentX + 12, headerDrawY + 4);
    
    // Draw underline
    ctx.strokeStyle = '#4f81bd';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(contentX + 12, headerDrawY + 18);
    ctx.lineTo(contentX + contentW - 24, headerDrawY + 18);
    ctx.stroke();

    const rowCount = Math.ceil(cat.items.length / maxCols);
    headerDrawY += HEADER_H + rowCount * (SLOT_H + GAP_Y) + 10;
  });

  slots.forEach((slot) => {
    const localX = slot.x - win.x;
    const localY = slot.y - win.y - scrollY;

    // Draw slot card
    ctx.fillStyle = slot.locked ? '#f0f0f0' : '#ffffff';
    ctx.strokeStyle = '#d0d0d0';
    ctx.beginPath();
    ctx.roundRect(localX, localY, slot.w, slot.h, 4);
    ctx.fill();
    ctx.stroke();

    // Hover effect
    const isHover = win.toolsHoverSlot && win.toolsHoverSlot.type === slot.type;
    if (isHover) {
       ctx.fillStyle = 'rgba(79, 129, 189, 0.08)';
       ctx.fillRect(localX, localY, slot.w, slot.h);
    }

    ctx.save();
    ctx.translate(localX + slot.w / 2, localY + slot.h / 2 - 6);
    if (slot.locked) {
      // Draw lock icon
      ctx.fillStyle = '#888';
      ctx.beginPath();
      ctx.roundRect(-10, -5, 20, 16, 2);
      ctx.fill();
      ctx.strokeStyle = '#888';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, -5, 7, Math.PI, 0);
      ctx.stroke();
    } else {
      drawToolSlotIcon(ctx, slot.type);
    }
    ctx.restore();

    ctx.fillStyle = slot.locked ? '#999' : '#444';
    ctx.font = '14px "WinXPTahoma", system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const labelMap = {
      spawn: 'Spawn',
      gun: 'Gun',
      knife: 'Knife',
      sawblade: 'Sawblade',
      bomb: 'Bomb',
      nuke: 'Nuke',
      car: 'Car',
      spike: 'Spike',
      trampoline: 'Trampoline',
      circle: 'Circle',
      bigcircle: 'Big Circle',
      square: 'Square',
      rectangle: 'Rectangle',
      longrect: 'Long Rect',
      smallrect: 'Small Block',
      tallrect: 'Tall Block',
      platform: 'Platform',
      pillar: 'Pillar',
      triangle: 'Triangle',
      bigtriangle: 'Big Tri',
      hexagon: 'Hexagon',
      diamond: 'Diamond',
      bouncyball: 'Bouncy Ball',
      firework: 'Firework',
      magnet: 'Magnet',
      portal: 'Portal',
      screw: 'Screw',
      ramp: 'Ramp',
      house: 'House',
      weight10: '10t Weight',
      mc_sand: 'Sand',
      mc_diamond_ore: 'Diamond Ore',
      mc_emerald_ore: 'Emerald Ore',
      mc_leaves: 'Leaves',
      mc_portal: 'Portal',
      mc_log: 'Log',
      mc_bedrock: 'Bedrock',
      mc_stone_block: 'Stone Block',
      mc_cobblestone: 'Cobblestone',
      mc_lava: 'Lava',
      mc_planks: 'Planks',
      mc_sponge: 'Sponge',
      mc_redwool: 'Red Wool',
      mc_darkblue_wool: 'Dark Blue Wool',
      mc_rainbow_wool: 'Rainbow Wool',
      mc_netherrack: 'Netherrack',
      mc_gold: 'Gold Block',
      mc_red_ore: 'Red Ore',
      mc_teal_gem: 'Teal Gem',
      mc_crafting: 'Crafting Table',
      mc_tnt: 'TNT',
      mc_ghast: 'Ghast',
      rainbow_block: 'Rainbow Block',
    };
    const label = labelMap[slot.type] || '';
    ctx.fillText(label, localX + slot.w / 2, localY + slot.h - 16);
  });

  ctx.restore(); // end scroll clip

  // Simple scrollbar on the right if needed
  if (win.toolsMaxScroll > 0) {
    const barX = contentX + contentW - 10;
    const barY = visibleTop;
    const barW = 6;
    const barH = visibleHeight;
    ctx.fillStyle = '#e0e0e0';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.strokeStyle = '#b0b0b0';
    ctx.strokeRect(barX, barY, barW, barH);

    const ratio = visibleHeight / (contentHeight + 0.01);
    const thumbH = Math.max(24, barH * ratio);
    const maxThumbTravel = barH - thumbH;
    const t = win.toolsScrollY / (win.toolsMaxScroll || 1);
    const thumbY = barY + maxThumbTravel * t;

    ctx.fillStyle = '#b0b0b0';
    ctx.fillRect(barX + 1, thumbY, barW - 2, thumbH);
  }

  if (win.toolsHoverSlot) {
    const slot = win.toolsHoverSlot;
    const localX = slot.x - win.x + slot.w / 2;
    const localY = slot.y - win.y - scrollY - 8;

    const descriptions = {
      spawn: 'Spawn: create another stickman on the desktop.',
      gun: 'Gun: right-click while holding to blast a stickman away.',
      knife: 'Knife: give to a stickman for close-range hits.',
      sawblade: 'Sawblade: spinning blade that makes stickmen bleed.',
      bomb: 'Bomb: explodes after 3 seconds and blasts nearby stickmen.',
      nuke: 'Nuke: huge delayed blast that shakes the whole desktop.',
      car: 'Car: drives on its own and can ram into stickmen.',
      spike: 'Spike: sharp top; stickmen bleed if they land on it.',
      trampoline: 'Trampoline: drop on the desktop to bounce stickmen.',
      circle: 'Circle: solid round platform the stickmen can stand on.',
      bigcircle: 'Big Circle: a larger round platform to roll and stand on.',
      square: 'Square: blocky platform for stacking and climbing.',
      rectangle: 'Rectangle: short platform for simple bridges.',
      longrect: 'Long Rectangle: extra-wide platform or wall.',
      triangle: 'Triangle: ramp or wedge for physics fun.',
      bigtriangle: 'Big Triangle: larger ramp for dramatic launches.',
      hexagon: 'Hexagon: chunky obstacle that stacks well.',
      diamond: 'Diamond: angled block for tricky bounces.',
      bouncyball: 'Bouncy Ball: green ball that bounces a LOT.',
      firework: 'Firework: launches upward and explodes near stickmen.',
      screw: 'Screw: click two objects to permanently attach them to each other.',
      magnet: 'Magnet: pulls stickmen and objects toward it.',
      portal: 'Portal: place two to teleport stickmen between them.',
      ramp: 'Ramp: a sloped surface for stickmen to slide or climb.',
      house: 'House: a little XP-style home for stickmen to stand on.',
      weight10: '10 Ton Weight: very heavy block that shakes the screen when it lands.',
      mc_sand: 'Sand: A block of pixelated sand.',
      mc_diamond_ore: 'Diamond Ore: A shiny block of diamond ore.',
      mc_emerald_ore: 'Emerald Ore: Bright green gems embedded in stone.',
      mc_leaves: 'Leaves: Green pixelated foliage.',
      mc_portal: 'Portal: A swirling purple Nether portal block.',
      mc_log: 'Log: A block of pixelated wood grain.',
      mc_bedrock: 'Bedrock: An indestructible dark grey block.',
      mc_stone_block: 'Stone Block: Classic stone for building walls.',
      mc_cobblestone: 'Cobblestone: Rough, grey paving stone.',
      mc_lava: 'Lava: Molten rock that burns stickmen on contact.',
      mc_planks: 'Planks: Wooden building blocks.',
      mc_sponge: 'Sponge: Yellow-green porous block.',
      mc_redwool: 'Red Wool: Soft red pixelated block.',
      mc_darkblue_wool: 'Dark Blue Wool: Deep blue woolly block.',
      mc_rainbow_wool: 'Rainbow Wool: Multi-colored striped wool block.',
      mc_netherrack: 'Netherrack: Fiery red stone from the depths.',
      mc_gold: 'Gold Block: A block of pure pixelated gold.',
      mc_red_ore: 'Red Ore: Red crystal ore in stone.',
      mc_teal_gem: 'Teal Gem: A bright teal gem-like block.',
      mc_crafting: 'Crafting Table: Used for building things.',
      mc_tnt: 'TNT: High explosive with a 5 second timer.',
      mc_ghast: 'Ghast: A flying, animated blocky ghost.',
    };

    const text = descriptions[slot.type] || '';
    if (text) {
      ctx.save();
      ctx.font = '12px "WinXPTahoma", system-ui';
      const paddingX = 8;
      const paddingY = 4;
      const textWidth = ctx.measureText(text).width;
      const boxW = textWidth + paddingX * 2;
      const boxH = 20;
      const boxX = Math.max(6, Math.min(localX - boxW / 2, win.width - boxW - 6));
      const boxY = Math.max(28, localY - boxH);

      ctx.fillStyle = 'rgba(40,40,40,0.95)';
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxW, boxH, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, boxX + boxW / 2, boxY + boxH / 2);
      ctx.restore();
    }
  }
}

export async function handleToolsInteraction(desktop, win, x, y) {
  const innerPad = 8;
  const barHeight = 24;
  const contentX = win.x + innerPad;
  const contentY = win.y + barHeight + innerPad;
  const contentW = win.width - innerPad * 2;

  // Check for "Help" and "Delete All" button hits
  const btnH = 16;
  const helpW = 56;
  const delW = 70;
  const spacing = 6;
  const delX = contentX + contentW - delW - 4;
  const delY = contentY + 3;
  const helpX = delX - helpW - spacing;
  const helpY = contentY + 3;

  // Help button opens info.txt
  if (x >= helpX && x <= helpX + helpW && y >= helpY && y <= helpY + btnH) {
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    desktop.ensureWindow('info', viewport);
    return;
  }

  // Delete All button behavior
  if (x >= delX && x <= delX + delW && y >= delY && y <= delY + btnH) {
    if (confirm('Delete all placed tools and objects?')) {
      desktop.shapes = [];
      desktop.trampolines = [];
      desktop.sawblades = [];
      desktop.portals = [];
      desktop.guns = [];
      desktop.bullets = [];
      desktop.fireworkBursts = [];
      desktop.showToast('All tools cleared', 1.5);
    }
    return;
  }

  const slots = getToolsSlots(win, desktop);
  const scrollY = typeof win.toolsScrollY === 'number' ? win.toolsScrollY : 0;
  const adjustedY = y + scrollY;

  for (const slot of slots) {
    if (
      x >= slot.x &&
      x <= slot.x + slot.w &&
      adjustedY >= slot.y &&
      adjustedY <= slot.y + slot.h
    ) {
      if (slot.locked) {
      // Check whether the current user has liked the project; if so, unlock immediately.
      try {
        if (typeof websim !== 'undefined' && typeof websim.isProjectLiked === 'function') {
          const liked = await websim.isProjectLiked();
          if (liked) {
            desktop.projectLiked = true;
            // allow the click to continue as if unlocked
          } else {
            desktop.showToast('Like this project to unlock the Rainbow Block!', 3.0);
            return;
          }
        } else {
          // If websim API is unavailable, remind the user
          desktop.showToast('Like this project to unlock the Rainbow Block!', 3.0);
          return;
        }
      } catch (err) {
        console.error('Like-check failed', err);
        desktop.showToast('Unable to check like status; try again later.', 2.5);
        return;
      }
    }
      if (slot.type === 'spawn') {
        try {
          const ev = new CustomEvent('spawnStick', { detail: { x, y } });
          window.dispatchEvent(ev);
        } catch (err) {
          // ignore
        }
        break;
      }

      if (slot.type === 'gun' || slot.type === 'knife') {
        desktop.equippedCursorWeapon = { type: slot.type };
        break;
      }

      if (slot.type === 'screw') {
        desktop.equippedCursorWeapon = { type: 'screw' };
        desktop.screwFirstTarget = null;
        break;
      }

      desktop.draggingWeapon = { type: slot.type, fromWindowId: win.id };
      break;
    }
  }
}