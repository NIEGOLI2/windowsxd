import { ICON_SIZE } from './constants.js';
import {
  updateRagdollPhysicsForStick,
  resolvePointCollisionsForStick,
  syncRagdollToAnimationForStick,
} from './stick_ragdoll.js';
import {
  updateAIForStick,
  useWeaponForStick,
} from './stick_ai.js';
import { gunImg } from './weapon_assets.js';

// removed function updateAI() {} — moved to stick_ai.js
// removed function useWeapon() {} — moved to stick_ai.js
// removed gunImg definition — moved to weapon_assets.js

export class StickFigure {
  static emotesEnabled = true;
  static muted = false;
  constructor({ x, y, hitSound = null, color = '#111111', scale = 1.0, speedScale = 1.0 }) {
    this.pos = { x, y };
    this.vel = { x: 0, y: 0 };
    this.scale = scale;
    this.speedScale = speedScale;
    this.state = 'idle'; // idle, curious, run, jump, attack, hide, ragdoll
    this.stateTimer = 0;
    this.facing = 1;
    this.weapon = null;
    // Optional display name shown above the head (used by Stickman Customize app)
    this.name = null;
    this.emote = null;
    this.emoteTimer = 0;

    // Per-stick color (used for outline/features)
    this.color = color;

    // Interaction
    this.dragging = false;
    this.grabbedPointIdx = -1;
    this.lastClickTime = 0;

    // Autonomous behavior
    this.autoTarget = null;
    this.autoTimer = 0;

    // Hand-drawn vibe
    this.globalTime = 0;
    this.wobbleMag = 0.6;

    // Emotional state (affects face)
    this.mood = 'neutral'; // neutral, happy, scared, worried, dizzy, annoyed
    // User-selectable persistent mood
    this.customMood = 'neutral'; 

    // Simple health system (used when desktop enables health bars)
    this.maxHealth = 100;
    this.health = 100;
    this.dead = false;
    this.deathTimer = 0;

    // Impact sound
    this.hitSound = hitSound;
    this.lastHitTime = 0;
    // cooldown timestamp (performance.now()) for when this stick last fired a weapon
    this.lastWeaponFire = 0;

    // Ragdoll / Verlet system
    // Points: 0:Head, 1:Chest, 2:Pelvis, 3:LHand, 4:RHand, 5:LFoot, 6:RFoot
    this.points = [];
    this.constraints = [];
    this.initRagdoll(x, y);

    this.recoveryTimer = 0;
    this.lastCursorX = null;
    this.lastCursorY = null;

    // Simple timer to keep him walking during autonomous movement
    this.walkTimer = 0;

    // Portal teleport cooldown so he doesn't bounce back and forth instantly
    this.portalCooldown = 0;

    // Bleeding effect timer (used when hit by sawblade)
    this.bleedTimer = 0;

    // Rainbow mode toggle
    this.isRainbow = false;

    // Cooldown for how often this stickman is allowed to auto-open apps
    this.appOpenCooldown = 2 + Math.random() * 4;

    // Flag so the main loop can remove this stick when it is "deleted"
    this.markedForRemoval = false;

    // Visual hit flash timer
    this.hitFlashTimer = 0;

    // Optional cosmetic hat (emoji)
    this.hat = null;

    // New: squash/stretch and impact tracking
    this.impactVelocity = 0;
    this.landingTimer = 0;
  }

