/* ==========================================
   CLASH ROYALE CLONE - GAME CONTROLLER & UI
   ========================================== */

class GameController {
  constructor() {
    this.engine = new GameEngine('battle-canvas');
    this.bot = null;
    
    // Player battle state
    this.playerElixir = 5.0;
    this.playerDeck = [...DEFAULT_DECK]; // 8-card player deck
    this.playerHand = []; // 4 cards in hand
    this.nextCardQueue = []; // queue of remaining cards
    this.selectedHandIndex = null; // index of card selected for deployment
    
    // Drag-and-drop states
    this.isDraggingCard = false;
    this.dragStart = false;
    this.draggedIndex = null;
    this.draggedCardId = null;
    this.draggedCardEl = null;
    this.dragStartPos = { x: 0, y: 0 };
    
    // Game loop timers
    this.gameTimer = 180; // 3 minutes in seconds
    this.timerInterval = null;
    this.lastTime = 0;
    
    // UI state
    this.botDifficulty = 'medium';
    this.selectedSwapDeckIndex = null; // deck editor selection state
    
    this.setupDOMReferences();
    this.bindEvents();
    this.initDeckEditor();
  }

  setupDOMReferences() {
    this.screens = {
      menu: document.getElementById('menu-screen'),
      deck: document.getElementById('deck-screen'),
      battle: document.getElementById('battle-screen'),
      gameover: document.getElementById('gameover-screen')
    };

    this.playBtn = document.getElementById('play-btn');
    this.deckBtn = document.getElementById('deck-btn');
    this.deckBackBtn = document.getElementById('deck-back-btn');
    this.deckSaveBtn = document.getElementById('deck-save-btn');
    this.restartBtn = document.getElementById('restart-btn');
    this.menuBtn = document.getElementById('menu-btn');
    
    this.timerLabel = document.getElementById('game-timer');
    this.playerCrownsLabel = document.getElementById('player-crowns');
    this.botCrownsLabel = document.getElementById('bot-crowns');
    this.elixirCountLabel = document.getElementById('elixir-count');
    this.elixirProgressBar = document.getElementById('elixir-progress');
    
    this.handContainer = document.getElementById('player-hand');
    this.nextCardSlot = document.getElementById('next-card-slot');
    
    this.difficultyButtons = document.querySelectorAll('.diff-btn');
    this.botDifficultyLabel = document.getElementById('bot-difficulty-label');

    this.emoteTrigger = document.getElementById('emote-trigger');
    this.emoteTray = document.getElementById('emote-tray');
  }

  showScreen(screenKey) {
    Object.keys(this.screens).forEach(key => {
      if (key === screenKey) {
        this.screens[key].classList.add('active');
      } else {
        this.screens[key].classList.remove('active');
      }
    });
  }

