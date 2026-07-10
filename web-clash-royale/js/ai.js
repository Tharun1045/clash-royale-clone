/* ==========================================
   CLASH ROYALE CLONE - ROBOT OPPONENT AI
   ========================================== */

class BotAI {
  constructor(engine, difficulty = 'medium') {
    this.engine = engine;
    this.difficulty = difficulty;
    
    this.elixir = 5.0; // starts with 5 elixir
    this.deck = [...DEFAULT_DECK]; // default 8-card bot deck
    this.hand = [];
    
    // Internal timer triggers
    this.lastDecisionTime = 0;
    this.decisionInterval = 1200; // ms between AI checks (varies by difficulty)
    
    this.setupDifficulty();
    this.fillHand();
  }

  setupDifficulty() {
    switch (this.difficulty) {
      case 'easy':
        this.decisionInterval = 1800;
        break;
      case 'medium':
        this.decisionInterval = 1200;
        break;
      case 'hard':
        this.decisionInterval = 750;
        break;
    }
  }

  // Draw cards from deck until hand has 4 active cards
  fillHand() {
    while (this.hand.length < 4) {
      const unusedCards = this.deck.filter(cardId => !this.hand.includes(cardId));
      if (unusedCards.length === 0) break;
      const randomCard = unusedCards[Math.floor(Math.random() * unusedCards.length)];
      this.hand.push(randomCard);
    }
  }

  // Accumulate elixir
  updateElixir(dt, multiplier = 1.0) {
    // Normal rate is 1 elixir per 2.8s, capped at 10
    const elixirPerSecond = (1.0 / 2.8) * multiplier;
    this.elixir = Math.min(10.0, this.elixir + elixirPerSecond * dt);
  }

  // AI loop ticks
  tick(dt) {
    if (this.engine.gameState === 'idle' || this.engine.gameState === 'gameover') return;

    // 1. Accumulate elixir (2x rate during sudden death)
    const multiplier = this.engine.gameState === 'sudden_death' ? 2.0 : 1.0;
    this.updateElixir(dt, multiplier);

    // 2. Perform periodic strategic actions
    const now = performance.now();
    if (now - this.lastDecisionTime >= this.decisionInterval) {
      this.lastDecisionTime = now;
      this.makeDecision();
    }
  }