  initRagdoll(x, y) {
    const s = this.scale || 1.0;
    const points = [
      { x, y: y - 50 * s, oldX: x, oldY: y - 50 * s, mass: 0.8 }, // 0: Head (slightly lighter)
      { x, y: y - 34 * s, oldX: x, oldY: y - 34 * s, mass: 1.0 }, // 1: Chest
      { x, y: y - 18 * s, oldX: x, oldY: y - 18 * s, mass: 1.1 }, // 2: Pelvis (heavier)
      { x: x - 16 * s, y: y - 28 * s, oldX: x - 16 * s, oldY: y - 28 * s, mass: 0.7 }, // 3: LHand
      { x: x + 16 * s, y: y - 28 * s, oldX: x + 16 * s, oldY: y - 28 * s, mass: 0.7 }, // 4: RHand
      { x: x - 8 * s, y, oldX: x - 8 * s, oldY: y, mass: 1.0 }, // 5: LFoot
      { x: x + 8 * s, y, oldX: x + 8 * s, oldY: y, mass: 1.0 }  // 6: RFoot
    ];

    const constraints = [
      { p1: 0, p2: 1, len: 16 * s, stiffness: 1.0 }, // Neck
      { p1: 1, p2: 2, len: 16 * s, stiffness: 1.0 }, // Spine
      { p1: 1, p2: 3, len: 20 * s, stiffness: 0.95 }, // LArm
      { p1: 1, p2: 4, len: 20 * s, stiffness: 0.95 }, // RArm
      { p1: 2, p2: 5, len: 22 * s, stiffness: 0.95 }, // LLeg
      { p1: 2, p2: 6, len: 22 * s, stiffness: 0.95 }, // RLeg
      // Extra cross constraints for stability
      { p1: 3, p2: 5, len: 26 * s, stiffness: 0.7 },  // Left diagonal
      { p1: 4, p2: 6, len: 26 * s, stiffness: 0.7 },  // Right diagonal
      { p1: 0, p2: 2, len: 32 * s, stiffness: 0.7 },  // Head–pelvis to reduce spaghetti
    ];

    this.points = points;
    this.constraints = constraints;
  }

