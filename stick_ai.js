/*
stick_ai.js

Handles autonomous behavior for stick figures, including movement, 
combat, and interaction with desktop apps/windows.
*/

export function updateAIForStick(stick, dt, width, height, input, desktop, groundY, sticks, gunShotSound) {
  stick.stateTimer += dt;

  // --- Gravity and Grounding for Stick's Anchor Position ---
  // This ensures the stick figure falls when walking off ledges and lands correctly on windows/objects.
  const gravity = 1000;
  if (typeof stick.vel.y !== 'number') stick.vel.y = 0;

  // Apply gravity to the anchor point while not being manipulated
  if (!stick.dragging && !stick.holdingCursor) {
    stick.vel.y += gravity * dt;
    stick.pos.y += stick.vel.y * dt;
  }

  // Determine the highest surface directly beneath the stickman
  let surfaceY = groundY;
  const feetY = stick.pos.y;

  // If jailed, restrict AI surface detection to the jail window's floor
  if (stick.jailedWindowId) {
    const win = desktop.windows.find(w => w.id === stick.jailedWindowId);
    if (win && !win.closed && !win.minimized) {
      surfaceY = win.y + win.height - 12;
    } else {
      stick.jailedWindowId = null;
    }
  }

  // Check all open windows for potential landing surfaces (tops and internal floors)
  desktop.windows.forEach((win) => {
    if (stick.jailedWindowId) return; // Jailed stickmen only care about their jail floor
    if (win.closed || win.minimized) return;
    if (stick.pos.x >= win.x && stick.pos.x <= win.x + win.width) {
      // Title bar top
      if (win.y >= feetY - 10 && win.y < surfaceY) {
        surfaceY = win.y;
      }
      // Internal floor (for apps like Paint where stickmen can walk inside)
      const floorY = win.y + win.height - 5;
      if (floorY >= feetY - 10 && floorY < surfaceY) {
        surfaceY = floorY;
      }
    }
  });

  // Check all world shapes for surfaces
  desktop.shapes.forEach((s) => {
    let top, left, right;
    if (s.type === 'circle' || s.type === 'bouncyball') {
      left = s.x - s.radius;
      right = s.x + s.radius;
      top = s.y - s.radius;
    } else {
      left = s.x;
      right = s.x + (s.width || 0);
      top = s.y;
    }
    if (stick.pos.x >= left && stick.pos.x <= right) {
      if (top >= feetY - 10 && top < surfaceY) {
        surfaceY = top;
      }
    }
  });

  // Collision resolution: snap to surface if we've fallen onto or through it
  if (stick.pos.y >= surfaceY) {
    stick.pos.y = surfaceY;
    stick.vel.y = 0;
    // Transition from jump back to idle once landing occurs
    if (stick.state === 'jump' && stick.stateTimer > 0.15) {
      stick.setState('idle');
    }
  }

  // Global settings flags
  const allowStickOpenApps = desktop.settings && desktop.settings.allowStickOpenApps !== false;
  const stickFightEachOther = desktop.settings && desktop.settings.stickFightEachOther;

  // 1. App Interaction Logic
  if (allowStickOpenApps && stick.state !== 'ragdoll' && !stick.dragging) {
    const activeWin = desktop.windows.find(w => !w.closed && !w.minimized && 
      stick.pos.x >= w.x - 20 && stick.pos.x <= w.x + w.width + 20 &&
      stick.pos.y >= w.y - 50 && stick.pos.y <= w.y + w.height + 20);

    if (activeWin) {
      // Targeted UI interaction
      if (!stick.uiTargetTimer) stick.uiTargetTimer = 0;
      stick.uiTargetTimer -= dt;

      if (stick.uiTargetTimer <= 0) {
        // Pick a random target inside the window's interactive region
        const margin = 30;
        stick.uiTarget = {
          x: activeWin.x + margin + Math.random() * (activeWin.width - margin * 2),
          y: activeWin.y + 40 + Math.random() * (activeWin.height - 60)
        };
        stick.uiTargetTimer = 1.5 + Math.random() * 3;
      }

      if (stick.uiTarget) {
        const dx = stick.uiTarget.x - stick.pos.x;
        const dy = stick.uiTarget.y - (stick.pos.y - 30); // Reach toward Y
        
        // Move horizontally
        if (Math.abs(dx) > 15) {
          stick.vel.x = Math.sign(dx) * 70 * stick.speedScale;
          stick.facing = Math.sign(dx);
          stick.setState('run');
        } else {
          stick.vel.x *= 0.5;
          
          // Reach/Jump logic for vertical targets
          if (dy < -40 && stick.state !== 'jump') {
            stick.jump();
            stick.showEmote('⤴️', 0.5);
          }

          // Interact when close
          if (Math.abs(dx) < 25 && Math.abs(dy) < 45 && Math.random() < 0.1) {
            const fakeInput = { 
              cursor: { x: stick.uiTarget.x, y: stick.uiTarget.y }, 
              justClicked: true, 
              pointerDown: true,
              frameEnd: () => {}
            };
            desktop.handleAppInteraction(activeWin, stick.uiTarget.x, stick.uiTarget.y, fakeInput, { width, height });
            if (activeWin.appId === 'paint') desktop.addPaintStroke(stick.uiTarget.x, stick.uiTarget.y);
            
            // Random Typing for specific apps
            if (['aol', 'clippy', 'console'].includes(activeWin.appId)) {
              const chars = "abcdefghijklmnopqrstuvwxyz ";
              const char = chars[Math.floor(Math.random() * chars.length)];
              if (activeWin.appId === 'aol') activeWin.chatDraft = (activeWin.chatDraft || '') + char;
              if (activeWin.appId === 'clippy') activeWin.clippyDraft = (activeWin.clippyDraft || '') + char;
              if (activeWin.appId === 'console') activeWin.consoleInput = (activeWin.consoleInput || '') + char;
              if (Math.random() < 0.2) {
                if (activeWin.appId === 'aol') desktop.sendAolMessage(activeWin);
                if (activeWin.appId === 'clippy') desktop.sendClippyMessage(activeWin);
                if (activeWin.appId === 'console') { desktop.runConsoleCommand(activeWin, activeWin.consoleInput); activeWin.consoleInput = ''; }
              }
            }
            stick.showEmote('🖱️', 0.6);
            stick.uiTargetTimer = 0.5; // Quick refresh after click
          }
        }
      }
    } else if (!activeWin && stick.appOpenCooldown <= 0 && Math.random() < dt * 0.05) {
       // Stick is not over an app: chance to walk towards an icon and "double click" it
       const targetIcon = desktop.icons[Math.floor(Math.random() * desktop.icons.length)];
       if (targetIcon) {
         const dx = targetIcon.x + 24 - stick.pos.x;
         if (Math.abs(dx) < 30) {
           desktop.ensureWindow(targetIcon.appId, { width, height });
           stick.appOpenCooldown = 5 + Math.random() * 5;
           stick.showEmote('💡', 0.8);
         } else {
           stick.vel.x = Math.sign(dx) * 60 * stick.speedScale;
           stick.facing = Math.sign(dx);
           stick.setState('run');
         }
       }
    }
  }

  // 2. Combat / Interaction
  if (stick.weapon && stick.state !== 'ragdoll' && !stick.dragging) {
    if (stickFightEachOther) {
      // Fight other stickmen (Existing logic)
      const otherSticks = sticks.filter(s => s !== stick && !s.dead);
      if (otherSticks.length > 0) {
        let closest = null;
        let minDist = 300;
        otherSticks.forEach(os => {
          const d = Math.hypot(os.pos.x - stick.pos.x, os.pos.y - stick.pos.y);
          if (d < minDist) {
            minDist = d;
            closest = os;
          }
        });

        if (closest) {
          const dx = closest.pos.x - stick.pos.x;
          stick.facing = Math.sign(dx);
          if (minDist < 60) {
            stick.setState('attack');
            // enforce a per-stick cooldown to avoid rapid spam (ms)
            const now = performance.now();
            const cooldown = (stick.weapon === 'gun') ? 700 : 420; // gun slower than melee
            if (stick.stateTimer > 0.5 && (now - (stick.lastWeaponFire || 0) > cooldown)) {
              stick.useWeapon({ sticks, input, gunShotSound, desktop });
              stick.stateTimer = 0;
              stick.lastWeaponFire = now;
            }
          } else {
            stick.vel.x = stick.facing * 80 * stick.speedScale;
            stick.setState('run');
          }
        }
      }
    } else {
      // Fight the USER / CURSOR
      const dx = input.cursor.x - stick.pos.x;
      const dy = input.cursor.y - (stick.pos.y - 30);
      const dist = Math.hypot(dx, dy);
      
      stick.facing = Math.sign(dx || 1);
      
      // If cursor is within range, attack it
      const range = stick.weapon === 'gun' ? 500 : 80;
      if (dist < range) {
        stick.setState('attack');
        // per-stick cooldown so the stickman can't spam the cursor
        const now = performance.now();
        const cooldown = (stick.weapon === 'gun') ? 700 : 420; // ms
        if (stick.stateTimer > 0.4 && (now - (stick.lastWeaponFire || 0) > cooldown)) {
          stick.useWeapon({ sticks, input, gunShotSound, desktop });
          stick.stateTimer = 0;
          stick.lastWeaponFire = now;
        }
      } else {
        // Chase the cursor if far away
        stick.vel.x = stick.facing * 90 * stick.speedScale;
        stick.setState('run');
      }
    }
  }

  // 3. Spontaneous Cursor Interaction (Leaping/Grabbing)
  if (!stick.holdingCursor && !stick.dragging && stick.state !== 'ragdoll' && !stick.dead) {
    const dx = input.cursor.x - stick.pos.x;
    const dy = input.cursor.y - (stick.pos.y - 40 * stick.scale);
    const dist = Math.hypot(dx, dy);

    // If cursor is close and moving, stickman might get "curious" and try to catch it
    if (dist < 100 * stick.scale && Math.random() < dt * 0.4) {
      if (dist < 35 * stick.scale) {
        // Close enough to grab!
        stick.holdingCursor = true;
        stick.cursorHoldPointIdx = Math.random() > 0.5 ? 3 : 4; // Grab with L or R hand
        stick.setState('ragdoll');
        stick.showEmote('✊', 0.8);
        stick.mood = 'happy';
        stick.shakeAccumulator = 0;
      } else {
        // Leap toward it
        stick.facing = Math.sign(dx);
        stick.vel.x = stick.facing * 160 * stick.speedScale;
        if (dy < -20 && stick.state !== 'jump') {
          stick.jump();
          stick.showEmote('🎯', 0.5);
        }
      }
    }
  }

  // 4. Basic Movement State Machine
  if (stick.state === 'idle') {
    stick.vel.x *= 0.8;
    if (stick.stateTimer > 2 + Math.random() * 3) {
      stick.wander();
    }
  } else if (stick.state === 'walk' || stick.state === 'run') {
    stick.pos.x += stick.vel.x * dt;
    stick.walkTimer -= dt;
    if (stick.walkTimer <= 0 && stick.state !== 'attack') {
      stick.setState('idle');
    }
    // Edge bounce
    let minX = 20, maxX = width - 20;
    if (stick.jailedWindowId) {
      const win = desktop.windows.find(w => w.id === stick.jailedWindowId);
      if (win) {
        minX = win.x + 12;
        maxX = win.x + win.width - 12;
      }
    }

    if (stick.pos.x < minX || stick.pos.x > maxX) {
      stick.vel.x *= -1;
      stick.facing *= -1;
      // Force snap to edge
      stick.pos.x = Math.max(minX, Math.min(maxX, stick.pos.x));
    }
  } else if (stick.state === 'attack') {
    stick.vel.x *= 0.5;
    if (stick.stateTimer > 0.6) {
      stick.setState('idle');
    }
  }
}