  bindEvents() {
    // Menu screen bindings
    this.playBtn.addEventListener('click', () => this.startBattle());
    this.deckBtn.addEventListener('click', () => {
      this.initDeckEditor();
      this.showScreen('deck');
    });

    // Deck screen bindings
    this.deckBackBtn.addEventListener('click', () => this.showScreen('menu'));
    this.deckSaveBtn.addEventListener('click', () => this.showScreen('menu'));

    // Game Over screen bindings
    this.restartBtn.addEventListener('click', () => this.startBattle());
    this.menuBtn.addEventListener('click', () => this.showScreen('menu'));

    // Difficulty selection
    this.difficultyButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.difficultyButtons.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.botDifficulty = e.target.dataset.diff;
      });
    });

    // Canvas Tap/Click deployment handler
    this.engine.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
    
    // Audio Context unlocker
    document.body.addEventListener('click', () => {
      if (window.gameAudio) window.gameAudio.resume();
    }, { once: true });

    // Emotes Tray Toggler
    this.emoteTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      this.emoteTray.classList.toggle('hidden');
    });

    // Close emote tray on screen click
    document.addEventListener('click', () => {
      this.emoteTray.classList.add('hidden');
    });

    // Emote Buttons Click
    const emoteBtns = document.querySelectorAll('.emote-btn');
    emoteBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.triggerPlayerEmote(e.target.dataset.emote);
        this.emoteTray.classList.add('hidden');
      });
    });

    // Global Drag Movements
    document.addEventListener('mousemove', (e) => this.handleDragMove(e));
    document.addEventListener('touchmove', (e) => this.handleDragMove(e), { passive: false });

    // Global Drag Releases
    document.addEventListener('mouseup', (e) => this.handleDragEnd(e));
    document.addEventListener('touchend', (e) => this.handleDragEnd(e));
  }

  handleDragMove(e) {
    if (!this.dragStart) return;

    // Retrieve client positions
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    if (!this.isDraggingCard) {
      // Check threshold distance
      const dx = clientX - this.dragStartPos.x;
      const dy = clientY - this.dragStartPos.y;
      if (Math.hypot(dx, dy) > 10) {
        this.isDraggingCard = true;
        if (this.draggedCardEl) {
          this.draggedCardEl.classList.add('dragging-active');
        }
      }
    }

    if (this.isDraggingCard) {
      // Prevent screen scrolling
      if (e.cancelable) e.preventDefault();

      // Convert coordinate to canvas space
      const rect = this.engine.canvas.getBoundingClientRect();
      const logicalX = ((clientX - rect.left) / rect.width) * this.engine.width;
      const logicalY = ((clientY - rect.top) / rect.height) * this.engine.height;

      // Update engine drag parameters
      this.engine.activeDragCoord = { x: logicalX, y: logicalY };
      this.engine.activeDragCardId = this.draggedCardId;
      this.engine.dragTeam = 'blue';
    }
  }

  handleDragEnd(e) {
    if (!this.dragStart) return;

    // Get final positions
    const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
    const clientY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;

    if (this.isDraggingCard) {
      // Convert coordinates
      const rect = this.engine.canvas.getBoundingClientRect();
      const logicalX = ((clientX - rect.left) / rect.width) * this.engine.width;
      const logicalY = ((clientY - rect.top) / rect.height) * this.engine.height;

      const insideCanvas = (clientX >= rect.left && clientX <= rect.right &&
                            clientY >= rect.top && clientY <= rect.bottom);

      const template = CARD_TEMPLATES[this.draggedCardId];

      if (insideCanvas) {
        // Run deployment rules
        const canDeploy = (template.type === 'spell' || this.checkDeploymentZone(logicalX, logicalY));
        const roundedElixir = Math.floor(this.playerElixir);

        if (canDeploy && roundedElixir >= template.cost) {
          // Deploy!
          this.playerElixir -= template.cost;
          template.spawn(this.engine, logicalX, logicalY, 'blue');
          if (window.gameAudio) window.gameAudio.playDeploy();

          // Cycle
          const nextCardId = this.nextCardQueue.shift();
          this.nextCardQueue.push(this.draggedCardId);
          this.playerHand[this.draggedIndex] = nextCardId;

          this.renderPlayerHand();
          this.renderNextCardSlot();
        } else {
          // Reject visual/audio feedback
          this.engine.spawnFloatingText(roundedElixir < template.cost ? "NO ELIXIR" : "INVALID ZONE", logicalX, logicalY - 10, '#e74c3c');
          if (window.gameAudio) window.gameAudio.playAttackMelee();
        }
      }

      // Clear engine state
      this.engine.activeDragCoord = null;
      this.engine.activeDragCardId = null;
    } else {
      // CLICK FALLBACK (It was a tap, not a drag!)
      const alreadySelected = this.selectedHandIndex === this.draggedIndex;
      document.querySelectorAll('#player-hand .card').forEach(c => c.classList.remove('active-deploy'));
      
      if (!alreadySelected) {
        if (this.draggedCardEl) {
          this.draggedCardEl.classList.add('active-deploy');
        }
        this.selectedHandIndex = this.draggedIndex;
      } else {
        this.selectedHandIndex = null;
      }
      
      if (window.gameAudio) window.gameAudio.playEmote(); // small select blip
    }

    // Clean up classes & flags
    if (this.draggedCardEl) {
      this.draggedCardEl.classList.remove('dragging-active');
    }

    this.isDraggingCard = false;
    this.dragStart = false;
    this.draggedIndex = null;
    this.draggedCardId = null;
    this.draggedCardEl = null;
  }

  /* ==========================================
     DECK EDITOR LOGIC
     ========================================== */
  initDeckEditor() {
    const activeGrid = document.getElementById('active-deck');
    const collectionGrid = document.getElementById('collection-deck');
    
    activeGrid.innerHTML = '';
    collectionGrid.innerHTML = '';
    this.selectedSwapDeckIndex = null;

    // A. Render Active Deck (8 cards)
    this.playerDeck.forEach((cardId, index) => {
      const template = CARD_TEMPLATES[cardId];
      const cardEl = this.createCardDOM(template, cardId);
      
      cardEl.addEventListener('click', () => {
        // Toggle selection for swapping
        const alreadySelected = cardEl.classList.contains('selected-for-swap');
        document.querySelectorAll('.active-deck-grid .card').forEach(c => c.classList.remove('selected-for-swap'));
        
        if (!alreadySelected) {
          cardEl.classList.add('selected-for-swap');
          this.selectedSwapDeckIndex = index;
        } else {
          this.selectedSwapDeckIndex = null;
        }
      });

      activeGrid.appendChild(cardEl);
    });

    // B. Render Collection (available swaps)
    FULL_COLLECTION.forEach(cardId => {
      // Don't show cards already in active deck
      if (this.playerDeck.includes(cardId)) return;

      const template = CARD_TEMPLATES[cardId];
      const cardEl = this.createCardDOM(template, cardId);
      
      cardEl.addEventListener('click', () => {
        if (this.selectedSwapDeckIndex !== null) {
          // Swap card out!
          const activeCardId = this.playerDeck[this.selectedSwapDeckIndex];
          this.playerDeck[this.selectedSwapDeckIndex] = cardId;
          
          // Play swap audio synth
          if (window.gameAudio) window.gameAudio.playAttackMelee();
          
          // Re-render
          this.initDeckEditor();
        }
      });

      collectionGrid.appendChild(cardEl);
    });
  }

  createCardDOM(template, id) {
    const el = document.createElement('div');
    const rarity = template.rarity || 'common';
    el.className = `card rarity-${rarity}`;
    el.dataset.id = id;
    el.innerHTML = `
      <div class="card-sheen"></div>
      <div class="card-elixir">
        <span class="elixir-drop"></span>
        <span class="elixir-num">${template.cost}</span>
      </div>
      <div class="card-image-wrapper">
        <img src="assets/${id}.jpg" class="card-image" alt="${template.name}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22><rect width=%22100%22 height=%22100%22 fill=%22%232c3e50%22/><text x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%23fff%22 font-size=%2230%22>${template.icon}</text></svg>'">
      </div>
      <div class="card-bottom-banner">
        <div class="card-name">${template.name}</div>
        <div class="card-lvl">Lvl 1</div>
      </div>
      <div class="card-progress-bar">
        <div class="card-progress-fill" style="width: 60%;"></div>
        <span class="card-progress-text">12/20</span>
      </div>
    `;
    return el;
  }


  /* ==========================================
     BATTLE MATCH LIFECYCLE
     ========================================== */
  startBattle() {
    this.playerElixir = 5.0;
    this.selectedHandIndex = null;
    this.gameTimer = 180; // 3 minutes
    
    // Set bot difficulty tags
    this.botDifficultyLabel.innerText = this.botDifficulty.toUpperCase();
    this.botDifficultyLabel.className = `difficulty-tag ${this.botDifficulty}`;

    // Reset crown scoreboards
    this.playerCrownsLabel.innerText = '0';
    this.botCrownsLabel.innerText = '0';

    // Prepare deck queue rotation
    // Shuffle the 8 cards to start
    const shuffledDeck = [...this.playerDeck].sort(() => Math.random() - 0.5);
    this.playerHand = shuffledDeck.slice(0, 4);
    this.nextCardQueue = shuffledDeck.slice(4);

    this.showScreen('battle');
    
    // Launch Battle Engine & Robot AI
    this.engine.start();
    this.bot = new BotAI(this.engine, this.botDifficulty);
    
    // Bind Engine Callbacks
    this.engine.onGameOverCallback = (winner, pCrowns, bCrowns) => this.handleGameOver(winner, pCrowns, bCrowns);
    this.engine.onCrownChangeCallback = (pCrowns, bCrowns) => this.handleCrownChange(pCrowns, bCrowns);

    // Setup HUD hands
    this.renderPlayerHand();
    this.renderNextCardSlot();
    
    // Reset Sudden Death UI class overlay
    document.getElementById('sudden-death-overlay').classList.remove('active');

    // Run game loop updates & timer countdown
    this.lastTime = performance.now();
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => this.countdownTimer(), 1000);

    // Kickoff custom delta-time update loop for Elixir & Bot AI
    this.runGameLoop();
  }

  countdownTimer() {
    if (this.engine.gameState !== 'playing' && this.engine.gameState !== 'sudden_death') return;

    this.gameTimer--;
    
    // Format MM:SS
    const minutes = Math.floor(this.gameTimer / 60);
    const seconds = this.gameTimer % 60;
    this.timerLabel.innerText = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

    if (this.gameTimer <= 0) {
      if (this.engine.playerCrowns === this.engine.botCrowns) {
        // TIE -> TRIGGER SUDDEN DEATH!
        if (this.engine.gameState === 'playing') {
          this.triggerSuddenDeath();
        } else {
          // Sudden death time elapsed, end in draw
          this.handleGameOver('draw', this.engine.playerCrowns, this.engine.botCrowns);
        }
      } else {
        // End game normally
        const winner = this.engine.playerCrowns > this.engine.botCrowns ? 'player' : 'bot';
        this.handleGameOver(winner, this.engine.playerCrowns, this.engine.botCrowns);
      }
    }
  }

  triggerSuddenDeath() {
    this.engine.gameState = 'sudden_death';
    this.gameTimer = 60; // 1 minute extra
    
    // Flash Sudden Death overlay
    const overlay = document.getElementById('sudden-death-overlay');
    overlay.classList.add('active');
    setTimeout(() => overlay.classList.remove('active'), 2500);

    if (window.gameAudio) window.gameAudio.playWin(); // play happy chime
    this.engine.triggerScreenShake(8, 400);
  }

  handleCrownChange(pCrowns, bCrowns) {
    this.playerCrownsLabel.innerText = pCrowns;
    this.botCrownsLabel.innerText = bCrowns;
  }

  handleGameOver(winner, pCrowns, bCrowns) {
    clearInterval(this.timerInterval);
    this.engine.stop();

    // Setup Game Over Screen UI
    const title = document.getElementById('gameover-title');
    const msg = document.getElementById('gameover-message');
    document.getElementById('final-player-crowns').innerText = pCrowns;
    document.getElementById('final-bot-crowns').innerText = bCrowns;

    if (winner === 'player') {
      title.innerText = 'VICTORY';
      title.className = 'victory-text';
      msg.innerText = 'You outplayed the Robot AI! Huzzah!';
      if (window.gameAudio) window.gameAudio.playWin();
    } else if (winner === 'bot') {
      title.innerText = 'DEFEAT';
      title.className = 'defeat-text';
      msg.innerText = 'The Robot AI crushed your towers. Try again!';
      if (window.gameAudio) window.gameAudio.playLose();
    } else {
      title.innerText = 'DRAW';
      title.className = 'vs-divider';
      msg.innerText = 'An equal match of wits. No crown won.';
      if (window.gameAudio) window.gameAudio.playLose();
    }

    this.showScreen('gameover');
  }

  // Loop update
  runGameLoop() {
    const loop = (timestamp) => {
      if (this.engine.gameState !== 'playing' && this.engine.gameState !== 'sudden_death') return;

      const dt = (timestamp - this.lastTime) / 1000;
      this.lastTime = timestamp;

      // Update Player Elixir
      // 1 Elixir per 2.8s (double speed in sudden death)
      const elixirMult = this.engine.gameState === 'sudden_death' ? 2.0 : 1.0;
      this.playerElixir = Math.min(10.0, this.playerElixir + (1.0 / 2.8) * elixirMult * dt);

      // Tick Bot AI decision making
      if (this.bot) {
        this.bot.tick(dt);
      }

      // Sync player UI elements
      this.updatePlayerHUD();

      requestAnimationFrame(loop);
    };

    requestAnimationFrame((t) => {
      this.lastTime = t;
      loop(t);
    });
  }

  /* ==========================================
     PLAYER BATTLE INTERFACE
     ========================================== */
  updatePlayerHUD() {
    // 1. Update elixir numeric and progress bar filling
    const roundedElixir = Math.floor(this.playerElixir);
    this.elixirCountLabel.innerText = roundedElixir;
    this.elixirProgressBar.style.width = `${this.playerElixir * 10}%`;

    // 2. Disable cards in hand if not enough Elixir
    const cards = this.handContainer.querySelectorAll('.card');
    cards.forEach((cardEl, idx) => {
      const cardId = this.playerHand[idx];
      const template = CARD_TEMPLATES[cardId];
      
      if (roundedElixir < template.cost) {
        cardEl.classList.add('disabled');
        // Unselect if it was selected but elixir is now insufficient
        if (this.selectedHandIndex === idx) {
          cardEl.classList.remove('active-deploy');
          this.selectedHandIndex = null;
        }
      } else {
        cardEl.classList.remove('disabled');
      }
    });
  }

  renderPlayerHand() {
    this.handContainer.innerHTML = '';
    
    this.playerHand.forEach((cardId, index) => {
      const template = CARD_TEMPLATES[cardId];
      const cardEl = this.createCardDOM(template, cardId);
      
      // Mouse down / Touch start drag triggers
      const startDrag = (e) => {
        if (cardEl.classList.contains('disabled')) return;
        
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        this.dragStart = true;
        this.draggedIndex = index;
        this.draggedCardId = cardId;
        this.draggedCardEl = cardEl;
        this.dragStartPos = { x: clientX, y: clientY };
      };

      cardEl.addEventListener('mousedown', startDrag);
      cardEl.addEventListener('touchstart', startDrag, { passive: true });

      // Click listener is now handled in handleDragEnd to avoid duplicate action triggers
      this.handContainer.appendChild(cardEl);
    });
  }

  renderNextCardSlot() {
    this.nextCardSlot.innerHTML = '';
    if (this.nextCardQueue.length === 0) return;
    
    const nextCardId = this.nextCardQueue[0];
    const template = CARD_TEMPLATES[nextCardId];
    
    const cardEl = this.createCardDOM(template, nextCardId);
    cardEl.classList.add('next-card');
    this.nextCardSlot.appendChild(cardEl);
  }

  // Handle Card Deploy
  handleCanvasClick(e) {
    if (this.selectedHandIndex === null) return;

    // Get click coordinates relative to canvas
    const rect = this.engine.canvas.getBoundingClientRect();
    // Scale click points to logical canvas resolution (360x600)
    const clickX = ((e.clientX - rect.left) / rect.width) * this.engine.width;
    const clickY = ((e.clientY - rect.top) / rect.height) * this.engine.height;

    const cardId = this.playerHand[this.selectedHandIndex];
    const template = CARD_TEMPLATES[cardId];

    // Check if player has enough elixir
    if (this.playerElixir < template.cost) return;

    // Check Deployment Zone Boundary Restraints
    if (template.type === 'troop') {
      const canDeploy = this.checkDeploymentZone(clickX, clickY);
      if (!canDeploy) {
        this.engine.spawnFloatingText("INVALID ZONE", clickX, clickY - 10, '#e74c3c');
        if (window.gameAudio) window.gameAudio.playAttackMelee(); // reject buzz
        return;
      }
    }

    // Deduct elixir
    this.playerElixir -= template.cost;

    // Deploy!
    template.spawn(this.engine, clickX, clickY, 'blue');
    if (window.gameAudio) window.gameAudio.playDeploy();

    // Rotate cards in hand
    const nextCardId = this.nextCardQueue.shift();
    this.nextCardQueue.push(cardId);
    this.playerHand[this.selectedHandIndex] = nextCardId;

    // Clear selection & rebuild hand UI
    this.selectedHandIndex = null;
    this.renderPlayerHand();
    this.renderNextCardSlot();
  }

  // Determine if troop deployment is inside player's control territory
  checkDeploymentZone(x, y) {
    // 1. Cannot place directly inside the River zone
    if (y >= this.engine.riverY - 12 && y <= this.engine.riverY + 12) {
      return false;
    }

    // 2. Default: Blue team can deploy anywhere on their bottom half (y > riverY)
    if (y > this.engine.riverY + 12) {
      return true;
    }

    // 3. Expansion: If Bot Left Princess Tower is destroyed, allow left side lane deploy
    const botLeftTowerDead = !this.engine.towers.find(t => t.id === 'b_left').active;
    if (botLeftTowerDead && y <= this.engine.riverY - 12 && x < 180) {
      return true;
    }

    // 4. Expansion: If Bot Right Princess Tower is destroyed, allow right side lane deploy
    const botRightTowerDead = !this.engine.towers.find(t => t.id === 'b_right').active;
    if (botRightTowerDead && y <= this.engine.riverY - 12 && x >= 180) {
      return true;
    }

    return false;
  }

  /* ==========================================
     EMOTE INTERACTION SYSTEM
     ========================================== */
  triggerPlayerEmote(emoteSymbol) {
    const area = document.getElementById('emote-display-area');
    if (!area) return;
    
    const emote = document.createElement('div');
    emote.className = 'floating-emote player';
    emote.innerText = emoteSymbol;
    
    // Place near player's king tower
    emote.style.left = `${160 + (Math.random() - 0.5) * 50}px`;
    emote.style.bottom = `90px`;
    
    area.appendChild(emote);
    if (window.gameAudio) window.gameAudio.playEmote();
    
    setTimeout(() => {
      emote.remove();
    }, 2200);

    // AI reacts sometimes!
    setTimeout(() => {
      if (this.bot && Math.random() < 0.45) {
        // pick reaction emote
        const reactions = {
          '👍': ['👍', '😂', '😮'],
          '😂': ['😡', '😭', '👍'],
          '😭': ['😂', '👍'],
          '😡': ['😂', '😭'],
          '😮': ['😮', '👍']
        };
        const pool = reactions[emoteSymbol] || ['👍'];
        const botEmote = pool[Math.floor(Math.random() * pool.length)];
        this.bot.triggerBotEmote(botEmote);
      }
    }, 600 + Math.random() * 800);
  }
}

// Instantiate and start app on page load
window.addEventListener('DOMContentLoaded', () => {
  window.gameController = new GameController();
});