  update(dt, { width, height, input, desktop, sticks = [], gunShotSound = null }) {
    this.globalTime += dt;

    // If dead, keep ragdolling and remove after a short delay
    if (this.dead) {
      this.state = 'ragdoll';
      this.updateRagdollPhysics(dt, width, height, desktop, desktop.getGroundY(height));
      if (this.deathTimer > 0) {
        this.deathTimer -= dt;
        if (this.deathTimer <= 0 && (!desktop || !desktop.settings || !desktop.settings.keepDeadSticks)) {
          this.markedForRemoval = true;
        }
      }
      this.globalTime += dt;
      if (this.emoteTimer > 0) this.emoteTimer -= dt;
      if (this.bleedTimer > 0) this.bleedTimer -= dt;
      this.stateTimer += dt;
      return;
    }
    const groundY = desktop.getGroundY(height);

    // Cooldown timer for portal teleportation
    if (this.portalCooldown > 0) {
      this.portalCooldown -= dt;
      if (this.portalCooldown < 0) this.portalCooldown = 0;
    }

    // Cooldown timer for autonomous app-opening
    if (this.appOpenCooldown > 0) {
      this.appOpenCooldown -= dt;
      if (this.appOpenCooldown < 0) this.appOpenCooldown = 0;
    }

    const cursor = input.cursor;
    const bodyPoint = this.points[1];
    const distToBody = Math.hypot(cursor.x - bodyPoint.x, cursor.y - bodyPoint.y);

    // Occasional idle emotions
    if (
      StickFigure.emotesEnabled &&
      !this.dragging &&
      this.state !== 'ragdoll' &&
      this.emoteTimer <= 0
    ) {
      if (this.state === 'idle' && Math.random() < dt * 0.15) {
        const idleEmotes = ['🙂', '😐', '😴', '🤔'];
        this.showEmote(
          idleEmotes[Math.floor(Math.random() * idleEmotes.length)],
          1.1
        );
        this.mood = Math.random() < 0.5 ? 'happy' : 'neutral';
      }
    }

    // Grabbing logic (single click drag on body)
    if (input.pointerDown) {
      if (!this.dragging && input.justClicked && distToBody < 55) {
        this.dragging = true;
        this.holdingCursor = false; // User grab takes priority
        this.setState('ragdoll');
        this.showEmote('😲', 0.9);
        this.mood = 'scared';
        // Find closest point to grab
        let minDist = 999;
        this.points.forEach((p, i) => {
          const d = Math.hypot(cursor.x - p.x, cursor.y - p.y);
          if (d < minDist) {
            minDist = d;
            this.grabbedPointIdx = i;
          }
        });
        this.lastCursorX = cursor.x;
        this.lastCursorY = cursor.y;
      }

      if (this.dragging) {
        const p = this.points[this.grabbedPointIdx];
        const dx = cursor.x - (this.lastCursorX ?? cursor.x);
        const dy = cursor.y - (this.lastCursorY ?? cursor.y);
        p.x = cursor.x;
        p.y = cursor.y;
        // Impart velocity based on cursor movement for better throw feeling
        p.oldX = p.x - dx;
        p.oldY = p.y - dy;
        this.lastCursorX = cursor.x;
        this.lastCursorY = cursor.y;
      }
    } else {
      if (this.dragging) {
        // Calculate velocity at release to distinguish between a throw and a gentle placement
        const gp = this.points[this.grabbedPointIdx] || this.points[1];
        const releaseVel = Math.hypot(gp.x - gp.oldX, gp.y - gp.oldY);

        // Released from grab
        this.dragging = false;
        this.grabbedPointIdx = -1;

        // If dropped over the Recycle Bin icon, mark this stickman for deletion
        if (
          desktop &&
          typeof desktop._isOverRecycleBin === 'function'
        ) {
          const pelvis = this.points && this.points[2];
          const px = pelvis ? pelvis.x : this.pos.x;
          const py = pelvis ? pelvis.y : this.pos.y;
          if (desktop._isOverRecycleBin(px, py)) {
            this.markedForRemoval = true;
            if (typeof desktop.showToast === 'function') {
              desktop.showToast('Stickman moved to Recycle Bin', 1.6);
            }
            return;
          }
        }

        // Only faint if thrown with significant force
        if (releaseVel > 4.5) {
          this.showEmote(Math.random() < 0.5 ? '💫' : '😵', 1.2);
          this.mood = 'dizzy';
          this.recoveryTimer = 2.0; // Stay ragdoll for a bit
        } else {
          // Gentle placement or simple click: quick recovery
          this.recoveryTimer = 0.15;
          this.mood = 'neutral';
        }
      }
      this.lastCursorX = null;
      this.lastCursorY = null;
    }

    // Stickman grabbing cursor on their own
    if (this.holdingCursor && !this.dragging) {
      const p = this.points[this.cursorHoldPointIdx || 3];
      
      // Calculate cursor speed for shake detection
      if (this.lastCursorX !== null && this.lastCursorY !== null) {
        const dx = cursor.x - this.lastCursorX;
        const dy = cursor.y - this.lastCursorY;
        const speed = Math.hypot(dx, dy) / dt;
        
        // Track shake intensity: rapid movement increases a counter
        if (speed > 800) {
          this.shakeAccumulator = (this.shakeAccumulator || 0) + speed * dt;
        } else {
          this.shakeAccumulator = Math.max(0, (this.shakeAccumulator || 0) - dt * 400);
        }

        // Release if shake threshold reached
        if (this.shakeAccumulator > 1200) {
          this.holdingCursor = false;
          this.shakeAccumulator = 0;
          this.recoveryTimer = 1.5;
          this.showEmote('😱', 1.0);
          this.mood = 'scared';
          // Knockback from the shake
          p.oldX = p.x - dx * 2;
          p.oldY = p.y - dy * 2;
        }
      }

      p.x = cursor.x;
      p.y = cursor.y;
      this.lastCursorX = cursor.x;
      this.lastCursorY = cursor.y;
    }

    // Manual mouse-driven weapon usage has been disabled so the user
    // cannot fire weapons directly when a stickman is holding them.

    if (this.state === 'ragdoll') {
      this.updateRagdollPhysics(dt, width, height, desktop, groundY);

      if (!this.dragging) {
        this.recoveryTimer -= dt;
        const totalVel = this.points.reduce(
          (acc, p) => acc + Math.hypot(p.x - p.oldX, p.y - p.oldY),
          0
        );
        if (this.recoveryTimer <= 0 && totalVel < 2) {
          this.setState('idle');
          this.mood = 'tired';
          this.showEmote('😮‍💨', 1.0);
          this.pos.x = this.points[2].x;
          this.pos.y = this.points[2].y + 18;
        }
      }
    } else {
      this.updateAI(dt, width, height, input, desktop, groundY, sticks, gunShotSound);
      this.syncRagdollToAnimation(dt);
    }

    // Teleport through portals after motion for this frame
    this.handlePortals(desktop);

    if (this.emoteTimer > 0) this.emoteTimer -= dt;
    if (this.bleedTimer > 0) this.bleedTimer -= dt;
    if (this.hitFlashTimer > 0) this.hitFlashTimer -= dt;

    // Update rainbow color if enabled
    if (this.isRainbow && !this.dead) {
      const hue = (this.globalTime * 120) % 360;
      this.color = `hsl(${hue}, 90%, 55%)`;
    }

    // Final Jail confinement pass: force anchor and all physical points to stay inside
    if (this.jailedWindowId) {
      const win = desktop.windows.find(w => w.id === this.jailedWindowId);
      if (win && !win.closed && !win.minimized) {
        // Handle window movement: offset stickman by window delta
        if (this.lastWinX !== undefined && this.lastWinY !== undefined) {
          const dx = win.x - this.lastWinX;
          const dy = win.y - this.lastWinY;
          if (dx !== 0 || dy !== 0) {
            this.pos.x += dx;
            this.pos.y += dy;
            this.points.forEach(p => {
              p.x += dx;
              p.y += dy;
              p.oldX += dx;
              p.oldY += dy;
            });
          }
        }
        this.lastWinX = win.x;
        this.lastWinY = win.y;

        const barHeight = 24;
        const innerPad = 12;
        const left = win.x + innerPad;
        const right = win.x + win.width - innerPad;
        const top = win.y + barHeight + innerPad;
        const bottom = win.y + win.height - innerPad;
        
        // Clamp main position (anchor for animations)
        this.pos.x = Math.max(left, Math.min(right, this.pos.x));
        this.pos.y = Math.max(top, Math.min(bottom, this.pos.y));
        
        // Clamp all verlet points to prevent limbs escaping (safety pass)
        this.points.forEach(p => {
          p.x = Math.max(left, Math.min(right, p.x));
          p.y = Math.max(top, Math.min(bottom, p.y));
        });
      } else {
        this.jailedWindowId = null;
        this.lastWinX = undefined;
        this.lastWinY = undefined;
      }
    }

    this.stateTimer += dt;
  }

