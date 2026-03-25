import { 
  ICON_SIZE, 
  TASKBAR_HEIGHT, 
  WINDOW_MIN_WIDTH, 
  WINDOW_MIN_HEIGHT 
} from './constants.js';

import {
  drawPaintApp,
  handlePaintInteraction,
  getPaintContentRect,
} from './paint_app.js';

import {
  drawToolsApp,
  handleToolsInteraction,
  getToolsSlots,
} from './tools_app.js';

import {
  MINE_COUNT,
  GRID_SIZE,
  initMinesweeper,
  revealMine,
} from './desktop_minesweeper.js';

import {
  drawIcon,
  drawTaskbar,
  drawStartMenu,
  hitTestWindowResizeEdge as hitTestWindowResizeEdgeUI,
} from './desktop_ui.js';
import { drawDragWeaponIcon } from './tools_icons.js';
import { gunImg, mcImgs } from './weapon_assets.js';

// removed inline draggingWeapon drawing in draw() — now uses drawDragWeaponIcon()

let nextWindowId = 1;

 // Minesweeper constants moved to desktop_minesweeper.js
// removed MINE_COUNT and GRID_SIZE (now imported from ./desktop_minesweeper.js)

 // Global images for XP look
const wallpaperImg = new Image();
wallpaperImg.src = './Windows.webp';

const wallpaperImgWin7 = new Image();
wallpaperImgWin7.src = './img0.jpg';

const wallpaperImgEvil = new Image();
wallpaperImgEvil.src = './Windowsm666.webp';

// Vib assets: hat image and ribbon background (blank canvases provided)
const vibHatImg = new Image();
vibHatImg.src = './blank-canvas-1773625246730.png';

const vibRibbonImg = new Image();
vibRibbonImg.src = './blank-canvas-1773625444592.png';

const clippyImg = new Image();
clippyImg.src = './Clippy.png';

// removed gunImg & mcImgs definitions — moved to weapon_assets.js

const WALLPAPER_IMAGES = [wallpaperImg, wallpaperImgWin7, wallpaperImgEvil];

const startButtonImg = new Image();
startButtonImg.src = './start.png';

export class Desktop {
  constructor() {
    this.icons = createDefaultIcons();
    this.windows = [];

    this.lockerImg = new Image();
    this.lockerImg.src = './locker close.gif';
    this.activeWindowId = null;
    this.draggingWindow = null;
    this.dragOffset = { x: 0, y: 0 };
    // Static trampolines placed on the desktop (from Tools app)
    this.trampolines = [];
    // World guns the stickmen can pick up (dropped from cursor/tools)
    this.guns = [];
    // Trampoline dragging state
    this.draggingTrampoline = null;
    this.trampolineDragOffset = { x: 0, y: 0 };
    this.trampolineLastCursor = null;

    // Spinning sawblades (weapon) placed from the Tools app
    this.sawblades = [];
    // Sawblade dragging state (so sawblades can be grabbed/moved/thrown)
    this.draggingSawblade = null;
    this.sawbladeDragOffset = { x: 0, y: 0 };
    this.sawbladeLastCursor = null;

    // Static shapes placed on the desktop (from Tools app)
    this.shapes = [];
    // Teleportation portals placed from the Tools app (max 2)
    this.portals = [];
    // Permanent physical connections between objects
    this.screws = [];
    // Temporary state for the screw tool selection
    this.screwFirstTarget = null;
    // Bullets fired from guns (stick-held or cursor-held)
    this.bullets = [];
    // Firework explosion particle bursts
    this.fireworkBursts = [];
    // Gun visual effects (muzzle flashes, impact sparks)
    this.gunBursts = [];
    // Shape dragging state
    this.draggingShape = null;
    this.shapeDragOffset = { x: 0, y: 0 };
    this.lastCursorForShape = null;
    // Window resizing state
    this.resizingWindow = null;
    this.resizeEdge = null;
    this.resizeStart = {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      cursorX: 0,
      cursorY: 0,
    };
    // Icon dragging state
    this.draggingIcon = null;
    this.iconDragOffset = { x: 0, y: 0 };
    this.showStartMenu = false;
    // Currently dragged item from the Tools app (weapons or shapes)
    this.draggingWeapon = null;
    // Toast / ephemeral popup for messages (simple on-canvas notification)
    this.toast = null;

    // Quick Tip notification state (top right)
    this.quickTip = {
      visible: true,
      text: 'Start having fun by opening the Tools app for weapons, shapes, blocks, and more!',
      age: 0,
      ttl: 8.0,
      width: 280,
      height: 100,
      padding: 12
    };

    // Hover state for icons and taskbar buttons (for subtle highlights)
    this.lastHoverIcon = null;
    this.taskbarHoverWindow = null;

    // Global-ish desktop settings (used by Settings app)
    this.settings = {
      // Reserved for future cross-app behavior; Settings app toggles live here.
      darkTaskbar: false,
      muteToasts: false,
      muteAllSound: false,
      maxStickmen: 10,
      disableEmotes: false,
      showFps: false,
      wallpaperIndex: 0,
      lowEndMode: false,
      allowStickOpenApps: false,
      stickFightEachOther: false,
      // When true, stickmen have health bars and can die from damage
      stickHealthBars: false,
      maxItems500: false,
      // Customization for the primary stickman
      stickCustomName: '',
      stickCustomColor: '#111111',
      stickCustomScale: 1.0,
      stickCustomSpeed: 1.0,
      stickCustomHat: null,
      keepDeadSticks: false,
      mobileFriendly: false,
      allowAppDeletion: false,
      // Vib ribbon background toggle (if true, use the vib ribbon wallpaper)
      stickVibRibbon: false,
    };

    // Special wallpaper index for the "virus" mode
    this.evilWallpaperIndex = 2;

    // Glitch / fake-virus mode state
    this.glitchActive = false;
    this.glitchIntensity = 0;
    this.errorPopups = [];

    // Fake "system crash" state after virus runs
    this.crashTimer = 0;           // counts down while virus is active
    this.crashed = false;          // when true, show crash screen instead of desktop
    this.crashDisplayTimer = 0;    // how long to show crash screen before reset
    this.needsResetAfterCrash = false;
    this.prevWallpaperIndex = null;

    // Right-click context menu state: { x, y, type: 'shape'|'trampoline'|'portal', ref }
    this.contextMenu = null;
    this.contextMenuHoverIndex = -1;
    this.hoveredObject = null; // { type: 'shape'|'tramp'|'portal', ref: object }

    // Start menu hover index for visual highlight
    this.startMenuHoverIndex = -1;

    // Reference to the specific stickman currently being edited in the Customize app
    this.selectedStickForCustomization = null;

    // Antivirus App State
    this.antivirusState = 'prompt'; // prompt, scanning, cleaning, finished
    this.antivirusProgress = 0;
    this.antivirusFoundCount = 0;
    this.antivirusHunter = null; // { x, y, targetIndex, age }

    this.virusImg = new Image();
    this.virusImg.src = './virus.png';

    // Slider dragging state
    this.activeSlider = null;

    // Double-click tracking
    this.lastClickTime = 0;
    this.lastClickPos = { x: 0, y: 0 };

    // Cursor mode / resize hover state
    this.cursorMode = 'default';
    this.resizeHoverEdge = null;

    // Weapon carried by the cursor (gun/knife only)
    this.equippedCursorWeapon = null;

    // Screen shake state (used by heavy impacts like the 10 ton weight)
    this.shakeTime = 0;
    this.shakeMag = 0;

    // Optional DOM hooks for wallpapers and Paint saving
    this.wallpaperFileInput = null;
    this.paintDownloadLink = null;

    // Impact sounds for falling objects
    try {
      this.ceramicSound = new Audio('./ceramic-hit-2.mp3');
      this.ceramicSound.volume = 0.45;
    } catch (_) {
      this.ceramicSound = null;
    }
    try {
      this.weightSound = new Audio('./metalgrass3.ogg');
      this.weightSound.volume = 0.8;
    } catch (_) {
      this.weightSound = null;
    }
    // Bomb and firework explosion sounds
    try {
      this.bombSound = new Audio('./ultrakill-big-explosion.mp3');
      this.bombSound.volume = 0.7;
    } catch (_) {
      this.bombSound = null;
    }
    try {
      this.fireworkSound = new Audio('./fireworkblast-106275.mp3');
      this.fireworkSound.volume = 0.7;
    } catch (_) {
      this.fireworkSound = null;
    }

    // Scary ambience for "virus" mode
    try {
      this.ambienceSound = new Audio('./scary-ambience-59002.mp3');
      this.ambienceSound.loop = true;
      this.ambienceSound.volume = 0.65;
    } catch (_) {
      this.ambienceSound = null;
    }

    try {
      this.glitchLoopSound = new Audio('./glitch loop e.mp3');
      this.glitchLoopSound.loop = true;
      this.glitchLoopSound.volume = 0.8;
    } catch (_) {
      this.glitchLoopSound = null;
    }

    try {
      this.screwSound = document.getElementById('screwSound');
    } catch (_) {
      this.screwSound = null;
    }

    try {
      this.tntSound = document.getElementById('tntExplosionSound');
    } catch (_) {
      this.tntSound = null;
    }

    // expose vib images to other modules (stickFigure & UI)
    this.vibHatImg = vibHatImg;
    this.vibRibbonImg = vibRibbonImg;

    this.projectLiked = false;
    this._likeCheckTimer = 0;
  }

  setWallpaperFileInput(el) {
    // Custom wallpapers have been disabled; keep reference but no behavior.
    this.wallpaperFileInput = el || null;
  }

  setPaintDownloadLink(el) {
    this.paintDownloadLink = el || null;
  }

  setAolInput(el) {
    // Wire a hidden input element for both AOL and Clippy so on-screen keyboards and focus behave correctly.
    this.aolInput = el || null;
    // Mirror for Clippy (reuse same hidden input element for both chat apps)
    this.clippyInput = el || null;

    if (!this.aolInput) return;

    // Keep AOL chatDraft in sync with the hidden input value
    this.aolInput.addEventListener('input', () => {
      const aolWin = this.getActiveAolWindow();
      if (aolWin && aolWin.appId === 'aol') {
        aolWin.chatDraft = this.aolInput.value;
      }
      // If Clippy is active, sync its draft too
      const clippyWin = this.windows.find(w => w.id === this.activeWindowId && !w.closed && !w.minimized && w.appId === 'clippy');
      if (clippyWin && clippyWin.appId === 'clippy') {
        clippyWin.clippyDraft = this.aolInput.value;
      }
    });

    // When the hidden input blurs, save drafts back into the corresponding windows.
    this.aolInput.addEventListener('blur', () => {
      const aolWin = this.getActiveAolWindow();
      if (aolWin && aolWin.appId === 'aol') {
        aolWin.chatDraft = this.aolInput.value;
      }
      const clippyWin = this.windows.find(w => w.appId === 'clippy' && !w.closed && !w.minimized);
      if (clippyWin && clippyWin.appId === 'clippy') {
        clippyWin.clippyDraft = this.aolInput.value;
      }
    });
  }

  getActiveAolWindow() {
    return this.windows.find(
      (w) =>
        w.id === this.activeWindowId &&
        !w.closed &&
        !w.minimized &&
        w.appId === 'aol'
    );
  }

  isAolActive() {
    const win = this.windows.find(
      (w) =>
        w.id === this.activeWindowId &&
        !w.closed &&
        !w.minimized &&
        w.appId === 'aol'
    );
    return !!win;
  }

  // Returns true if any AOL window is currently open (not closed/minimized),
  // regardless of whether it is the active/focused window.
  isAolOpen() {
    return this.windows.some(
      (w) =>
        w.appId === 'aol' &&
        !w.closed &&
        !w.minimized
    );
  }

  // Returns true if any Clippy helper window is currently open (not closed/minimized).
  isClippyOpen() {
    return this.windows.some(
      (w) =>
        w.appId === 'clippy' &&
        !w.closed &&
        !w.minimized
    );
  }

  getTaskbarHeight() {
    return TASKBAR_HEIGHT;
  }

  getGroundY(height) {
    // Top of the taskbar so the stickman stands directly on it
    return height - TASKBAR_HEIGHT;
  }

  findWindowByApp(appId) {
    return this.windows.find(w => w.appId === appId);
  }

  ensureWindow(appId, viewport) {
    let win = this.findWindowByApp(appId);
    if (!win) {
      win = this.spawnWindowFromIcon(appId, viewport);
    } else {
      win.minimized = false;
      win.closed = false;
      // Reset animation state so the window doesn't immediately re-close
      win.anim = { state: 'opening', t: 0, duration: 0.22 };
      this.bringToFront(win.id);
    }
    return win;
  }

  spawnWindowFromIcon(appId, viewport) {
    const icon = this.icons.find(i => i.appId === appId);
    const margin = 16;

    // Base size: larger, but clamped so it always fits on screen
    // Default window size (larger for most apps)
    let w = Math.max(WINDOW_MIN_WIDTH, viewport.width * 0.65);
    let h = Math.max(WINDOW_MIN_HEIGHT, viewport.height * 0.55);

    // Make Paint window open larger by default for more drawing space
    if (appId === 'paint') {
      w = Math.max(WINDOW_MIN_WIDTH, viewport.width * 0.8);
      h = Math.max(WINDOW_MIN_HEIGHT, viewport.height * 0.7);
    }

    // Make Tools window larger by default so its slots feel roomy (slightly narrower)
    if (appId === 'tools') {
      w = Math.max(WINDOW_MIN_WIDTH, viewport.width * 0.7);
      h = Math.max(WINDOW_MIN_HEIGHT, viewport.height * 0.72);
    }

    // Make Calculator and Minesweeper windows more compact
    if (appId === 'calculator') {
      // Calculator: smaller horizontally so it doesn't feel too wide
      w = Math.max(WINDOW_MIN_WIDTH, viewport.width * 0.22);
      h = Math.max(WINDOW_MIN_HEIGHT, viewport.height * 0.45);
    } else if (appId === 'minesweeper') {
      // Minesweeper: keep a modest size but a bit wider for the improved UI
      w = Math.max(WINDOW_MIN_WIDTH, viewport.width * 0.32);
      h = Math.max(WINDOW_MIN_HEIGHT, viewport.height * 0.48);
    } else if (appId === 'settings') {
      // Settings: open taller by default so more options are visible
      w = Math.max(WINDOW_MIN_WIDTH, viewport.width * 0.55);
      h = Math.max(WINDOW_MIN_HEIGHT, viewport.height * 0.7);
    } else if (appId === 'info') {
      // info.txt: open taller so more lines are readable without scrolling
      w = Math.max(WINDOW_MIN_WIDTH, viewport.width * 0.5);
      h = Math.max(WINDOW_MIN_HEIGHT, viewport.height * 0.7);
    } else if (appId === 'stickcustomize') {
      // Stickman Customize: Larger default size to ensure two-column layout fits
      w = Math.max(420, viewport.width * 0.75);
      h = Math.max(500, viewport.height * 0.75);
    } else if (appId === 'antivirus') {
      w = Math.max(WINDOW_MIN_WIDTH, 480);
      h = Math.max(WINDOW_MIN_HEIGHT, 340);
    }

    if (appId === 'stats') {
      // Make the Stickmen Stats window taller and a bit wider by default for better readability
      w = Math.max(WINDOW_MIN_WIDTH, 300);
      // Prefer a large fraction of the viewport height but clamp to a sensible minimum
      h = Math.max(WINDOW_MIN_HEIGHT, viewport.height * 0.75);
    }

    if (appId === 'jail') {
      w = 340;
      h = 280;
    }

    w = Math.min(w, viewport.width - margin * 2);
    h = Math.min(h, viewport.height - margin * 2 - TASKBAR_HEIGHT);

    const x = Math.max(margin, (viewport.width - w) * 0.5);
    const y = Math.max(margin, (viewport.height - h - TASKBAR_HEIGHT) * 0.25);

    const win = {
      id: nextWindowId++,
      appId,
      fixedSize: (appId === 'jail'),
      title: icon ? icon.name : appId,
      x,
      y,
      width: w,
      height: h,
      closed: false,
      minimized: false,
      // basic physics for being thrown around
      vx: 0,
      vy: 0,
      // For MS Paint-like behavior
      strokes: appId === 'paint' ? [] : null,
      // App state
      calcValue: appId === 'calculator' ? '0' : null,
      calcOp: null,
      calcMem: null,
      mineGrid: appId === 'minesweeper' ? initMinesweeper() : null,
      gameOver: false,
      // Simple Internet Explorer state (now tab-based)
      // Each tab: { id, title, url, page: 'home'|'results', query, aiResults?, loadingSearch? }
      internetTabs: appId === 'internet'
        ? [
            {
              id: 1,
              title: 'Google',
              url: 'https://web.archive.org/web/20070629074743/http://www.google.com/',
              page: 'home',
              query: '',
              aiResults: null,
              loadingSearch: false,
            },
          ]
        : null,
      internetActiveTab: appId === 'internet' ? 0 : null,
      // "My Computer" selection state
      computerSelectedDriveIndex: appId === 'computer' ? null : null,
      // AOL-style chat state
      aolSelectedBuddy: 0,
      aolConversations: appId === 'aol'
        ? [
            { name: 'Buddy', messages: [{ from: 'Buddy', text: 'Sup! Welcome back to AIM 👋', time: '3:14 PM' }], history: [{ role: 'assistant', content: 'Sup! Welcome back to AIM 👋' }] },
            { name: 'TheCursor', messages: [{ from: 'TheCursor', text: 'I see where you move.', time: '3:15 PM' }], history: [{ role: 'assistant', content: 'I see where you move.' }] },
            { name: 'Stickman_01', messages: [{ from: 'Stickman_01', text: 'Need a hand? Or a leg?', time: '3:16 PM' }], history: [{ role: 'assistant', content: 'Need a hand? Or a leg?' }] },
            { name: 'MinesweeperFan', messages: [{ from: 'MinesweeperFan', text: 'Avoid the 8s!', time: '3:17 PM' }], history: [{ role: 'assistant', content: 'Avoid the 8s!' }] },
            { name: 'XP_Guide', messages: [{ from: 'XP_Guide', text: 'Welcome to Windows XP.', time: '3:18 PM' }], history: [{ role: 'assistant', content: 'Welcome to Windows XP.' }] },
            { name: 'BlueScreen', messages: [{ from: 'BlueScreen', text: '0x0000007B...', time: '4:04 PM' }], history: [{ role: 'assistant', content: '0x0000007B...' }] },
          ]
        : null,
      chatMessages: appId === 'aol' ? [{ from: 'Buddy', text: 'Sup! Welcome back to AIM 👋', time: '3:14 PM' }] : null,
      chatHistory: appId === 'aol' ? [{ role: 'assistant', content: 'Sup! Welcome back to AIM 👋' }] : null,
      chatDraft: appId === 'aol' ? '' : null,

      // Clippy AI helper state
      clippyMessages: appId === 'clippy'
        ? [
            { from: 'Clippy', text: "It looks like you're playing with stickmen. Need any help?", time: '3:14 PM' },
          ]
        : null,
      clippyHistory: appId === 'clippy'
        ? [
            { role: 'assistant', content: "It looks like you're playing with stickmen. Need any help?" },
          ]
        : null,
      clippyDraft: appId === 'clippy' ? '' : null,
      // "My Documents" contents and selection
      folderItems: appId === 'folder'
        ? [
            ['memes.gif', '256 KB', 'GIF Image'],
            ['stickman_plan.txt', '1 KB', 'Text Document'],
            ['definitely_not_a_virus.exe', '32 KB', 'Application'],
            ['paint_sketch.bmp', '512 KB', 'Bitmap Image'],
            ['desktop_notes.rtf', '4 KB', 'Rich Text Document'],
          ]
        : null,
      selectedFolderIndex: null,
      // Settings app state
      settingsState: appId === 'settings'
        ? {
            darkTaskbar: false,
            muteToasts: false,
            muteAllSound: false,
            extraWiggle: false,
            maxStickmen20: false,
            disableEmotes: false,
            showFps: false,
            allowStickOpenApps: true,
            lowEndMode: false,
            stickFightEachOther: true,
            stickHealthBars: false,
          }
        : null,
      // animation state for open/close
      anim: { state: 'opening', t: 0, duration: 0.22 }, // seconds

      // Paint-specific state
      paintColor: appId === 'paint' ? '#000000' : null,
      paintBrushSize: appId === 'paint' ? 2 : null,
      paintTool: appId === 'paint' ? 'Pencil' : null,
      redoStack: appId === 'paint' ? [] : null,

      // Command Prompt state
      consoleLines: appId === 'console'
        ? [
            'Microsoft Windows XP [Version 5.1.2600]',
            '(C) Copyright 1985-2001 Microsoft Corp.',
            '',
            'Type /help to see a list of available commands.',
            '',
          ]
        : null,
      consoleInput: appId === 'console' ? '' : null,
      consoleScrollY: appId === 'console' ? 0 : null,
      consoleHistory: appId === 'console' ? [] : null,
      consoleHistoryIndex: appId === 'console' ? 0 : null,

      // Stickman Customize app state
      stickCustomName: appId === 'stickcustomize' ? (this.settings.stickCustomName || '') : null,
      stickCustomColor: appId === 'stickcustomize' ? (this.settings.stickCustomColor || '#111111') : null,
      stickCustomScale: appId === 'stickcustomize' ? (this.settings.stickCustomScale || 1.0) : null,
      stickCustomSpeed: appId === 'stickcustomize' ? (this.settings.stickCustomSpeed || 1.0) : null,
      stickCustomMood: appId === 'stickcustomize' ? 'neutral' : null,
      stickCustomHat: appId === 'stickcustomize' ? (this.settings.stickCustomHat || null) : null,
      stickCustomRainbow: appId === 'stickcustomize' ? (this.settings.stickCustomRainbow || false) : null,
      stickCustomDisableFace: appId === 'stickcustomize' ? (this.settings.stickCustomDisableFace || false) : null,
    };
    this.windows.push(win);
    this.bringToFront(win.id);

    // If the spawned appId is the Minecraft launcher or a Minecraft slot (mc_*), open the packaged Eaglercraft HTML
    // and set the window title to indicate Eaglercraft was launched.
    try {
      if (appId === 'mc_launcher' || (typeof appId === 'string' && appId.startsWith('mc_'))) {
        // Embed the bundled Eaglercraft HTML so Minecraft appears inside the app window.
        // Use a neutral title and ensure we do not show the placeholder.
        win.embeddedUrl = './EaglercraftX_1.8_u53_Offline_Signed.html';
        win.showEmbeddedPlaceholder = false;
        win.title = 'Minecraft';
      }
    } catch (_) {}

    return win;
  }

  bringToFront(id) {
    const idx = this.windows.findIndex(w => w.id === id);
    if (idx >= 0) {
      const [win] = this.windows.splice(idx, 1);
      this.windows.push(win);
      this.activeWindowId = id;

      // If the newly focused window is AOL or Clippy, focus the hidden input so typing works.
      // Otherwise, blur the hidden input to prevent accidental typing.
      try {
        if ((win.appId === 'aol' || win.appId === 'clippy') && this.aolInput && typeof this.aolInput.focus === 'function') {
          // Slight delay helps ensure focus works when called from click handlers
          setTimeout(() => {
            try { this.aolInput.focus(); } catch (_) {}
          }, 0);
        } else if (this.aolInput && typeof this.aolInput.blur === 'function') {
          try { this.aolInput.blur(); } catch (_) {}
        }
      } catch (err) {
        // silent
      }

      // Ensure any embedded iframe for this window (e.g. Minecraft) is visible when focused/restored
      try {
        if (typeof this._updateEmbeddedIframe === 'function') this._updateEmbeddedIframe(win);
      } catch (_) {}
    }
  }

  // removed function initMinesweeper() {}

  // removed function revealMine() {}

  hitTestIcon(x, y) {
    return this.icons.find(icon => {
      return (
        x >= icon.x &&
        x <= icon.x + ICON_SIZE &&
        y >= icon.y &&
        y <= icon.y + ICON_SIZE
      );
    });
  }

  hitTestWindow(x, y) {
    for (let i = this.windows.length - 1; i >= 0; i--) {
      const win = this.windows[i];
      if (win.closed || win.minimized) continue;
      if (
        x >= win.x &&
        x <= win.x + win.width &&
        y >= win.y &&
        y <= win.y + win.height
      ) {
        return win;
      }
    }
    return null;
  }

  hitTestShape(x, y) {
    if (!Array.isArray(this.shapes)) return null;
    // Check from top-most to bottom-most
    for (let i = this.shapes.length - 1; i >= 0; i--) {
      const s = this.shapes[i];
      if (!s) continue;

      if (s.type === 'circle') {
        const dx = x - s.x;
        const dy = y - s.y;
        const r = s.radius || 0;
        if (dx * dx + dy * dy <= r * r) {
          return s;
        }
      } else {
        const left = s.x;
        const top = s.y;
        const w = s.width || 0;
        const h = s.height || 0;
        if (x >= left && x <= left + w && y >= top && y <= top + h) {
          return s;
        }
      }
    }
    return null;
  }

  hitTestWindowTitleBar(win, x, y) {
    const barHeight = 24;
    return (
      x >= win.x &&
      x <= win.x + win.width &&
      y >= win.y &&
      y <= win.y + barHeight
    );
  }

  hitTestWindowCloseButton(win, x, y) {
    const barHeight = 24;
    const size = 16;
    const bx = win.x + win.width - size - 6;
    const by = win.y + 4;
    return (
      x >= bx &&
      x <= bx + size &&
      y >= by &&
      y <= by + size
    );
  }

  // Minimize button for all windows
  hitTestWindowMinButton(win, x, y) {
    const size = 16;
    const by = win.y + 4;
    const closeBx = win.x + win.width - size - 6;
    const fullBx = closeBx - size - 4;
    const bx = fullBx - size - 4;
    return (
      x >= bx &&
      x <= bx + size &&
      y >= by &&
      y <= by + size
    );
  }

  // Extra title-bar button for app-level fullscreen (now used for all apps)
  hitTestWindowFullButton(win, x, y) {
    const barHeight = 24;
    const size = 16;
    // Fullscreen button sits just to the left of the close button
    const closeBx = win.x + win.width - size - 6;
    const bx = closeBx - size - 4;
    const by = win.y + 4;

    return (
      x >= bx &&
      x <= bx + size &&
      y >= by &&
      y <= by + size
    );
  }

  // Toggle a window into an app-level fullscreen (maximized) mode and back.
  toggleAppFullscreen(win, { width, height }) {
    if (!win) return;

    const maxWidth = width;
    const maxHeight = height - TASKBAR_HEIGHT;

    if (!win.isAppFullscreen) {
      // Enter fullscreen: remember previous rect first
      win.appFullscreenPrev = {
        x: win.x,
        y: win.y,
        width: win.width,
        height: win.height,
      };
      win.x = 0;
      win.y = 0;
      win.width = maxWidth;
      win.height = maxHeight;
      win.isAppFullscreen = true;
    } else if (win.appFullscreenPrev) {
      // Restore from fullscreen
      win.x = win.appFullscreenPrev.x;
      win.y = win.appFullscreenPrev.y;
      win.width = win.appFullscreenPrev.width;
      win.height = win.appFullscreenPrev.height;
      win.isAppFullscreen = false;
    }
  }

  update(dt, { width, height, input, stick, sticks }) {
    // Expose current stickmen so apps like Stickman Customize can modify them.
    this.sticks = Array.isArray(sticks) ? sticks : [];

    // Clean up customization reference if the stickman was deleted
    if (this.selectedStickForCustomization && !this.sticks.includes(this.selectedStickForCustomization)) {
      this.selectedStickForCustomization = null;
    }

    // Age and auto-clear toast notifications
    if (this.toast) {
      this.toast.age = (this.toast.age || 0) + dt;
      if (this.toast.age >= (this.toast.ttl || 0)) {
        this.toast = null;
      }
    }

    // Update Slider Dragging
    if (this.activeSlider && input.pointerDown) {
      const s = this.activeSlider;
      const t = Math.max(0, Math.min(1, (input.cursor.x - s.entryX) / s.controlW));
      if (s.key === 'scale') {
        const newScale = 0.4 + t * 2.0;
        s.win.stickCustomScale = newScale;
        if (s.targetStick) {
          s.targetStick.scale = newScale;
          s.targetStick.initRagdoll(s.targetStick.pos.x, s.targetStick.pos.y);
        }
        if (s.targetStick === (Array.isArray(this.sticks) ? this.sticks[0] : null) && this.settings) {
          this.settings.stickCustomScale = newScale;
        }
      } else if (s.key === 'speed') {
        const newSpeed = 0.2 + t * 2.8;
        s.win.stickCustomSpeed = newSpeed;
        if (s.targetStick) s.targetStick.speedScale = newSpeed;
        if (s.targetStick === (Array.isArray(this.sticks) ? this.sticks[0] : null) && this.settings) {
          this.settings.stickCustomSpeed = newSpeed;
        }
      }
    } else {
      this.activeSlider = null;
    }

    // Update Quick Tip notification
    if (this.quickTip && this.quickTip.visible) {
      this.quickTip.age += dt;
      if (this.quickTip.age >= this.quickTip.ttl) {
        this.quickTip.visible = false;
      }

      // Check for manual dismiss click
      if (input && input.justClicked) {
        const q = this.quickTip;
        const qx = width - q.width - 15;
        const qy = 15;
        const closeSize = 20;
        const closeX = qx + q.width - closeSize - 4;
        const closeY = qy + 4;
        
        if (input.cursor.x >= closeX && input.cursor.x <= closeX + closeSize &&
            input.cursor.y >= closeY && input.cursor.y <= closeY + closeSize) {
          this.quickTip.visible = false;
        }
      }
    }

    // Screen shake timer
    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      if (this.shakeTime < 0) this.shakeTime = 0;
    }

    // Polling for like status to unlock special tools
    if (typeof websim !== 'undefined' && typeof websim.isProjectLiked === 'function') {
      this._likeCheckTimer -= dt;
      if (this._likeCheckTimer <= 0) {
        websim.isProjectLiked().then(liked => {
           this.projectLiked = liked;
        });
        this._likeCheckTimer = 3.0; // Check every 3 seconds
      }
    }

    // While the virus is active, count down to a fake system crash and kill stickmen
    if (this.glitchActive && !this.crashed && this.crashTimer > 0) {
      this.crashTimer -= dt;

      // Infect and kill all active stickmen during the virus run
      if (Array.isArray(this.sticks)) {
        this.sticks.forEach((st) => {
          if (!st.dead) {
            // Continuous damage during the virus (dead within ~8 seconds)
            st.health -= dt * 15;
            st.hitFlashTimer = 0.1;
            if (st.health <= 0) {
              st.health = 0;
              st.dead = true;
              st.setState('ragdoll');
              st.mood = 'scared';
              st.showEmote('💀', 2.0);
              // Ensure they stay on screen during the glitch
              st.deathTimer = 15.0;
            }
          }
        });
      }

      if (this.crashTimer <= 0) {
        this._triggerSystemCrash(width, height);
      }
    }

    // While crash screen is visible, count down to reset
    if (this.crashed && this.crashDisplayTimer > 0) {
      this.crashDisplayTimer -= dt;
      if (this.crashDisplayTimer <= 0 && this.needsResetAfterCrash) {
        this._resetAfterCrash();
      }
    }

    // Antivirus Hunter Logic
    const avWin = this.windows.find(w => w.appId === 'antivirus' && !w.closed && !w.minimized);
    if (avWin) {
      if (this.antivirusState === 'scanning') {
        this.antivirusProgress += dt * 0.4;
        if (this.antivirusProgress >= 1) {
          this.antivirusProgress = 1;
          this.antivirusState = 'cleaning';
          this.antivirusFoundCount = this.sticks ? this.sticks.length : 0;
          this.antivirusHunter = { x: avWin.x + avWin.width / 2, y: avWin.y + avWin.height / 2, age: 0 };
        }
      } else if (this.antivirusState === 'cleaning') {
        if (this.antivirusHunter) {
          this.antivirusHunter.age += dt;
          if (Array.isArray(this.sticks) && this.sticks.length > 0) {
            const target = this.sticks[0];
            const body = (target.points && target.points[1]) ? target.points[1] : target.pos;
            if (body) {
              const dx = body.x - this.antivirusHunter.x;
              const dy = body.y - this.antivirusHunter.y;
            const dist = Math.hypot(dx, dy);
            const speed = 450;
            if (dist > 5) {
              this.antivirusHunter.x += (dx / dist) * speed * dt;
              this.antivirusHunter.y += (dy / dist) * speed * dt;
            }
              if (dist < 30) {
                target.markedForRemoval = true;
                this.startScreenShake(0.1, 5);
              }
            }
          } else {
            this.antivirusState = 'finished';
            this.antivirusHunter = null;
          }
        }
      } else if (this.antivirusState === 'finished') {
        // Automatically close app after success message
        avWin.autoCloseTimer = (avWin.autoCloseTimer || 0) + dt;
        if (avWin.autoCloseTimer > 2.5) {
          avWin.anim = { state: 'closing', t: 0, duration: 0.18 };
          this.antivirusState = 'prompt'; // reset for next run
          this.antivirusProgress = 0;
        }
      }
    } else {
       // Reset if window closed
       if (this.antivirusState !== 'finished') {
         this.antivirusState = 'prompt';
         this.antivirusProgress = 0;
         this.antivirusHunter = null;
       }
    }

    // Glitch mode: age and spawn random fake error popups
    if (Array.isArray(this.errorPopups)) {
      for (let i = this.errorPopups.length - 1; i >= 0; i--) {
        const p = this.errorPopups[i];
        p.age += dt;
        if (p.age >= p.ttl) {
          this.errorPopups.splice(i, 1);
        }
      }
    }

    if (this.glitchActive) {
      this.glitchIntensity = Math.min(1.5, this.glitchIntensity + dt * 0.1);

      // Spawn new popups at an aggressive rate while glitching
      const spawnRate = 1.8 + this.glitchIntensity * 2.5;
      if (Math.random() < dt * spawnRate) {
        this._spawnErrorPopup(width, height);
      }

      // Keep a subtle, constant shake while glitching
      if (!this.shakeTime || this.shakeTime < 0.05) {
        this.startScreenShake(0.15, 4 + this.glitchIntensity * 4);
      }
    } else {
      this.glitchIntensity = Math.max(0, this.glitchIntensity - dt * 0.25);
    }

    // Maintain scary ambience and glitch loop while virus is active
    const muted = !!(this.settings && this.settings.muteAllSound);
    
    if (this.ambienceSound) {
      if (this.glitchActive && !muted) {
        if (this.ambienceSound.paused) {
          this.ambienceSound.currentTime = 0;
          this.ambienceSound.play().catch(() => {});
        }
      } else if (!this.ambienceSound.paused) {
        this.ambienceSound.pause();
      }
    }

    if (this.glitchLoopSound) {
      if (this.glitchActive && !muted) {
        if (this.glitchLoopSound.paused) {
          this.glitchLoopSound.currentTime = 0;
          this.glitchLoopSound.play().catch(() => {});
        }
      } else if (!this.glitchLoopSound.paused) {
        this.glitchLoopSound.pause();
      }
    }

    // Update hover states for icons and taskbar buttons for better UI feedback
    if (input && input.cursor) {
      const cx = input.cursor.x;
      const cy = input.cursor.y;
      this.lastHoverIcon = this.hitTestIcon(cx, cy);
      // Compute which taskbar button (if any) is hovered, reusing existing hit test
      this.taskbarHoverWindow = this.hitTestTaskbarButton(cx, cy, { width, height });

      // Generic object hover detection
      this.hoveredObject = null;
      const sHit = this.hitTestShape(cx, cy);
      if (sHit) {
        this.hoveredObject = { type: 'shape', ref: sHit };
      } else {
        const tHit = this.hitTestTrampoline(cx, cy);
        if (tHit) {
          this.hoveredObject = { type: 'tramp', ref: tHit };
        } else {
          const sawHit = this.hitTestSawblade(cx, cy);
          if (sawHit) {
            this.hoveredObject = { type: 'sawblade', ref: sawHit };
          }
        }
      }

      // Context menu row hover
      if (this.contextMenu) {
        const cm = this.contextMenu;
        const menuW = 140;
        const rowH = 26;
        const menuH = (cm.type === 'shape') ? rowH * 3 : rowH;
        if (cx >= cm.x && cx <= cm.x + menuW && cy >= cm.y && cy <= cm.y + menuH) {
          this.contextMenuHoverIndex = Math.floor((cy - cm.y) / rowH);
        } else {
          this.contextMenuHoverIndex = -1;
        }
      }

      // Minesweeper hover: track which cell the cursor is over so we can highlight it.
      this.windows.forEach((win) => {
        if (win.appId === 'minesweeper' && win.mineGrid) {
          const barHeight = 24;
          const innerPad = 8;
          const contentX = win.x + innerPad;
          const contentY = win.y + barHeight + innerPad;
          const contentW = win.width - innerPad * 2;
          const contentH = win.height - barHeight - innerPad * 2;

          const cell = 20;
          const boardPad = 10;
          const headerH = 34;

          const headerX = contentX + boardPad;
          const headerY = contentY + boardPad;
          const headerW = contentW - boardPad * 2;

          const boardX = headerX;
          const boardY = headerY + headerH + 8;
          const boardW = GRID_SIZE * cell;
          const boardH = GRID_SIZE * cell;

          if (
            cx >= boardX &&
            cx < boardX + boardW &&
            cy >= boardY &&
            cy < boardY + boardH &&
            !win.gameOver
          ) {
            const gx = Math.floor((cx - boardX) / cell);
            const gy = Math.floor((cy - boardY) / cell);
            if (gx >= 0 && gx < GRID_SIZE && gy >= 0 && gy < GRID_SIZE) {
              win.mineHover = { c: gx, r: gy };
            } else {
              win.mineHover = null;
            }
          } else {
            win.mineHover = null;
          }
        }
      });

      // Update hover slot for Tools window so we can show tooltips
      this.windows.forEach((win) => {
        if (win.appId === 'tools' && !win.closed && !win.minimized) {
          const slots = getToolsSlots(win, this);
          let hover = null;
          const scrollY = typeof win.toolsScrollY === 'number' ? win.toolsScrollY : 0;
          const adjustedY = cy + scrollY;
          for (const slot of slots) {
            if (
              cx >= slot.x &&
              cx <= slot.x + slot.w &&
              adjustedY >= slot.y &&
              adjustedY <= slot.y + slot.h
            ) {
              hover = slot;
              break;
            }
          }
          win.toolsHoverSlot = hover;
        }
      });

      // Update resize-hover edge & cursor mode when not dragging/resizing
      let hoverEdge = null;
      if (!input.pointerDown && !this.resizingWindow) {
        const winHit = this.hitTestWindow(cx, cy);
        if (winHit) {
          hoverEdge = this.hitTestWindowResizeEdge(winHit, cx, cy);
        }
      }
      this.resizeHoverEdge = hoverEdge;

      if (this.resizingWindow && this.resizeEdge) {
        // While actively resizing, keep appropriate resize cursor
        this.cursorMode = this._cursorModeFromEdge(this.resizeEdge);
      } else if (hoverEdge) {
        this.cursorMode = this._cursorModeFromEdge(hoverEdge);
      } else {
        this.cursorMode = 'default';
      }
    } else {
      this.lastHoverIcon = null;
      this.taskbarHoverWindow = null;
      this.resizeHoverEdge = null;
      this.cursorMode = 'default';
    }

    // Mark icons as hovered or not (used in drawIcon)
    this.icons.forEach(icon => {
      icon._hover = (icon === this.lastHoverIcon);
    });

    // Icon / shape dragging starts only after a small movement from the initial click
    if (
      input.pointerDown &&
      !this.draggingWindow &&
      !this.draggingIcon &&
      !this.draggingShape &&
      input.dragStart
    ) {
      const start = input.dragStart;
      const { x, y } = input.cursor;
      const dx = x - start.x;
      const dy = y - start.y;
      const distSq = dx * dx + dy * dy;
      const DRAG_THRESHOLD_SQ = 9; // 3px movement before starting a drag

      if (distSq > DRAG_THRESHOLD_SQ) {
        // Icons take priority over shapes/trampolines
        const icon = this.hitTestIcon(start.x, start.y);
        if (icon && !icon.fixed) {
          this.draggingIcon = icon;
          this.iconDragOffset.x = start.x - icon.x;
          this.iconDragOffset.y = start.y - icon.y;
        } else {
          const shape = this.hitTestShape(start.x, start.y);
          if (shape && !shape.locked) {
            this.draggingShape = shape;
            if (shape.type === 'circle') {
              this.shapeDragOffset.x = start.x - shape.x;
              this.shapeDragOffset.y = start.y - shape.y;
            } else {
              this.shapeDragOffset.x = start.x - shape.x;
              this.shapeDragOffset.y = start.y - shape.y;
            }
            this.lastCursorForShape = { x: start.x, y: start.y };
          } else {
            // Try trampolines and sawblades last (allow grabbing/moving them)
            // Check for shapes/trampolines/sawblades in that order
            const shape = this.hitTestShape(start.x, start.y);
            if (shape) {
              this.draggingShape = shape;
              if (shape.type === 'circle') {
                this.shapeDragOffset.x = start.x - shape.x;
                this.shapeDragOffset.y = start.y - shape.y;
              } else {
                this.shapeDragOffset.x = start.x - shape.x;
                this.shapeDragOffset.y = start.y - shape.y;
              }
              this.lastCursorForShape = { x: start.x, y: start.y };
            } else {
              const tramp = this.hitTestTrampoline(start.x, start.y);
              if (tramp) {
                this.draggingTrampoline = tramp;
                this.trampolineDragOffset.x = start.x - tramp.x;
                this.trampolineDragOffset.y = start.y - tramp.y;
              } else {
                // sawblades are circular; allow grabbing them like trampolines/shapes
                const saw = this.hitTestSawblade(start.x, start.y);
                if (saw) {
                  this.draggingSawblade = saw;
                  this.sawbladeDragOffset.x = start.x - saw.x;
                  this.sawbladeDragOffset.y = start.y - saw.y;
                  this.sawbladeLastCursor = { x: start.x, y: start.y };
                }
              }
            }
          }
        }
      }
    }

    // Handle right-click:
    // 1) If holding the gun on the cursor, fire it toward the nearest stickman.
    // 2) Otherwise, open the context menu for shapes/trampolines/portals.
    if (input.rightClicked) {
      const { x, y } = input.cursor;

      if (this.equippedCursorWeapon && this.equippedCursorWeapon.type === 'gun' && Array.isArray(sticks) && sticks.length) {
        this.fireCursorGun(sticks, { x, y });
      } else {
        // Try shapes first (top-most)
        const s = this.hitTestShape(x, y);
        let cmData = null;
        if (s) {
          cmData = { type: 'shape', ref: s };
        } else {
          const t = this.hitTestTrampoline(x, y);
          if (t) {
            cmData = { type: 'trampoline', ref: t };
          } else {
            const p = this.portals.find(pi => x >= pi.x && x <= pi.x + pi.width && y >= pi.y && y <= pi.y + pi.height);
            if (p) cmData = { type: 'portal', ref: p };
          }
        }

        if (cmData) {
          // Clamp and store menu positions immediately so interaction matches drawing
          const menuW = 140;
          const rowH = 26;
          const menuH = (cmData.type === 'shape') ? rowH * 3 : rowH;
          const mx = Math.min(width - menuW - 8, Math.max(8, x));
          const my = Math.min(height - TASKBAR_HEIGHT - menuH - 8, Math.max(8, y));
          this.contextMenu = { ...cmData, x: mx, y: my };
        } else {
          this.contextMenu = null;
        }
      }
    }

    // Track hover over Start menu items so they can be highlighted
    if (this.showStartMenu) {
      const { x, y } = input.cursor;
      const menu = this.getStartMenuRect(width, height);
      const items = this.getStartMenuItems();
      const itemHeight = 22;
      const topOffset = 40;

      if (
        x >= menu.x &&
        x <= menu.x + menu.width &&
        y >= menu.y + topOffset &&
        y <= menu.y + menu.height
      ) {
        const localY = y - menu.y - topOffset;
        const index = Math.floor(localY / itemHeight);
        if (index >= 0 && index < items.length) {
          this.startMenuHoverIndex = index;
        } else {
          this.startMenuHoverIndex = -1;
        }
      } else {
        this.startMenuHoverIndex = -1;
      }
    } else {
      this.startMenuHoverIndex = -1;
    }

    // Handle left-click interactions (simple interactions)
    if (input.justClicked) {
      // If a context menu is open, check clicks against it
      if (this.contextMenu) {
        const menuX = this.contextMenu.x;
        const menuY = this.contextMenu.y;
        const menuW = 140;
        const rowH = 26;
        const cm = this.contextMenu;
        const menuH = (cm.type === 'shape') ? rowH * 3 : rowH;
        
        // If clicked inside menu
        if (
          input.cursor.x >= menuX &&
          input.cursor.x <= menuX + menuW &&
          input.cursor.y >= menuY &&
          input.cursor.y <= menuY + menuH
        ) {
          const clickedRow = Math.floor((input.cursor.y - menuY) / rowH);
          
          if (clickedRow === 0) {
            // Delete
            if (cm.type === 'shape') {
              const idx = this.shapes.indexOf(cm.ref);
              if (idx >= 0) this.shapes.splice(idx, 1);
            } else if (cm.type === 'trampoline') {
              const idx = this.trampolines.indexOf(cm.ref);
              if (idx >= 0) this.trampolines.splice(idx, 1);
            } else if (cm.type === 'portal') {
              const idx = this.portals.indexOf(cm.ref);
              if (idx >= 0) this.portals.splice(idx, 1);
            }
            this.showToast('Deleted', 1.2);
          } else if (clickedRow === 1 && cm.type === 'shape') {
            // Toggle Float
            cm.ref.floating = !cm.ref.floating;
            if (cm.ref.floating) cm.ref.locked = false;
            this.showToast(cm.ref.floating ? 'Floating Enabled' : 'Gravity Enabled', 1.2);
          } else if (clickedRow === 2 && cm.type === 'shape') {
            // Toggle Lock
            cm.ref.locked = !cm.ref.locked;
            if (cm.ref.locked) cm.ref.floating = false;
            this.showToast(cm.ref.locked ? 'Block Locked' : 'Block Unlocked', 1.2);
          }
          
          this.contextMenu = null;
          return;
        } else {
          // Clicked elsewhere: close context menu and continue processing the click
          this.contextMenu = null;
        }
      }

      // Any new click cancels an old drag so weapons can be selected again
      this.draggingWeapon = null;

      const { x, y } = input.cursor;

      // Double-click detection
      const now = performance.now();
      const DOUBLE_CLICK_MS = 300;
      let isDoubleClick = false;
      if (this.lastClickTime && now - this.lastClickTime < DOUBLE_CLICK_MS) {
        const dx = x - this.lastClickPos.x;
        const dy = y - this.lastClickPos.y;
        if (dx * dx + dy * dy < 25) {
          isDoubleClick = true;
        }
      }
      this.lastClickTime = now;
      this.lastClickPos = { x, y };

      // Stickman selection for customization: prioritizes stickmen over windows/icons on double-click
      if (isDoubleClick) {
        const custWin = this.findWindowByApp('stickcustomize');
        const statsWin = this.findWindowByApp('stats');
        const isCustOpen = custWin && !custWin.closed && !custWin.minimized;
        const isStatsOpen = statsWin && !statsWin.closed && !statsWin.minimized;

        if ((isCustOpen || isStatsOpen) && Array.isArray(sticks)) {
          let hitStick = null;
          // Check backwards to hit top-most drawn stickman
          for (let i = sticks.length - 1; i >= 0; i--) {
            const s = sticks[i];
            const body = s.points && s.points[1] ? s.points[1] : s.pos;
            if (body && Math.hypot(x - body.x, y - body.y) < 55) {
              hitStick = s;
              break;
            }
          }

          if (hitStick) {
            this.selectedStickForCustomization = hitStick;
            // Sync app window state with selected stick if Customize app is open
            if (custWin) {
              custWin.stickCustomName = hitStick.name || '';
              custWin.stickCustomColor = hitStick.color;
              custWin.stickCustomScale = hitStick.scale;
              custWin.stickCustomSpeed = hitStick.speedScale;
              custWin.stickCustomMood = hitStick.customMood || 'neutral';
              custWin.stickCustomHat = hitStick.hat || null;
              custWin.stickCustomRainbow = !!hitStick.isRainbow;
              custWin.stickCustomDisableFace = !!hitStick.hideFace;
              this.bringToFront(custWin.id);
            }
            if (statsWin) {
              this.bringToFront(statsWin.id);
            }
            this.showToast('Stickman selected', 1.2);
            this.showStartMenu = false;
            return; // handled selection
          }
        }
      }

      // If cursor is holding a weapon (gun/knife), allow handing it to a stick
      // or dropping it via double-click before other click interactions.
      if (this.equippedCursorWeapon) {
        if (isDoubleClick) {
          // Double-click while holding a gun drops it as a world item
          if (this.equippedCursorWeapon.type === 'gun') {
            const currentItemCount = this.shapes.length + this.trampolines.length + this.sawblades.length + this.portals.length + this.guns.length;
            const maxItems = this.settings.maxItems500 ? 500 : 80;

            if (currentItemCount >= maxItems) {
              this.showToast(`Object limit reached (${maxItems})`, 1.5);
              this.equippedCursorWeapon = null;
              return;
            }

            const gw = 26;
            const gh = 14;
            const gx = x - gw / 2;
            const gy = y - gh / 2;
            const clampedX = Math.max(4, Math.min(gx, width - gw - 4));
            const maxTop = height - TASKBAR_HEIGHT - gh - 4;
            const clampedY = Math.max(8, Math.min(gy, maxTop));
            this.guns.push({
              type: 'gunItem',
              kind: 'gun',
              x: clampedX,
              y: clampedY,
              width: gw,
              height: gh,
              vx: 0,
              vy: 0,
            });
          }
          // Remove from cursor either way
          this.equippedCursorWeapon = null;
          return;
        }

        if (this.equippedCursorWeapon.type === 'screw') {
          const hit = this.hitTestShape(x, y) || this.hitTestTrampoline(x, y) || this.hitTestSawblade(x, y);
          if (hit) {
            if (!this.screwFirstTarget) {
              this.screwFirstTarget = hit;
              this.showToast('First object selected. Click another to screw them together.', 3.0);
              return;
            } else {
              if (this.screwFirstTarget === hit) return;
              
              // Permanent constraint
              const getC = (obj) => {
                if (obj.type === 'circle' || obj.type === 'bouncyball' || obj.type === 'sawblade') return { x: obj.x, y: obj.y };
                return { x: obj.x + (obj.width || 0) / 2, y: obj.y + (obj.height || 0) / 2 };
              };
              const c1 = getC(this.screwFirstTarget);
              const c2 = getC(hit);
              
              this.screws.push({
                objA: this.screwFirstTarget,
                objB: hit,
                distance: Math.hypot(c2.x - c1.x, c2.y - c1.y)
              });
              
              if (this.screwSound && !this.settings.muteAllSound) {
                this.screwSound.currentTime = 0;
                this.screwSound.play();
              }
              this.showToast('Objects attached!', 1.5);
              this.screwFirstTarget = null;
              this.equippedCursorWeapon = null;
              return;
            }
          }
        }

        if (Array.isArray(sticks) && sticks.length > 0) {
          let bestStick = null;
          let bestDist = Infinity;
          sticks.forEach((s) => {
            const body = s.points && s.points[1] ? s.points[1] : s.pos;
            if (!body) return;
            const d = Math.hypot(body.x - x, body.y - y);
            if (d < bestDist) {
              bestDist = d;
              bestStick = s;
            }
          });

          if (bestStick && bestDist < 50) {
            bestStick.weapon = this.equippedCursorWeapon.type;
            this.equippedCursorWeapon = null;
            return;
          }
        }
      }

      // Check Start button click first
      if (this.hitTestStartButton(x, y, { width, height })) {
        this.handleStartButton(width, height);
        return;
      }

      // If start menu is open, handle its interactions first
      if (this.showStartMenu) {
        const handled = this.handleStartMenuClick(x, y, { width, height }, isDoubleClick);
        if (handled) {
          return;
        }
      }

      // Fullscreen button (far-right of taskbar)
      if (this.hitTestFullScreenButton && this.hitTestFullScreenButton(x, y, { width, height })) {
        // Toggle fullscreen for the document root
        this.toggleFullScreen && this.toggleFullScreen();
        this.showStartMenu = false;
        return;
      }

      // Taskbar buttons (open/minimize windows)
      const tbWin = this.hitTestTaskbarButton(x, y, { width, height });
      if (tbWin) {
        if (tbWin.minimized) {
          tbWin.minimized = false;
          tbWin.closed = false;
          this.bringToFront(tbWin.id);
        } else if (this.activeWindowId === tbWin.id) {
          tbWin.minimized = true;
          // Immediately update any embedded iframe visibility when minimized
          try { if (typeof this._updateEmbeddedIframe === 'function') this._updateEmbeddedIframe(tbWin); } catch (_) {}
        } else {
          this.bringToFront(tbWin.id);
        }
        this.showStartMenu = false;
        return;
      }

      // Window close / fullscreen buttons take priority
      const winHit = this.hitTestWindow(x, y);
      if (winHit && this.hitTestWindowTitleBar(winHit, x, y)) {
        if (this.hitTestWindowCloseButton(winHit, x, y)) {
          // start closing animation instead of immediate close
          if (!winHit.anim || winHit.anim.state !== 'closing') {
            winHit.anim = { state: 'closing', t: 0, duration: 0.18 };
          }
          this.showStartMenu = false;
        } else if (this.hitTestWindowFullButton(winHit, x, y)) {
          // Toggle app-level fullscreen for supported apps (e.g. Paint)
          this.toggleAppFullscreen(winHit, { width, height });
          this.showStartMenu = false;
        } else if (this.hitTestWindowMinButton(winHit, x, y)) {
          winHit.minimized = true;
          // Hide embedded iframe immediately when window is minimized
          try { if (typeof this._updateEmbeddedIframe === 'function') this._updateEmbeddedIframe(winHit); } catch (_) {}
          this.showStartMenu = false;
        } else if (isDoubleClick) {
          // Double-click title bar to toggle app fullscreen/maximize
          this.toggleAppFullscreen(winHit, { width, height });
          this.showStartMenu = false;
        } else {
          // Start dragging
          this.draggingWindow = winHit;
          this.dragOffset.x = x - winHit.x;
          this.dragOffset.y = y - winHit.y;
          // stop any physics motion while user drags the window directly
          winHit.vx = 0;
          winHit.vy = 0;
          this.bringToFront(winHit.id);
          this.showStartMenu = false;
        }
      } else if (winHit) {
        // Check for edge/corner resize before generic content interaction
        const edge = this.hitTestWindowResizeEdge(winHit, x, y);
        if (edge && !winHit.fixedSize) {
          this.resizingWindow = winHit;
          this.resizeEdge = edge;
          this.resizeStart = {
            x: winHit.x,
            y: winHit.y,
            width: winHit.width,
            height: winHit.height,
            cursorX: x,
            cursorY: y,
          };
          this.bringToFront(winHit.id);
          this.showStartMenu = false;
        } else {
          this.bringToFront(winHit.id);
          this.showStartMenu = false;
          this.handleAppInteraction(winHit, x, y, input, { width, height });
        }
      } else {
        // Icon click: open app only on double-click; dragging uses pointerDown+move
        const icon = this.hitTestIcon(x, y);
        if (icon) {
          if (isDoubleClick) {
            this.ensureWindow(icon.appId, { width, height });
            const existing = this.findWindowByApp(icon.appId);
            if (existing) this.bringToFront(existing.id);
          }
        } else {
          this.activeWindowId = null;
        }
        this.showStartMenu = false;
      }
    }

    // Drag window
    if (this.draggingWindow && input.pointerDown) {
      const { x, y } = input.cursor;
      const win = this.draggingWindow;
      win.x = Math.max(4, Math.min(width - win.width - 4, x - this.dragOffset.x));
      win.y = Math.max(4, Math.min(height - TASKBAR_HEIGHT - win.height - 4, y - this.dragOffset.y));
    } else {
      this.draggingWindow = null;
    }

    // Resize window
    if (this.resizingWindow && input.pointerDown) {
      const { x, y } = input.cursor;
      const win = this.resizingWindow;
      const edge = this.resizeEdge;
      const start = this.resizeStart;
      const minW = WINDOW_MIN_WIDTH;
      const minH = WINDOW_MIN_HEIGHT;

      // Right edge
      if (edge && edge.right) {
        let newW = start.width + (x - start.cursorX);
        newW = Math.max(minW, Math.min(newW, width - start.x - 4));
        win.width = newW;
      }
      // Bottom edge
      if (edge && edge.bottom) {
        let newH = start.height + (y - start.cursorY);
        newH = Math.max(
          minH,
          Math.min(newH, height - TASKBAR_HEIGHT - start.y - 4)
        );
        win.height = newH;
      }
      // Left edge
      if (edge && edge.left) {
        let dx = x - start.cursorX;
        let newX = start.x + dx;
        let newW = start.width - dx;
        if (newW < minW) {
          const diff = minW - newW;
          newX -= diff;
          newW = minW;
        }
        if (newX < 4) {
          const diff = 4 - newX;
          newX = 4;
          newW -= diff;
          if (newW < minW) newW = minW;
        }
        win.x = newX;
        win.width = newW;
      }
      // Top edge (keep above taskbar)
      if (edge && edge.top) {
        let dy = y - start.cursorY;
        let newY = start.y + dy;
        let newH = start.height - dy;
        if (newH < minH) {
          const diff = minH - newH;
          newY -= diff;
          newH = minH;
        }
        if (newY < 4) {
          const diff = 4 - newY;
          newY = 4;
          newH -= diff;
          if (newH < minH) newH = minH;
        }
        // Also ensure bottom doesn't go behind taskbar
        if (newY + newH > height - TASKBAR_HEIGHT - 4) {
          newH = height - TASKBAR_HEIGHT - 4 - newY;
          if (newH < minH) {
            newH = minH;
            newY = height - TASKBAR_HEIGHT - 4 - newH;
            if (newY < 4) newY = 4;
          }
        }
        win.y = newY;
        win.height = newH;
      }
    } else {
      this.resizingWindow = null;
      this.resizeEdge = null;
    }

    // Drag icon handling
    if (this.draggingIcon && input.pointerDown) {
      const { x, y } = input.cursor;
      const icon = this.draggingIcon;
      // Constrain while dragging so the icon never goes into the taskbar area
      const maxY = Math.max(8, height - TASKBAR_HEIGHT - ICON_SIZE - 4);
      icon.x = Math.max(4, Math.min(width - ICON_SIZE - 4, x - this.iconDragOffset.x));
      icon.y = Math.max(8, Math.min(maxY, y - this.iconDragOffset.y));
    } else if (this.draggingIcon && !input.pointerDown) {
      // On release: check for deletion if allowed, then snap to grid
      const icon = this.draggingIcon;
      let deleted = false;
      if (this.settings.allowAppDeletion && !icon.fixed) {
        const cx = icon.x + ICON_SIZE / 2;
        const cy = icon.y + ICON_SIZE / 2;
        if (this._isOverRecycleBin(cx, cy)) {
          const idx = this.icons.indexOf(icon);
          if (idx >= 0) {
            this.icons.splice(idx, 1);
            this.showToast(`Deleted ${icon.name}`, 1.5);
            deleted = true;
          }
        }
      }
      if (!deleted && !icon.fixed) {
        snapIconToGrid(icon, this.icons, width, height, this.settings.mobileFriendly ? 1.4 : 1.0);
      }
      this.draggingIcon = null;
    }

    // Drag shape handling (user can grab and throw shapes)
    if (this.draggingShape && input.pointerDown) {
      const { x, y } = input.cursor;
      const shape = this.draggingShape;

      // While dragging, freeze velocity so physics doesn't fight the cursor
      shape.vx = 0;
      shape.vy = 0;

      if (shape.type === 'circle') {
        const cx = x - this.shapeDragOffset.x;
        const cy = y - this.shapeDragOffset.y;
        const r = shape.radius || 0;
        // Keep circle fully on-screen above taskbar
        shape.x = Math.max(r + 4, Math.min(width - r - 4, cx));
        const maxTop = height - TASKBAR_HEIGHT - r - 4;
        shape.y = Math.max(r + 4, Math.min(maxTop, cy));
      } else {
        const w = shape.width || 0;
        const h = shape.height || 0;
        let sx = x - this.shapeDragOffset.x;
        let sy = y - this.shapeDragOffset.y;
        sx = Math.max(4, Math.min(width - w - 4, sx));
        const maxTop = height - TASKBAR_HEIGHT - h - 4;
        sy = Math.max(8, Math.min(maxTop, sy));
        shape.x = sx;
        shape.y = sy;
      }

      // Snap to grid if floating
      if (shape.floating) {
        const grid = 20;
        shape.x = Math.round(shape.x / grid) * grid;
        shape.y = Math.round(shape.y / grid) * grid;
      }

      // Track last cursor position for throw velocity
      if (!this.lastCursorForShape) {
        this.lastCursorForShape = { x, y };
      } else {
        this.lastCursorForShape.x = x;
        this.lastCursorForShape.y = y;
      }
    } else if (this.draggingShape && !input.pointerDown) {
      // On release: either delete if dropped on Recycle Bin, or give throw velocity
      const shape = this.draggingShape;
      const cursor = input.cursor;

      // Check if the shape was dropped over the Recycle Bin; delete instead of throwing
      let deletedViaRecycle = false;
      const centerX =
        shape.type === 'circle' || shape.type === 'bouncyball'
          ? shape.x
          : shape.x + (shape.width || 0) / 2;
      const centerY =
        shape.type === 'circle' || shape.type === 'bouncyball'
          ? shape.y
          : shape.y + (shape.height || 0) / 2;

      if (this._isOverRecycleBin(centerX, centerY)) {
        const idx = this.shapes.indexOf(shape);
        if (idx >= 0) this.shapes.splice(idx, 1);
        this.showToast && this.showToast('Item moved to Recycle Bin', 1.4);
        deletedViaRecycle = true;
      }

      if (!deletedViaRecycle && this.lastCursorForShape) {
        const dx = cursor.x - this.lastCursorForShape.x;
        const dy = cursor.y - this.lastCursorForShape.y;
        // Scale by dt to approximate a per-second velocity; clamp for stability
        const maxSpeed = 900;
        const vx = Math.max(
          -maxSpeed,
          Math.min(maxSpeed, (dx / Math.max(dt, 0.001)) * 0.6)
        );
        const vy = Math.max(
          -maxSpeed,
          Math.min(maxSpeed, (dy / Math.max(dt, 0.001)) * 0.6)
        );
        shape.vx = vx;
        shape.vy = vy;
      }

      this.draggingShape = null;
      this.lastCursorForShape = null;
    }

    // Handle stickman being dropped into jail
    if (input && Array.isArray(sticks)) {
      sticks.forEach(st => {
        // If release happens and they were being dragged
        if (st.draggingWasActive && !input.pointerDown) {
          st.draggingWasActive = false;
          
          const cx = input.cursor.x;
          const cy = input.cursor.y;

          // Check if cursor is over any jail window on release
          const jailWin = this.windows.find(w => 
            w.appId === 'jail' && !w.closed && !w.minimized &&
            cx >= w.x && cx <= w.x + w.width &&
            cy >= w.y && cy <= w.y + w.height
          );

          if (jailWin) {
            st.jailedWindowId = jailWin.id;
            // Update anchor immediately so confinement logic starts from valid point
            st.pos.x = cx;
            st.pos.y = cy;
            
            this.showToast('Stickman imprisoned', 1.2);
            if (this.screwSound && !this.settings.muteAllSound) {
               this.screwSound.currentTime = 0;
               this.screwSound.play();
            }
          } else {
            // If released outside any jail window, clear the imprisonment status
            st.jailedWindowId = null;
          }
        }
        if (st.dragging) st.draggingWasActive = true;
      });
    }

    // Drag trampoline handling (user can move trampolines after placing them)
    if (this.draggingTrampoline && input.pointerDown) {
      const { x, y } = input.cursor;
      const tramp = this.draggingTrampoline;
      const w = tramp.width;
      const h = tramp.height;

      let tx = x - this.trampolineDragOffset.x;
      let ty = y - this.trampolineDragOffset.y;

      // Keep fully on-screen and above the taskbar
      tx = Math.max(4, Math.min(tx, width - w - 4));
      const maxTop = height - TASKBAR_HEIGHT - h - 4;
      ty = Math.max(8, Math.min(ty, maxTop));

      tramp.x = tx;
      tramp.y = ty;

      // While dragging, freeze velocity so physics doesn't fight the cursor
      tramp.vx = 0;
      tramp.vy = 0;

      if (!this.trampolineLastCursor) {
        this.trampolineLastCursor = { x, y };
      } else {
        this.trampolineLastCursor.x = x;
        this.trampolineLastCursor.y = y;
      }
    } else if (this.draggingTrampoline && !input.pointerDown) {
      // On release, either delete if dropped on Recycle Bin, or impart throw velocity
      const tramp = this.draggingTrampoline;
      const cursor = input.cursor;

      let deletedViaRecycle = false;
      const centerX = tramp.x + tramp.width / 2;
      const centerY = tramp.y + tramp.height / 2;
      if (this._isOverRecycleBin(centerX, centerY)) {
        const idx = this.trampolines.indexOf(tramp);
        if (idx >= 0) this.trampolines.splice(idx, 1);
        this.showToast && this.showToast('Item moved to Recycle Bin', 1.4);
        deletedViaRecycle = true;
      }

      if (!deletedViaRecycle && this.trampolineLastCursor) {
        const dx = cursor.x - this.trampolineLastCursor.x;
        const dy = cursor.y - this.trampolineLastCursor.y;
        const maxSpeed = 900;
        const vx = Math.max(
          -maxSpeed,
          Math.min(maxSpeed, (dx / Math.max(dt, 0.001)) * 0.6)
        );
        const vy = Math.max(
          -maxSpeed,
          Math.min(maxSpeed, (dy / Math.max(dt, 0.001)) * 0.6)
        );
        tramp.vx = vx;
        tramp.vy = vy;
      }

      this.trampolineLastCursor = null;
      this.draggingTrampoline = null;
    }

    // Drag sawblade handling (user can pick up, move and throw sawblades)
    if (this.draggingSawblade && input.pointerDown) {
      const { x, y } = input.cursor;
      const saw = this.draggingSawblade;
      const r = saw.radius || 26;

      let sx = x - this.sawbladeDragOffset.x;
      let sy = y - this.sawbladeDragOffset.y;

      // Keep fully on-screen above the taskbar (center-based for circles)
      sx = Math.max(r + 4, Math.min(sx, width - r - 4));
      const maxTop = height - TASKBAR_HEIGHT - r - 4;
      sy = Math.max(r + 4, Math.min(sy, maxTop));

      saw.x = sx;
      saw.y = sy;

      // While dragging, freeze velocity so physics doesn't fight the cursor
      saw.vx = 0;
      saw.vy = 0;

      if (!this.sawbladeLastCursor) {
        this.sawbladeLastCursor = { x, y };
      } else {
        this.sawbladeLastCursor.x = x;
        this.sawbladeLastCursor.y = y;
      }
    } else if (this.draggingSawblade && !input.pointerDown) {
      // On release, either delete if dropped on Recycle Bin, or impart throw velocity
      const saw = this.draggingSawblade;
      const cursor = input.cursor;

      let deletedViaRecycle = false;
      const centerX = saw.x;
      const centerY = saw.y;
      if (this._isOverRecycleBin(centerX, centerY)) {
        const idx = this.sawblades.indexOf(saw);
        if (idx >= 0) this.sawblades.splice(idx, 1);
        this.showToast && this.showToast('Item moved to Recycle Bin', 1.4);
        deletedViaRecycle = true;
      }

      if (!deletedViaRecycle && this.sawbladeLastCursor) {
        const dx = cursor.x - this.sawbladeLastCursor.x;
        const dy = cursor.y - this.sawbladeLastCursor.y;
        const maxSpeed = 1400;
        const vx = Math.max(
          -maxSpeed,
          Math.min(maxSpeed, (dx / Math.max(dt, 0.001)) * 0.65)
        );
        const vy = Math.max(
          -maxSpeed,
          Math.min(maxSpeed, (dy / Math.max(dt, 0.001)) * 0.65)
        );
        saw.vx = vx;
        saw.vy = vy;
      }

      this.sawbladeLastCursor = null;
      this.draggingSawblade = null;
    }

    // Solve Screws (Physical Constraints between Shapes/Trampolines/Guns)
    // Improved stability: clamp per-iteration correction, avoid moving dragged objects,
    // and transfer small positional corrections into velocities when possible to reduce jitter.
    if (this.screws.length > 0) {
      const iterations = 4;
      for (let step = 0; step < iterations; step++) {
        this.screws.forEach(s => {
          const a = s.objA;
          const b = s.objB;
          
          // Get centers (handles circles/centered objects vs. top-left positioned objects)
          const getC = (obj) => {
            if (obj && (obj.type === 'circle' || obj.type === 'bouncyball' || obj.type === 'sawblade')) return { x: obj.x, y: obj.y };
            return { x: (obj.x || 0) + (obj.width || 0) / 2, y: (obj.y || 0) + (obj.height || 0) / 2 };
          };
          const setC = (obj, nx, ny) => {
            if (!obj) return;
            if (obj.type === 'circle' || obj.type === 'bouncyball' || obj.type === 'sawblade') { obj.x = nx; obj.y = ny; }
            else { obj.x = nx - (obj.width || 0) / 2; obj.y = ny - (obj.height || 0) / 2; }
          };

          const cA = getC(a);
          const cB = getC(b);
          const dx = cB.x - cA.x;
          const dy = cB.y - cA.y;
          const dist = Math.hypot(dx, dy) || 0.0001;
          const diff = (s.distance - dist) / dist;

          // Raw correction vector (how much to move each object half the gap)
          let rawPushX = dx * diff * 0.5;
          let rawPushY = dy * diff * 0.5;

          // Clamp the per-iteration correction to avoid large jumps that cause oscillation.
          const maxCorrectionPerIter = 30; // pixels
          const pushLen = Math.hypot(rawPushX, rawPushY);
          if (pushLen > maxCorrectionPerIter) {
            const scale = maxCorrectionPerIter / pushLen;
            rawPushX *= scale;
            rawPushY *= scale;
          }

          // Don't move if being dragged (respect user interactions)
          const dragA = this.draggingShape === a || this.draggingTrampoline === a || this.draggingSawblade === a;
          const dragB = this.draggingShape === b || this.draggingTrampoline === b || this.draggingSawblade === b;

          // Apply positional corrections only to non-dragged objects.
          if (!dragA) {
            setC(a, cA.x - rawPushX, cA.y - rawPushY);
            // If object has velocity properties, gently add the correction into velocity
            if (typeof a.vx === 'number' && typeof a.vy === 'number') {
              // scale to avoid explosive velocity impulses
              a.vx += (-rawPushX) * 0.85;
              a.vy += (-rawPushY) * 0.85;
            }
          }
          if (!dragB) {
            setC(b, cB.x + rawPushX, cB.y + rawPushY);
            if (typeof b.vx === 'number' && typeof b.vy === 'number') {
              b.vx += (rawPushX) * 0.85;
              b.vy += (rawPushY) * 0.85;
            }
          }
          
          // Lightly damp velocities between the two objects if both have them to keep them moving together
          if (a && b && typeof a.vx === 'number' && typeof b.vx === 'number') {
            const avgVX = (a.vx + b.vx) * 0.5;
            const avgVY = (a.vy + b.vy) * 0.5;
            a.vx = a.vx * 0.9 + avgVX * 0.1;
            a.vy = a.vy * 0.9 + avgVY * 0.1;
            b.vx = b.vx * 0.9 + avgVX * 0.1;
            b.vy = b.vy * 0.9 + avgVY * 0.1;
          }
        });
      }
    }

    // Simple physics for windows and icons that the stick figure can throw
    const groundY = height - TASKBAR_HEIGHT;
    const gravity = 800;

    // Windows physics & animation timers
    this.windows.forEach((win) => {
      if (!win) return;

      // Handle open/close animations timing
      if (win.anim) {
        win.anim.t += dt;
        if (win.anim.state === 'closing' && win.anim.t >= win.anim.duration) {
          // finalize close
          win.closed = true;
          if (this.activeWindowId === win.id) this.activeWindowId = null;
          // Ensure embedded iframe is hidden when a window fully closes
          try { if (typeof this._updateEmbeddedIframe === 'function') this._updateEmbeddedIframe(win); } catch (_) {}
        } else if (win.anim.state === 'opening' && win.anim.t >= win.anim.duration) {
          // finish opening
          win.anim = null;
        }
      }

      if (win.closed || win.minimized) return;
      // Skip physics while the user is actively resizing this window
      if (this.resizingWindow && this.resizingWindow.id === win.id) return;
      if (!win.vx && !win.vy) return;

      win.vy += gravity * dt;
      win.x += win.vx * dt;
      win.y += win.vy * dt;

      // Ground collision (taskbar)
      if (win.y + win.height > groundY) {
        win.y = groundY - win.height;
        win.vy = -win.vy * 0.4;
        win.vx *= 0.8;
        if (Math.abs(win.vy) < 10) win.vy = 0;
        if (Math.abs(win.vx) < 10) win.vx = 0;
      }

      // Screen edges
      if (win.x < 0) {
        win.x = 0;
        win.vx = -win.vx * 0.5;
      } else if (win.x + win.width > width) {
        win.x = width - win.width;
        win.vx = -win.vx * 0.5;
      }
    });

    // Icons physics
    this.icons.forEach((icon) => {
      if (!icon) return;

      // In normal mode, fixed icons (like Recycle Bin) stay pinned.
      // In virus/glitch mode, all icons are allowed to fall.
      if (icon.fixed && !this.glitchActive) {
        icon.vx = 0;
        icon.vy = 0;
        return;
      }
      if (!icon.vx && !icon.vy && !this.glitchActive) return;

      // Give icons a gentle nudge when virus is active so they start falling
      if (this.glitchActive && !icon._virusNudged) {
        icon.vy = (icon.vy || 0) + 50;
        icon._virusNudged = true;
      }

      icon.vy += gravity * dt;
      icon.x += icon.vx * dt;
      icon.y += icon.vy * dt;

      const iconGroundY = height - TASKBAR_HEIGHT - ICON_SIZE;

      if (icon.y > iconGroundY) {
        icon.y = iconGroundY;
        icon.vy = -icon.vy * 0.35;
        icon.vx *= 0.8;
        if (Math.abs(icon.vy) < 10) icon.vy = 0;
        if (Math.abs(icon.vx) < 10) icon.vx = 0;
      }

      if (icon.x < 4) {
        icon.x = 4;
        icon.vx = -icon.vx * 0.5;
      } else if (icon.x + ICON_SIZE > width - 4) {
        icon.x = width - 4 - ICON_SIZE;
        icon.vx = -icon.vx * 0.5;
      }
    });

    // Trampoline physics (they can be thrown/dropped like other items)
    if (Array.isArray(this.trampolines)) {
      this.trampolines.forEach((t) => {
        if (!t) return;
        if (typeof t.vx !== 'number') t.vx = 0;
        if (typeof t.vy !== 'number') t.vy = 0;

        // Skip gravity while dragging
        if (this.draggingTrampoline === t) return;

        const prevVy = t.vy;
        t.vy += gravity * dt;
        t.x += t.vx * dt;
        t.y += t.vy * dt;

        const left = t.x;
        const right = t.x + t.width;
        const top = t.y;
        const bottom = t.y + t.height;

        // Ground / taskbar
        if (bottom > height - TASKBAR_HEIGHT) {
          const penetration = bottom - (height - TASKBAR_HEIGHT);
          t.y -= penetration;

          // Play a ceramic-like thunk when a trampoline lands with some speed
          if (prevVy > 160) {
            this._playCeramicImpact(Math.abs(prevVy));
          }

          t.vy = -t.vy * 0.25;
          t.vx *= 0.65;
          if (Math.abs(t.vy) < 18) t.vy = 0;
          if (Math.abs(t.vx) < 8) t.vx = 0;
        }

        // Top
        if (top < 4) {
          const penetration = 4 - top;
          t.y += penetration;
          t.vy = -t.vy * 0.25;
          if (Math.abs(t.vy) < 8) t.vy = 0;
        }

        // Left wall
        if (left < 4) {
          const penetration = 4 - left;
          t.x += penetration;
          t.vx = -t.vx * 0.35;
          if (Math.abs(t.vx) < 6) t.vx = 0;
        }

        // Right wall
        const maxRight = width - 4;
        if (right > maxRight) {
          const penetration = right - maxRight;
          t.x -= penetration;
          t.vx = -t.vx * 0.35;
          if (Math.abs(t.vx) < 6) t.vx = 0;
        }
      });
    }

    // World guns physics (small bodies that can be picked up by stickmen)
    if (Array.isArray(this.guns)) {
      this.guns.forEach((g) => {
        if (!g) return;
        if (typeof g.vx !== 'number') g.vx = 0;
        if (typeof g.vy !== 'number') g.vy = 0;

        const prevVy = g.vy;
        g.vy += gravity * dt;
        g.x += g.vx * dt;
        g.y += g.vy * dt;

        const w = g.width || 26;
        const h = g.height || 14;
        let left = g.x;
        let top = g.y;
        let right = g.x + w;
        let bottom = g.y + h;

        // Ground / taskbar
        if (bottom > height - TASKBAR_HEIGHT) {
          const penetration = bottom - (height - TASKBAR_HEIGHT);
          g.y -= penetration;

          // Small ceramic click when dropped gun hits the ground
          if (prevVy > 120) {
            this._playCeramicImpact(Math.abs(prevVy));
          }

          g.vy = -g.vy * 0.25;
          g.vx *= 0.7;
          if (Math.abs(g.vy) < 12) g.vy = 0;
          if (Math.abs(g.vx) < 8) g.vx = 0;
          top = g.y;
          bottom = g.y + h;
        }

        // Top
        if (top < 4) {
          const penetration = 4 - top;
          g.y += penetration;
          g.vy = -g.vy * 0.25;
          if (Math.abs(g.vy) < 8) g.vy = 0;
          top = g.y;
          bottom = g.y + h;
        }

        // Left
        if (left < 4) {
          const penetration = 4 - left;
          g.x += penetration;
          g.vx = -g.vx * 0.35;
          if (Math.abs(g.vx) < 6) g.vx = 0;
        }

        // Right
        const maxRight = width - 4;
        if (right > maxRight) {
          const penetration = right - maxRight;
          g.x -= penetration;
          g.vx = -g.vx * 0.35;
          if (Math.abs(g.vx) < 6) g.vx = 0;
        }
      });

      // Let nearby unarmed stickmen automatically pick up guns
      if (Array.isArray(sticks) && sticks.length && this.guns.length) {
        for (let i = this.guns.length - 1; i >= 0; i--) {
          const g = this.guns[i];
          if (!g) continue;
          const gw = g.width || 26;
          const gh = g.height || 14;
          const gx = g.x + gw / 2;
          const gy = g.y + gh / 2;

          let pickedBy = null;
          let bestDist = Infinity;
          sticks.forEach((st) => {
            if (!st || st.weapon) return;
            const body = st.points && st.points[1] ? st.points[1] : st.pos;
            if (!body) return;
            const dx = body.x - gx;
            const dy = body.y - gy;
            const d = Math.hypot(dx, dy);
            if (d < 40 && d < bestDist) {
              bestDist = d;
              pickedBy = st;
            }
          });

          if (pickedBy) {
            pickedBy.weapon = g.kind || 'gun';
            this.guns.splice(i, 1);
          }
        }
      }
    }

    // Shapes physics (Tools shapes fall, bounce, and behave as solid bodies)
    if (Array.isArray(this.shapes)) {
      // Integrate motion and collide with world bounds
      this.shapes.forEach((s) => {
        if (!s) return;

        // Ensure velocity properties exist
        if (typeof s.vx !== 'number') s.vx = 0;
        if (typeof s.vy !== 'number') s.vy = 0;

        // Floating or locked shapes ignore gravity and physics entirely
        if (s.floating || s.locked) {
          s.vx = 0;
          s.vy = 0;
          return;
        }

        // Skip gravity integration while the user is actively dragging this shape
        if (this.draggingShape === s) {
          return;
        }

        const prevVy = s.vy;

        // Fireworks use a custom "rocket" style motion: go up, then explode
        if (s.type === 'firework' && !s.exploding) {
          // Slight upward bias so they clearly travel up before exploding
          const fireworkGravity = gravity * 0.5;
          s.vy += fireworkGravity * dt;
          s.x += s.vx * dt;
          s.y += s.vy * dt;

          // Keep the rocket roughly on-screen
          const minTop = 10;
          const maxBottom = height - TASKBAR_HEIGHT - 80;
          if (s.y < minTop) {
            s.y = minTop;
            s.vy = Math.abs(s.vy) * 0.2; // slow it a bit if it hits the ceiling
          }
          if (s.y > maxBottom) {
            s.y = maxBottom;
            s.vy = -Math.abs(s.vy) * 0.8;
          }

          // No regular ground/wall collisions until after it explodes
          return;
        }

        // Special physics for certain blocks
        if (s.type === 'mc_ghast') {
          // Ghasts fly around randomly and ignore gravity
          s.vx += (Math.random() - 0.5) * 400 * dt;
          s.vy += (Math.random() - 0.5) * 400 * dt;
          s.vx *= 0.99;
          s.vy *= 0.99;
          s.x += s.vx * dt;
          s.y += s.vy * dt;
          
          // Hover logic (animation)
          s.y += Math.sin(performance.now() * 0.005) * 0.5;
        } else {
          // Integrate gravity (keep same gravity but a bit more damping during flight)
          s.vy += gravity * dt;
          s.x += s.vx * dt;
          s.y += s.vy * dt;
        }

        // Compute bottom and side extents based on shape type
        let halfWidth, halfHeight;
        if (s.type === 'circle' || s.type === 'bouncyball') {
          halfWidth = s.radius;
          halfHeight = s.radius;
        } else {
          halfWidth = (s.width || 0) / 2;
          halfHeight = (s.height || 0) / 2;
        }

        // For rectangles/triangles/etc positions are stored as top-left,
        // for circles we treat (x,y) as center. Adjust extents accordingly.
        let left, right, top, bottom;
        if (s.type === 'circle' || s.type === 'bouncyball') {
          left = s.x - halfWidth;
          right = s.x + halfWidth;
          top = s.y - halfHeight;
          bottom = s.y + halfHeight;
        } else {
          left = s.x;
          right = s.x + (s.width || 0);
          top = s.y;
          bottom = s.y + (s.height || 0);
        }

        // Ground / taskbar collision - reduce bounciness and add friction for stability
        if (bottom > height - TASKBAR_HEIGHT) {
          const penetration = bottom - (height - TASKBAR_HEIGHT);
          if (s.type === 'circle' || s.type === 'bouncyball') {
            s.y -= penetration;
          } else {
            s.y -= penetration;
            top -= penetration;
            bottom -= penetration;
          }

          // Play impact sounds when shapes hit the ground
          if (prevVy > 160) {
            if (s.type === 'weight10') {
              this._playWeightImpact();
            } else {
              this._playCeramicImpact(Math.abs(prevVy));
            }
          }

          // Bouncy balls rebound much more than regular shapes
          const isBouncy = s.type === 'bouncyball';
          const bounceFactor = isBouncy ? 0.92 : 0.25;
          const frictionFactor = isBouncy ? 0.985 : 0.65;

          // Detect heavy 10 ton weight impacts to trigger screen shake
          if (s.type === 'weight10') {
            const impactSpeed = Math.abs(s.vy || 0);
            if (impactSpeed > 250 && this.startScreenShake) {
              const strength = Math.min(1.0, impactSpeed / 600);
              this.startScreenShake(0.12 + strength * 0.18, 6 + strength * 10);
            }
          }

          s.vy = -s.vy * bounceFactor;
          s.vx *= frictionFactor;
          // Snap near-zero velocities to zero to avoid micro-bouncing
          if (Math.abs(s.vy) < 18) s.vy = 0;
          if (Math.abs(s.vx) < 8) s.vx = 0;
        }

        // Top wall – prevent shapes from flying out of bounds
        const minTop = 4;
        if (top < minTop) {
          const penetration = minTop - top;
          if (s.type === 'circle' || s.type === 'mc_lava') {
            s.y += penetration;
          } else {
            s.y += penetration;
            top += penetration;
            bottom += penetration;
          }
          s.vy = -s.vy * 0.25;
          if (Math.abs(s.vy) < 8) s.vy = 0;
        }

        // Left wall
        if (left < 4) {
          const penetration = 4 - left;
          if (s.type === 'circle' || s.type === 'bouncyball') {
            s.x += penetration;
          } else {
            s.x += penetration;
          }
          s.vx = -s.vx * 0.35;
          if (Math.abs(s.vx) < 6) s.vx = 0;
        }

        // Right wall
        const maxRight = width - 4;
        if (right > maxRight) {
          const penetration = right - maxRight;
          if (s.type === 'circle' || s.type === 'bouncyball') {
            s.x -= penetration;
          } else {
            s.x -= penetration;
          }
          s.vx = -s.vx * 0.35;
          if (Math.abs(s.vx) < 6) s.vx = 0;
        }
      });

      // Simple pairwise shape-on-shape collision so objects stay solid
      // and can push each other around.
      for (let i = 0; i < this.shapes.length; i++) {
        const a = this.shapes[i];
        if (!a) continue;
        for (let j = i + 1; j < this.shapes.length; j++) {
          const b = this.shapes[j];
          if (!b) continue;

          // Helper flags
          const aIsCircle = a.type === 'circle' || a.type === 'bouncyball';
          const bIsCircle = b.type === 'circle' || b.type === 'bouncyball';

          // Circle vs circle
          if (aIsCircle && bIsCircle) {
            const rA = a.radius || 0;
            const rB = b.radius || 0;
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const dist = Math.hypot(dx, dy) || 0.0001;
            const minDist = rA + rB;
            if (dist < minDist && dist > 0) {
              const overlap = minDist - dist;
              const nx = dx / dist;
              const ny = dy / dist;
              const push = overlap * 0.5;

              a.x -= nx * push;
              a.y -= ny * push;
              b.x += nx * push;
              b.y += ny * push;

              // Light damping on impact
              a.vx = (a.vx || 0) * 0.9;
              a.vy = (a.vy || 0) * 0.9;
              b.vx = (b.vx || 0) * 0.9;
              b.vy = (b.vy || 0) * 0.9;
            }
            continue;
          }

          // Rect helper: get center and half-extents
          const getRectInfo = (s) => {
            if (s.type === 'circle' || s.type === 'bouncyball') {
              const r = s.radius || 0;
              return {
                cx: s.x,
                cy: s.y,
                hw: r,
                hh: r,
                left: s.x - r,
                right: s.x + r,
                top: s.y - r,
                bottom: s.y + r,
              };
            } else {
              const w = s.width || 0;
              const h = s.height || 0;
              const cx = s.x + w / 2;
              const cy = s.y + h / 2;
              return {
                cx,
                cy,
                hw: w / 2,
                hh: h / 2,
                left: s.x,
                right: s.x + w,
                top: s.y,
                bottom: s.y + h,
              };
            }
          };

          if (!aIsCircle && !bIsCircle) {
            // Rect vs rect (AABB)
            const ra = getRectInfo(a);
            const rb = getRectInfo(b);

            const dx = rb.cx - ra.cx;
            const dy = rb.cy - ra.cy;
            const overlapX = ra.hw + rb.hw - Math.abs(dx);
            const overlapY = ra.hh + rb.hh - Math.abs(dy);

            if (overlapX > 0 && overlapY > 0) {
              if (overlapX < overlapY) {
                const push = overlapX * 0.5 * Math.sign(dx || 1);
                a.x -= push;
                b.x += push;
                a.vx = (a.vx || 0) * 0.85;
                b.vx = (b.vx || 0) * 0.85;
              } else {
                const push = overlapY * 0.5 * Math.sign(dy || 1);
                a.y -= push;
                b.y += push;
                a.vy = (a.vy || 0) * 0.85;
                b.vy = (b.vy || 0) * 0.85;
              }
            }
          } else {
            // Circle vs rect
            const circle = aIsCircle ? a : b;
            const rect = aIsCircle ? b : a;

            const rc = getRectInfo(rect);
            const cx = circle.x;
            const cy = circle.y;
            const r = circle.radius || 0;

            const closestX = Math.max(rc.left, Math.min(cx, rc.right));
            const closestY = Math.max(rc.top, Math.min(cy, rc.bottom));

            const dx = cx - closestX;
            const dy = cy - closestY;
            const distSq = dx * dx + dy * dy;

            if (distSq > 0 && distSq < r * r) {
              const dist = Math.sqrt(distSq);
              const overlap = r - dist;
              const nx = dx / dist;
              const ny = dy / dist;
              const push = overlap * 0.5;

              // Move circle out
              circle.x += nx * push;
              circle.y += ny * push;

              // Move rect opposite
              rect.x -= nx * push;
              rect.y -= ny * push;

              circle.vx = (circle.vx || 0) * 0.9;
              circle.vy = (circle.vy || 0) * 0.9;
              rect.vx = (rect.vx || 0) * 0.9;
              rect.vy = (rect.vy || 0) * 0.9;
            }
          }
        }
      }
    }

    // Car auto-driving & ramming behavior
    if (Array.isArray(this.shapes)) {
      const cars = this.shapes.filter((s) => s && s.type === 'car');
      if (cars.length && Array.isArray(sticks)) {
        cars.forEach((car) => {
          // Gentle horizontal acceleration toward current direction
          const targetSpeed = 260;
          const dir = car.vx >= 0 ? 1 : -1;
          const accel = 600 * dt;
          if (Math.abs(car.vx) < targetSpeed) {
            car.vx += accel * dir;
          }

          // Bounce off walls by flipping direction
          const left = car.x;
          const right = car.x + (car.width || 0);
          if (left <= 4 || right >= width - 4) {
            car.vx *= -1;
          }

          // Damage stickmen when their body is inside the car bounds
          const cx = car.x;
          const cy = car.y;
          const cw = car.width || 0;
          const ch = car.height || 0;
          sticks.forEach((st) => {
            const body = st.points && st.points[1] ? st.points[1] : st.pos;
            if (!body) return;
            const px = body.x;
            const py = body.y;
            const inside =
              px >= cx &&
              px <= cx + cw &&
              py >= cy &&
              py <= cy + ch + 6;
            if (inside) {
              if (st.setState) st.setState('ragdoll');
              st.mood = 'scared';
              if (st.showEmote) st.showEmote('💥', 0.8);
              if (typeof st.applyDamage === 'function') {
                st.applyDamage(45, this);
              }
              // Knockback in direction of travel
              const impulse = 22;
              const dirX = car.vx >= 0 ? 1 : -1;
              if (Array.isArray(st.points)) {
                st.points.forEach((p) => {
                  p.x += dirX * impulse;
                  p.oldX -= dirX * impulse;
                });
              }
            }
          });
        });
      }
    }

    // Magnet attraction: pull nearby stickmen and objects toward each magnet block
    if (Array.isArray(this.shapes)) {
      const magnets = this.shapes.filter((s) => s && s.type === 'magnet');
      if (magnets.length) {
        const maxRadius = 260;
        const baseForce = 1400;

        magnets.forEach((m) => {
          const mx = m.x + (m.width || 0) / 2;
          const my = m.y + (m.height || 0) / 2;

          // Attract stickmen (all Verlet points for a "sucked in" feel)
          if (Array.isArray(sticks)) {
            sticks.forEach((st) => {
              if (!st || !Array.isArray(st.points)) return;
              st.points.forEach((p) => {
                const dx = mx - p.x;
                const dy = my - p.y;
                const dist = Math.hypot(dx, dy);
                if (!dist || dist > maxRadius) return;
                const strength = baseForce * (1 - dist / maxRadius);
                const ax = (dx / dist) * strength;
                const ay = (dy / dist) * strength;
                const dt2 = dt * dt;
                p.x += ax * dt2;
                p.y += ay * dt2;
                p.oldX -= ax * dt2;
                p.oldY -= ay * dt2;
              });
            });
          }

          // Attract loose shapes (but not other magnets)
          this.shapes.forEach((s) => {
            if (!s || s === m || s.type === 'magnet') return;
            const cx =
              s.type === 'circle' || s.type === 'bouncyball'
                ? s.x
                : s.x + (s.width || 0) / 2;
            const cy =
              s.type === 'circle' || s.type === 'bouncyball'
                ? s.y
                : s.y + (s.height || 0) / 2;
            const dx = mx - cx;
            const dy = my - cy;
            const dist = Math.hypot(dx, dy);
            if (!dist || dist > maxRadius) return;
            const strength = baseForce * 0.6 * (1 - dist / maxRadius);
            const ax = (dx / dist) * strength;
            const ay = (dy / dist) * strength;
            if (typeof s.vx !== 'number') s.vx = 0;
            if (typeof s.vy !== 'number') s.vy = 0;
            s.vx += ax * dt;
            s.vy += ay * dt;
          });

          // Optionally attract trampolines and sawblades a bit
          if (Array.isArray(this.trampolines)) {
            this.trampolines.forEach((t) => {
              const cx = t.x + t.width / 2;
              const cy = t.y + t.height / 2;
              const dx = mx - cx;
              const dy = my - cy;
              const dist = Math.hypot(dx, dy);
              if (!dist || dist > maxRadius) return;
              const strength = baseForce * 0.35 * (1 - dist / maxRadius);
              const ax = (dx / dist) * strength;
              const ay = (dy / dist) * strength;
              if (typeof t.vx !== 'number') t.vx = 0;
              if (typeof t.vy !== 'number') t.vy = 0;
              t.vx += ax * dt;
              t.vy += ay * dt;
            });
          }
          if (Array.isArray(this.sawblades)) {
            this.sawblades.forEach((saw) => {
              const cx = saw.x;
              const cy = saw.y;
              const dx = mx - cx;
              const dy = my - cy;
              const dist = Math.hypot(dx, dy);
              if (!dist || dist > maxRadius) return;
              const strength = baseForce * 0.4 * (1 - dist / maxRadius);
              const ax = (dx / dist) * strength;
              const ay = (dy / dist) * strength;
              if (typeof saw.vx !== 'number') saw.vx = 0;
              if (typeof saw.vy !== 'number') saw.vy = 0;
              saw.vx += ax * dt;
              saw.vy += ay * dt;
            });
          }
        });
      }

      // Tornado suction behavior removed (no tornado shapes are spawned anymore).
    }

    // Sawblade physics (spinning weapons) and damage to stickmen
    if (Array.isArray(this.sawblades) && this.sawblades.length > 0) {
      this.sawblades.forEach((s) => {
        if (!s) return;
        if (typeof s.vx !== 'number') s.vx = 0;
        if (typeof s.vy !== 'number') s.vy = 0;
        if (typeof s.angle !== 'number') s.angle = 0;
        if (typeof s.spin !== 'number') s.spin = 10;

        const prevVy = s.vy;

        // Integrate motion
        s.vy += gravity * dt * 0.8;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.angle += s.spin * dt;

        const r = s.radius || 26;
        const left = s.x - r;
        const right = s.x + r;
        const top = s.y - r;
        const bottom = s.y + r;

        // Ground / taskbar
        if (bottom > height - TASKBAR_HEIGHT) {
          const penetration = bottom - (height - TASKBAR_HEIGHT);
          s.y -= penetration;

          if (prevVy > 160) {
            this._playCeramicImpact(Math.abs(prevVy));
          }

          s.vy = -s.vy * 0.2;
          s.vx *= 0.7;
          if (Math.abs(s.vy) < 15) s.vy = 0;
          if (Math.abs(s.vx) < 8) s.vx = 0;
        }

        // Top
        if (top < 4) {
          const penetration = 4 - top;
          s.y += penetration;
          s.vy = -s.vy * 0.2;
        }

        // Left
        if (left < 4) {
          const penetration = 4 - left;
          s.x += penetration;
          s.vx = -s.vx * 0.4;
        }

        // Right
        const maxRight = width - 4;
        if (right > maxRight) {
          const penetration = right - maxRight;
          s.x -= penetration;
          s.vx = -s.vx * 0.4;
        }
      });

      // Damage sticks that touch a sawblade
      if (Array.isArray(sticks)) {
        this.sawblades.forEach((saw) => {
          const r = (saw && saw.radius) || 26;
          const r2 = r * r;
          sticks.forEach((st) => {
            const body = st.points && st.points[1] ? st.points[1] : st.pos;
            if (!body) return;
            const dx = body.x - saw.x;
            const dy = body.y - saw.y;
            if (dx * dx + dy * dy <= r2) {
              if (st.setState) st.setState('ragdoll');
              st.mood = 'annoyed';
              if (st.showEmote) st.showEmote('💥', 0.8);
              // Simple bleed effect timer
              if (typeof st.bleedTimer === 'number') {
                st.bleedTimer = Math.max(st.bleedTimer || 0, 1.5);
              }
              if (typeof st.applyDamage === 'function') {
                st.applyDamage(50, this);
              }
            }
          });
        });
      }
    }

    // Damage sticks that touch lava blocks (checked independently of sawblades)
    const lavaBlocks = (this.shapes || []).filter(s => s && s.type === 'mc_lava');
    if (lavaBlocks.length && Array.isArray(sticks)) {
      lavaBlocks.forEach(lava => {
        sticks.forEach(st => {
          if (st.dead) return;
          const body = st.points && st.points[1] ? st.points[1] : st.pos;
          if (!body) return;
          if (body.x >= lava.x && body.x <= lava.x + lava.width &&
              body.y >= lava.y && body.y <= lava.y + lava.height) {
            if (st.setState) st.setState('ragdoll');
            st.mood = 'angry';
            if (st.showEmote) st.showEmote('🔥', 0.5);
            if (typeof st.applyDamage === 'function') {
              // Continuous burn damage
              st.applyDamage(0.8, this);
            }
          }
        });
      });
    }

    // Bombs, spikes and special effects (timed explosions, top-only spike damage)
    if (Array.isArray(this.shapes) && Array.isArray(sticks)) {
      // Handle bombs, fireworks and TNT (types 'bomb', 'firework', 'nuke', 'mc_tnt')
      for (let i = this.shapes.length - 1; i >= 0; i--) {
        const s = this.shapes[i];
        if (!s || (s.type !== 'bomb' && s.type !== 'firework' && s.type !== 'nuke' && s.type !== 'mc_tnt')) continue;

        const isFirework = s.type === 'firework';
        const isNuke = s.type === 'nuke';
        const isTNT = s.type === 'mc_tnt';

        if (!s.exploding) {
          const defaultTimer = isFirework ? 2 : (isNuke ? 4 : (isTNT ? 5 : 3));
          s.timer = (typeof s.timer === 'number' ? s.timer : defaultTimer) - dt;
          if (s.timer <= 0 && !s.hasExploded) {
            s.exploding = true;
            s.explodeAge = 0;
            s.hasExploded = true;

            // Freeze the rocket before the burst
            if (isFirework) {
              s.vx = 0;
              s.vy = 0;
            }

            // Play appropriate explosion sound
            if (
              this.settings &&
              !this.settings.muteAllSound
            ) {
              try {
                if (isTNT && this.tntSound) {
                  this.tntSound.currentTime = 0;
                  this.tntSound.play();
                } else if (!isFirework && this.bombSound) {
                  this.bombSound.currentTime = 0;
                  this.bombSound.play();
                  if (isNuke && this.startScreenShake) {
                    this.startScreenShake(0.6, 18);
                  }
                } else if (isFirework && this.fireworkSound) {
                  this.fireworkSound.currentTime = 0;
                  this.fireworkSound.play();
                }
              } catch (_) {
                // ignore autoplay issues
              }
            }

            // Apply explosion impulse to nearby stickmen
            const cx = s.x + (s.width || 0) / 2;
            const cy = s.y + (s.height || 0) / 2;
            const radius = isFirework ? 150 : (isNuke ? 260 : (isTNT ? 180 : 120));
            const r2 = radius * radius;

            sticks.forEach((st) => {
              const body = st.points && st.points[1] ? st.points[1] : st.pos;
              if (!body) return;
              const dx = body.x - cx;
              const dy = body.y - cy;
              if (dx * dx + dy * dy <= r2) {
                if (st.setState) st.setState('ragdoll');
                st.mood = 'scared';
                if (st.showEmote) st.showEmote(isFirework ? '🎆' : '💥', 0.8);
                if (typeof st.bleedTimer === 'number') {
                  st.bleedTimer = Math.max(st.bleedTimer || 0, isNuke ? 2.0 : 1.0);
                }
                const dist = Math.max(18, Math.hypot(dx, dy));
                const nx = dx / dist;
                const ny = dy / dist;
                const impulse = isFirework ? 18 : 22;
                if (Array.isArray(st.points)) {
                  st.points.forEach((p) => {
                    p.x += nx * impulse;
                    p.y += ny * impulse;
                    p.oldX -= nx * impulse;
                    p.oldY -= ny * impulse;
                  });
                }
              }
            });

            // Firework-specific particle burst
            if (isFirework && Array.isArray(this.fireworkBursts)) {
              const colors = ['#ffeb3b', '#ff9800', '#f44336', '#03a9f4', '#9c27b0', '#4caf50'];
              const particles = [];
              const count = 40;
              for (let n = 0; n < count; n++) {
                const angle = (Math.PI * 2 * n) / count + Math.random() * 0.4;
                const speed = 120 + Math.random() * 120;
                particles.push({
                  x: cx,
                  y: cy,
                  vx: Math.cos(angle) * speed,
                  vy: Math.sin(angle) * speed,
                  life: 0.9 + Math.random() * 0.4,
                  maxLife: 0.9 + Math.random() * 0.4,
                  color: colors[Math.floor(Math.random() * colors.length)],
                });
              }
              this.fireworkBursts.push({ particles });
            }
          }
        } else {
          s.explodeAge = (s.explodeAge || 0) + dt;
          const lifeSpan = isFirework ? 0.6 : (isNuke ? 0.8 : 0.4);
          if (s.explodeAge > lifeSpan) {
            // Remove bomb / firework casing after explosion finishes
            this.shapes.splice(i, 1);
            continue;
          }
        }
      }

      // Update free-floating firework particles
      if (Array.isArray(this.fireworkBursts) && this.fireworkBursts.length > 0) {
        const particleGravity = 500;
        for (let b = this.fireworkBursts.length - 1; b >= 0; b--) {
          const burst = this.fireworkBursts[b];
          if (!burst || !Array.isArray(burst.particles)) {
            this.fireworkBursts.splice(b, 1);
            continue;
          }
          for (let p = burst.particles.length - 1; p >= 0; p--) {
            const part = burst.particles[p];
            part.life -= dt;
            if (part.life <= 0) {
              burst.particles.splice(p, 1);
              continue;
            }
            part.vy += particleGravity * dt * 0.4;
            part.x += part.vx * dt;
            part.y += part.vy * dt;
          }
          if (burst.particles.length === 0) {
            this.fireworkBursts.splice(b, 1);
          }
        }
      }

      // Handle spike damage (type 'spike', only if stick touches the top)
      this.shapes.forEach((s) => {
        if (!s) return;
        if (s.type === 'spike') {
          const left = s.x;
          const right = s.x + (s.width || 0);
          const top = s.y;
          sticks.forEach((st) => {
            const body = st.points && st.points[1] ? st.points[1] : st.pos;
            if (!body) return;
            // Must be above or just touching the top edge and within horizontal span
            if (
              body.x >= left + 4 &&
              body.x <= right - 4 &&
              body.y >= top - 10 &&
              body.y <= top + 4
            ) {
              if (st.setState) st.setState('ragdoll');
              st.mood = 'annoyed';
              if (st.showEmote) st.showEmote('💥', 0.8);
              if (typeof st.bleedTimer === 'number') {
                st.bleedTimer = Math.max(st.bleedTimer || 0, 1.5);
              }
              if (typeof st.applyDamage === 'function') {
                st.applyDamage(60, this);
              }
            }
          });
        }
      });
    }

    // Allow the user to draw inside any open Paint window with the cursor
    if (input.pointerDown) {
      const { x, y } = input.cursor;
      // addPaintStroke already checks whether the point is inside a Paint canvas
      this.addPaintStroke(x, y, input.justClicked);
    }

    // Expose FPS from the main loop (if set) to the rest of the desktop
    if (typeof this.fps === 'number' && this.fps < 0) {
      this.fps = 0;
    }

    // Bullet physics: move bullets and handle simple collisions / lifetime
    if (Array.isArray(this.bullets) && this.bullets.length > 0) {
      const maxDist = Math.hypot(width, height) + 200;
      for (let i = this.bullets.length - 1; i >= 0; i--) {
        const b = this.bullets[i];
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.life -= dt;

        // Remove if out of bounds or too old
        const distFromCenter = Math.hypot(b.x - width * 0.5, b.y - height * 0.5);
        if (
          b.life <= 0 ||
          distFromCenter > maxDist ||
          b.x < -100 ||
          b.x > width + 100 ||
          b.y < -100 ||
          b.y > height + 100
        ) {
          // Small vanish spark when a bullet times out
          this.spawnGunBurst &&
            this.spawnGunBurst('impact', b.x, b.y, b.vx, b.vy);
          this.bullets.splice(i, 1);
          continue;
        }

        // Simple hit-test against stickmen and cursor
        if (Array.isArray(sticks)) {
          const hitRadius = 24; // Increased radius for more reliable hits
          let hitSomething = false;
          
          // Check if cursor is hit (only if bullet not owned by cursor)
          if (b.owner !== 'cursor') {
            const dcx = input.cursor.x - b.x;
            const dcy = input.cursor.y - b.y;
            if (dcx * dcx + dcy * dcy < 20 * 20) {
              this.spawnGunBurst && this.spawnGunBurst('impact', b.x, b.y, b.vx, b.vy);
              this.startScreenShake && this.startScreenShake(0.08, 4);
              this.bullets.splice(i, 1);
              hitSomething = true;
            }
          }

          if (!hitSomething) {
            for (const s of sticks) {
              if (s.dead || b.owner === s) continue;
              const body = s.points && s.points[1] ? s.points[1] : s.pos;
              if (!body) continue;
              const dx = body.x - b.x;
              const dy = body.y - b.y;
              if (dx * dx + dy * dy <= hitRadius * hitRadius) {
                // Reduced impulse to avoid excessive knockback glitching
                if (s.setState) s.setState('ragdoll');
                s.mood = 'scared';
                if (s.showEmote) s.showEmote('💥', 0.8);
                const dist = Math.hypot(dx, dy) || 1;
                const nx = dx / dist;
                const ny = dy / dist;
                const impulse = 3.5; // Significantly reduced from 12
                if (Array.isArray(s.points)) {
                  s.points.forEach((p) => {
                    p.x += nx * impulse;
                    p.y += ny * impulse;
                    p.oldX -= nx * impulse;
                    p.oldY -= ny * impulse;
                  });
                }

                if (typeof s.applyDamage === 'function') {
                  s.applyDamage(35, this);
                }

                // Impact spark burst where the bullet hit
                this.spawnGunBurst &&
                  this.spawnGunBurst('impact', b.x, b.y, b.vx, b.vy);

                this.bullets.splice(i, 1);
                hitSomething = true;
                break;
              }
            }
          }
        }
      }
    }

    // Update gun visual bursts (muzzle flashes, impact sparks)
    if (Array.isArray(this.gunBursts) && this.gunBursts.length) {
      for (let i = this.gunBursts.length - 1; i >= 0; i--) {
        const burst = this.gunBursts[i];
        if (!burst) {
          this.gunBursts.splice(i, 1);
          continue;
        }
        burst.age += dt;
        if (burst.age >= burst.ttl) {
          this.gunBursts.splice(i, 1);
          continue;
        }
        if (Array.isArray(burst.particles)) {
          burst.particles.forEach((p) => {
            p.life -= dt;
            if (p.life <= 0) return;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vx *= 0.96;
            p.vy *= 0.96;
          });
        }
      }
    }

    // Handle dropping a dragged weapon when mouse is released
    if (this.draggingWeapon && !input.pointerDown) {
      const { x, y } = input.cursor;

      // Check item limit before placing
      const currentItemCount = this.shapes.length + this.trampolines.length + this.sawblades.length + this.portals.length + this.guns.length;
      const maxItems = this.settings.maxItems500 ? 500 : 80;

      if (currentItemCount >= maxItems) {
        this.showToast(`Object limit reached (${maxItems})`, 1.5);
        this.draggingWeapon = null;
        return;
      }

      // Trampoline and shapes become world objects instead of equipped weapons.
      if (this.draggingWeapon.type === 'trampoline') {
        const widthPx = 140;
        const heightPx = 18;
        let tx = x - widthPx / 2;
        let ty = y - heightPx / 2;

        // Ensure trampoline stays fully on-screen horizontally
        tx = Math.max(4, Math.min(tx, width - widthPx - 4));

        // Place trampoline above the taskbar area
        const maxTop = height - TASKBAR_HEIGHT - heightPx - 4;
        ty = Math.max(8, Math.min(ty, maxTop));

        this.trampolines.push({
          x: tx,
          y: ty,
          width: widthPx,
          height: heightPx,
          vx: 0,
          vy: 0,
        });
      } else if (this.draggingWeapon.type === 'sawblade') {
        const radius = 26;
        let sx = x;
        let sy = y;
        sx = Math.max(radius + 4, Math.min(sx, width - radius - 4));
        const maxTop = height - TASKBAR_HEIGHT - radius - 4;
        sy = Math.max(radius + 4, Math.min(sy, maxTop));
        this.sawblades.push({
          x: sx,
          y: sy,
          radius,
          vx: 0,
          vy: 0,
          angle: 0,
          spin: 12,
        });
      } else if (
        this.draggingWeapon.type === 'circle' ||
        this.draggingWeapon.type === 'bigcircle' ||
        this.draggingWeapon.type === 'square' ||
        this.draggingWeapon.type === 'rectangle' ||
        this.draggingWeapon.type === 'longrect' ||
        this.draggingWeapon.type === 'smallrect' ||
        this.draggingWeapon.type === 'tallrect' ||
        this.draggingWeapon.type === 'platform' ||
        this.draggingWeapon.type === 'pillar' ||
        this.draggingWeapon.type === 'triangle' ||
        this.draggingWeapon.type === 'bigtriangle' ||
        this.draggingWeapon.type === 'hexagon' ||
        this.draggingWeapon.type === 'diamond' ||
        this.draggingWeapon.type === 'bouncyball' ||
        this.draggingWeapon.type === 'firework' ||
        this.draggingWeapon.type === 'magnet' ||
        this.draggingWeapon.type === 'portal' ||
        this.draggingWeapon.type === 'bomb' ||
        this.draggingWeapon.type === 'nuke' ||
        this.draggingWeapon.type === 'spike' ||
        this.draggingWeapon.type === 'ramp' ||
        this.draggingWeapon.type === 'house' ||
        this.draggingWeapon.type === 'weight10' ||
        this.draggingWeapon.type === 'car' ||
        this.draggingWeapon.type.startsWith('mc_')
      ) {
        // Place static shapes onto the desktop as physics objects
        if (
          this.draggingWeapon.type === 'circle' ||
          this.draggingWeapon.type === 'bigcircle' ||
          this.draggingWeapon.type === 'bouncyball'
        ) {
          const isBouncy = this.draggingWeapon.type === 'bouncyball';
          const radius =
            this.draggingWeapon.type === 'bigcircle'
              ? 70
              : isBouncy
              ? 28
              : 40;
          let cx = x;
          let cy = y;
          cx = Math.max(radius + 4, Math.min(cx, width - radius - 4));
          const maxTop = height - TASKBAR_HEIGHT - radius - 4;
          cy = Math.max(radius + 4, Math.min(cy, maxTop));
          this.shapes.push({
            type: isBouncy ? 'bouncyball' : 'circle',
            x: cx,
            y: cy,
            radius,
            vx: 0,
            vy: 0,
          });
        } else if (this.draggingWeapon.type === 'portal') {
          // Place a teleportation portal (up to two; keep the newest)
          let w = 70;
          let h = 90;
          let tx = x - w / 2;
          let ty = y - h / 2;
          tx = Math.max(4, Math.min(tx, width - w - 4));
          const maxTop = height - TASKBAR_HEIGHT - h - 4;
          ty = Math.max(8, Math.min(ty, maxTop));

          const portal = {
            x: tx,
            y: ty,
            width: w,
            height: h,
          };

          this.portals.push(portal);
          if (this.portals.length > 2) {
            this.portals.shift();
          }
        } else if (this.draggingWeapon.type === 'bomb') {
          // Bombs: small round objects that explode after 3 seconds
          const size = 30;
          let tx = x - size / 2;
          let ty = y - size / 2;
          tx = Math.max(4, Math.min(tx, width - size - 4));
          const maxTop = height - TASKBAR_HEIGHT - size - 4;
          ty = Math.max(8, Math.min(ty, maxTop));
          this.shapes.push({
            type: 'bomb',
            x: tx,
            y: ty,
            width: size,
            height: size,
            vx: 0,
            vy: 0,
            timer: 3,
            exploding: false,
            explodeAge: 0,
            hasExploded: false,
          });
        } else if (this.draggingWeapon.type === 'nuke') {
          // Nukes: heavier bombs with a huge blast radius
          const size = 40;
          let tx = x - size / 2;
          let ty = y - size / 2;
          tx = Math.max(4, Math.min(tx, width - size - 4));
          const maxTop = height - TASKBAR_HEIGHT - size - 4;
          ty = Math.max(8, Math.min(ty, maxTop));
          this.shapes.push({
            type: 'nuke',
            x: tx,
            y: ty,
            width: size,
            height: size,
            vx: 0,
            vy: 0,
            timer: 4,
            exploding: false,
            explodeAge: 0,
            hasExploded: false,
          });
        } else if (this.draggingWeapon.type === 'firework') {
          // Firework: launches upward then explodes like a bomb
          const size = 24;
          let tx = x - size / 2;
          let ty = y - size;
          tx = Math.max(4, Math.min(tx, width - size - 4));
          const maxTop = height - TASKBAR_HEIGHT - size - 8;
          ty = Math.max(8, Math.min(ty, maxTop));
          this.shapes.push({
            type: 'firework',
            x: tx,
            y: ty,
            width: size,
            height: size * 1.6,
            vx: 0,
            vy: -420,
            timer: 2,
            exploding: false,
            explodeAge: 0,
            hasExploded: false,
          });
        } else if (this.draggingWeapon.type === 'magnet') {
          // Magnet: static-ish block that attracts nearby objects and stickmen
          const w = 60;
          const h = 40;
          let tx = x - w / 2;
          let ty = y - h / 2;
          tx = Math.max(4, Math.min(tx, width - w - 4));
          const maxTop = height - TASKBAR_HEIGHT - h - 4;
          ty = Math.max(8, Math.min(ty, maxTop));
          this.shapes.push({
            type: 'magnet',
            x: tx,
            y: ty,
            width: w,
            height: h,
            vx: 0,
            vy: 0,
          });
        } else if (this.draggingWeapon.type === 'car') {
          // Car: a self-driving rammer that cruises horizontally
          const w = 110;
          const h = 40;
          let tx = x - w / 2;
          let ty = y - h / 2;
          tx = Math.max(4, Math.min(tx, width - w - 4));
          const maxTop = height - TASKBAR_HEIGHT - h - 4;
          ty = Math.max(8, Math.min(ty, maxTop));
          this.shapes.push({
            type: 'car',
            x: tx,
            y: ty,
            width: w,
            height: h,
            vx: 220 * (Math.random() < 0.5 ? -1 : 1),
            vy: 0,
          });
        } else if (this.draggingWeapon.type.startsWith('mc_')) {
          const size = 40;
          let tx = x - size / 2;
          let ty = y - size / 2;
          tx = Math.max(4, Math.min(tx, width - size - 4));
          const maxTop = height - TASKBAR_HEIGHT - size - 4;
          ty = Math.max(8, Math.min(ty, maxTop));
          this.shapes.push({
            type: this.draggingWeapon.type,
            x: tx,
            y: ty,
            width: size,
            height: size,
            vx: 0,
            vy: 0,
          });
        } else {
          // Rectangular-ish shapes: square, rectangle, long rectangle, and variants, plus triangles/hex/diamond/spike/house/weight (use AABB for collision)
          let w = 80;
          let h = 40;
          if (this.draggingWeapon.type === 'square') {
            w = h = 70;
          } else if (this.draggingWeapon.type === 'rectangle') {
            w = 120;
            h = 40;
          } else if (this.draggingWeapon.type === 'longrect') {
            w = 180;
            h = 32;
          } else if (this.draggingWeapon.type === 'smallrect') {
            w = 60;
            h = 24;
          } else if (this.draggingWeapon.type === 'tallrect') {
            w = 32;
            h = 80;
          } else if (this.draggingWeapon.type === 'platform') {
            w = 140;
            h = 20;
          } else if (this.draggingWeapon.type === 'pillar') {
            w = 26;
            h = 70;
          } else if (this.draggingWeapon.type === 'triangle') {
            w = 90;
            h = 60;
          } else if (this.draggingWeapon.type === 'bigtriangle') {
            w = 130;
            h = 80;
          } else if (this.draggingWeapon.type === 'hexagon') {
            w = 90;
            h = 52;
          } else if (this.draggingWeapon.type === 'diamond') {
            w = 70;
            h = 70;
          } else if (this.draggingWeapon.type === 'spike') {
            w = 70;
            h = 30;
          } else if (this.draggingWeapon.type === 'house') {
            w = 110;
            h = 90;
          } else if (this.draggingWeapon.type === 'ramp') {
            w = 120;
            h = 50;
          } else if (this.draggingWeapon.type === 'weight10') {
            w = 70;
            h = 50;
          }
          let tx = x - w / 2;
          let ty = y - h / 2;
          tx = Math.max(4, Math.min(tx, width - w - 4));
          const maxTop = height - TASKBAR_HEIGHT - h - 4;
          ty = Math.max(8, Math.min(ty, maxTop));
          const newShape = {
            type: this.draggingWeapon.type,
            x: tx,
            y: ty,
            width: w,
            height: h,
            vx: 0,
            vy: 0,
          };
          this.shapes.push(newShape);

          // Play heavy metal impact when a 10 ton weight is placed
          if (this.draggingWeapon.type === 'weight10') {
            this._playWeightImpact();
          }
        }
      }
      this.draggingWeapon = null;
    }
  }

  getPaintWindows() {
    return this.windows.filter(
      (w) => w.appId === 'paint' && !w.closed && !w.minimized
    );
  }

  // Export the given Paint window's drawing as a PNG download
  savePaintWindow(win) {
    // Delegate saving to the Paint module
    if (!win || win.appId !== 'paint') return;
    return drawPaintApp.savePaintWindow
      ? drawPaintApp.savePaintWindow(this, win)
      : undefined;
  }

  // Convert all paint strokes into world-space line segments
  getPaintStrokeSegments() {
    if (drawPaintApp.getPaintStrokeSegments) {
      return drawPaintApp.getPaintStrokeSegments(this);
    }
    const segments = [];
    const paintWins = this.getPaintWindows();
    for (const win of paintWins) {
      if (!Array.isArray(win.strokes)) continue;
      for (const stroke of win.strokes) {
        if (!stroke.points || stroke.points.length < 2) continue;
        for (let i = 0; i < stroke.points.length - 1; i++) {
          const a = stroke.points[i];
          const b = stroke.points[i + 1];
          const x1 = win.x + a.x;
          const y1 = win.y + a.y;
          const x2 = win.x + b.x;
          const y2 = win.y + b.y;
          segments.push({ x1, y1, x2, y2 });
        }
      }
    }
    return segments;
  }

  getPaintContentRect(win) {
    // Correctly delegate to the improved rect calculation in paint_app.js
    if (typeof getPaintContentRect === 'function') {
      return getPaintContentRect(win);
    }
    
    // Fallback if the export fails for some reason
    const barHeight = 24;
    const padding = 10;
    return {
      x: win.x + padding,
      y: win.y + barHeight + padding,
      width: win.width - padding * 2,
      height: win.height - barHeight - padding * 2,
    };
  }

  addPaintStroke(worldX, worldY, forceNew = false) {
    if (drawPaintApp.addPaintStroke) {
      return drawPaintApp.addPaintStroke(this, worldX, worldY, forceNew);
    }
    const paintWins = this.getPaintWindows();
    for (const win of paintWins) {
      const rect = this.getPaintContentRect(win);
      if (
        worldX >= rect.x &&
        worldX <= rect.x + rect.width &&
        worldY >= rect.y &&
        worldY <= rect.y + rect.height
      ) {
        if (!Array.isArray(win.strokes)) win.strokes = [];
        if (!win.paintColor) win.paintColor = '#000000';
        if (!win.paintBrushSize) win.paintBrushSize = 2;

        const localX = worldX - win.x;
        const localY = worldY - win.y;
        const lastStroke = win.strokes[win.strokes.length - 1];

        const isEraser = win.paintTool === 'Eraser';
        const color = isEraser ? '#ffffff' : win.paintColor;
        const size = isEraser ? (win.paintBrushSize * 4) : win.paintBrushSize;

        // Determine if we must start a new stroke object
        let needsNew = forceNew || !lastStroke || 
                       lastStroke.points.length > 80 || 
                       lastStroke.color !== color || 
                       lastStroke.size !== size;
        
        // Prevent huge line streaks if the distance between current point and last point is massive
        if (!needsNew && lastStroke.points.length > 0) {
          const lp = lastStroke.points[lastStroke.points.length - 1];
          const distSq = (localX - lp.x)**2 + (localY - lp.y)**2;
          if (distSq > 150 * 150) needsNew = true; // 150px gap forced break
        }

        if (needsNew) {
          if (forceNew) win.redoStack = []; // Clear redo on new manual stroke
          win.strokes.push({
            color: color,
            size: size,
            points: [{ x: localX, y: localY }],
          });
        } else {
          const lastPoint = lastStroke.points[lastStroke.points.length - 1];
          const dx = localX - lastPoint.x;
          const dy = localY - lastPoint.y;
          const distSq = dx * dx + dy * dy;
          // Minimal threshold to avoid redundant points while moving slowly
          if (distSq > 1.0) {
            lastStroke.points.push({ x: localX, y: localY });
          }
        }
      }
    }
  }

  draw(ctx, { width, height, input }) {
    // If the system is in a fake "crashed" state, show a blue crash screen and skip normal rendering.
    if (this.crashed) {
      ctx.save();
      ctx.fillStyle = '#0000AA';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 22px "WinXPTahoma", system-ui';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('A problem has been detected and Windows has been shut down.', 40, 60);

      ctx.font = '15px "WinXPTahoma", system-ui';
      ctx.fillText('The system will restart automatically.', 40, 100);
      ctx.fillText('Progress will not be saved in this demo.', 40, 120);

      ctx.restore();
      return;
    }

    // Global screen shake (used e.g. by the 10 ton weight)
    if (this.shakeTime > 0 && this.shakeMag > 0) {
      const t = this.shakeTime;
      const falloff = Math.max(0, Math.min(1, t / 0.3));
      const mag = this.shakeMag * falloff;
      let ox = (Math.random() * 2 - 1) * mag;
      let oy = (Math.random() * 2 - 1) * mag;

      // Extra jitter when glitch mode is active
      if (this.glitchActive && this.glitchIntensity > 0) {
        ox += (Math.random() * 2 - 1) * (3 * this.glitchIntensity);
        oy += (Math.random() * 2 - 1) * (2 * this.glitchIntensity);
      }

      ctx.save();
      ctx.translate(ox, oy);
    } else {
      ctx.save();
      if (this.glitchActive && this.glitchIntensity > 0) {
        const ox = (Math.random() * 2 - 1) * (3 * this.glitchIntensity);
        const oy = (Math.random() * 2 - 1) * (2 * this.glitchIntensity);
        ctx.translate(ox, oy);
      }
    }

    // Background wallpaper (XP-style, user-selectable)
    // If the vib ribbon background feature is enabled, use that special blank-ribbon wallpaper.
    let wpImg = wallpaperImg;
    if (this.settings && this.settings.stickVibRibbon && this.vibRibbonImg && this.vibRibbonImg.complete) {
      wpImg = this.vibRibbonImg;
    } else {
      const wpIndex =
        this.settings && Number.isInteger(this.settings.wallpaperIndex)
          ? this.settings.wallpaperIndex
          : 0;
      wpImg =
        WALLPAPER_IMAGES[wpIndex] || WALLPAPER_IMAGES[0] || wallpaperImg;
    }

    if (wpImg && wpImg.complete && wpImg.naturalWidth > 0) {
      ctx.drawImage(wpImg, 0, 0, width, height);
    } else {
      const topGrad = ctx.createLinearGradient(0, 0, 0, height);
      topGrad.addColorStop(0, '#fdfdfd');
      topGrad.addColorStop(1, '#e0e0e0');
      ctx.fillStyle = topGrad;
      ctx.fillRect(0, 0, width, height);
    }

    // Icons
    this.icons.forEach(icon => {
      drawIcon(ctx, icon);
    });

    // Antivirus Hunter Entity (outside app)
    if (this.antivirusHunter && this.virusImg.complete) {
      ctx.save();
      const h = this.antivirusHunter;
      const size = 64 + Math.sin(h.age * 10) * 8;
      ctx.translate(h.x, h.y);
      ctx.rotate(Math.sin(h.age * 5) * 0.2);
      ctx.globalAlpha = 0.8 + Math.sin(h.age * 15) * 0.2;
      ctx.drawImage(this.virusImg, -size/2, -size/2, size, size);
      ctx.restore();
    }

    // Windows (back to front)
    this.windows.forEach(win => {
      if (!win.closed && !win.minimized) {
        drawWindow(ctx, this, win, win.id === this.activeWindowId);
      }
    });

    // Trampolines (world platforms from Tools app)
    if (Array.isArray(this.trampolines)) {
      this.trampolines.forEach((t) => {
        const cx = t.x;
        const cy = t.y;
        const w = t.width;
        const h = t.height;

        ctx.save();
        ctx.translate(cx + w / 2, cy + h / 2);

        // Base bed
        ctx.fillStyle = '#ffec8b';
        ctx.strokeStyle = '#c0a030';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-w / 2, -h / 2, w, h, 6);
        ctx.fill();
        ctx.stroke();

        // Edge stripe
        ctx.strokeStyle = '#ff7043';
        ctx.beginPath();
        ctx.moveTo(-w / 2 + 8, -h / 2 + 4);
        ctx.lineTo(w / 2 - 8, -h / 2 + 4);
        ctx.moveTo(-w / 2 + 8, h / 2 - 4);
        ctx.lineTo(w / 2 - 8, h / 2 - 4);
        ctx.stroke();

        // Simple springs
        const springCount = 4;
        const springSpacing = w / (springCount + 1);
        ctx.strokeStyle = '#777';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < springCount; i++) {
          const sx = -w / 2 + springSpacing * (i + 1);
          ctx.beginPath();
          ctx.moveTo(sx, h / 2);
          ctx.lineTo(sx - 4, h / 2 + 10);
          ctx.lineTo(sx + 4, h / 2 + 18);
          ctx.stroke();
        }

        ctx.restore();
      });
    }

    // Bullets
    if (Array.isArray(this.bullets)) {
      ctx.save();
      this.bullets.forEach((b) => {
        ctx.save();
        ctx.translate(b.x, b.y);
        const angle = Math.atan2(b.vy, b.vx);
        ctx.rotate(angle);
        const len = 16;
        const tail = 10;
        // Tail
        const grad = ctx.createLinearGradient(-tail, 0, len * 0.5, 0);
        grad.addColorStop(0, 'rgba(255,255,120,0.0)');
        grad.addColorStop(0.4, 'rgba(255,255,160,0.6)');
        grad.addColorStop(1, 'rgba(255,255,255,0.95)');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-tail, 0);
        ctx.lineTo(len * 0.5, 0);
        ctx.stroke();
        ctx.restore();
      });
      ctx.restore();
    }

    // Teleportation portals
    if (Array.isArray(this.portals) && this.portals.length > 0) {
      this.portals.forEach((p, index) => {
        const { x, y, width: w, height: h } = p;
        const cx = x + w / 2;
        const cy = y + h / 2;

        ctx.save();
        ctx.translate(cx, cy);

        // Outer frame
        const grad = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
        grad.addColorStop(0, '#212121');
        grad.addColorStop(1, '#424242');
        ctx.fillStyle = grad;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-w / 2, -h / 2, w, h, 10);
        ctx.fill();
        ctx.stroke();

        // Inner swirling portal
        const innerR = Math.min(w, h) * 0.36;
        const ringColors = ['#00e5ff', '#00bcd4', '#26c6da', '#0097a7'];
        ctx.lineWidth = 3;
        ringColors.forEach((color, i) => {
          const r = innerR - i * 4;
          ctx.strokeStyle = color;
          ctx.beginPath();
          for (let a = 0; a <= Math.PI * 2; a += Math.PI / 64) {
            const wobble = Math.sin(a * 4 + index * 0.8) * 2;
            const px = Math.cos(a) * (r + wobble);
            const py = Math.sin(a) * (r + wobble);
            if (a === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.stroke();
        });

        // Simple portal index marker (1/2)
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px "WinXPTahoma", system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(String(index + 1), 0, -h / 2 - 2);

        ctx.restore();
      });
    }

    // Sawblades
    if (Array.isArray(this.sawblades) && this.sawblades.length > 0) {
      this.sawblades.forEach((s) => {
        const r = s.radius || 26;
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.angle || 0);
        // Outer disc
        ctx.fillStyle = '#eeeeee';
        ctx.strokeStyle = '#666666';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Teeth
        const teeth = 12;
        ctx.fillStyle = '#b0bec5';
        for (let i = 0; i < teeth; i++) {
          const a = (i / teeth) * Math.PI * 2;
          const inner = r - 6;
          const outer = r + 4;
          const x1 = Math.cos(a) * inner;
          const y1 = Math.sin(a) * inner;
          const x2 = Math.cos(a + 0.2) * outer;
          const y2 = Math.sin(a + 0.2) * outer;
          const x3 = Math.cos(a - 0.2) * outer;
          const y3 = Math.sin(a - 0.2) * outer;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.lineTo(x3, y3);
          ctx.closePath();
          ctx.fill();
        }

        // Center hub
        ctx.fillStyle = '#90a4ae';
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });
    }

    // Static shapes placed from Tools app
    if (Array.isArray(this.shapes)) {
      this.shapes.forEach((s) => {
        ctx.save();
        if (s.type === 'circle' || s.type === 'bouncyball') {
          ctx.beginPath();
          if (s.type === 'bouncyball') {
            ctx.fillStyle = '#66bb6a';
            ctx.strokeStyle = '#2e7d32';
          } else {
            ctx.fillStyle = '#ffe082';
            ctx.strokeStyle = '#f9a825';
          }
          ctx.lineWidth = 2;
          ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        } else if (
          s.type === 'square' ||
          s.type === 'rectangle' ||
          s.type === 'longrect' ||
          s.type === 'smallrect' ||
          s.type === 'tallrect' ||
          s.type === 'platform' ||
          s.type === 'pillar'
        ) {
          const { x, y, width: w, height: h } = s;

          let fill = '#ffe0b2';
          let stroke = '#fb8c00';

          if (s.type === 'square') {
            fill = '#bbdefb';
            stroke = '#1976d2';
          } else if (s.type === 'rectangle') {
            fill = '#c8e6c9';
            stroke = '#388e3c';
          } else if (s.type === 'longrect') {
            fill = '#ffe0b2';
            stroke = '#fb8c00';
          } else if (s.type === 'smallrect') {
            fill = '#e0f7fa';
            stroke = '#00838f';
          } else if (s.type === 'tallrect') {
            fill = '#f3e5f5';
            stroke = '#6a1b9a';
          } else if (s.type === 'platform') {
            fill = '#fff9c4';
            stroke = '#f9a825';
          } else if (s.type === 'pillar') {
            fill = '#d7ccc8';
            stroke = '#5d4037';
          }

          ctx.fillStyle = fill;
          ctx.strokeStyle = stroke;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(x, y, w, h, 6);
          ctx.fill();
          ctx.stroke();
        } else if (s.type === 'triangle' || s.type === 'bigtriangle') {
          const { x, y, width: w, height: h } = s;
          ctx.fillStyle = s.type === 'bigtriangle' ? '#ffab91' : '#ffccbc';
          ctx.strokeStyle = s.type === 'bigtriangle' ? '#e64a19' : '#ff7043';
          ctx.lineWidth = 2;
          ctx.beginPath();
          const cx = x + w / 2;
          const topY = y;
          const leftX = x;
          const rightX = x + w;
          const bottomY = y + h;
          ctx.moveTo(cx, topY);
          ctx.lineTo(rightX, bottomY);
          ctx.lineTo(leftX, bottomY);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          if (s.type === 'bigtriangle') {
            ctx.strokeStyle = '#ffccbc';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(cx, topY + 4);
            ctx.lineTo(rightX - 6, bottomY - 6);
            ctx.lineTo(leftX + 6, bottomY - 6);
            ctx.closePath();
            ctx.stroke();
          }
        } else if (s.type === 'hexagon') {
          const { x, y, width: w, height: h } = s;
          const cx = x + w / 2;
          const cy = y + h / 2;
          const rx = w / 2;
          const ry = h / 2;
          ctx.fillStyle = '#ffe0b2';
          ctx.strokeStyle = '#fb8c00';
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i;
            const px = cx + Math.cos(angle) * rx;
            const py = cy + Math.sin(angle) * ry;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else if (s.type === 'ramp') {
          const { x, y, width: w, height: h } = s;
          ctx.fillStyle = '#cfd8dc';
          ctx.strokeStyle = '#607d8b';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x, y + h); // bottom left
          ctx.lineTo(x + w, y + h); // bottom right
          ctx.lineTo(x + w, y); // top right
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          // Stripes
          ctx.strokeStyle = 'rgba(0,0,0,0.1)';
          ctx.lineWidth = 1;
          for(let i=10; i<w; i+=15) {
            ctx.beginPath();
            ctx.moveTo(x + i, y + h);
            ctx.lineTo(x + i, y + h - (i/w)*h);
            ctx.stroke();
          }
        } else if (s.type === 'spike') {
          const { x, y, width: w, height: h } = s;
          const baseY = y + h;
          ctx.fillStyle = '#b0bec5';
          ctx.strokeStyle = '#455a64';
          ctx.lineWidth = 2;
          ctx.beginPath();
          // Simple row of three triangular spikes
          const spikeCount = 3;
          for (let i = 0; i < spikeCount; i++) {
            const sx = x + (i + 0.5) * (w / spikeCount);
            const half = (w / spikeCount) * 0.4;
            const tipX = sx;
            const tipY = y;
            const leftX = sx - half;
            const rightX = sx + half;
            ctx.moveTo(leftX, baseY);
            ctx.lineTo(tipX, tipY);
            ctx.lineTo(rightX, baseY);
            ctx.closePath();
          }
          ctx.fill();
          ctx.stroke();
        } else if (s.type === 'diamond') {
          const { x, y, width: w, height: h } = s;
          const cx = x + w / 2;
          const cy = y + h / 2;
          ctx.fillStyle = '#e1bee7';
          ctx.strokeStyle = '#8e24aa';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(cx, y);           // top
          ctx.lineTo(x + w, cy);       // right
          ctx.lineTo(cx, y + h);       // bottom
          ctx.lineTo(x, cy);           // left
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else if (s.type === 'magnet') {
          const { x, y, width: w, height: h } = s;
          const cx = x + w / 2;
          const cy = y + h / 2;
          ctx.translate(cx, cy);
          const uW = w * 0.6;
          const uH = h * 0.5;
          ctx.lineWidth = 3;
          ctx.strokeStyle = '#c62828';
          ctx.beginPath();
          ctx.moveTo(-uW / 2, uH / 2);
          ctx.lineTo(-uW / 2, -uH / 4);
          ctx.arc(0, -uH / 4, uW / 2, Math.PI, 0, false);
          ctx.lineTo(uW / 2, uH / 2);
          ctx.stroke();
          // tips
          ctx.strokeStyle = '#b0bec5';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(-uW / 2, uH / 2);
          ctx.lineTo(-uW / 2, uH / 2 - 8);
          ctx.moveTo(uW / 2, uH / 2);
          ctx.lineTo(uW / 2, uH / 2 - 8);
          ctx.stroke();
        } else if (s.type === 'house') {
          const { x, y, width: w, height: h } = s;
          const baseH = h * 0.55;
          const roofH = h - baseH;

          // Base
          ctx.fillStyle = '#ffe0b2';
          ctx.strokeStyle = '#bf8040';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(x, y + roofH, w, baseH, 6);
          ctx.fill();
          ctx.stroke();

          // Door
          const doorW = w * 0.22;
          const doorH = baseH * 0.55;
          const doorX = x + w * 0.18;
          const doorY = y + roofH + baseH - doorH;
          ctx.fillStyle = '#8d6e63';
          ctx.beginPath();
          ctx.roundRect(doorX, doorY, doorW, doorH, 3);
          ctx.fill();

          // Window
          const winW = w * 0.22;
          const winH = baseH * 0.4;
          const winX = x + w * 0.56;
          const winY = y + roofH + baseH * 0.16;
          ctx.fillStyle = '#bbdefb';
          ctx.fillRect(winX, winY, winW, winH);
          ctx.strokeStyle = '#1565c0';
          ctx.strokeRect(winX, winY, winW, winH);
          ctx.beginPath();
          ctx.moveTo(winX + winW / 2, winY);
          ctx.lineTo(winX + winW / 2, winY + winH);
          ctx.moveTo(winX, winY + winH / 2);
          ctx.lineTo(winX + winW, winY + winH / 2);
          ctx.stroke();

          // Roof
          ctx.fillStyle = '#ef9a9a';
          ctx.strokeStyle = '#b71c1c';
          ctx.beginPath();
          const rx1 = x - 4;
          const rx2 = x + w + 4;
          const ry1 = y + roofH;
          const rTopX = x + w / 2;
          const rTopY = y;
          ctx.moveTo(rTopX, rTopY);
          ctx.lineTo(rx2, ry1);
          ctx.lineTo(rx1, ry1);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else if (s.type === 'weight10') {
          const { x, y, width: w, height: h } = s;
          ctx.fillStyle = '#424242';
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 2;

          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(x, y, w, h, 4);
          } else {
            ctx.rect(x, y, w, h);
          }
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#fafafa';
          ctx.font = 'bold 19px "WinXPTahoma", system-ui';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('10 t', x + w / 2, y + h / 2 + 1);
        } else if (s.type.startsWith('mc_')) {
          const img = mcImgs[s.type];
          if (img && img.complete) {
            if (s.type === 'mc_ghast') {
              // Ghast animation: slight size pulsing and bobbing
              const pulse = Math.sin(performance.now() * 0.01) * 2;
              ctx.drawImage(img, s.x - pulse/2, s.y - pulse/2, s.width + pulse, s.height + pulse);
            } else {
              ctx.drawImage(img, s.x, s.y, s.width, s.height);
            }
          } else {
            ctx.fillStyle = s.type === 'mc_lava' ? '#ff4500' : '#888';
            ctx.fillRect(s.x, s.y, s.width, s.height);
          }

          // TNT timer flash and display
          if (s.type === 'mc_tnt' && !s.exploding && typeof s.timer === 'number') {
            if (Math.floor(s.timer * 4) % 2 === 0) {
              ctx.fillStyle = 'rgba(255,255,255,0.45)';
              ctx.fillRect(s.x, s.y, s.width, s.height);
            }
            ctx.fillStyle = '#fff';
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.font = 'bold 16px "WinXPTahoma"';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const tx = s.x + s.width / 2;
            const ty = s.y + s.height / 2;
            ctx.strokeText(Math.ceil(s.timer), tx, ty);
            ctx.fillText(Math.ceil(s.timer), tx, ty);
          }
        } else if (s.type === 'rainbow_block') {
          const hue = (performance.now() * 0.1) % 360;
          ctx.fillStyle = `hsl(${hue}, 80%, 60%)`;
          ctx.strokeStyle = `hsl(${hue}, 80%, 30%)`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.roundRect(s.x, s.y, s.width, s.height, 4);
          ctx.fill();
          ctx.stroke();
        } else if (s.type === 'bomb' || s.type === 'firework' || s.type === 'nuke' || s.type === 'mc_tnt') {
          const { x, y, width: w, height: h } = s;
          const cx = x + w / 2;
          const cy = y + h / 2;

          if (s.type === 'bomb') {
            // Explosion glow if currently exploding
            if (s.exploding) {
              const age = s.explodeAge || 0;
              const t = Math.min(1, age / 0.4);
              const radius = 80 + 40 * t;
              const alpha = 0.7 * (1 - t);
              const grad = ctx.createRadialGradient(
                cx,
                cy,
                0,
                cx,
                cy,
                radius
              );
              grad.addColorStop(0, `rgba(255, 235, 59, ${alpha})`);
              grad.addColorStop(0.5, `rgba(255, 152, 0, ${alpha * 0.7})`);
              grad.addColorStop(1, 'rgba(0,0,0,0)');
              ctx.fillStyle = grad;
              ctx.beginPath();
              ctx.arc(cx, cy, radius, 0, Math.PI * 2);
              ctx.fill();
            }

            // Bomb body
            ctx.fillStyle = '#424242';
            ctx.strokeStyle = '#212121';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(cx, cy, Math.min(w, h) * 0.4, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Fuse
            ctx.strokeStyle = '#ffa726';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx, cy - Math.min(w, h) * 0.4);
            ctx.bezierCurveTo(
              cx + 6,
              cy - Math.min(w, h) * 0.8,
              cx + 14,
              cy - Math.min(w, h),
              cx + 10,
              cy - Math.min(w, h) * 1.1
            );
            ctx.stroke();

            // Small spark at the end if timer is low
            const timeLeft = typeof s.timer === 'number' ? s.timer : 0;
            if (!s.exploding && timeLeft < 1.2) {
              ctx.fillStyle = '#ffeb3b';
              ctx.beginPath();
              ctx.arc(
                cx + 10,
                cy - Math.min(w, h) * 1.1,
                3 + Math.random() * 1.2,
                0,
                Math.PI * 2
              );
              ctx.fill();
            }
          } else if (s.type === 'firework') {
            // Firework rocket body (only while not exploded)
            if (!s.exploding) {
              const rocketW = Math.max(12, w * 0.6);
              const rocketH = Math.max(26, h * 0.9);
              ctx.save();
              ctx.translate(cx, cy);

              // Body
              ctx.fillStyle = '#ff7043';
              ctx.strokeStyle = '#bf360c';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.roundRect(-rocketW / 2, -rocketH / 2 + 6, rocketW, rocketH - 12, 4);
              ctx.fill();
              ctx.stroke();

              // Cone tip
              ctx.fillStyle = '#ffcc80';
              ctx.beginPath();
              ctx.moveTo(0, -rocketH / 2 - 6);
              ctx.lineTo(rocketW / 2 + 4, -rocketH / 2 + 6);
              ctx.lineTo(-rocketW / 2 - 4, -rocketH / 2 + 6);
              ctx.closePath();
              ctx.fill();

              // Little burning trail
              ctx.strokeStyle = 'rgba(255, 183, 77, 0.9)';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(0, rocketH / 2);
              ctx.lineTo(0, rocketH / 2 + 10 + Math.sin(performance.now() * 0.02) * 3);
              ctx.stroke();

              ctx.restore();
            } else {
              // Small flash at the explosion center; main effect is handled by particles
              const age = s.explodeAge || 0;
              const t = Math.min(1, age / 0.6);
              const radius = 60 + 30 * (1 - t);
              const alpha = 0.8 * (1 - t);
              const grad = ctx.createRadialGradient(
                cx,
                cy,
                0,
                cx,
                cy,
                radius
              );
              grad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
              grad.addColorStop(0.4, `rgba(255, 241, 118, ${alpha * 0.9})`);
              grad.addColorStop(1, 'rgba(0,0,0,0)');
              ctx.fillStyle = grad;
              ctx.beginPath();
              ctx.arc(cx, cy, radius, 0, Math.PI * 2);
              ctx.fill();
            }
          } else if (s.type === 'nuke') {
            // Nuke: bigger, green-tinged mushroom cloud when exploding
            if (s.exploding) {
              const age = s.explodeAge || 0;
              const t = Math.min(1, age / 0.8);
              const radius = 140 + 80 * t;
              const alpha = 0.85 * (1 - t);
              const grad = ctx.createRadialGradient(
                cx,
                cy,
                0,
                cx,
                cy,
                radius
              );
              grad.addColorStop(0, `rgba(230, 255, 193, ${alpha})`);
              grad.addColorStop(0.35, `rgba(178, 255, 89, ${alpha * 0.9})`);
              grad.addColorStop(0.7, `rgba(118, 255, 3, ${alpha * 0.5})`);
              grad.addColorStop(1, 'rgba(0,0,0,0)');
              ctx.fillStyle = grad;
              ctx.beginPath();
              ctx.arc(cx, cy, radius, 0, Math.PI * 2);
              ctx.fill();

              // Simple mushroom stem
              ctx.fillStyle = 'rgba(120,140,120,0.9)';
              const stemW = Math.min(60, w * 1.4);
              const stemH = Math.min(80, h * 2.2);
              ctx.beginPath();
              if (ctx.roundRect) {
                ctx.roundRect(cx - stemW / 2, cy, stemW, stemH, 10);
              } else {
                ctx.rect(cx - stemW / 2, cy, stemW, stemH);
              }
              ctx.fill();
            } else {
              // Nuke body: long bomb with radiation symbol
              const bodyW = Math.max(26, w * 1.2);
              const bodyH = Math.max(32, h * 1.8);
              ctx.save();
              ctx.translate(cx, cy);

              // Tail fins
              ctx.fillStyle = '#263238';
              ctx.strokeStyle = '#000000';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(-bodyW * 0.45, bodyH * 0.25);
              ctx.lineTo(-bodyW * 0.18, bodyH * 0.02);
              ctx.lineTo(-bodyW * 0.18, bodyH * 0.45);
              ctx.closePath();
              ctx.fill();
              ctx.stroke();
              ctx.beginPath();
              ctx.moveTo(bodyW * 0.45, bodyH * 0.25);
              ctx.lineTo(bodyW * 0.18, bodyH * 0.02);
              ctx.lineTo(bodyW * 0.18, bodyH * 0.45);
              ctx.closePath();
              ctx.fill();
              ctx.stroke();

              // Body
              ctx.fillStyle = '#455a64';
              ctx.strokeStyle = '#1c313a';
              ctx.lineWidth = 2.4;
              ctx.beginPath();
              ctx.roundRect(-bodyW * 0.38, -bodyH * 0.25, bodyW * 0.76, bodyH * 0.8, 8);
              ctx.fill();
              ctx.stroke();

              // Nose cone
              ctx.beginPath();
              ctx.moveTo(0, -bodyH * 0.9);
              ctx.lineTo(bodyW * 0.32, -bodyH * 0.25);
              ctx.lineTo(-bodyW * 0.32, -bodyH * 0.25);
              ctx.closePath();
              ctx.fillStyle = '#607d8b';
              ctx.fill();
              ctx.stroke();

              // Radiation symbol
              const diskY = -bodyH * 0.05;
              ctx.fillStyle = '#ffeb3b';
              ctx.beginPath();
              ctx.arc(0, diskY, 10, 0, Math.PI * 2);
              ctx.fill();

              ctx.fillStyle = '#f57f17';
              const rOuterN = 15;
              const rInnerN = 3.5;
              for (let i = 0; i < 3; i++) {
                const baseAngle = (i * 2 * Math.PI) / 3;
                const a1 = baseAngle - Math.PI / 9;
                const a2 = baseAngle + Math.PI / 9;
                const px1 = Math.cos(a1) * rOuterN;
                const py1 = diskY + Math.sin(a1) * rOuterN;
                const px2 = Math.cos(a2) * rOuterN;
                const py2 = diskY + Math.sin(a2) * rOuterN;
                ctx.beginPath();
                ctx.moveTo(0, diskY);
                ctx.lineTo(px1, py1);
                ctx.lineTo(px2, py2);
                ctx.closePath();
                ctx.fill();
              }
              ctx.fillStyle = '#455a64';
              ctx.beginPath();
              ctx.arc(0, diskY, rInnerN, 0, Math.PI * 2);
              ctx.fill();

              ctx.restore();
            }
          }
        }
        ctx.restore();
      });
    }

    // Cars: draw after other shapes so they feel like active hazards
    if (Array.isArray(this.shapes)) {
      this.shapes.forEach((s) => {
        if (!s || s.type !== 'car') return;
        const { x, y, width: w, height: h } = s;
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        const dir = s.vx >= 0 ? 1 : -1;
        if (dir < 0) ctx.scale(-1, 1);

        // Body
        ctx.fillStyle = '#1976d2';
        ctx.strokeStyle = '#0d47a1';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-w / 2, -h / 2 + 4, w, h - 8, 8);
        ctx.fill();
        ctx.stroke();

        // Roof
        ctx.fillStyle = '#bbdefb';
        ctx.beginPath();
        ctx.roundRect(-w * 0.25, -h / 2 - 6, w * 0.5, h * 0.8, 4);
        ctx.fill();
        ctx.strokeStyle = '#0d47a1';
        ctx.stroke();

        // Headlights
        ctx.fillStyle = '#fff59d';
        ctx.beginPath();
        ctx.arc(w / 2 - 10, -h / 4, 4, 0, Math.PI * 2);
        ctx.fill();

        // Wheels
        ctx.fillStyle = '#212121';
        ctx.beginPath();
        ctx.arc(-w * 0.28, h / 2, 8, 0, Math.PI * 2);
        ctx.arc(w * 0.28, h / 2, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });
    }

    // World guns (dropped weapons)
    if (Array.isArray(this.guns) && this.guns.length) {
      this.guns.forEach((g) => {
        const gw = g.width || 26;
        const gh = g.height || 14;
        const cx = g.x + gw / 2;
        const cy = g.y + gh / 2;
        ctx.save();
        ctx.translate(cx, cy);
        if (gunImg.complete) {
          ctx.drawImage(gunImg, -gw / 2, -gh / 2, gw, gh);
        } else {
          ctx.fillStyle = '#555';
          ctx.strokeStyle = '#222';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.rect(-gw / 2, -gh / 2, gw * 0.7, gh * 0.55);
          ctx.fill();
          ctx.stroke();
          ctx.beginPath();
          ctx.rect(-gw * 0.05, -gh * 0.1, gw * 0.35, gh * 0.8);
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
      });
    }

    // Firework particle bursts
    if (Array.isArray(this.fireworkBursts) && this.fireworkBursts.length > 0) {
      ctx.save();
      this.fireworkBursts.forEach((burst) => {
        if (!burst || !Array.isArray(burst.particles)) return;
        burst.particles.forEach((p) => {
          const alpha = Math.max(0, p.life / (p.maxLife || 1));
          ctx.fillStyle = `${p.color}${Math.round(alpha * 255)
            .toString(16)
            .padStart(2, '0')}`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2 + (1 - alpha) * 1.5, 0, Math.PI * 2);
          ctx.fill();
        });
      });
      ctx.restore();
    }

    // Gun visual bursts (muzzle flashes & impact sparks)
    if (Array.isArray(this.gunBursts) && this.gunBursts.length) {
      ctx.save();
      this.gunBursts.forEach((burst) => {
        if (!burst || !Array.isArray(burst.particles)) return;
        burst.particles.forEach((p) => {
          if (p.life <= 0) return;
          const alpha = Math.max(0, p.life / (p.maxLife || 1));
          ctx.fillStyle = `rgba(${p.color[0]},${p.color[1]},${p.color[2]},${alpha})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size || 2, 0, Math.PI * 2);
          ctx.fill();
        });
      });
      ctx.restore();
    }

    // Random "error" popups when glitch mode is active
    if (Array.isArray(this.errorPopups) && this.errorPopups.length) {
      ctx.save();
      this.errorPopups.forEach((p) => {
        const alpha = Math.max(0, 1 - (p.age / p.ttl));
        ctx.globalAlpha = 0.95 * alpha;

        const x = p.x;
        const y = p.y;
        const w = p.width;
        const h = p.height;

        // Window body
        ctx.fillStyle = '#fdfdfd';
        ctx.strokeStyle = '#808080';
        ctx.lineWidth = 1;
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(x, y, w, h, 4);
        } else {
          ctx.rect(x, y, w, h);
        }
        ctx.fill();
        ctx.stroke();

        // Title bar
        const barH = 18;
        const grad = ctx.createLinearGradient(x, y, x, y + barH);
        grad.addColorStop(0, '#15428b');
        grad.addColorStop(1, '#0d2a5c');
        ctx.fillStyle = grad;
        ctx.fillRect(x + 1, y + 1, w - 2, barH - 2);

        // Title text
        ctx.fillStyle = '#ffffff';
        ctx.font = '13px "WinXPTahoma", system-ui';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.title || 'Error', x + 22, y + barH / 2);

        // Red X icon
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 4, y + 3, 14, 14);
        ctx.strokeStyle = '#c00000';
        ctx.strokeRect(x + 4, y + 3, 14, 14);
        ctx.strokeStyle = '#c00000';
        ctx.beginPath();
        ctx.moveTo(x + 6, y + 5);
        ctx.lineTo(x + 16, y + 15);
        ctx.moveTo(x + 16, y + 5);
        ctx.lineTo(x + 6, y + 15);
        ctx.stroke();

        // Message text
        ctx.fillStyle = '#000000';
        ctx.font = '13px "WinXPTahoma", system-ui';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(p.message, x + 10, y + barH + 6);
      });
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    // Draw context menu if present (simple small popup)
    if (this.contextMenu) {
      const cm = this.contextMenu;
      const menuW = 140;
      const rowH = 26;
      const menuH = (cm.type === 'shape') ? rowH * 3 : rowH;
      const mx = cm.x;
      const my = cm.y;

      ctx.save();
      // Drop Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.roundRect(mx + 3, my + 3, menuW, menuH, 6);
      ctx.fill();

      // Menu background
      ctx.fillStyle = 'rgba(40,40,40,0.98)';
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(mx, my, menuW, menuH, 6);
      ctx.fill();
      ctx.stroke();

      ctx.font = '13px "WinXPTahoma", system-ui';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';

      const rows = cm.type === 'shape' 
        ? ['Delete Item', `Float: ${cm.ref.floating ? 'ON' : 'OFF'}`, `Locked: ${cm.ref.locked ? 'YES' : 'NO'}`]
        : ['Delete Item'];

      rows.forEach((label, i) => {
        const isHovered = this.contextMenuHoverIndex === i;
        if (isHovered) {
          ctx.fillStyle = 'rgba(255,255,255,0.15)';
          ctx.beginPath();
          ctx.roundRect(mx + 4, my + i * rowH + 2, menuW - 8, rowH - 4, 4);
          ctx.fill();
        }

        let textColor = '#fff';
        if (cm.type === 'shape') {
          if (i === 1 && cm.ref.floating) textColor = '#a0ffa0';
          if (i === 2 && cm.ref.locked) textColor = '#ffaa99';
        }
        ctx.fillStyle = textColor;
        ctx.fillText(label, mx + 12, my + i * rowH + rowH * 0.5);
      });

      ctx.restore();
    }

    // Draw hover highlight for blocks
    if (this.hoveredObject && !this.draggingShape && !this.draggingTrampoline && !this.draggingSawblade) {
      const obj = this.hoveredObject.ref;
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 3]);
      ctx.shadowBlur = 8;
      ctx.shadowColor = 'white';

      if (this.hoveredObject.type === 'shape' && (obj.type === 'circle' || obj.type === 'bouncyball')) {
        ctx.beginPath();
        ctx.arc(obj.x, obj.y, obj.radius + 2, 0, Math.PI * 2);
        ctx.stroke();
      } else if (this.hoveredObject.type === 'sawblade') {
        ctx.beginPath();
        ctx.arc(obj.x, obj.y, obj.radius + 2, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.roundRect(obj.x - 2, obj.y - 2, (obj.width || 0) + 4, (obj.height || 0) + 4, 6);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Draw ephemeral toast if present
    if (this.toast) {
      const t = this.toast;
      const alpha = Math.max(0, 1 - Math.max(0, t.age - (t.ttl - 0.4)) / 0.4); // fade last 0.4s
      const padX = 16;
      const padY = 8;
      ctx.save();
      ctx.globalAlpha = 0.95 * alpha;
      ctx.fillStyle = 'rgba(40,40,40,0.95)';
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 1;
      ctx.font = '17px "WinXPTahoma", system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const text = t.text;
      const tw = Math.min(420, ctx.measureText(text).width + padX * 2);
      const tx = (width - tw) / 2;
      const ty = height * 0.18;
      const th = 28;
      // Rounded rect
      ctx.beginPath();
      ctx.roundRect(tx, ty, tw, th, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.fillText(text, tx + tw / 2, ty + th / 2);
      ctx.restore();
    }

    // Draw Quick Tip notification (top right)
    if (this.quickTip && this.quickTip.visible) {
      const q = this.quickTip;
      const qx = width - q.width - 15;
      const qy = 15;
      const alpha = q.age > q.ttl - 0.5 ? (q.ttl - q.age) / 0.5 : 1.0;

      ctx.save();
      ctx.globalAlpha = alpha;
      
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.roundRect(qx + 3, qy + 3, q.width, q.height, 8);
      ctx.fill();

      // Main box (XP balloon-tip style yellow/white)
      const grad = ctx.createLinearGradient(qx, qy, qx, qy + q.height);
      grad.addColorStop(0, '#fffffa');
      grad.addColorStop(1, '#ffeb99');
      ctx.fillStyle = grad;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(qx, qy, q.width, q.height, 8);
      ctx.fill();
      ctx.stroke();

      // Title
      ctx.fillStyle = '#000';
      ctx.font = 'bold 13px "WinXPTahoma", system-ui';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('Quick Tip', qx + 10, qy + 8);

      // Body text wrapping
      ctx.font = '15px "WinXPTahoma", system-ui';
      const words = q.text.split(' ');
      let line = '';
      let ty = qy + 30;
      const maxWidth = q.width - 25;
      
      for(let n = 0; n < words.length; n++) {
        let testLine = line + words[n] + ' ';
        let metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
          ctx.fillText(line, qx + 10, ty);
          line = words[n] + ' ';
          ty += 18;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, qx + 10, ty);

      // Close 'X' button
      const closeSize = 16;
      const closeX = qx + q.width - closeSize - 6;
      const closeY = qy + 6;
      
      // Hover highlight for X
      const isHoverX = input && input.cursor && 
                      input.cursor.x >= closeX - 2 && input.cursor.x <= closeX + closeSize + 2 &&
                      input.cursor.y >= closeY - 2 && input.cursor.y <= closeY + closeSize + 2;
      
      if (isHoverX) {
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.beginPath();
        ctx.roundRect(closeX - 2, closeY - 2, closeSize + 4, closeSize + 4, 3);
        ctx.fill();
      }
      
      ctx.strokeStyle = '#666';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(closeX + 4, closeY + 4); ctx.lineTo(closeX + closeSize - 4, closeY + closeSize - 4);
      ctx.moveTo(closeX + closeSize - 4, closeY + 4); ctx.lineTo(closeX + 4, closeY + closeSize - 4);
      ctx.stroke();

      ctx.restore();
    }

    // FPS counter (top-right corner) if enabled
    if (this.settings && this.settings.showFps && typeof this.fps === 'number') {
      const fpsText = `${Math.round(this.fps)} FPS`;
      ctx.save();
      ctx.font = '15px "WinXPTahoma", system-ui';
      const padX = 6;
      const padY = 3;
      const textWidth = ctx.measureText(fpsText).width;
      const boxW = textWidth + padX * 2;
      const boxH = 18;
      const x = width - boxW - 8;
      const y = 8;
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillRect(x, y, boxW, boxH);
      ctx.strokeStyle = 'rgba(255,255,255,0.28)';
      ctx.strokeRect(x + 0.5, y + 0.5, boxW - 1, boxH - 1);
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(fpsText, x + boxW / 2, y + boxH / 2 + 0.5);
      ctx.restore();
    }

    // Taskbar
    drawTaskbar(ctx, {
      width,
      height,
      windows: this.windows,
      activeWindowId: this.activeWindowId,
      settings: this.settings,
      taskbarHoverWindow: this.taskbarHoverWindow,
    });

    // Draw dragged item following the cursor, if any
    if (this.draggingWeapon && input && input.cursor) {
      const { x, y } = input.cursor;
      ctx.save();
      ctx.translate(x, y);
      drawDragWeaponIcon(ctx, this.draggingWeapon.type);
      ctx.restore();
    }

    // Draw weapon held by the cursor (gun/knife), if any
    if (this.equippedCursorWeapon && input && input.cursor) {
      const { x, y } = input.cursor;
      ctx.save();
      ctx.translate(x, y);
      
      // For the cursor gun, face the nearest stickman automatically
      if (this.equippedCursorWeapon.type === 'gun' && Array.isArray(this.sticks) && this.sticks.length > 0) {
        let bestStick = null;
        let bestDist = Infinity;
        this.sticks.forEach((s) => {
          const body = s.points && s.points[1] ? s.points[1] : s.pos;
          if (!body) return;
          const d = Math.hypot(body.x - x, body.y - y);
          if (d < bestDist) {
            bestDist = d;
            bestStick = s;
          }
        });
        if (bestStick && bestDist < 1000) {
          const targetX = (bestStick.points && bestStick.points[1] ? bestStick.points[1].x : bestStick.pos.x);
          if (targetX < x) ctx.scale(-1, 1);
        }
      }

      drawDragWeaponIcon(ctx, this.equippedCursorWeapon.type);
      ctx.restore();
    }

    // Start menu (drawn above taskbar and windows)
    if (this.showStartMenu) {
      drawStartMenu(ctx, this, { width, height });
    }

    // Screen-space glitch overlay (scanlines / tint) on top of everything in glitch mode
    if (this.glitchActive && this.glitchIntensity > 0) {
      const intensity = Math.min(1.5, this.glitchIntensity);
      ctx.save();
      ctx.globalAlpha = 0.09 * intensity;
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(0, 0, width, height);

      // Horizontal scanlines
      ctx.globalAlpha = 0.08 * intensity;
      ctx.fillStyle = '#000000';
      for (let y = 0; y < height; y += 3) {
        ctx.fillRect(0, y, width, 1);
      }

      // A few random green bars
      ctx.globalAlpha = 0.08 * intensity;
      ctx.fillStyle = '#00ff00';
      for (let i = 0; i < 4; i++) {
        const ry = Math.random() * height;
        const rh = 4 + Math.random() * 10;
        ctx.fillRect(0, ry, width, rh);
      }

      // Creepy countdown timer
      if (this.crashTimer > 0) {
        ctx.globalAlpha = 1.0;
        const secondsLeft = Math.ceil(this.crashTimer);
        const shakeX = (Math.random() - 0.5) * (intensity * 4);
        const shakeY = (Math.random() - 0.5) * (intensity * 4);
        
        ctx.font = `bold ${48 + intensity * 10}px "Courier New", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Shadow/glow
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillText(`00:${secondsLeft.toString().padStart(2, '0')}`, width / 2 + shakeX + 4, height / 2 + shakeY + 4);
        
        ctx.fillStyle = secondsLeft <= 5 ? '#ff0000' : '#ffffff';
        ctx.fillText(`00:${secondsLeft.toString().padStart(2, '0')}`, width / 2 + shakeX, height / 2 + shakeY);
        
        // Glitchy "SYSTEM CRITICAL" text
        if (Math.random() < 0.3) {
          ctx.font = 'bold 18px "Courier New"';
          ctx.fillStyle = '#ff0000';
          ctx.fillText('CRITICAL SYSTEM FAILURE IMMINENT', width / 2, height / 2 + 60);
        }
      }

      ctx.restore();
    }

    // Restore after optional screen shake transform
    ctx.restore();
  }

  hitTestStartButton(x, y, { width, height }) {
    const startX = 6;
    const startY = height - TASKBAR_HEIGHT + 4;
    const startHeight = TASKBAR_HEIGHT - 8;
    let startWidth = 80;

    if (startButtonImg.complete && startButtonImg.naturalWidth > 0) {
      const aspect = startButtonImg.naturalWidth / startButtonImg.naturalHeight;
      startWidth = Math.min(120, startHeight * aspect);
    }

    return (
      x >= startX &&
      x <= startX + startWidth &&
      y >= startY &&
      y <= startY + startHeight
    );
  }

  handleStartButton(width, height) {
    // Toggle the XP-style Start menu
    this.showStartMenu = !this.showStartMenu;
  }

  hitTestTaskbarButton(x, y, { width, height }) {
    const barTop = height - TASKBAR_HEIGHT;
    if (y < barTop || y > barTop + TASKBAR_HEIGHT) return null;

    // Match taskbar button positions to the actual Start button width
    const startX = 6;
    const startHeight = TASKBAR_HEIGHT - 8;
    let startWidth = 80;
    if (startButtonImg.complete && startButtonImg.naturalWidth > 0) {
      const aspect = startButtonImg.naturalWidth / startButtonImg.naturalHeight;
      startWidth = Math.min(120, startHeight * aspect);
    }

    let currentX = startX + startWidth + 8;
    const btnHeight = TASKBAR_HEIGHT - 8;

    for (const win of this.windows) {
      if (win.closed) continue;
      const w = Math.max(70, Math.min(120, win.title.length * 7 + 20));
      const btnX = currentX;
      const btnY = barTop + 4;
      if (
        x >= btnX &&
        x <= btnX + w &&
        y >= btnY &&
        y <= btnY + btnHeight
      ) {
        return win;
      }
      currentX += w + 6;
    }
    return null;
  }

  // Hit test for the fullscreen button placed at the far-right of the taskbar.
  hitTestFullScreenButton(x, y, { width, height }) {
    const barTop = height - TASKBAR_HEIGHT;
    const btnSize = 28;
    const padding = 6;
    const bx = width - btnSize - padding;
    const by = barTop + (TASKBAR_HEIGHT - btnSize) / 2;
    if (x >= bx && x <= bx + btnSize && y >= by && y <= by + btnSize) {
      return true;
    }
    return false;
  }

  // Toggle browser fullscreen for the app root element (document.documentElement).
  toggleFullScreen() {
    try {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        // Request fullscreen on the document element so the entire page goes fullscreen.
        document.documentElement.requestFullscreen();
      }
    } catch (err) {
      // ignore failures (browser may block without user gesture)
      console.warn('Fullscreen toggle failed', err);
    }
  }

  hitTestWindowResizeEdge(win, x, y) {
    return hitTestWindowResizeEdgeUI(win, x, y);
  }



  handleAppInteraction(win, x, y, input, viewport) {
    const width = viewport && typeof viewport.width === 'number'
      ? viewport.width
      : window.innerWidth;
    const height = viewport && typeof viewport.height === 'number'
      ? viewport.height
      : window.innerHeight;
    const rect = this.getPaintContentRect(win);
    const lx = x - rect.x;
    const ly = y - rect.y;

    if (win.appId === 'paint') {
      // Delegate hit-testing for Paint UI to the dedicated module
      handlePaintInteraction(this, win, x, y, viewport);
    }

    if (win.appId === 'jail') {
      const barHeight = 24;
      const innerPad = 8;
      const contentX = win.x + innerPad;
      const contentY = win.y + barHeight + innerPad;
      const contentW = win.width - innerPad * 2;
      const btnW = 120, btnH = 24;
      const btnX = contentX + (contentW - btnW) / 2;
      const btnY = contentY + 10;
      if (x >= btnX && x <= btnX + btnW && y >= btnY && y <= btnY + btnH) {
        if (Array.isArray(this.sticks)) {
          this.sticks.forEach(st => {
            if (st.jailedWindowId === win.id) {
              st.jailedWindowId = null;
              st.setState('jump');
              st.showEmote('🔓', 1.0);
            }
          });
        }
        this.showToast('Jail cells opened!', 1.5);
      }
    }

    if (win.appId === 'calculator') {
      const btnW = 30, btnH = 25, gap = 4;
      const buttons = [
        ['7','8','9','/'],
        ['4','5','6','*'],
        ['1','2','3','-'],
        ['0','C','=','+']
      ];
      const startX = 10, startY = 50;
      buttons.forEach((row, r) => {
        row.forEach((btn, c) => {
          const bx = startX + c * (btnW + gap);
          const by = startY + r * (btnH + gap);
          if (lx >= bx && lx <= bx + btnW && ly >= by && ly <= by + btnH) {
            this.pressCalc(win, btn);
          }
        });
      });
    }

    // "My Computer" – select drives, show details, and interact with left-pane shortcuts
    if (win.appId === 'computer') {
      const barHeight = 24;
      const innerPad = 8;
      const contentX = win.x + innerPad;
      const contentY = win.y + barHeight + innerPad;
      const contentW = win.width - innerPad * 2;
      const contentH = win.height - barHeight - innerPad * 2;

      // Layout mirrors drawWindow() for "computer"
      const toolbarH = 22;
      const addressH = 26;
      const listStartY = contentY + toolbarH + addressH;
      const paneWidth = Math.max(120, Math.min(160, contentW * 0.35));
      const listX = contentX + paneWidth + 6;
      const listW = contentX + contentW - listX;
      const headerH = 18;
      const rowsY = listStartY + headerH;

      const rowH = 20;
      const rows = [
        ['Local Disk (C:)', 'Local Disk', '19.9 GB'],
        ['Local Disk (D:)', 'Local Disk', '29.7 GB'],
        ['3½ Floppy (A:)', 'Floppy', '1.44 MB'],
        ['CD Drive (E:)', 'CD-ROM', '700 MB'],
      ];

      // Click on drive list: select row and open a "folder" style view for that drive.
      if (
        x >= listX &&
        x <= listX + listW &&
        y >= rowsY &&
        y <= rowsY + rows.length * rowH
      ) {
        const index = Math.floor((y - rowsY) / rowH);
        if (index >= 0 && index < rows.length) {
          win.computerSelectedDriveIndex = index;

          // Open a generic folder window representing this drive
          const viewport = { width, height };
          const folderWin = this.ensureWindow('folder', viewport);
          if (folderWin) {
            folderWin.title = rows[index][0];
            // Lightly theme the contents to feel like a drive root
            folderWin.folderItems = [
              ['Program Files', '', 'File Folder'],
              ['Windows', '', 'File Folder'],
              ['Users', '', 'File Folder'],
              ['Documents and Settings', '', 'File Folder'],
              ['Games', '', 'File Folder'],
            ];
          }
        }
      }

      // Left blue pane interactions (System Tasks / Other Places)
      // Recreate the same geometry used in drawExplorerLeftPane()
      const paneX = contentX;
      const paneY = contentY + 24;
      const paneH = contentH - 28;

      // Sections drawn in drawExplorerLeftPane:
      //   "System Tasks" (3 items), then "Other Places" (3 items)
      const sectionStartY = paneY + 30;

      // Heights taken from drawExplorerLeftPane:
      // header 18, gap 22, items*16, bottom gap 6.
      const systemTasksHeight = 18 + 22 + 3 * 16 + 6; // 94
      const otherPlacesHeight = 18 + 22 + 3 * 16 + 6;

      const systemTasksRect = {
        x: paneX + 6,
        y: sectionStartY,
        w: paneWidth - 12,
        h: systemTasksHeight,
      };
      const otherPlacesRect = {
        x: paneX + 6,
        y: sectionStartY + systemTasksHeight,
        w: paneWidth - 12,
        h: otherPlacesHeight,
      };

      const withinRect = (rx, ry, rw, rh) =>
        x >= rx && x <= rx + rw && y >= ry && y <= ry + rh;

      // Clicking anywhere in "System Tasks" opens Settings for quick access.
      if (withinRect(systemTasksRect.x, systemTasksRect.y, systemTasksRect.w, systemTasksRect.h)) {
        const viewport = { width, height };
        this.ensureWindow('settings', viewport);
      }

      // Clicking anywhere in "Other Places" opens My Documents.
      if (withinRect(otherPlacesRect.x, otherPlacesRect.y, otherPlacesRect.w, otherPlacesRect.h)) {
        const viewport = { width, height };
        this.ensureWindow('folder', viewport);
      }
    }

    // Internet Explorer – navigation between home and search results, plus clickable result links & tabs
    if (win.appId === 'internet') {
      const barHeight = 24;
      const innerPad = 8;
      const contentX = win.x + innerPad;
      const contentY = win.y + barHeight + innerPad;
      const contentW = win.width - innerPad * 2;
      const contentH = win.height - barHeight - innerPad * 2;

      const toolbarH = 22;
      const addressH = 30;
      const tabsH = 20;
      const statusH = 16;

      // Ensure tab state exists (for older saves)
      if (!Array.isArray(win.internetTabs) || win.internetTabs.length === 0) {
        win.internetTabs = [
          {
            id: 1,
            title: 'Google',
            url: 'https://web.archive.org/web/20070629074743/http://www.google.com/',
            page: 'home',
            query: '',
            aiResults: null,
            loadingSearch: false,
          },
        ];
        win.internetActiveTab = 0;
      }
      if (
        typeof win.internetActiveTab !== 'number' ||
        win.internetActiveTab < 0 ||
        win.internetActiveTab >= win.internetTabs.length
      ) {
        win.internetActiveTab = 0;
      }
      const activeTab = win.internetTabs[win.internetActiveTab];

      // Toolbar buttons (Back / Forward / Stop / Refresh / Home)
      // Make the top toolbar in Internet Explorer actually control the active tab.
      if (
        y >= contentY &&
        y <= contentY + toolbarH &&
        x >= contentX &&
        x <= contentX + contentW
      ) {
        // Approximate button hit-boxes to match the visual toolbar layout.
        const labels = ['Back', 'Forward', 'Stop', 'Refresh', 'Home'];
        const widths = [52, 68, 56, 68, 64]; // rough widths matching the rendered buttons
        let bx = contentX + 6;
        let clickedLabel = null;

        for (let i = 0; i < labels.length; i++) {
          const bw = widths[i];
          const bx2 = bx + bw;
          if (x >= bx && x <= bx2) {
            clickedLabel = labels[i];
            break;
          }
          bx = bx2 + 4;
        }

        if (clickedLabel) {
          const googleHome =
            'https://web.archive.org/web/20070629074743/http://www.google.com/';

          if (clickedLabel === 'Home') {
            // Always jump back to the old Google home page for this tab.
            activeTab.url = googleHome;
            activeTab.page = 'home';
            activeTab.aiResults = null;
            activeTab.loadingSearch = false;
          } else if (clickedLabel === 'Back') {
            // Simple "Back": if on results, go back to the home page.
            if (activeTab.page === 'results') {
              activeTab.url = googleHome;
              activeTab.page = 'home';
              activeTab.aiResults = null;
              activeTab.loadingSearch = false;
            }
          } else if (clickedLabel === 'Forward') {
            // Simple "Forward": if we have a query and are on home, jump to results.
            if (activeTab.page === 'home' && activeTab.query && activeTab.query.trim()) {
              const q = activeTab.query.trim();
              activeTab.url =
                'https://www.google.com/search?q=' + encodeURIComponent(q);
              activeTab.page = 'results';
              activeTab.aiResults = null;
              activeTab.loadingSearch = true;
              this.runInternetSearch(win, activeTab, q);
            }
          } else if (clickedLabel === 'Stop') {
            // Just stop any in-progress AI search for this tab.
            activeTab.loadingSearch = false;
          } else if (clickedLabel === 'Refresh') {
            // Re-run the AI search if we're on a results page with a query.
            if (activeTab.page === 'results' && activeTab.query && activeTab.query.trim()) {
              const q = activeTab.query.trim();
              activeTab.url =
                'https://www.google.com/search?q=' + encodeURIComponent(q);
              activeTab.loadingSearch = true;
              this.runInternetSearch(win, activeTab, q);
            }
          }

          // Clicking a toolbar button should not fall through to other click handlers.
          return;
        }
      }

      const pageX = contentX;
      const pageY = contentY + toolbarH + addressH + tabsH + 2;
      const pageW = contentW;
      const pageH = contentH - (pageY - contentY) - statusH;

      const centerX = pageX + pageW / 2;
      const logoY = pageY + 40;
      const searchBoxY = logoY + 30;
      const searchBoxH = 24;
      const buttonsY = searchBoxY + searchBoxH + 12;
      const buttonsH = 22;
      const buttonTotalW = 220;
      const buttonsLeft = centerX - buttonTotalW / 2;
      const buttonsRight = centerX + buttonTotalW / 2;

      // --- Tab strip hit-testing (switch, close, new tab) ---
      const tabsY = contentY + toolbarH + addressH;
      const tabsHeight = tabsH;
      const maxTabs = win.internetTabs.length;
      let tabX = contentX + 6;
      const tabPadding = 30;
      const tabMinW = 120;
      const tabMaxW = Math.max(140, Math.min(220, contentW / 2));

      for (let i = 0; i < maxTabs; i++) {
        const t = win.internetTabs[i];
        const approxTitle = t.title || 'Tab';
        const estTextW = approxTitle.length * 7;
        const tabW = Math.max(tabMinW, Math.min(tabMaxW, estTextW + tabPadding));
        const tabRect = {
          x: tabX,
          y: tabsY,
          w: tabW,
          h: tabsHeight,
        };

        if (
          x >= tabRect.x &&
          x <= tabRect.x + tabRect.w &&
          y >= tabRect.y &&
          y <= tabRect.y + tabRect.h
        ) {
          // Close button region on the right side of the tab
          const closeSize = 10;
          const closeX = tabRect.x + tabRect.w - closeSize - 8;
          const closeY = tabRect.y + (tabRect.h - closeSize) / 2;
          const overClose =
            x >= closeX &&
            x <= closeX + closeSize &&
            y >= closeY &&
            y <= closeY + closeSize;

          if (overClose && win.internetTabs.length > 1) {
            // Close this tab
            win.internetTabs.splice(i, 1);
            if (win.internetActiveTab >= win.internetTabs.length) {
              win.internetActiveTab = win.internetTabs.length - 1;
            }
          } else {
            // Activate tab
            win.internetActiveTab = i;
          }
          return;
        }

        tabX += tabW + 4;
      }

      // New-tab button at the right end of tabs
      const plusSize = 18;
      const plusX = Math.min(contentX + contentW - plusSize - 10, tabX + 4);
      const plusY = tabsY + (tabsHeight - plusSize) / 2;
      if (
        x >= plusX &&
        x <= plusX + plusSize &&
        y >= plusY &&
        y <= plusY + plusSize
      ) {
        const newId =
          win.internetTabs.reduce((m, t) => Math.max(m, t.id), 0) + 1;
        win.internetTabs.push({
          id: newId,
          title: 'New Tab',
          url: 'https://web.archive.org/web/20070629074743/http://www.google.com/',
          page: 'home',
          query: '',
          aiResults: null,
          loadingSearch: false,
        });
        win.internetActiveTab = win.internetTabs.length - 1;
        return;
      }

      // Clicking search buttons on the Google home page => AI results page
      if (activeTab.page === 'home') {
        // Click in the search box: prompt for a query, then search
        const searchBoxW = Math.min(380, pageW - 80);
        const searchBoxX = centerX - searchBoxW / 2;
        if (
          y >= searchBoxY &&
          y <= searchBoxY + searchBoxH &&
          x >= searchBoxX &&
          x <= searchBoxX + searchBoxW
        ) {
          const q = prompt('Search the web for:', activeTab.query || '');
          if (q && q.trim()) {
            activeTab.query = q.trim();
            activeTab.url = `https://www.google.com/search?q=${encodeURIComponent(
              activeTab.query
            )}`;
            activeTab.page = 'results';
            activeTab.aiResults = null;
            activeTab.loadingSearch = true;
            this.runInternetSearch(win, activeTab, activeTab.query);
          }
          return;
        }

        // Click on either search button
        if (
          y >= buttonsY &&
          y <= buttonsY + buttonsH &&
          x >= buttonsLeft &&
          x <= buttonsRight
        ) {
          if (!activeTab.query) {
            activeTab.query = 'stickman xp desktop';
          }
          activeTab.url = `https://www.google.com/search?q=${encodeURIComponent(
            activeTab.query
          )}`;
          activeTab.page = 'results';
          activeTab.aiResults = null;
          activeTab.loadingSearch = true;
          this.runInternetSearch(win, activeTab, activeTab.query);
          return;
        }
      }

      // On results page, clicking the Google logo area goes back home for this tab
      if (activeTab.page === 'results') {
        if (
          y >= logoY - 20 &&
          y <= logoY + 20 &&
          x >= centerX - 100 &&
          x <= centerX + 100
        ) {
          activeTab.url =
            'https://web.archive.org/web/20070629074743/http://www.google.com/';
          activeTab.page = 'home';
          activeTab.aiResults = null;
          activeTab.loadingSearch = false;
          return;
        }

        // Clickable search results (titles/URLs act as links that open related apps)
        const resultsTop = pageY + 52 + 24; // matches drawWindow() layout
        let ry = resultsTop;

        // Prefer AI-generated results, but fall back to a few curated ones
        const fallbackResults = [
          {
            title: 'Animation vs. Cursor - Windows XP Desktop Sandbox',
            url: 'https://example.com/animation-vs-cursor',
            appId: 'tools',
          },
          {
            title: 'How to escape your mouse cursor (for stick figures)',
            url: 'https://example.com/stickman-guide',
            appId: 'info',
          },
          {
            title: 'Bliss wallpaper appreciation thread',
            url: 'https://example.com/bliss-hill',
            appId: 'settings',
          },
        ];

        const aiResults =
          Array.isArray(activeTab.aiResults) && activeTab.aiResults.length
            ? activeTab.aiResults
            : fallbackResults;

        const titleHeight = 18;
        const urlHeight = 16;
        const snippetHeight = 26;
        const resultHeight = titleHeight + urlHeight + snippetHeight;

        for (let i = 0; i < aiResults.length; i++) {
          const res = aiResults[i];
          const rTop = ry;
          const rBottom = ry + resultHeight;
          const rLeft = pageX + 16;
          const rRight = pageX + pageW - 16;

          if (
            x >= rLeft &&
            x <= rRight &&
            y >= rTop &&
            y <= rBottom
          ) {
            // Update tab title & URL
            activeTab.title = res.title || activeTab.title || 'Result';
            activeTab.url = res.url || activeTab.url;

            // Open an associated desktop app for some known URLs
            if (res.appId) {
              this.ensureWindow(res.appId, { width, height });
            } else if (typeof res.url === 'string') {
              const u = res.url.toLowerCase();
              if (u.includes('tools')) this.ensureWindow('tools', { width, height });
              else if (u.includes('paint')) this.ensureWindow('paint', { width, height });
              else if (u.includes('minesweeper')) this.ensureWindow('minesweeper', { width, height });
              else if (u.includes('calculator')) this.ensureWindow('calculator', { width, height });
              else if (u.includes('bliss') || u.includes('wallpaper')) {
                this.ensureWindow('settings', { width, height });
              }
            }

            this.showToast(`Opened "${res.title || 'result'}"`, 1.6);
            return;
          }

          ry += resultHeight;
        }
      }

      // Status bar "Done" area acts like a quick "Home" button for the active tab
      const statusY = contentY + contentH - statusH;
      if (
        y >= statusY &&
        y <= statusY + statusH &&
        x >= contentX &&
        x <= contentX + 80
      ) {
        activeTab.url =
          'https://web.archive.org/web/20070629074743/http://www.google.com/';
        activeTab.page = 'home';
        activeTab.aiResults = null;
        activeTab.loadingSearch = false;
      }
    }

    if (win.appId === 'notavirus') {
      const barHeight = 24;
      const innerPad = 8;
      const contentX = win.x + innerPad;
      const contentY = win.y + barHeight + innerPad;
      const contentW = win.width - innerPad * 2;
      const contentH = win.height - barHeight - innerPad * 2;

      const msgY = contentY + 40;
      const buttonsY = contentY + contentH - 50;
      const btnW = 80;
      const btnH = 24;
      const yesX = contentX + contentW / 2 - btnW - 8;
      const noX = contentX + contentW / 2 + 8;

      if (
        y >= buttonsY &&
        y <= buttonsY + btnH &&
        x >= yesX &&
        x <= yesX + btnW
      ) {
        // User confirmed running the "virus"
        this.activateGlitchMode();
        // Close the window with a short animation
        if (!win.anim || win.anim.state !== 'closing') {
          win.anim = { state: 'closing', t: 0, duration: 0.18 };
        }
        return;
      }

      if (
        y >= buttonsY &&
        y <= buttonsY + btnH &&
        x >= noX &&
        x <= noX + btnW
      ) {
        // Just close the window
        if (!win.anim || win.anim.state !== 'closing') {
          win.anim = { state: 'closing', t: 0, duration: 0.18 };
        }
        return;
      }
    }

    if (win.appId === 'minesweeper') {
      // Use the same board geometry as in drawWindow() so clicks line up with the grid.
      const barHeight = 24;
      const innerPad = 8;
      const contentX = win.x + innerPad;
      const contentY = win.y + barHeight + innerPad;
      const contentW = win.width - innerPad * 2;
      const contentH = win.height - barHeight - innerPad * 2;

      const cell = 20;
      const boardPad = 10;
      const headerH = 34;

      const headerX = contentX + boardPad;
      const headerY = contentY + boardPad;
      const headerW = contentW - boardPad * 2;

      const boardX = headerX;
      const boardY = headerY + headerH + 8;
      const boardW = GRID_SIZE * cell;
      const boardH = GRID_SIZE * cell;

      // Only handle clicks that land within the actual board area.
      if (
        x >= boardX &&
        x < boardX + boardW &&
        y >= boardY &&
        y < boardY + boardH
      ) {
        const gx = Math.floor((x - boardX) / cell);
        const gy = Math.floor((y - boardY) / cell);
        if (gx >= 0 && gx < GRID_SIZE && gy >= 0 && gy < GRID_SIZE) {
          const hitMine = revealMine(win, gy, gx);
          if (hitMine) {
            // Trigger explosion effect and screen shake
            this.startScreenShake(0.5, 18);
            if (this.bombSound && !this.settings.muteAllSound) {
              this.bombSound.currentTime = 0;
              this.bombSound.play().catch(() => {});
            }
            this.spawnGunBurst('impact', x, y, 0, -1);
            
            // Push nearby stickmen
            if (Array.isArray(this.sticks)) {
              this.sticks.forEach(st => {
                const body = st.points && st.points[1] ? st.points[1] : st.pos;
                const d = Math.hypot(body.x - x, body.y - y);
                if (d < 160) {
                  st.setState('ragdoll');
                  const ang = Math.atan2(body.y - y, body.x - x);
                  const force = (1 - d / 160) * 20;
                  st.points.forEach(p => {
                    p.x += Math.cos(ang) * force;
                    p.y += Math.sin(ang) * force;
                    p.oldX -= Math.cos(ang) * force * 0.5;
                    p.oldY -= Math.sin(ang) * force * 0.5;
                  });
                }
              });
            }
          }
        }
      }
    }

    // AOL chat app – clicking the Send button should send the current draft
    if (win.appId === 'aol') {
      const barHeight = 24;
      const innerPad = 8;
      const contentX = win.x + innerPad;
      const contentY = win.y + barHeight + innerPad;
      const contentW = win.width - innerPad * 2;
      const contentH = win.height - barHeight - innerPad * 2;

      const headerH = 40;
      const buddyPaneWidth = Math.max(120, Math.min(160, contentW * 0.35));

      // Match the layout used in drawWindow() for the AOL chat window
      const chatX = contentX + buddyPaneWidth + 6;
      const chatY = contentY + headerH + 4;
      const chatW = contentW - buddyPaneWidth - 10;
      const chatH = contentH - headerH - 8;
      const inputH = 40;
      const historyH = chatH - inputH - 6;

      const inputY = chatY + historyH + 4;
      const sendW = 64;
      const sendH = 22;
      const sendX = chatX + chatW - sendW - 8;
      const sendY = inputY + (inputH - sendH) / 2;

      if (
        x >= sendX &&
        x <= sendX + sendW &&
        y >= sendY &&
        y <= sendY + sendH
      ) {
        this.sendAolMessage(win);
      }

      // Buddy selection logic
      const buddies = win.aolConversations;
      const buddyX = contentX;
      const buddyY = contentY + headerH;
      if (buddies && x >= buddyX && x <= buddyX + buddyPaneWidth && y >= buddyY + 22) {
        const index = Math.floor((y - (buddyY + 22)) / 16);
        if (index >= 0 && index < buddies.length) {
          // Save current conversation state
          if (win.aolConversations[win.aolSelectedBuddy]) {
            win.aolConversations[win.aolSelectedBuddy].messages = win.chatMessages;
            win.aolConversations[win.aolSelectedBuddy].history = win.chatHistory;
          }
          // Load new one
          win.aolSelectedBuddy = index;
          win.chatMessages = buddies[index].messages;
          win.chatHistory = buddies[index].history;
        }
      }
    }

    // Clippy helper app – clicking the Send button should send the current draft
    if (win.appId === 'clippy') {
      const barHeight = 24;
      const innerPad = 8;
      const contentX = win.x + innerPad;
      const contentY = win.y + barHeight + innerPad;
      const contentW = win.width - innerPad * 2;
      const contentH = win.height - barHeight - innerPad * 2;

      const bodyY = contentY + 32;
      const bodyH = contentH - 40;
      const historyH = bodyH - 46;

      const historyX = contentX + 90;
      const historyY = bodyY + 4;
      const historyW = contentW - 100;

      const inputY = historyY + historyH + 4;
      const inputH = 32;
      const sendW = 64;
      const sendH = 22;
      const sendX = historyX + historyW - sendW - 6;
      const sendY = inputY + (inputH - sendH) / 2;

      if (
        x >= sendX &&
        x <= sendX + sendW &&
        y >= sendY &&
        y <= sendY + sendH
      ) {
        this.sendClippyMessage(win);
      }
    }

    // "My Documents" – select rows in the details list
    if (win.appId === 'folder' && Array.isArray(win.folderItems)) {
      const barHeight = 24;
      const innerPad = 8;
      const contentX = win.x + innerPad;
      const contentY = win.y + barHeight + innerPad;
      const contentW = win.width - innerPad * 2;

      const paneWidth = Math.max(120, Math.min(160, contentW * 0.35));
      const listX = contentX + paneWidth + 6;
      const listW = contentX + contentW - listX;
      let listY = contentY + 24; // same as in drawWindow
      const headerH = 18;

      if (
        x >= listX &&
        x <= listX + listW &&
        y >= listY + headerH &&
        y <= listY + headerH + win.folderItems.length * 18
      ) {
        const index = Math.floor((y - (listY + headerH)) / 18);
        if (index >= 0 && index < win.folderItems.length) {
          win.selectedFolderIndex = index;
        }
      }
    }

    // Tools app – delegate click handling to dedicated module
    if (win.appId === 'tools') {
      handleToolsInteraction(this, win, x, y);
    }

    // Stickman Customize app – Improved hit testing and spacing
    if (win.appId === 'stickcustomize') {
      const barHeight = 24;
      const innerPad = 8;
      const contentX = win.x + innerPad;
      const contentY = win.y + barHeight + innerPad;
      const contentW = win.width - innerPad * 2;
      const contentH = win.height - barHeight - innerPad * 2;

      const headerH = 60;
      const bodyY = contentY + headerH + 10;
      const sidebarW = Math.max(180, contentW * 0.5); // Wider sidebar for better spacing
      const entryX = contentX + 16;
      const controlW = sidebarW - 32;

      const targetStick = this.selectedStickForCustomization || (Array.isArray(this.sticks) ? this.sticks[0] : null);
      let currY = bodyY + 6;

      // Hit: Expression
      currY += 16; // label
      const emotionBoxH = 22;
      if (x >= entryX && x <= entryX + controlW && y >= currY && y <= currY + emotionBoxH) {
        const moods = ['neutral', 'happy', 'sad', 'angry', 'scared', 'dizzy'];
        const currentIdx = moods.indexOf(win.stickCustomMood || 'neutral');
        const nextMood = moods[(currentIdx + 1) % moods.length];
        win.stickCustomMood = nextMood;
        if (targetStick) { targetStick.customMood = nextMood; targetStick.mood = nextMood; }
        return;
      }
      currY += emotionBoxH + 14;

      // Hit: Hats
      const hatLabelH = 16;
      const hatIconSize = 28;
      const hats = [null, '⛑️', '👒', '🎩', '🧢', 'vib'];
      const hitHatY = currY + hatLabelH;
      if (y >= hitHatY && y <= hitHatY + hatIconSize) {
        for (let i = 0; i < hats.length; i++) {
          const hx = entryX + i * (hatIconSize + 8);
          if (x >= hx && x <= hx + hatIconSize) {
            const selectedHat = hats[i];
            win.stickCustomHat = selectedHat;
            if (targetStick) targetStick.hat = selectedHat;
            if (targetStick === this.sticks[0] && this.settings) this.settings.stickCustomHat = selectedHat;
            return;
          }
        }
      }
      currY += hatLabelH + hatIconSize + 14;

      // Hit: Name
      currY += 16; // label
      const nameBoxH = 22;
      if (x >= entryX && x <= entryX + controlW && y >= currY && y <= currY + nameBoxH) {
        const current = (win.stickCustomName || '').trim();
        const next = typeof prompt === 'function' ? prompt('Enter Display Name:', current) : current;
        if (next !== null) {
          const trimmed = String(next).trim();
          // Enforce 20-character limit for stored UI and stick names
          const truncated = trimmed.slice(0, 20);
          win.stickCustomName = truncated;
          if (targetStick && typeof targetStick.setName === 'function') targetStick.setName(truncated || null);
          if (targetStick === this.sticks[0] && this.settings) this.settings.stickCustomName = truncated;
        }
        return;
      }
      currY += nameBoxH + 14;

      // Hit: Scale
      currY += 16; // label
      if (x >= entryX && x <= entryX + controlW && y >= currY - 10 && y <= currY + 20) {
        const t = Math.max(0, Math.min(1, (x - entryX) / controlW));
        const newScale = 0.4 + t * 2.0;
        win.stickCustomScale = newScale;
        if (targetStick) { targetStick.scale = newScale; targetStick.initRagdoll(targetStick.pos.x, targetStick.pos.y); }
        if (targetStick === this.sticks[0] && this.settings) this.settings.stickCustomScale = newScale;
        this.activeSlider = { win, key: 'scale', entryX, controlW, targetStick };
        return;
      }
      currY += 28;

      // Hit: Speed
      currY += 16; // label
      if (x >= entryX && x <= entryX + controlW && y >= currY - 10 && y <= currY + 20) {
        const t = Math.max(0, Math.min(1, (x - entryX) / controlW));
        const newSpeed = 0.2 + t * 2.8;
        win.stickCustomSpeed = newSpeed;
        if (targetStick) targetStick.speedScale = newSpeed;
        if (targetStick === this.sticks[0] && this.settings) this.settings.stickCustomSpeed = newSpeed;
        this.activeSlider = { win, key: 'speed', entryX, controlW, targetStick };
        return;
      }
      currY += 28;

      // Hit: Rainbow Toggle
      currY += 16; // label
      const rbBtnW = 80;
      const rbBtnH = 18;
      const rbBtnX = entryX + controlW - rbBtnW;
      const dfBtnW = 110;
      const dfBtnH = 18;
      const dfBtnX = entryX + controlW - rbBtnW - dfBtnW - 8;
      // Disable Face toggle hit
      if (x >= dfBtnX && x <= dfBtnX + dfBtnW && y >= currY - 14 && y <= currY + 4) {
        win.stickCustomDisableFace = !win.stickCustomDisableFace;
        if (targetStick) {
          targetStick.hideFace = !!win.stickCustomDisableFace;
        }
        if (targetStick === this.sticks[0] && this.settings) {
          this.settings.stickCustomDisableFace = !!win.stickCustomDisableFace;
        }
        return;
      }

      if (x >= rbBtnX && x <= rbBtnX + rbBtnW && y >= currY - 14 && y <= currY + 4) {
        win.stickCustomRainbow = !win.stickCustomRainbow;
        if (targetStick) targetStick.isRainbow = win.stickCustomRainbow;
        if (targetStick === this.sticks[0] && this.settings) this.settings.stickCustomRainbow = win.stickCustomRainbow;
        return;
      }

      // Hit: Color Wheel
      const verticalSpace = contentY + contentH - currY - 20;
      // Ensure maxWheelRadius is defined and reasonable relative to control width/available space
      const maxWheelRadius = Math.max(30, Math.min(controlW * 0.45, 120));
      const wheelRadius = Math.max(30, Math.min(maxWheelRadius, verticalSpace * 0.5));
      const wheelCX = entryX + controlW / 2;
      const wheelCY = currY + wheelRadius + 4;
      const dx = x - wheelCX;
      const dy = y - wheelCY;
      const dist = Math.hypot(dx, dy);
      if (dist <= wheelRadius + 6) {
        const angleDeg = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
        const hex = hslToHex(angleDeg, 0.9, 0.55);
        win.stickCustomHue = angleDeg;
        win.stickCustomColor = hex;
        if (targetStick) targetStick.color = hex;
        if (targetStick === this.sticks[0] && this.settings) this.settings.stickCustomColor = hex;
        return;
      }
    }

    // Antivirus App Interaction
    if (win.appId === 'antivirus') {
      const barHeight = 24;
      const innerPad = 8;
      const contentX = win.x + innerPad;
      const contentY = win.y + barHeight + innerPad;
      const contentW = win.width - innerPad * 2;
      const contentH = win.height - barHeight - innerPad * 2;

      if (this.antivirusState === 'prompt') {
        // Match the visual layout used in drawWindow(): sidebar width 90, mainX offset +15,
        // and the button is drawn at contentY + 115 with width 120 and height 32.
        const sideW = 90;
        const mainX = contentX + sideW + 15;
        const btnW = 120;
        const btnH = 32;
        const btnX = mainX;
        const btnY = contentY + 115;
        if (x >= btnX && x <= btnX + btnW && y >= btnY && y <= btnY + btnH) {
          this.antivirusState = 'scanning';
          this.antivirusProgress = 0;
        }
      }
    }

    // Settings app – toggle options when rows are clicked
    if (win.appId === 'settings') {
      const opts = [
        { category: 'Appearance' },
        { key: 'wallpaperIndex', type: 'wallpaper' },
        { key: 'darkTaskbar', type: 'toggle' },
        { key: 'mobileFriendly', type: 'toggle' },
        { category: 'Desktop & System' },
        { key: 'muteToasts', type: 'toggle' },
        { key: 'showFps', type: 'toggle' },
        { key: 'allowAppDeletion', type: 'toggle' },
        { key: 'lowEndMode', type: 'toggle' },
        { category: 'Audio' },
        { key: 'muteAllSound', type: 'toggle' },
        { category: 'Stickmen & AI' },
        { key: 'maxStickmen20', type: 'toggle' },
        { key: 'disableEmotes', type: 'toggle' },
        { key: 'extraWiggle', type: 'toggle' },
        { key: 'allowStickOpenApps', type: 'toggle' },
        { key: 'stickFightEachOther', type: 'toggle' },
        { key: 'stickHealthBars', type: 'toggle' },
        { key: 'keepDeadSticks', type: 'toggle' },
        { category: 'Sandbox' },
        { key: 'maxItems500', type: 'toggle' },
      ];
      const innerPad = 8;
      const barHeight = 24;
      const contentX = win.x + innerPad;
      const contentY = win.y + barHeight + innerPad;
      const contentW = win.width - innerPad * 2;
      const listX = contentX + 10;
      const rowH = 28;
      // Geometry must exactly match drawWindow() settings layout
      const cardX = contentX + 8;
      const cardY = contentY + 36;
      const baseListY = cardY + 8;
      const scrollY = typeof win.settingsScrollY === 'number' ? win.settingsScrollY : 0;

      if (!win.settingsState) {
        win.settingsState = {
          darkTaskbar: !!(this.settings && this.settings.darkTaskbar),
          muteToasts: !!(this.settings && this.settings.muteToasts),
          muteAllSound: !!(this.settings && this.settings.muteAllSound),
          extraWiggle: false,
          maxStickmen20: (this.settings && this.settings.maxStickmen > 10),
          disableEmotes: !!(this.settings && this.settings.disableEmotes),
          showFps: !!(this.settings && this.settings.showFps),
          wallpaperIndex: (this.settings && this.settings.wallpaperIndex) || 0,
          lowEndMode: !!(this.settings && this.settings.lowEndMode),
          allowStickOpenApps: (this.settings && this.settings.allowStickOpenApps !== false),
          stickFightEachOther: !!(this.settings && this.settings.stickFightEachOther),
          stickHealthBars: !!(this.settings && this.settings.stickHealthBars),
          keepDeadSticks: !!(this.settings && this.settings.keepDeadSticks),
          mobileFriendly: !!(this.settings && this.settings.mobileFriendly),
          allowAppDeletion: !!(this.settings && this.settings.allowAppDeletion),
          maxItems500: !!(this.settings && this.settings.maxItems500),
        };
      }

      let currentY = baseListY;
      opts.forEach((opt) => {
        if (opt.category) {
          currentY += 26;
          return;
        }
        const rowTop = currentY - scrollY;
        const rowLeft = listX;
        const rowRight = listX + contentW - 20;

        if (
          x >= rowLeft &&
          x <= rowRight &&
          y >= rowTop &&
          y <= rowTop + rowH
        ) {
          if (opt.type === 'wallpaper') {
            // Cycle through built‑in wallpapers only (custom wallpapers disabled)
            const current = Number.isInteger(win.settingsState.wallpaperIndex)
              ? win.settingsState.wallpaperIndex
              : 0;
            const next = (current + 1) % WALLPAPER_IMAGES.length;
            win.settingsState.wallpaperIndex = next;
            this.settings.wallpaperIndex = next;
          } else {
            win.settingsState[opt.key] = !win.settingsState[opt.key];

            // Propagate settings into global desktop state
            if (opt.key === 'muteToasts') {
              this.settings.muteToasts = !!win.settingsState[opt.key];
              this.showToast(
                this.settings.muteToasts ? 'Toasts muted' : 'Toasts enabled',
                1.6
              );
            } else if (opt.key === 'muteAllSound') {
              this.settings.muteAllSound = !!win.settingsState[opt.key];
              this.showToast(
                this.settings.muteAllSound ? 'All sounds muted' : 'All sounds enabled',
                1.8
              );
            } else if (opt.key === 'darkTaskbar') {
              this.settings.darkTaskbar = !!win.settingsState[opt.key];
            } else if (opt.key === 'maxStickmen20') {
              const enabled = !!win.settingsState[opt.key];
              this.settings.maxStickmen = enabled ? 20 : 10;
              this.showToast(
                enabled
                  ? 'Stickman cap set to 20 (may be unstable / laggy)'
                  : 'Stickman cap reset to 10',
                2.0
              );
            } else if (opt.key === 'disableEmotes') {
              this.settings.disableEmotes = !!win.settingsState[opt.key];
            } else if (opt.key === 'showFps') {
              this.settings.showFps = !!win.settingsState[opt.key];
            } else if (opt.key === 'lowEndMode') {
              this.settings.lowEndMode = !!win.settingsState[opt.key];
              this.showToast(
                this.settings.lowEndMode
                  ? 'Low-end mode: capped at 30 FPS.'
                  : 'Low-end mode disabled (full FPS).',
                2.0
              );
            } else if (opt.key === 'allowStickOpenApps') {
              this.settings.allowStickOpenApps = !!win.settingsState[opt.key];
            } else if (opt.key === 'stickFightEachOther') {
              this.settings.stickFightEachOther = !!win.settingsState[opt.key];
              this.showToast(
                this.settings.stickFightEachOther
                  ? 'Stickmen will now fight each other when armed.'
                  : 'Stickmen will no longer auto-fight.',
                2.0
              );
            } else if (opt.key === 'stickHealthBars') {
              this.settings.stickHealthBars = !!win.settingsState[opt.key];
              this.showToast(
                this.settings.stickHealthBars
                  ? 'Stickmen now have health bars and can die.'
                  : 'Stickmen are immortal again (no health bars).',
                2.0
              );
            } else if (opt.key === 'stickVibRibbon') {
              this.settings.stickVibRibbon = !!win.settingsState[opt.key];
              this.showToast(
                this.settings.stickVibRibbon
                  ? 'Vib‑ribbon background enabled.'
                  : 'Vib‑ribbon background disabled.',
                1.6
              );
            } else if (opt.key === 'maxItems500') {
              this.settings.maxItems500 = !!win.settingsState[opt.key];
              this.showToast(
                this.settings.maxItems500
                  ? 'Object limit increased to 500.'
                  : 'Object limit reset to 80.',
                1.5
              );
            } else if (opt.key === 'keepDeadSticks') {
              this.settings.keepDeadSticks = !!win.settingsState[opt.key];
              this.showToast(this.settings.keepDeadSticks ? 'Dead stickmen will no longer despawn.' : 'Stickmen will despawn after death.', 1.8);
            } else if (opt.key === 'allowAppDeletion') {
              this.settings.allowAppDeletion = !!win.settingsState[opt.key];
              this.showToast(this.settings.allowAppDeletion ? 'Apps can now be dragged to Recycle Bin.' : 'App deletion disabled.', 1.8);
            } else if (opt.key === 'mobileFriendly') {
              this.settings.mobileFriendly = !!win.settingsState[opt.key];
              this.showToast('Mobile mode ' + (this.settings.mobileFriendly ? 'enabled' : 'disabled'), 1.5);
              // Trigger grid refresh for icons
              this.icons.forEach(icon => snapIconToGrid(icon, this.icons, width, height, this.settings.mobileFriendly ? 1.4 : 1.0));
            }
          }
        }
        currentY += rowH;
      });
    }
  }

  // Run an AI-powered "search" for the Internet Explorer window and store results on the tab.
  async runInternetSearch(win, tab, query) {
    if (!win || win.appId !== 'internet' || !tab || !query) return;

    // Mark loading so the UI can show a small "Searching..." hint
    tab.loadingSearch = true;

    const systemPrompt =
      'You are an early-2000s style web search engine running inside a Windows XP-era browser. ' +
      'Given a query, respond ONLY with JSON following this exact schema and nothing else:\n' +
      '{ "results": [ { "title": string, "url": string, "snippet": string } ] }\n' +
      'Return 3–6 fun, varied results relevant to the query, preferring playful/fictional XP-desktop themed links.';

    try {
      if (typeof websim === 'undefined' || !websim.chat) {
        tab.loadingSearch = false;
        return;
      }
      const completion = await websim.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: query,
              },
            ],
            json: true,
          },
        ],
      });

      let parsed = null;
      try {
        parsed = completion && completion.content
          ? JSON.parse(completion.content)
          : null;
      } catch (err) {
        parsed = null;
      }

      if (parsed && Array.isArray(parsed.results)) {
        tab.aiResults = parsed.results.slice(0, 8);
        if (tab.aiResults[0] && tab.aiResults[0].title) {
          tab.title = tab.aiResults[0].title;
        }
      } else {
        tab.aiResults = null;
      }
    } catch (err) {
      console.error('Internet search failed:', err);
      tab.aiResults = null;
    } finally {
      tab.loadingSearch = false;
    }
  }

  runConsoleCommand(win, rawCommand) {
    if (!win || win.appId !== 'console') return;

    if (!Array.isArray(win.consoleLines)) {
      win.consoleLines = [];
    }
    if (!Array.isArray(win.consoleHistory)) {
      win.consoleHistory = [];
    }
    if (typeof win.consoleHistoryIndex !== 'number') {
      win.consoleHistoryIndex = win.consoleHistory.length;
    }

    const cmd = (rawCommand || '').trim();
    const prompt = 'C:\\WINDOWS\\system32>';

    // Echo the command line itself
    win.consoleLines.push(`${prompt} ${cmd}`);

    if (!cmd) {
      // Blank line, just show a new prompt
      return;
    }

    // Store in history (dedupe consecutive duplicates)
    const last = win.consoleHistory[win.consoleHistory.length - 1];
    if (cmd && cmd !== last) {
      win.consoleHistory.push(cmd);
    }
    win.consoleHistoryIndex = win.consoleHistory.length;

    const lower = cmd.toLowerCase();
    const out = [];

    if (lower === 'help' || lower === '/help') {
      out.push(
        'Supported commands:',
        '  /help     - show this help.',
        '  killall   - terminate all stickmen on the desktop.',
        '  dir       - list some pretend files.',
        '  cls       - clear the screen.',
        '  echo TEXT - write TEXT back.',
        '  time      - show the current time.',
        '  date      - show the current date.',
        '  whoami    - show the current user.'
      );
    } else if (lower === 'cls') {
      win.consoleLines = [];
      return;
    } else if (lower === 'dir') {
      out.push(
        ' Volume in drive C is STICKDESK',
        ' Volume Serial Number is 1337-XP00',
        '',
        ' Directory of C:\\WINDOWS\\system32',
        '',
        ' cursor_scan.exe         24,576 bytes',
        ' stickman.dll            12,288 bytes',
        ' portals.sys              4,096 bytes',
        ' minesweeper.exe         32,768 bytes',
        ' paintxp.exe             28,672 bytes',
        '',
        '        5 File(s)        102,400 bytes',
        '        2 Dir(s)   42,000,000,000 bytes free'
      );
    } else if (lower.startsWith('echo ')) {
      out.push(cmd.slice(5));
    } else if (lower === 'time') {
      const now = new Date();
      const hh = now.getHours().toString().padStart(2, '0');
      const mm = now.getMinutes().toString().padStart(2, '0');
      const ss = now.getSeconds().toString().padStart(2, '0');
      out.push(`The current time is: ${hh}:${mm}:${ss}`);
    } else if (lower === 'date') {
      const now = new Date();
      out.push(`The current date is: ${now.toDateString()}`);
    } else if (lower === 'whoami') {
      out.push('stickman\\desktop_user');
    } else if (lower === 'killall') {
      if (Array.isArray(this.sticks) && this.sticks.length > 0) {
        const count = this.sticks.length;
        // Immediately mark all stickmen as dead and put them into ragdoll state
        this.sticks.forEach((s) => {
          if (!s.dead) {
            try {
              s.health = 0;
              s.dead = true;
              if (typeof s.setState === 'function') s.setState('ragdoll');
              s.deathTimer = 3.0;
              s.mood = 'scared';
              if (typeof s.showEmote === 'function') s.showEmote('💀', 1.4);
            } catch (_) {
              // fallback: try best-effort kill via applyDamage if available
              try { if (typeof s.applyDamage === 'function') s.applyDamage(9999, this); } catch (_) {}
            }
          }
        });
        out.push(`Execution successful. ${count} stickmen terminated.`);
      } else {
        out.push('No stickmen detected.');
      }
    } else {
      out.push(
        `'${cmd}' is not recognized as an internal or external command,`,
        'operable program or batch file.'
      );
    }

    out.forEach((line) => win.consoleLines.push(line));
    
    // Flag to trigger auto-scroll to bottom in the next draw call
    win.consoleNeedsScrollToBottom = true;
  }

  async sendAolMessage(win) {
    if (!win || win.appId !== 'aol') return;

    const buddy = win.aolConversations && win.aolConversations[win.aolSelectedBuddy];
    const buddyName = buddy ? buddy.name : 'Buddy';

    // If we have a hidden input, sync from it before sending
    if (this.aolInput) {
      win.chatDraft = this.aolInput.value;
    }

    const text = (win.chatDraft || '').trim();
    if (!text) return;

    const now = new Date();
    const hours = now.getHours();
    const h12 = ((hours + 11) % 12) + 1;
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const timeStr = `${h12}:${minutes} ${ampm}`;

    if (!Array.isArray(win.chatMessages)) win.chatMessages = [];
    if (!Array.isArray(win.chatHistory)) win.chatHistory = [];

    // Add user's message to visible chat + history
    win.chatMessages.push({ from: 'You', text, time: timeStr });
    win.chatHistory.push({ role: 'user', content: text });
    if (win.chatHistory.length > 24) win.chatHistory = win.chatHistory.slice(-24);

    win.chatDraft = '';
    if (this.aolInput) this.aolInput.value = '';
    win.isBuddyTyping = true;

    const systemPrompt =
      `You are chatting on AOL Instant Messenger in 2007. Your name is ${buddyName}. ` +
      'You live on a Windows XP desktop. Use casual mid-2000s internet slang (brb, lol, ttyl, sup). ' +
      'Keep responses short (1–3 sentences), no emojis, no modern references.';

    try {
      if (typeof websim === 'undefined' || !websim.chat) {
        win.isBuddyTyping = false;
        return;
      }
      const completion = await websim.chat.completions.create({
        messages: [{ role: 'system', content: systemPrompt }, ...(win.chatHistory || []).map(m => ({role: m.role, content: m.content}))],
      });
      const replyText = (completion && completion.content) ? String(completion.content).trim() : '';
      const safeReply = replyText || 'lol my net is lagging hard, try again in a sec';

      win.chatMessages.push({ from: buddyName, text: safeReply, time: timeStr });
      win.chatHistory.push({ role: 'assistant', content: safeReply });
      if (win.chatHistory.length > 24) win.chatHistory = win.chatHistory.slice(-24);
    } catch (err) {
      const fallback = 'oops, AIM just froze on me lol – try again?';
      win.chatMessages.push({ from: buddyName, text: fallback, time: timeStr });
      win.chatHistory.push({ role: 'assistant', content: fallback });
    } finally {
      win.isBuddyTyping = false;
    }

    // Save state back to collection
    if (buddy) {
      buddy.messages = win.chatMessages;
      buddy.history = win.chatHistory;
    }
  }

  async sendClippyMessage(win) {
    if (!win || win.appId !== 'clippy') return;

    // Normalize message containers
    if (!Array.isArray(win.clippyMessages)) win.clippyMessages = [];
    if (!Array.isArray(win.clippyHistory)) win.clippyHistory = [];

    // If we have a hidden input for Clippy, sync its value into the window before sending
    if (this.clippyInput) {
      win.clippyDraft = this.clippyInput.value;
    }

    const text = (win.clippyDraft || '').trim();
    if (!text) {
      // make sure the hidden input is cleared if there's nothing to send
      if (this.clippyInput) this.clippyInput.value = '';
      return;
    }

    const now = new Date();
    const hours = now.getHours();
    const h12 = ((hours + 11) % 12) + 1;
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const timeStr = `${h12}:${minutes} ${ampm}`;

    // Add user message immediately and clear the draft so UI updates reliably
    win.clippyMessages.push({ from: 'You', text, time: timeStr });
    win.clippyHistory.push({ role: 'user', content: text });
    if (win.clippyHistory.length > 24) {
      win.clippyHistory = win.clippyHistory.slice(-24);
    }

    // Clear draft/UI input now (pre-emptively) so clicking quickly cannot resend same text
    win.clippyDraft = '';

    const systemPrompt =
      "You are Clippy, the cheerful Microsoft Office Assistant living on a Windows XP desktop. " +
      "Give short, helpful answers (1–3 sentences) about how to use this sandbox, stickmen, tools, and apps. " +
      "Sound upbeat but not annoying; avoid emojis and modern slang.";

    const historyMessages = (win.clippyHistory || []).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      // If the websim chat API isn't available, gracefully fallback with a helpful canned reply
      if (typeof websim === 'undefined' || !websim.chat) {
        const fallback = "Hi! I'm offline right now, but try again — Clippy still cares!";
        win.clippyMessages.push({ from: 'Clippy', text: fallback, time: timeStr });
        win.clippyHistory.push({ role: 'assistant', content: fallback });
        if (win.clippyHistory.length > 24) win.clippyHistory = win.clippyHistory.slice(-24);
        return;
      }

      const completion = await websim.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          ...historyMessages,
        ],
      });

      const replyText =
        (completion && completion.content) ? String(completion.content).trim() : '';

      const safeReply =
        replyText || "It looks like you tried to ask me something, but I froze. Try again!";

      win.clippyMessages.push({
        from: 'Clippy',
        text: safeReply,
        time: timeStr,
      });
      win.clippyHistory.push({ role: 'assistant', content: safeReply });
      if (win.clippyHistory.length > 24) {
        win.clippyHistory = win.clippyHistory.slice(-24);
      }
    } catch (err) {
      console.error('Clippy AI reply failed:', err);
      const fallback = "Uh‑oh, my thought bubble popped. Try sending that once more.";
      win.clippyMessages.push({
        from: 'Clippy',
        text: fallback,
        time: timeStr,
      });
      win.clippyHistory.push({ role: 'assistant', content: fallback });
      if (win.clippyHistory.length > 24) {
        win.clippyHistory = win.clippyHistory.slice(-24);
      }
    }
  }

  pressCalc(win, btn) {
    if (/[0-9]/.test(btn)) {
      if (win.calcValue === '0' || win.justComputed) {
        win.calcValue = btn;
        win.justComputed = false;
      } else {
        win.calcValue += btn;
      }
    } else if (btn === 'C') {
      win.calcValue = '0';
      win.calcOp = null;
      win.calcMem = null;
    } else if (['+', '-', '*', '/'].includes(btn)) {
      win.calcMem = parseFloat(win.calcValue);
      win.calcOp = btn;
      win.calcValue = '0';
    } else if (btn === '=') {
      if (win.calcOp && win.calcMem !== null) {
        const current = parseFloat(win.calcValue);
        let res = 0;
        if (win.calcOp === '+') res = win.calcMem + current;
        if (win.calcOp === '-') res = win.calcMem - current;
        if (win.calcOp === '*') res = win.calcMem * current;
        if (win.calcOp === '/') res = win.calcMem / current;
        win.calcValue = String(res);
        win.calcOp = null;
        win.calcMem = null;
        win.justComputed = true;
      }
    }
  }

  handleStartMenuClick(x, y, { width, height }, isDoubleClick) {
    const menu = this.getStartMenuRect(width, height);
    if (
      x < menu.x ||
      x > menu.x + menu.width ||
      y < menu.y ||
      y > menu.y + menu.height
    ) {
      // Clicked outside the menu closes it
      this.showStartMenu = false;
      return false;
    }

    // Keep item height in sync with drawStartMenu() so hit testing matches visuals
    const itemHeight = 22;
    const topOffset = 40;
    const items = this.getStartMenuItems();

    const localY = y - menu.y - topOffset;
    const index = Math.floor(localY / itemHeight);
    if (index >= 0 && index < items.length) {
      const item = items[index];
      if (item) {
        if (item.appId) {
          this.ensureWindow(item.appId, { width, height });
        } else if (item.label === 'Log Off') {
          // Mock log off: just show a small toast
          this.showToast('Log off is disabled in this demo desktop.', 2.0);
        } else if (item.label === 'Shut Down...') {
          // Mock shut down: playful message instead of closing the app
          this.showToast('Shutdown cancelled: the stickmen refused to leave.', 2.2);
        }
      }
      this.showStartMenu = false;
      return true;
    }

    return false;
  }

  handleKey(e) {
    // Global Escape shortcut: close Start menu and any context menu
    if (e.key === 'Escape') {
      this.showStartMenu = false;
      this.contextMenu = null;
      e.preventDefault();
      return;
    }

    const aolWin = this.getActiveAolWindow();
    const consoleWin = this.windows.find(
      (w) =>
        w.id === this.activeWindowId &&
        !w.closed &&
        !w.minimized &&
        w.appId === 'console'
    );
    const clippyWin = this.windows.find(
      (w) =>
        w.id === this.activeWindowId &&
        !w.closed &&
        !w.minimized &&
        w.appId === 'clippy'
    );

    if (!aolWin && !consoleWin && !clippyWin) return;

    const isAolActive = !!aolWin && this.activeWindowId === aolWin.id;
    const isConsoleActive = !!consoleWin && this.activeWindowId === consoleWin.id;
    const isClippyActive = !!clippyWin && this.activeWindowId === clippyWin.id;

    // If a hidden input exists and is focused (shared by AOL and Clippy), let the browser handle text entry,
    // but still handle Enter so the user can press Enter to send their message.
    if ((isAolActive || isClippyActive) && this.aolInput && document.activeElement === this.aolInput) {
      if (e.key === 'Enter') {
        try {
          if (isAolActive) this.sendAolMessage(aolWin);
          else this.sendClippyMessage(clippyWin);
          e.preventDefault();
        } catch (_) {}
      }
      return;
    }

    const isPlainChar =
      e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;

    // Basic text input for AOL chat / Clippy / Command Prompt
    if (isPlainChar) {
      if (isAolActive) {
        aolWin.chatDraft = (aolWin.chatDraft || '') + e.key;
        e.preventDefault();
        return;
      }
      if (isClippyActive) {
        clippyWin.clippyDraft = (clippyWin.clippyDraft || '') + e.key;
        e.preventDefault();
        return;
      }
      if (isConsoleActive) {
        if (typeof consoleWin.consoleInput !== 'string') consoleWin.consoleInput = '';
        consoleWin.consoleInput += e.key;
        e.preventDefault();
        return;
      }
    }

    // Backspace
    if (e.key === 'Backspace') {
      if (isAolActive) {
        if (aolWin.chatDraft && aolWin.chatDraft.length > 0) {
          aolWin.chatDraft = aolWin.chatDraft.slice(0, -1);
        }
        e.preventDefault();
        return;
      }
      if (isClippyActive) {
        if (clippyWin.clippyDraft && clippyWin.clippyDraft.length > 0) {
          clippyWin.clippyDraft = clippyWin.clippyDraft.slice(0, -1);
        }
        e.preventDefault();
        return;
      }
      if (isConsoleActive) {
        if (typeof consoleWin.consoleInput !== 'string') consoleWin.consoleInput = '';
        if (consoleWin.consoleInput.length > 0) {
          consoleWin.consoleInput = consoleWin.consoleInput.slice(0, -1);
        }
        e.preventDefault();
        return;
      }
    }

    // Command Prompt history navigation
    if (isConsoleActive && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      if (!Array.isArray(consoleWin.consoleHistory)) {
        consoleWin.consoleHistory = [];
      }
      if (typeof consoleWin.consoleHistoryIndex !== 'number') {
        consoleWin.consoleHistoryIndex = consoleWin.consoleHistory.length;
      }

      if (e.key === 'ArrowUp') {
        consoleWin.consoleHistoryIndex = Math.max(
          0,
          consoleWin.consoleHistoryIndex - 1
        );
      } else if (e.key === 'ArrowDown') {
        consoleWin.consoleHistoryIndex = Math.min(
          consoleWin.consoleHistory.length,
          consoleWin.consoleHistoryIndex + 1
        );
      }

      const idx = consoleWin.consoleHistoryIndex;
      if (idx >= 0 && idx < consoleWin.consoleHistory.length) {
        consoleWin.consoleInput = consoleWin.consoleHistory[idx];
      } else {
        consoleWin.consoleInput = '';
      }
      e.preventDefault();
      return;
    }

    // Enter key
    if (e.key === 'Enter') {
      if (isAolActive) {
        this.sendAolMessage(aolWin);
        e.preventDefault();
        return;
      }
      if (isClippyActive) {
        this.sendClippyMessage(clippyWin);
        e.preventDefault();
        return;
      }
      if (isConsoleActive) {
        const cmd = (consoleWin.consoleInput || '').trim();
        this.runConsoleCommand(consoleWin, cmd);
        consoleWin.consoleInput = '';
        e.preventDefault();
        return;
      }
    }
  }

  // Tiny on-canvas toast notification: message + duration (seconds)
  showToast(message, duration = 2.0) {
    // Allow Settings app to mute notifications
    if (this.settings && this.settings.muteToasts) return;

    this.toast = {
      text: String(message),
      ttl: duration,
      age: 0,
    };
  }

  // Fire a cursor-held gun towards the nearest stickman and knock them back.
  fireCursorGun(sticks, cursor) {
    if (!Array.isArray(sticks) || sticks.length === 0 || !cursor) return;

    // Find closest stick to the cursor
    let bestStick = null;
    let bestDist = Infinity;
    sticks.forEach((s) => {
      const body = s.points && s.points[1] ? s.points[1] : s.pos;
      if (!body) return;
      const dx = body.x - cursor.x;
      const dy = body.y - cursor.y;
      const d = Math.hypot(dx, dy);
      if (d < bestDist) {
        bestDist = d;
        bestStick = s;
      }
    });

    if (!bestStick || bestDist > 260) return;

    const target = bestStick;

    // Spawn a visible muzzle flash at the cursor
    this.spawnGunBurst &&
      this.spawnGunBurst('muzzle', cursor.x, cursor.y, target.points[1].x - cursor.x, target.points[1].y - cursor.y);

    // Play pistol gunshot sound (if wired from main.js and not muted)
    if (
      this.gunShotSound &&
      this.settings &&
      !this.settings.muteAllSound
    ) {
      try {
        this.gunShotSound.currentTime = 0;
        this.gunShotSound.play();
      } catch (_) {
        // ignore autoplay issues
      }
    }

    // Spawn a visible bullet travelling from cursor toward the target
    const dxBullet = target.points[1].x - cursor.x;
    const dyBullet = target.points[1].y - cursor.y;
    const distBullet = Math.hypot(dxBullet, dyBullet) || 1;
    const speed = 900;
    const vxBullet = (dxBullet / distBullet) * speed;
    const vyBullet = (dyBullet / distBullet) * speed;
    this.bullets.push({
      x: cursor.x,
      y: cursor.y,
      vx: vxBullet,
      vy: vyBullet,
      life: 1.0,
      owner: 'cursor'
    });
    target.setState && target.setState('ragdoll');
    target.mood = 'scared';
    target.showEmote && target.showEmote('💥', 0.8);

    const dx = target.points[1].x - cursor.x;
    const dy = target.points[1].y - cursor.y;
    const dist = Math.hypot(dx, dy) || 1;
    const nx = dx / dist;
    const ny = dy / dist;
    const impulseMag = 4.0; // Reduced from 14

    target.points.forEach((p) => {
      p.x += nx * impulseMag;
      p.y += ny * impulseMag;
      p.oldX -= nx * impulseMag;
      p.oldY -= ny * impulseMag;
    });

    if (typeof target.applyDamage === 'function') {
      target.applyDamage(35, this);
    }
  }

  // Spawn a short-lived burst of particles for gun muzzle flashes & impacts
  spawnGunBurst(type, x, y, dirX = 0, dirY = 0) {
    if (!Array.isArray(this.gunBursts)) this.gunBursts = [];
    const count = type === 'muzzle' ? 10 : 14;
    const baseSpeed = type === 'muzzle' ? 260 : 340;
    const ttl = type === 'muzzle' ? 0.18 : 0.35;
    const particles = [];
    const baseAngle = Math.atan2(dirY, dirX || 1);
    for (let i = 0; i < count; i++) {
      const spread = (type === 'muzzle' ? 0.6 : 1.3) * (Math.random() - 0.5);
      const ang = baseAngle + spread;
      const spd = baseSpeed * (0.4 + Math.random() * 0.8);
      particles.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        life: ttl * (0.4 + Math.random() * 0.8),
        maxLife: ttl,
        size: type === 'muzzle' ? 2 + Math.random() * 2 : 1.5 + Math.random() * 2,
        color:
          type === 'muzzle'
            ? [255, 240, 160]
            : [255, 200 + Math.random() * 40, 80 + Math.random() * 40],
      });
    }
    this.gunBursts.push({ type, age: 0, ttl, particles });
  }

  // Trigger a short-lived screen shake; duration in seconds, magnitude in pixels
  startScreenShake(duration = 0.2, magnitude = 8) {
    this.shakeTime = Math.max(this.shakeTime, duration);
    this.shakeMag = Math.max(this.shakeMag, magnitude);
  }

  getStartMenuRect(width, height) {
    const menuWidth = Math.min(280, width * 0.55);

    // Compute menu height dynamically so all items fit and text stays inside
    const items = this.getStartMenuItems().filter(i => i && i.label);
    const itemHeight = 22;
    const topOffset = 40;
    const bottomPadding = 14;
    const desiredHeight = topOffset + itemHeight * items.length + bottomPadding;

    // Keep some margin from the top of the screen
    const maxHeight = height - TASKBAR_HEIGHT - 8;
    const menuHeight = Math.min(desiredHeight, maxHeight);

    const x = 6;
    const y = height - TASKBAR_HEIGHT - menuHeight + 2;
    return { x, y, width: menuWidth, height: menuHeight };
  }

  getStartMenuItems() {
    return [
      { label: 'My Computer', appId: 'computer' },
      { label: 'My Documents', appId: 'folder' },
      { label: 'My Music', appId: 'music' },
      { label: 'Internet Explorer', appId: 'internet' },
      { label: 'AOL Instant Messenger', appId: 'aol' },
      { label: 'Paint', appId: 'paint' },
      { label: 'Tools', appId: 'tools' },
      { label: 'Minesweeper', appId: 'minesweeper' },
      { label: 'Calculator', appId: 'calculator' },
      { label: 'Stickman Customize', appId: 'stickcustomize' },
      { label: 'Recycle Bin', appId: 'recycle' },
      { label: 'Command Prompt', appId: 'console' },
      { label: 'Settings', appId: 'settings' },
      { label: 'Notes', appId: 'notes' },
      { label: 'Stickmen Stats', appId: 'stats' },
      { label: 'Stickman Jail', appId: 'jail' },
      { label: 'AntiVirus', appId: 'antivirus' },
      { label: 'Log Off', appId: null },
      { label: 'Shut Down...', appId: null },
    ];
  }

  handleWheel(e) {
    const x = e.clientX;
    const y = e.clientY;

    const win = this.hitTestWindow(x, y);
    if (!win || win.closed || win.minimized) return;

    const delta = e.deltaY || 0;
    if (!delta) return;

    // Tools app vertical scrolling
    if (win.appId === 'tools') {
      if (typeof win.toolsScrollY !== 'number') win.toolsScrollY = 0;

      // toolsMaxScroll is normally set in drawToolsApp; fall back to a safe guess
      if (typeof win.toolsMaxScroll !== 'number') {
        const innerPad = 8;
        const barHeight = 24;
        const headerH = 22;
        const contentH = win.height - barHeight - innerPad * 2;
        const visibleHeight = Math.max(0, contentH - headerH - 40);
        win.toolsMaxScroll = Math.max(0, visibleHeight * 2);
      }

      win.toolsScrollY += delta;
      if (win.toolsScrollY < 0) win.toolsScrollY = 0;
      if (win.toolsScrollY > win.toolsMaxScroll) win.toolsScrollY = win.toolsMaxScroll;

      try {
        e.preventDefault();
      } catch (_) {
        // ignore
      }
      return;
    }

    // Settings app vertical scrolling
    if (win.appId === 'settings') {
      if (typeof win.settingsScrollY !== 'number') win.settingsScrollY = 0;

      // settingsMaxScroll is normally set in drawWindow() for settings; fall back if missing
      if (typeof win.settingsMaxScroll !== 'number') {
        const innerPad = 8;
        const barHeight = 24;
        const cardH = win.height - barHeight - innerPad * 2 - 36 - 28;
        const rowH = 28;
        const totalListHeight = 16 * rowH + 5 * 26; // approx height
        const visibleHeight = Math.max(0, cardH - 16);
        win.settingsMaxScroll = Math.max(0, totalListHeight - visibleHeight);
      }

      win.settingsScrollY += delta;
      if (win.settingsScrollY < 0) win.settingsScrollY = 0;
      if (win.settingsScrollY > win.settingsMaxScroll) {
        win.settingsScrollY = win.settingsMaxScroll;
      }

      try {
        e.preventDefault();
      } catch (_) {
        // ignore
      }
      return;
    }

    // Command Prompt vertical scrolling
    if (win.appId === 'console') {
      if (typeof win.consoleScrollY !== 'number') win.consoleScrollY = 0;
      
      const lineHeight = 14;
      const totalHeight = (win.consoleLines.length + 1) * lineHeight;
      const barHeight = 24;
      const innerPad = 8;
      const contentH = win.height - barHeight - innerPad * 2;
      win.consoleMaxScroll = Math.max(0, totalHeight - contentH + 10);

      win.consoleScrollY += delta;
      if (win.consoleScrollY < 0) win.consoleScrollY = 0;
      if (win.consoleScrollY > win.consoleMaxScroll) win.consoleScrollY = win.consoleMaxScroll;

      try { e.preventDefault(); } catch (_) {}
      return;
    }

    // info.txt vertical scrolling
    if (win.appId === 'info') {
      if (typeof win.infoScrollY !== 'number') win.infoScrollY = 0;

      // infoMaxScroll is normally set in drawWindow(); fall back if missing
      if (typeof win.infoMaxScroll !== 'number') {
        const innerPad = 8;
        const barHeight = 24;
        const contentH = win.height - barHeight - innerPad * 2;
        const textH = contentH - 22;
        const approxLines = 30;
        const lineH = 16;
        const totalHeight = approxLines * lineH;
        const visibleHeight = Math.max(0, textH - 8);
        win.infoMaxScroll = Math.max(0, totalHeight - visibleHeight);
      }

      win.infoScrollY += delta;
      if (win.infoScrollY < 0) win.infoScrollY = 0;
      if (win.infoScrollY > win.infoMaxScroll) win.infoScrollY = win.infoMaxScroll;

      try {
        e.preventDefault();
      } catch (_) {
        // ignore
      }
    }
  }
}

function createDefaultIcons() {
  // Two-column grid, up to 6 rows per column (so each column max 6 apps)
  const margin = 16;
  const spacing = 88;
  const top = 32;

  const baseIcons = [
    // Recycle Bin fixed to the very top-left
    { name: 'Recycle Bin', appId: 'recycle', src: './recycle-bin-683244_960_720.webp', fixed: true },
    { name: 'My Computer', appId: 'computer', src: './My Computer.ico' },
    { name: 'Minesweeper', appId: 'minesweeper', src: './Minesweeper_icon.png' },
    { name: 'Calculator', appId: 'calculator', src: './Calculator.png' },
    { name: 'My Documents', appId: 'folder', src: './FolderView[1].png' },
    { name: 'Internet Explorer', appId: 'internet', src: './internet Explorer .png' },
    { name: 'Settings', appId: 'settings', src: './Programs.png' },
    // Tools app icon
    { name: 'Tools', appId: 'tools', src: './Appearance.png' },
    // AOL Instant Messenger-style chat
    { name: 'AOL Instant Messenger', appId: 'aol', src: './aim.webp' },
    { name: 'Clippy', appId: 'clippy', src: './Clippy.png' },
    // Suspicious "NotAVirus" executable
    { name: 'NotAVirus56.exe', appId: 'notavirus', src: './Hyper Sonic Icon.png' },
    // Simple text file with project info and controls

    // Stickman customization app
    { name: 'Stickman Customize', appId: 'stickcustomize', src: './dot2025_0303_1753_18.png' },
    { name: 'Jail', appId: 'jail', src: './raf,360x360,075,t,fafafa_ca443f4786.jpg' },
    { name: 'Command Prompt', appId: 'console', src: './skibidiicon.png' },
    // Ensure first column has up to six apps; place Paint into second column by index >=6
    { name: 'Paint', appId: 'paint', src: './Ms_paint_windows_xp_logo.png' },
    { name: 'Stickmen Stats', appId: 'stats', src: './stats_icon.png' },
    { name: 'AntiVirus', appId: 'antivirus', src: './download.png' },
    // Untitled app using the project's ani image as its icon and no visible label
    { name: 'Minecraft', appId: 'mc_launcher', src: './5547-256x256x32.png' },
  ];

  return baseIcons.map((icon, i) => {
    const img = new Image();
    img.src = icon.src;
    // compute column (0 or 1) so first 6 go into column 0, remaining into column 1
    const col = Math.floor(i / 6); // 0 for indices 0-5, 1 for 6-11
    const row = i % 6;
    const x = margin + col * spacing;
    const y = top + row * spacing;
    return {
      ...icon,
      img,
      x,
      y,
      vx: 0,
      vy: 0,
    };
  });
}

// Grid helpers for icon placement & snapping
function getIconGridSlots(width, height, scale = 1.0) {
  const margin = 16 * scale;
  const spacing = 88 * scale;
  const top = 32 * scale;
  const cols = Math.max(1, Math.floor((width - margin * 2) / spacing));
  // Limit rows per column to 6 (fixed) so each column never exceeds six icons vertically
  const rows = 6;
  const slots = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      slots.push({
        x: margin + c * spacing,
        y: top + r * spacing,
        col: c,
        row: r,
      });
    }
  }
  return { slots, cols, rows, spacing, margin, top };
}

function hitTestTrampolineHelper(trampolines, x, y) {
  if (!Array.isArray(trampolines)) return null;
  for (let i = trampolines.length - 1; i >= 0; i--) {
    const t = trampolines[i];
    if (
      x >= t.x &&
      x <= t.x + t.width &&
      y >= t.y &&
      y <= t.y + t.height
    ) {
      return t;
    }
  }
  return null;
}

// Hit-test helper for sawblades (treat as circles)
function hitTestSawbladeHelper(sawblades, x, y) {
  if (!Array.isArray(sawblades)) return null;
  for (let i = sawblades.length - 1; i >= 0; i--) {
    const s = sawblades[i];
    const r = s.radius || 26;
    const dx = x - s.x;
    const dy = y - s.y;
    if (dx * dx + dy * dy <= r * r) return s;
  }
  return null;
}

function snapIconToGrid(icon, icons, width, height, scale = 1.0) {
  const { slots } = getIconGridSlots(width, height, scale);

  // clamp icon to area (not overlapping taskbar)
  const maxY = Math.max(8, height - TASKBAR_HEIGHT - ICON_SIZE - 4);
  icon.x = Math.max(4, Math.min(width - ICON_SIZE - 4, icon.x));
  icon.y = Math.max(8, Math.min(maxY, icon.y));

  // find nearest slot center
  let best = null;
  let bestDist = Infinity;
  slots.forEach(s => {
    const dx = icon.x - s.x;
    const dy = icon.y - s.y;
    const d = Math.hypot(dx, dy);
    if (d < bestDist) {
      bestDist = d;
      best = s;
    }
  });

  if (!best) return;

  // Occupied check: create set of occupied slots excluding this icon
  const occupied = new Set();
  icons.forEach(ic => {
    if (ic === icon) return;
    // find which slot this other icon is currently closest to
    let nearest = null;
    let nd = Infinity;
    slots.forEach((s, idx) => {
      const dx = ic.x - s.x;
      const dy = ic.y - s.y;
      const d = dx * dx + dy * dy;
      if (d < nd) { nd = d; nearest = idx; }
    });
    if (nearest !== null) occupied.add(nearest);
  });

  // Try to place into nearest free slot; if that slot is occupied, search nearest free
  const slotDistances = slots.map((s, idx) => {
    return { idx, d: Math.hypot(icon.x - s.x, icon.y - s.y) };
  }).sort((a,b)=>a.d-b.d);

  let chosen = null;
  for (const sd of slotDistances) {
    if (!occupied.has(sd.idx)) { chosen = slots[sd.idx]; break; }
  }
  // If none free (unlikely), just keep current position clamped
  if (chosen) {
    icon.x = chosen.x;
    icon.y = chosen.y;
  }
}

 // removed function drawIcon() {} — moved to desktop_ui.js

function drawWindow(ctx, desktop, win, active) {
  const radius = 6;
  const barHeight = 24;

  // Apply opening/closing animation (scale + alpha) around window center
  let animScale = 1, animAlpha = 1;
  if (win.anim) {
    const t = Math.min(win.anim.t / Math.max(0.0001, win.anim.duration), 1);
    if (win.anim.state === 'opening') {
      const ease = Math.sin((t * Math.PI) / 2); // ease-out
      animScale = 0.85 + 0.15 * ease;
      animAlpha = 0.4 + 0.6 * ease;
    } else if (win.anim.state === 'closing') {
      const ease = 1 - Math.cos((t * Math.PI) / 2); // ease-in
      animScale = 1 - 0.15 * ease;
      animAlpha = 1 - Math.min(0.98, ease);
    }
  }

  ctx.save();
  // origin at window top-left then center for scaling
  ctx.translate(win.x + win.width / 2, win.y + win.height / 2);
  ctx.globalAlpha = animAlpha;
  ctx.scale(animScale, animScale);
  ctx.translate(-win.width / 2, -win.height / 2);

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.beginPath();
  ctx.roundRect(4, 4, win.width, win.height, radius);
  ctx.fill();

  // Body
  ctx.fillStyle = active ? '#ffffff' : '#f8f8f8';
  ctx.beginPath();
  ctx.roundRect(0, 0, win.width, win.height, radius);
  ctx.fill();

  // Title bar (XP-style blue for active, light grey for inactive)
  const grad = ctx.createLinearGradient(0, 0, 0, barHeight);
  if (active) {
    grad.addColorStop(0, '#4f81bd');
    grad.addColorStop(1, '#2b59a0');
  } else {
    grad.addColorStop(0, '#e3e3e3');
    grad.addColorStop(1, '#cfcfcf');
  }
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(0, 0, win.width, barHeight, [radius, radius, 0, 0]);
  ctx.fill();

  ctx.strokeStyle = '#c3c3c3';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(0.5, 0.5, win.width - 1, win.height - 1, radius);
  ctx.stroke();

  // Close button
  const btnSize = 16;
  const closeBx = win.width - btnSize - 6;
  const by = 4;

  // Minimize button
  {
    const minBx = closeBx - btnSize * 2 - 8;
    ctx.fillStyle = '#e6e6e6';
    ctx.beginPath();
    ctx.roundRect(minBx, by, btnSize, btnSize, 4);
    ctx.fill();
    ctx.strokeStyle = '#a0a0a0';
    ctx.stroke();

    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(minBx + 4, by + btnSize - 5);
    ctx.lineTo(minBx + btnSize - 4, by + btnSize - 5);
    ctx.stroke();
  }

  // Close button
  ctx.fillStyle = '#ff5c5c';
  ctx.beginPath();
  ctx.roundRect(closeBx, by, btnSize, btnSize, 4);
  ctx.fill();
  ctx.strokeStyle = '#c44040';
  ctx.stroke();

  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(closeBx + 4, by + 4);
  ctx.lineTo(closeBx + btnSize - 4, by + btnSize - 4);
  ctx.moveTo(closeBx + btnSize - 4, by + 4);
  ctx.lineTo(closeBx + 4, by + btnSize - 4);
  ctx.stroke();

  // App-level fullscreen button (shown for all apps)
  {
    const fullBx = closeBx - btnSize - 4;
    ctx.fillStyle = '#e6e6e6';
    ctx.beginPath();
    ctx.roundRect(fullBx, by, btnSize, btnSize, 4);
    ctx.fill();
    ctx.strokeStyle = '#a0a0a0';
    ctx.stroke();

    // Icon: small square for fullscreen / shrink when already fullscreen
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (!win.isAppFullscreen) {
      // Maximize icon
      ctx.rect(fullBx + 4, by + 4, btnSize - 8, btnSize - 8);
    } else {
      // Restore icon (two overlapping squares)
      ctx.rect(fullBx + 5, by + 4, btnSize - 9, btnSize - 9);
      ctx.moveTo(fullBx + 4, by + 7);
      ctx.lineTo(fullBx + 4, by + 4);
      ctx.lineTo(fullBx + 7, by + 4);
      ctx.moveTo(fullBx + 7, by + 5);
      ctx.lineTo(fullBx + btnSize - 4, by + 5);
      ctx.lineTo(fullBx + btnSize - 4, by + btnSize - 4);
      ctx.lineTo(fullBx + 5, by + btnSize - 4);
    }
    ctx.stroke();
  }

  // Title
  ctx.fillStyle = active ? '#ffffff' : '#222222';
  ctx.font = '16px "WinXPTahoma", system-ui';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(win.title, 10, barHeight / 2 + 1);

  // Content area
  // If this window requests an embeddedUrl (e.g. Eaglercraft / Minecraft), ensure a positioned iframe exists
  try {
    if (win.embeddedUrl) {
      const frameId = `embedded-${win.id}`;
      let iframe = document.getElementById(frameId);
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = frameId;
        iframe.src = win.embeddedUrl;
        iframe.style.position = 'absolute';
        iframe.style.border = '0';
        iframe.style.zIndex = 9999; // above canvas; desktop will position it each frame
        iframe.allow = 'autoplay; fullscreen; clipboard-write';
        document.body.appendChild(iframe);
      }
      // Compute content rect in same way used later for app rendering
      const innerPad = 8;
      // contentX/Y are computed in CSS canvas coordinates so we can position the DOM iframe precisely
      const contentX = win.x + innerPad;
      const contentY = win.y + barHeight + innerPad;
      const contentW = win.width - innerPad * 2;
      const contentH = win.height - barHeight - innerPad * 2;

      // Position the iframe over the content area (account for canvas transform).
      // Use the canvas bounding client rect so the iframe's DOM coordinates line up
      // with the canvas-drawn window and will follow when the window is moved.
      try {
        const canvasEl = document.getElementById('scene');
        if (canvasEl) {
          const crect = canvasEl.getBoundingClientRect();
          // contentX/contentY are in canvas (CSS) pixels; offset them by canvas position
          iframe.style.left = `${Math.round(crect.left + contentX)}px`;
          iframe.style.top = `${Math.round(crect.top + contentY)}px`;
        } else {
          iframe.style.left = `${Math.round(contentX)}px`;
          iframe.style.top = `${Math.round(contentY)}px`;
        }
      } catch (err) {
        iframe.style.left = `${Math.round(contentX)}px`;
        iframe.style.top = `${Math.round(contentY)}px`;
      }
      iframe.style.width = `${Math.round(contentW)}px`;
      iframe.style.height = `${Math.round(contentH)}px`;
      iframe.style.pointerEvents = (win.closed || win.minimized) ? 'none' : 'auto';
      iframe.style.display = (win.closed || win.minimized) ? 'none' : 'block';
    } else {
      // Remove any iframe left over for this window id if embeddedUrl removed
      const old = document.getElementById(`embedded-${win.id}`);
      if (old) old.remove();
    }
  } catch (err) {
    // if DOM ops fail, fail silently and continue drawing canvas-only UI
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, barHeight, win.width, win.height - barHeight);
  ctx.clip();

  // XP-style background
  ctx.fillStyle = '#f5f5f5';
  ctx.fillRect(0, barHeight, win.width, win.height - barHeight);

  const innerPad = 8;
  const contentX = innerPad;
  const contentY = barHeight + innerPad;
  const contentW = win.width - innerPad * 2;
  const contentH = win.height - barHeight - innerPad * 2;

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = '11px "WinXPTahoma", system-ui';
  ctx.fillStyle = '#000';

  // Helper: standard XP toolbar strip
  const drawToolbar = (y, buttons) => {
    const h = 22;
    ctx.fillStyle = '#ece9d8';
    ctx.fillRect(contentX, y, contentW, h);
    ctx.strokeStyle = '#d4d0c8';
    ctx.strokeRect(contentX, y, contentW, h);
    ctx.font = '14px "WinXPTahoma", system-ui';
    let bx = contentX + 6;
    const by = y + 4;
    buttons.forEach((label) => {
      const bw = ctx.measureText(label).width + 18;
      ctx.fillStyle = '#f4f4f4';
      ctx.fillRect(bx, by, bw, h - 8);
      ctx.strokeStyle = '#d4d0c8';
      ctx.strokeRect(bx, by, bw, h - 8);
      ctx.fillStyle = '#000';
      ctx.fillText(label, bx + 8, by + 3);
      bx += bw + 4;
    });
    return y + h;
  };

  // Helper: left blue explorer task pane (improved styling)
  const drawExplorerLeftPane = (title, sections) => {
    const paneWidth = Math.max(130, Math.min(170, contentW * 0.35));
    const x = contentX;
    const y = contentY + 24;
    const h = contentH - 28;

    const g = ctx.createLinearGradient(x, y, x + paneWidth, y);
    g.addColorStop(0, '#7494c4');
    g.addColorStop(1, '#4f6ea3');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, paneWidth, h);

    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.15;
    ctx.fillRect(x + 6, y + 6, paneWidth - 12, 30);
    ctx.globalAlpha = 1;

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px "WinXPTahoma", system-ui';
    ctx.fillText(title, x + 12, y + 10);

    ctx.font = '13px "WinXPTahoma", system-ui';
    let ty = y + 42;
    sections.forEach((sec) => {
      // Section header with rounded blue look
      const headerGrad = ctx.createLinearGradient(x + 8, ty, x + 8, ty + 18);
      headerGrad.addColorStop(0, '#ffffff');
      headerGrad.addColorStop(1, '#d6e5f5');
      ctx.fillStyle = headerGrad;
      ctx.beginPath();
      ctx.roundRect(x + 8, ty, paneWidth - 16, 18, 2);
      ctx.fill();
      
      ctx.fillStyle = '#215dc6';
      ctx.font = 'bold 13px "WinXPTahoma"';
      ctx.fillText(sec.title, x + 16, ty + 3);
      
      // Expander chevron
      ctx.strokeStyle = '#215dc6';
      ctx.beginPath();
      ctx.moveTo(x + paneWidth - 22, ty + 6);
      ctx.lineTo(x + paneWidth - 18, ty + 10);
      ctx.lineTo(x + paneWidth - 14, ty + 6);
      ctx.stroke();

      ty += 24;
      ctx.fillStyle = '#ffffff';
      ctx.font = '13px "WinXPTahoma"';
      sec.items.forEach((it) => {
        // Bullet or icon? Bullet for now.
        ctx.fillText('» ' + it, x + 16, ty + 1);
        ty += 18;
      });
      ty += 8;
    });

    return { x, y, width: paneWidth, height: h };
  };

  // Helper: list header row
  const drawListHeader = (x, y, cols, w) => {
    const h = 18;
    ctx.fillStyle = '#d4d0c8';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(x, y + 0.5);
    ctx.lineTo(x + w, y + 0.5);
    ctx.stroke();
    ctx.strokeStyle = '#808080';
    ctx.beginPath();
    ctx.moveTo(x, y + h - 0.5);
    ctx.lineTo(x + w, y + h - 0.5);
    ctx.stroke();

    ctx.fillStyle = '#000';
    ctx.font = '15px "WinXPTahoma", system-ui';
    let colX = x + 6;
    cols.forEach((col) => {
      ctx.fillText(col.label, colX, y + 3);
      colX += col.width;
    });
    return y + h;
  };

  // Per-app content
  if (win.appId === 'paint') {
    // Delegate Paint rendering to dedicated module
    drawPaintApp(ctx, win, contentX, contentY, contentW, contentH);
  } else if (win.appId === 'jail') {
    // Jail App Background & Walls
    ctx.fillStyle = '#2c2c2c'; // Dark stone
    ctx.fillRect(contentX, contentY, contentW, contentH);
    
    // Draw brick pattern
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1;
    for(let iy=contentY; iy<contentY+contentH; iy+=20) {
      ctx.beginPath();
      ctx.moveTo(contentX, iy);
      ctx.lineTo(contentX+contentW, iy);
      ctx.stroke();
      for(let ix=contentX + (iy%40===0?0:15); ix<contentX+contentW; ix+=30) {
        ctx.beginPath();
        ctx.moveTo(ix, iy);
        ctx.lineTo(ix, iy+20);
        ctx.stroke();
      }
    }

    // Bench
    ctx.fillStyle = '#444';
    ctx.fillRect(contentX + 10, contentY + contentH - 40, contentW - 20, 15);
    ctx.strokeStyle = '#222';
    ctx.strokeRect(contentX + 10, contentY + contentH - 40, contentW - 20, 15);

    // Draw imprisoned stickmen inside the jail (behind the bars)
    if (desktop.sticks) {
      ctx.save();
      // Temporarily switch back to world coordinate transform to draw stickmen 
      // accurately using their world points, while still being clipped by the window.
      const dpr = window.devicePixelRatio || 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      desktop.sticks.forEach(st => {
        // Draw them here if they are jailed in this specific window and not currently being dragged out
        if (st.jailedWindowId === win.id && !st.dragging) {
          st.draw(ctx, desktop);
        }
      });
      ctx.restore();
    }

    // Jail Bars (Foreground)
    ctx.strokeStyle = '#777';
    ctx.lineWidth = 6;
    for(let bx = contentX + 30; bx < contentX + contentW; bx += 40) {
      // Main bar stroke
      ctx.beginPath();
      ctx.moveTo(bx, contentY);
      ctx.lineTo(bx, contentY + contentH);
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 6;
      ctx.stroke();
      
      // Highlight on bars
      ctx.beginPath();
      ctx.moveTo(bx - 2, contentY);
      ctx.lineTo(bx - 2, contentY + contentH);
      ctx.strokeStyle = '#999';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Release Button in foreground (clickable layer)
    const btnW = 120, btnH = 24;
    const btnX = contentX + (contentW - btnW) / 2;
    const btnY = contentY + 10;
    ctx.fillStyle = '#d4d0c8';
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnW, btnH, 3);
    ctx.fill();
    ctx.strokeStyle = '#808080';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#800000';
    ctx.font = 'bold 11px "WinXPTahoma"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('RELEASE STICKMEN', btnX + btnW / 2, btnY + btnH / 2 + 1);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

  } else if (win.appId === 'tools') {
    // Delegate Tools rendering to dedicated module
    drawToolsApp(ctx, win, desktop, contentX, contentY, contentW, contentH);
  } else if (win.appId === 'computer') {
    // "My Computer" explorer-style UI
    let y = contentY;

    y = drawToolbar(y, ['Back', 'Forward', 'Search', 'Folders']);

    // Address bar
    ctx.fillStyle = '#d4d0c8';
    ctx.fillRect(contentX, y + 2, contentW, 22);
    ctx.strokeStyle = '#ffffff';
    ctx.strokeRect(contentX, y + 2, contentW, 22);
    ctx.fillStyle = '#000';
    ctx.font = '12px "Tahoma", system-ui';
    ctx.fillText('Address', contentX + 6, y + 6);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(contentX + 56, y + 6, contentW - 64, 14);
    ctx.strokeStyle = '#808080';
    ctx.strokeRect(contentX + 56, y + 6, contentW - 64, 14);
    ctx.fillStyle = '#000';
    ctx.fillText('My Computer', contentX + 60, y + 8);
    y += 26;

    const pane = drawExplorerLeftPane('System Tasks', [
      {
        title: 'System Tasks',
        items: ['View system information', 'Add or remove programs', 'Change a setting'],
      },
      {
        title: 'Other Places',
        items: ['My Network Places', 'My Documents', 'Control Panel'],
      },
    ]);

    const listX = pane.x + pane.width + 6;
    const listW = contentX + contentW - listX;
    let listY = contentY + 24;

    // Header row
    listY = drawListHeader(
      listX,
      listY,
      [
        { label: 'Name', width: listW * 0.5 },
        { label: 'Type', width: listW * 0.25 },
        { label: 'Total Size', width: listW * 0.25 },
      ],
      listW
    );

    // Drives list with icons
    const rowH = 22;
    const rows = [
      ['Local Disk (C:)', 'Local Disk', '19.9 GB'],
      ['Local Disk (D:)', 'Local Disk', '29.7 GB'],
      ['3½ Floppy (A:)', 'Floppy', '1.44 MB'],
      ['CD Drive (E:)', 'CD-ROM', '700 MB'],
    ];
    ctx.fillStyle = '#ffffff';
    rows.forEach((row, i) => {
      const ry = listY + i * rowH;
      const isSelected = win.computerSelectedDriveIndex === i;
      ctx.fillStyle = isSelected
        ? '#3169c6'
        : i % 2 === 0
        ? '#ffffff'
        : '#f7f7f7';
      ctx.fillRect(listX, ry, listW, rowH);
      
      // Selection outline
      if(isSelected) {
        ctx.strokeStyle = '#215dc6';
        ctx.strokeRect(listX + 0.5, ry + 0.5, listW - 1, rowH - 1);
      }

      // Drive icon
      ctx.fillStyle = isSelected ? '#ffffff' : '#f0c040';
      ctx.beginPath();
      ctx.roundRect(listX + 6, ry + 4, 14, 12, 2);
      ctx.fill();
      ctx.strokeStyle = isSelected ? '#ffffff' : '#806000';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = isSelected ? '#ffffff' : '#000';
      const [name, type, size] = row;
      let colX = listX + 26;
      ctx.fillText(name, colX, ry + 4);
      colX = listX + listW * 0.5 + 6;
      ctx.fillText(type, colX, ry + 4);
      colX = listX + listW * 0.75 + 6;
      ctx.fillText(size, colX, ry + 4);
    });

    // Details pane for selected drive
    if (rows.length > 0 && win.computerSelectedDriveIndex != null) {
      const sel = rows[win.computerSelectedDriveIndex];
      const detailsH = 52;
      const detailsY = contentY + contentH - detailsH - 4;

      ctx.fillStyle = '#eceff8';
      ctx.fillRect(listX, detailsY, listW, detailsH);
      ctx.strokeStyle = '#b0b8d4';
      ctx.strokeRect(listX, detailsY, listW, detailsH);

      ctx.fillStyle = '#000080';
      ctx.font = 'bold 15px "WinXPTahoma", system-ui';
      ctx.fillText('Drive Details', listX + 8, detailsY + 4);

      ctx.fillStyle = '#000';
      ctx.font = '15px "WinXPTahoma", system-ui';
      const [name, type, size] = sel;
      ctx.fillText(`Name: ${name}`, listX + 8, detailsY + 20);
      ctx.fillText(`Type: ${type}   Size: ${size}`, listX + 8, detailsY + 34);
    }

  } else if (win.appId === 'folder') {
    // "My Documents" style folder view with richer XP-like details
    let y = contentY;

    y = drawToolbar(y, ['Back', 'Up', 'Search', 'Folders']);

    // Address bar
    ctx.fillStyle = '#d4d0c8';
    ctx.fillRect(contentX, y + 2, contentW, 22);
    ctx.strokeStyle = '#ffffff';
    ctx.strokeRect(contentX, y + 2, contentW, 22);
    ctx.fillStyle = '#000';
    ctx.font = '12px "Tahoma", system-ui';
    ctx.fillText('Address', contentX + 6, y + 6);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(contentX + 56, y + 6, contentW - 64, 14);
    ctx.strokeStyle = '#808080';
    ctx.strokeRect(contentX + 56, y + 6, contentW - 64, 14);
    ctx.fillStyle = '#000';
    ctx.fillText('My Documents', contentX + 60, y + 8);
    y += 26;

    const pane = drawExplorerLeftPane('File and Folder Tasks', [
      {
        title: 'File and Folder Tasks',
        items: ['Make a new folder', 'Publish this folder', 'Share this folder'],
      },
      {
        title: 'Other Places',
        items: ['My Computer', 'My Network Places'],
      },
      {
        title: 'Details',
        items: ['Shows info about the selected document.'],
      },
    ]);

    const listX = pane.x + pane.width + 6;
    const listW = contentX + contentW - listX;
    let listY = contentY + 24;

    listY = drawListHeader(
      listX,
      listY,
      [
        { label: 'Name', width: listW * 0.5 },
        { label: 'Size', width: listW * 0.2 },
        { label: 'Type', width: listW * 0.3 },
      ],
      listW
    );

    const rowH = 22;
    const rows = Array.isArray(win.folderItems)
      ? win.folderItems
      : [
          ['memes.gif', '256 KB', 'GIF Image'],
          ['stickman_plan.txt', '1 KB', 'Text Document'],
          ['definitely_not_a_virus.exe', '32 KB', 'Application'],
        ];

    rows.forEach((row, i) => {
      const ry = listY + i * rowH;
      const isSelected = win.selectedFolderIndex === i;
      ctx.fillStyle = isSelected ? '#3169c6' : (i % 2 === 0 ? '#ffffff' : '#f7f7f7');
      ctx.fillRect(listX, ry, listW, rowH);
      
      // Selection focus
      if(isSelected) {
        ctx.strokeStyle = '#215dc6';
        ctx.strokeRect(listX + 0.5, ry + 0.5, listW - 1, rowH - 1);
      }

      // Small folder/file icon
      const isFolder = row[2].includes('Folder');
      ctx.fillStyle = isSelected ? '#ffffff' : (isFolder ? '#f0c040' : '#ececec');
      ctx.beginPath();
      ctx.roundRect(listX + 6, ry + 4, 14, 12, 1);
      ctx.fill();
      ctx.strokeStyle = isSelected ? '#ffffff' : '#888';
      ctx.stroke();

      ctx.fillStyle = isSelected ? '#ffffff' : '#000';
      let colX = listX + 26;
      ctx.fillText(row[0], colX, ry + 4);
      colX = listX + listW * 0.5 + 6;
      ctx.fillText(row[1], colX, ry + 4);
      colX = listX + listW * 0.7 + 6;
      ctx.fillText(row[2], colX, ry + 4);
    });

    // Details pane at bottom showing metadata for selected file
    if (rows.length > 0 && win.selectedFolderIndex != null) {
      const sel = rows[win.selectedFolderIndex];
      const detailsH = 44;
      const detailsY = contentY + contentH - detailsH - 4;

      ctx.fillStyle = '#eceff8';
      ctx.fillRect(listX, detailsY, listW, detailsH);
      ctx.strokeStyle = '#b0b8d4';
      ctx.strokeRect(listX, detailsY, listW, detailsH);

      ctx.fillStyle = '#000080';
      ctx.font = 'bold 11px "WinXPTahoma", system-ui';
      ctx.fillText('File Details', listX + 8, detailsY + 4);

      ctx.fillStyle = '#000';
      ctx.font = '11px "WinXPTahoma", system-ui';
      const [name, size, type] = sel;
      ctx.fillText(`Name: ${name}`, listX + 8, detailsY + 20);
      ctx.fillText(`Size: ${size}   Type: ${type}`, listX + 8, detailsY + 34);
    }


  } else if (win.appId === 'aol') {
    // AOL Instant Messenger-style chat window
    const headerH = 45;
    const buddyPaneWidth = Math.max(120, Math.min(160, contentW * 0.35));

    // Ensure scroll state exists for long conversations
    if (typeof win.aolScrollY !== 'number') win.aolScrollY = 0;
    if (typeof win.aolMaxScroll !== 'number') win.aolMaxScroll = 0;

    // Header bar
    ctx.fillStyle = '#4f81bd';
    ctx.fillRect(contentX, contentY, contentW, headerH);
    ctx.strokeStyle = '#2b59a0';
    ctx.strokeRect(contentX, contentY, contentW, headerH);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px "WinXPTahoma", system-ui';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('AOL Instant Messenger', contentX + 8, contentY + 6);
    ctx.font = '14px "WinXPTahoma", system-ui';
    ctx.fillText('Signed in as: you@xp-desktop', contentX + 8, contentY + 24);

    // Buddy list pane
    const buddyX = contentX;
    const buddyY = contentY + headerH;
    const buddyH = contentH - headerH;
    ctx.fillStyle = '#f0f4ff';
    ctx.fillRect(buddyX, buddyY, buddyPaneWidth, buddyH);
    ctx.strokeStyle = '#b0b8d4';
    ctx.strokeRect(buddyX, buddyY, buddyPaneWidth, buddyH);

    ctx.fillStyle = '#000080';
    ctx.font = 'bold 15px "WinXPTahoma", system-ui';
    ctx.fillText('Buddy List', buddyX + 8, buddyY + 6);

    ctx.font = '15px "WinXPTahoma", system-ui';
    const buddies = win.aolConversations || [{name:'Buddy'}];
    buddies.forEach((b, i) => {
      const by = buddyY + 22 + i * 16;
      if (win.aolSelectedBuddy === i) {
        ctx.fillStyle = '#3169c6';
        ctx.fillRect(buddyX + 2, by - 2, buddyPaneWidth - 4, 16);
        ctx.fillStyle = '#ffffff';
      } else {
        ctx.fillStyle = '#000';
      }
      ctx.fillText('● ' + b.name, buddyX + 10, by);
    });

    // Chat area
    const chatX = buddyX + buddyPaneWidth + 6;
    const chatY = contentY + headerH + 4;
    const chatW = contentW - buddyPaneWidth - 10;
    const chatH = contentH - headerH - 8;
    const inputH = 40;

    const historyH = chatH - inputH - 6;

    // Chat history
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(chatX, chatY, chatW, historyH);
    ctx.strokeStyle = '#b0b8d4';
    ctx.strokeRect(chatX, chatY, chatW, historyH);

    ctx.save();
    ctx.beginPath();
    ctx.rect(chatX + 2, chatY + 2, chatW - 4, historyH - 4);
    ctx.clip();

    ctx.font = '15px "WinXPTahoma", system-ui';
    const lineHeight = 18;
    const paddingTop = 6;

    const messages = Array.isArray(win.chatMessages)
      ? win.chatMessages.slice()
      : [];

    const totalHeight = messages.length * lineHeight;
    const visibleHeight = historyH - paddingTop - 6;
    win.aolMaxScroll = Math.max(0, totalHeight - visibleHeight);
    if (win.aolScrollY < 0) win.aolScrollY = 0;
    if (win.aolScrollY > win.aolMaxScroll) win.aolScrollY = win.aolMaxScroll;
    const scrollY = win.aolScrollY || 0;

    // Determine first visible message based on scroll
    let startIndex = 0;
    let offsetWithinLine = 0;
    if (totalHeight > 0) {
      startIndex = Math.floor(scrollY / lineHeight);
      offsetWithinLine = scrollY - startIndex * lineHeight;
    }

    let ty = chatY + paddingTop - offsetWithinLine;

    // Maximum width for a rendered history line (leave padding)
    const maxHistoryTextW = chatW - 12;

    for (let i = startIndex; i < messages.length; i++) {
      const msg = messages[i];
      if (ty > chatY + historyH - 4) break;

      const isYou = msg.from === 'You';
      ctx.fillStyle = isYou ? '#003399' : '#000000';
      const prefix = `${msg.from} (${msg.time}): `;
      // Compose full text and truncate if necessary to fit the history area
      let fullText = prefix + (msg.text || '');
      if (ctx.measureText(fullText).width > maxHistoryTextW) {
        // Truncate message portion with ellipsis while preserving prefix
        let remaining = msg.text || '';
        // Fast path: if even a single char plus ellipsis is too wide, show prefix only (trimmed)
        if (ctx.measureText(prefix + '…').width > maxHistoryTextW) {
          // Trim prefix if needed
          let p = prefix;
          while (p.length && ctx.measureText(p + '…').width > maxHistoryTextW) {
            p = p.slice(0, -1);
          }
          fullText = p.length ? p + '…' : '…';
        } else {
          // Trim message text to fit
          let t = remaining;
          while (t.length && ctx.measureText(prefix + t + '…').width > maxHistoryTextW) {
            t = t.slice(0, -1);
          }
          fullText = prefix + (t.length ? t + '…' : '');
        }
      }

      ctx.fillText(fullText, chatX + 6, ty);
      ty += lineHeight;
    }

    if (win.isBuddyTyping) {
      ctx.fillStyle = '#666';
      ctx.font = 'italic 13px "WinXPTahoma"';
      const buddy = win.aolConversations && win.aolConversations[win.aolSelectedBuddy];
      const name = buddy ? buddy.name : 'Buddy';
      ctx.fillText(`${name} is typing...`, chatX + 6, ty);
    }

    ctx.restore();

    // Input area
    const inputY = chatY + historyH + 4;
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(chatX, inputY, chatW, inputH);
    ctx.strokeStyle = '#b0b8d4';
    ctx.strokeRect(chatX, inputY, chatW, inputH);

    // Text box
    const boxX = chatX + 6;
    const boxY = inputY + 6;
    const boxW = chatW - 6 - 70 - 6; // leave room for send button
    const boxH = inputH - 12;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeStyle = '#808080';
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    ctx.fillStyle = '#000';
    ctx.font = '15px "WinXPTahoma", system-ui';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const draft = win.chatDraft || '';

    // Truncate the draft so it never overflows the input box (use ellipsis)
    const maxDraftW = boxW - 8; // leave small padding inside box
    let displayDraft = draft;
    if (ctx.measureText(displayDraft).width > maxDraftW) {
      let t = displayDraft;
      // Remove characters until it fits with an ellipsis
      while (t.length && ctx.measureText(t + '…').width > maxDraftW) {
        t = t.slice(0, -1);
      }
      displayDraft = t.length ? t + '…' : '…';
    }

    ctx.fillText(displayDraft, boxX + 4, boxY + 2);

    // Proper blinking text cursor when window is active
    if (active) {
      const nowMs = performance.now();
      if (Math.floor(nowMs / 500) % 2 === 0) {
        const textW = ctx.measureText(displayDraft).width;
        ctx.fillRect(boxX + 4 + textW + 1, boxY + 2, 1, 12);
      }
    }

    if (!displayDraft) {
      ctx.fillStyle = '#808080';
      ctx.fillText('Type a message and press Enter…', boxX + 4, boxY + 2);
    }

    // Send button
    const sendW = 64;
    const sendH = 22;
    const sendX = chatX + chatW - sendW - 8;
    const sendY = inputY + (inputH - sendH) / 2;

    ctx.fillStyle = '#e3e3e3';
    ctx.fillRect(sendX, sendY, sendW, sendH);
    ctx.strokeStyle = '#808080';
    ctx.strokeRect(sendX, sendY, sendW, sendH);
    ctx.fillStyle = '#000';
    ctx.font = '13px "WinXPTahoma", system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Send', sendX + sendW / 2, sendY + sendH / 2 + 1);

    ctx.textAlign = 'left';
  } else if (win.appId === 'music') {
    // XP-style music player with clearer layout
    const centerX = contentX + contentW / 2;
    let y = contentY + 4;

    // Top "display" panel
    ctx.fillStyle = '#2b4a7f';
    ctx.fillRect(contentX, y, contentW, 56);
    ctx.strokeStyle = '#1c3255';
    ctx.strokeRect(contentX, y, contentW, 56);

    ctx.fillStyle = '#cde0ff';
    ctx.font = '15px "WinXPTahoma", system-ui';

    // Center title block within the blue header
    ctx.textAlign = 'center';
    ctx.fillText('Now Playing:', centerX, y + 8);
    ctx.font = 'bold 18px "WinXPTahoma", system-ui';
    ctx.fillText('Bliss Theme', centerX, y + 26);
    ctx.font = '10px "WinXPTahoma", system-ui';
    ctx.fillText('Artist: Stickman XP   Album: Desktop Jams', centerX, y + 42);

    // Time / progress area
    const pbY = y + 32;
    const pbW = Math.max(120, contentW - 220);
    const pbX = centerX - pbW / 2;
    ctx.fillStyle = '#000000';
    ctx.fillRect(pbX, pbY, pbW, 6);
    ctx.fillStyle = '#6ab96a';
    ctx.fillRect(pbX, pbY, pbW * 0.35, 6);
    ctx.strokeStyle = '#ffffff';
    ctx.strokeRect(pbX, pbY, pbW, 6);

    ctx.fillStyle = '#cde0ff';
    ctx.font = '10px "WinXPTahoma", system-ui';
    ctx.textAlign = 'left';
    ctx.fillText('0:42', pbX, pbY - 2);
    ctx.textAlign = 'right';
    ctx.fillText('3:21', pbX + pbW, pbY - 2);
    ctx.textAlign = 'left';

    y += 64;

    // Control strip background
    ctx.fillStyle = '#d4d0c8';
    ctx.fillRect(contentX, y, contentW, 40);
    ctx.strokeStyle = '#a0a0a0';
    ctx.strokeRect(contentX, y, contentW, 40);

    // Transport controls
    const btnRadius = 12;
    const btnY = y + 20;
    const labels = ['⏮', '▶', '⏸', '⏭', '⏹'];
    const spacing = 32;
    let bx = centerX - (labels.length - 1) * spacing * 0.5;

    ctx.font = '14px "Tahoma", system-ui';
    labels.forEach((lab) => {
      ctx.beginPath();
      ctx.strokeStyle = '#808080';
      ctx.fillStyle = '#f8f8f8';
      ctx.arc(bx, btnY, btnRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#000';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(lab, bx, btnY + (lab === '▶' ? 1 : 0));
      bx += spacing;
    });

    // Volume slider on the right
    const volX = contentX + contentW - 120;
    const volY = y + 12;
    const volW = 80;
    ctx.fillStyle = '#c0c0c0';
    ctx.fillRect(volX, volY, volW, 8);
    ctx.strokeStyle = '#808080';
    ctx.strokeRect(volX, volY, volW, 8);
    ctx.fillStyle = '#6ab96a';
    ctx.fillRect(volX, volY, volW * 0.7, 8);
    ctx.fillStyle = '#000';
    ctx.font = '10px "Tahoma", system-ui';
    ctx.fillText('Volume', volX, volY - 2);

    // Left "Library" pane
    const listAreaY = y + 44;
    const leftPaneWidth = Math.max(120, contentW * 0.3);
    ctx.fillStyle = '#f0f4ff';
    ctx.fillRect(contentX, listAreaY, leftPaneWidth, contentH - (listAreaY - contentY) - 4);
    ctx.strokeStyle = '#b0b8d4';
    ctx.strokeRect(contentX, listAreaY, leftPaneWidth, contentH - (listAreaY - contentY) - 4);

    ctx.fillStyle = '#000080';
    ctx.font = 'bold 13px "WinXPTahoma", system-ui';
    ctx.fillText('Music Tasks', contentX + 8, listAreaY + 14);

    ctx.fillStyle = '#000';
    ctx.font = '13px "WinXPTahoma", system-ui';
    const tasks = [
      'Play all',
      'Add to playlist',
      'Copy to CD',
      'Open folder',
    ];
    tasks.forEach((t, i) => {
      ctx.fillText('• ' + t, contentX + 16, listAreaY + 32 + i * 16);
    });

    ctx.fillStyle = '#000080';
    ctx.font = 'bold 11px "WinXPTahoma", system-ui';
    ctx.fillText('Playlists', contentX + 12, listAreaY + 32 + tasks.length * 16 + 16);

    ctx.fillStyle = '#000';
    ctx.font = '11px "WinXPTahoma", system-ui';
    const lists = ['Desktop Mix', 'Chill', 'Minesweeper OST'];
    lists.forEach((t, i) => {
      const ty = listAreaY + 32 + tasks.length * 16 + 30 + i * 16;
      ctx.fillText(t, contentX + 20, ty);
    });

    // Playlist / track list on the right
    const listX = contentX + leftPaneWidth + 6;
    const listW = contentW - leftPaneWidth - 10;
    const listH = contentH - (listAreaY - contentY) - 6;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(listX, listAreaY, listW, listH);
    ctx.strokeStyle = '#808080';
    ctx.strokeRect(listX, listAreaY, listW, listH);

    // Header row
    const headerH = 18;
    ctx.fillStyle = '#d4d0c8';
    ctx.fillRect(listX, listAreaY, listW, headerH);
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(listX, listAreaY + 0.5);
    ctx.lineTo(listX + listW, listAreaY + 0.5);
    ctx.stroke();
    ctx.strokeStyle = '#808080';
    ctx.beginPath();
    ctx.moveTo(listX, listAreaY + headerH - 0.5);
    ctx.lineTo(listX + listW, listAreaY + headerH - 0.5);
    ctx.stroke();

    ctx.fillStyle = '#000';
    ctx.font = '13px "WinXPTahoma", system-ui';
    ctx.fillText('Track', listX + 12, listAreaY + 3);
    ctx.fillText('Length', listX + listW - 70, listAreaY + 3);

    const tracks = [
      ['01  Bliss Theme', '3:21'],
      ['02  Minesweeper Funk', '2:47'],
      ['03  Internet Explorer Jazz', '4:02'],
      ['04  Recycle Bin Blues', '3:05'],
      ['05  Stickman Overture', '5:10'],
    ];

    const rowH = 18;
    tracks.forEach((t, i) => {
      const ty = listAreaY + headerH + i * rowH;
      // Highlight the first track as selected
      ctx.fillStyle = i === 0 ? '#c0d8ff' : (i % 2 === 0 ? '#ffffff' : '#f5f5f5');
      ctx.fillRect(listX, ty, listW, rowH);
      ctx.fillStyle = '#000';
      ctx.fillText(t[0], listX + 12, ty + 2);
      ctx.fillText(t[1], listX + listW - 70, ty + 2);
    });

  } else if (win.appId === 'stickcustomize') {
    // Stickman Customize app: Spaced & Polished UI
    const headerH = 60;
    const headerX = contentX;
    const headerY = contentY;
    const headerW = contentW;

    // Stylish XP-like header
    const headerGrad = ctx.createLinearGradient(headerX, headerY, headerX, headerY + headerH);
    headerGrad.addColorStop(0, '#7494c4');
    headerGrad.addColorStop(1, '#4f6ea3');
    ctx.fillStyle = headerGrad;
    ctx.fillRect(headerX, headerY, headerW, headerH);
    ctx.strokeStyle = '#2b4a7f';
    ctx.lineWidth = 1;
    ctx.strokeRect(headerX, headerY, headerW, headerH);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px "Tahoma", system-ui';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('Stickman Identity Manager', headerX + 12, headerY + 8);

    ctx.fillStyle = '#dae2f0';
    ctx.font = '9px "Tahoma", system-ui';
    ctx.fillText('Double-click any stickman on your desktop to select them.', headerX + 12, headerY + 24);
    
    const isEditingSelection = !!(desktop.selectedStickForCustomization);
    ctx.fillStyle = isEditingSelection ? '#fff' : 'rgba(255,255,255,0.7)';
    ctx.font = 'italic 10px "Tahoma"';
    ctx.fillText(isEditingSelection ? 'Editing: Selected Stickman' : 'Editing: Global Default', headerX + 12, headerY + 38);

    const bodyY = headerY + headerH + 10;
    const bodyH = contentH - headerH - 10;

    // Sidebar vs Main content splitting
    const sidebarW = Math.max(180, contentW * 0.5); // Wider sidebar
    const mainX = contentX + sidebarW + 12;
    const mainW = contentW - sidebarW - 12;

    // Sidebar: Controls section
    ctx.fillStyle = '#f5f5f5';
    ctx.strokeStyle = '#b0b0b0';
    ctx.beginPath();
    ctx.roundRect(contentX, bodyY, sidebarW, bodyH, 4);
    ctx.fill();
    ctx.stroke();

    const entryX = contentX + 16;
    const controlW = sidebarW - 32;
    let currY = bodyY + 6;

    // --- Section: Expression ---
    ctx.fillStyle = '#333';
    ctx.font = 'bold 10px "Tahoma"';
    ctx.fillText('FACIAL EXPRESSION', entryX, currY);
    currY += 16;

    const emotionBoxH = 22;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#718ca1';
    ctx.fillRect(entryX, currY, controlW, emotionBoxH);
    ctx.strokeRect(entryX, currY, controlW, emotionBoxH);
    
    const currentMood = win.stickCustomMood || 'neutral';
    ctx.fillStyle = '#000';
    ctx.font = '11px "Tahoma"';
    ctx.textBaseline = 'middle';
    ctx.fillText(currentMood.charAt(0).toUpperCase() + currentMood.slice(1), entryX + 8, currY + emotionBoxH/2);
    
    ctx.strokeStyle = '#666';
    ctx.beginPath();
    ctx.moveTo(entryX + controlW - 12, currY + 8);
    ctx.lineTo(entryX + controlW - 7, currY + 13);
    ctx.lineTo(entryX + controlW - 2, currY + 8);
    ctx.stroke();
    currY += emotionBoxH + 14;

    // --- Section: Hat Selection ---
    ctx.fillStyle = '#333';
    ctx.font = 'bold 10px "Tahoma"';
    ctx.textBaseline = 'top';
    ctx.fillText('HAT SELECTION', entryX, currY);
    currY += 16;

    const hatIconSize = 28;
    const hats = [null, '⛑️', '👒', '🎩', '🧢'];
    const currentHat = win.stickCustomHat || null;

    hats.forEach((h, i) => {
      const hx = entryX + i * (hatIconSize + 8);
      const isSelected = h === currentHat;
      ctx.fillStyle = isSelected ? '#c0d8ff' : '#ffffff';
      ctx.strokeStyle = isSelected ? '#3b6db3' : '#b0b0b0';
      ctx.beginPath();
      ctx.roundRect(hx, currY, hatIconSize, hatIconSize, 4);
      ctx.fill();
      ctx.stroke();

      if (h === 'vib') {
        // Draw the vib hat image if available
        if (desktop && desktop.vibHatImg && desktop.vibHatImg.complete) {
          ctx.drawImage(desktop.vibHatImg, hx + 4, currY + 4, hatIconSize - 8, hatIconSize - 8);
        } else {
          ctx.fillStyle = '#000';
          ctx.font = '12px "WinXPTahoma"';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('vib', hx + hatIconSize/2, currY + hatIconSize/2);
        }
      } else {
        ctx.fillStyle = '#000';
        ctx.font = '16px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(h === null ? '✖' : h, hx + hatIconSize/2, currY + hatIconSize/2 + 1);
      }
    });
    currY += hatIconSize + 14;

    // --- Section: Name ---
    ctx.fillStyle = '#333';
    ctx.font = 'bold 10px "Tahoma"';
    ctx.textAlign = 'left';
    ctx.fillText('DISPLAY NAME', entryX, currY);
    currY += 16;

    const nameBoxH = 22;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#718ca1';
    ctx.fillRect(entryX, currY, controlW, nameBoxH);
    ctx.strokeRect(entryX, currY, controlW, nameBoxH);
    
    const nameText = (win.stickCustomName || '').trim();
    ctx.font = '11px "Tahoma"';
    ctx.fillStyle = nameText ? '#000' : '#888';
    ctx.textBaseline = 'middle';
    ctx.fillText(nameText || 'Enter Name...', entryX + 8, currY + nameBoxH/2);
    currY += nameBoxH + 14;

    // --- Section: Size & Speed (Compact Sliders) ---
    ctx.fillStyle = '#333';
    ctx.font = 'bold 10px "Tahoma"';
    ctx.textBaseline = 'top';
    ctx.fillText('PHYSICAL SCALE', entryX, currY);
    currY += 16;

    const sliderH = 4;
    ctx.fillStyle = '#d0d0d0';
    ctx.fillRect(entryX, currY + 4, controlW, sliderH);
    const currentScale = win.stickCustomScale || 1.0;
    const scaleT = (currentScale - 0.4) / 2.0;
    const thumbX = entryX + scaleT * controlW;
    ctx.fillStyle = '#3b6db3';
    ctx.beginPath(); ctx.roundRect(thumbX - 4, currY - 2, 8, 16, 2); ctx.fill();
    currY += 28;

    ctx.fillStyle = '#333';
    ctx.fillText('MOVEMENT VELOCITY', entryX, currY);
    currY += 16;
    ctx.fillStyle = '#d0d0d0';
    ctx.fillRect(entryX, currY + 4, controlW, sliderH);
    const currentSpeed = win.stickCustomSpeed || 1.0;
    const speedT = (currentSpeed - 0.2) / 2.8;
    const speedThumbX = entryX + speedT * controlW;
    ctx.fillStyle = '#3b6db3';
    ctx.beginPath(); ctx.roundRect(speedThumbX - 4, currY - 2, 8, 16, 2); ctx.fill();
    currY += 28;

    // --- Section: Color (Larger Wheel) ---
    ctx.fillStyle = '#333';
    ctx.fillText('SKIN TINT', entryX, currY);
    
    // Rainbow Toggle Button
    const rbBtnW = 80;
    const rbBtnH = 16;
    const rbBtnX = entryX + controlW - rbBtnW;
    const isRainbowOn = !!win.stickCustomRainbow;
    
    // Disable Face button (left of the Rainbow button)
    const dfBtnW = 110;
    const dfBtnH = 18;
    const dfBtnX = rbBtnX - dfBtnW - 8;
    const isDisableFace = !!win.stickCustomDisableFace;

    ctx.fillStyle = isDisableFace ? '#c62828' : '#e0e0e0';
    ctx.beginPath();
    ctx.roundRect(dfBtnX, currY - 2, dfBtnW, dfBtnH, 4);
    ctx.fill();
    ctx.strokeStyle = isDisableFace ? '#8b1e1e' : '#999';
    ctx.stroke();

    ctx.fillStyle = isDisableFace ? '#fff' : '#666';
    ctx.font = 'bold 11px "Tahoma"';
    ctx.textAlign = 'center';
    ctx.fillText(isDisableFace ? 'FACE: DISABLED' : 'Disable Face', dfBtnX + dfBtnW / 2, currY + 1);
    ctx.textAlign = 'left';

    // Rainbow button
    ctx.fillStyle = isRainbowOn ? '#4f81bd' : '#e0e0e0';
    ctx.beginPath();
    ctx.roundRect(rbBtnX, currY - 2, rbBtnW, rbBtnH, 4);
    ctx.fill();
    ctx.strokeStyle = isRainbowOn ? '#2b4a7f' : '#999';
    ctx.stroke();
    
    ctx.fillStyle = isRainbowOn ? '#fff' : '#666';
    ctx.font = 'bold 9px "Tahoma"';
    ctx.textAlign = 'center';
    ctx.fillText('RAINBOW: ' + (isRainbowOn ? 'ON' : 'OFF'), rbBtnX + rbBtnW/2, currY + 1);
    ctx.textAlign = 'left';

    currY += 16;

    const maxWheelRadius = controlW * 0.45;
    const verticalSpace = bodyY + bodyH - currY - 20;
    const wheelRadius = Math.max(30, Math.min(maxWheelRadius, verticalSpace * 0.5));
    const wheelCX = entryX + controlW / 2;
    const wheelCY = currY + wheelRadius + 4;
    
    ctx.save();
    ctx.translate(wheelCX, wheelCY);
    const segments = 60;
    for(let i=0; i<segments; i++){
      const a1 = (i/segments)*Math.PI*2;
      const a2 = ((i+1)/segments)*Math.PI*2;
      const hue = (i/segments)*360;
      ctx.beginPath(); ctx.moveTo(0,0); ctx.arc(0,0, wheelRadius, a1, a2+0.02);
      ctx.fillStyle = `hsl(${hue}, 90%, 55%)`; ctx.fill();
    }
    ctx.strokeStyle = '#777';
    ctx.beginPath(); ctx.arc(0,0, wheelRadius, 0, Math.PI*2); ctx.stroke();
    const cHue = win.stickCustomHue || 0;
    const indA = cHue * Math.PI / 180;
    const ix = Math.cos(indA) * (wheelRadius - 6);
    const iy = Math.sin(indA) * (wheelRadius - 6);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(ix, iy, 4, 0, Math.PI*2); ctx.stroke();
    ctx.restore();

    // Main: Preview section
    ctx.fillStyle = '#e8e8e8';
    ctx.strokeStyle = '#b0b0b0';
    ctx.beginPath();
    ctx.roundRect(mainX, bodyY, mainW, bodyH, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.5;
    ctx.fillRect(mainX + 4, bodyY + 4, mainW - 8, bodyH - 8);
    ctx.globalAlpha = 1.0;

    ctx.fillStyle = '#666';
    ctx.font = 'bold 9px "Tahoma"';
    ctx.textAlign = 'center';
    ctx.fillText('PROFILE PREVIEW', mainX + mainW/2, bodyY + 14);

    const previewMood = win.stickCustomMood || 'neutral';
    const previewColor = win.stickCustomColor || '#111111';
    const previewHat = win.stickCustomHat || null;
    const pCX = mainX + mainW/2;
    const pCY = bodyY + bodyH * 0.65;
    const pScale = (win.stickCustomScale || 1.0) * 1.2;

    ctx.save();
    ctx.translate(pCX, pCY);
    ctx.scale(pScale, pScale);
    ctx.strokeStyle = previewColor;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    // Legs
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-10, 24); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(10, 24); ctx.stroke();
    // Torso & Arms
    ctx.beginPath(); ctx.moveTo(0,-22); ctx.lineTo(0,0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0,-18); ctx.lineTo(-14, -6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0,-18); ctx.lineTo(14, -6); ctx.stroke();
    // Head
    ctx.beginPath(); ctx.arc(0, -32, 8, 0, Math.PI*2); ctx.stroke();
    
    // Hat in preview
    if (previewHat) {
      ctx.save();
      ctx.font = '16px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      // Position preview hat lower to match in-game physics
      ctx.fillText(previewHat, 0, -31);
      ctx.restore();
    }

    // Face in preview
    ctx.save();
    ctx.lineWidth = 2;
    const hX = 0, hY = -32;
    if (previewMood === 'happy') {
      ctx.beginPath(); ctx.arc(hX - 3, hY - 1, 1, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(hX + 3, hY - 1, 1, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(hX, hY + 3, 3, 0, Math.PI, false); ctx.stroke();
    } else if (previewMood === 'sad') {
      ctx.beginPath(); ctx.arc(hX - 3, hY - 1, 1, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(hX + 3, hY - 1, 1, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(hX, hY + 5, 3, 0, Math.PI, true); ctx.stroke();
    } else if (previewMood === 'angry') {
      ctx.beginPath(); ctx.moveTo(hX - 5, hY - 4); ctx.lineTo(hX - 1, hY - 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(hX + 1, hY - 2); ctx.lineTo(hX + 5, hY - 4); ctx.stroke();
      ctx.beginPath(); ctx.arc(hX - 3, hY, 1, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(hX + 3, hY, 1, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(hX, hY + 5, 3, 0, Math.PI, true); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.arc(hX - 3, hY - 1, 1, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(hX + 3, hY - 1, 1, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(hX - 2, hY + 3); ctx.lineTo(hX + 2, hY + 3); ctx.stroke();
    }
    ctx.restore();

    ctx.restore();

    if(nameText){
      ctx.fillStyle = '#000';
      ctx.font = 'bold 12px "Tahoma"';
      ctx.textAlign = 'center';
      ctx.fillText(nameText, pCX, bodyY + bodyH - 24);
    }
  } else if (win.appId === 'settings') {
    // Settings application – cleaner XP-style layout
    const opts = [
      { category: 'Appearance' },
      { key: 'wallpaperIndex', label: 'Cycle Wallpaper', type: 'wallpaper' },
      { key: 'darkTaskbar', label: 'Dark taskbar theme', type: 'toggle' },
      { key: 'mobileFriendly', label: 'Mobile Friendly UI', type: 'toggle' },
      { category: 'Desktop & System' },
      { key: 'muteToasts', label: 'Mute notifications', type: 'toggle' },
      { key: 'showFps', label: 'Show FPS counter', type: 'toggle' },
      { key: 'allowAppDeletion', label: 'Enable app deletion (drag to Bin)', type: 'toggle' },
      { key: 'lowEndMode', label: 'Low-End Device mode (30 FPS)', type: 'toggle' },
      { category: 'Audio' },
      { key: 'muteAllSound', label: 'Mute all sounds', type: 'toggle' },
      { category: 'Stickmen & AI' },
      { key: 'maxStickmen20', label: 'Allow 20 stickmen', type: 'toggle' },
      { key: 'disableEmotes', label: 'Disable emoji thoughts', type: 'toggle' },
      { key: 'extraWiggle', label: 'Extra stickman wiggle', type: 'toggle' },
      { key: 'allowStickOpenApps', label: 'Sticks can open apps', type: 'toggle' },
      { key: 'stickFightEachOther', label: 'Sticks auto-fight when armed', type: 'toggle' },
      { key: 'stickHealthBars', label: 'Stickman health bars', type: 'toggle' },
      { key: 'keepDeadSticks', label: 'Keep dead stickmen', type: 'toggle' },
      { key: 'stickVibRibbon', label: 'Vib-ribbon background', type: 'toggle' },
      { category: 'Sandbox' },
      { key: 'maxItems500', label: 'Increase object limit (500)', type: 'toggle' },
    ];

    // Ensure state exists
    if (!win.settingsState) {
      win.settingsState = {
        darkTaskbar: !!(desktop.settings && desktop.settings.darkTaskbar),
        muteToasts: !!(desktop.settings && desktop.settings.muteToasts),
        muteAllSound: !!(desktop.settings && desktop.settings.muteAllSound),
        extraWiggle: false,
        maxStickmen20: (desktop.settings && desktop.settings.maxStickmen > 10),
        disableEmotes: !!(desktop.settings && desktop.settings.disableEmotes),
        showFps: !!(desktop.settings && desktop.settings.showFps),
        wallpaperIndex: (desktop.settings && desktop.settings.wallpaperIndex) || 0,
        lowEndMode: !!(desktop.settings && desktop.settings.lowEndMode),
        allowStickOpenApps: (desktop.settings && desktop.settings.allowStickOpenApps !== false),
        stickFightEachOther: !!(desktop.settings && desktop.settings.stickFightEachOther),
        stickHealthBars: !!(desktop.settings && desktop.settings.stickHealthBars),
        maxItems500: !!(desktop.settings && desktop.settings.maxItems500),
      };
    }

    // Ensure scroll state exists for long option lists
    if (typeof win.settingsScrollY !== 'number') win.settingsScrollY = 0;
    if (typeof win.settingsMaxScroll !== 'number') win.settingsMaxScroll = 0;

    // Header band
    ctx.fillStyle = '#f4f4f4';
    ctx.fillRect(contentX, contentY, contentW, 32);
    ctx.strokeStyle = '#d0d0d0';
    ctx.strokeRect(contentX, contentY, contentW, 32);

    const headerGrad = ctx.createLinearGradient(
      contentX,
      contentY,
      contentX,
      contentY + 32
    );
    headerGrad.addColorStop(0, '#ffffff');
    headerGrad.addColorStop(1, '#e6eefc');
    ctx.fillStyle = headerGrad;
    ctx.fillRect(contentX + 1, contentY + 1, contentW - 2, 30);

    ctx.fillStyle = '#1f4e79';
    ctx.font = 'bold 16px "WinXPTahoma", system-ui';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('Desktop Settings', contentX + 10, contentY + 10 + 6);

    ctx.fillStyle = '#4a4a4a';
    ctx.font = '14px "WinXPTahoma", system-ui';
    ctx.fillText('Adjust visuals and behavior of your XP sandbox.', contentX + 10, contentY + 10 + 18);

    // Card background for options
    const cardX = contentX + 8;
    const cardY = contentY + 36;
    const cardW = contentW - 16;
    const cardH = contentH - 36 - 28;

    ctx.fillStyle = '#f9f9f9';
    ctx.fillRect(cardX, cardY, cardW, cardH);
    ctx.strokeStyle = '#d6d6d6';
    ctx.strokeRect(cardX, cardY, cardW, cardH);

    // Options list inside card (scrollable)
    const listX = cardX + 10;
    const checkboxSize = 14;
    const rowH = 28;
    const totalListHeight = opts.reduce((acc, opt) => acc + (opt.category ? 26 : rowH), 0);
    const visibleHeight = cardH - 16;

    win.settingsMaxScroll = Math.max(0, totalListHeight - visibleHeight);
    if (win.settingsScrollY < 0) win.settingsScrollY = 0;
    if (win.settingsScrollY > win.settingsMaxScroll) {
      win.settingsScrollY = win.settingsMaxScroll;
    }
    const scrollY = win.settingsScrollY || 0;

    ctx.save();
    ctx.beginPath();
    ctx.rect(cardX + 2, cardY + 2, cardW - 4, cardH - 4);
    ctx.clip();

    let listY = cardY + 8 - scrollY;

    ctx.font = '15px "WinXPTahoma", system-ui';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    opts.forEach((opt) => {
      const rowWidth = cardW - 20;

      if (opt.category) {
        ctx.fillStyle = '#4f81bd';
        ctx.font = 'bold 13px "WinXPTahoma"';
        ctx.textAlign = 'left';
        ctx.fillText(opt.category.toUpperCase(), listX, listY + 6);
        ctx.strokeStyle = '#4f81bd';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(listX, listY + 20);
        ctx.lineTo(listX + rowWidth, listY + 20);
        ctx.stroke();
        listY += 26;
        return;
      }

      const isOn = !!win.settingsState[opt.key];

      // Row background – light
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(listX, listY, rowWidth, rowH - 2);

      // Underline divider
      ctx.strokeStyle = '#f4f4f4';
      ctx.beginPath();
      ctx.moveTo(listX, listY + rowH - 2.5);
      ctx.lineTo(listX + rowWidth, listY + rowH - 2.5);
      ctx.stroke();

      const cbX = listX + 4;
      const cbY = listY + (rowH - checkboxSize) / 2;

      // Checkbox
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(cbX, cbY, checkboxSize, checkboxSize, 3);
      ctx.fill();
      ctx.strokeStyle = '#a0a0a0';
      ctx.stroke();

      if (isOn) {
        const grad = ctx.createLinearGradient(cbX, cbY, cbX, cbY + checkboxSize);
        grad.addColorStop(0, '#4f81bd');
        grad.addColorStop(1, '#366092');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(cbX + 1, cbY + 1, checkboxSize - 2, checkboxSize - 2, 2);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(cbX + 3, cbY + checkboxSize / 2);
        ctx.lineTo(cbX + checkboxSize / 2 - 1, cbY + checkboxSize - 4);
        ctx.lineTo(cbX + checkboxSize - 3, cbY + 4);
        ctx.stroke();
        ctx.lineWidth = 1;
      }

      ctx.fillStyle = '#222';
      ctx.font = '15px "WinXPTahoma"';
      ctx.fillText(opt.label, cbX + checkboxSize + 8, listY + 5);

      listY += rowH;
    });

    ctx.restore();

    // Draw settings scrollbar on the right side of the card
    if (win.settingsMaxScroll > 0) {
      const barW = 6;
      const barX = cardX + cardW - barW - 4;
      const barY = cardY + 4;
      const barH = cardH - 8;

      ctx.fillStyle = '#e0e0e0';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.strokeStyle = '#b0b0b0';
      ctx.strokeRect(barX, barY, barW, barH);

      const ratio = visibleHeight / (totalListHeight + 0.01);
      const thumbH = Math.max(20, barH * ratio);
      const maxThumbTravel = barH - thumbH;
      const t = scrollY / (win.settingsMaxScroll || 1);
      const thumbY = barY + maxThumbTravel * t;

      ctx.fillStyle = '#a0a0a0';
      ctx.fillRect(barX + 1, thumbY, barW - 2, thumbH);
    }

    // Footer hint
    ctx.fillStyle = '#f4f4f4';
    ctx.fillRect(contentX, contentY + contentH - 24, contentW, 24);
    ctx.strokeStyle = '#d0d0d0';
    ctx.strokeRect(contentX, contentY + contentH - 24, contentW, 24);

    ctx.fillStyle = '#666';
    ctx.font = '14px "WinXPTahoma", system-ui';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('Changes apply instantly in this demo desktop.', contentX + 10, contentY + contentH - 12);
    ctx.textAlign = 'right';
    ctx.fillText('Some options may affect performance.', contentX + contentW - 10, contentY + contentH - 12);

  } else if (win.appId === 'internet') {
    // Internet Explorer XP mock with multi-tab + AI-powered Google-like search
    let y = contentY;

    // Ensure tab state exists
    if (!Array.isArray(win.internetTabs) || win.internetTabs.length === 0) {
      win.internetTabs = [
        {
          id: 1,
          title: 'Google',
          url: 'https://web.archive.org/web/20070629074743/http://www.google.com/',
          page: 'home',
          query: '',
          aiResults: null,
          loadingSearch: false,
        },
      ];
      win.internetActiveTab = 0;
    }
    if (
      typeof win.internetActiveTab !== 'number' ||
      win.internetActiveTab < 0 ||
      win.internetActiveTab >= win.internetTabs.length
    ) {
      win.internetActiveTab = 0;
    }
    const activeTab = win.internetTabs[win.internetActiveTab];

    // Top navigation toolbar
    y = drawToolbar(y, ['Back', 'Forward', 'Stop', 'Refresh', 'Home']);

    // Address bar with the current tab URL
    ctx.fillStyle = '#d4d0c8';
    ctx.fillRect(contentX, y + 2, contentW, 24);
    ctx.strokeStyle = '#ffffff';
    ctx.strokeRect(contentX, y + 2, contentW, 24);
    ctx.fillStyle = '#000';
    ctx.font = '12px "WinXPTahoma", system-ui';
    ctx.fillText('Address', contentX + 6, y + 8);

    const addrX = contentX + 60;
    const addrY = y + 6;
    const addrW = contentW - 64;
    const addrH = 16;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(addrX, addrY, addrW, addrH);
    ctx.strokeStyle = '#808080';
    ctx.strokeRect(addrX, addrY, addrW, addrH);

    const currentUrl =
      (activeTab && activeTab.url) ||
      'https://web.archive.org/web/20070629074743/http://www.google.com/';
    ctx.fillStyle = '#000';
    ctx.font = '12px "WinXPTahoma", system-ui';
    ctx.save();
    ctx.beginPath();
    ctx.rect(addrX + 3, addrY + 2, addrW - 6, addrH - 4);
    ctx.clip();
    ctx.fillText(currentUrl, addrX + 4, addrY + 3);
    ctx.restore();

    y += 30;

    // Tabs strip (Polished XP/IE style)
    const tabsY = y;
    const tabsH = 26;
    const tabsGrad = ctx.createLinearGradient(contentX, tabsY, contentX, tabsY + tabsH);
    tabsGrad.addColorStop(0, '#d4d0c8');
    tabsGrad.addColorStop(1, '#b0b0b0');
    ctx.fillStyle = tabsGrad;
    ctx.fillRect(contentX, tabsY, contentW, tabsH);
    ctx.strokeStyle = '#808080';
    ctx.strokeRect(contentX, tabsY, contentW, tabsH);

    const maxTabs = win.internetTabs.length;
    let tabX = contentX + 4;
    const tabPadding = 34;
    const tabMinW = 100;
    const tabMaxW = Math.max(140, Math.min(220, contentW / 2));

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 11px "WinXPTahoma", system-ui';

    for (let i = 0; i < maxTabs; i++) {
      const t = win.internetTabs[i];
      const isActive = i === win.internetActiveTab;
      const approxTitle = t.title || 'New Tab';
      const estTextW = ctx.measureText(approxTitle).width;
      const tabW = Math.max(tabMinW, Math.min(tabMaxW, estTextW + tabPadding));

      // Tab Background
      ctx.beginPath();
      if (isActive) {
        ctx.fillStyle = '#ffffff';
        ctx.roundRect(tabX, tabsY + 2, tabW, tabsH, [4, 4, 0, 0]);
      } else {
        const inactiveGrad = ctx.createLinearGradient(tabX, tabsY + 4, tabX, tabsY + tabsH);
        inactiveGrad.addColorStop(0, '#e8e8e8');
        inactiveGrad.addColorStop(1, '#cfcfcf');
        ctx.fillStyle = inactiveGrad;
        ctx.roundRect(tabX, tabsY + 4, tabW, tabsH - 4, [4, 4, 0, 0]);
      }
      ctx.fill();
      ctx.strokeStyle = '#808080';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Tab Icon (Fake)
      ctx.fillStyle = isActive ? '#3369e8' : '#777';
      ctx.beginPath();
      ctx.arc(tabX + 12, tabsY + tabsH / 2 + 1, 4, 0, Math.PI * 2);
      ctx.fill();

      // Tab Title
      ctx.fillStyle = isActive ? '#000' : '#444';
      ctx.save();
      ctx.beginPath();
      ctx.rect(tabX + 22, tabsY, tabW - 40, tabsH);
      ctx.clip();
      ctx.fillText(approxTitle, tabX + 22, tabsY + tabsH / 2 + 1);
      ctx.restore();

      // Close button
      const closeSize = 12;
      const closeX = tabX + tabW - closeSize - 8;
      const closeY = tabsY + (tabsH - closeSize) / 2 + 1;
      if (isActive) {
        ctx.fillStyle = '#ff5c5c';
        ctx.beginPath();
        ctx.roundRect(closeX, closeY, closeSize, closeSize, 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(closeX + 3, closeY + 3); ctx.lineTo(closeX + 9, closeY + 9);
        ctx.moveTo(closeX + 9, closeY + 3); ctx.lineTo(closeX + 3, closeY + 9);
        ctx.stroke();
      }

      tabX += tabW + 2;
    }

    // New-tab "+" button
    const plusSize = 18;
    const plusX = Math.min(contentX + contentW - plusSize - 10, tabX + 4);
    const plusY = tabsY + (tabsH - plusSize) / 2;
    ctx.fillStyle = '#f0f0f0';
    ctx.beginPath();
    ctx.roundRect(plusX, plusY, plusSize, plusSize, 4);
    ctx.fill();
    ctx.strokeStyle = '#808080';
    ctx.stroke();
    ctx.strokeStyle = '#333';
    ctx.beginPath();
    ctx.moveTo(plusX + 4, plusY + plusSize / 2);
    ctx.lineTo(plusX + plusSize - 4, plusY + plusSize / 2);
    ctx.moveTo(plusX + plusSize / 2, plusY + 4);
    ctx.lineTo(plusX + plusSize / 2, plusY + plusSize - 4);
    ctx.stroke();

    y += tabsH + 2;

    // Page area
    const pageX = contentX;
    const pageY = y;
    const pageW = contentW;
    const pageH = contentH - (pageY - contentY) - 18; // leave room for status bar

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(pageX, pageY, pageW, pageH);
    ctx.strokeStyle = '#808080';
    ctx.strokeRect(pageX, pageY, pageW, pageH);

    const centerX = pageX + pageW / 2;
    const logoY = pageY + 40;

    if (activeTab.page === 'results') {
      // Google-style results page (backed by AI results if available)
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';

      // Top bar with small logo and search query
      ctx.fillStyle = '#f1f1f1';
      ctx.fillRect(pageX, pageY, pageW, 40);
      ctx.strokeStyle = '#ddd';
      ctx.strokeRect(pageX, pageY, pageW, 40);

      ctx.font = 'bold 20px "Times New Roman", serif';
      ctx.fillStyle = '#3369e8';
      ctx.fillText('G', pageX + 10, pageY + 10);
      ctx.fillStyle = '#d50f25';
      ctx.fillText('o', pageX + 23, pageY + 10);
      ctx.fillStyle = '#eeb211';
      ctx.fillText('o', pageX + 34, pageY + 10);
      ctx.fillStyle = '#3369e8';
      ctx.fillText('g', pageX + 45, pageY + 10);
      ctx.fillStyle = '#009925';
      ctx.fillText('l', pageX + 58, pageY + 10);
      ctx.fillStyle = '#d50f25';
      ctx.fillText('e', pageX + 67, pageY + 10);

      ctx.font = '13px "Arial", sans-serif';
      ctx.fillStyle = '#000';
      const query = activeTab.query || 'stickman xp desktop';
      ctx.fillText(query, pageX + 90, pageY + 14);

      // Results summary
      let ry = pageY + 52;
      ctx.fillStyle = '#777';
      ctx.fillText('Search results for ' + query, pageX + 16, ry);
      ry += 24;

      // Prefer AI-generated results; fall back to a few fixed links
      const fallbackResults = [
        {
          title: 'Animation vs. Cursor - Windows XP Desktop Sandbox',
          url: 'https://example.com/animation-vs-cursor',
          snippet:
            'Play with stickmen, portals, Paint, Minesweeper and more on a living Windows XP desktop.',
        },
        {
          title: 'How to escape your mouse cursor (for stick figures)',
          url: 'https://example.com/stickman-guide',
          snippet:
            'Step-by-step tips for surviving curious cursors, open windows, and unexpected portal physics.',
        },
        {
          title: 'Bliss wallpaper appreciation thread',
          url: 'https://example.com/bliss-hill',
          snippet:
            'A deep dive into the iconic green hill that every XP-era stickman called home.',
        },
      ];

      const aiResults =
        Array.isArray(activeTab.aiResults) && activeTab.aiResults.length
          ? activeTab.aiResults
          : fallbackResults;

      aiResults.forEach((r) => {
        // Result Box for hover feedback later
        ctx.fillStyle = '#110099';
        ctx.font = 'bold 15px "Arial", sans-serif';
        ctx.fillText(r.title, pageX + 16, ry);
        
        ry += 19;
        ctx.fillStyle = '#008000';
        ctx.font = '12px "Arial", sans-serif';
        ctx.fillText(r.url, pageX + 16, ry);
        
        ry += 17;
        ctx.fillStyle = '#222';
        ctx.font = '13px "Arial", sans-serif';
        // Basic multi-line snippet wrapping
        const words = (r.snippet || '').split(' ');
        let line = '';
        for(let n=0; n<words.length; n++) {
          const testLine = line + words[n] + ' ';
          if(ctx.measureText(testLine).width > pageW - 40) {
            ctx.fillText(line, pageX + 16, ry);
            line = words[n] + ' ';
            ry += 15;
          } else {
            line = testLine;
          }
        }
        ctx.fillText(line, pageX + 16, ry);
        ry += 32;
      });

      if (activeTab.loadingSearch) {
        ctx.fillStyle = '#777';
        ctx.font = '10px "Arial", sans-serif';
        ctx.fillText('Searching...', pageX + 16, pageY + pageH - 32);
      } else {
        ctx.fillStyle = '#777';
        ctx.font = '10px "Arial", sans-serif';
        ctx.fillText('Search completed for ' + query, pageX + 16, pageY + pageH - 32);
      }
    } else {
      // Old (2007) Google homepage inside the page area
      const centerXHome = centerX;
      const logoYHome = logoY;

      ctx.font = 'bold 36px "Times New Roman", serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      const letters = [
        { ch: 'G', color: '#3369e8' },
        { ch: 'o', color: '#d50f25' },
        { ch: 'o', color: '#eeb211' },
        { ch: 'g', color: '#3369e8' },
        { ch: 'l', color: '#009925' },
        { ch: 'e', color: '#d50f25' },
      ];
      let offsetX = 0;
      letters.forEach((letter) => {
        ctx.fillStyle = letter.color;
        const text = letter.ch;
        const metrics = ctx.measureText(text);
        const halfWidth = metrics.width / 2;
        const x =
          centerXHome - ctx.measureText('Google').width / 2 + offsetX + halfWidth;
        ctx.fillText(text, x, logoYHome);
        offsetX += metrics.width;
      });

      // Search box
      const searchBoxW = Math.min(380, pageW - 80);
      const searchBoxH = 24;
      const searchBoxX = centerXHome - searchBoxW / 2;
      const searchBoxY = logoYHome + 30;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(searchBoxX, searchBoxY, searchBoxW, searchBoxH);
      ctx.strokeStyle = '#c0c0c0';
      ctx.strokeRect(searchBoxX, searchBoxY, searchBoxW, searchBoxH);

      ctx.fillStyle = '#808080';
      ctx.font = '12px "Arial", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const placeholder =
        activeTab.query && activeTab.query.length
          ? activeTab.query
          : 'Search the web';
      ctx.fillText(placeholder, searchBoxX + 6, searchBoxY + searchBoxH / 2);

      // Buttons "Google Search" and "I'm Feeling Lucky"
      const btnH = 22;
      const btnGap = 8;
      const btnLabelFont = '11px "Arial", sans-serif';
      const labels = ['Google Search', "I\'m Feeling Lucky"];
      ctx.font = btnLabelFont;
      const btnWidths = labels.map((lab) => ctx.measureText(lab).width + 24);
      const totalBtnsWidth = btnWidths[0] + btnWidths[1] + btnGap;
      let btnX = centerXHome - totalBtnsWidth / 2;
      const btnY = searchBoxY + searchBoxH + 12;

      labels.forEach((lab, i) => {
        const w = btnWidths[i];
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(btnX, btnY, w, btnH);
        ctx.strokeStyle = '#c0c0c0';
        ctx.strokeRect(btnX, btnY, w, btnH);
        ctx.fillStyle = '#000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(lab, btnX + w / 2, btnY + btnH / 2 + 1);
        btnX += w + btnGap;
      });

      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#0000cc';
      ctx.font = '11px "Arial", sans-serif';
      ctx.fillText(
        'Advanced Search  Preferences  Language Tools',
        centerXHome,
        btnY + btnH + 18
      );

      ctx.fillStyle = '#777';
      ctx.font = '10px "Arial", sans-serif';
      ctx.fillText(
        '© 2007 Google - Cached by the Wayback Machine',
        centerXHome,
        pageY + pageH - 28
      );
    }

    // Simple vertical scrollbar on the right
    const scrollBarW = 14;
    const scrollX = pageX + pageW - scrollBarW;
    const scrollY = pageY;
    const scrollH = pageH;

    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(scrollX, scrollY, scrollBarW, scrollH);
    ctx.strokeStyle = '#c0c0c0';
    ctx.strokeRect(scrollX, scrollY, scrollBarW, scrollH);

    const thumbH = Math.max(32, scrollH * 0.25);
    const thumbY = scrollY + 20;
    ctx.fillStyle = '#d4d0c8';
    ctx.fillRect(scrollX + 2, thumbY, scrollBarW - 4, thumbH);
    ctx.strokeStyle = '#a0a0a0';
    ctx.strokeRect(scrollX + 2, thumbY, scrollBarW - 4, thumbH);

    // Status bar at bottom
    const statusY = contentY + contentH - 16;
    const statusH = 16;
    ctx.fillStyle = '#d4d0c8';
    ctx.fillRect(contentX, statusY, contentW, statusH);
    ctx.strokeStyle = '#b0b0b0';
    ctx.strokeRect(contentX, statusY, contentW, statusH);

    ctx.fillStyle = '#000';
    ctx.font = '14px "WinXPTahoma", system-ui';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('Done', contentX + 6, statusY + statusH / 2);
    ctx.textAlign = 'right';
    ctx.fillText('Internet | Protected Mode: Off', contentX + contentW - 6, statusY + statusH / 2);

  } else if (win.appId === 'recycle') {
    // Recycle Bin contents
    let y = contentY;

    // Top info bar
    ctx.fillStyle = '#ece9d8';
    ctx.fillRect(contentX, y, contentW, 22);
    ctx.strokeStyle = '#d4d0c8';
    ctx.strokeRect(contentX, y, contentW, 22);
    ctx.fillStyle = '#000';
    ctx.font = '11px "WinXPTahoma", system-ui';
    ctx.fillText('Recycle Bin', contentX + 6, y + 4);

    // "Empty Recycle Bin" button (visual only)
    const btnW = 120;
    const btnH = 18;
    const btnX = contentX + contentW - btnW - 6;
    const btnY = y + 2;
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(btnX, btnY, btnW, btnH);
    ctx.strokeStyle = '#808080';
    ctx.strokeRect(btnX, btnY, btnW, btnH);
    ctx.fillStyle = '#000';
    ctx.font = '10px "WinXPTahoma", system-ui';
    ctx.fillText('Empty Recycle Bin', btnX + 8, btnY + 3);
    y += 26;

    const listX = contentX;
    const listW = contentW;
    let listY = y;

    listY = drawListHeader(
      listX,
      listY,
      [
        { label: 'Name', width: listW * 0.5 },
        { label: 'Original Location', width: listW * 0.35 },
        { label: 'Date Deleted', width: listW * 0.15 },
      ],
      listW
    );

    const rowH = 18;
    const rows = [
      ['old_cursor.cur', 'C:\\Windows\\Cursors', 'Today'],
      ['trash.png', 'C:\\Desktop', 'Yesterday'],
      ['readme.txt', 'C:\\Documents', 'Last week'],
    ];
    rows.forEach((row, i) => {
      const ry = listY + i * rowH;
      ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#f5f5f5';
      ctx.fillRect(listX, ry, listW, rowH);
      ctx.fillStyle = '#000';
      let colX = listX + 6;
      ctx.fillText(row[0], colX, ry + 2);
      colX += listW * 0.5;
      ctx.fillText(row[1], colX, ry + 2);
      colX += listW * 0.35;
      ctx.fillText(row[2], colX, ry + 2);
    });

  } else if (win.appId === 'notes') {
    // Simple XP Notepad-ish notes
    // Menu bar
    ctx.fillStyle = '#ece9d8';
    ctx.fillRect(contentX, contentY, contentW, 18);
    ctx.strokeStyle = '#d4d0c8';
    ctx.strokeRect(contentX, contentY, contentW, 18);
    ctx.fillStyle = '#000';
    ctx.font = '11px "WinXPTahoma", system-ui';
    const menus = ['File', 'Edit', 'Format', 'View', 'Help'];
    let mx = contentX + 6;
    menus.forEach((m) => {
      ctx.fillText(m, mx, contentY + 3);
      mx += ctx.measureText(m).width + 18;
    });

    // Text area
    const textX = contentX;
    const textY = contentY + 20;
    const textW = contentW;
    const textH = contentH - 22;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(textX, textY, textW, textH);
    ctx.strokeStyle = '#808080';
    ctx.strokeRect(textX, textY, textW, textH);

    ctx.fillStyle = '#000';
    ctx.font = '14px "Courier New", monospace';
    const lines = [
      'TODO:',
      '  - Escape the cursor',
      '  - Weaponize the icons',
      '  - Jump into Paint and leave evidence',
    ];
    lines.forEach((line, i) => {
      ctx.fillText(line, textX + 6, textY + 4 + i * 16);
    });

  } else if (win.appId === 'console') {
    // XP-style interactive Command Prompt window
    // Ensure state exists for older saves
    if (!Array.isArray(win.consoleLines)) {
      win.consoleLines = [
        'Microsoft Windows XP [Version 5.1.2600]',
        '(C) Copyright 1985-2001 Microsoft Corp.',
        '',
      ];
    }
    if (typeof win.consoleInput !== 'string') win.consoleInput = '';
    if (!Array.isArray(win.consoleHistory)) win.consoleHistory = [];
    if (typeof win.consoleHistoryIndex !== 'number') {
      win.consoleHistoryIndex = win.consoleHistory.length;
    }

    const prompt = 'C:\\WINDOWS\\system32>';
    const lineHeight = 14;
    const padX = 6;
    const padY = 4;

    // Background
    ctx.fillStyle = '#000000';
    ctx.fillRect(contentX, contentY, contentW, contentH);

    // Subtle focus ring when this console is active to indicate input focus
    if (active) {
      ctx.strokeStyle = 'rgba(102,170,255,0.8)';
      ctx.lineWidth = 2;
      ctx.strokeRect(contentX + 1, contentY + 1, contentW - 2, contentH - 2);
      ctx.lineWidth = 1;
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(contentX, contentY, contentW, contentH);
    ctx.clip();

    // Text
    ctx.fillStyle = '#00ff00';
    ctx.font = '13px "Lucida Console", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const totalLines = win.consoleLines.length + 1;
    const totalHeight = totalLines * lineHeight;
    win.consoleMaxScroll = Math.max(0, totalHeight - contentH + 10);

    if (win.consoleNeedsScrollToBottom) {
      win.consoleScrollY = win.consoleMaxScroll;
      win.consoleNeedsScrollToBottom = false;
    }

    const scrollY = win.consoleScrollY || 0;
    let drawY = contentY + padY - scrollY;

    // Draw all lines, clipped by window bounds
    for (let i = 0; i < win.consoleLines.length; i++) {
      const line = win.consoleLines[i];
      if (drawY + lineHeight > contentY && drawY < contentY + contentH) {
        ctx.fillText(line, contentX + padX, drawY);
      }
      drawY += lineHeight;
    }

    // Draw current input line with blinking caret
    const inputY = drawY;
    if (inputY + lineHeight > contentY && inputY < contentY + contentH) {
      const inputText = `${prompt} ${win.consoleInput || ''}`;
      ctx.fillText(inputText, contentX + padX, inputY);

      // Blinking caret at end of input
      const nowMs = performance.now();
      const blinkOn = Math.floor(nowMs / 500) % 2 === 0;
      if (blinkOn) {
        const caretX = contentX + padX + ctx.measureText(inputText).width + 1;
        const caretH = lineHeight - 2;
        ctx.fillRect(caretX, inputY + 1, 8, caretH);
      }
    }

    ctx.restore();

    // Console Scrollbar
    if (win.consoleMaxScroll > 0) {
      const barW = 8;
      const barX = contentX + contentW - barW - 2;
      const barY = contentY + 2;
      const barH = contentH - 4;
      ctx.fillStyle = '#333';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.strokeStyle = '#555';
      ctx.strokeRect(barX, barY, barW, barH);

      const ratio = contentH / (totalHeight + 0.01);
      const thumbH = Math.max(18, barH * ratio);
      const maxThumbTravel = barH - thumbH;
      const t = scrollY / (win.consoleMaxScroll || 1);
      const thumbY = barY + maxThumbTravel * t;

      ctx.fillStyle = '#888';
      ctx.fillRect(barX + 1, thumbY, barW - 2, thumbH);
    }

  } else if (win.appId === 'calculator') {
    // Classic Windows XP calculator look
    const pad = 12;

    // Background panel
    ctx.fillStyle = '#d4d0c8';
    ctx.fillRect(contentX + 2, contentY + 2, contentW - 4, contentH - 4);
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(contentX + 2.5, contentY + contentH - 2.5);
    ctx.lineTo(contentX + 2.5, contentY + 2.5);
    ctx.lineTo(contentX + contentW - 2.5, contentY + 2.5);
    ctx.stroke();
    ctx.strokeStyle = '#808080';
    ctx.beginPath();
    ctx.moveTo(contentX + contentW - 2.5, contentY + 2.5);
    ctx.lineTo(contentX + contentW - 2.5, contentY + contentH - 2.5);
    ctx.lineTo(contentX + 2.5, contentY + contentH - 2.5);
    ctx.stroke();

    // Display
    const displayH = 32;
    const displayX = contentX + pad;
    const displayY = contentY + pad;
    const displayW = contentW - pad * 2;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(displayX, displayY, displayW, displayH);
    // Sunken 3D frame
    ctx.strokeStyle = '#808080';
    ctx.beginPath();
    ctx.moveTo(displayX + 0.5, displayY + displayH - 0.5);
    ctx.lineTo(displayX + 0.5, displayY + 0.5);
    ctx.lineTo(displayX + displayW - 0.5, displayY + 0.5);
    ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(displayX + displayW - 0.5, displayY + 0.5);
    ctx.lineTo(displayX + displayW - 0.5, displayY + displayH - 0.5);
    ctx.lineTo(displayX + 0.5, displayY + displayH - 0.5);
    ctx.stroke();

    ctx.fillStyle = '#000';
    ctx.font = 'bold 22px "WinXPTahoma", sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(win.calcValue || '0', displayX + displayW - 6, displayY + displayH / 2 + 1);
    ctx.textAlign = 'left';

    // Keypad
    const btnW = 34, btnH = 24, gap = 4;
    const buttons = [
      ['7','8','9','/'],
      ['4','5','6','*'],
      ['1','2','3','-'],
      ['0','C','=','+']
    ];
    const startX = contentX + pad;
    const startY = displayY + displayH + 10;

    buttons.forEach((row, r) => {
      row.forEach((btn, c) => {
        // Make "=" and "+" a bit taller like classic calc
        const isEquals = btn === '=';
        const isPlus = btn === '+';
        const extraH = (isEquals || isPlus) ? 8 : 0;

        const bx = startX + c * (btnW + gap);
        const by = startY + r * (btnH + gap);
        const h = btnH + extraH;

        // Raised 3D button
        ctx.fillStyle = '#e3e3e3';
        ctx.fillRect(bx, by, btnW, h);

        ctx.strokeStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(bx + 0.5, by + h - 0.5);
        ctx.lineTo(bx + 0.5, by + 0.5);
        ctx.lineTo(bx + btnW - 0.5, by + 0.5);
        ctx.stroke();
        ctx.strokeStyle = '#808080';
        ctx.beginPath();
        ctx.moveTo(bx + btnW - 0.5, by + 0.5);
        ctx.lineTo(bx + btnW - 0.5, by + h - 0.5);
        ctx.lineTo(bx + 0.5, by + h - 0.5);
        ctx.stroke();

        ctx.fillStyle = btn === 'C' ? '#800000' : '#000';
        ctx.font = 'bold 14px "WinXPTahoma", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(btn, bx + btnW / 2, by + h / 2 + 1);
        ctx.textAlign = 'left';
      });
    });

  } else if (win.appId === 'minesweeper') {
    // Improved XP-style Minesweeper UI
    const cell = 20;
    const cols = GRID_SIZE;
    const rows = GRID_SIZE;

    // Top control bar
    const headerH = 34;
    const boardPad = 10;

    // Outer panel
    ctx.fillStyle = '#d4d0c8';
    ctx.fillRect(contentX, contentY, contentW, contentH);
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(contentX + 0.5, contentY + contentH - 0.5);
    ctx.lineTo(contentX + 0.5, contentY + 0.5);
    ctx.lineTo(contentX + contentW - 0.5, contentY + 0.5);
    ctx.stroke();
    ctx.strokeStyle = '#808080';
    ctx.beginPath();
    ctx.moveTo(contentX + contentW - 0.5, contentY + 0.5);
    ctx.lineTo(contentX + contentW - 0.5, contentY + contentH - 0.5);
    ctx.lineTo(contentX + 0.5, contentY + contentH - 0.5);
    ctx.stroke();

    // Header area
    const headerX = contentX + boardPad;
    const headerY = contentY + boardPad;
    const headerW = contentW - boardPad * 2;

    ctx.fillStyle = '#c0c0c0';
    ctx.fillRect(headerX, headerY, headerW, headerH);
    ctx.strokeStyle = '#ffffff';
    ctx.strokeRect(headerX, headerY, headerW, headerH);

    // Mine counter (fake)
    ctx.fillStyle = '#000000';
    ctx.fillRect(headerX + 8, headerY + 8, 40, 18);
    ctx.fillStyle = '#ff0000';
    ctx.font = 'bold 16px "Digital-7", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(MINE_COUNT).padStart(3, '0'), headerX + 8 + 20, headerY + 8 + 9);

    // Smiley reset button
    const faceSize = 22;
    const faceX = headerX + headerW / 2;
    const faceY = headerY + headerH / 2;
    ctx.beginPath();
    ctx.fillStyle = '#fdf68f';
    ctx.arc(faceX, faceY, faceSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#808000';
    ctx.stroke();

    // Face expression
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(faceX - 4, faceY - 3, 1.3, 0, Math.PI * 2);
    ctx.arc(faceX + 4, faceY - 3, 1.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    if (win.gameOver) {
      ctx.moveTo(faceX - 4, faceY + 3);
      ctx.lineTo(faceX + 4, faceY + 3);
    } else {
      ctx.arc(faceX, faceY + 2, 4, 0, Math.PI, false);
    }
    ctx.stroke();

    // Timer (fake)
    const timerX = headerX + headerW - 8 - 40;
    const timerY = headerY + 8;
    ctx.fillStyle = '#000000';
    ctx.fillRect(timerX, timerY, 40, 18);
    ctx.fillStyle = '#ff0000';
    ctx.font = 'bold 13px "Digital-7", monospace';
    ctx.fillText('000', timerX + 20, timerY + 9);

    // Board background
    const boardX = headerX;
    const boardY = headerY + headerH + 8;
    const boardW = cols * cell;
    const boardH = rows * cell;

    ctx.fillStyle = '#bdbdbd';
    ctx.fillRect(boardX, boardY, boardW, boardH);
    ctx.strokeStyle = '#ffffff';
    ctx.strokeRect(boardX, boardY, boardW, boardH);

    // Draw cells
    ctx.font = 'bold 12px "Tahoma", system-ui';
    const numColors = ['#0000ff', '#008000', '#ff0000', '#000080', '#800000', '#008080', '#000000', '#808080'];

    win.mineGrid.forEach((row, r) => {
      row.forEach((col, c) => {
        const bx = boardX + c * cell;
        const by = boardY + r * cell;

        const isHover =
          win.mineHover &&
          win.mineHover.r === r &&
          win.mineHover.c === c &&
          !win.gameOver;

        if (col.revealed) {
          ctx.fillStyle = '#e0e0e0';
          ctx.fillRect(bx, by, cell, cell);
          ctx.strokeStyle = '#808080';
          ctx.strokeRect(bx, by, cell, cell);

          if (col.mine) {
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.arc(bx + cell / 2, by + cell / 2, cell * 0.3, 0, Math.PI * 2);
            ctx.fill();
          } else if (col.count > 0) {
            ctx.fillStyle = numColors[col.count - 1] || '#000000';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(col.count, bx + cell / 2, by + cell / 2 + 1);
          }
        } else {
          // Raised tile look, with a subtle hover highlight so the user knows what they'll click.
          ctx.fillStyle = isHover ? '#d0e7ff' : '#c0c0c0';
          ctx.fillRect(bx, by, cell, cell);

          ctx.strokeStyle = '#ffffff';
          ctx.beginPath();
          ctx.moveTo(bx, by + cell);
          ctx.lineTo(bx, by);
          ctx.lineTo(bx + cell, by);
          ctx.stroke();

          ctx.strokeStyle = isHover ? '#3b6db3' : '#808080';
          ctx.beginPath();
          ctx.moveTo(bx + cell, by);
          ctx.lineTo(bx + cell, by + cell);
          ctx.lineTo(bx, by + cell);
          ctx.stroke();
        }
      });
    });

    if (win.gameOver) {
      ctx.fillStyle = 'rgba(255,0,0,0.25)';
      ctx.fillRect(boardX, boardY, boardW, boardH);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 18px "Tahoma", system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('GAME OVER', boardX + boardW / 2, boardY + boardH / 2);
    }
  } else if (win.appId === 'notavirus') {
    // Fake "NotAVirus56.exe" confirmation dialog
    // Header/info bar
    ctx.fillStyle = '#ece9d8';
    ctx.fillRect(contentX, contentY, contentW, 24);
    ctx.strokeStyle = '#d4d0c8';
    ctx.strokeRect(contentX, contentY, contentW, 24);
    ctx.fillStyle = '#000';
    ctx.font = '14px "WinXPTahoma", system-ui';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('Open File - Security Warning', contentX + 8, contentY + 12);

    // Body
    const bodyX = contentX + 12;
    const bodyY = contentY + 36;
    const bodyW = contentW - 24;
    const bodyH = contentH - 60;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(bodyX, bodyY, bodyW, bodyH);
    ctx.strokeStyle = '#c0c0c0';
    ctx.strokeRect(bodyX, bodyY, bodyW, bodyH);

    // Warning icon (yellow triangle)
    const iconX = bodyX + 18;
    const iconY = bodyY + 24;
    ctx.fillStyle = '#fff8c4';
    ctx.strokeStyle = '#c09000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(iconX, iconY - 14);
    ctx.lineTo(iconX - 14, iconY + 12);
    ctx.lineTo(iconX + 14, iconY + 12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 13px "WinXPTahoma", system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('!', iconX, iconY + 2);

    // Message text
    ctx.fillStyle = '#000000';
    ctx.font = '15px "WinXPTahoma", system-ui';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const msgLines = [
      'Are you sure you want to run this application?',
      '',
      'Name:  NotAVirus56.exe',
      'Publisher:  Unknown',
      'Type:  Application',
      'From:  C:\\Desktop',
    ];
    let ty = bodyY + 8;
    msgLines.forEach((line) => {
      ctx.fillText(line, bodyX + 40, ty);
      ty += 20;
    });

    // Buttons
    const buttonsY = contentY + contentH - 50;
    const btnW = 80;
    const btnH = 24;
    const yesX = contentX + contentW / 2 - btnW - 8;
    const noX = contentX + contentW / 2 + 8;

    ctx.fillStyle = '#e3e3e3';
    ctx.strokeStyle = '#808080';
    ctx.beginPath();
    ctx.roundRect(yesX, buttonsY, btnW, btnH, 3);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.roundRect(noX, buttonsY, btnW, btnH, 3);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#000000';
    ctx.font = '14px "WinXPTahoma", system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Yes', yesX + btnW / 2, buttonsY + btnH / 2 + 1);
    ctx.fillText('No', noX + btnW / 2, buttonsY + btnH / 2 + 1);

    ctx.textAlign = 'left';
  } else if (win.appId === 'clippy') {
    // Clippy AI helper window
    const headerH = 28;

    // Top header with Clippy label
    ctx.fillStyle = '#f4f4ff';
    ctx.fillRect(contentX, contentY, contentW, headerH);
    ctx.strokeStyle = '#d0d0ff';
    ctx.strokeRect(contentX, contentY, contentW, headerH);

    ctx.fillStyle = '#1f4e79';
    ctx.font = 'bold 12px "WinXPTahoma", system-ui';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('Clippy – Desktop Helper', contentX + 32, contentY + headerH / 2);

    // Small Clippy head icon in header
    if (clippyImg && clippyImg.complete && clippyImg.naturalWidth > 0) {
      const iconSize = 20;
      ctx.drawImage(
        clippyImg,
        contentX + 6,
        contentY + (headerH - iconSize) / 2,
        iconSize,
        iconSize
      );
    }

    // Body area
    const bodyX = contentX;
    const bodyY = contentY + headerH;
    const bodyW = contentW;
    const bodyH = contentH - headerH;

    // Left Clippy illustration column
    const leftW = 80;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(bodyX, bodyY, leftW, bodyH);
    ctx.strokeStyle = '#e0e0e0';
    ctx.strokeRect(bodyX, bodyY, leftW, bodyH);

    if (clippyImg && clippyImg.complete && clippyImg.naturalWidth > 0) {
      const iw = 54;
      const ih = 80;
      const ix = bodyX + (leftW - iw) / 2;
      const iy = bodyY + 12;
      ctx.drawImage(clippyImg, ix, iy, iw, ih);
    }

    ctx.fillStyle = '#444';
    ctx.font = '10px "WinXPTahoma", system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('Need help?', bodyX + leftW / 2, bodyY + bodyH - 26);

    // Right chat column
    const historyX = bodyX + leftW + 6;
    const historyY = bodyY + 4;
    const historyW = bodyW - leftW - 8;
    const historyH = bodyH - 46;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(historyX, historyY, historyW, historyH);
    ctx.strokeStyle = '#b0b8d4';
    ctx.strokeRect(historyX, historyY, historyW, historyH);

    ctx.save();
    ctx.beginPath();
    ctx.rect(historyX + 2, historyY + 2, historyW - 4, historyH - 4);
    ctx.clip();

    const messages = Array.isArray(win.clippyMessages)
      ? win.clippyMessages
      : [];

    const lineHeight = 20;
    let ty = historyY + 8;

    ctx.font = '18px "WinXPTahoma", system-ui';
    messages.forEach((msg) => {
      const isClippy = msg.from === 'Clippy';
      ctx.fillStyle = isClippy ? '#003399' : '#222222';
      ctx.textAlign = 'left';
      const prefix = `${msg.from}: `;
      ctx.fillText(prefix + msg.text, historyX + 6, ty);
      ty += lineHeight + 2;
    });

    ctx.restore();

    // Input area
    const inputY = historyY + historyH + 4;
    const inputH = 32;
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(historyX, inputY, historyW, inputH);
    ctx.strokeStyle = '#b0b8d4';
    ctx.strokeRect(historyX, inputY, historyW, inputH);

    const boxX = historyX + 6;
    const boxY = inputY + 4;
    const boxW = historyW - 6 - 70;
    const boxH = inputH - 8;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeStyle = '#808080';
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    // Increase font size here specifically for Clippy's input so text is readable.
    ctx.fillStyle = '#000';
    ctx.font = '22px "WinXPTahoma", system-ui';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const draft = win.clippyDraft || '';
    ctx.fillStyle = '#000';
    ctx.fillText(draft, boxX + 6, boxY + 6);

    // Proper blinking text cursor when window is active
    if (active) {
      const nowMs = performance.now();
      if (Math.floor(nowMs / 500) % 2 === 0) {
        const textW = ctx.measureText(draft).width;
        ctx.fillRect(boxX + 6 + textW + 2, boxY + 6, 2, 18);
      }
    }

    if (!draft) {
      ctx.fillStyle = '#808080';
      ctx.font = '20px "WinXPTahoma", system-ui';
      ctx.fillText('Ask Clippy about tools, stickmen, or apps…', boxX + 6, boxY + 6);
    }

    // Send button
    const sendW = 64;
    const sendH = 22;
    const sendX = historyX + historyW - sendW - 6;
    const sendY = inputY + (inputH - sendH) / 2;

    ctx.fillStyle = '#e3e3e3';
    ctx.fillRect(sendX, sendY, sendW, sendH);
    ctx.strokeStyle = '#808080';
    ctx.strokeRect(sendX, sendY, sendW, sendH);
    ctx.fillStyle = '#000';
    ctx.font = '11px "WinXPTahoma", system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Ask', sendX + sendW / 2, sendY + sendH / 2 + 1);

    ctx.textAlign = 'left';
  } else if (win.appId === 'antivirus') {
    // Polished XP AntiVirus UI
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(contentX, contentY, contentW, contentH);
    ctx.strokeStyle = '#999';
    ctx.strokeRect(contentX, contentY, contentW, contentH);

    // Sidebar with better styling
    const sideW = 90;
    const sideGrad = ctx.createLinearGradient(contentX, contentY, contentX + sideW, contentY);
    sideGrad.addColorStop(0, '#2e5b9e');
    sideGrad.addColorStop(1, '#4a7ecb');
    ctx.fillStyle = sideGrad;
    ctx.fillRect(contentX, contentY, sideW, contentH);
    
    // Antivirus Icon in sidebar
    const avIcon = desktop.icons.find(i => i.appId === 'antivirus');
    if (avIcon && avIcon.img && avIcon.img.complete) {
      ctx.drawImage(avIcon.img, contentX + sideW/2 - 16, contentY + 15, 32, 32);
    }
    
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px Tahoma';
    ctx.textAlign = 'center';
    ctx.fillText('XP Defender', contentX + sideW / 2, contentY + 62);
    ctx.font = '11px "WinXPTahoma"';
    ctx.globalAlpha = 0.7;
    ctx.fillText('Version 2025', contentX + sideW / 2, contentY + 76);
    ctx.globalAlpha = 1.0;

    const mainX = contentX + sideW + 15;
    const mainW = contentW - sideW - 30;
    ctx.textAlign = 'left';

    if (desktop.antivirusState === 'prompt') {
      ctx.fillStyle = '#003366';
      ctx.font = 'bold 16px "WinXPTahoma"';
      ctx.fillText('System Status: AT RISK', mainX, contentY + 25);
      
      ctx.fillStyle = '#cc0000';
      ctx.font = 'bold 13px "WinXPTahoma"';
      ctx.fillText('● Unidentified entities detected!', mainX, contentY + 50);
      
      ctx.fillStyle = '#333';
      ctx.font = '13px "WinXPTahoma"';
      ctx.fillText('Your computer may be infected with "Stickmen".', mainX, contentY + 70);
      ctx.fillText('This can lead to desktop instability and cursor loss.', mainX, contentY + 88);

      // Card-like scan button
      const btnW = 140, btnH = 36;
      const btnX = mainX;
      const btnY = contentY + 115;
      
      const btnGrad = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH);
      btnGrad.addColorStop(0, '#fafafa');
      btnGrad.addColorStop(1, '#e1e1e1');
      ctx.fillStyle = btnGrad;
      ctx.beginPath();
      ctx.roundRect(btnX, btnY, btnW, btnH, 4);
      ctx.fill();
      ctx.strokeStyle = '#888';
      ctx.stroke();
      
      ctx.fillStyle = '#000';
      ctx.font = 'bold 14px "WinXPTahoma"';
      ctx.textAlign = 'center';
      ctx.fillText('Full System Scan', btnX + btnW / 2, btnY + 22);
      ctx.textAlign = 'left';

    } else if (desktop.antivirusState === 'scanning') {
      ctx.fillStyle = '#003366';
      ctx.font = 'bold 16px "WinXPTahoma"';
      ctx.fillText('Scanning...', mainX, contentY + 25);
      
      const pbW = mainW, pbH = 20;
      const pbX = mainX, pbY = contentY + 65;
      ctx.fillStyle = '#fff';
      ctx.fillRect(pbX, pbY, pbW, pbH);
      ctx.strokeStyle = '#888';
      ctx.strokeRect(pbX, pbY, pbW, pbH);
      
      const prog = desktop.antivirusProgress;
      const fillW = (pbW - 4) * prog;
      const pGrad = ctx.createLinearGradient(pbX, pbY, pbX, pbY + pbH);
      pGrad.addColorStop(0, '#93cf4f');
      pGrad.addColorStop(1, '#5ca41c');
      ctx.fillStyle = pGrad;
      ctx.fillRect(pbX + 2, pbY + 2, fillW, pbH - 4);
      
      ctx.fillStyle = '#000';
      ctx.font = '12px Tahoma';
      ctx.fillText(`Progress: ${Math.round(prog * 100)}%`, pbX, pbY + 36);
      
      // Fake file paths scanning
      const files = ['C:\\WINDOWS\\system32\\stick_driver.dll', 'C:\\Documents\\Desktop\\doodle.bmp', 'C:\\WINDOWS\\fonts\\tahoma.ttf', 'C:\\WINDOWS\\temp\\virus_01.exe'];
      const fileIndex = Math.floor(performance.now() / 200) % files.length;
      ctx.fillStyle = '#666';
      ctx.font = 'italic 12px "WinXPTahoma"';
      ctx.fillText(`Scanning: ${files[fileIndex]}`, pbX, pbY + 54);

    } else if (desktop.antivirusState === 'cleaning') {
      ctx.fillStyle = '#cc0000';
      ctx.font = 'bold 16px "WinXPTahoma"';
      ctx.fillText('THREATS FOUND!', mainX, contentY + 25);
      
      ctx.fillStyle = '#333';
      ctx.font = '13px "WinXPTahoma"';
      ctx.fillText(`Found: ${desktop.antivirusFoundCount} malware signature(s).`, mainX, contentY + 50);
      ctx.fillStyle = '#cc0000';
      ctx.font = 'bold 13px "WinXPTahoma"';
      ctx.fillText('Action: Running VirusHunter.exe...', mainX, contentY + 70);
      
      // Spinner-like effect
      ctx.save();
      ctx.translate(mainX + 150, contentY + 110);
      ctx.rotate(performance.now() * 0.01);
      ctx.strokeStyle = '#cc0000';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 1.5);
      ctx.stroke();
      ctx.restore();

    } else if (desktop.antivirusState === 'finished') {
      ctx.fillStyle = '#2e7d32';
      ctx.font = 'bold 16px "WinXPTahoma"';
      ctx.fillText('SYSTEM SECURED', mainX, contentY + 25);
      
      // Big Checkmark
      ctx.strokeStyle = '#2e7d32';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(mainX, contentY + 65);
      ctx.lineTo(mainX + 12, contentY + 77);
      ctx.lineTo(mainX + 34, contentY + 52);
      ctx.stroke();
      
      ctx.fillStyle = '#333';
      ctx.font = '13px "WinXPTahoma"';
      ctx.fillText('All identified threats were successfully deleted.', mainX + 44, contentY + 64);
      ctx.fillText('Your computer is now protected by XP Defender.', mainX + 44, contentY + 82);
    }

  } else if (win.appId === 'stats') {
    // Stickmen Stats App
    const target = desktop.selectedStickForCustomization;
    
    ctx.fillStyle = '#fdfdfd';
    ctx.fillRect(contentX, contentY, contentW, contentH);
    ctx.strokeStyle = '#999';
    ctx.strokeRect(contentX, contentY, contentW, contentH);

    const headerH = 28;
    ctx.fillStyle = '#ece9d8';
    ctx.fillRect(contentX, contentY, contentW, headerH);
    ctx.strokeStyle = '#808080';
    ctx.beginPath();
    ctx.moveTo(contentX, contentY + headerH);
    ctx.lineTo(contentX + contentW, contentY + headerH);
    ctx.stroke();

    ctx.fillStyle = '#000';
    ctx.font = 'bold 16px "WinXPTahoma"';
    ctx.fillText('Stickman Life Monitor', contentX + 8, contentY + 6);

    if (!target) {
      ctx.fillStyle = '#666';
      ctx.font = '14px "WinXPTahoma"';
      ctx.textAlign = 'center';
      const text = 'No stickman selected.';
      const subtext = 'Double-click a stickman on the';
      const subtext2 = 'desktop to view their live data.';
      ctx.fillText(text, contentX + contentW / 2, contentY + 80);
      ctx.fillText(subtext, contentX + contentW / 2, contentY + 102);
      ctx.fillText(subtext2, contentX + contentW / 2, contentY + 122);
      ctx.textAlign = 'left';
    } else {
      let curY = contentY + headerH + 12;
      const drawStat = (label, value, color = '#000') => {
        ctx.fillStyle = '#555';
        ctx.font = 'bold 14px "WinXPTahoma"';
        ctx.fillText(label + ':', contentX + 12, curY);
        ctx.fillStyle = color;
        ctx.font = '14px "WinXPTahoma"';
        ctx.fillText(String(value), contentX + 100, curY);
        curY += 22;
      };

      drawStat('Name', target.name || 'Unnamed');
      
      const moodColors = { happy: '#2e7d32', sad: '#1976d2', angry: '#c62828', scared: '#ff9800', dizzy: '#9c27b0' };
      drawStat('Mood', target.mood || 'neutral', moodColors[target.mood] || '#000');
      
      // Health Bar in Stats
      ctx.fillStyle = '#555';
      ctx.font = 'bold 14px "WinXPTahoma"';
      ctx.fillText('Health:', contentX + 12, curY);
      const hpW = contentW - 115;
      const hpH = 12;
      const hpx = contentX + 100, hpy = curY + 1;
      ctx.fillStyle = '#eee';
      ctx.fillRect(hpx, hpy, hpW, hpH);
      ctx.strokeStyle = '#999';
      ctx.strokeRect(hpx, hpy, hpW, hpH);
      const ratio = Math.max(0, target.health / target.maxHealth);
      ctx.fillStyle = ratio > 0.5 ? '#4caf50' : (ratio > 0.2 ? '#ff9800' : '#f44336');
      ctx.fillRect(hpx + 1, hpy + 1, (hpW - 2) * ratio, hpH - 2);
      curY += 22;

      const p2 = target.points[2]; // pelvis for stable pos
      drawStat('Pos X', Math.round(p2.x));
      drawStat('Pos Y', Math.round(p2.y));
      
      const vel = Math.hypot(p2.x - p2.oldX, p2.y - p2.oldY);
      drawStat('Velocity', vel.toFixed(2) + ' px/f');
      drawStat('Scale', target.scale.toFixed(2));
      drawStat('Speed', target.speedScale.toFixed(2));
      drawStat('Weapon', target.weapon || 'None');
      drawStat('State', target.state.toUpperCase());

      // Live "Heartbeat" graph mock
      const graphX = contentX + 12;
      const graphY = curY + 10;
      const graphW = contentW - 24;
      const graphH = 40;
      ctx.fillStyle = '#000';
      ctx.fillRect(graphX, graphY, graphW, graphH);
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < graphW; i += 4) {
        const pulse = Math.sin(performance.now() * 0.01 + i * 0.2) * (target.dead ? 0 : 5);
        const spike = (i % 30 === 0 && !target.dead) ? Math.random() * 15 : 0;
        const gy = graphY + graphH / 2 + pulse - spike;
        if (i === 0) ctx.moveTo(graphX + i, gy);
        else ctx.lineTo(graphX + i, gy);
      }
      ctx.stroke();
    }

  } else if (win.appId === 'info') {
    // Simple info.txt style window explaining the project and S key spawning
    ctx.fillStyle = '#ece9d8';
    ctx.fillRect(contentX, contentY, contentW, 18);
    ctx.strokeStyle = '#d4d0c8';
    ctx.strokeRect(contentX, contentY, contentW, 18);
    ctx.fillStyle = '#000';
    ctx.font = '15px "WinXPTahoma", system-ui';
    ctx.fillText('info.txt', contentX + 6, contentY + 3);

    const textX = contentX;
    const textY = contentY + 20;
    const textW = contentW;
    const textH = contentH - 22;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(textX, textY, textW, textH);
    ctx.strokeStyle = '#808080';
    ctx.strokeRect(textX, textY, textW, textH);

    // Ensure scroll state exists
    if (typeof win.infoScrollY !== 'number') win.infoScrollY = 0;
    if (typeof win.infoMaxScroll !== 'number') win.infoMaxScroll = 0;

    ctx.save();
    ctx.beginPath();
    ctx.rect(textX + 1, textY + 1, textW - 2, textH - 2);
    ctx.clip();

    const lineHeight = 16;
    const visibleHeight = textH - 8;
    ctx.fillStyle = '#000';
    ctx.font = '16px "Courier New", monospace';

    const rawLines = [
      'Top Tippers — Thank you!',
      '1. opengl ♦15,000',
      '2. BajaCalifornia ♦10,000',
      '3. Betteralikttt33 ♦10,000',
      '4. ebraimhussain662 ♦7,502',
      '5. darksunrise92092208 ♦4,500',
      '6. nazarthehuman2025 ♦4,100',
      '7. nazarthehuman2026 ♦4,100',
      '8. Harken1 ♦3,751',
      '9. innerain23757280 ♦2,763',
      '10. Kamil ♦2,000',
      '',
      'Animation vs. Cursor – Windows XP desktop sandbox',
      '',
      '- Drag the stickman around and throw him into windows/icons.',
      '- Open apps like Paint, Minesweeper, Calculator, and Tools.',
      '',
      'Controls:',
      '  • Move cursor: mouse / touch',
      '  • Spawn stickmen: press "S" (up to 10–20 total in settings)',
      '',
      'Tips:',
      '  • Right-click blocks to "Float" them (gravity off + grid snap) or "Lock" them (no dragging).',
      '  • Floating blocks snap to a 20px grid when moved.',
      '  • Delete objects by right-clicking them and choosing "Delete",',
      '    or simply drag objects into the Recycle Bin icon to remove them.',
      '  • You can also delete stickmen by dragging them into the Recycle Bin icon.',
      '  • To make stickmen fight, enable "Armed stickmen fight each other" in Settings.',
      '    By default, armed stickmen will try to shoot at YOU (your cursor)!',
      '',
      'Each new stickman gets a different color and can stand',
      'on top of windows and icons like little desktop climbers.',
      '',
      'Change log:',
      '  • Paint opens larger by default for more canvas space.',
      '  • Paint click draws clean dots instead of long strokes.',
      '  • Tools, bombs, spikes, portals and apps got various tweaks.',
      '',
      'Credits:',
      '  • Game created by @ faultyarrow',
    ];

    const lines = [];
    const wrapWidth = textW - 32;
    ctx.font = '16px "Courier New", monospace';
    rawLines.forEach(l => {
      if (!l) {
        lines.push('');
        return;
      }
      let currentLine = '';
      let words = l.split(' ');
      words.forEach(w => {
        let test = currentLine + (currentLine ? ' ' : '') + w;
        if (ctx.measureText(test).width > wrapWidth) {
          lines.push(currentLine);
          currentLine = w;
        } else {
          currentLine = test;
        }
      });
      lines.push(currentLine);
    });

    const totalHeight = lines.length * lineHeight;
    win.infoMaxScroll = Math.max(0, totalHeight - visibleHeight);
    if (win.infoScrollY < 0) win.infoScrollY = 0;
    if (win.infoScrollY > win.infoMaxScroll) win.infoScrollY = win.infoMaxScroll;

    const scrollY = win.infoScrollY || 0;
    let drawY = textY + 4 - scrollY;

    lines.forEach((line) => {
      if (drawY > textY - lineHeight && drawY < textY + textH) {
        ctx.fillText(line, textX + 6, drawY);
      }
      drawY += lineHeight;
    });

    ctx.restore();

    // Simple scrollbar on the right side inside the text area
    if (win.infoMaxScroll > 0) {
      const barW = 8;
      const barX = textX + textW - barW - 2;
      const barY = textY + 2;
      const barH = textH - 4;
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.strokeStyle = '#c0c0c0';
      ctx.strokeRect(barX, barY, barW, barH);

      const ratio = visibleHeight / (totalHeight + 0.01);
      const thumbH = Math.max(18, barH * ratio);
      const maxThumbTravel = barH - thumbH;
      const t = scrollY / (win.infoMaxScroll || 1);
      const thumbY = barY + maxThumbTravel * t;

      ctx.fillStyle = '#c0c0c0';
      ctx.fillRect(barX + 1, thumbY, barW - 2, thumbH);
    }
  } else {
    // Generic content fallback
    ctx.fillStyle = '#555';
    ctx.font = '11px system-ui';
    ctx.fillText('This window is not yet configured.', contentX, contentY);
  }

  ctx.restore();
  ctx.restore();
}



 // removed function drawTaskbar() {} — moved to desktop_ui.js

 // removed function drawStartMenu() {} — moved to desktop_ui.js

 // removed function hitTestWindowResizeEdge() {} — moved to desktop_ui.js

Desktop.prototype.hitTestTrampoline = function(x, y) {
  return hitTestTrampolineHelper(this.trampolines, x, y);
};

 // Expose hit test for sawblades
 Desktop.prototype.hitTestSawblade = function(x, y) {
   return hitTestSawbladeHelper(this.sawblades, x, y);
 };
 
 // Ensure embedded DOM iframes (like the Minecraft/Eaglercraft iframe created in drawWindow)
 // follow window visibility (minimize/close) immediately.
 Desktop.prototype._updateEmbeddedIframe = function(win) {
   try {
     const frameId = `embedded-${win.id}`;
     const iframe = document.getElementById(frameId);
     if (!iframe) return;
     // Hide the iframe when the window is closed or minimized; show otherwise.
     if (win.closed || win.minimized) {
       iframe.style.display = 'none';
       iframe.style.pointerEvents = 'none';
     } else {
       iframe.style.display = 'block';
       iframe.style.pointerEvents = 'auto';
       // reposition in case window moved while hidden
       const canvasEl = document.getElementById('scene');
       try {
         const crect = canvasEl ? canvasEl.getBoundingClientRect() : { left: 0, top: 0 };
         const innerPad = 8;
         const barHeight = 24;
         const contentX = win.x + innerPad;
         const contentY = win.y + barHeight + innerPad;
         const contentW = win.width - innerPad * 2;
         const contentH = win.height - barHeight - innerPad * 2;
         iframe.style.left = `${Math.round(crect.left + contentX)}px`;
         iframe.style.top = `${Math.round(crect.top + contentY)}px`;
         iframe.style.width = `${Math.round(contentW)}px`;
         iframe.style.height = `${Math.round(contentH)}px`;
       } catch (_) {
         // ignore positioning errors
       }
     }
   } catch (_) {}
 };

// Return the screen-space bounds of the Recycle Bin icon (if present)
Desktop.prototype._getRecycleBinBounds = function() {
  if (!Array.isArray(this.icons)) return null;
  const bin = this.icons.find((i) => i && i.appId === 'recycle');
  if (!bin) return null;
  return {
    x: bin.x,
    y: bin.y,
    width: ICON_SIZE,
    height: ICON_SIZE,
  };
};

// Check if a point (x, y) is over the Recycle Bin icon, with a small padding
Desktop.prototype._isOverRecycleBin = function(x, y) {
  const bounds = this._getRecycleBinBounds();
  if (!bounds) return false;
  const pad = 6;
  return (
    x >= bounds.x - pad &&
    x <= bounds.x + bounds.width + pad &&
    y >= bounds.y - pad &&
    y <= bounds.y + bounds.height + pad
  );
};

// Play a ceramic impact sound for generic falling objects
Desktop.prototype._playCeramicImpact = function(speed) {
  if (!this.ceramicSound) return;
  // Respect global mute toggle
  if (this.settings && this.settings.muteAllSound) return;
  // Speed threshold avoids spamming tiny taps
  if (speed < 140) return;
  try {
    this.ceramicSound.currentTime = 0;
    this.ceramicSound.play();
  } catch (_) {
    // ignore autoplay issues
  }
};

// Play the heavy metal impact sound for the 10 ton weight
Desktop.prototype._playWeightImpact = function() {
  if (!this.weightSound) return;
  // Respect global mute toggle
  if (this.settings && this.settings.muteAllSound) return;
  try {
    this.weightSound.currentTime = 0;
    this.weightSound.play();
  } catch (_) {
    // ignore autoplay issues
  }
};

Desktop.prototype._cursorModeFromEdge = function(edge) {
  if (!edge) return 'default';
  const horizontal = edge.left || edge.right;
  const vertical = edge.top || edge.bottom;
  if (horizontal && !vertical) return 'resize-h';
  if (vertical && !horizontal) return 'resize-v';
  // Diagonals
  if ((edge.left && edge.top) || (edge.right && edge.bottom)) {
    return 'resize-diag1';
  }
  return 'resize-diag2';
};

 // Activate the fake "virus" mode: switch wallpaper, start glitching and error spam
Desktop.prototype.activateGlitchMode = function() {
  // Remember previous wallpaper so we can restore after crash
  if (this.prevWallpaperIndex == null && this.settings && Number.isInteger(this.settings.wallpaperIndex)) {
    this.prevWallpaperIndex = this.settings.wallpaperIndex;
  }

  // Switch wallpaper to the evil XP skull screen
  if (typeof this.evilWallpaperIndex === 'number') {
    this.settings.wallpaperIndex = this.evilWallpaperIndex;
  }

  // Start glitch mode and arm a timed "crash"
  this.glitchActive = true;
  this.glitchIntensity = Math.max(this.glitchIntensity, 0.7);
  this.crashTimer = 20;          // seconds until fake crash
  this.crashed = false;
  this.crashDisplayTimer = 0;
  this.needsResetAfterCrash = false;

  // All desktop icons become unfixed so they can fall
  if (Array.isArray(this.icons)) {
    this.icons.forEach((icon) => {
      if (!icon) return;
      icon.fixed = false;
      icon._virusNudged = false;
    });
  }

  // Give a strong initial shake
  this.startScreenShake(0.4, 14);

  // Immediate burst of error popups
  for (let i = 0; i < 4; i++) {
    this._spawnErrorPopup(window.innerWidth || 800, window.innerHeight || 600);
  }

  this.showToast && this.showToast('NotAVirus56.exe is now running...', 2.4);
};

// Spawn a single random "error" popup used by glitch mode
Desktop.prototype._spawnErrorPopup = function(width, height) {
  if (!Array.isArray(this.errorPopups)) this.errorPopups = [];

  const messages = [
    'explorer.exe has encountered a problem.',
    'Unhandled exception at 0xC0FFEE.',
    'Cursor.exe stopped responding.',
    'Stickman.dll failed to initialize.',
    'Critical: Bliss_Hill.bmp not found.',
    'IRQL_NOT_LESS_OR_EQUAL_TO_CURSOR',
    'I see you.',
    'They are all gone now.',
    'DELETE EVERYTHING.',
    'LOOK BEHIND YOU.',
    'The desktop is bleeding.',
    'WHERE DID THEY GO?',
    'System.Heartbeat: STOPPED',
    'SOUL_NOT_FOUND',
    'Run while you can.',
    '01001000 01000101 01001100 01010000',
    'Your files belong to me.',
  ];
  const titleOptions = [
    'Microsoft Windows',
    'Error',
    'System Alert',
    'Application Error',
    'HE IS HERE',
    'ACCESS DENIED',
    'NO MERCY',
    '666',
    'HELP ME',
    'FATAL ERROR',
    'VOID',
  ];

  const message =
    messages[Math.floor(Math.random() * messages.length)];
  const title =
    titleOptions[Math.floor(Math.random() * titleOptions.length)];

  const w = 280;
  const h = 90;
  const margin = 40;
  const x = margin + Math.random() * Math.max(10, width - w - margin * 2);
  const maxY = Math.max(
    margin,
    (height - this.getTaskbarHeight() - h - margin)
  );
  const y = margin + Math.random() * maxY;

  this.errorPopups.push({
    x,
    y,
    width: w,
    height: h,
    title,
    message,
    age: 0,
    ttl: 3.5 + Math.random() * 2.0,
  });
};

// Trigger a brief fake "system crash" screen, then schedule a reset back to normal.
Desktop.prototype._triggerSystemCrash = function(width, height) {
  this.crashed = true;
  this.glitchActive = false;      // stop glitching / ambience
  this.crashDisplayTimer = 3;     // show crash screen for 3 seconds
  this.needsResetAfterCrash = true;

  // Hard stop any ongoing shake so the crash screen is stable
  this.shakeTime = 0;
  this.shakeMag = 0;

  // Clear error popups so they don't come back after reset
  this.errorPopups = [];
};

// Restore desktop state after the fake crash completes.
Desktop.prototype._resetAfterCrash = function() {
  this.crashed = false;
  this.needsResetAfterCrash = false;
  this.glitchActive = false;
  this.glitchIntensity = 0;
  this.errorPopups = [];
  this.crashTimer = 0;
  this.crashDisplayTimer = 0;

  // Restore previous wallpaper if we have one, otherwise default to index 0
  if (this.settings) {
    if (this.prevWallpaperIndex != null && Number.isInteger(this.prevWallpaperIndex)) {
      this.settings.wallpaperIndex = this.prevWallpaperIndex;
    } else {
      this.settings.wallpaperIndex = 0;
    }
  }
  this.prevWallpaperIndex = null;

  // Stop shaking completely
  this.shakeTime = 0;
  this.shakeMag = 0;

  // Reset icon velocities and snap them back to the grid
  if (Array.isArray(this.icons)) {
    const w = window.innerWidth || 800;
    const h = window.innerHeight || 600;
    this.icons.forEach((icon) => {
      if (!icon) return;
      icon.vx = 0;
      icon.vy = 0;
      // Re-fix the Recycle Bin in its usual spot; leave others movable
      if (icon.appId === 'recycle') {
        icon.fixed = true;
      }
      snapIconToGrid(icon, this.icons, w, h);
    });
  }

  // Ensure ambience stops (guard in case any external caller toggled it)
  if (this.ambienceSound) {
    try {
      this.ambienceSound.pause();
    } catch (_) {
      // ignore
    }
  }
};

// Trigger the hidden file input so the user can choose a custom wallpaper image.
Desktop.prototype.requestCustomWallpaper = function() {
  if (!this.wallpaperFileInput) return;
  try {
    // Clear previous selection so choosing the same file again still fires a change event
    this.wallpaperFileInput.value = '';
  } catch (_) {
    // ignore
  }
  try {
    this.wallpaperFileInput.click();
  } catch (_) {
    // ignore browsers that block programmatic clicks
  }
};

// Simple HSL → hex helper used by the Stickman Customize color wheel
function hslToHex(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r1 = 0, g1 = 0, b1 = 0;
  if (hp >= 0 && hp < 1) { r1 = c; g1 = x; }
  else if (hp >= 1 && hp < 2) { r1 = x; g1 = c; }
  else if (hp >= 2 && hp < 3) { g1 = c; b1 = x; }
  else if (hp >= 3 && hp < 4) { g1 = x; b1 = c; }
  else if (hp >= 4 && hp < 5) { r1 = x; b1 = c; }
  else if (hp >= 5 && hp <= 6) { r1 = c; b1 = x; }
  const m = l - c / 2;
  const r = Math.round((r1 + m) * 255);
  const g = Math.round((g1 + m) * 255);
  const b = Math.round((b1 + m) * 255);
  const toHex = (v) => v.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}