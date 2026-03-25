/*
stick_ragdoll.js

This module hosts ragdoll/physics-related helpers and code
from stickFigure.js (e.g. verlet integration, constraints solving, collision resolvers).
*/

import { ICON_SIZE } from './constants.js';

export function updateRagdollPhysicsForStick(stick, dt, width, height, desktop, groundY) {
  const gravity = 1000;
  const airFriction = 0.99;

  // Sub-step simulation for stability
  const subSteps = 4;
  const subDt = dt / subSteps;

  for (let step = 0; step < subSteps; step++) {
    // 1. Verlet Integration
    stick.points.forEach((p, i) => {
      if (stick.dragging && i === stick.grabbedPointIdx) return;
      if (stick.holdingCursor && i === stick.cursorHoldPointIdx) return;

      const vx = (p.x - p.oldX) * airFriction;
      const vy = (p.y - p.oldY) * airFriction;

      p.oldX = p.x;
      p.oldY = p.y;
      p.x += vx;
      p.y += vy + gravity * subDt * subDt;

      // Track vertical velocity before collision for landing impact logic
      if (i === 2) stick.impactVelocity = Math.max(stick.impactVelocity || 0, vy / subDt);



      resolvePointCollisionsForStick(stick, p, i, width, groundY, desktop);
    });

    // 2. Constraints Solver
    const iterations = 10;
    for (let it = 0; it < iterations; it++) {
      stick.constraints.forEach(c => {
        const p1 = stick.points[c.p1];
        const p2 = stick.points[c.p2];
        let dx = p2.x - p1.x;
        let dy = p2.y - p1.y;
        const dist = Math.hypot(dx, dy) || 0.0001;
        const diff = (c.len - dist) / dist;
        const stiffness = c.stiffness ?? 1.0;
        const offsetX = dx * diff * 0.5 * stiffness;
        const offsetY = dy * diff * 0.5 * stiffness;

        const m1 = p1.mass || 1;
        const m2 = p2.mass || 1;
        const invMassSum = 1 / (m1 + m2);

        if (!(stick.dragging && c.p1 === stick.grabbedPointIdx)) {
          p1.x -= offsetX * (m2 * invMassSum);
          p1.y -= offsetY * (m2 * invMassSum);
        }
        if (!(stick.dragging && c.p2 === stick.grabbedPointIdx)) {
          p2.x += offsetX * (m1 * invMassSum);
          p2.y += offsetY * (m1 * invMassSum);
        }
      });
    }
  }
}

/**
 * Resolves physical collisions between two stickmen to prevent them from overlapping perfectly.
 */
export function resolveStickToStickCollision(stickA, stickB) {
  // Use core body points (Chest: 1, Pelvis: 2) for collision checks
  const pointsA = [stickA.points[1], stickA.points[2]];
  const pointsB = [stickB.points[1], stickB.points[2]];
  
  // Dynamic radius based on scales
  const radius = 18 * ((stickA.scale + stickB.scale) / 2);

  pointsA.forEach(pA => {
    pointsB.forEach(pB => {
      const dx = pB.x - pA.x;
      const dy = pB.y - pA.y;
      const dist = Math.hypot(dx, dy) || 0.0001;

      if (dist < radius) {
        const overlap = radius - dist;
        const nx = dx / dist;
        const ny = dy / dist;
        const push = overlap * 0.5;

        // Push points apart in world space
        pA.x -= nx * push;
        pA.y -= ny * push;
        pB.x += nx * push;
        pB.y += ny * push;
        
        // Lightly dampen the "pop" by adjusting old positions
        pA.oldX += nx * push * 0.05;
        pB.oldX -= nx * push * 0.05;
      }
    });
  });
}