  // removed function updateRagdollPhysics() {}
  updateRagdollPhysics(dt, width, height, desktop, groundY) {
    // Delegate heavy physics to helper module for better separation of concerns
    updateRagdollPhysicsForStick(this, dt, width, height, desktop, groundY);
  }

  // removed function resolvePointCollisions() {}
  resolvePointCollisions(p, index, width, groundY, desktop) {
    // Delegate detailed collision resolution to helper module
    resolvePointCollisionsForStick(this, p, index, width, groundY, desktop);
  }

  handlePortals(desktop) {
    if (
      !desktop ||
      !Array.isArray(desktop.portals) ||
      desktop.portals.length !== 2
    ) {
      return;
    }

    // Use pelvis as main reference for entering portal
    const pelvis = this.points[2];
    if (!pelvis) return;

    const [p1, p2] = desktop.portals;
    const inRect = (p, rect) =>
      p.x >= rect.x &&
      p.x <= rect.x + rect.width &&
      p.y >= rect.y &&
      p.y <= rect.y + rect.height;

    let from = null;
    let to = null;

    if (inRect(pelvis, p1)) {
      from = p1;
      to = p2;
    } else if (inRect(pelvis, p2)) {
      from = p2;
      to = p1;
    }

    if (!from || !to) return;

    if (this.portalCooldown > 0) return;

    const fromCx = from.x + from.width / 2;
    const fromCy = from.y + from.height / 2;
    const toCx = to.x + to.width / 2;
    const toCy = to.y + to.height / 2;

    const dx = toCx - fromCx;
    const dy = toCy - fromCy;

    // Teleport all Verlet points and main body
    this.points.forEach((p) => {
      p.x += dx;
      p.y += dy;
      p.oldX += dx;
      p.oldY += dy;
    });
    this.pos.x += dx;
    this.pos.y += dy;

    this.portalCooldown = 0.4;
    this.mood = 'surprised';
    this.showEmote('✨', 0.7);
  }