  // Core Decision Engine
  makeDecision() {
    this.fillHand();
    
    // A. Detect incoming player threats on Bot side (y < 300)
    const playerThreats = this.engine.units.filter(u => u.team === 'blue' && u.y < this.engine.riverY + 50);
    const criticalThreats = playerThreats.filter(u => u.y < 200); // very close to towers

    // B. Check for targetable player towers
    const targetTowers = this.engine.towers.filter(t => t.active && t.team === 'blue');

    // C. Evaluate elixir opportunities & counters
    let cardPlayed = false;

    // 1. Spell finisher: can we destroy an active player tower with Fireball?
    if (this.hasCard('fireball') && this.elixir >= 4) {
      const lowHpTower = targetTowers.find(t => t.hp < 150);
      if (lowHpTower) {
        this.playSpell('fireball', lowHpTower.x, lowHpTower.y);
        cardPlayed = true;
      }
    }

    // 2. Spell defense: is there a large swarm of enemies?
    if (!cardPlayed && this.hasCard('arrows') && this.elixir >= 3) {
      const skeletons = playerThreats.filter(u => u.type === 'skeleton');
      if (skeletons.length >= 4) {
        // Target center of swarm
        const avgX = skeletons.reduce((sum, s) => sum + s.x, 0) / skeletons.length;
        const avgY = skeletons.reduce((sum, s) => sum + s.y, 0) / skeletons.length;
        this.playSpell('arrows', avgX, avgY);
        cardPlayed = true;
      }
    }

    // 3. Melee counter defense (e.g. Player Giant is approaching)
    if (!cardPlayed && playerThreats.length > 0) {
      const giantThreat = playerThreats.find(u => u.type === 'giant');
      
      if (giantThreat && this.elixir >= 3) {
        // Giant counter: Skeleton Army or Mini PEKKA are perfect tank-shredders
        if (this.hasCard('skeleton_army')) {
          this.playTroop('skeleton_army', giantThreat.x, giantThreat.y + 30);
          cardPlayed = true;
        } else if (this.hasCard('mini_pekka') && this.elixir >= 4) {
          this.playTroop('mini_pekka', giantThreat.x, giantThreat.y + 35);
          cardPlayed = true;
        }
      }
    }

    // 4. Air counter defense (e.g. Player Baby Dragon is flying in)
    if (!cardPlayed && playerThreats.length > 0) {
      const airThreat = playerThreats.find(u => u.isAir);
      
      if (airThreat && this.elixir >= 3) {
        // Deploy Archers or Baby Dragon defensively to fight it
        if (this.hasCard('archers')) {
          this.playTroop('archers', airThreat.x - 10, airThreat.y + 40);
          cardPlayed = true;
        } else if (this.hasCard('baby_dragon') && this.elixir >= 4) {
          this.playTroop('baby_dragon', airThreat.x, airThreat.y + 40);
          cardPlayed = true;
        }
      }
    }

    // 5. Default generic defense (something is crossing bridge)
    if (!cardPlayed && playerThreats.length > 0 && this.elixir >= 3) {
      // Pick a defender card (Knight, Archer, Mini PEKKA)
      const defender = this.findFirstCardInHand(['knight', 'archers', 'mini_pekka', 'baby_dragon']);
      if (defender && this.elixir >= CARD_TEMPLATES[defender].cost) {
        // Deploy near the closest incoming threat, slightly back towards tower
        const targetThreat = playerThreats[0];
        const deployY = Math.max(90, targetThreat.y - 45); // safeguard boundary
        this.playTroop(defender, targetThreat.x, deployY);
        cardPlayed = true;
      }
    }

    // 6. Offensive push setup (no active threats, sitting on high elixir)
    if (!cardPlayed && this.elixir >= 7) {
      // Decide side to push (based on which princess tower is active)
      const activeLeft = this.engine.towers.find(t => t.id === 'b_left' && t.active);
      const activeRight = this.engine.towers.find(t => t.id === 'b_right' && t.active);
      
      let pushX = 180;
      if (activeLeft && activeRight) {
        pushX = Math.random() < 0.5 ? 80 : 280; // random lane
      } else if (activeLeft) {
        pushX = 80;
      } else if (activeRight) {
        pushX = 280;
      }

      // Tank first (Giant)
      if (this.hasCard('giant')) {
        this.playTroop('giant', pushX, 100);
        cardPlayed = true;
        
        // Random chance of emote on big deploy
        if (Math.random() < 0.35) {
          setTimeout(() => this.triggerBotEmote('👍'), 400);
        }
      } else {
        // No Giant in hand, push with Knight or Mini PEKKA
        const attacker = this.findFirstCardInHand(['knight', 'mini_pekka', 'baby_dragon']);
        if (attacker && this.elixir >= CARD_TEMPLATES[attacker].cost) {
          this.playTroop(attacker, pushX, 120);
          cardPlayed = true;
        }
      }
    }

    // 7. Prevent elixir leaks (capped at 10 elixir, force deploy any troop)
    if (!cardPlayed && this.elixir >= 9.5) {
      const cheapestTroop = this.hand
        .filter(c => CARD_TEMPLATES[c].type === 'troop')
        .sort((a, b) => CARD_TEMPLATES[a].cost - CARD_TEMPLATES[b].cost)[0];
      
      if (cheapestTroop) {
        const randomLaneX = Math.random() < 0.5 ? 80 : 280;
        this.playTroop(cheapestTroop, randomLaneX, 120);
        cardPlayed = true;
      }
    }
  }

  // Helpers to scan hand
  hasCard(cardId) {
    return this.hand.includes(cardId);
  }

  findFirstCardInHand(cardList) {
    return cardList.find(c => this.hand.includes(c));
  }

  // Play Actions
  playTroop(cardId, x, y) {
    const cost = CARD_TEMPLATES[cardId].cost;
    this.elixir -= cost;
    CARD_TEMPLATES[cardId].spawn(this.engine, x, y, 'red');
    
    // Cycle card out of hand
    this.hand = this.hand.filter(c => c !== cardId);
    this.fillHand();
  }

  playSpell(cardId, x, y) {
    const cost = CARD_TEMPLATES[cardId].cost;
    this.elixir -= cost;
    CARD_TEMPLATES[cardId].spawn(this.engine, x, y, 'red');
    
    // Cycle card out of hand
    this.hand = this.hand.filter(c => c !== cardId);
    this.fillHand();
  }

  // Trigger floating text emote
  triggerBotEmote(emoteSymbol) {
    const area = document.getElementById('emote-display-area');
    if (!area) return;
    
    const emote = document.createElement('div');
    emote.className = 'floating-emote bot';
    emote.innerText = emoteSymbol;
    
    // Random placement near bot's king tower
    emote.style.left = `${160 + (Math.random() - 0.5) * 50}px`;
    emote.style.top = `60px`;
    
    area.appendChild(emote);
    if (window.gameAudio) window.gameAudio.playEmote();
    
    setTimeout(() => {
      emote.remove();
    }, 2200);
  }
}

window.BotAI = BotAI;
