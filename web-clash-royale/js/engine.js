/* ==========================================
   CLASH ROYALE CLONE - GAME ENGINE
   ========================================== */

class GameEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    
    // Set fixed virtual resolution for game math consistency
    this.width = 360;
    this.height = 600;
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    // Define River and Bridge zones
    this.riverY = 300;
    this.riverHeight = 24;
    this.bridges = [
      { x: 75, y: 300, width: 34, height: 26, left: 58, right: 92 },
      { x: 285, y: 300, width: 34, height: 26, left: 268, right: 302 }
    ];

    this.gameState = 'idle'; // 'playing', 'sudden_death', 'gameover'
    
    this.units = [];
    this.towers = [];
    this.projectiles = [];
    this.particles = [];
    this.activeSpells = [];
    this.floatingTexts = [];
    
    this.playerCrowns = 0;
    this.botCrowns = 0;
    this.screenShakeTime = 0;
    this.screenShakeIntensity = 0;
    
    this.lastTime = 0;
    this.waterOffset = 0; // scroll wave offsets
    this.activeDragCoord = null;   // logical coordinates {x, y}
    this.activeDragCardId = null;  // card id string
    this.dragTeam = 'blue';
    this.onGameOverCallback = null;
    this.onCrownChangeCallback = null;
  }

  // Setup initial battle towers
  initTowers() {
    this.towers = [
      // PLAYER TOWERS (Blue team, bottom side)
      {
        id: 'p_king',
        type: 'king',
        team: 'blue',
        x: 180,
        y: 535,
        hp: TOWER_STATS.king.hp,
        maxHp: TOWER_STATS.king.hp,
        range: TOWER_STATS.king.range,
        damage: TOWER_STATS.king.damage,
        hitSpeed: TOWER_STATS.king.hitSpeed,
        radius: TOWER_STATS.king.radius,
        active: true,
        lastAttackTime: 0,
        target: null
      },
      {
        id: 'p_left',
        type: 'princess',
        team: 'blue',
        x: 80,
        y: 450,
        hp: TOWER_STATS.princess.hp,
        maxHp: TOWER_STATS.princess.hp,
        range: TOWER_STATS.princess.range,
        damage: TOWER_STATS.princess.damage,
        hitSpeed: TOWER_STATS.princess.hitSpeed,
        radius: TOWER_STATS.princess.radius,
        active: true,
        lastAttackTime: 0,
        target: null
      },
      {
        id: 'p_right',
        type: 'princess',
        team: 'blue',
        x: 280,
        y: 450,
        hp: TOWER_STATS.princess.hp,
        maxHp: TOWER_STATS.princess.hp,
        range: TOWER_STATS.princess.range,
        damage: TOWER_STATS.princess.damage,
        hitSpeed: TOWER_STATS.princess.hitSpeed,
        radius: TOWER_STATS.princess.radius,
        active: true,
        lastAttackTime: 0,
        target: null
      },

      // BOT TOWERS (Red team, top side)
      {
        id: 'b_king',
        type: 'king',
        team: 'red',
        x: 180,
        y: 65,
        hp: TOWER_STATS.king.hp,
        maxHp: TOWER_STATS.king.hp,
        range: TOWER_STATS.king.range,
        damage: TOWER_STATS.king.damage,
        hitSpeed: TOWER_STATS.king.hitSpeed,
        radius: TOWER_STATS.king.radius,
        active: true,
        lastAttackTime: 0,
        target: null
      },
      {
        id: 'b_left',
        type: 'princess',
        team: 'red',
        x: 80,
        y: 150,
        hp: TOWER_STATS.princess.hp,
        maxHp: TOWER_STATS.princess.hp,
        range: TOWER_STATS.princess.range,
        damage: TOWER_STATS.princess.damage,
        hitSpeed: TOWER_STATS.princess.hitSpeed,
        radius: TOWER_STATS.princess.radius,
        active: true,
        lastAttackTime: 0,
        target: null
      },
      {
        id: 'b_right',
        type: 'princess',
        team: 'red',
        x: 280,
        y: 150,
        hp: TOWER_STATS.princess.hp,
        maxHp: TOWER_STATS.princess.hp,
        range: TOWER_STATS.princess.range,
        damage: TOWER_STATS.princess.damage,
        hitSpeed: TOWER_STATS.princess.hitSpeed,
        radius: TOWER_STATS.princess.radius,
        active: true,
        lastAttackTime: 0,
        target: null
      }
    ];
  }

  // Start the battle simulation
  start() {
    this.units = [];
    this.projectiles = [];
    this.particles = [];
    this.activeSpells = [];
    this.floatingTexts = [];
    this.playerCrowns = 0;
    this.botCrowns = 0;
    this.initTowers();
    this.gameState = 'playing';
    this.lastTime = performance.now();
    this.animate();
  }

  stop() {
    this.gameState = 'idle';
  }

  triggerScreenShake(intensity = 5, duration = 200) {
    this.screenShakeIntensity = intensity;
    this.screenShakeTime = duration;
  }

  // Spawning unit into the game loop
  spawnUnit(type, x, y, team) {
    const stats = UNIT_STATS[type];
    if (!stats) return;

    const unit = {
      id: Math.random().toString(36).substr(2, 9),
      type: type,
      name: stats.name,
      team: team, // 'blue' or 'red'
      x: x,
      y: y,
      hp: stats.hp,
      maxHp: stats.hp,
      speed: stats.speed,
      range: stats.range,
      damage: stats.damage,
      hitSpeed: stats.hitSpeed,
      targets: stats.targets,
      isAir: stats.isAir,
      isSplash: stats.isSplash || false,
      splashRadius: stats.splashRadius || 0,
      radius: stats.radius,
      color: stats.color,
      icon: stats.icon,
      
      // AI and status variables
      target: null,
      lastAttackTime: 0,
      state: 'moving', // 'moving', 'attacking'
      angle: team === 'blue' ? -Math.PI / 2 : Math.PI / 2,
      targetBridge: null // cache river bridge selection
    };

    this.units.push(unit);
    this.createSpawnParticles(x, y, team === 'blue' ? '#3498db' : '#e74c3c');
  }

  // Spawning active spell onto the coordinates
  spawnSpell(type, targetX, targetY, team) {
    const stats = SPELL_STATS[type];
    if (!stats) return;

    // Spell starts flying from player's king tower or top
    const startX = team === 'blue' ? 180 : 180;
    const startY = team === 'blue' ? 535 : 65;

    const spell = {
      id: Math.random().toString(36).substr(2, 9),
      type: type,
      team: team,
      x: startX,
      y: startY,
      targetX: targetX,
      targetY: targetY,
      startX: startX,
      startY: startY,
      startTime: performance.now(),
      travelTime: stats.travelTime,
      radius: stats.radius,
      damage: stats.damage,
      towerDamage: stats.towerDamage,
      color: stats.color,
      particleColor: stats.particleColor,
      icon: stats.icon
    };

    this.activeSpells.push(spell);
    if (window.gameAudio) window.gameAudio.playSpell();
  }

  // Floating text indicator
  spawnFloatingText(text, x, y, color = '#ffffff') {
    this.floatingTexts.push({
      text: text,
      x: x,
      y: y,
      color: color,
      alpha: 1.0,
      vy: -0.8 - Math.random() * 0.5,
      vx: (Math.random() - 0.5) * 0.5
    });
  }

  // Particle Generators
  createSpawnParticles(x, y, color) {
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 1.5;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: color,
        size: 2 + Math.random() * 3,
        alpha: 1.0,
        decay: 0.03 + Math.random() * 0.04
      });
    }
  }

  createHitParticles(x, y, color) {
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.8 + Math.random() * 2.0;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.5, // push up slightly
        color: color,
        size: 1.5 + Math.random() * 2,
        alpha: 1.0,
        decay: 0.04 + Math.random() * 0.05
      });
    }
  }

  createExplosionParticles(x, y, radius, color) {
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * radius;
      const speed = 1.0 + Math.random() * 3.0;
      this.particles.push({
        x: x + Math.cos(angle) * dist * 0.3,
        y: y + Math.sin(angle) * dist * 0.3,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: color,
        size: 3 + Math.random() * 4,
        alpha: 1.0,
        decay: 0.02 + Math.random() * 0.03
      });
    }
  }

  // Update Game Physics
  update(dt) {
    if (this.gameState === 'idle') return;

    // Scroll river animation
    this.waterOffset += dt * 35;

    // Update screen shake decay
    if (this.screenShakeTime > 0) {
      this.screenShakeTime -= dt * 1000;
      if (this.screenShakeTime <= 0) {
        this.screenShakeIntensity = 0;
      }
    }

    this.updateSpells(dt);
    this.updateProjectiles(dt);
    this.updateUnits(dt);
    this.updateTowers(dt);
    this.updateParticles(dt);
    this.updateFloatingTexts(dt);
  }

  // Spell Flying & Impact logic
  updateSpells(dt) {
    const now = performance.now();
    for (let i = this.activeSpells.length - 1; i >= 0; i--) {
      const spell = this.activeSpells[i];
      const elapsed = now - spell.startTime;
      const t = Math.min(1.0, elapsed / spell.travelTime);
      
      // Calculate current fly position
      spell.x = spell.startX + (spell.targetX - spell.startX) * t;
      spell.y = spell.startY + (spell.targetY - spell.startY) * t;
      // Arc formula for height visual effect
      spell.arcY = spell.y - Math.sin(t * Math.PI) * 100;

      // Spawn trail particles
      if (Math.random() < 0.4) {
        this.particles.push({
          x: spell.x,
          y: spell.arcY,
          vx: (Math.random() - 0.5) * 0.5,
          vy: 0.5,
          color: spell.particleColor,
          size: 2 + Math.random() * 3,
          alpha: 0.8,
          decay: 0.05
        });
      }

      if (t >= 1.0) {
        // Explode!
        this.executeSpellImpact(spell);
        this.activeSpells.splice(i, 1);
      }
    }
  }

  executeSpellImpact(spell) {
    this.createExplosionParticles(spell.targetX, spell.targetY, spell.radius, spell.particleColor);
    this.triggerScreenShake(spell.type === 'fireball' ? 6 : 3, 250);
    if (window.gameAudio) window.gameAudio.playExplosion();

    // Damage units in area
    this.units.forEach(unit => {
      if (unit.team !== spell.team) {
        const dist = Math.hypot(unit.x - spell.targetX, unit.y - spell.targetY);
        if (dist <= spell.radius + unit.radius) {
          unit.hp -= spell.damage;
          this.spawnFloatingText(`-${spell.damage}`, unit.x, unit.y - 12, '#ffffff');
          this.createHitParticles(unit.x, unit.y, '#e74c3c');
        }
      }
    });

    // Damage towers in area (towers take reduced spell damage)
    this.towers.forEach(tower => {
      if (tower.active && tower.team !== spell.team) {
        const dist = Math.hypot(tower.x - spell.targetX, tower.y - spell.targetY);
        if (dist <= spell.radius + tower.radius) {
          tower.hp -= spell.towerDamage;
          this.spawnFloatingText(`-${spell.towerDamage}`, tower.x, tower.y - 20, '#ffcc00');
          this.createHitParticles(tower.x, tower.y, '#f39c12');
          
          if (tower.hp <= 0) {
            this.destroyTower(tower);
          }
        }
      }
    });
  }

  // Projectile movements
  updateProjectiles(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      
      // Check if target is dead
      let targetActive = false;
      let tx = proj.targetX;
      let ty = proj.targetY;
      
      if (proj.targetType === 'unit') {
        const found = this.units.find(u => u.id === proj.targetId);
        if (found) {
          targetActive = true;
          tx = found.x;
          ty = found.y;
        }
      } else if (proj.targetType === 'tower') {
        const found = this.towers.find(t => t.id === proj.targetId && t.active);
        if (found) {
          targetActive = true;
          tx = found.x;
          ty = found.y;
        }
      }

      // Fly towards target coordinate
      const dx = tx - proj.x;
      const dy = ty - proj.y;
      const dist = Math.hypot(dx, dy);
      const step = proj.speed * dt * 120; // frame independent scaling

      if (dist <= step) {
        // Hit target!
        if (targetActive) {
          this.damageTarget(proj);
        }
        this.projectiles.splice(i, 1);
      } else {
        // Move towards
        proj.x += (dx / dist) * step;
        proj.y += (dy / dist) * step;
        // Projectile arc for arches
        const startX = proj.startX !== undefined ? proj.startX : proj.x;
        const startY = proj.startY !== undefined ? proj.startY : proj.y;
        const totalDist = Math.hypot(tx - startX, ty - startY);
        if (totalDist > 10) {
          const currentDist = Math.hypot(tx - proj.x, ty - proj.y);
          const progress = Math.max(0, Math.min(1.0, 1.0 - (currentDist / totalDist)));
          const maxArcHeight = Math.min(50, totalDist * 0.22); // cap height peak at 50
          proj.arcOffset = -Math.sin(progress * Math.PI) * maxArcHeight;
        } else {
          proj.arcOffset = 0;
        }
      }
    }
  }

  damageTarget(proj) {
    if (proj.targetType === 'unit') {
      const unit = this.units.find(u => u.id === proj.targetId);
      if (unit) {
        if (proj.isSplash) {
          this.dealAreaDamage(proj.x, proj.y, proj.splashRadius, proj.damage, proj.team);
        } else {
          unit.hp -= proj.damage;
          this.spawnFloatingText(`-${proj.damage}`, unit.x, unit.y - 12, '#ffffff');
          this.createHitParticles(unit.x, unit.y, '#e74c3c');
        }
      }
    } else if (proj.targetType === 'tower') {
      const tower = this.towers.find(t => t.id === proj.targetId && t.active);
      if (tower) {
        if (proj.isSplash) {
          this.dealAreaDamage(proj.x, proj.y, proj.splashRadius, proj.damage, proj.team);
        } else {
          tower.hp -= proj.damage;
          this.spawnFloatingText(`-${proj.damage}`, tower.x, tower.y - 20, '#ffffff');
          this.createHitParticles(tower.x, tower.y, '#f1c40f');
          
          if (tower.hp <= 0) {
            this.destroyTower(tower);
          }
        }
      }
    }
    
    if (window.gameAudio && Math.random() < 0.5) window.gameAudio.playAttackMelee();
  }

  dealAreaDamage(cx, cy, radius, damage, team) {
    this.createExplosionParticles(cx, cy, radius, '#e67e22');
    
    // Damage units
    this.units.forEach(unit => {
      if (unit.team !== team) {
        const d = Math.hypot(unit.x - cx, unit.y - cy);
        if (d <= radius + unit.radius) {
          unit.hp -= damage;
          this.spawnFloatingText(`-${damage}`, unit.x, unit.y - 12, '#ffffff');
          this.createHitParticles(unit.x, unit.y, '#e74c3c');
        }
      }
    });

    // Damage towers
    this.towers.forEach(tower => {
      if (tower.active && tower.team !== team) {
        const d = Math.hypot(tower.x - cx, tower.y - cy);
        if (d <= radius + tower.radius) {
          tower.hp -= damage;
          this.spawnFloatingText(`-${damage}`, tower.x, tower.y - 20, '#ffcc00');
          this.createHitParticles(tower.x, tower.y, '#f39c12');
          if (tower.hp <= 0) {
            this.destroyTower(tower);
          }
        }
      }
    });
  }

  // Destroying a Tower
  destroyTower(tower) {
    tower.active = false;
    tower.hp = 0;
    this.createExplosionParticles(tower.x, tower.y, 45, '#e67e22');
    this.triggerScreenShake(12, 500);
    if (window.gameAudio) window.gameAudio.playTowerDestroyed();

    if (tower.team === 'blue') {
      this.botCrowns++;
    } else {
      this.playerCrowns++;
    }

    if (this.onCrownChangeCallback) {
      this.onCrownChangeCallback(this.playerCrowns, this.botCrowns);
    }

    // Activate the King Tower defense if any side princess tower is destroyed
    const teamTowers = this.towers.filter(t => t.team === tower.team);
    const king = teamTowers.find(t => t.type === 'king');
    if (king && king.active) {
      king.range = TOWER_STATS.king.range + 30; // boost range defensively
    }

    // GAME OVER CONDITIONS
    // 1. King tower destroyed = Immediate Game Over (3 crowns)
    if (tower.type === 'king') {
      if (tower.team === 'blue') {
        this.botCrowns = 3;
        this.endGame('bot');
      } else {
        this.playerCrowns = 3;
        this.endGame('player');
      }
      return;
    }

    // 2. Sudden death win condition: first crown wins!
    if (this.gameState === 'sudden_death') {
      this.endGame(this.playerCrowns > this.botCrowns ? 'player' : 'bot');
    }
  }

  endGame(winner) {
    this.gameState = 'gameover';
    if (this.onGameOverCallback) {
      this.onGameOverCallback(winner, this.playerCrowns, this.botCrowns);
    }
  }

  // Units logic (move, target, collide, fight)
  updateUnits(dt) {
    const now = performance.now();

    // 1. Resolve targeting & movements
    for (let i = this.units.length - 1; i >= 0; i--) {
      const unit = this.units[i];

      // Remove dead units
      if (unit.hp <= 0) {
        this.createExplosionParticles(unit.x, unit.y, 10, '#bdc3c7');
        this.units.splice(i, 1);
        continue;
      }

      // Check target valid
      let currentTarget = this.checkTargetValid(unit);
      if (!currentTarget) {
        currentTarget = this.findBestTarget(unit);
      }
      unit.target = currentTarget;

      if (!currentTarget) {
        unit.state = 'moving';
        continue; // Nowhere to go!
      }

      // Calculate pathing (incorporating river & bridges)
      let targetX = currentTarget.x;
      let targetY = currentTarget.y;
      
      const onOppositeSide = (unit.team === 'blue' && unit.y > this.riverY && targetY < this.riverY) ||
                             (unit.team === 'red' && unit.y < this.riverY && targetY > this.riverY);

      if (onOppositeSide && !unit.isAir) {
        // Need to cross bridge!
        if (!unit.targetBridge) {
          // Select closest bridge on x axis
          unit.targetBridge = this.bridges.reduce((prev, curr) => 
            Math.abs(curr.x - unit.x) < Math.abs(prev.x - unit.x) ? curr : prev
          );
        }

        // Move towards bridge center
        const bridgeX = unit.targetBridge.x;
        const bridgeY = unit.targetBridge.y;
        const distToBridge = Math.hypot(bridgeX - unit.x, bridgeY - unit.y);

        if (distToBridge > 15) {
          // Guide unit into the bridge entrance channel to avoid clip-walking into the river
          if (unit.team === 'blue' && unit.y > this.riverY + 12) {
            targetX = bridgeX;
            targetY = this.riverY + 14; // Line up south entrance
          } else if (unit.team === 'red' && unit.y < this.riverY - 12) {
            targetX = bridgeX;
            targetY = this.riverY - 14; // Line up north entrance
          } else {
            targetX = bridgeX;
            targetY = bridgeY;
          }
        } else {
          // Close enough to slip across, target the enemy side bridge node
          targetX = bridgeX;
          targetY = unit.team === 'blue' ? bridgeY - 10 : bridgeY + 10;
        }
      } else {
        // Cleared river or is flying, clear bridge lock
        unit.targetBridge = null;
      }

      // Calculate distance to actual target (for attack check)
      const distToActualTarget = Math.hypot(currentTarget.x - unit.x, currentTarget.y - unit.y);
      const attackRange = unit.range;

      if (distToActualTarget <= attackRange + currentTarget.radius + unit.radius - 5) {
        // Attacking!
        unit.state = 'attacking';
        
        // Face the target
        unit.angle = Math.atan2(currentTarget.y - unit.y, currentTarget.x - unit.x);

        if (now - unit.lastAttackTime >= unit.hitSpeed * 1000) {
          this.executeUnitAttack(unit, currentTarget, now);
        }
      } else {
        // Moving
        unit.state = 'moving';
        
        // Move towards pathing target
        const dx = targetX - unit.x;
        const dy = targetY - unit.y;
        const dist = Math.hypot(dx, dy);
        
        if (dist > 2) {
          unit.angle = Math.atan2(dy, dx);
          const step = unit.speed * dt * 60;
          unit.x += (dx / dist) * step;
          unit.y += (dy / dist) * step;
        }
      }
    }

    // 2. Swarm separation logic (collision push)
    for (let i = 0; i < this.units.length; i++) {
      for (let j = i + 1; j < this.units.length; j++) {
        const u1 = this.units[i];
        const u2 = this.units[j];

        // Push away if overlapping on ground
        if (!u1.isAir && !u2.isAir) {
          const dist = Math.hypot(u2.x - u1.x, u2.y - u1.y);
          const minDist = u1.radius + u2.radius;
          
          if (dist < minDist && dist > 0.1) {
            const overlap = minDist - dist;
            const pushX = ((u2.x - u1.x) / dist) * overlap * 0.15;
            const pushY = ((u2.y - u1.y) / dist) * overlap * 0.15;
            
            // Push units away from each other
            u1.x -= pushX;
            u1.y -= pushY;
            u2.x += pushX;
            u2.y += pushY;
          }
        }
      }
    }
  }

  // Attack trigger
  executeUnitAttack(unit, target, now) {
    unit.lastAttackTime = now;

    if (unit.range <= 25) {
      // Melee attack
      if (unit.isSplash) {
        this.dealAreaDamage(target.x, target.y, unit.splashRadius, unit.damage, unit.team);
      } else {
        target.hp -= unit.damage;
        this.spawnFloatingText(`-${unit.damage}`, target.x, target.y - (target.radius + 5), '#ffffff');
        this.createHitParticles(target.x, target.y, '#e74c3c');
        
        if (target.hp <= 0 && target.type === 'princess' || target.type === 'king') {
          this.destroyTower(target);
        }
      }
      
      if (window.gameAudio) window.gameAudio.playAttackMelee();
    } else {
      // Ranged attack (shoot projectile)
      const isSpellProjectile = unit.type === 'baby_dragon';
      
      const px = unit.x + Math.cos(unit.angle) * unit.radius;
      const py = unit.y + Math.sin(unit.angle) * unit.radius;

      const projectile = {
        id: Math.random().toString(36).substr(2, 9),
        type: isSpellProjectile ? 'fireball_mini' : 'arrow',
        team: unit.team,
        x: px,
        y: py,
        startX: px,
        startY: py,
        targetId: target.id,
        targetType: target.team ? 'unit' : 'tower',
        targetX: target.x,
        targetY: target.y,
        speed: 4.5,
        damage: unit.damage,
        isSplash: unit.isSplash,
        splashRadius: unit.splashRadius,
        color: unit.color
      };
      
      // Let's verify how target type is parsed
      if (target.maxHp && target.id.includes('_')) {
        projectile.targetType = 'tower';
      } else {
        projectile.targetType = 'unit';
      }

      this.projectiles.push(projectile);
      if (window.gameAudio) window.gameAudio.playAttackRanged();
    }
  }

  // Find target helper
  checkTargetValid(unit) {
    if (!unit.target) return null;
    
    // If target is unit
    if (unit.target.hp !== undefined && !unit.target.id.includes('_')) {
      const found = this.units.find(u => u.id === unit.target.id);
      if (found && found.hp > 0) {
        // check if still ground/air match
        if (unit.targets === 'towers') return null; // giants don't chase units
        return found;
      }
    } else {
      // Target is tower
      const found = this.towers.find(t => t.id === unit.target.id && t.active);
      if (found) return found;
    }
    return null;
  }

  findBestTarget(unit) {
    let bestTarget = null;
    let closestDist = Infinity;

    // A. Check for enemy units (if targeting "any")
    if (unit.targets === 'any') {
      this.units.forEach(enemy => {
        if (enemy.team !== unit.team) {
          // If ground unit, ignore air enemies
          if (enemy.isAir && !UNIT_STATS[unit.type].range > 30) {
            // Wait, archers and baby dragon target air. Knight/Skeletons/MiniPekka do not.
            // Let's use stats: if unit stats allows air.
            const stats = UNIT_STATS[unit.type];
            const canAttackAir = stats.range > 25 || stats.isAir; // simple rule: ranged/flying units can target air
            if (!canAttackAir) return; 
          }
          
          const d = Math.hypot(enemy.x - unit.x, enemy.y - unit.y);
          if (d < closestDist) {
            closestDist = d;
            bestTarget = enemy;
          }
        }
      });
    }

    // B. Check for active enemy towers
    this.towers.forEach(tower => {
      if (tower.active && tower.team !== unit.team) {
        // Force Princess towers to block King tower targeting (unless princess is dead)
        if (tower.type === 'king') {
          const sideTowersActive = this.towers.some(t => t.team === tower.team && t.type === 'princess' && t.active);
          if (sideTowersActive) return; // cannot attack king tower yet!
        }
        
        const d = Math.hypot(tower.x - unit.x, tower.y - unit.y);
        if (d < closestDist) {
          closestDist = d;
          bestTarget = tower;
        }
      }
    });

    return bestTarget;
  }

  // Active defensive towers attack logic
  updateTowers(dt) {
    const now = performance.now();
    
    this.towers.forEach(tower => {
      if (!tower.active) return;

      // Find target if none
      if (!tower.target || !this.isTowerTargetValid(tower)) {
        tower.target = this.findTowerTarget(tower);
      }

      if (tower.target) {
        // Attack when cooldown finishes
        if (now - tower.lastAttackTime >= tower.hitSpeed * 1000) {
          tower.lastAttackTime = now;
          
          const projectile = {
            id: Math.random().toString(36).substr(2, 9),
            type: 'arrow',
            team: tower.team,
            x: tower.x,
            y: tower.y - 10,
            startX: tower.x,
            startY: tower.y - 10,
            targetId: tower.target.id,
            targetType: 'unit',
            targetX: tower.target.x,
            targetY: tower.target.y,
            speed: 5.0,
            damage: tower.damage,
            isSplash: false,
            color: '#ffcc00'
          };
          
          this.projectiles.push(projectile);
          if (window.gameAudio) window.gameAudio.playAttackRanged();
        }
      }
    });
  }

  isTowerTargetValid(tower) {
    if (!tower.target) return false;
    const found = this.units.find(u => u.id === tower.target.id);
    if (!found || found.hp <= 0) return false;
    const dist = Math.hypot(found.x - tower.x, found.y - tower.y);
    return dist <= tower.range + found.radius;
  }

  findTowerTarget(tower) {
    let closestUnit = null;
    let closestDist = Infinity;

    this.units.forEach(unit => {
      if (unit.team !== tower.team) {
        const d = Math.hypot(unit.x - tower.x, unit.y - tower.y);
        if (d <= tower.range + unit.radius) {
          if (d < closestDist) {
            closestDist = d;
            closestUnit = unit;
          }
        }
      }
    });

    return closestUnit;
  }

  // Particles decay
  updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;
      p.alpha -= p.decay * dt * 60;
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  // Floating text update
  updateFloatingTexts(dt) {
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy * dt * 60;
      ft.x += ft.vx * dt * 60;
      ft.alpha -= 0.02 * dt * 60;
      if (ft.alpha <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  // Rendering Game Canvas
  render() {
    this.ctx.save();
    
    // Apply screen shake
    if (this.screenShakeTime > 0) {
      const dx = (Math.random() - 0.5) * this.screenShakeIntensity;
      const dy = (Math.random() - 0.5) * this.screenShakeIntensity;
      this.ctx.translate(dx, dy);
    }

    // 1. Draw grass background with alternating checkerboard blocks (darker and lighter green)
    const rows = 12;
    const cols = 8;
    const blockWidth = this.width / cols;
    const blockHeight = this.height / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        this.ctx.fillStyle = (r + c) % 2 === 0 ? '#1b4a1b' : '#235923'; // Curated forest greens
        this.ctx.fillRect(c * blockWidth, r * blockHeight, blockWidth, blockHeight);
      }
    }

    // Draw dirt lanes / paths
    this.ctx.fillStyle = '#6e5030';
    this.ctx.fillRect(58, 140, 34, 320); // Left lane path
    this.ctx.fillRect(268, 140, 34, 320); // Right lane path
    // Curve connects near King tower
    this.ctx.beginPath();
    this.ctx.ellipse(180, 460, 110, 20, 0, 0, Math.PI * 2);
    this.ctx.ellipse(180, 140, 110, 20, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // 2. Draw animated river
    const riverMinY = this.riverY - this.riverHeight / 2;
    // Base river color (deeper blue)
    this.ctx.fillStyle = '#1b4f72';
    this.ctx.fillRect(0, riverMinY, this.width, this.riverHeight);
    
    // Wave 1: Cyan/blue translucent sine wave sliding right
    this.ctx.fillStyle = 'rgba(41, 128, 185, 0.4)';
    this.ctx.beginPath();
    this.ctx.moveTo(0, riverMinY);
    for (let x = 0; x <= this.width; x += 10) {
      const y = riverMinY + 6 + Math.sin((x + this.waterOffset) * 0.05) * 4;
      this.ctx.lineTo(x, y);
    }
    this.ctx.lineTo(this.width, this.riverY + this.riverHeight / 2);
    this.ctx.lineTo(0, this.riverY + this.riverHeight / 2);
    this.ctx.closePath();
    this.ctx.fill();

    // Wave 2: Lighter teal sine wave sliding left
    this.ctx.fillStyle = 'rgba(52, 152, 219, 0.3)';
    this.ctx.beginPath();
    this.ctx.moveTo(0, riverMinY);
    for (let x = 0; x <= this.width; x += 10) {
      const y = riverMinY + 12 + Math.sin((x - this.waterOffset * 0.7) * 0.06) * 3;
      this.ctx.lineTo(x, y);
    }
    this.ctx.lineTo(this.width, this.riverY + this.riverHeight / 2);
    this.ctx.lineTo(0, this.riverY + this.riverHeight / 2);
    this.ctx.closePath();
    this.ctx.fill();

    // Draw river banks with dark stone/grass trim
    this.ctx.fillStyle = '#0f2c42';
    this.ctx.fillRect(0, riverMinY - 2, this.width, 2);
    this.ctx.fillRect(0, this.riverY + this.riverHeight / 2, this.width, 2);

    // 3. Draw Bridges
    this.bridges.forEach(b => {
      // Bridge base shadow
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      this.ctx.fillRect(b.x - b.width / 2, b.y - b.height / 2 + 4, b.width, b.height);

      // Wood base
      this.ctx.fillStyle = '#875a36'; // deep warm brown
      this.ctx.fillRect(b.x - b.width / 2, b.y - b.height / 2, b.width, b.height);
      
      // Draw bridge planks with lines
      this.ctx.strokeStyle = '#5a3a1f';
      this.ctx.lineWidth = 1.5;
      const numPlanks = 5;
      const plankW = b.width / numPlanks;
      for (let i = 0; i <= numPlanks; i++) {
        const px = b.x - b.width / 2 + i * plankW;
        this.ctx.beginPath();
        this.ctx.moveTo(px, b.y - b.height / 2);
        this.ctx.lineTo(px, b.y + b.height / 2);
        this.ctx.stroke();
      }

      // Draw side ropes / rails
      this.ctx.fillStyle = '#d35400';
      this.ctx.fillRect(b.x - b.width / 2, b.y - b.height / 2 - 2, b.width, 3);
      this.ctx.fillRect(b.x - b.width / 2, b.y + b.height / 2 - 1, b.width, 3);
    });

    // Draw grid markings / deployment zones boundaries
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    // River boundary lines
    this.ctx.moveTo(0, this.riverY - 12);
    this.ctx.lineTo(this.width, this.riverY - 12);
    this.ctx.moveTo(0, this.riverY + 12);
    this.ctx.lineTo(this.width, this.riverY + 12);
    // Vertical split
    this.ctx.moveTo(this.width / 2, 0);
    this.ctx.lineTo(this.width / 2, this.height);
    this.ctx.stroke();

    // === HIGH-END UPGRADES: DRAG BOUNDARY GRIDS & GHOST PREVIEWS ===
    if (this.activeDragCoord && this.activeDragCardId) {
      const dragCard = CARD_TEMPLATES[this.activeDragCardId];
      if (dragCard && dragCard.type === 'troop') {
        const leftTowerDead = !this.towers.find(t => t.id === 'b_left').active;
        const rightTowerDead = !this.towers.find(t => t.id === 'b_right').active;

        this.ctx.save();
        this.ctx.fillStyle = 'rgba(231, 76, 60, 0.15)';
        this.ctx.strokeStyle = 'rgba(231, 76, 60, 0.25)';
        this.ctx.lineWidth = 1.5;

        // 1. River is always invalid
        this.ctx.fillRect(0, this.riverY - 12, this.width, 24);

        // 2. Opponent territory overlay based on princess towers states
        if (leftTowerDead && rightTowerDead) {
          // both towers dead, player can deploy anywhere except river!
        } else if (leftTowerDead) {
          // left lane dead -> right half of enemy side is invalid
          this.ctx.fillRect(180, 0, 180, this.riverY - 12);
          this.ctx.beginPath();
          for (let x = 210; x < 360; x += 30) {
            this.ctx.moveTo(x, 0); this.ctx.lineTo(x, this.riverY - 12);
          }
          this.ctx.stroke();
        } else if (rightTowerDead) {
          // right lane dead -> left half of enemy side is invalid
          this.ctx.fillRect(0, 0, 180, this.riverY - 12);
          this.ctx.beginPath();
          for (let x = 30; x < 180; x += 30) {
            this.ctx.moveTo(x, 0); this.ctx.lineTo(x, this.riverY - 12);
          }
          this.ctx.stroke();
        } else {
          // both alive -> whole enemy half is invalid
          this.ctx.fillRect(0, 0, this.width, this.riverY - 12);
          this.ctx.beginPath();
          for (let x = 30; x < this.width; x += 30) {
            this.ctx.moveTo(x, 0); this.ctx.lineTo(x, this.riverY - 12);
          }
          this.ctx.stroke();
        }

        // Horizontal gridlines in invalid zones
        this.ctx.beginPath();
        for (let y = 30; y < this.riverY - 12; y += 30) {
          if (leftTowerDead && rightTowerDead) continue;
          this.ctx.moveTo(leftTowerDead ? 180 : 0, y);
          this.ctx.lineTo(rightTowerDead ? 180 : this.width, y);
        }
        this.ctx.stroke();

        this.ctx.restore();
      }
    }

    // Spawning Holographic Ghost preview
    if (this.activeDragCoord && this.activeDragCardId) {
      const dragCard = CARD_TEMPLATES[this.activeDragCardId];
      if (dragCard) {
        this.ctx.save();
        
        const gx = this.activeDragCoord.x;
        const gy = this.activeDragCoord.y;

        if (dragCard.type === 'spell') {
          // Spell target circle (radius from spelling templates)
          const spellStats = SPELL_STATS[dragCard.id];
          const radius = spellStats ? spellStats.radius : 50;
          
          this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
          this.ctx.lineWidth = 2;
          this.ctx.setLineDash([5, 5]);
          this.ctx.beginPath();
          this.ctx.arc(gx, gy, radius, 0, Math.PI * 2);
          this.ctx.stroke();
          
          this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
          this.ctx.fill();
        } else {
          // Troop base preview
          // If skeleton army, draw preview for circle cluster
          if (dragCard.id === 'skeleton_army') {
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            this.ctx.lineWidth = 1.5;
            this.ctx.setLineDash([3, 3]);
            this.ctx.beginPath();
            this.ctx.arc(gx, gy, 25, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
            
            // Draw tiny circles representing skeleton spots
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            for (let i = 0; i < 6; i++) {
              const angle = (i / 6) * Math.PI * 2;
              const sx = gx + Math.cos(angle) * 18;
              const sy = gy + Math.sin(angle) * 18;
              this.ctx.beginPath();
              this.ctx.arc(sx, sy, 5, 0, Math.PI * 2);
              this.ctx.fill();
            }
          } else {
            const unitStats = UNIT_STATS[dragCard.id] || UNIT_STATS['knight']; // fallback
            const radius = unitStats ? unitStats.radius : 11;
            
            // Outer white dashed ring
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
            this.ctx.lineWidth = 1.5;
            this.ctx.setLineDash([3, 3]);
            this.ctx.beginPath();
            this.ctx.arc(gx, gy, radius + 3, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.setLineDash([]); // clear

            // Translucent troop base body
            this.ctx.beginPath();
            this.ctx.arc(gx, gy, radius, 0, Math.PI * 2);
            this.ctx.fillStyle = 'rgba(52, 152, 219, 0.45)'; // player blue translucent
            this.ctx.fill();
          }
          
          // Draw card icon inside preview
          this.ctx.font = '14px Outfit';
          this.ctx.textAlign = 'center';
          this.ctx.textBaseline = 'middle';
          this.ctx.fillText(dragCard.icon, gx, gy);
        }

        this.ctx.restore();
      }
    }

    // 4. Draw spell target rings (active indicators)
    this.activeSpells.forEach(spell => {
      this.ctx.beginPath();
      this.ctx.arc(spell.targetX, spell.targetY, spell.radius, 0, Math.PI * 2);
      this.ctx.strokeStyle = spell.color;
      this.ctx.lineWidth = 1.5;
      this.ctx.stroke();
      
      this.ctx.fillStyle = `${spell.color}15`; // transparent fill
      this.ctx.fill();
    });

    // 5. Draw Towers
    this.towers.forEach(t => {
      if (!t.active) {
        // Draw destroyed tower ruins
        this.ctx.fillStyle = '#55595c';
        this.ctx.beginPath();
        this.ctx.arc(t.x, t.y, t.radius - 2, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Rubble detail lines
        this.ctx.fillStyle = 'rgba(0,0,0,0.2)';
        this.ctx.fillRect(t.x - 6, t.y - 6, 12, 12);

        this.ctx.font = '14px Outfit';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('💥', t.x, t.y);
        return;
      }

      const teamColor = t.team === 'blue' ? '#3498db' : '#e74c3c';
      const pulse = Math.sin(performance.now() * 0.005) * 2;

      // Draw Tower Base shadow
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      this.ctx.beginPath();
      this.ctx.arc(t.x, t.y + 4, t.radius + 1, 0, Math.PI * 2);
      this.ctx.fill();

      // Outer cylindrical stone wall base
      this.ctx.beginPath();
      this.ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = '#65737e'; // light slate grey
      this.ctx.fill();
      this.ctx.lineWidth = 2.5;
      this.ctx.strokeStyle = '#4f5b66';
      this.ctx.stroke();

      // Stone brick lines inside tower base
      this.ctx.strokeStyle = '#343d46';
      this.ctx.lineWidth = 1;
      // Cross brick lines
      for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2;
        this.ctx.beginPath();
        this.ctx.moveTo(t.x, t.y);
        this.ctx.lineTo(t.x + Math.cos(angle) * t.radius, t.y + Math.sin(angle) * t.radius);
        this.ctx.stroke();
      }

      // Upper crenellated battlements ring
      this.ctx.beginPath();
      this.ctx.arc(t.x, t.y, t.radius - 4, 0, Math.PI * 2);
      this.ctx.fillStyle = t.team === 'blue' ? '#1f3c58' : '#581f1f'; // dark blue/red deck
      this.ctx.fill();
      this.ctx.strokeStyle = teamColor;
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      // Central glowing core crystal/emoji
      this.ctx.save();
      // Add neon crystal shadow pulse
      this.ctx.shadowColor = teamColor;
      this.ctx.shadowBlur = 10 + pulse * 2;
      
      this.ctx.font = t.type === 'king' ? '20px Outfit' : '15px Outfit';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(t.type === 'king' ? '👑' : '💎', t.x, t.y - 1);
      this.ctx.restore();

      // Draw target laser indicator
      if (t.target) {
        this.ctx.strokeStyle = 'rgba(231, 76, 60, 0.25)';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([3, 3]);
        this.ctx.beginPath();
        this.ctx.moveTo(t.x, t.y);
        this.ctx.lineTo(t.target.x, t.target.y);
        this.ctx.stroke();
        this.ctx.setLineDash([]); // clear
      }

      // Tower HP Bar
      this.drawHPBar(t.x, t.y - t.radius - 8, t.hp, t.maxHp, t.radius * 1.6, 4.5);
    });

    // 6. Draw Units
    this.units.forEach(u => {
      this.ctx.save();
      this.ctx.translate(u.x, u.y);

      // Draw shadow for flying units
      if (u.isAir) {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        this.ctx.beginPath();
        this.ctx.arc(0, 24, u.radius - 2, 0, Math.PI * 2);
        this.ctx.fill();
        // Fly height offset
        this.ctx.translate(0, -22);
      } else {
        // Ground shadow
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        this.ctx.beginPath();
        this.ctx.arc(0, 2, u.radius, 0, Math.PI * 2);
        this.ctx.fill();
      }

      // A. Draw glowing team-colored runic base ring
      const pulse = Math.sin(performance.now() * 0.008) * 1.5;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, u.radius + 1.5, 0, Math.PI * 2);
      this.ctx.strokeStyle = u.team === 'blue' ? 'rgba(52, 152, 219, 0.6)' : 'rgba(231, 76, 60, 0.6)';
      this.ctx.lineWidth = 1.5 + pulse * 0.3;
      this.ctx.stroke();

      // B. Draw base body circle (radial metallic gradient)
      const grad = this.ctx.createRadialGradient(-3, -3, 2, 0, 0, u.radius);
      if (u.team === 'blue') {
        grad.addColorStop(0, '#5dade2'); // light blue shine
        grad.addColorStop(1, '#2471a3'); // deep blue
      } else {
        grad.addColorStop(0, '#f1948a'); // light red shine
        grad.addColorStop(1, '#b03a2e'); // deep red
      }
      
      this.ctx.beginPath();
      this.ctx.arc(0, 0, u.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = grad;
      this.ctx.fill();
      this.ctx.strokeStyle = u.team === 'blue' ? '#1b4f72' : '#78281f';
      this.ctx.lineWidth = 1;
      this.ctx.stroke();

      // C. Draw unit specific vector equipment / features
      this.ctx.rotate(u.angle);
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 1.5;

      if (u.type === 'knight') {
        // Draw steel sword blade pointing forward
        this.ctx.fillStyle = '#d5dbdb';
        this.ctx.beginPath();
        this.ctx.moveTo(u.radius - 2, -1.5);
        this.ctx.lineTo(u.radius + 8, -1.5);
        this.ctx.lineTo(u.radius + 10, 0);
        this.ctx.lineTo(u.radius + 8, 1.5);
        this.ctx.lineTo(u.radius - 2, 1.5);
        this.ctx.fill();
        this.ctx.stroke();
        // Gold hilt
        this.ctx.fillStyle = '#f1c40f';
        this.ctx.fillRect(u.radius - 3, -4, 2, 8);
      } else if (u.type === 'archer') {
        // Draw wooden bow
        this.ctx.strokeStyle = '#875a36';
        this.ctx.beginPath();
        this.ctx.arc(u.radius - 6, 0, 7, -Math.PI/2.5, Math.PI/2.5);
        this.ctx.stroke();
        // Bow string
        this.ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        this.ctx.lineWidth = 0.5;
        this.ctx.beginPath();
        this.ctx.moveTo(u.radius - 8, -6);
        this.ctx.lineTo(u.radius - 8, 6);
        this.ctx.stroke();
      } else if (u.type === 'giant') {
        // Draw massive fists (two brown knuckles)
        this.ctx.fillStyle = '#875a36';
        this.ctx.beginPath();
        this.ctx.arc(u.radius - 1, -5, 5, 0, Math.PI*2);
        this.ctx.arc(u.radius - 1, 5, 5, 0, Math.PI*2);
        this.ctx.fill();
      } else if (u.type === 'mini_pekka') {
        // Draw single glowing neon visor light strip across front
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(u.radius - 5, -3, 3, 6);
        
        // Pulsing visor led
        this.ctx.fillStyle = u.team === 'blue' ? '#00ffff' : '#ff0055';
        this.ctx.shadowColor = this.ctx.fillStyle;
        this.ctx.shadowBlur = 6;
        this.ctx.fillRect(u.radius - 4, -2, 2, 4);
        this.ctx.shadowBlur = 0; // reset
      } else if (u.type === 'baby_dragon') {
        // Draw cute little green wings on the sides
        this.ctx.fillStyle = '#2ecc71';
        this.ctx.beginPath();
        // Left Wing
        this.ctx.moveTo(-2, -u.radius + 2);
        this.ctx.lineTo(-12, -u.radius - 4);
        this.ctx.lineTo(-4, -u.radius + 6);
        // Right Wing
        this.ctx.moveTo(-2, u.radius - 2);
        this.ctx.lineTo(-12, u.radius + 4);
        this.ctx.lineTo(-4, u.radius - 6);
        this.ctx.fill();
      } else if (u.type === 'skeleton') {
        // Draw thin white bone lines
        this.ctx.strokeStyle = '#ecf0f1';
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        this.ctx.moveTo(u.radius - 4, -4);
        this.ctx.lineTo(u.radius - 1, 0);
        this.ctx.lineTo(u.radius - 4, 4);
        this.ctx.stroke();
      }

      this.ctx.rotate(-u.angle); // restore rotation

      // Troop emoji icon centered inside base
      this.ctx.font = `${u.radius * 1.05}px Outfit`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(u.icon, 0, 0);

      this.ctx.restore();

      // Unit HP Bar (offset higher for flying)
      const hpBarY = u.isAir ? u.y - u.radius - 28 : u.y - u.radius - 6;
      this.drawHPBar(u.x, hpBarY, u.hp, u.maxHp, u.radius * 2.1, 3.5);
    });

    // 7. Draw Projectiles
    this.projectiles.forEach(p => {
      this.ctx.save();
      const drawY = p.y + (p.arcOffset || 0);
      
      if (p.type === 'fireball_mini') {
        // Fireball splash shot
        this.ctx.fillStyle = '#e67e22';
        this.ctx.beginPath();
        this.ctx.arc(p.x, drawY, 5, 0, Math.PI * 2);
        this.ctx.fill();
      } else {
        // Arrow projectile
        this.ctx.fillStyle = '#ffffff';
        this.ctx.lineWidth = 2;
        this.ctx.strokeStyle = p.color;
        this.ctx.beginPath();
        this.ctx.arc(p.x, drawY, 2, 0, Math.PI * 2);
        this.ctx.fill();
      }
      
      this.ctx.restore();
    });

    // 8. Draw spells in flight
    this.activeSpells.forEach(spell => {
      this.ctx.save();
      
      const rot = (performance.now() * 0.01) % (Math.PI * 2);
      
      if (spell.type === 'fireball') {
        // Draw rotating fireball vortex
        this.ctx.translate(spell.x, spell.arcY);
        this.ctx.rotate(rot);

        // Core glow
        const grad = this.ctx.createRadialGradient(0, 0, 1, 0, 0, 20);
        grad.addColorStop(0, '#f1c40f'); // bright core
        grad.addColorStop(0.4, '#e67e22'); // orange
        grad.addColorStop(1, 'rgba(231, 76, 60, 0)'); // transparent red edge
        this.ctx.fillStyle = grad;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 25, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.font = '32px Outfit';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('🔥', 0, 0);
      } else {
        // Arrows spell volley flying (draw group of small arrows)
        this.ctx.translate(spell.x, spell.arcY);
        this.ctx.strokeStyle = '#bdc3c7';
        this.ctx.lineWidth = 1.5;
        for (let i = 0; i < 5; i++) {
          const ox = (i - 2) * 10;
          const oy = Math.sin(i * 1.5) * 8;
          this.ctx.beginPath();
          this.ctx.moveTo(ox, oy);
          this.ctx.lineTo(ox - 6, oy + 8);
          this.ctx.stroke();
        }
      }
      
      this.ctx.restore();
      
      // Shadow directly underneath
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      this.ctx.beginPath();
      this.ctx.arc(spell.x, spell.y, 10, 0, Math.PI * 2);
      this.ctx.fill();
    });

    // 9. Draw Particles
    this.particles.forEach(p => {
      this.ctx.save();
      this.ctx.globalAlpha = p.alpha;
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    });

    // 10. Draw Floating Damage Indicators
    this.ctx.save();
    this.floatingTexts.forEach(ft => {
      this.ctx.globalAlpha = ft.alpha;
      this.ctx.fillStyle = ft.color;
      this.ctx.font = 'bold 11px Outfit';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(ft.text, ft.x, ft.y);
    });
    this.ctx.restore();

    this.ctx.restore(); // screen shake restore
  }

  // HP Bar Drawing Utility
  drawHPBar(x, y, hp, maxHp, width, height) {
    if (hp >= maxHp) return; // Only draw when damaged

    const percent = Math.max(0, hp / maxHp);
    const hWidth = width;
    const hHeight = height;

    // Background bar
    this.ctx.fillStyle = '#34495e';
    this.ctx.fillRect(x - hWidth / 2, y, hWidth, hHeight);

    // Health remaining bar
    this.ctx.fillStyle = percent > 0.35 ? '#2ecc71' : '#e74c3c';
    this.ctx.fillRect(x - hWidth / 2, y, hWidth * percent, hHeight);

    // Border
    this.ctx.strokeStyle = '#2c3e50';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x - hWidth / 2, y, hWidth, hHeight);
  }

  // Animation Loop wrapper
  animate() {
    if (this.gameState === 'idle') return;

    const tick = (time) => {
      if (this.gameState === 'idle') return;

      let dt = (time - this.lastTime) / 1000;
      this.lastTime = time;

      // Cap delta time to prevent physics clipping during tab suspension
      if (dt > 0.1) dt = 0.1;

      this.update(dt);
      this.render();

      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }
}

window.GameEngine = GameEngine;