export function resolvePointCollisionsForStick(stick, p, index, width, groundY, desktop) {
  const bounce = 0.25;
  const margin = 5;
  const ceiling = 6; // solid ceiling a few pixels down from the top

  // Desktop icons and windows as platforms
  let effectiveGround = groundY;

  // When the user is dragging the stickman, skip collisions with windows/icons for all points
  // so the ragdoll doesn't get pinned or stretched by window edges.
  const skipObjectCollision = stick.dragging;

  // If stickman is jailed, restrict collisions to that window's interior only
  if (stick.jailedWindowId) {
    const win = desktop.windows.find(w => w.id === stick.jailedWindowId);
    if (win && !win.closed && !win.minimized) {
      const barH = 24;
      const pad = 12;
      const left = win.x + pad;
      const right = win.x + win.width - pad;
      const top = win.y + barH + pad;
      const bottom = win.y + win.height - pad;

      // Force collision with internal 4 sides
      if (p.x < left) { p.x = left; p.oldX = p.x + (p.x - p.oldX) * 0.1; }
      if (p.x > right) { p.x = right; p.oldX = p.x + (p.x - p.oldX) * 0.1; }
      if (p.y < top) { p.y = top; p.oldY = p.y + (p.y - p.oldY) * 0.1; }
      if (p.y > bottom) { 
        p.y = bottom; 
        p.oldY = p.y + (p.y - p.oldY) * 0.2; 
        // Landing impact trigger
        if (index === 2 && Math.abs(p.y - p.oldY) > 5) stick.landingTimer = 0.3;
      }
      return; // Skip other desktop collisions
    } else {
      stick.jailedWindowId = null;
    }
  }

  // Window collision - treat windows as solid, EXCEPT for Paint which we can enter
  desktop.windows.forEach(win => {
    if (win.closed || win.minimized || skipObjectCollision) return;

    const left = win.x;
    const right = win.x + win.width;
    const top = win.y;
    const bottom = win.y + win.height;

    if (win.appId === 'paint') {
      // For Paint, only collide with the top (external roof) and bottom (internal floor)
      if (p.x >= left && p.x <= right) {
        // Landing on the top (title bar area)
        if (p.y >= top && p.oldY <= top) {
          const impact = Math.abs(p.y - p.oldY);
          if (impact > 10) stick.applyDamage(impact * 0.5, desktop);
          p.y = top;
          p.oldY = p.y + (p.y - p.oldY) * bounce;
        } 
        // Landing on the bottom interior floor
        else if (p.y >= bottom && p.oldY <= bottom && p.oldY > top) {
          p.y = bottom;
          p.oldY = p.y + (p.y - p.oldY) * bounce;
        }
      }
      return;
    }

    // Hollow window behavior: allow stickmen to "go in" the apps.
    // They can still stand on the title bar (top) or the floor (bottom).
    const isInsideX = p.x >= left && p.x <= right;
    const isInsideY = p.y >= top && p.y <= bottom;

    if (isInsideX && isInsideY) {
      // If we are deep inside the window, we only collide with the bottom 'floor' 
      // of the window content area if we are falling onto it.
      const floorY = bottom - 5;
      const titleBarY = top + 24;

      // Stand on title bar (from above)
      if (p.oldY <= top && p.y >= top) {
        p.y = top;
        p.oldY = p.y + (p.y - p.oldY) * bounce;
      } 
      // Stand on floor of window (from above)
      else if (p.oldY <= floorY && p.y >= floorY && p.y < bottom) {
        p.y = floorY;
        p.oldY = p.y + (p.y - p.oldY) * bounce;
      }
      // Hit head on title bar from inside (optional, feels more 'contained')
      else if (p.oldY >= titleBarY && p.y <= titleBarY) {
        p.y = titleBarY + 1;
        p.oldY = p.y + (p.y - p.oldY) * bounce;
      }
    }
  });

  // Icon collision: icons are solid rectangles the stickman cannot pass through
  desktop.icons.forEach(icon => {
    if (skipObjectCollision) return;
    const ix = icon.x, iy = icon.y, iw = ICON_SIZE, ih = ICON_SIZE;
    if (p.x >= ix && p.x <= ix + iw && p.y >= iy && p.y <= iy + ih) {
      const cameFromAbove = p.oldY <= iy + 5;
      if (cameFromAbove) {
        p.y = iy;
        p.oldY = p.y + (p.y - p.oldY) * bounce;
      } else {
        const dLeft = Math.abs(p.x - ix);
        const dRight = Math.abs(p.x - (ix + iw));
        if (dLeft < dRight) p.x = ix - 1;
        else p.x = ix + iw + 1;
        p.oldX = p.x - (p.x - p.oldX) * 0.6;
      }
    }
  });

  // Collisions with user-drawn Paint strokes (treat each segment as a solid wall)
  if (!skipObjectCollision && desktop && typeof desktop.getPaintStrokeSegments === 'function') {
    const segments = desktop.getPaintStrokeSegments();
    const radius = 6; // thickness of collision around the drawn line

    for (const seg of segments) {
      const x1 = seg.x1;
      const y1 = seg.y1;
      const x2 = seg.x2;
      const y2 = seg.y2;

      const vx = x2 - x1;
      const vy = y2 - y1;
      const lenSq = vx * vx + vy * vy;
      if (lenSq === 0) continue;

      // Project point onto segment
      const t = Math.max(
        0,
        Math.min(1, ((p.x - x1) * vx + (p.y - y1) * vy) / lenSq)
      );
      const closestX = x1 + vx * t;
      const closestY = y1 + vy * t;

      const dx = p.x - closestX;
      const dy = p.y - closestY;
      const distSq = dx * dx + dy * dy;
      if (distSq === 0) continue;

      const dist = Math.sqrt(distSq);
      if (dist < radius) {
        // Push point out along normal
        const penetration = radius - dist;
        const nx = dx / dist;
        const ny = dy / dist;

        p.x += nx * penetration;
        p.y += ny * penetration;

        // Reflect velocity component along the normal for a bit of bounce
        const velX = p.x - p.oldX;
        const velY = p.y - p.oldY;
        const dot = velX * nx + velY * ny;
        const bounceFactor = 0.4;
        const rx = velX - (1 + bounceFactor) * dot * nx;
        const ry = velY - (1 + bounceFactor) * dot * ny;

        p.oldX = p.x - rx;
        p.oldY = p.y - ry;
      }
    }
  }

  // Trampoline collisions – treat as strong bouncy platforms
  if (
    !skipObjectCollision &&
    desktop &&
    Array.isArray(desktop.trampolines) &&
    index >= 5 // feet only for stronger effect
  ) {
    for (const t of desktop.trampolines) {
      const left = t.x;
      const right = t.x + t.width;
      const top = t.y;
      const bottom = t.y + t.height;

      // Only react when coming down onto the top surface
      if (
        p.x >= left &&
        p.x <= right &&
        p.y >= top &&
        p.oldY <= top
      ) {
        const velY = p.y - p.oldY;
        p.y = top;
        // Softer, slower bounce so trampolines feel less extreme
        const bounceStrength = 0.9;
        const newVy = Math.max(140, Math.abs(velY) * bounceStrength);
        p.oldY = p.y + newVy;

        // Smaller horizontal jiggle for stability
        const sidePush = (Math.random() - 0.5) * 16;
        p.oldX = p.x - sidePush;

        // Mood/emote hint when bouncing
        stick.mood = 'happy';
        if (Math.random() < 0.4) {
          stick.showEmote('🌀', 0.6);
        }
      }
    }
  }

  // Shape collisions from Tools app – treat as solid platforms/obstacles
  if (!skipObjectCollision && desktop && Array.isArray(desktop.shapes)) {
    for (const s of desktop.shapes) {
      if (s.type === 'ramp') {
        const left = s.x;
        const right = s.x + s.width;
        const top = s.y;
        const bottom = s.y + s.height;

        if (p.x >= left && p.x <= right && p.y >= top && p.y <= bottom) {
          // Calculate height of the slope at this X
          const relX = p.x - left;
          const slopeY = bottom - (relX / s.width) * s.height;
          
          if (p.y >= slopeY - 5) {
            const impact = Math.abs(p.y - p.oldY);
            p.y = slopeY;
            // Push along normal or just stick to slope for "sliding"
            const angle = Math.atan2(-s.height, s.width);
            const vx = p.x - p.oldX;
            const vy = p.y - p.oldY;
            
            // Adjust velocity to slide down ramp
            p.oldY = p.y + (p.y - p.oldY) * bounce;
            p.oldX = p.x - vx * 0.95; // more friction on ramp?
          }
        }
      }
    }
  }

  if (
    !skipObjectCollision &&
    desktop &&
    Array.isArray(desktop.shapes)
  ) {
    for (const s of desktop.shapes) {
      if (s.type === 'circle' || s.type === 'bouncyball') {
        const dx = p.x - s.x;
        const dy = p.y - s.y;
        const dist = Math.hypot(dx, dy) || 0.0001;
        if (dist < s.radius) {
          // Only handle when approaching from above for "ground" behavior
          const topY = s.y - s.radius;
          if (p.oldY <= topY && p.y >= topY) {
            p.y = topY;
            p.oldY = p.y + (p.y - p.oldY) * bounce;
          } else {
            // Simple radial push-out
            const penetration = s.radius - dist;
            const nx = dx / dist;
            const ny = dy / dist;
            p.x += nx * penetration;
            p.y += ny * penetration;
            p.oldX = p.x - (p.x - p.oldX) * 0.6;
            p.oldY = p.y - (p.y - p.oldY) * 0.6;
          }
        }
      } else {
        // Axis-aligned shapes: square, rectangle, triangle (use AABB)
        const left = s.x;
        const right = s.x + s.width;
        const top = s.y;
        const bottom = s.y + s.height;

        if (
          p.x >= left &&
          p.x <= right &&
          p.y >= top &&
          p.y <= bottom
        ) {
          const fromLeft = Math.abs(p.x - left);
          const fromRight = Math.abs(right - p.x);
          const fromTop = Math.abs(p.y - top);
          const fromBottom = Math.abs(bottom - p.y);

          const minPenetration = Math.min(fromLeft, fromRight, fromTop, fromBottom);

          if (minPenetration === fromTop) {
            p.y = top;
            p.oldY = p.y + (p.y - p.oldY) * bounce;
          } else if (minPenetration === fromBottom) {
            p.y = bottom + 1;
            p.oldY = p.y + (p.y - p.oldY) * bounce;
          } else if (minPenetration === fromLeft) {
            p.x = left - 1;
            p.oldX = p.x - (p.x - p.oldX) * 0.6;
          } else {
            p.x = right + 1;
            p.oldX = p.x - (p.x - p.oldX) * 0.6;
          }
        }
      }
    }
  }

  // Ceiling collision: prevent points from moving above the top of the scene
  if (p.y < ceiling) {
    const impact = Math.abs(p.y - p.oldY);
    p.y = ceiling;
    p.oldY = p.y + (p.y - p.oldY) * bounce;
    stick.maybePlayHitSound(impact);
    if (impact > 10) stick.applyDamage(impact * 0.5, desktop);
  }

  if (p.y > effectiveGround) {
    const impact = Math.abs(p.y - p.oldY);
    // If hitting ground with significant speed, trigger impact squash
    if (index === 2 && impact > 8) {
      stick.landingTimer = 0.5;
    }
    if (impact > 12) stick.applyDamage(impact * 0.5, desktop);
    p.y = effectiveGround;
    p.oldY = p.y + (p.y - p.oldY) * bounce;
  }
  if (p.x < margin) {
    const impact = Math.abs(p.x - p.oldX);
    p.x = margin;
    p.oldX = p.x - (p.x - p.oldX) * 0.6;
    stick.maybePlayHitSound(impact);
    if (impact > 10) stick.applyDamage(impact * 0.5, desktop);
  }
  if (p.x > width - margin) {
    const impact = Math.abs(p.x - p.oldX);
    p.x = width - margin;
    p.oldX = p.x - (p.x - p.oldX) * 0.6;
    stick.maybePlayHitSound(impact);
    if (impact > 10) stick.applyDamage(impact * 0.5, desktop);
  }
}