  updateAI(dt, width, height, input, desktop, groundY, sticks, gunShotSound) {
    return updateAIForStick(this, dt, width, height, input, desktop, groundY, sticks, gunShotSound);
  }

  // removed function syncRagdollToAnimation() {}
  syncRagdollToAnimation(dt) {
    // Delegate animation syncing to helper module
    syncRagdollToAnimationForStick(this, dt);
  }

  setState(next) {
    if (this.state === next) return;
    this.state = next;
    this.stateTimer = 0;
  }

  // Safely set a display name with a 20-character limit; empty -> null
  setName(name) {
    if (typeof name !== 'string') {
      this.name = null;
      return;
    }
    const trimmed = name.trim();
    this.name = trimmed.length ? String(trimmed).slice(0, 20) : null;
  }

  wander() {
    this.facing = Math.random() < 0.5 ? -1 : 1;
    this.vel.x = this.facing * 40 * this.speedScale;
    this.walkTimer = 2 + Math.random() * 2; // walk for 2–4 seconds
    this.setState('walk');
  }

  jump() {
    if (this.state === 'ragdoll' || this.dragging) return;
    this.setState('jump');
    // Impart upward velocity to pelvis/chest for physics-based jump feel
    const impulse = -450 * this.scale;
    this.points[1].y += -10;
    this.points[1].oldY = this.points[1].y - impulse * 0.016;
    this.points[2].oldY = this.points[2].y - impulse * 0.016;
    // Update the anchor's vertical velocity so the procedural animation follows the physics
    this.vel.y = impulse;
  }

  showEmote(symbol, duration = 1.0) {
    if (!StickFigure.emotesEnabled) return;
    this.emote = symbol;
    this.emoteTimer = duration;
  }

  // Apply damage to this stick; only has effect when health bars are enabled in settings.
  applyDamage(amount, desktop) {
    const dmg = Math.max(0, amount || 0);
    if (!dmg || this.dead) return;

    // Health system is active if stickHealthBars is enabled OR if it's the stats app viewing them OR virus is active
    const isStatsOpen = desktop && desktop.windows && desktop.windows.some(w => w.appId === 'stats' && !w.closed && !w.minimized);
    const healthMode = (desktop && (desktop.settings && desktop.settings.stickHealthBars)) || isStatsOpen || (desktop && desktop.glitchActive);
    
    // Only apply damage if the health system is effectively active (enabled in settings or being monitored)
    if (!healthMode) return;

    this.health -= dmg;
    this.hitFlashTimer = 0.15; // Visual feedback when hit

    if (this.health <= 0) {
      this.health = 0;
      this.dead = true;
      this.setState('ragdoll');
      this.mood = 'dizzy';
      this.showEmote('💀', 1.4);
      this.deathTimer = 3.0;
    }
  }

  maybePlayHitSound(impact) {
    // Only play when ragdoll has been thrown into a wall/ceiling with some speed
    if (
      !this.hitSound ||
      StickFigure.muted ||
      this.state !== 'ragdoll' ||
      this.dragging ||
      impact < 4
    ) {
      return;
    }
    const now = performance.now();
    if (now - this.lastHitTime < 80) return;
    this.lastHitTime = now;
    try {
      this.hitSound.currentTime = 0;
      this.hitSound.play();
    } catch (_) {
      // ignore autoplay / user-gesture issues
    }
  }

  useWeapon({ sticks, input, gunShotSound, desktop }) {
    return useWeaponForStick(this, { sticks, input, gunShotSound, desktop });
  }