export function useWeaponForStick(stick, { sticks, input, gunShotSound, desktop }) {
  if (!stick.weapon) return;

  const stickFightEachOther = desktop.settings && desktop.settings.stickFightEachOther;
  const reach = stick.weapon === 'gun' || stick.weapon === 'laser' ? 500 : 70;
  const damage = stick.weapon === 'gun' ? 35 : (stick.weapon === 'knife' ? 20 : 15);

  if (!stickFightEachOther) {
    // Attack the USER / CURSOR
    const dx = input.cursor.x - stick.pos.x;
    const dy = input.cursor.y - (stick.pos.y - 30);
    const dist = Math.hypot(dx, dy);

    if (dist < reach) {
      if (stick.weapon === 'gun') {
        if (gunShotSound && desktop.settings && !desktop.settings.muteAllSound) {
          gunShotSound.currentTime = 0;
          gunShotSound.play();
        }
        desktop.spawnGunBurst('muzzle', stick.points[4].x, stick.points[4].y, dx, dy);
        
        // Fire bullet towards cursor
        const ang = Math.atan2(dy, dx);
        desktop.bullets.push({
          x: stick.points[4].x,
          y: stick.points[4].y,
          vx: Math.cos(ang) * 900,
          vy: Math.sin(ang) * 900,
          life: 1.2,
          owner: stick
        });
        stick.showEmote('🎯', 0.4);
      } else {
        // Knife/Hand attack on cursor? Just a gesture
        stick.showEmote('🔪', 0.4);
      }
    }
    return;
  }

  // Find target (Sticks)
  const targets = sticks.filter(s => s !== stick && !s.dead);
  targets.forEach(target => {
    const dx = target.pos.x - stick.pos.x;
    const dy = target.pos.y - stick.pos.y;
    const dist = Math.hypot(dx, dy);

    if (dist < reach && Math.sign(dx) === stick.facing) {
      if (stick.weapon === 'gun') {
        if (gunShotSound && desktop.settings && !desktop.settings.muteAllSound) {
          gunShotSound.currentTime = 0;
          gunShotSound.play();
        }
        desktop.spawnGunBurst('muzzle', stick.points[4].x, stick.points[4].y, dx, dy);
        desktop.bullets.push({
          x: stick.points[4].x,
          y: stick.points[4].y,
          vx: Math.sign(dx) * 800,
          vy: (Math.random() - 0.5) * 50,
          life: 1.0,
          owner: stick
        });
      }
      
      target.applyDamage(damage, desktop);
      target.setState('ragdoll');
      target.recoveryTimer = 1.5;
      target.showEmote('💥', 0.5);
    }
  });
}