export function syncRagdollToAnimationForStick(stick, dt) {
  const x = stick.pos.x;
  const y = stick.pos.y;
  const gt = stick.globalTime;
  const s = stick.scale || 1.0;

  // Track landing impacts
  if (stick.landingTimer > 0) stick.landingTimer -= dt;

  let stepPhase = 0;
  let moveLean = 0;
  let bounceMod = 0;

  if (stick.state === 'run') {
    stepPhase = stick.stateTimer * 14;
    moveLean = stick.facing * 12 * s;
    bounceMod = Math.abs(Math.sin(stepPhase)) * 4 * s;
  } else if (stick.state === 'walk') {
    stepPhase = stick.stateTimer * 8;
    moveLean = stick.facing * 4 * s;
    bounceMod = Math.abs(Math.sin(stepPhase)) * 2 * s;
  } else {
    stepPhase = gt * 3;
  }

  // Base procedural motion components
  const isIdle = stick.state === 'idle';
  const isJumping = stick.state === 'jump';
  const bob = Math.sin(gt * 4) * (isIdle ? 2.0 : 0.5);
  const legSwing = Math.sin(stepPhase) * (stick.state === 'run' ? 14 : 8);
  const armSwing = Math.sin(stepPhase + Math.PI) * (stick.state === 'run' ? 18 : 10);

  // Impact "Crouch" logic
  const landingSquash = stick.landingTimer > 0 ? (stick.landingTimer / 0.5) * 12 * s : 0;

  let idleOffsetX = 0, idleOffsetY = 0, idleHeadTiltY = 0, idleShoulderTiltY = 0, idleFootOffset = 0;
  if (isIdle) {
    const breathe = Math.sin(gt * 2) * 2.0;
    const sway = Math.sin(gt * 0.9) * 3.0;
    const tilt = Math.sin(gt * 1.7) * 1.5;
    idleOffsetX = sway;
    idleOffsetY = breathe * 0.4;
    idleHeadTiltY = breathe * 0.6 - tilt;
    idleShoulderTiltY = breathe * 0.3 + tilt * 0.5;
    idleFootOffset = Math.sin(gt * 0.9 + Math.PI / 2) * 2.0;
  }

  const targets = [
    // 0: Head - Leans into movement
    {
      x: x + idleOffsetX + moveLean * 1.5,
      y: y - 50 * s + bob + idleHeadTiltY - (isJumping ? 5 * s : 0) + landingSquash,
    },
    // 1: Chest - Heavy lean
    {
      x: x + idleOffsetX + moveLean,
      y: y - 34 * s + bob + idleShoulderTiltY - (isJumping ? 2 * s : 0) + landingSquash,
    },
    // 2: Pelvis - Pivot point
    {
      x: x + idleOffsetX,
      y: y - 18 * s + bob + idleOffsetY - bounceMod + landingSquash,
    },
    // 3: LHand (Back hand)
    {
      x: x - stick.facing * (15 * s - armSwing * s) + idleOffsetX * 0.6 + moveLean,
      y: y - 28 * s + idleShoulderTiltY * 0.7 + (isJumping ? -15 * s : 0) + landingSquash,
    },
    // 4: RHand (Forward hand)
    {
      x: x + stick.facing * (15 * s + armSwing * s) + idleOffsetX * 0.6 + moveLean,
      y: y - 28 * s + idleShoulderTiltY * 0.7 + (isJumping ? -15 * s : 0) + landingSquash,
    },
    // 5: LFoot
    {
      x: x - 8 * s + (isJumping ? 4 * s : legSwing * s) + idleOffsetX * 0.3,
      y: y + (isJumping ? -10 * s : idleFootOffset),
    },
    // 6: RFoot
    {
      x: x + 8 * s - (isJumping ? 4 * s : legSwing * s) + idleOffsetX * 0.3,
      y: y + (isJumping ? -10 * s : -idleFootOffset),
    },
  ];

  // Snappy lerping: points move to targets with variable stiffness
  const baseSpeed = 16 * dt;
  stick.points.forEach((p, i) => {
    const stiffness = (i === 0 || i === 2) ? 1.2 : 1.0; // Head and Pelvis are more "driven"
    const speed = baseSpeed * stiffness;
    p.x += (targets[i].x - p.x) * speed;
    p.y += (targets[i].y - p.y) * speed;
    // Dampening old positions to prevent oscillation when following targets
    p.oldX = p.x - (targets[i].x - p.x) * 0.05;
    p.oldY = p.y - (targets[i].y - p.y) * 0.05;
  });
}