  draw(ctx, desktop) {
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 4;

    const p = this.points;
    const jitter = (s, a) => Math.sin(this.globalTime * 20 + s) * a * this.wobbleMag;

    // Draw Body Segments using Verlet points
    // Legs
    ctx.beginPath();
    ctx.moveTo(p[2].x, p[2].y); ctx.lineTo(p[5].x, p[5].y); // Pelvis to LFoot
    ctx.moveTo(p[2].x, p[2].y); ctx.lineTo(p[6].x, p[6].y); // Pelvis to RFoot
    ctx.stroke();

    // Arms
    ctx.beginPath();
    ctx.moveTo(p[1].x, p[1].y); ctx.lineTo(p[3].x, p[3].y); // Chest to LHand
    ctx.moveTo(p[1].x, p[1].y); ctx.lineTo(p[4].x, p[4].y); // Chest to RHand
    ctx.stroke();

    // If bleeding, overlay thin red streaks along limbs
    if (this.bleedTimer > 0) {
      const alpha = Math.min(1, this.bleedTimer / 1.5);
      ctx.save();
      ctx.strokeStyle = `rgba(200,0,0,${alpha})`;
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.moveTo(p[2].x, p[2].y); ctx.lineTo(p[5].x, p[5].y);
      ctx.moveTo(p[2].x, p[2].y); ctx.lineTo(p[6].x, p[6].y);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(p[1].x, p[1].y); ctx.lineTo(p[3].x, p[3].y);
      ctx.moveTo(p[1].x, p[1].y); ctx.lineTo(p[4].x, p[4].y);
      ctx.stroke();

      ctx.restore();
    }

    // Draw equipped weapon in right hand, if any
    if (this.weapon) {
      const hand = p[4];
      ctx.save();
      ctx.translate(hand.x, hand.y);
      ctx.strokeStyle = this.color;
      ctx.fillStyle = this.color;
      ctx.lineWidth = 3;

      if (this.weapon === 'sword') {
        ctx.strokeStyle = '#cccccc';
        ctx.beginPath();
        ctx.moveTo(0, -18);
        ctx.lineTo(0, 6);
        ctx.stroke();
        ctx.strokeStyle = '#8b5a2b';
        ctx.beginPath();
        ctx.moveTo(-5, 4);
        ctx.lineTo(5, 4);
        ctx.stroke();
      } else if (this.weapon === 'hammer') {
        ctx.strokeStyle = '#8b5a2b';
        ctx.beginPath();
        ctx.moveTo(-2, -14);
        ctx.lineTo(2, 10);
        ctx.stroke();
        ctx.strokeStyle = '#555555';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(-10, -12);
        ctx.lineTo(8, -8);
        ctx.stroke();
      } else if (this.weapon === 'shield') {
        ctx.fillStyle = '#d0e4ff';
        ctx.strokeStyle = '#355c9a';
        ctx.lineWidth = 2;
        const w = 18;
        const h = 24;
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(-w / 2, -h / 2, w, h, 5);
        } else {
          ctx.rect(-w / 2, -h / 2, w, h);
        }
        ctx.fill();
        ctx.stroke();
      } else if (this.weapon === 'laser') {
        ctx.strokeStyle = '#555555';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(-10, -4);
        ctx.lineTo(8, -4);
        ctx.stroke();
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(6, -4);
        ctx.lineTo(14, -4);
        ctx.stroke();
      } else if (this.weapon === 'gun') {
        // Glock in hand
        if (gunImg.complete) {
          ctx.save();
          ctx.scale(this.facing, 1);
          // Standardized alignment for the weapon grip relative to the hand
          ctx.drawImage(gunImg, -6, -12, 24, 18);
          ctx.restore();
        } else {
          ctx.strokeStyle = '#333';
          ctx.fillStyle = '#555';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.rect(-10, -6, 18, 6);
          ctx.fill();
          ctx.stroke();
          ctx.beginPath();
          ctx.rect(2, -2, 6, 10);
          ctx.fill();
          ctx.stroke();
        }
      } else if (this.weapon === 'knife') {
        // Simple small knife
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#cccccc';
        ctx.beginPath();
        ctx.moveTo(-14, -2);
        ctx.lineTo(6, -2);
        ctx.stroke();
        ctx.strokeStyle = '#8b5a2b';
        ctx.beginPath();
        ctx.moveTo(-18, -4);
        ctx.lineTo(-14, -4);
        ctx.moveTo(-18, 0);
        ctx.lineTo(-14, 0);
        ctx.stroke();
      }

      ctx.restore();
    }

    // Torso
    ctx.beginPath();
    ctx.moveTo(p[0].x, p[0].y); ctx.lineTo(p[1].x, p[1].y); // Head to Chest
    ctx.lineTo(p[2].x, p[2].y); // Chest to Pelvis
    ctx.stroke();

    // Head circle (slightly larger)
    ctx.beginPath();
    const head = p[0];
    const s = this.scale || 1.0;
    ctx.arc(head.x, head.y, 12 * s, 0, Math.PI * 2);
    // Draw white or red depending on hit flash
    ctx.fillStyle = this.hitFlashTimer > 0 ? '#ffcccc' : '#ffffff';
    ctx.fill();
    ctx.stroke();

    // Expression
    this.drawFace(ctx, head.x, head.y);

    // Hat
    if (this.hat) {
      ctx.save();
      // If the hat is 'vib', draw the project's vib image (blank canvas) on the head;
      // desktop is provided as parameter to draw(), so use it to access the preloaded image.
      if (this.hat === 'vib' && desktop && desktop.vibHatImg && desktop.vibHatImg.complete) {
        const img = desktop.vibHatImg;
        const hatW = 28 * s;
        const hatH = 28 * s;
        // Draw centered slightly above the head center so it appears perched
        ctx.drawImage(img, head.x - hatW / 2, head.y - 18 * s - hatH / 2, hatW, hatH);
      } else {
        // If the selected hat is the special 'vib' hat and the image isn't available,
        // intentionally render nothing (no text fallback).
        if (this.hat === 'vib') {
          // vib hat image missing — render no text
        } else {
          ctx.font = `${20 * s}px serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          // Position hat lower so it sits snug on the head circle
          ctx.fillText(this.hat, head.x, head.y - (1 * s));
        }
      }
      ctx.restore();
    }

    // Emote
    if (StickFigure.emotesEnabled && this.emoteTimer > 0 && this.emote) {
      const fade = Math.min(1, this.emoteTimer * 2);
      ctx.globalAlpha = fade;
      ctx.fillStyle = 'white';
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      const ex = head.x + 15;
      const ey = head.y - 25;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(ex, ey, 32, 22, 5);
      else ctx.rect(ex, ey, 32, 22);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#000';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.emote, ex + 16, ey + 11);
      ctx.globalAlpha = 1;
    }

    // Health bar (if enabled via desktop settings)
    const showHealth =
      desktop &&
      desktop.settings &&
      desktop.settings.stickHealthBars;
    if (showHealth && this.maxHealth > 0) {
      const ratio = Math.max(0, Math.min(1, this.health / this.maxHealth));
      const barW = 40;
      const barH = 5;
      const bx = head.x - barW / 2;
      const by = head.y - 24;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(bx - 1, by - 1, barW + 2, barH + 2);
      const grad = ctx.createLinearGradient(bx, by, bx + barW, by);
      grad.addColorStop(0, '#4caf50');
      grad.addColorStop(1, ratio < 0.3 ? '#f44336' : '#8bc34a');
      ctx.fillStyle = grad;
      ctx.fillRect(bx, by, barW * ratio, barH);
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.strokeRect(bx - 0.5, by - 0.5, barW + 1, barH + 1);
    }

    // Optional name tag above the stickman's head
    if (this.name && typeof this.name === 'string' && this.name.trim()) {
      const label = this.name.trim();
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.font = '14px "WinXPTahoma", system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      const textWidth = ctx.measureText(label).width;
      const padX = 4;
      const padY = 2;
      const boxW = textWidth + padX * 2;
      const boxH = 14;
      const lx = head.x - boxW / 2;
      const s = this.scale || 1.0;
      const ly = head.y - (18 * s) - boxH;
      ctx.fillRect(lx, ly, boxW, boxH);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(label, head.x, ly + boxH - padY);
    }

    ctx.restore();
  }

  drawFace(ctx, x, y) {
    // If face is disabled for this stick, skip drawing
    if (this.hideFace) return;
    // Determine mood priority from ragdoll / state
    let mood = this.mood;
    if (this.state === 'ragdoll') {
      mood = mood === 'dizzy' ? 'dizzy' : 'worried';
    } else if (this.state === 'run') {
      mood = 'scared';
    }

    ctx.save();
    ctx.strokeStyle = this.color;
    ctx.fillStyle = this.color;

    // Eyes & Brows
    if (mood === 'angry') {
      // Angled brows
      ctx.beginPath();
      ctx.moveTo(x - 7, y - 6); ctx.lineTo(x - 2, y - 3);
      ctx.moveTo(x + 2, y - 3); ctx.lineTo(x + 7, y - 6);
      ctx.stroke();
      ctx.beginPath(); ctx.arc(x - 4, y - 1, 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + 4, y - 1, 1.5, 0, Math.PI * 2); ctx.fill();
    } else if (mood === 'sad') {
      // Worried brows
      ctx.beginPath();
      ctx.moveTo(x - 7, y - 4); ctx.lineTo(x - 2, y - 6);
      ctx.moveTo(x + 2, y - 6); ctx.lineTo(x + 7, y - 4);
      ctx.stroke();
      ctx.beginPath(); ctx.arc(x - 4, y - 1, 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + 4, y - 1, 1.5, 0, Math.PI * 2); ctx.fill();
    } else if (mood === 'scared') {
      ctx.fillRect(x - 5, y - 3, 3, 4);
      ctx.fillRect(x + 2, y - 3, 3, 4);
    } else if (mood === 'dizzy') {
      ctx.beginPath();
      ctx.moveTo(x - 6, y - 4); ctx.lineTo(x - 3, y - 1);
      ctx.moveTo(x - 3, y - 4); ctx.lineTo(x - 6, y - 1);
      ctx.moveTo(x + 3, y - 4); ctx.lineTo(x + 6, y - 1);
      ctx.moveTo(x + 6, y - 4); ctx.lineTo(x + 3, y - 1);
      ctx.stroke();
    } else if (mood === 'annoyed') {
      ctx.beginPath();
      ctx.moveTo(x - 6, y - 4); ctx.lineTo(x - 2, y - 6);
      ctx.moveTo(x + 2, y - 6); ctx.lineTo(x + 6, y - 4);
      ctx.stroke();
      ctx.beginPath(); ctx.arc(x - 4, y - 1, 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + 4, y - 1, 1.5, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.beginPath(); ctx.arc(x - 4, y - 2, 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + 4, y - 2, 1.5, 0, Math.PI * 2); ctx.fill();
    }

    // Mouth
    ctx.beginPath();
    if (mood === 'worried' || mood === 'scared' || mood === 'sad' || mood === 'angry') {
      ctx.arc(x, y + 6, 3.5, 0, Math.PI, true);
    } else if (mood === 'happy') {
      ctx.arc(x, y + 4, 4, 0, Math.PI, false);
    } else if (mood === 'dizzy' || mood === 'tired') {
      ctx.moveTo(x - 4, y + 5);
      ctx.quadraticCurveTo(x, y + 2, x + 4, y + 5);
    } else if (mood === 'annoyed') {
      ctx.moveTo(x - 4, y + 5);
      ctx.lineTo(x + 4, y + 5);
    } else {
      ctx.moveTo(x - 3, y + 4);
      ctx.lineTo(x + 3, y + 4);
    }
    ctx.stroke();

    ctx.restore();
  }
}